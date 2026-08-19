"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireAdminSession } from "@/lib/auth/require-admin-session";

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ error: string | null }> {
  return requireAdminSession(async (session, headersList) => {
    try {
      await auth.api.changePassword({
        headers: headersList,
        body: {
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
        },
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudo cambiar la contraseña." };
    }

    await db
      .update(users)
      .set({ mustChangePassword: false })
      .where(eq(users.id, session.user.id));

    return { error: null };
  });
}
