import { describe, it, expect } from "vitest";
import { resolveEffects } from "../../../src/converter/effect-resolver.js";
import type { FigmaEffect } from "../../../src/api/types.js";

describe("resolveEffects", () => {
  it("should return empty object for empty effects", () => {
    expect(resolveEffects([])).toEqual({});
  });

  it("should skip invisible effects", () => {
    const effects: FigmaEffect[] = [
      { type: "DROP_SHADOW", visible: false, radius: 8, offset: { x: 0, y: 4 }, color: { r: 0, g: 0, b: 0, a: 0.25 } },
    ];
    expect(resolveEffects(effects)).toEqual({});
  });

  it("should resolve a drop shadow", () => {
    const effects: FigmaEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 8, offset: { x: 0, y: 4 }, spread: 0, color: { r: 0, g: 0, b: 0, a: 0.1 } },
    ];
    const result = resolveEffects(effects);
    expect(result["box-shadow"]).toBe("0px 4px 8px 0px rgba(0, 0, 0, 0.1)");
  });

  it("should resolve an inner shadow with inset", () => {
    const effects: FigmaEffect[] = [
      { type: "INNER_SHADOW", visible: true, radius: 4, offset: { x: 1, y: 2 }, spread: 0, color: { r: 0, g: 0, b: 0, a: 0.2 } },
    ];
    const result = resolveEffects(effects);
    expect(result["box-shadow"]).toContain("inset");
  });

  it("should resolve multiple shadows separated by comma", () => {
    const effects: FigmaEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4, offset: { x: 0, y: 2 }, color: { r: 0, g: 0, b: 0, a: 0.1 } },
      { type: "DROP_SHADOW", visible: true, radius: 16, offset: { x: 0, y: 8 }, color: { r: 0, g: 0, b: 0, a: 0.05 } },
    ];
    const result = resolveEffects(effects);
    expect(result["box-shadow"]).toContain(", ");
  });

  it("should resolve a layer blur to CSS filter", () => {
    const effects: FigmaEffect[] = [
      { type: "LAYER_BLUR", visible: true, radius: 10 },
    ];
    const result = resolveEffects(effects);
    expect(result["filter"]).toBe("blur(10px)");
  });

  it("should resolve a background blur to backdrop-filter", () => {
    const effects: FigmaEffect[] = [
      { type: "BACKGROUND_BLUR", visible: true, radius: 20 },
    ];
    const result = resolveEffects(effects);
    expect(result["backdrop-filter"]).toBe("blur(20px)");
  });
});
