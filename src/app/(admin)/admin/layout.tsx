import Link from "next/link";
import type { ReactNode } from "react";
import { isNull } from "drizzle-orm";
import { Can } from "@/components/can";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { db } from "@/lib/db";
import { themes } from "@/lib/db/schema";
import { LogoutButton } from "./logout-button";
import { ThemeSwitcher } from "./theme-switcher";

const NAV_ITEMS = [
  { href: "/admin/users", label: "Usuarios", permission: "users:read" },
  { href: "/admin/roles", label: "Roles", permission: "roles:read" },
  { href: "/admin/audit-log", label: "Audit Log", permission: "audit_log:read" },
  { href: "/admin/appearance", label: "Apariencia", permission: "settings:read" },
  { href: "/admin/settings", label: "Configuración", permission: "settings:read" },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return requireAdminSession(
    async (session) => {
      const availableThemes = await db
        .select({ id: themes.id, name: themes.name })
        .from(themes)
        .where(isNull(themes.deletedAt))
        .orderBy(themes.name);

      return (
        <div className="flex min-h-screen">
          <aside className="flex w-56 shrink-0 flex-col gap-4 border-r p-4">
            <div>
              <p className="text-sm font-medium">{session.user.name}</p>
              <p className="text-muted-foreground truncate text-xs">{session.user.email}</p>
            </div>
            <nav className="flex flex-col gap-1 text-sm">
              <Link href="/admin" className="rounded px-2 py-1.5 hover:bg-accent">
                Inicio
              </Link>
              {NAV_ITEMS.map((item) => (
                <Can key={item.href} userId={session.user.id} permission={item.permission}>
                  <Link href={item.href} className="rounded px-2 py-1.5 hover:bg-accent">
                    {item.label}
                  </Link>
                </Can>
              ))}
            </nav>
            <ThemeSwitcher
              currentColorMode={session.user.colorMode as "light" | "dark" | "system"}
              currentThemeId={session.user.themeId ?? null}
              availableThemes={availableThemes}
            />
            <div className="mt-auto">
              <LogoutButton />
            </div>
          </aside>
          <main className="flex-1 p-6">{children}</main>
        </div>
      );
    },
    { allowPendingPasswordChange: true },
  );
}
