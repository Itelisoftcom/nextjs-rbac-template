import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { runWithRequestContext } from "@/lib/auth/request-context";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

/**
 * Valida la sesión y, si existe, corre `fn` con el request-context poblado
 * (Regla 5: el actor de auditoría se toma del contexto, nunca se pasa a
 * mano). Usar en toda page / server action bajo el panel admin.
 */
export async function requireAdminSession<T>(
  fn: (session: Session, headersList: Headers) => Promise<T>,
): Promise<T> {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session) {
    redirect("/login");
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
