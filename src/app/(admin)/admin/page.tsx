import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { LogoutButton } from "./logout-button";

export default async function AdminPage() {
  return requireAdminSession(async (session) => {
    if (session.user.mustChangePassword) {
      redirect("/admin/change-password");
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <p>
          Sesión activa: {session.user.name} ({session.user.email})
        </p>
        <LogoutButton />
      </main>
    );
  });
}
