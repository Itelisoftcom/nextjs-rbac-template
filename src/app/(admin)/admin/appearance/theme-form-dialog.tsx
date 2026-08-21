"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { SeedColors } from "@/lib/theme/derive-palette";
import { ThemePreview } from "./theme-preview";
import { createThemeAction, updateThemeAction } from "./theme-actions";

const DEFAULT_LIGHT_SEED: SeedColors = {
  primary: "#171717",
  background: "#ffffff",
  accent: "#f5f5f5",
  destructive: "#dc2626",
};

const DEFAULT_DARK_SEED: SeedColors = {
  primary: "#ededed",
  background: "#171717",
  accent: "#262626",
  destructive: "#dc2626",
};

const FIELDS: { key: keyof SeedColors; label: string }[] = [
  { key: "primary", label: "Primario" },
  { key: "background", label: "Fondo" },
  { key: "accent", label: "Acento" },
  { key: "destructive", label: "Destructivo" },
];

function ColorFields({
  seed,
  onChange,
  idPrefix,
}: {
  seed: SeedColors;
  onChange: (next: SeedColors) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-${field.key}`}>{field.label}</Label>
          <div className="flex items-center gap-2">
            <input
              id={`${idPrefix}-${field.key}`}
              type="color"
              value={seed[field.key]}
              onChange={(e) => onChange({ ...seed, [field.key]: e.target.value })}
              className="h-8 w-10 cursor-pointer rounded border border-input bg-transparent"
            />
            <span className="text-muted-foreground font-mono text-xs">{seed[field.key]}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type ExistingTheme = {
  id: string;
  name: string;
  lightSeed: SeedColors;
  darkSeed: SeedColors;
};

export function ThemeFormDialog({ theme }: { theme?: ExistingTheme }) {
  const router = useRouter();
  const isEditing = Boolean(theme);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(theme?.name ?? "");
  const [lightSeed, setLightSeed] = useState<SeedColors>(theme?.lightSeed ?? DEFAULT_LIGHT_SEED);
  const [darkSeed, setDarkSeed] = useState<SeedColors>(theme?.darkSeed ?? DEFAULT_DARK_SEED);
  const [previewMode, setPreviewMode] = useState<"light" | "dark">("light");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = theme
      ? await updateThemeAction(theme.id, { name, lightSeed, darkSeed })
      : await createThemeAction({ name, lightSeed, darkSeed });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          isEditing ? (
            <Button variant="outline" size="sm">
              Editar
            </Button>
          ) : (
            <Button>Nuevo tema</Button>
          )
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar tema" : "Crear tema"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="theme-name">Nombre</Label>
            <Input id="theme-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Modo claro</p>
            <ColorFields seed={lightSeed} onChange={setLightSeed} idPrefix="light" />
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Modo oscuro</p>
            <ColorFields seed={darkSeed} onChange={setDarkSeed} idPrefix="dark" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Preview</p>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === "light" ? "default" : "outline"}
                  onClick={() => setPreviewMode("light")}
                >
                  Claro
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={previewMode === "dark" ? "default" : "outline"}
                  onClick={() => setPreviewMode("dark")}
                >
                  Oscuro
                </Button>
              </div>
            </div>
            <ThemePreview seed={previewMode === "light" ? lightSeed : darkSeed} mode={previewMode} />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : isEditing ? "Guardar" : "Crear tema"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
