"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { roleRepository } from "@/lib/repositories/role-repository";

type ActionResult = { error: string | null };

function toErrorResult(err: unknown, fallback: string): ActionResult {
  return { error: err instanceof Error ? err.message : fallback };
}

export async function createRoleAction(input: {
  name: string;
  description: string;
}): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("roles:create");
    try {
      await roleRepository.create({ id: randomUUID(), name: input.name, description: input.description });
    } catch (err) {
      return toErrorResult(err, "No se pudo crear el rol.");
    }
    revalidatePath("/admin/roles");
    return { error: null };
  });
}

export async function updateRoleAction(
  roleId: string,
  input: { name: string; description: string },
): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("roles:update");
    try {
      await roleRepository.update(roleId, input);
    } catch (err) {
      return toErrorResult(err, "No se pudo actualizar el rol.");
    }
    revalidatePath("/admin/roles");
    return { error: null };
  });
}

export async function deleteRoleAction(roleId: string): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("roles:delete");
    try {
      await roleRepository.softDelete(roleId);
    } catch (err) {
      return toErrorResult(err, "No se pudo borrar el rol.");
    }
    revalidatePath("/admin/roles");
    return { error: null };
  });
}

export async function setRolePermissionsAction(
  roleId: string,
  permissionIds: string[],
): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("roles:manage-permissions");
    try {
      await roleRepository.setPermissions(roleId, permissionIds);
    } catch (err) {
      return toErrorResult(err, "No se pudieron actualizar los permisos.");
    }
    revalidatePath("/admin/roles");
    return { error: null };
  });
}
