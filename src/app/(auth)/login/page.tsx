import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppSettings } from "@/lib/settings/app-settings";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const settings = await getAppSettings();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <p className="text-lg font-semibold">{settings.appName}</p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense>
            <LoginForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
