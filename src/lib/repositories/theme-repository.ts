import { randomUUID } from "node:crypto";
import { themes } from "@/lib/db/schema";
import { BaseRepository } from "@/lib/repositories/base-repository";
import { derivePalette, type SeedColors } from "@/lib/theme/derive-palette";

const DIACRITICS_PATTERN = /[̀-ͯ]/g;

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(DIACRITICS_PATTERN, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || randomUUID().slice(0, 8)
  );
}

export class ThemeRepository extends BaseRepository<typeof themes> {
  protected table = themes;
  protected entityType = "theme";

  async createTheme(input: { name: string; lightSeed: SeedColors; darkSeed: SeedColors }) {
    const lightPalette = derivePalette(input.lightSeed, "light");
    const darkPalette = derivePalette(input.darkSeed, "dark");

    return this.create({
      id: randomUUID(),
      name: input.name,
      slug: slugify(input.name),
      lightSeed: input.lightSeed,
      lightPalette,
      darkSeed: input.darkSeed,
      darkPalette,
    } as (typeof themes)["$inferInsert"]);
  }

  async updateTheme(
    id: string,
    input: { name?: string; lightSeed?: SeedColors; darkSeed?: SeedColors },
  ) {
    const values: Partial<(typeof themes)["$inferInsert"]> = {};

    if (input.name !== undefined) {
      values.name = input.name;
      values.slug = slugify(input.name);
    }
    if (input.lightSeed) {
      values.lightSeed = input.lightSeed;
      values.lightPalette = derivePalette(input.lightSeed, "light");
    }
    if (input.darkSeed) {
      values.darkSeed = input.darkSeed;
      values.darkPalette = derivePalette(input.darkSeed, "dark");
    }

    return this.update(id, values);
  }

  /**
   * Borrar un tema no se bloquea por tener usuarios activos: users.theme_id
   * tiene onDelete "set null" — cascada intencional (cae a la paleta
   * default), no rompe estado ni pierde datos. Por eso no se sobreescribe
   * assertNoActiveReferences acá.
   */
}

export const themeRepository = new ThemeRepository();
