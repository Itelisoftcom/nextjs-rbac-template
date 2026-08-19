import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import { requirePermission } from "@/lib/auth/require-permission";
import { listAuditLog } from "@/lib/audit/list-audit-log";
import { db } from "@/lib/db";
import { auditLog, users } from "@/lib/db/schema";

type DiffValue = Record<string, { before: unknown; after: unknown }> | null;

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ actorId?: string; entityType?: string; from?: string; to?: string }>;
}) {
  return requireAdminSession(async () => {
    await requirePermission("audit_log:read");

    const params = await searchParams;
    const filters = {
      actorId: params.actorId || undefined,
      entityType: params.entityType || undefined,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(`${params.to}T23:59:59`) : undefined,
    };

    const [entries, allUsers, entityTypeRows] = await Promise.all([
      listAuditLog(filters),
      db.select({ id: users.id, name: users.name }).from(users),
      db.selectDistinct({ entityType: auditLog.entityType }).from(auditLog).orderBy(auditLog.entityType),
    ]);

    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">Audit Log</h1>

        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="actorId">Actor</Label>
            <select
              id="actorId"
              name="actorId"
              defaultValue={filters.actorId ?? ""}
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
            >
              <option value="">Todos</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="entityType">Entidad</Label>
            <select
              id="entityType"
              name="entityType"
              defaultValue={filters.entityType ?? ""}
              className="border-input h-8 rounded-lg border bg-transparent px-2.5 text-sm"
            >
              <option value="">Todas</option>
              {entityTypeRows.map((row) => (
                <option key={row.entityType} value={row.entityType}>
                  {row.entityType}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from">Desde</Label>
            <Input id="from" name="from" type="date" defaultValue={params.from ?? ""} className="h-8" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to">Hasta</Label>
            <Input id="to" name="to" type="date" defaultValue={params.to ?? ""} className="h-8" />
          </div>
          <Button type="submit" size="sm">
            Filtrar
          </Button>
        </form>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Entidad</TableHead>
              <TableHead>Cambios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const diff = entry.diff as DiffValue;
              return (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {entry.createdAt.toLocaleString("es-MX")}
                  </TableCell>
                  <TableCell>{entry.actorName ?? "Sistema"}</TableCell>
                  <TableCell className="capitalize">{entry.action}</TableCell>
                  <TableCell>
                    {entry.entityType} <span className="text-muted-foreground text-xs">{entry.entityId}</span>
                  </TableCell>
                  <TableCell className="max-w-md text-xs">
                    {diff && Object.keys(diff).length > 0 ? (
                      <ul className="flex flex-col gap-0.5">
                        {Object.entries(diff).map(([field, change]) => (
                          <li key={field}>
                            <span className="font-medium">{field}</span>: {formatValue(change.before)} →{" "}
                            {formatValue(change.after)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
