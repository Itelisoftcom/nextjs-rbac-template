"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { themeRepository } from "@/lib/repositories/theme-repository";
import type { SeedColors } from "@/lib/theme/derive-palette";

type ActionResult = { error: string | null };

function toErrorResult(err: unknown, fallback: string): ActionResult {
  return { error: err instanceof Error ? err.message : fallback };
}

export async function createThemeAction(input: {
  name: string;
  lightSeed: SeedColors;
  darkSeed: SeedColors;
}): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("themes:create");
    try {
      await themeRepository.createTheme(input);
    } catch (err) {
      return toErrorResult(err, "No se pudo crear el tema.");
    }
    revalidatePath("/", "layout");
    return { error: null };
  });
}

export async function updateThemeAction(
  id: string,
  input: { name?: string; lightSeed?: SeedColors; darkSeed?: SeedColors },
): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("themes:update");
    try {
      await themeRepository.updateTheme(id, input);
    } catch (err) {
      return toErrorResult(err, "No se pudo actualizar el tema.");
    }
    revalidatePath("/", "layout");
    return { error: null };
  });
}

export async function deleteThemeAction(id: string): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("themes:delete");
    try {
      await themeRepository.softDelete(id);
    } catch (err) {
      return toErrorResult(err, "No se pudo borrar el tema.");
    }
    revalidatePath("/", "layout");
    return { error: null };
  });
}
