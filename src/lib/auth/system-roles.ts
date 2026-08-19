export const SYSTEM_ROLE_CODES = {
  SUPER_ADMIN: "super_admin",
  ADMINISTRADOR: "administrador",
  GERENTE: "gerente",
} as const;

export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[keyof typeof SYSTEM_ROLE_CODES];

/**
 * Roles cuyo permiso completo se re-sincroniza en cada seed, sin importar
 * ediciones manuales previas desde el panel.
 */
export const FULL_ACCESS_ROLE_CODES: SystemRoleCode[] = [
  SYSTEM_ROLE_CODES.SUPER_ADMIN,
  SYSTEM_ROLE_CODES.ADMINISTRADOR,
];

/**
 * Roles que no se pueden borrar desde el panel. super_admin además no se
 * puede editar (ver Regla 7 de CLAUDE.md); administrador sí es editable
 * (nombre, descripción), solo está protegido contra borrado.
 */
export const DELETE_PROTECTED_ROLE_CODES: SystemRoleCode[] = [
  SYSTEM_ROLE_CODES.SUPER_ADMIN,
  SYSTEM_ROLE_CODES.ADMINISTRADOR,
];
