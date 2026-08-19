import type { ReactNode } from "react";
import { hasPermission } from "@/lib/auth/require-permission";

type CanProps = {
  userId: string;
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Oculta/muestra UI según permisos. Cosmético únicamente — la verificación
 * real siempre vive en el server action / route handler (Regla 2).
 */
export async function Can({ userId, permission, children, fallback = null }: CanProps) {
  const allowed = await hasPermission(userId, permission);
  return allowed ? children : fallback;
}
