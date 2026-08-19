import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  return requireAdminSession(
    async () => (
      <div className="flex justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Cambiar contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    ),
    { allowPendingPasswordChange: true },
  );
}
