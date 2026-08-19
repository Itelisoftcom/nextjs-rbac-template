import { eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { permissions, roles, rolePermissions, userRoles } from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit/write-audit";
import { BaseRepository } from "@/lib/repositories/base-repository";
import { DELETE_PROTECTED_ROLE_CODES, FULL_ACCESS_ROLE_CODES, type SystemRoleCode } from "@/lib/auth/system-roles";

export type RoleWithPermissions = typeof roles.$inferSelect & {
  permissionIds: string[];
};

export class RoleRepository extends BaseRepository<typeof roles> {
  protected table = roles;
  protected entityType = "role";

  async listWithPermissions(): Promise<RoleWithPermissions[]> {
    const roleRows = await db.select().from(roles).where(isNull(roles.deletedAt)).orderBy(roles.createdAt);

    const permRows = await db
      .select({ roleId: rolePermissions.roleId, permissionId: rolePermissions.permissionId })
      .from(rolePermissions);

    return roleRows.map((role) => ({
      ...role,
      permissionIds: permRows.filter((p) => p.roleId === role.id).map((p) => p.permissionId),
    }));
  }

  async update(id: string, values: Partial<typeof roles.$inferInsert>) {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (role?.isSystem) {
      throw new Error(`El rol "${role.name}" es un rol de sistema y no se puede editar.`);
    }
    return super.update(id, values);
  }

  /**
   * Reemplaza por completo el set de permisos del rol (checklist del panel).
   * Los roles de acceso total (super_admin, administrador) se sincronizan
   * solo desde seed.ts — no se pueden editar a mano.
   */
  async setPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
    if (!role) throw new Error("Rol no encontrado.");
    if (role.code && FULL_ACCESS_ROLE_CODES.includes(role.code as SystemRoleCode)) {
      throw new Error(`Los permisos de "${role.name}" se sincronizan automáticamente y no se pueden editar a mano.`);
    }

    await db.transaction(async (tx) => {
      const before = await tx
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
      if (permissionIds.length) {
        await tx.insert(rolePermissions).values(permissionIds.map((permissionId) => ({ roleId, permissionId })));
      }

      await writeAudit(tx, {
        action: "update",
        entityType: this.entityType,
        entityId: roleId,
        before: { permissionIds: before.map((b) => b.permissionId) },
        after: { permissionIds },
      });
    });
  }

  protected override async assertNoActiveReferences(id: string): Promise<void> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (!role) return;

    if (role.isSystem || (role.code && DELETE_PROTECTED_ROLE_CODES.includes(role.code as SystemRoleCode))) {
      throw new Error(`El rol "${role.name}" está protegido y no se puede borrar.`);
    }

    const assignedUsers = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, id));

    if (assignedUsers.length > 0) {
      throw new Error(
        `No se puede borrar el rol "${role.name}": tiene ${assignedUsers.length} usuario(s) asignado(s).`,
      );
    }
  }
}

export const roleRepository = new RoleRepository();

export async function listAllPermissions() {
  return db.select().from(permissions).orderBy(permissions.key);
}
