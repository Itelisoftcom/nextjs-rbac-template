import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, users } from "@/lib/db/schema";

export type AuditLogFilters = {
  actorId?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
};

export async function listAuditLog(filters: AuditLogFilters = {}, limit = 100) {
  const conditions: SQL[] = [];
  if (filters.actorId) conditions.push(eq(auditLog.actorId, filters.actorId));
  if (filters.entityType) conditions.push(eq(auditLog.entityType, filters.entityType));
  if (filters.from) conditions.push(gte(auditLog.createdAt, filters.from));
  if (filters.to) conditions.push(lte(auditLog.createdAt, filters.to));

  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      diff: auditLog.diff,
      ip: auditLog.ip,
      userAgent: auditLog.userAgent,
      createdAt: auditLog.createdAt,
      actorId: auditLog.actorId,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLog)
    .leftJoin(users, eq(users.id, auditLog.actorId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
