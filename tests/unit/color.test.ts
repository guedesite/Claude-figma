import { describe, it, expect } from "vitest";
import { figmaColorToCss } from "../../src/utils/color.js";

describe("figmaColorToCss", () => {
  it("should convert opaque black to hex", () => {
    expect(figmaColorToCss({ r: 0, g: 0, b: 0, a: 1 })).toBe("#000000");
  });

  it("should convert opaque white to hex", () => {
    expect(figmaColorToCss({ r: 1, g: 1, b: 1, a: 1 })).toBe("#ffffff");
  });

  it("should convert opaque color to hex", () => {
    expect(figmaColorToCss({ r: 1, g: 0, b: 0, a: 1 })).toBe("#ff0000");
  });

  it("should convert semi-transparent color to rgba", () => {
    const result = figmaColorToCss({ r: 0, g: 0, b: 0, a: 0.5 });
    expect(result).toBe("rgba(0, 0, 0, 0.5)");
  });

  it("should apply paint opacity", () => {
    const result = figmaColorToCss({ r: 1, g: 0, b: 0, a: 1 }, 0.5);
    expect(result).toBe("rgba(255, 0, 0, 0.5)");
  });

  it("should combine color alpha and paint opacity", () => {
    const result = figmaColorToCss({ r: 0, g: 0, b: 0, a: 0.5 }, 0.5);
    expect(result).toBe("rgba(0, 0, 0, 0.25)");
  });

  it("should handle near-opaque colors as hex", () => {
    // 0.999+ should be treated as opaque
    expect(figmaColorToCss({ r: 0.5, g: 0.5, b: 0.5, a: 1 })).toBe("#808080");
  });

  it("should round color values correctly", () => {
    // r: 0.067 * 255 = 17.085 -> 17 -> "11"
    expect(figmaColorToCss({ r: 0.067, g: 0.094, b: 0.153, a: 1 })).toBe("#111827");
  });
});
