import { describe, it, expect } from "vitest";
import { resolveContainerLayout, resolveChildLayout } from "../../../src/converter/layout-resolver.js";
import type { FigmaNode } from "../../../src/api/types.js";

function makeNode(overrides: Partial<FigmaNode>): FigmaNode {
  return {
    id: "1:1",
    name: "Test",
    type: "FRAME",
    ...overrides,
  };
}

describe("resolveContainerLayout", () => {
  it("should return position: relative for non-auto-layout", () => {
    const node = makeNode({ layoutMode: "NONE" });
    const result = resolveContainerLayout(node);
    expect(result["position"]).toBe("relative");
    expect(result["display"]).toBeUndefined();
  });

  it("should resolve horizontal auto-layout to flex row", () => {
    const node = makeNode({
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "CENTER",
      counterAxisAlignItems: "CENTER",
      itemSpacing: 16,
    });
    const result = resolveContainerLayout(node);
    expect(result["display"]).toBe("flex");
    expect(result["flex-direction"]).toBe("row");
    expect(result["justify-content"]).toBe("center");
    expect(result["align-items"]).toBe("center");
    expect(result["gap"]).toBe("16px");
  });

  it("should resolve vertical auto-layout to flex column", () => {
    const node = makeNode({
      layoutMode: "VERTICAL",
      primaryAxisAlignItems: "MIN",
      counterAxisAlignItems: "MIN",
      itemSpacing: 8,
    });
    const result = resolveContainerLayout(node);
    expect(result["display"]).toBe("flex");
    expect(result["flex-direction"]).toBe("column");
    expect(result["justify-content"]).toBe("flex-start");
    expect(result["align-items"]).toBe("flex-start");
    expect(result["gap"]).toBe("8px");
  });

  it("should resolve SPACE_BETWEEN alignment", () => {
    const node = makeNode({
      layoutMode: "HORIZONTAL",
      primaryAxisAlignItems: "SPACE_BETWEEN",
    });
    const result = resolveContainerLayout(node);
    expect(result["justify-content"]).toBe("space-between");
  });

  it("should resolve padding", () => {
    const node = makeNode({
      layoutMode: "VERTICAL",
      paddingTop: 16,
      paddingRight: 24,
      paddingBottom: 16,
      paddingLeft: 24,
    });
    const result = resolveContainerLayout(node);
    expect(result["padding"]).toBe("16px 24px");
  });

  it("should resolve equal padding as single value", () => {
    const node = makeNode({
      layoutMode: "VERTICAL",
      paddingTop: 20,
      paddingRight: 20,
      paddingBottom: 20,
      paddingLeft: 20,
    });
    const result = resolveContainerLayout(node);
    expect(result["padding"]).toBe("20px");
  });

  it("should resolve wrap mode", () => {
    const node = makeNode({
      layoutMode: "HORIZONTAL",
      layoutWrap: "WRAP",
      itemSpacing: 8,
    });
    const result = resolveContainerLayout(node);
    expect(result["flex-wrap"]).toBe("wrap");
  });
});

describe("resolveChildLayout", () => {
  it("should set absolute positioning for child in non-auto-layout parent", () => {
    const node = makeNode({
      absoluteBoundingBox: { x: 50, y: 30, width: 100, height: 40 },
    });
    const parent = {
      layoutMode: "NONE" as const,
      absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
    };
    const result = resolveChildLayout(node, parent);
    expect(result["position"]).toBe("absolute");
    expect(result["left"]).toBe("50px");
    expect(result["top"]).toBe("30px");
  });

  it("should set flex: 1 for FILL in primary axis direction", () => {
    const node = makeNode({
      layoutSizingHorizontal: "FILL",
    });
    const parent = {
      layoutMode: "HORIZONTAL" as const,
    };
    const result = resolveChildLayout(node, parent);
    expect(result["flex"]).toBe("1");
  });

  it("should set align-self: stretch for FILL in counter axis", () => {
    const node = makeNode({
      layoutSizingVertical: "FILL",
    });
    const parent = {
      layoutMode: "HORIZONTAL" as const,
    };
    const result = resolveChildLayout(node, parent);
    expect(result["align-self"]).toBe("stretch");
  });

  it("should handle ABSOLUTE positioning override", () => {
    const node = makeNode({
      layoutPositioning: "ABSOLUTE",
      absoluteBoundingBox: { x: 10, y: 20, width: 50, height: 50 },
    });
    const parent = {
      layoutMode: "HORIZONTAL" as const,
      absoluteBoundingBox: { x: 0, y: 0, width: 400, height: 300 },
    };
    const result = resolveChildLayout(node, parent);
    expect(result["position"]).toBe("absolute");
  });
});
