# PLAN.md — Sistema RBAC (Next.js + SQLite + Railway)

> Este documento es el plan de construcción. Las reglas fijas que deben respetarse
> en todo el proyecto (y en cada módulo nuevo) están en `CLAUDE.md`, en la raíz.
> Léelo primero — este plan asume que ya lo tienes cargado.

## 0. Resumen del proyecto

Panel administrativo con sistema RBAC (roles y permisos) completo:

- Backend + frontend en **Next.js (App Router)**, un solo proceso.
- Base de datos **PostgreSQL** (Drizzle ORM), elegido sobre SQLite específicamente para poder escalar horizontalmente: varias instancias de la app comparten la misma base de datos sin contención de escritura de un único archivo.
- **Auditoría automática** de cambios (quién hizo qué, cuándo).
- **Soft delete** en todas las entidades borrables.
- **Panel super admin**: gestión de usuarios, roles, permisos y visor de audit log.
- **Temas** (claro/oscuro + posibilidad de temas adicionales), persistidos por usuario.
- Despliegue en **Railway** usando el addon administrado de Postgres, con **PgBouncer** habilitado para pooling de conexiones (imprescindible en cuanto haya más de una instancia de la app corriendo).
- No es multi-tenant. Una sola organización.

El objetivo de este plan es que cada fase termine en un estado funcional y
verificable, no en código a medias. No avances a la fase N+1 sin cumplir los
criterios de aceptación de la fase N.

---

## Fase 0 — Setup del repositorio

- Inicializar Next.js (TypeScript, App Router, Tailwind).
- Instalar: `drizzle-orm`, `drizzle-kit`, `pg` (driver de Postgres), `better-auth`,
  `zod`, shadcn/ui (`init` con el theme base).
- Configurar `tsconfig.json` con paths (`@/*`).
- Estructura de carpetas inicial:

```
src/
  app/
    (auth)/            # login, forgot-password
    (admin)/            # panel super admin, protegido
    api/auth/[...all]/  # handler de better-auth
  lib/
    db/
      schema.ts
      index.ts          # cliente drizzle
      seed.ts
    auth/
      request-context.ts
      require-permission.ts
      permissions-catalog.ts
    repositories/
      base-repository.ts
    audit/
      write-audit.ts
  components/
    ui/                 # shadcn
  modules/               # cada módulo de negocio vive aquí (ver Fase 7)
```

- `.env.example` con `DATABASE_URL` (connection string pooled de Postgres),
  `DATABASE_URL_UNPOOLED` (conexión directa, para migraciones), `BETTER_AUTH_SECRET`,
  `BETTER_AUTH_URL`.
- **Criterio de aceptación**: `npm run dev` levanta una página en blanco sin errores.

---

## Fase 1 — Esquema de base de datos

Definir en `src/lib/db/schema.ts` con Drizzle. Punto de partida (ajustar tipos
según lo que Better Auth requiera para sus propias tablas de sesión):

