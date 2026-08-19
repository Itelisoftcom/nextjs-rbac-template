import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import { SYSTEM_ROLE_CODES } from "@/lib/auth/system-roles";

export class LastSuperAdminError extends Error {
  constructor() {
    super("Debe quedar al menos un usuario activo con rol super_admin.");
    this.name = "LastSuperAdminError";
  }
}

/**
 * Regla 7: nunca puede quedar el sistema sin ningún usuario activo con rol
 * super_admin. Llamar ANTES de aplicar una operación que desactivaría,
 * borraría, o le quitaría el rol super_admin a un usuario — pasando ese
 * usuario en `excludingUserId` para simular el estado post-operación.
 */
export async function assertActiveSuperAdminRemains(excludingUserId?: string): Promise<void> {
  const rows = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(
      roles,
      and(eq(roles.id, userRoles.roleId), eq(roles.code, SYSTEM_ROLE_CODES.SUPER_ADMIN), isNull(roles.deletedAt)),
    )
    .innerJoin(users, and(eq(users.id, userRoles.userId), eq(users.isActive, true), isNull(users.deletedAt)));

  const remaining = excludingUserId ? rows.filter((r) => r.userId !== excludingUserId) : rows;

  if (remaining.length === 0) {
    throw new LastSuperAdminError();
  }
}
