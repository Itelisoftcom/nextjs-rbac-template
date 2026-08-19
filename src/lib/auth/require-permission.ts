import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  permissions,
  roles,
  rolePermissions,
  userPermissions,
  userRoles,
  users,
} from "@/lib/db/schema";
import { getRequestContext } from "@/lib/auth/request-context";

export class UnauthorizedError extends Error {
  constructor() {
    super("No hay una sesión activa.");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(public readonly permission: string) {
    super(`No tienes el permiso requerido: ${permission}`);
    this.name = "ForbiddenError";
  }
}

/**
 * granted="facturas:*" cubre "facturas:update:own"; granted="facturas:update:any"
 * cubre requested="facturas:update:own" (any implica own); "*:*" cubre todo.
 */
function permissionCovers(granted: string, requested: string): boolean {
  const g = granted.split(":");
  const r = requested.split(":");

  for (let i = 0; i < r.length; i++) {
    const gSeg = g[i];
    const rSeg = r[i];
    if (gSeg === undefined) return true;
    if (gSeg === "*") continue;
    if (gSeg === rSeg) continue;
    if (gSeg === "any" && rSeg === "own") continue;
    return false;
  }
  return true;
}

async function getEffectivePermissionKeys(userId: string) {
  const roleKeys = await db
    .select({ key: permissions.key })
    .from(userRoles)
    .innerJoin(roles, and(eq(roles.id, userRoles.roleId), isNull(roles.deletedAt)))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
    .where(eq(userRoles.userId, userId));

  const overrides = await db
    .select({ key: permissions.key, effect: userPermissions.effect })
    .from(userPermissions)
    .innerJoin(permissions, eq(permissions.id, userPermissions.permissionId))
    .where(eq(userPermissions.userId, userId));

  const granted = new Set(roleKeys.map((r) => r.key));
  const denied = new Set<string>();
  for (const o of overrides) {
    if (o.effect === "grant") granted.add(o.key);
    else denied.add(o.key);
  }

  return { granted: [...granted], denied: [...denied] };
}

export async function requirePermission(key: string) {
  const { userId } = getRequestContext();
  if (!userId) throw new UnauthorizedError();

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));

  if (!user || !user.isActive) throw new UnauthorizedError();

  const { granted, denied } = await getEffectivePermissionKeys(userId);

  if (denied.some((d) => permissionCovers(d, key))) {
    throw new ForbiddenError(key);
  }
  if (!granted.some((g) => permissionCovers(g, key))) {
    throw new ForbiddenError(key);
  }

  return user;
}