```ts
import { pgTable, text, boolean, timestamp, serial, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // uuid generado en la app con crypto.randomUUID()
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
  key: text("key").notNull().unique(), // ej: "facturas:update:any"
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

// Overrides puntuales por usuario (opcional, usar con moderación)
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
  diff: jsonb("diff"), // solo los campos que cambiaron, no el registro completo
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

- Cliente de conexión en `src/lib/db/index.ts` usando un `pg.Pool` (nunca una
  conexión nueva por request), con un tamaño de pool moderado (ej. `max: 10`
  por instancia). Con varias instancias de la app corriendo, el total de
  conexiones reales al Postgres es `instancias × pool_size` — justo lo que
  PgBouncer absorbe en la Fase 9.
- Generar migración con `drizzle-kit generate` (dialect `postgresql`) y
  aplicarla usando la connection string **unpooled** (las migraciones no
  deben pasar por el pooler de transacciones).
- **Criterio de aceptación**: `drizzle-kit studio` muestra todas las tablas;
  en `psql`, `\d+ users` muestra el índice único parcial sobre `email` con
  la condición `WHERE deleted_at IS NULL`.

---

## Fase 2 — Infraestructura core (antes de cualquier módulo de negocio)

Esta fase es la más importante del proyecto. Todo lo que se construya después
depende de que esto quede bien.

1. **`request-context.ts`**: `AsyncLocalStorage` con `{ userId, ip, userAgent }`,
   poblado en un wrapper que se llama justo después de validar la sesión.
2. **`write-audit.ts`**: función que recibe `{ action, entityType, entityId, before, after }`,
   calcula el diff (solo campos que cambiaron) y escribe en `audit_log` dentro
   de la misma transacción que el cambio.
3. **`base-repository.ts`**: clase abstracta con `create`, `update`, `softDelete`,
   `restore`, `list` (filtra `deletedAt IS NULL` por defecto), `findById`.
   Cada método pasa por `write-audit.ts` automáticamente.
4. **`permissions-catalog.ts`**: registro en código de todos los permisos
   disponibles (no se escriben permisos directo en la BD a mano). Cada módulo
   exporta su fragmento del catálogo; un script (`seed.ts`) sincroniza esto
   contra la tabla `permissions` en cada deploy.
5. **`require-permission.ts`**: función `requirePermission(key: string)` que
   lee la sesión, resuelve permisos (rol + overrides), y lanza si no cumple.
   Debe soportar comodines (`facturas:*`) y scope `own`/`any`.

- **Criterio de aceptación**: un test de integración que cree un usuario con
  un rol de prueba, llame a `requirePermission`, y verifique que:
  - Falla sin el permiso.
  - Pasa con el permiso exacto y con un comodín que lo cubra.
  - Un `create()` en cualquier repo de prueba genera una fila en `audit_log`
    con el `actorId` correcto tomado del contexto (no pasado a mano).

---

## Fase 3 — Autenticación (Better Auth)

- Configurar Better Auth con el adapter de Drizzle/SQLite.
- Habilitar el plugin de administración (para poder crear/banear usuarios
  desde el panel más adelante).
- Página de login. Sin registro público — los usuarios se crean solo desde
  el panel admin o el seed inicial.
- Middleware (`middleware.ts`) que **solo** redirige si no hay sesión; la
  verificación real de permisos vive en la capa de datos (Fase 2), nunca en
  el middleware.
- **Criterio de aceptación**: login funcional, cookie de sesión persistida,
  logout funcional, ruta protegida redirige a `/login` sin sesión.

---

## Fase 4 — Bootstrap de RBAC

- `seed.ts` idempotente que:
  - Sincroniza `permissions` desde `permissions-catalog.ts`.
  - Crea los roles de sistema: `super_admin` (con `*:*`) y opcionalmente
    `admin`, `viewer` como ejemplo.
  - Crea el primer usuario super admin desde variables de entorno
    (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`), forzando cambio de
    contraseña en el primer login.
- Guarda de integridad: impedir que se elimine o desasigne el último usuario
  con rol `super_admin` activo.
- **Criterio de aceptación**: `npm run db:seed` en una BD vacía deja un
  usuario con el que se puede iniciar sesión y ver el panel admin.

---

## Fase 5 — Panel super admin

Rutas bajo `src/app/(admin)/`, cada una protegida con su permiso correspondiente:

- `/admin/users` — listar (con soft-deleted ocultos por defecto, filtro para
  mostrarlos), crear, editar, desactivar (soft delete), restaurar, asignar roles.
- `/admin/roles` — CRUD de roles, asignación de permisos por rol (checklist
  agrupado por módulo/recurso), roles de sistema no editables/borrables.
- `/admin/audit-log` — tabla filtrable por actor, entidad, rango de fechas,
  con el diff renderizado de forma legible (antes → después).
- `/admin/settings` — tema global por defecto, datos generales.

- **Criterio de aceptación**: un usuario sin permisos de admin no puede ver
  ni acceder por URL directa a ninguna de estas rutas (probar manualmente
  quitando el permiso).

---

## Fase 6 — Temas

- `next-themes` para claro/oscuro con el script bloqueante (evita FOUC).
- Paletas adicionales vía `data-theme` en `<html>` + variables CSS en
  `globals.css` (no hardcodear colores en componentes).
- Preferencia guardada en `users.theme`; fallback a preferencia del sistema
  operativo si no hay usuario logueado.
- **Criterio de aceptación**: cambiar de tema persiste tras recargar y tras
  cerrar sesión y volver a entrar con el mismo usuario.

---

