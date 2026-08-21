/**
 * Presets discretos (no un slider libre) para que un valor extremo nunca
 * rompa el layout sin que lo hayamos podido revisar nosotros antes.
 */
export const BORDER_RADIUS_PRESETS = [
  { value: 0, label: "Ninguno" },
  { value: 0.3, label: "Pequeño" },
  { value: 0.625, label: "Mediano" },
  { value: 1, label: "Grande" },
  { value: 1.5, label: "Extra grande" },
] as const;

export const FONT_SCALE_PRESETS = [
  { value: 87.5, label: "Pequeño" },
  { value: 100, label: "Normal" },
  { value: 112.5, label: "Grande" },
  { value: 125, label: "Extra grande" },
] as const;

export const DEFAULT_BORDER_RADIUS = 0.625;
export const DEFAULT_FONT_SCALE = 100;
