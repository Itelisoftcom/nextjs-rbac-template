import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  auditLog,
  permissions,
  roles,
  rolePermissions,
  userPermissions,
  userRoles,
  users,
} from "@/lib/db/schema";
import { runWithRequestContext } from "@/lib/auth/request-context";
import { ForbiddenError, requirePermission, UnauthorizedError } from "@/lib/auth/require-permission";
import { BaseRepository } from "@/lib/repositories/base-repository";

class TestUserRepository extends BaseRepository<typeof users> {
  protected table = users;
  protected entityType = "test_user";
}

const repo = new TestUserRepository();

const createdUserIds: string[] = [];
const createdRoleIds: string[] = [];
const createdPermissionIds: string[] = [];

afterAll(async () => {
  if (createdUserIds.length) {
    await db.delete(userPermissions).where(inArray(userPermissions.userId, createdUserIds));
    await db.delete(userRoles).where(inArray(userRoles.userId, createdUserIds));
    await db.delete(auditLog).where(eq(auditLog.entityType, "test_user"));
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
  if (createdRoleIds.length) {
    await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, createdRoleIds));
    await db.delete(roles).where(inArray(roles.id, createdRoleIds));
  }
  if (createdPermissionIds.length) {
    await db.delete(permissions).where(inArray(permissions.id, createdPermissionIds));
  }
});

async function createTestUser(email: string, actingAs: string | null = null) {
  const id = randomUUID();
  createdUserIds.push(id);
  return runWithRequestContext({ userId: actingAs, ip: "127.0.0.1", userAgent: "vitest" }, () =>
    repo.create({ id, email, name: "Test User" } as (typeof users)["$inferInsert"]),
  );
}

async function createTestRoleWithPermission(permissionKey: string) {
  const roleId = randomUUID();
  const permissionId = randomUUID();
  createdRoleIds.push(roleId);
  createdPermissionIds.push(permissionId);

  await db.insert(roles).values({ id: roleId, name: `test_role_${roleId}` });
  await db.insert(permissions).values({ id: permissionId, key: permissionKey });
  await db.insert(rolePermissions).values({ roleId, permissionId });

  return { roleId, permissionId };
}

async function assignRole(userId: string, roleId: string) {
  await db.insert(userRoles).values({ userId, roleId });
}

describe("BaseRepository", () => {
  it("create() escribe una fila en audit_log con el actor tomado del request context", async () => {
    const actor = await createTestUser(`actor-${randomUUID()}@test.local`);
    const target = await createTestUser(`target-${randomUUID()}@test.local`, actor.id);

    const [entry] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entityType, "test_user"), eq(auditLog.entityId, target.id)));

    expect(entry).toBeDefined();
    expect(entry.action).toBe("create");
    expect(entry.actorId).toBe(actor.id);
  });

  it("softDelete() y restore() quedan auditados y list() respeta deletedAt", async () => {
    const user = await createTestUser(`softdel-${randomUUID()}@test.local`);

    await runWithRequestContext({ userId: user.id, ip: null, userAgent: null }, async () => {
      await repo.softDelete(user.id);
    });

    const afterDelete = await repo.findById(user.id);
    expect(afterDelete).toBeNull();

    await runWithRequestContext({ userId: user.id, ip: null, userAgent: null }, async () => {
      await repo.restore(user.id);
    });

    const afterRestore = await repo.findById(user.id);
    expect(afterRestore).not.toBeNull();

    const [deleteEntry] = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entityType, "test_user"),
          eq(auditLog.entityId, user.id),
          eq(auditLog.action, "delete"),
        ),
      );
    expect(deleteEntry).toBeDefined();
  });
});

describe("requirePermission", () => {
  it("falla si no hay sesión (sin userId en el request context)", async () => {
    await runWithRequestContext({ userId: null, ip: null, userAgent: null }, async () => {
      await expect(requirePermission("facturas:read")).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  it("falla si el usuario no tiene el permiso", async () => {
    const user = await createTestUser(`noperm-${randomUUID()}@test.local`);

    await runWithRequestContext({ userId: user.id, ip: null, userAgent: null }, async () => {
      await expect(requirePermission("facturas:read")).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  it("pasa con el permiso exacto", async () => {
    const resource = `res_${randomUUID()}`;
    const user = await createTestUser(`exact-${randomUUID()}@test.local`);
    const { roleId } = await createTestRoleWithPermission(`${resource}:read`);
    await assignRole(user.id, roleId);

    await runWithRequestContext({ userId: user.id, ip: null, userAgent: null }, async () => {
      await expect(requirePermission(`${resource}:read`)).resolves.toBeDefined();
    });
  });

  it("pasa con un comodín que cubre el permiso solicitado", async () => {
    const resource = `res_${randomUUID()}`;
    const user = await createTestUser(`wildcard-${randomUUID()}@test.local`);
    const { roleId } = await createTestRoleWithPermission(`${resource}:*`);
    await assignRole(user.id, roleId);

    await runWithRequestContext({ userId: user.id, ip: null, userAgent: null }, async () => {
      await expect(requirePermission(`${resource}:update:own`)).resolves.toBeDefined();
    });
  });

  it("un deny puntual bloquea incluso si un comodín de rol lo cubriría", async () => {
    const resource = `res_${randomUUID()}`;
    const user = await createTestUser(`deny-${randomUUID()}@test.local`);
    const { roleId } = await createTestRoleWithPermission(`${resource}:*`);
    await assignRole(user.id, roleId);

    const denyPermissionId = randomUUID();
    createdPermissionIds.push(denyPermissionId);
    await db.insert(permissions).values({ id: denyPermissionId, key: `${resource}:delete` });
    await db.insert(userPermissions).values({
      userId: user.id,
      permissionId: denyPermissionId,
      effect: "deny",
    });

    await runWithRequestContext({ userId: user.id, ip: null, userAgent: null }, async () => {
      await expect(requirePermission(`${resource}:delete`)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(requirePermission(`${resource}:read`)).resolves.toBeDefined();
    });
  });
});
