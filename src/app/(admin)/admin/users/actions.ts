"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { userRepository } from "@/lib/repositories/user-repository";

type ActionResult = { error: string | null };

function toErrorResult(err: unknown, fallback: string): ActionResult {
  return { error: err instanceof Error ? err.message : fallback };
}

export async function createUserAction(input: {
  email: string;
  name: string;
  password: string;
}): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("users:create");
    try {
      await userRepository.createUser({ ...input, mustChangePassword: true });
    } catch (err) {
      return toErrorResult(err, "No se pudo crear el usuario.");
    }
    revalidatePath("/admin/users");
    return { error: null };
  });
}

export async function updateUserAction(
  userId: string,
  input: { name: string; email: string },
): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("users:update");
    try {
      await userRepository.update(userId, input);
    } catch (err) {
      return toErrorResult(err, "No se pudo actualizar el usuario.");
    }
    revalidatePath("/admin/users");
    return { error: null };
  });
}

export async function deactivateUserAction(userId: string): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("users:delete");
    try {
      await userRepository.softDelete(userId);
    } catch (err) {
      return toErrorResult(err, "No se pudo desactivar el usuario.");
    }
    revalidatePath("/admin/users");
    return { error: null };
  });
}

export async function restoreUserAction(userId: string): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("users:restore");
    try {
      await userRepository.restore(userId);
    } catch (err) {
      return toErrorResult(err, "No se pudo restaurar el usuario.");
    }
    revalidatePath("/admin/users");
    return { error: null };
  });
}

export async function assignRoleAction(userId: string, roleId: string): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("users:manage-roles");
    try {
      await userRepository.assignRole(userId, roleId);
    } catch (err) {
      return toErrorResult(err, "No se pudo asignar el rol.");
    }
    revalidatePath("/admin/users");
    return { error: null };
  });
}

export async function removeRoleAction(userId: string, roleId: string): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("users:manage-roles");
    try {
      await userRepository.removeRole(userId, roleId);
    } catch (err) {
      return toErrorResult(err, "No se pudo quitar el rol.");
    }
    revalidatePath("/admin/users");
    return { error: null };
  });
}
