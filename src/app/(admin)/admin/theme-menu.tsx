"use client";

import { PaletteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { ThemeSwitcher } from "./theme-switcher";

type AvailableTheme = { id: string; name: string };

export function ThemeMenu({
  currentColorMode,
  currentThemeId,
  availableThemes,
}: {
  currentColorMode: "light" | "dark" | "system";
  currentThemeId: string | null;
  availableThemes: AvailableTheme[];
}) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Tema">
            <PaletteIcon />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-64">
        <PopoverHeader>
          <PopoverTitle>Tema</PopoverTitle>
        </PopoverHeader>
        <ThemeSwitcher
          currentColorMode={currentColorMode}
          currentThemeId={currentThemeId}
          availableThemes={availableThemes}
        />
      </PopoverContent>
    </Popover>
  );
}
