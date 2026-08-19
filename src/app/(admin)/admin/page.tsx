import { requireAdminSession } from "@/lib/auth/require-admin-session";

export default async function AdminPage() {
  return requireAdminSession(async (session) => (
    <div>
      <h1 className="text-2xl font-semibold">Panel admin</h1>
      <p className="text-muted-foreground mt-2">
        Bienvenido, {session.user.name}.
      </p>
    </div>
  ));
}
