import "dotenv/config";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { permissions, roles, rolePermissions } from "@/lib/db/schema";
import { permissionsCatalog } from "@/lib/auth/permissions-catalog";
import { FULL_ACCESS_ROLE_CODES, SYSTEM_ROLE_CODES } from "@/lib/auth/system-roles";

type RoleRow = typeof roles.$inferSelect;

async function syncPermissionsCatalog() {
  for (const definition of permissionsCatalog) {
    const [existing] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.key, definition.key));

    if (existing) {
      await db
        .update(permissions)
        .set({ description: definition.description })
        .where(eq(permissions.id, existing.id));
    } else {
      await db.insert(permissions).values({
        id: randomUUID(),
        key: definition.key,
        description: definition.description,
      });
    }
  }

  return db.select().from(permissions);
}

/**
 * Crea el rol si no existe (matcheando por `code`, no por nombre, para que
 * sobreviva a un rename desde el panel). Si ya existe, no toca nombre ni
 * descripción — esos campos son editables por un super_admin.
 */
async function ensureRoleByCode(
  code: string,
  defaults: { name: string; description: string; isSystem?: boolean },
): Promise<RoleRow> {
  const [existing] = await db.select().from(roles).where(eq(roles.code, code));
  if (existing) return existing;

  const [created] = await db
    .insert(roles)
    .values({
      id: randomUUID(),
      code,
      name: defaults.name,
      description: defaults.description,
      isSystem: defaults.isSystem ?? false,
    })
    .returning();
  return created;
}

async function replaceRolePermissions(roleId: string, permissionIds: string[]) {
  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (permissionIds.length) {
    await db
      .insert(rolePermissions)
      .values(permissionIds.map((permissionId) => ({ roleId, permissionId })));
  }
}

export async function seed() {
  const allPermissions = await syncPermissionsCatalog();
  const wildcardPermission = allPermissions.find((p) => p.key === "*:*");
  if (!wildcardPermission) {
    throw new Error("El catálogo de permisos no tiene el permiso '*:*' reservado para super_admin.");
  }

  const superAdmin = await ensureRoleByCode(SYSTEM_ROLE_CODES.SUPER_ADMIN, {
    name: "Super Admin",
    description: "Acceso total al sistema. Rol de sistema: no editable ni borrable.",
    isSystem: true,
  });

  const administrador = await ensureRoleByCode(SYSTEM_ROLE_CODES.ADMINISTRADOR, {
    name: "Administrador",
    description: "Acceso a todos los permisos disponibles. No se puede borrar.",
  });

  await ensureRoleByCode(SYSTEM_ROLE_CODES.GERENTE, {
    name: "Gerente",
    description: "Rol de ejemplo sin permisos asignados. Configúralo desde el panel.",
  });

  const nonWildcardPermissionIds = allPermissions
    .filter((p) => p.key !== "*:*")
    .map((p) => p.id);

  for (const code of FULL_ACCESS_ROLE_CODES) {
    if (code === SYSTEM_ROLE_CODES.SUPER_ADMIN) {
      await replaceRolePermissions(superAdmin.id, [wildcardPermission.id]);
    } else if (code === SYSTEM_ROLE_CODES.ADMINISTRADOR) {
      await replaceRolePermissions(administrador.id, nonWildcardPermissionIds);
    }
  }
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
  seed()
    .then(() => {
      console.log("Seed OK");
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
