"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { userRepository } from "@/lib/repositories/user-repository";

type ActionResult = { error: string | null };

/**
 * A diferencia de las acciones de /admin/themes, esta no requiere ningún
 * permiso: cualquier usuario logueado puede elegir su propio modo de color
 * y, si existen, un tema personalizado — es una preferencia personal, no
 * una capacidad de administración.
 */
export async function setMyThemePreferenceAction(input: {
  colorMode: "light" | "dark" | "system";
  themeId: string | null;
}): Promise<ActionResult> {
  return requireAdminSession(
    async (session) => {
      try {
        await userRepository.update(session.user.id, {
          colorMode: input.colorMode,
          themeId: input.themeId,
        });
      } catch (err) {
        return { error: err instanceof Error ? err.message : "No se pudo guardar la preferencia." };
      }
      revalidatePath("/", "layout");
      return { error: null };
    },
    { allowPendingPasswordChange: true },
  );
}
