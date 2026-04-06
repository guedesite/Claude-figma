import type { FigmaTypeStyle } from "../api/types.js";
import { resolveTextColor } from "./paint-resolver.js";

/**
 * Resolve Figma TypeStyle to CSS typography properties.
 */
export function resolveTypography(
  style: FigmaTypeStyle,
): Record<string, string> {
  const css: Record<string, string> = {};

  if (style.fontFamily) {
    css["font-family"] = `"${style.fontFamily}", sans-serif`;
  }
  if (style.fontSize) {
    css["font-size"] = `${style.fontSize}px`;
  }
  if (style.fontWeight) {
    css["font-weight"] = String(style.fontWeight);
  }
  if (style.italic) {
    css["font-style"] = "italic";
  }

  // Letter spacing
  if (style.letterSpacing && style.letterSpacing !== 0) {
    css["letter-spacing"] = `${style.letterSpacing}px`;
  }

  // Line height
  if (style.lineHeightUnit === "PIXELS" && style.lineHeightPx) {
    css["line-height"] = `${style.lineHeightPx}px`;
  } else if (
    style.lineHeightUnit === "FONT_SIZE_%" &&
    style.lineHeightPercentFontSize
  ) {
    css["line-height"] = (style.lineHeightPercentFontSize / 100).toFixed(2);
  }
  // INTRINSIC_% = "auto", no explicit CSS needed

  // Text alignment
  switch (style.textAlignHorizontal) {
    case "CENTER":
      css["text-align"] = "center";
      break;
    case "RIGHT":
      css["text-align"] = "right";
      break;
    case "JUSTIFIED":
      css["text-align"] = "justify";
      break;
    // LEFT is default, skip
  }

  // Text decoration
  switch (style.textDecoration) {
    case "UNDERLINE":
      css["text-decoration"] = "underline";
      break;
    case "STRIKETHROUGH":
      css["text-decoration"] = "line-through";
      break;
  }

  // Text case / transform
  switch (style.textCase) {
    case "UPPER":
      css["text-transform"] = "uppercase";
      break;
    case "LOWER":
      css["text-transform"] = "lowercase";
      break;
    case "TITLE":
      css["text-transform"] = "capitalize";
      break;
  }

  // Text color from fills
  if (style.fills?.length) {
    const color = resolveTextColor(style.fills);
    if (color) css["color"] = color;
  }

  return css;
}
