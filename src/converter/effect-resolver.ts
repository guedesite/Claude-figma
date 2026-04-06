import type { FigmaEffect } from "../api/types.js";
import { figmaColorToCss } from "../utils/color.js";

/**
 * Resolve Figma effects array to CSS properties (box-shadow, filter, backdrop-filter).
 */
export function resolveEffects(
  effects: FigmaEffect[],
): Record<string, string> {
  const styles: Record<string, string> = {};
  const shadows: string[] = [];
  const filters: string[] = [];

  for (const effect of effects) {
    if (effect.visible === false) continue;

    switch (effect.type) {
      case "DROP_SHADOW": {
        const x = effect.offset?.x ?? 0;
        const y = effect.offset?.y ?? 0;
        const r = effect.radius;
        const spread = effect.spread ?? 0;
        const color = effect.color
          ? figmaColorToCss(effect.color)
          : "rgba(0, 0, 0, 0.25)";
        shadows.push(`${x}px ${y}px ${r}px ${spread}px ${color}`);
        break;
      }
      case "INNER_SHADOW": {
        const x = effect.offset?.x ?? 0;
        const y = effect.offset?.y ?? 0;
        const r = effect.radius;
        const spread = effect.spread ?? 0;
        const color = effect.color
          ? figmaColorToCss(effect.color)
          : "rgba(0, 0, 0, 0.25)";
        shadows.push(`inset ${x}px ${y}px ${r}px ${spread}px ${color}`);
        break;
      }
      case "LAYER_BLUR":
        filters.push(`blur(${effect.radius}px)`);
        break;
      case "BACKGROUND_BLUR":
        styles["backdrop-filter"] = `blur(${effect.radius}px)`;
        break;
    }
  }

  if (shadows.length) styles["box-shadow"] = shadows.join(", ");
  if (filters.length) styles["filter"] = filters.join(" ");

  return styles;
}
