import { isNull } from "drizzle-orm";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission, hasPermission } from "@/lib/auth/require-permission";
import { getAppSettings } from "@/lib/settings/app-settings";
import { db } from "@/lib/db";
import { themes } from "@/lib/db/schema";
import { FONT_OPTIONS } from "@/lib/theme/fonts";
import { BORDER_RADIUS_PRESETS, FONT_SCALE_PRESETS } from "@/lib/theme/appearance-presets";
import { AppearanceForm } from "./appearance-form";
import { ThemesSection } from "./themes-section";

export default async function AppearancePage() {
  return requireAdminSession(async (session) => {
    await requirePermission("settings:read");

    const [settings, availableThemes, canUpdate, canReadThemes] = await Promise.all([
      getAppSettings(),
      db.select({ id: themes.id, name: themes.name }).from(themes).where(isNull(themes.deletedAt)),
      hasPermission(session.user.id, "settings:update"),
      hasPermission(session.user.id, "themes:read"),
    ]);

    const fontOptions = FONT_OPTIONS.map((f) => ({ id: f.id, label: f.label }));
    const currentThemeName = settings.defaultThemeId
      ? (availableThemes.find((t) => t.id === settings.defaultThemeId)?.name ?? "Default")
      : "Default";
    const currentFontLabel = fontOptions.find((f) => f.id === settings.fontId)?.label ?? settings.fontId;
    const currentRadiusLabel =
      BORDER_RADIUS_PRESETS.find((p) => p.value === settings.borderRadius)?.label ?? `${settings.borderRadius}rem`;
    const currentScaleLabel =
      FONT_SCALE_PRESETS.find((p) => p.value === settings.fontScale)?.label ?? `${settings.fontScale}%`;

    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold">Apariencia</h1>
          <p className="text-muted-foreground text-sm">
            Diseño del sitio: fuente, redondeado de bordes, tamaño de texto, y los temas de color
            disponibles para todos los usuarios.
          </p>
        </div>

        {canUpdate ? (
          <AppearanceForm
            initialColorMode={settings.defaultColorMode}
            initialThemeId={settings.defaultThemeId}
            initialFontId={settings.fontId}
            initialBorderRadius={settings.borderRadius}
            initialFontScale={settings.fontScale}
            availableThemes={availableThemes}
            fontOptions={fontOptions}
          />
        ) : (
          <dl className="grid max-w-md grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Fuente</dt>
            <dd>{currentFontLabel}</dd>
            <dt className="text-muted-foreground">Redondeado de bordes</dt>
            <dd>{currentRadiusLabel}</dd>
            <dt className="text-muted-foreground">Tamaño de fuente</dt>
            <dd>{currentScaleLabel}</dd>
            <dt className="text-muted-foreground">Modo de color por defecto</dt>
            <dd>{settings.defaultColorMode}</dd>
            <dt className="text-muted-foreground">Tema por defecto</dt>
            <dd>{currentThemeName}</dd>
          </dl>
        )}

        {canReadThemes ? <ThemesSection userId={session.user.id} /> : null}
      </div>
    );
  });
}
