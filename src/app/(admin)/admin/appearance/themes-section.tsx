import { isNull } from "drizzle-orm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Can } from "@/components/can";
import { db } from "@/lib/db";
import { themes } from "@/lib/db/schema";
import type { SeedColors } from "@/lib/theme/derive-palette";
import { ThemeFormDialog } from "./theme-form-dialog";
import { DeleteThemeButton } from "./delete-theme-button";

function Swatches({ seed }: { seed: SeedColors }) {
  return (
    <div className="flex gap-1">
      {Object.values(seed).map((color, i) => (
        <span
          key={i}
          className="border-border h-5 w-5 rounded-full border"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export async function ThemesSection({ userId }: { userId: string }) {
  const themesList = await db.select().from(themes).where(isNull(themes.deletedAt)).orderBy(themes.createdAt);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Temas personalizados</h2>
        <Can userId={userId} permission="themes:create">
          <ThemeFormDialog />
        </Can>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Claro</TableHead>
            <TableHead>Oscuro</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {themesList.map((theme) => (
            <TableRow key={theme.id}>
              <TableCell>{theme.name}</TableCell>
              <TableCell>
                <Swatches seed={theme.lightSeed as SeedColors} />
              </TableCell>
              <TableCell>
                <Swatches seed={theme.darkSeed as SeedColors} />
              </TableCell>
              <TableCell className="flex justify-end gap-2">
                <Can userId={userId} permission="themes:update">
                  <ThemeFormDialog
                    theme={{
                      id: theme.id,
                      name: theme.name,
                      lightSeed: theme.lightSeed as SeedColors,
                      darkSeed: theme.darkSeed as SeedColors,
                    }}
                  />
                </Can>
                <Can userId={userId} permission="themes:delete">
                  <DeleteThemeButton themeId={theme.id} />
                </Can>
              </TableCell>
            </TableRow>
          ))}
          {themesList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-center">
                Todavía no hay temas personalizados.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
