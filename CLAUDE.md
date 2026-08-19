# CLAUDE.md — Reglas del proyecto

Este archivo se carga automáticamente en cada sesión. Contiene las reglas que
**no cambian** entre módulos. El plan de construcción por fases está en
`PLAN.md`; este archivo es el estándar que ese plan (y todo módulo futuro)
debe cumplir.

## Stack

- Next.js (App Router), TypeScript estricto.
- Drizzle ORM + PostgreSQL (driver `pg`). Postgres es la única base de datos.
- Pooling de conexiones vía PgBouncer (addon de Railway): la app usa la
  connection string **pooled** (`DATABASE_URL`) en runtime; las migraciones
  y el seed usan la **unpooled** (`DATABASE_URL_UNPOOLED`).
- Better Auth para sesiones y administración de usuarios.
- shadcn/ui + Tailwind. Colores siempre vía variables CSS, nunca hardcodeados
  en un componente.
- Despliegue: Railway, addon administrado de Postgres. La app puede correr
  en más de una instancia a la vez (ver Regla 8).

## Regla 1 — Todo acceso a datos pasa por `BaseRepository`

Ningún módulo escribe `INSERT`/`UPDATE`/`DELETE` directo contra Drizzle fuera
de un repositorio que extienda `src/lib/repositories/base-repository.ts`.
Esto es lo que garantiza que auditoría y soft delete se apliquen siempre,
sin que haya que acordarse de hacerlo módulo por módulo.

Si una consulta es demasiado compleja para el repo base (joins, agregaciones),
se agrega como método específico en el repo del módulo — pero sigue viviendo
en el repositorio, nunca en la página o en un server action directamente.

## Regla 2 — Autorización en la capa de datos, no en el middleware

`proxy.ts` (Next.js 16 renombró la convención `middleware.ts` a `proxy.ts`;
el archivo cumple el mismo rol de siempre) solo redirige si no hay sesión
activa. La verificación real de permisos ocurre en cada server action / route
handler, llamando a:

```ts
const user = await requirePermission("recurso:accion:scope")
```

antes de tocar la base de datos. La UI puede además ocultar elementos con
`<Can permission="...">`, pero eso es cosmético — nunca sustituye la
verificación en servidor.

## Regla 3 — Los permisos se declaran en código

Cada módulo exporta su fragmento de permisos en
`src/lib/auth/permissions-catalog.ts` (o en un archivo propio que ese catálogo
importe). La tabla `permissions` en la BD es un espejo sincronizado por
`seed.ts`, nunca la fuente de verdad. Formato de las keys:

```
<recurso>:<accion>:<scope?>
```

Ejemplos: `facturas:read`, `facturas:update:own`, `facturas:update:any`,
`facturas:*` (todo sobre facturas), `*:*` (reservado para `super_admin`).

Si un módulo nuevo necesita un permiso que no existe, se agrega aquí — no se
inserta a mano en la BD.

## Regla 4 — "Borrar" siempre es soft delete

- `DELETE FROM` está prohibido en código de aplicación. Solo se permite en
  scripts de migración explícitos y documentados.
- Toda tabla con una columna `UNIQUE` (ej. `email`) debe tener el índice
  único como **parcial**, filtrando `WHERE deleted_at IS NULL` — si no, un
  registro borrado bloquea la reutilización de ese valor.
- Antes de soft-deletear una entidad, el repo verifica si tiene referencias
  activas dependientes. Por defecto se bloquea el borrado si existen
  (lanzar error legible). Si un módulo necesita cascada real, la declara
  explícitamente (`cascadeSoftDelete: [...]`) — nunca implícita.
- Toda lectura de listado filtra `deleted_at IS NULL` por defecto. No se
  escribe SQL crudo para listar; se usa `repo.list()`.

## Regla 5 — La auditoría es automática, no manual

`BaseRepository` llama a `write-audit.ts` en cada `create`/`update`/
`softDelete`/`restore`, dentro de la misma transacción que el cambio. Un
desarrollador (o el agente) que agregue un módulo nuevo **no necesita escribir
código de auditoría** — lo hereda. Si un módulo hace un cambio de estado que
no pasa por el repo base (poco común, pero puede pasar con lógica compleja),
debe llamar a `write-audit.ts` explícitamente con el mismo formato.

El actor de cada entrada de auditoría se toma del contexto de request
(`AsyncLocalStorage`, ver `request-context.ts`) — nunca se pasa `userId` como
parámetro de función para este fin, porque eso es lo que hace que se olvide.

## Regla 6 — Invalidación de permisos

Los permisos no se cachean en el JWT de la sesión de forma indefinida. Si un
usuario cambia de rol o se le revoca un permiso, debe perder ese acceso en su
siguiente request (no al expirar el token). Cualquier cache de permisos en
memoria debe invalidarse al modificar `user_roles`, `role_permissions` o
`user_permissions`.

## Regla 7 — Roles de sistema

Los roles con `is_system = true` (mínimo `super_admin`) no se pueden editar
ni borrar desde el panel. Debe existir siempre al menos un usuario activo con
rol `super_admin`; toda operación que dejaría el sistema sin ninguno debe
rechazarse con un error claro.

## Regla 8 — Estado compartido, no en memoria

Con Postgres la app puede correr en varias instancias a la vez. Ningún
módulo asume que el proceso es único: nada de rate limiting, contadores o
cachés en un `Map` o variable de módulo que solo viva en la memoria de una
instancia — otra réplica no la vería. Ese estado va en la base de datos
(una tabla simple alcanza para rate limiting) o, si el proyecto llega a
justificarlo por otro motivo, en un store compartido como Redis. No se
agrega Redis solo para esto sin evaluar antes si una tabla en Postgres basta.

## Estructura de un módulo nuevo

```
src/modules/<nombre>/
  repository.ts     # extiende BaseRepository
  permissions.ts     # fragmento exportado al catálogo global
  actions.ts         # server actions, cada una empieza con requirePermission
  page.tsx / *.tsx    # UI, usa <Can> para mostrar/ocultar
```

Al crear un módulo nuevo (a mano o vía `npm run new:module`), verificar:

- [ ] El repo extiende `BaseRepository`.
- [ ] Los permisos están en `permissions.ts` del módulo, no hardcodeados.
- [ ] Cada server action llama a `requirePermission` como primera línea.
- [ ] Si la entidad tiene columnas únicas, tienen índice parcial.
- [ ] El módulo aparece en la navegación del panel solo si el usuario tiene
      al menos un permiso de lectura sobre él.

## Lo que NO hacer

- No agregar Redis, colas, ni otros servicios "por si acaso" — el proyecto
  sigue siendo intencionalmente compacto. Postgres ya cubre persistencia y,
  vía PgBouncer, la conexión desde múltiples instancias.
- No implementar multi-tenancy ni `organization_id` — este proyecto no lo es.
- No guardar snapshots completos en `audit_log` en cada update — solo el
  diff de campos que cambiaron (ver `write-audit.ts`).
- No crear usuarios desde un formulario público — la creación de usuarios es
  exclusiva del panel admin y del seed inicial.
