"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setMyThemePreferenceAction } from "./theme-preference-actions";

type AvailableTheme = { id: string; name: string };

const COLOR_MODES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Auto" },
] as const;

export function ThemeSwitcher({
  currentColorMode,
  currentThemeId,
  availableThemes,
}: {
  currentColorMode: "light" | "dark" | "system";
  currentThemeId: string | null;
  availableThemes: AvailableTheme[];
}) {
  const { setTheme } = useTheme();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  // Base UI's <Select.Value> solo muestra la etiqueta si el Root recibe un
  // mapa value -> label vía `items`; sin esto cae a mostrar el value crudo.
  const themeItems = useMemo(
    () => ({ default: "Default", ...Object.fromEntries(availableThemes.map((t) => [t.id, t.name])) }),
    [availableThemes],
  );

  async function handleColorModeChange(mode: "light" | "dark" | "system") {
    setTheme(mode);
    setPending(true);
    await setMyThemePreferenceAction({ colorMode: mode, themeId: currentThemeId });
    setPending(false);
    router.refresh();
  }

  async function handleThemeChange(themeId: string | null) {
    setPending(true);
    await setMyThemePreferenceAction({ colorMode: currentColorMode, themeId });
    // La paleta de un tema personalizado se inyecta como <style> en el
    // layout raíz durante SSR (para no tener flash de color sin JS) —
    // router.refresh() no vuelve a ejecutar ese layout con la sesión
    // actualizada, así que acá sí hace falta un reload real.
    window.location.reload();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {COLOR_MODES.map((mode) => (
          <Button
            key={mode.value}
            type="button"
            size="sm"
            variant={currentColorMode === mode.value ? "default" : "outline"}
            disabled={pending}
            onClick={() => handleColorModeChange(mode.value)}
          >
            {mode.label}
          </Button>
        ))}
      </div>
      {availableThemes.length > 0 ? (
        <Select
          items={themeItems}
          value={currentThemeId ?? "default"}
          onValueChange={(value) => handleThemeChange(value === "default" ? null : value)}
        >
          <SelectTrigger size="sm" className="w-full">
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
      ) : null}
    </div>
  );
}
