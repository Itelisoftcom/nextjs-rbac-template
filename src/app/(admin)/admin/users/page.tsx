import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Can } from "@/components/can";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { userRepository } from "@/lib/repositories/user-repository";
import { roleRepository } from "@/lib/repositories/role-repository";
import { CreateUserDialog } from "./create-user-dialog";
import { EditUserDialog } from "./edit-user-dialog";
import { ToggleActiveButton } from "./toggle-active-button";
import { UserRoleManager } from "./user-role-manager";

export default async function UsersPage() {
  return requireAdminSession(async (session) => {
    await requirePermission("users:read");

    const [usersList, roles] = await Promise.all([
      userRepository.listWithRoles({ includeDeleted: true }),
      roleRepository.listWithPermissions(),
    ]);

    const availableRoles = roles.map((r) => ({ id: r.id, name: r.name }));

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <Can userId={session.user.id} permission="users:create">
            <CreateUserDialog />
          </Can>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersList.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Can
                    userId={session.user.id}
                    permission="users:manage-roles"
                    fallback={
                      user.roles.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Sin roles</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.roles.map((r) => (
                            <Badge key={r.id} variant="secondary">
                              {r.name}
                            </Badge>
                          ))}
                        </div>
                      )
                    }
                  >
                    <UserRoleManager
                      userId={user.id}
                      assignedRoles={user.roles}
                      availableRoles={availableRoles}
                    />
                  </Can>
                </TableCell>
                <TableCell>
                  {user.deletedAt ? <Badge variant="destructive">Desactivado</Badge> : <Badge>Activo</Badge>}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Can userId={session.user.id} permission="users:update">
                    <EditUserDialog userId={user.id} initialName={user.name} initialEmail={user.email} />
                  </Can>
                  <Can
                    userId={session.user.id}
                    permission={user.deletedAt ? "users:restore" : "users:delete"}
                  >
                    <ToggleActiveButton userId={user.id} isDeleted={Boolean(user.deletedAt)} />
                  </Can>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  });
}
