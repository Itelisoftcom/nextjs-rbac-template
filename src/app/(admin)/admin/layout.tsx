import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { headers } from "next/headers";
import { isNull } from "drizzle-orm";
import {
  LayoutDashboardIcon,
  UsersIcon,
  ShieldIcon,
  HistoryIcon,
  PaletteIcon,
  SettingsIcon,
} from "lucide-react";
import { Can } from "@/components/can";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { db } from "@/lib/db";
import { themes } from "@/lib/db/schema";
import { Header } from "./header";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** null = visible para cualquier sesión activa, sin permiso puntual. */
  permission: string | null;
  /**
   * Módulos que se marquen acá (y sus sub-rutas) no muestran el header de
   * la columna principal — para eso está pensado este campo, "seleccionar"
   * el módulo es simplemente ponerlo en true.
   */
  hideHeader?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Inicio", icon: LayoutDashboardIcon, permission: null },
  { href: "/admin/users", label: "Usuarios", icon: UsersIcon, permission: "users:read" },
  { href: "/admin/roles", label: "Roles", icon: ShieldIcon, permission: "roles:read" },
  { href: "/admin/audit-log", label: "Audit Log", icon: HistoryIcon, permission: "audit_log:read" },
  { href: "/admin/appearance", label: "Apariencia", icon: PaletteIcon, permission: "settings:read" },
  { href: "/admin/settings", label: "Configuración", icon: SettingsIcon, permission: "settings:read" },
];

function NavLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent"
    >
      <Icon className="size-4" />
      {item.label}
    </Link>
  );
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return requireAdminSession(
    async (session) => {
      const [availableThemes, pathname] = await Promise.all([
        db
          .select({ id: themes.id, name: themes.name })
          .from(themes)
          .where(isNull(themes.deletedAt))
          .orderBy(themes.name),
        headers().then((h) => h.get("x-pathname") ?? ""),
      ]);

      const shouldShowHeader = !NAV_ITEMS.some(
        (item) => item.hideHeader && pathname.startsWith(item.href),
      );

      return (
        <div className="flex min-h-screen">
          <aside className="flex w-56 shrink-0 flex-col gap-4 border-r p-4">
            <nav className="flex flex-col gap-1 text-sm">
              {NAV_ITEMS.map((item) =>
                item.permission === null ? (
                  <NavLink key={item.href} item={item} />
                ) : (
                  <Can key={item.href} userId={session.user.id} permission={item.permission}>
                    <NavLink item={item} />
                  </Can>
                ),
              )}
            </nav>
          </aside>
          <div className="flex flex-1 flex-col">
            {shouldShowHeader ? (
              <Header
                userName={session.user.name}
                userEmail={session.user.email}
                colorMode={session.user.colorMode as "light" | "dark" | "system"}
                themeId={session.user.themeId ?? null}
                availableThemes={availableThemes}
              />
            ) : null}
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      );
    },
    { allowPendingPasswordChange: true },
  );
}
