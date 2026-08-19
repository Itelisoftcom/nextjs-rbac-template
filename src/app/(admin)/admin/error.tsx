"use client";

export default function AdminError() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-xl font-semibold">No tienes permiso para ver esto</h1>
      <p className="text-muted-foreground text-sm">
        Si crees que deberías tener acceso, pídele a un administrador que revise tus roles.
      </p>
    </div>
  );
}
