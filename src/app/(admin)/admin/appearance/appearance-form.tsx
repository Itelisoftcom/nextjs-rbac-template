"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BORDER_RADIUS_PRESETS, FONT_SCALE_PRESETS } from "@/lib/theme/appearance-presets";
import { updateAppearanceSettingsAction } from "./actions";

type ThemeOption = { id: string; name: string };
type FontOption = { id: string; label: string };

const COLOR_MODE_OPTIONS = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Según el sistema" },
] as const;

export function AppearanceForm({
  initialColorMode,
  initialThemeId,
  initialFontId,
  initialBorderRadius,
  initialFontScale,
  availableThemes,
  fontOptions,
}: {
  initialColorMode: "light" | "dark" | "system";
  initialThemeId: string | null;
  initialFontId: string;
  initialBorderRadius: number;
  initialFontScale: number;
  availableThemes: ThemeOption[];
  fontOptions: FontOption[];
}) {
  const [colorMode, setColorMode] = useState<"light" | "dark" | "system">(initialColorMode);
  const [themeId, setThemeId] = useState<string | null>(initialThemeId);
  const [fontId, setFontId] = useState(initialFontId);
  const [borderRadius, setBorderRadius] = useState(initialBorderRadius);
  const [fontScale, setFontScale] = useState(initialFontScale);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await updateAppearanceSettingsAction({
      fontId,
      borderRadius,
      fontScale,
      defaultColorMode: colorMode,
      defaultThemeId: themeId,
    });

    if (result.error) {
      setIsSubmitting(false);
      setError(result.error);
      return;
    }

    // Fuente/radio/tamaño se resuelven en el layout raíz — un
    // router.refresh() no lo vuelve a ejecutar con datos nuevos.
    window.location.reload();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="font-select">Fuente</Label>
        <Select value={fontId} onValueChange={(value) => value && setFontId(value)}>
          <SelectTrigger id="font-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fontOptions.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="border-radius">Redondeado de bordes</Label>
        <Select
          value={String(borderRadius)}
          onValueChange={(value) => value && setBorderRadius(Number(value))}
        >
          <SelectTrigger id="border-radius" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BORDER_RADIUS_PRESETS.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="font-scale">Tamaño de fuente</Label>
        <Select
          value={String(fontScale)}
          onValueChange={(value) => value && setFontScale(Number(value))}
        >
          <SelectTrigger id="font-scale" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SCALE_PRESETS.map((p) => (
              <SelectItem key={p.value} value={String(p.value)}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="default-color-mode">Modo de color por defecto (usuarios nuevos)</Label>
        <Select value={colorMode} onValueChange={(value) => value && setColorMode(value as typeof colorMode)}>
          <SelectTrigger id="default-color-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOR_MODE_OPTIONS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="default-theme">Tema por defecto (usuarios nuevos)</Label>
        <Select
          value={themeId ?? "default"}
          onValueChange={(value) => setThemeId(value === "default" ? null : value)}
        >
          <SelectTrigger id="default-theme" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            {availableThemes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
