import { ProfileMenu } from "./profile-menu";
import { ThemeMenu } from "./theme-menu";

type AvailableTheme = { id: string; name: string };

/**
 * Siempre vive en la columna de main content (no en el sidebar). Agregar un
 * ícono nuevo (ej. notificaciones) es sumar un componente más acá adentro.
 */
export function Header({
  userName,
  userEmail,
  colorMode,
  themeId,
  availableThemes,
}: {
  userName: string;
  userEmail: string;
  colorMode: "light" | "dark" | "system";
  themeId: string | null;
  availableThemes: AvailableTheme[];
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-end gap-1 border-b px-4">
      <ThemeMenu currentColorMode={colorMode} currentThemeId={themeId} availableThemes={availableThemes} />
      <ProfileMenu name={userName} email={userEmail} />
    </header>
  );
}
