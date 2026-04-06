import type { FigmaNode } from "../api/types.js";
import { resolveBackground, resolveTextColor, resolveBorder } from "./paint-resolver.js";
import { resolveEffects } from "./effect-resolver.js";
import { resolveTypography } from "./typography-resolver.js";
import { resolveContainerLayout, resolveChildLayout } from "./layout-resolver.js";
import type { ParentContext } from "./layout-resolver.js";

/**
 * Build a CSS property map from a Figma node's visual properties.
 */
export function buildStyles(
  node: FigmaNode,
  parentContext?: ParentContext,
): Record<string, string> {
  const styles: Record<string, string> = {};

  // Dimensions
  if (node.absoluteBoundingBox) {
    const { width, height } = node.absoluteBoundingBox;

    if (node.type === "TEXT") {
      // TEXT nodes: absoluteBoundingBox is the rendered size, NOT a constraint.
      // Only set width if the text has explicit FIXED horizontal sizing.
      // Otherwise, let text flow naturally to avoid unwanted wrapping.
      if (node.layoutSizingHorizontal === "FIXED") {
        styles["width"] = `${Math.round(width)}px`;
      }
      // For single-line text (no newlines), prevent wrapping
      if (node.characters && !node.characters.includes("\n")) {
        styles["white-space"] = "nowrap";
      }
    } else {
      // Non-text nodes: set dimensions unless FILL/HUG
      if (node.layoutSizingHorizontal !== "FILL" && node.layoutSizingHorizontal !== "HUG") {
        styles["width"] = `${Math.round(width)}px`;
      }
      if (node.layoutSizingVertical !== "FILL" && node.layoutSizingVertical !== "HUG") {
        styles["height"] = `${Math.round(height)}px`;
      }
    }
  }

  // Fills → background (for shapes/frames) or color (for text)
  if (node.fills?.length) {
    if (node.type === "TEXT") {
      // For TEXT nodes, fills define the text color, not background
      const color = resolveTextColor(node.fills);
      if (color) styles["color"] = color;
    } else {
      const bg = resolveBackground(node.fills);
      if (bg) styles["background"] = bg;
    }
  }

  // Strokes → border
  if (node.strokes?.length && node.strokeWeight) {
    const border = resolveBorder(node.strokes, node.strokeWeight, node.strokeAlign);
    if (border) Object.assign(styles, border);
  }

  // Effects → box-shadow, filter, backdrop-filter
  if (node.effects?.length) {
    Object.assign(styles, resolveEffects(node.effects));
  }

  // Corner radius
  if (node.rectangleCornerRadii) {
    const [tl, tr, br, bl] = node.rectangleCornerRadii;
    if (tl === tr && tr === br && br === bl) {
      if (tl > 0) styles["border-radius"] = `${tl}px`;
    } else {
      styles["border-radius"] = `${tl}px ${tr}px ${br}px ${bl}px`;
    }
  } else if (node.cornerRadius && node.cornerRadius > 0) {
    styles["border-radius"] = `${node.cornerRadius}px`;
  }

  // Opacity
  if (node.opacity !== undefined && node.opacity < 1) {
    styles["opacity"] = String(parseFloat(node.opacity.toFixed(2)));
  }

  // Container type check (used for overflow + layout)
  const isContainer =
    node.type === "FRAME" ||
    node.type === "COMPONENT" ||
    node.type === "COMPONENT_SET" ||
    node.type === "INSTANCE" ||
    node.type === "SECTION" ||
    node.type === "GROUP";

  // Overflow — clip if explicitly set, or if a container has border-radius
  // (CSS border-radius without overflow: hidden lets children visually overflow the rounded corners)
  if (node.clipsContent || (isContainer && styles["border-radius"])) {
    styles["overflow"] = "hidden";
  }

  if (isContainer) {
    Object.assign(styles, resolveContainerLayout(node));
  }

  // Child layout (positioning within parent)
  if (parentContext) {
    Object.assign(styles, resolveChildLayout(node, parentContext));
  }

  // Typography (for TEXT nodes)
  if (node.type === "TEXT" && node.style) {
    Object.assign(styles, resolveTypography(node.style));
  }

  return styles;
}

/**
 * Convert a CSS property map to an inline style string.
 */
export function stylesToString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([prop, val]) => `${prop}: ${val}`)
    .join("; ");
}
