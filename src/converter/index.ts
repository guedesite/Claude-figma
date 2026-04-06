import type { FigmaNode } from "../api/types.js";
import { renderNode } from "./node-handlers.js";
import type { ConvertContext } from "./node-handlers.js";
import { buildStyleBlock, formatHtml } from "./html-formatter.js";

export interface ConvertOptions {
  /** If true, emit a <style> block with generated classes. If false, use inline styles. */
  includeStyleTag: boolean;
  /** Maximum nesting depth to prevent infinite recursion. */
  maxDepth: number;
  /** Map of node ID → SVG URL for vector/icon nodes (from Figma image export API). */
  svgMap?: Record<string, string | null>;
}

/**
 * Convert a Figma node tree to HTML + CSS.
 *
 * @param node - The root Figma node to convert
 * @param options - Conversion options
 * @returns Formatted HTML string (with optional <style> block)
 */
export function convertNodeToHtml(
  node: FigmaNode,
  options: ConvertOptions = { includeStyleTag: true, maxDepth: 50 },
): string {
  const ctx: ConvertContext = {
    classCounter: 0,
    styleMap: new Map(),
    useStyleTag: options.includeStyleTag,
    maxDepth: options.maxDepth,
    svgMap: options.svgMap ?? {},
  };

  const bodyHtml = renderNode(node, ctx, 0);

  let result: string;
  if (options.includeStyleTag && ctx.styleMap.size > 0) {
    const styleBlock = buildStyleBlock(ctx.styleMap);
    result = `${styleBlock}\n\n${bodyHtml}`;
  } else {
    result = bodyHtml;
  }

  return formatHtml(result);
}

/**
 * Collect all vector/icon node IDs from a Figma node tree.
 * These are nodes that should be exported as SVG via the Figma image API.
 */
export function collectVectorNodeIds(node: FigmaNode): string[] {
  const ids: string[] = [];

  function walk(n: FigmaNode) {
    const isVector =
      n.type === "VECTOR" ||
      n.type === "STAR" ||
      n.type === "LINE" ||
      n.type === "BOOLEAN_OPERATION" ||
      n.type === "ELLIPSE";

    // Also treat small frames that contain only vectors as icons (e.g., lucide icons)
    const isIconFrame =
      (n.type === "FRAME" || n.type === "INSTANCE" || n.type === "COMPONENT") &&
      n.absoluteBoundingBox &&
      n.absoluteBoundingBox.width <= 64 &&
      n.absoluteBoundingBox.height <= 64 &&
      n.children?.length &&
      n.children.every((c) =>
        c.type === "VECTOR" ||
        c.type === "BOOLEAN_OPERATION" ||
        c.type === "LINE" ||
        c.type === "STAR" ||
        c.type === "ELLIPSE" ||
        (c.type === "GROUP" && !c.children?.some((gc) => gc.type === "TEXT"))
      );

    if (isVector || isIconFrame) {
      ids.push(n.id);
      // Don't recurse into icon frames — we export the whole icon as one SVG
      if (isIconFrame) return;
    }

    if (n.children) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return ids;
}
