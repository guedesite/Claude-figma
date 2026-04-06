import type { FigmaNode, FigmaBoundingBox } from "../api/types.js";

export interface ParentContext {
  layoutMode: "HORIZONTAL" | "VERTICAL" | "NONE";
  absoluteBoundingBox?: FigmaBoundingBox;
}

/**
 * Resolve layout CSS for a container node (auto-layout → flexbox).
 */
export function resolveContainerLayout(
  node: FigmaNode,
): Record<string, string> {
  const styles: Record<string, string> = {};

  if (!node.layoutMode || node.layoutMode === "NONE") {
    // Non-auto-layout container: children use absolute positioning
    styles["position"] = "relative";
    return styles;
  }

  // Auto-layout → flexbox
  styles["display"] = "flex";
  styles["flex-direction"] =
    node.layoutMode === "HORIZONTAL" ? "row" : "column";

  // Primary axis alignment (justify-content)
  switch (node.primaryAxisAlignItems) {
    case "MIN":
      styles["justify-content"] = "flex-start";
      break;
    case "CENTER":
      styles["justify-content"] = "center";
      break;
    case "MAX":
      styles["justify-content"] = "flex-end";
      break;
    case "SPACE_BETWEEN":
      styles["justify-content"] = "space-between";
      break;
  }

  // Counter axis alignment (align-items)
  switch (node.counterAxisAlignItems) {
    case "MIN":
      styles["align-items"] = "flex-start";
      break;
    case "CENTER":
      styles["align-items"] = "center";
      break;
    case "MAX":
      styles["align-items"] = "flex-end";
      break;
    case "BASELINE":
      styles["align-items"] = "baseline";
      break;
  }

  // Gap
  if (node.itemSpacing && node.itemSpacing > 0) {
    styles["gap"] = `${node.itemSpacing}px`;
  }

  // Padding
  const pt = node.paddingTop ?? 0;
  const pr = node.paddingRight ?? 0;
  const pb = node.paddingBottom ?? 0;
  const pl = node.paddingLeft ?? 0;
  if (pt || pr || pb || pl) {
    if (pt === pr && pr === pb && pb === pl) {
      styles["padding"] = `${pt}px`;
    } else if (pt === pb && pl === pr) {
      styles["padding"] = `${pt}px ${pr}px`;
    } else {
      styles["padding"] = `${pt}px ${pr}px ${pb}px ${pl}px`;
    }
  }

  // Wrap
  if (node.layoutWrap === "WRAP") {
    styles["flex-wrap"] = "wrap";
    if (node.counterAxisSpacing && node.counterAxisSpacing > 0) {
      styles["row-gap"] = `${node.counterAxisSpacing}px`;
      // Override gap with column-gap if both exist
      if (node.itemSpacing && node.itemSpacing > 0) {
        delete styles["gap"];
        styles["column-gap"] = `${node.itemSpacing}px`;
      }
    }
  }

  return styles;
}

/**
 * Resolve child sizing CSS within an auto-layout parent.
 */
export function resolveChildLayout(
  node: FigmaNode,
  parent: ParentContext,
): Record<string, string> {
  const styles: Record<string, string> = {};

  if (parent.layoutMode === "NONE" || !parent.layoutMode) {
    // Parent is not auto-layout → child needs absolute positioning
    if (
      node.absoluteBoundingBox &&
      parent.absoluteBoundingBox &&
      node.layoutPositioning !== "AUTO"
    ) {
      styles["position"] = "absolute";
      const childBox = node.absoluteBoundingBox;
      const parentBox = parent.absoluteBoundingBox;

      const left = Math.round(childBox.x - parentBox.x);
      const top = Math.round(childBox.y - parentBox.y);
      styles["left"] = `${left}px`;
      styles["top"] = `${top}px`;
    }
    return styles;
  }

  // Inside auto-layout parent
  const isHorizontal = parent.layoutMode === "HORIZONTAL";

  // Horizontal sizing
  if (node.layoutSizingHorizontal === "FILL") {
    if (isHorizontal) {
      styles["flex"] = "1";
    } else {
      styles["align-self"] = "stretch";
    }
  }

  // Vertical sizing
  if (node.layoutSizingVertical === "FILL") {
    if (!isHorizontal) {
      styles["flex"] = "1";
    } else {
      styles["align-self"] = "stretch";
    }
  }

  // Explicit flex-grow
  if (node.layoutGrow && node.layoutGrow > 0) {
    styles["flex-grow"] = String(node.layoutGrow);
  }

  // Absolute positioning override within auto-layout
  if (node.layoutPositioning === "ABSOLUTE") {
    styles["position"] = "absolute";
    if (node.absoluteBoundingBox && parent.absoluteBoundingBox) {
      const childBox = node.absoluteBoundingBox;
      const parentBox = parent.absoluteBoundingBox;
      styles["left"] = `${Math.round(childBox.x - parentBox.x)}px`;
      styles["top"] = `${Math.round(childBox.y - parentBox.y)}px`;
    }
  }

  return styles;
}
