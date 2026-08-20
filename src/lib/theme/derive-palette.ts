import { converter, formatCss } from "culori";

/**
 * Corre tanto en servidor (al guardar un tema) como en cliente (preview en
 * vivo del editor) — misma función, mismo resultado, cero deriva entre lo
 * que el admin ve y lo que se guarda.
 */

const toOklch = converter("oklch");

export type SeedColors = {
  primary: string;
  background: string;
  accent: string;
  destructive: string;
};

export type ComputedPalette = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
};

const FIXED = {
  light: {
    mutedForeground: oklch(0.556, 0, 0),
    border: oklch(0.922, 0, 0),
    input: oklch(0.922, 0, 0),
    ring: oklch(0.708, 0, 0),
  },
  dark: {
    mutedForeground: oklch(0.708, 0, 0),
    border: oklch(1, 0, 0, 0.1),
    input: oklch(1, 0, 0, 0.15),
    ring: oklch(0.556, 0, 0),
  },
} as const;

function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function oklch(l: number, c: number, h: number, alpha = 1): string {
  return formatCss({ mode: "oklch", l: round(l), c: round(c), h: round(h), alpha });
}

function lightnessOf(hex: string): number {
  const parsed = toOklch(hex);
  if (!parsed) throw new Error(`Color inválido: "${hex}"`);
  return parsed.l;
}

function normalize(hex: string): string {
  const parsed = toOklch(hex);
  if (!parsed) throw new Error(`Color inválido: "${hex}"`);
  return oklch(parsed.l, parsed.c, parsed.h ?? 0);
}

/** Negro casi puro sobre fondos claros, blanco casi puro sobre fondos oscuros. */
function contrastForeground(hex: string): string {
  return lightnessOf(hex) > 0.55 ? oklch(0.145, 0, 0) : oklch(0.985, 0, 0);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function derivePalette(seed: SeedColors, mode: "light" | "dark"): ComputedPalette {
  const fixed = FIXED[mode];

  const background = normalize(seed.background);
  const foreground = contrastForeground(seed.background);
  const bgL = lightnessOf(seed.background);
  const secondary = oklch(clamp01(bgL + (mode === "light" ? -0.03 : 0.124)), 0, 0);

  const primary = normalize(seed.primary);
  const primaryForeground = contrastForeground(seed.primary);
  const accent = normalize(seed.accent);
  const accentForeground = contrastForeground(seed.accent);
  const destructive = normalize(seed.destructive);

  return {
    background,
    foreground,
    card: background,
    cardForeground: foreground,
    popover: background,
    popoverForeground: foreground,
    primary,
    primaryForeground,
    secondary,
    secondaryForeground: foreground,
    muted: secondary,
    mutedForeground: fixed.mutedForeground,
    accent,
    accentForeground,
    destructive,
    border: fixed.border,
    input: fixed.input,
    ring: fixed.ring,
    sidebar: background,
    sidebarForeground: foreground,
    sidebarPrimary: primary,
    sidebarPrimaryForeground: primaryForeground,
    sidebarAccent: accent,
    sidebarAccentForeground: accentForeground,
    sidebarBorder: fixed.border,
    sidebarRing: fixed.ring,
  };
}

const CSS_VAR_NAMES: Record<keyof ComputedPalette, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  primary: "--primary",
  primaryForeground: "--primary-foreground",
  secondary: "--secondary",
  secondaryForeground: "--secondary-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  destructive: "--destructive",
  border: "--border",
  input: "--input",
  ring: "--ring",
  sidebar: "--sidebar",
  sidebarForeground: "--sidebar-foreground",
  sidebarPrimary: "--sidebar-primary",
  sidebarPrimaryForeground: "--sidebar-primary-foreground",
  sidebarAccent: "--sidebar-accent",
  sidebarAccentForeground: "--sidebar-accent-foreground",
  sidebarBorder: "--sidebar-border",
  sidebarRing: "--sidebar-ring",
};

/** Para el <style> inyectado en el layout y para el wrapper de preview inline. */
export function paletteToCssVars(palette: ComputedPalette): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of Object.keys(palette) as (keyof ComputedPalette)[]) {
    vars[CSS_VAR_NAMES[key]] = palette[key];
  }
  return vars;
}

export function paletteToCssDeclarations(palette: ComputedPalette): string {
  return Object.entries(paletteToCssVars(palette))
    .map(([name, value]) => `${name}: ${value};`)
    .join(" ");
}
