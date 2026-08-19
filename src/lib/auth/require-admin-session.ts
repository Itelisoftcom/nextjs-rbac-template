import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { runWithRequestContext } from "@/lib/auth/request-context";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

type RequireAdminSessionOptions = {
  /**
   * Solo la página /admin/change-password (y su server action) deben pasar
   * true — cualquier otra página se queda con el default y hereda el
   * redirect forzado mientras mustChangePassword esté activo.
   */
  allowPendingPasswordChange?: boolean;
};

/**
 * Valida la sesión y, si existe, corre `fn` con el request-context poblado
 * (Regla 5: el actor de auditoría se toma del contexto, nunca se pasa a
 * mano). Usar en toda page / server action bajo el panel admin.
 */
export async function requireAdminSession<T>(
  fn: (session: Session, headersList: Headers) => Promise<T>,
  options: RequireAdminSessionOptions = {},
): Promise<T> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect("/login");
  }

  if (session.user.mustChangePassword && !options.allowPendingPasswordChange) {
    redirect("/admin/change-password");
  }

  return runWithRequestContext(
    {
      userId: session.user.id,
      ip: headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: headersList.get("user-agent"),
    },
    () => fn(session, headersList),
  );
}
