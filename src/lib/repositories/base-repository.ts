import { eq, isNull } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/audit/write-audit";

type SoftDeletableTable = PgTable & {
  id: AnyPgColumn;
  deletedAt: AnyPgColumn;
  updatedAt: AnyPgColumn;
};

/**
 * Drizzle no resuelve bien sus tipos de query builder contra una tabla
 * genérica (TTable extends PgTable): .from()/.update()/.insert() esperan el
 * tipo concreto de la tabla, no un parámetro genérico. Se castea a `any`
 * solo en estas llamadas puntuales; la firma pública de cada método sigue
 * tipada con TSelect/TInsert para quien use el repo.
 */
export abstract class BaseRepository<
  TTable extends SoftDeletableTable,
  TSelect extends Record<string, unknown> = TTable["$inferSelect"],
  TInsert extends Record<string, unknown> = TTable["$inferInsert"],
> {
  protected abstract table: TTable;
  protected abstract entityType: string;

  async findById(id: string): Promise<TSelect | null> {
    const [row] = await db
      .select()
      .from(this.table as PgTable)
      .where(eq(this.table.id, id))
      .limit(1);
    if (!row || (row as TSelect).deletedAt) return null;
    return row as TSelect;
  }

  async list(): Promise<TSelect[]> {
    const rows = await db
      .select()
      .from(this.table as PgTable)
      .where(isNull(this.table.deletedAt));
    return rows as TSelect[];
  }

  async create(values: TInsert): Promise<TSelect> {
    return db.transaction(async (tx) => {
      const [row] = await tx
        .insert(this.table as PgTable)
        .values(values as Record<string, unknown>)
        .returning();
      await writeAudit(tx, {
        action: "create",
        entityType: this.entityType,
        entityId: (row as TSelect).id as string,
        before: null,
        after: row as Record<string, unknown>,
      });
      return row as TSelect;
    });
  }

  async update(id: string, values: Partial<TInsert>): Promise<TSelect> {
    return db.transaction(async (tx) => {
      const [before] = await tx.select().from(this.table as PgTable).where(eq(this.table.id, id));
      if (!before) throw new Error(`${this.entityType} ${id} no encontrado`);

      const [after] = await tx
        .update(this.table as PgTable)
        .set({ ...values, updatedAt: new Date() } as Record<string, unknown>)
        .where(eq(this.table.id, id))
        .returning();

      await writeAudit(tx, {
        action: "update",
        entityType: this.entityType,
        entityId: id,
        before: before as Record<string, unknown>,
        after: after as Record<string, unknown>,
      });
      return after as TSelect;
    });
  }

  async softDelete(id: string): Promise<TSelect> {
    await this.assertNoActiveReferences(id);

    return db.transaction(async (tx) => {
      const [before] = await tx.select().from(this.table as PgTable).where(eq(this.table.id, id));
      if (!before) throw new Error(`${this.entityType} ${id} no encontrado`);

      const [after] = await tx
        .update(this.table as PgTable)
        .set({ deletedAt: new Date(), updatedAt: new Date() } as Record<string, unknown>)
        .where(eq(this.table.id, id))
        .returning();

      await writeAudit(tx, {
        action: "delete",
        entityType: this.entityType,
        entityId: id,
        before: before as Record<string, unknown>,
        after: after as Record<string, unknown>,
      });
      return after as TSelect;
    });
  }

  async restore(id: string): Promise<TSelect> {
    return db.transaction(async (tx) => {
      const [before] = await tx.select().from(this.table as PgTable).where(eq(this.table.id, id));
      if (!before) throw new Error(`${this.entityType} ${id} no encontrado`);

      const [after] = await tx
        .update(this.table as PgTable)
        .set({ deletedAt: null, updatedAt: new Date() } as Record<string, unknown>)
        .where(eq(this.table.id, id))
        .returning();

      await writeAudit(tx, {
        action: "restore",
        entityType: this.entityType,
        entityId: id,
        before: before as Record<string, unknown>,
        after: after as Record<string, unknown>,
      });
      return after as TSelect;
    });
  }

  /**
   * Los repos de módulos con relaciones dependientes deben sobrescribir esto
   * y lanzar un error legible si existen referencias activas. Por defecto no
   * bloquea nada.
   */
  protected async assertNoActiveReferences(_id: string): Promise<void> {}
}