## Fase 7 — Módulo de ejemplo (plantilla real)

Construir un módulo de negocio simple pero completo (ej. "Proyectos" o
cualquier entidad de ejemplo) que sirva como referencia viva de todo el
patrón: repo que extiende `BaseRepository`, permisos declarados en su propio
fragmento del catálogo, páginas de listado/detalle respetando permisos en
servidor y en UI (`<Can>`), soft delete funcionando end-to-end.

- **Criterio de aceptación**: se puede copiar la carpeta de este módulo,
  renombrar, y tener un CRUD nuevo funcionando en minutos.

---

## Fase 8 — Generador de módulos

- Script (`plop` o similar) `npm run new:module <nombre>` que scaffoldea a
  partir del módulo de ejemplo de la Fase 7: repo, fragmento de permisos,
  páginas, y registro en la navegación del panel.
- **Criterio de aceptación**: generar un módulo nuevo y tenerlo visible en el
  panel (aunque vacío de lógica de negocio) sin tocar código a mano fuera de
  lo generado.

---

## Fase 9 — Despliegue en Railway

- `Dockerfile` multi-stage con `output: "standalone"` en `next.config.js`.
- Provisionar el addon de **Postgres** de Railway (ya no se necesita un
  Volume para la base de datos; el addon gestiona su propio almacenamiento).
- Habilitar **PgBouncer** desde Database → Config → Connection Pooling, modo
  `transaction` (cubre la gran mayoría de queries de la app; solo pasar a
  `session` si algo depende de estado de sesión de Postgres). Railway expone
  entonces una `DATABASE_URL` pooled y una `DATABASE_URL_UNPOOLED` directa.
  La app en runtime usa la pooled; migraciones y seed usan la unpooled.
- Variables de entorno en Railway: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`,
  secretos de auth, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (solo para el
  primer deploy, luego se pueden borrar).
- Endpoint `/api/health` que además haga un `SELECT 1` contra la BD, no solo
  responda 200 — así el healthcheck de Railway detecta un pool agotado.
- Ejecutar migraciones + seed como paso de release (antes de que el tráfico
  llegue a la nueva versión), nunca a mano en producción.
- Con la base de datos ya compartida, escalar horizontalmente es subir el
  número de réplicas del servicio en Railway — no debería requerir cambios
  de código si se respetó la Regla 8 de `CLAUDE.md` (nada de estado en
  memoria de un solo proceso).
- **Criterio de aceptación**: deploy limpio en Railway con al menos 2
  réplicas corriendo a la vez; crear un registro atendido por una réplica y
  confirmar que aparece sin importar qué réplica atienda la siguiente
  request.

---

## Fase 10 — Backups y cierre

- Backups: los backups automáticos de Postgres en Railway son parte del
  plan Pro. Si no se está en ese plan, desplegar la plantilla comunitaria
  "Postgres Daily Backups" (dump diario a S3/R2) o un cron propio con
  `pg_dump` comprimido. Probar la restauración al menos una vez — un backup
  no probado no cuenta como backup.
- Si el plan lo permite, evaluar habilitar **PITR** (point-in-time recovery)
  de Railway para poder restaurar a un instante puntual, no solo al último
  snapshot.
- Job mensual que archive filas viejas de `audit_log` fuera de la BD activa.
- Rate limiting de login: **no en memoria** — con varias instancias cada una
  vería solo una fracción de los intentos y el límite dejaría de cumplirse.
  Usar una tabla en Postgres con el conteo por IP/usuario y ventana de
  tiempo (alcanza para este volumen; no hace falta Redis solo por esto).
- Revisión final de que ningún módulo hace `DELETE` físico ni SQL crudo para
  listados (grep de `DELETE FROM` y de queries fuera de los repositorios).

---

## Notas para quien ejecute este plan

- No se necesita preguntar en cada fase si se puede continuar: cada fase
  tiene un criterio de aceptación explícito. Si se cumple, se avanza.
- Si algo de este plan entra en conflicto con una regla de `CLAUDE.md`,
  `CLAUDE.md` gana.
- Cualquier decisión de diseño no cubierta aquí (naming, estructura de un
  componente puntual) se resuelve con el criterio ya establecido en el
  módulo de ejemplo de la Fase 7, para mantener consistencia.
