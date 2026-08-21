import {
  pgTable,
  text,
  boolean,
  timestamp,
  serial,
  jsonb,
  uniqueIndex,
  real,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  // Requerido por el modelo "user" de Better Auth. Los usuarios los crea el
  // panel admin o el seed, nunca un registro público, así que nacen verificados.
  emailVerified: boolean("email_verified").notNull().default(true),
  image: text("image"),
  // Fase 4: fuerza el cambio de contraseña en el primer login del super
  // admin sembrado. Campo custom de Better Auth (user.additionalFields).
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  // Fase 6: modo claro/oscuro/sistema (siempre aplica) y, opcionalmente, un
  // tema personalizado (paleta) publicado por un admin. Si el tema elegido
  // se borra, cae a null (paleta default) — cascada intencional, no hay
  // pérdida de datos ni estado roto.
  colorMode: text("color_mode", { enum: ["light", "dark", "system"] }).notNull().default("system"),
  themeId: text("theme_id").references((): AnyPgColumn => themes.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  emailActiveIdx: uniqueIndex("idx_users_email_active")
    .on(table.email)
    .where(sql`${table.deletedAt} IS NULL`),
}));

export const themes = pgTable("themes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  // Colores base (hex) elegidos por el admin, por modo — se guardan para
  // poder re-editarlos; el resto de la paleta (18 variables) se deriva una
  // sola vez al guardar (ver derive-palette.ts) y también se guarda acá.
  lightSeed: jsonb("light_seed").notNull(),
  lightPalette: jsonb("light_palette").notNull(),
  darkSeed: jsonb("dark_seed").notNull(),
  darkPalette: jsonb("dark_palette").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  slugActiveIdx: uniqueIndex("idx_themes_slug_active")
    .on(table.slug)
    .where(sql`${table.deletedAt} IS NULL`),
}));

// Fase 6: configuración global (singleton, id fijo "global" — ver
// app-settings.ts). appName y fontId aplican a todos, incluso visitantes
// sin sesión. defaultColorMode/defaultThemeId solo siembran la preferencia
// de un usuario nuevo al crearlo — no reescriben la de uno que ya eligió.
export const appSettings = pgTable("app_settings", {
  id: text("id").primaryKey(),
  appName: text("app_name").notNull().default("RBAC Admin"),
  defaultColorMode: text("default_color_mode", { enum: ["light", "dark", "system"] })
    .notNull()
    .default("system"),
  defaultThemeId: text("default_theme_id").references((): AnyPgColumn => themes.id, {
    onDelete: "set null",
  }),
  fontId: text("font_id").notNull().default("geist"),
  // rem — mismo valor que ya usaba globals.css como default (0.625rem).
  borderRadius: real("border_radius").notNull().default(0.625),
  // % del font-size base del navegador (100 = sin cambios). Tailwind v4 es
  // rem-first, así que escalar esto escala casi todo el panel de una.
  fontScale: real("font_scale").notNull().default(100),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// Tablas de Better Auth. El password vive en accounts.password (provider
// "credential"), no en users — así lo modela Better Auth internamente.
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  providerId: text("provider_id").notNull(),
  issuer: text("issuer").notNull(),
  accountId: text("account_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  issuerAccountIdx: uniqueIndex("idx_accounts_issuer_account").on(table.issuer, table.accountId),
}));

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  // Identificador estable para roles sembrados (ej. "super_admin", "administrador").
  // Null para roles creados desde el panel. Permite que el seed los reconozca
  // aunque el nombre visible haya sido editado.
  code: text("code"),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  nameActiveIdx: uniqueIndex("idx_roles_name_active")
    .on(table.name)
    .where(sql`${table.deletedAt} IS NULL`),
  codeActiveIdx: uniqueIndex("idx_roles_code_active")
    .on(table.code)
    .where(sql`${table.deletedAt} IS NULL`),
}));

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
