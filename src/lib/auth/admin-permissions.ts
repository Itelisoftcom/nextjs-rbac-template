import type { PermissionDefinition } from "@/lib/auth/permissions-catalog";

export const adminPermissions: PermissionDefinition[] = [
  { key: "users:read", description: "Ver el listado de usuarios" },
  { key: "users:create", description: "Crear usuarios" },
  { key: "users:update", description: "Editar datos de usuarios" },
  { key: "users:delete", description: "Desactivar (soft delete) usuarios" },
  { key: "users:restore", description: "Restaurar usuarios desactivados" },
  { key: "users:manage-roles", description: "Asignar o quitar roles a un usuario" },

  { key: "roles:read", description: "Ver el listado de roles" },
  { key: "roles:create", description: "Crear roles" },
  { key: "roles:update", description: "Editar nombre/descripción de un rol" },
  { key: "roles:delete", description: "Borrar (soft delete) roles" },
  { key: "roles:manage-permissions", description: "Asignar o quitar permisos a un rol" },

  { key: "audit_log:read", description: "Ver el log de auditoría" },

  { key: "settings:read", description: "Ver la configuración general" },
  { key: "settings:update", description: "Editar la configuración general" },
];
