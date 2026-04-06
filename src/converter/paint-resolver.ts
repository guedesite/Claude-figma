import type { FigmaPaint, FigmaColor } from "../api/types.js";
import { figmaColorToCss } from "../utils/color.js";

/**
 * Resolve Figma fills array to a CSS background value.
 * Multiple visible fills are layered using CSS multiple backgrounds.
 */
export function resolveBackground(fills: FigmaPaint[]): string | null {
  const visible = fills.filter((f) => f.visible !== false);
  if (visible.length === 0) return null;

  // Process fills in reverse order (Figma: last = top, CSS: first = top)
  const backgrounds = visible
    .reverse()
    .map((fill) => {
      switch (fill.type) {
        case "SOLID":
          if (!fill.color) return null;
          return figmaColorToCss(fill.color, fill.opacity);
        case "GRADIENT_LINEAR":
          return resolveLinearGradient(fill);
        case "GRADIENT_RADIAL":
          return resolveRadialGradient(fill);
        case "IMAGE":
          return `/* image: ${fill.imageRef ?? "unknown"} */ #e0e0e0`;
        default:
          return null;
      }
    })
    .filter(Boolean);

  return backgrounds.length ? backgrounds.join(", ") : null;
}

/**
 * Resolve Figma fills to a CSS text color (for TEXT nodes).
 */
export function resolveTextColor(fills: FigmaPaint[]): string | null {
  const visible = fills.filter((f) => f.visible !== false);
  if (visible.length === 0) return null;

  // Use the topmost solid fill for text color
  const solid = visible.find((f) => f.type === "SOLID" && f.color);
  if (!solid?.color) return null;
  return figmaColorToCss(solid.color, solid.opacity);
}

/**
 * Resolve Figma strokes to CSS border properties.
 */
export function resolveBorder(
  strokes: FigmaPaint[],
  weight: number,
  align?: string,
): Record<string, string> | null {
  const visible = strokes.filter((s) => s.visible !== false);
  if (!visible.length || weight <= 0) return null;

  const stroke = visible[0];
  if (stroke.type !== "SOLID" || !stroke.color) return null;

  const color = figmaColorToCss(stroke.color, stroke.opacity);
  const styles: Record<string, string> = {
    border: `${weight}px solid ${color}`,
  };

  if (align === "INSIDE") {
    styles["box-sizing"] = "border-box";
  }

  return styles;
}

function resolveLinearGradient(fill: FigmaPaint): string | null {
  if (!fill.gradientHandlePositions || !fill.gradientStops) return null;

  const [start, end] = fill.gradientHandlePositions;
  const angle =
    Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI) + 90;
  const stops = fill.gradientStops
    .map(
      (s) =>
        `${figmaColorToCss(s.color)} ${(s.position * 100).toFixed(1)}%`,
    )
    .join(", ");

  return `linear-gradient(${Math.round(angle)}deg, ${stops})`;
}

function resolveRadialGradient(fill: FigmaPaint): string | null {
  if (!fill.gradientStops) return null;

  const stops = fill.gradientStops
    .map(
      (s) =>
        `${figmaColorToCss(s.color)} ${(s.position * 100).toFixed(1)}%`,
    )
    .join(", ");

  return `radial-gradient(circle, ${stops})`;
}
