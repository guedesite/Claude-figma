import { describe, it, expect } from "vitest";
import { resolveBackground, resolveTextColor, resolveBorder } from "../../../src/converter/paint-resolver.js";
import type { FigmaPaint } from "../../../src/api/types.js";

describe("resolveBackground", () => {
  it("should return null for empty fills", () => {
    expect(resolveBackground([])).toBeNull();
  });

  it("should return null when all fills are invisible", () => {
    const fills: FigmaPaint[] = [
      { type: "SOLID", visible: false, color: { r: 1, g: 0, b: 0, a: 1 } },
    ];
    expect(resolveBackground(fills)).toBeNull();
  });

  it("should resolve a solid fill to hex color", () => {
    const fills: FigmaPaint[] = [
      { type: "SOLID", visible: true, color: { r: 1, g: 1, b: 1, a: 1 } },
    ];
    expect(resolveBackground(fills)).toBe("#ffffff");
  });

  it("should resolve a solid fill with opacity to rgba", () => {
    const fills: FigmaPaint[] = [
      { type: "SOLID", visible: true, color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 0.5 },
    ];
    expect(resolveBackground(fills)).toBe("rgba(0, 0, 0, 0.5)");
  });

  it("should resolve a linear gradient", () => {
    const fills: FigmaPaint[] = [
      {
        type: "GRADIENT_LINEAR",
        visible: true,
        gradientHandlePositions: [
          { x: 0, y: 0 },
          { x: 1, y: 1 },
          { x: 0, y: 1 },
        ],
        gradientStops: [
          { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
          { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
        ],
      },
    ];
    const result = resolveBackground(fills);
    expect(result).toContain("linear-gradient");
    expect(result).toContain("#ff0000");
    expect(result).toContain("#0000ff");
  });

  it("should handle IMAGE fills with placeholder", () => {
    const fills: FigmaPaint[] = [
      { type: "IMAGE", visible: true, imageRef: "img_abc123" },
    ];
    const result = resolveBackground(fills);
    expect(result).toContain("image");
    expect(result).toContain("#e0e0e0");
  });
});

describe("resolveTextColor", () => {
  it("should return null for empty fills", () => {
    expect(resolveTextColor([])).toBeNull();
  });

  it("should return the first solid fill color", () => {
    const fills: FigmaPaint[] = [
      { type: "SOLID", visible: true, color: { r: 0.1, g: 0.1, b: 0.9, a: 1 } },
    ];
    expect(resolveTextColor(fills)).toBe("#1a1ae6");
  });
});

describe("resolveBorder", () => {
  it("should return null for empty strokes", () => {
    expect(resolveBorder([], 1)).toBeNull();
  });

  it("should return null for zero weight", () => {
    const strokes: FigmaPaint[] = [
      { type: "SOLID", visible: true, color: { r: 0, g: 0, b: 0, a: 1 } },
    ];
    expect(resolveBorder(strokes, 0)).toBeNull();
  });

  it("should resolve a solid stroke to border", () => {
    const strokes: FigmaPaint[] = [
      { type: "SOLID", visible: true, color: { r: 0.9, g: 0.9, b: 0.9, a: 1 } },
    ];
    const result = resolveBorder(strokes, 1);
    expect(result).toBeTruthy();
    expect(result!.border).toContain("1px solid");
  });

  it("should add box-sizing for INSIDE stroke alignment", () => {
    const strokes: FigmaPaint[] = [
      { type: "SOLID", visible: true, color: { r: 0, g: 0, b: 0, a: 1 } },
    ];
    const result = resolveBorder(strokes, 2, "INSIDE");
    expect(result).toBeTruthy();
    expect(result!["box-sizing"]).toBe("border-box");
  });
});
