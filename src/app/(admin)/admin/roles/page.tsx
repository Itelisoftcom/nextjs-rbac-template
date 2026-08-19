import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Can } from "@/components/can";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { roleRepository, listAllPermissions } from "@/lib/repositories/role-repository";
import {
  DELETE_PROTECTED_ROLE_CODES,
  FULL_ACCESS_ROLE_CODES,
  type SystemRoleCode,
} from "@/lib/auth/system-roles";
import { CreateRoleDialog } from "./create-role-dialog";
import { EditRoleDialog } from "./edit-role-dialog";
import { DeleteRoleButton } from "./delete-role-button";
import { RolePermissionsDialog } from "./role-permissions-dialog";

export default async function RolesPage() {
  return requireAdminSession(async (session) => {
    await requirePermission("roles:read");

    const [rolesList, allPermissions] = await Promise.all([
      roleRepository.listWithPermissions(),
      listAllPermissions(),
    ]);

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Roles</h1>
          <Can userId={session.user.id} permission="roles:create">
            <CreateRoleDialog />
          </Can>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Permisos</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rolesList.map((role) => {
              const isFullAccess = Boolean(
                role.code && FULL_ACCESS_ROLE_CODES.includes(role.code as SystemRoleCode),
              );
              const isDeleteProtected = Boolean(
                role.isSystem ||
                  (role.code && DELETE_PROTECTED_ROLE_CODES.includes(role.code as SystemRoleCode)),
              );
              return (
                <TableRow key={role.id}>
                  <TableCell className="flex items-center gap-2">
                    {role.name}
                    {role.isSystem ? <Badge variant="outline">Sistema</Badge> : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{role.description}</TableCell>
                  <TableCell>
                    {isFullAccess ? (
                      <Badge variant="secondary">Todos los permisos</Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {role.permissionIds.length} permiso(s)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Can userId={session.user.id} permission="roles:manage-permissions">
                      <RolePermissionsDialog
                        roleId={role.id}
                        roleName={role.name}
                        allPermissions={allPermissions}
                        assignedPermissionIds={role.permissionIds}
                        locked={isFullAccess}
                      />
                    </Can>
                    {!role.isSystem ? (
                      <Can userId={session.user.id} permission="roles:update">
                        <EditRoleDialog
                          roleId={role.id}
                          initialName={role.name}
                          initialDescription={role.description ?? ""}
                        />
                      </Can>
                    ) : null}
                    {!isDeleteProtected ? (
                      <Can userId={session.user.id} permission="roles:delete">
                        <DeleteRoleButton roleId={role.id} />
                      </Can>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  });
}
