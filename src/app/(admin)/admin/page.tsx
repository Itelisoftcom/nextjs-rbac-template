import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { LogoutButton } from "./logout-button";

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <p>
        Sesión activa: {session.user.name} ({session.user.email})
      </p>
      <LogoutButton />
    </main>
  );
}
