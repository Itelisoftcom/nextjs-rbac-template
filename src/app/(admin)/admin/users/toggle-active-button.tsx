"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deactivateUserAction, restoreUserAction } from "./actions";

export function ToggleActiveButton({ userId, isDeleted }: { userId: string; isDeleted: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError(null);
    const result = isDeleted ? await restoreUserAction(userId) : await deactivateUserAction(userId);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button variant={isDeleted ? "outline" : "destructive"} size="sm">
            {isDeleted ? "Restaurar" : "Desactivar"}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isDeleted ? "¿Restaurar usuario?" : "¿Desactivar usuario?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {isDeleted
              ? "El usuario podrá volver a iniciar sesión."
              : "El usuario no podrá iniciar sesión hasta que lo restaures."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <Button disabled={isSubmitting} onClick={handleConfirm}>
            Confirmar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
