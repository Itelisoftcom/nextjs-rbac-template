import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { writeAudit } from "@/lib/audit/write-audit";

export const APP_SETTINGS_ID = "global";

export type AppSettings = typeof appSettings.$inferSelect;

/**
 * Fila única (id fijo). seed.ts la crea si no existe; esta función asume
 * que ya existe (no hay UI para tener cero o más de una).
 */
export async function getAppSettings(): Promise<AppSettings> {
  const [settings] = await db.select().from(appSettings).where(eq(appSettings.id, APP_SETTINGS_ID));
  if (!settings) {
    throw new Error("app_settings no tiene la fila global — corré `npm run db:seed`.");
  }
  return settings;
}

/**
 * No pasa por BaseRepository (no es una entidad listable/soft-deletable,
 * es config de una sola fila) — audita a mano, como pide la Regla 5 para
 * cambios de estado fuera del repo base.
 */
export async function updateAppSettings(values: {
  appName?: string;
  defaultColorMode?: "light" | "dark" | "system";
  defaultThemeId?: string | null;
  fontId?: string;
  borderRadius?: number;
  fontScale?: number;
}): Promise<AppSettings> {
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(appSettings).where(eq(appSettings.id, APP_SETTINGS_ID));
    const [after] = await tx
      .update(appSettings)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(appSettings.id, APP_SETTINGS_ID))
      .returning();

    await writeAudit(tx, {
      action: "update",
      entityType: "app_settings",
      entityId: APP_SETTINGS_ID,
      before: before as Record<string, unknown>,
      after: after as Record<string, unknown>,
    });

    return after;
  });
}
