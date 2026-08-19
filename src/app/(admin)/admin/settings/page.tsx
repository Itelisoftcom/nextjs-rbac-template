import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission } from "@/lib/auth/require-permission";

export default async function SettingsPage() {
  return requireAdminSession(async () => {
    await requirePermission("settings:read");

    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-muted-foreground text-sm">
          El tema global por defecto y otras opciones generales se configuran acá — pendiente de la
          Fase 6 (Temas) del plan.
        </p>
      </div>
    );
  });
}
