"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { derivePalette, paletteToCssVars, type SeedColors } from "@/lib/theme/derive-palette";

export function ThemePreview({ seed, mode }: { seed: SeedColors; mode: "light" | "dark" }) {
  const style = useMemo(() => {
    try {
      return paletteToCssVars(derivePalette(seed, mode));
    } catch {
      return null;
    }
  }, [seed, mode]);

  if (!style) {
    return <p className="text-destructive text-xs">Elegí colores válidos para ver el preview.</p>;
  }

  return (
    <div
      style={style as React.CSSProperties}
      className="bg-background text-foreground rounded-xl border p-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">
            Así se van a ver los textos secundarios y las tarjetas con este tema.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button>Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Destructivo</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Badge</Badge>
            <Badge variant="secondary">Secundario</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
