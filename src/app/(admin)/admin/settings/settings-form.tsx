"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAppNameAction } from "./actions";

export function SettingsForm({ initialAppName }: { initialAppName: string }) {
  const [appName, setAppName] = useState(initialAppName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await updateAppNameAction(appName);

    if (result.error) {
      setIsSubmitting(false);
      setError(result.error);
      return;
    }

    // El nombre se resuelve en el layout raíz (<title>) — un
    // router.refresh() no lo vuelve a ejecutar con datos nuevos.
    window.location.reload();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="app-name">Nombre de la aplicación</Label>
        <Input id="app-name" required value={appName} onChange={(e) => setAppName(e.target.value)} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="w-fit">
        {isSubmitting ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
