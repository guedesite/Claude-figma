import type { FigmaColor } from "../api/types.js";

/**
 * Convert Figma RGBA color (0-1 range) to CSS color string.
 * Returns hex (#RRGGBB) for fully opaque colors, rgba() otherwise.
 */
export function figmaColorToCss(color: FigmaColor, paintOpacity?: number): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  const a = (color.a ?? 1) * (paintOpacity ?? 1);

  if (a >= 0.999) {
    const hex = (v: number) => v.toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(g)}${hex(b)}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${parseFloat(a.toFixed(2))})`;
}
