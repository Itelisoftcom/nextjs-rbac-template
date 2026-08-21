import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission, hasPermission } from "@/lib/auth/require-permission";
import { getAppSettings } from "@/lib/settings/app-settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  return requireAdminSession(async (session) => {
    await requirePermission("settings:read");

    const [settings, canUpdate] = await Promise.all([
      getAppSettings(),
      hasPermission(session.user.id, "settings:update"),
    ]);

    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Configuración</h1>

        {canUpdate ? (
          <SettingsForm initialAppName={settings.appName} />
        ) : (
          <dl className="grid max-w-md grid-cols-2 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Nombre de la aplicación</dt>
            <dd>{settings.appName}</dd>
          </dl>
        )}
      </div>
    );
  });
}
