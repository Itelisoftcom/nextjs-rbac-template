"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignRoleAction, removeRoleAction } from "./actions";

type Role = { id: string; name: string };

export function UserRoleManager({
  userId,
  assignedRoles,
  availableRoles,
}: {
  userId: string;
  assignedRoles: Role[];
  availableRoles: Role[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const assignableRoles = availableRoles.filter(
    (r) => !assignedRoles.some((assigned) => assigned.id === r.id),
  );
  // Base UI's <Select.Value> solo muestra la etiqueta si el Root recibe un
  // mapa value -> label vía `items`; sin esto cae a mostrar el value crudo.
  const roleItems = useMemo(
    () => Object.fromEntries(assignableRoles.map((r) => [r.id, r.name])),
    [assignableRoles],
  );

  async function handleAssign() {
    if (!selected) return;
    setPending(true);
    setError(null);
    const result = await assignRoleAction(userId, selected);
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSelected("");
    router.refresh();
  }

  async function handleRemove(roleId: string) {
    setPending(true);
    setError(null);
    const result = await removeRoleAction(userId, roleId);
    setPending(false);
    if (result.error) {
      setError(result.error);
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {assignedRoles.length === 0 ? (
          <span className="text-muted-foreground text-xs">Sin roles</span>
        ) : (
          assignedRoles.map((role) => (
            <Badge key={role.id} variant="secondary" className="gap-1">
              {role.name}
              <button
                type="button"
                disabled={pending}
                onClick={() => handleRemove(role.id)}
                aria-label={`Quitar rol ${role.name}`}
                className="ml-1 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))
        )}
      </div>
      {assignableRoles.length > 0 ? (
        <div className="flex gap-2">
          <Select items={roleItems} value={selected} onValueChange={(value) => setSelected(value ?? "")}>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Agregar rol" />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" disabled={!selected || pending} onClick={handleAssign}>
            Agregar
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
