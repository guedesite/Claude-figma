import { describe, it, expect } from "vitest";
import { buildStyles, stylesToString } from "../../../src/converter/style-builder.js";
import type { FigmaNode } from "../../../src/api/types.js";

function makeNode(overrides: Partial<FigmaNode>): FigmaNode {
  return {
    id: "1:1",
    name: "Test",
    type: "FRAME",
    ...overrides,
  };
}

describe("buildStyles", () => {
  it("should set dimensions from absoluteBoundingBox", () => {
    const node = makeNode({
      absoluteBoundingBox: { x: 0, y: 0, width: 320, height: 200 },
    });
    const styles = buildStyles(node);
    expect(styles["width"]).toBe("320px");
    expect(styles["height"]).toBe("200px");
  });

  it("should skip dimensions when FILL sizing", () => {
    const node = makeNode({
      absoluteBoundingBox: { x: 0, y: 0, width: 320, height: 200 },
      layoutSizingHorizontal: "FILL",
      layoutSizingVertical: "HUG",
    });
    const styles = buildStyles(node);
    expect(styles["width"]).toBeUndefined();
    expect(styles["height"]).toBeUndefined();
  });

  it("should resolve background from fills", () => {
    const node = makeNode({
      fills: [{ type: "SOLID", visible: true, color: { r: 1, g: 0, b: 0, a: 1 } }],
    });
    const styles = buildStyles(node);
    expect(styles["background"]).toBe("#ff0000");
  });

  it("should resolve corner radius", () => {
    const node = makeNode({ cornerRadius: 8 });
    const styles = buildStyles(node);
    expect(styles["border-radius"]).toBe("8px");
  });

  it("should resolve individual corner radii", () => {
    const node = makeNode({
      rectangleCornerRadii: [4, 8, 12, 16],
    });
    const styles = buildStyles(node);
    expect(styles["border-radius"]).toBe("4px 8px 12px 16px");
  });

  it("should simplify equal corner radii", () => {
    const node = makeNode({
      rectangleCornerRadii: [8, 8, 8, 8],
    });
    const styles = buildStyles(node);
    expect(styles["border-radius"]).toBe("8px");
  });

  it("should set opacity when less than 1", () => {
    const node = makeNode({ opacity: 0.5 });
    const styles = buildStyles(node);
    expect(styles["opacity"]).toBe("0.5");
  });

  it("should not set opacity when 1", () => {
    const node = makeNode({ opacity: 1 });
    const styles = buildStyles(node);
    expect(styles["opacity"]).toBeUndefined();
  });

  it("should set overflow hidden when clipsContent", () => {
    const node = makeNode({ clipsContent: true });
    const styles = buildStyles(node);
    expect(styles["overflow"]).toBe("hidden");
  });
});

describe("stylesToString", () => {
  it("should convert property map to inline style string", () => {
    const styles = { display: "flex", gap: "16px" };
    expect(stylesToString(styles)).toBe("display: flex; gap: 16px");
  });

  it("should handle empty object", () => {
    expect(stylesToString({})).toBe("");
  });
});
