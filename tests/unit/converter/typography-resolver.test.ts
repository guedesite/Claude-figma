import { describe, it, expect } from "vitest";
import { resolveTypography } from "../../../src/converter/typography-resolver.js";
import type { FigmaTypeStyle } from "../../../src/api/types.js";

describe("resolveTypography", () => {
  it("should resolve basic font properties", () => {
    const style: FigmaTypeStyle = {
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: 400,
    };
    const result = resolveTypography(style);
    expect(result["font-family"]).toBe('"Inter", sans-serif');
    expect(result["font-size"]).toBe("16px");
    expect(result["font-weight"]).toBe("400");
  });

  it("should resolve italic", () => {
    const style: FigmaTypeStyle = { italic: true };
    const result = resolveTypography(style);
    expect(result["font-style"]).toBe("italic");
  });

  it("should resolve letter spacing", () => {
    const style: FigmaTypeStyle = { letterSpacing: -0.5 };
    const result = resolveTypography(style);
    expect(result["letter-spacing"]).toBe("-0.5px");
  });

  it("should resolve pixel line height", () => {
    const style: FigmaTypeStyle = {
      lineHeightPx: 24,
      lineHeightUnit: "PIXELS",
    };
    const result = resolveTypography(style);
    expect(result["line-height"]).toBe("24px");
  });

  it("should resolve percentage line height", () => {
    const style: FigmaTypeStyle = {
      lineHeightPercentFontSize: 150,
      lineHeightUnit: "FONT_SIZE_%",
    };
    const result = resolveTypography(style);
    expect(result["line-height"]).toBe("1.50");
  });

  it("should resolve text alignment center", () => {
    const style: FigmaTypeStyle = { textAlignHorizontal: "CENTER" };
    const result = resolveTypography(style);
    expect(result["text-align"]).toBe("center");
  });

  it("should not set text-align for LEFT (default)", () => {
    const style: FigmaTypeStyle = { textAlignHorizontal: "LEFT" };
    const result = resolveTypography(style);
    expect(result["text-align"]).toBeUndefined();
  });

  it("should resolve text decoration underline", () => {
    const style: FigmaTypeStyle = { textDecoration: "UNDERLINE" };
    const result = resolveTypography(style);
    expect(result["text-decoration"]).toBe("underline");
  });

  it("should resolve text transform uppercase", () => {
    const style: FigmaTypeStyle = { textCase: "UPPER" };
    const result = resolveTypography(style);
    expect(result["text-transform"]).toBe("uppercase");
  });

  it("should resolve text color from fills", () => {
    const style: FigmaTypeStyle = {
      fills: [{ type: "SOLID", visible: true, color: { r: 1, g: 0, b: 0, a: 1 } }],
    };
    const result = resolveTypography(style);
    expect(result["color"]).toBe("#ff0000");
  });
});
