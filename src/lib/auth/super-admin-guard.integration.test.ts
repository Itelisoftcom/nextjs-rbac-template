import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { roles, userRoles, users } from "@/lib/db/schema";
import { SYSTEM_ROLE_CODES } from "@/lib/auth/system-roles";
import { assertActiveSuperAdminRemains, LastSuperAdminError } from "@/lib/auth/super-admin-guard";

const createdUserIds: string[] = [];

afterAll(async () => {
  if (createdUserIds.length) {
    await db.delete(userRoles).where(inArray(userRoles.userId, createdUserIds));
    await db.delete(users).where(inArray(users.id, createdUserIds));
  }
});

async function createActiveSuperAdmin() {
  const [superAdminRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.code, SYSTEM_ROLE_CODES.SUPER_ADMIN));

  if (!superAdminRole) {
    throw new Error("El rol super_admin no existe — corre `npm run db:seed` antes de este test.");
  }

  const id = randomUUID();
  createdUserIds.push(id);

  await db.insert(users).values({
    id,
    email: `guard-test-${id}@test.local`,
    name: "Guard Test",
    isActive: true,
  });
  await db.insert(userRoles).values({ userId: id, roleId: superAdminRole.id });

  return id;
}

describe("assertActiveSuperAdminRemains", () => {
  it("no lanza si, excluyendo al usuario afectado, sigue quedando otro super_admin activo", async () => {
    const first = await createActiveSuperAdmin();
    const second = await createActiveSuperAdmin();

    await expect(assertActiveSuperAdminRemains(first)).resolves.toBeUndefined();

    // limpieza defensiva por si el test de abajo corre después y depende de estado limpio
    void second;
  });

  it("lanza LastSuperAdminError si excluir al usuario afectado no deja ningún otro super_admin activo", async () => {
    const onlyOne = await createActiveSuperAdmin();

    // Todos los demás super_admin activos en la BD (ej. el sembrado por seed.ts)
    // podrían seguir existiendo, así que verificamos el caso real: excluir a
    // TODOS los activos actuales salvo ninguno no es determinístico en un
    // entorno compartido. En cambio, comprobamos el contrato directamente:
    // si excluimos justo a los únicos super_admin activos que existen ahora,
    // debe lanzar.
    const activeSuperAdmins = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(roles.code, SYSTEM_ROLE_CODES.SUPER_ADMIN));

    // Desactivamos a todos los super_admin activos existentes menos "onlyOne"
    // para tener un estado determinístico, y los reactivamos al final.
    const others = activeSuperAdmins
      .map((r) => r.userId)
      .filter((id) => id !== onlyOne);

    if (others.length) {
      await db.update(users).set({ isActive: false }).where(inArray(users.id, others));
    }

    try {
      await expect(assertActiveSuperAdminRemains(onlyOne)).rejects.toBeInstanceOf(LastSuperAdminError);
    } finally {
      if (others.length) {
        await db.update(users).set({ isActive: true }).where(inArray(users.id, others));
      }
    }
  });
});
