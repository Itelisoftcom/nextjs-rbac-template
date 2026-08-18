import { pgTable, text, boolean, timestamp, serial, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  passwordHash: text("password_hash"),
  isActive: boolean("is_active").notNull().default(true),
  theme: text("theme").default("system"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  emailActiveIdx: uniqueIndex("idx_users_email_active")
    .on(table.email)
    .where(sql`${table.deletedAt} IS NULL`),
}));

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  description: text("description"),
});

export const rolePermissions = pgTable("role_permissions", {
  roleId: text("role_id").notNull().references(() => roles.id),
  permissionId: text("permission_id").notNull().references(() => permissions.id),
});

export const userRoles = pgTable("user_roles", {
  userId: text("user_id").notNull().references(() => users.id),
  roleId: text("role_id").notNull().references(() => roles.id),
});

export const userPermissions = pgTable("user_permissions", {
  userId: text("user_id").notNull().references(() => users.id),
  permissionId: text("permission_id").notNull().references(() => permissions.id),
  effect: text("effect", { enum: ["grant", "deny"] }).notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorId: text("actor_id").references(() => users.id),
  action: text("action", { enum: ["create", "update", "delete", "restore"] }).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  diff: jsonb("diff"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
