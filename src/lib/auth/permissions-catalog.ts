export type PermissionDefinition = {
  key: string;
  description: string;
};

const corePermissions: PermissionDefinition[] = [
  { key: "*:*", description: "Acceso total a todos los recursos (reservado para super_admin)" },
];

export const permissionsCatalog: PermissionDefinition[] = [...corePermissions];
