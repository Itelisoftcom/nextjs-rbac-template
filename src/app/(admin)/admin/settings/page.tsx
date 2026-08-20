import { isNull } from "drizzle-orm";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission, hasPermission } from "@/lib/auth/require-permission";
import { getAppSettings } from "@/lib/settings/app-settings";
import { db } from "@/lib/db";
import { themes } from "@/lib/db/schema";
import { FONT_OPTIONS } from "@/lib/theme/fonts";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  return requireAdminSession(async (session) => {
    await requirePermission("settings:read");

    const [settings, availableThemes, canUpdate] = await Promise.all([
      getAppSettings(),
      db.select({ id: themes.id, name: themes.name }).from(themes).where(isNull(themes.deletedAt)),
      hasPermission(session.user.id, "settings:update"),
    ]);

    const fontOptions = FONT_OPTIONS.map((f) => ({ id: f.id, label: f.label }));
    const currentThemeName = settings.defaultThemeId
      ? (availableThemes.find((t) => t.id === settings.defaultThemeId)?.name ?? "Default")
      : "Default";
    const currentFontLabel = fontOptions.find((f) => f.id === settings.fontId)?.label ?? settings.fontId;

    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Configuración</h1>

        {canUpdate ? (
          <SettingsForm
            initialAppName={settings.appName}
            initialColorMode={settings.defaultColorMode}
            initialThemeId={settings.defaultThemeId}
            initialFontId={settings.fontId}
            availableThemes={availableThemes}
            fontOptions={fontOptions}
          />
        ) : (
          <dl className="grid max-w-md grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Nombre de la aplicación</dt>
            <dd>{settings.appName}</dd>
            <dt className="text-muted-foreground">Fuente</dt>
            <dd>{currentFontLabel}</dd>
            <dt className="text-muted-foreground">Modo de color por defecto</dt>
            <dd>{settings.defaultColorMode}</dd>
            <dt className="text-muted-foreground">Tema por defecto</dt>
            <dd>{currentThemeName}</dd>
          </dl>
        )}
      </div>
    );
  });
}
