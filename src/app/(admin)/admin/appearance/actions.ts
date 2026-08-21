"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { updateAppSettings } from "@/lib/settings/app-settings";

type ActionResult = { error: string | null };

export async function updateAppearanceSettingsAction(input: {
  fontId: string;
  borderRadius: number;
  fontScale: number;
  defaultColorMode: "light" | "dark" | "system";
  defaultThemeId: string | null;
}): Promise<ActionResult> {
  return requireAdminSession(async () => {
    await requirePermission("settings:update");
    try {
      await updateAppSettings(input);
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo guardar la apariencia." };
    }
    revalidatePath("/", "layout");
    return { error: null };
  });
}
