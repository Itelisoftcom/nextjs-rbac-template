import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, roles, userRoles, users } from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit/write-audit";
import { BaseRepository } from "@/lib/repositories/base-repository";
import { assertActiveSuperAdminRemains } from "@/lib/auth/super-admin-guard";
import { SYSTEM_ROLE_CODES } from "@/lib/auth/system-roles";

export type UserWithRoles = typeof users.$inferSelect & {
  roles: { id: string; code: string | null; name: string }[];
};

export class UserRepository extends BaseRepository<typeof users> {
  protected table = users;
  protected entityType = "user";

  async listWithRoles(options: { includeDeleted?: boolean } = {}): Promise<UserWithRoles[]> {
    const rows = await db
      .select({
        user: users,
        role: { id: roles.id, code: roles.code, name: roles.name },
      })
      .from(users)
      .leftJoin(userRoles, eq(userRoles.userId, users.id))
      .leftJoin(roles, and(eq(roles.id, userRoles.roleId), isNull(roles.deletedAt)))
      .where(options.includeDeleted ? undefined : isNull(users.deletedAt))
      .orderBy(users.createdAt);

    const byId = new Map<string, UserWithRoles>();
    for (const row of rows) {
      const entry = byId.get(row.user.id) ?? { ...row.user, roles: [] };
      if (row.role?.id && !entry.roles.some((r) => r.id === row.role!.id)) {
        entry.roles.push(row.role);
      }
      byId.set(row.user.id, entry);
    }
    return [...byId.values()];
  }

  /**
   * Crea el usuario y su cuenta de credenciales (Better Auth) en la misma
   * transacción — nunca debe quedar un usuario sin forma de iniciar sesión.
   */
  async createUser(input: {
    email: string;
    name: string;
    password: string;
    mustChangePassword?: boolean;
    colorMode?: "light" | "dark" | "system";
    themeId?: string | null;
  }) {
    const id = randomUUID();

    return db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          id,
          email: input.email,
          name: input.name,
          mustChangePassword: input.mustChangePassword ?? false,
          ...(input.colorMode !== undefined ? { colorMode: input.colorMode } : {}),
          ...(input.themeId !== undefined ? { themeId: input.themeId } : {}),
        })
        .returning();

      await tx.insert(accounts).values({
        id: randomUUID(),
        userId: id,
        providerId: "credential",
        issuer: "local:credential",
        accountId: id,
        password: await hashPassword(input.password),
      });

      await writeAudit(tx, {
        action: "create",
        entityType: this.entityType,
        entityId: id,
        before: null,
        after: user as Record<string, unknown>,
      });

      return user;
    });
  }

  async assignRole(userId: string, roleId: string): Promise<void> {
    const [existing] = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
    if (existing) return;

    await db.transaction(async (tx) => {
      await tx.insert(userRoles).values({ userId, roleId });
      await writeAudit(tx, {
        action: "update",
        entityType: this.entityType,
        entityId: userId,
        before: { roleId: null },
        after: { roleId },
      });
    });
  }

  async removeRole(userId: string, roleId: string): Promise<void> {
    const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
    if (role?.code === SYSTEM_ROLE_CODES.SUPER_ADMIN) {
      await assertActiveSuperAdminRemains(userId);
    }

    await db.transaction(async (tx) => {
      await tx.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
      await writeAudit(tx, {
        action: "update",
        entityType: this.entityType,
        entityId: userId,
        before: { roleId },
        after: { roleId: null },
      });
    });
  }

  protected override async assertNoActiveReferences(id: string): Promise<void> {
    const assignedRoles = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, id));

    if (assignedRoles.some((r) => r.code === SYSTEM_ROLE_CODES.SUPER_ADMIN)) {
      await assertActiveSuperAdminRemains(id);
    }
  }
}

export const userRepository = new UserRepository();
