import { auditLog } from "@/lib/db/schema";
import { getRequestContext } from "@/lib/auth/request-context";
import type { db as dbClient } from "@/lib/db";

type Tx = Parameters<Parameters<(typeof dbClient)["transaction"]>[0]>[0];

type AuditAction = "create" | "update" | "delete" | "restore";

type WriteAuditParams = {
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
};

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
): Record<string, { before: unknown; after: unknown }> {
  const b = before ?? {};
  const a = after ?? {};

  const diff: Record<string, { before: unknown; after: unknown }> = {};
  const keys = new Set([...Object.keys(b), ...Object.keys(a)]);
  for (const key of keys) {
    if (!valuesEqual(b[key], a[key])) {
      diff[key] = { before: b[key] ?? null, after: a[key] ?? null };
    }
  }
  return diff;
}

export async function writeAudit(tx: Tx, params: WriteAuditParams): Promise<void> {
  const { userId, ip, userAgent } = getRequestContext();

  await tx.insert(auditLog).values({
    actorId: userId,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    diff: diffFields(params.before, params.after),
    ip,
    userAgent,
  });
}
