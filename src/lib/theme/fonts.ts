import { Geist, Inter, Roboto, Poppins, Lora } from "next/font/google";

/**
 * Lista curada, cargada en build time (self-hosted, sin layout shift). El
 * navegador solo descarga el @font-face que realmente se usa — declarar
 * las 5 acá no cuesta nada si solo una está aplicada vía --font-sans.
 */
const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const roboto = Roboto({ variable: "--font-roboto", subsets: ["latin"], weight: ["400", "500", "700"] });
const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const lora = Lora({ variable: "--font-lora", subsets: ["latin"] });

export const FONT_OPTIONS = [
  { id: "geist", label: "Geist", cssVariable: "--font-geist", loader: geist },
  { id: "inter", label: "Inter", cssVariable: "--font-inter", loader: inter },
  { id: "roboto", label: "Roboto", cssVariable: "--font-roboto", loader: roboto },
  { id: "poppins", label: "Poppins", cssVariable: "--font-poppins", loader: poppins },
  { id: "lora", label: "Lora", cssVariable: "--font-lora", loader: lora },
] as const;

export type FontId = (typeof FONT_OPTIONS)[number]["id"];

export const DEFAULT_FONT_ID: FontId = "geist";

export function isFontId(value: string): value is FontId {
  return FONT_OPTIONS.some((f) => f.id === value);
}

/** Clases de next/font a aplicar en <html> para que las 5 estén disponibles. */
export function fontVariableClassNames(): string {
  return FONT_OPTIONS.map((f) => f.loader.variable).join(" ");
}

/** var(--font-xxx) de la fuente activa, para setear --font-sans. */
export function resolveFontCssVariable(fontId: string | null | undefined): string {
  const match = FONT_OPTIONS.find((f) => f.id === fontId) ?? FONT_OPTIONS.find((f) => f.id === DEFAULT_FONT_ID)!;
  return `var(${match.cssVariable})`;
}
