"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setRolePermissionsAction } from "./actions";

type Permission = { id: string; key: string; description: string | null };

export function RolePermissionsDialog({
  roleId,
  roleName,
  allPermissions,
  assignedPermissionIds,
  locked,
}: {
  roleId: string;
  roleName: string;
  allPermissions: Permission[];
  assignedPermissionIds: string[];
  locked: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedPermissionIds));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const groups = useMemo(() => {
    const byResource = new Map<string, Permission[]>();
    for (const permission of allPermissions) {
      const resource = permission.key.split(":")[0] ?? permission.key;
      const list = byResource.get(resource) ?? [];
      list.push(permission);
      byResource.set(resource, list);
    }
    return [...byResource.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  function toggle(permissionId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(permissionId);
      else next.delete(permissionId);
      return next;
    });
  }

  async function handleSave() {
    setIsSubmitting(true);
    setError(null);
    const result = await setRolePermissionsAction(roleId, [...selected]);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setSelected(new Set(assignedPermissionIds));
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Permisos
          </Button>
        }
      />
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Permisos de {roleName}</DialogTitle>
        </DialogHeader>
        {locked ? (
          <p className="text-muted-foreground text-sm">
            Este rol siempre tiene todos los permisos disponibles — se sincroniza automáticamente y no
            se puede editar a mano.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map(([resource, perms]) => (
              <div key={resource} className="flex flex-col gap-2">
                <p className="text-sm font-medium capitalize">{resource}</p>
                <div className="flex flex-col gap-1.5 pl-1">
                  {perms.map((permission) => (
                    <Label key={permission.id} className="flex items-center gap-2 text-sm font-normal">
                      <Checkbox
                        checked={selected.has(permission.id)}
                        onCheckedChange={(checked) => toggle(permission.id, checked === true)}
                      />
                      <span>
                        {permission.key}
                        {permission.description ? (
                          <span className="text-muted-foreground"> — {permission.description}</span>
                        ) : null}
                      </span>
                    </Label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!locked ? (
          <DialogFooter>
            <Button disabled={isSubmitting} onClick={handleSave}>
              {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
