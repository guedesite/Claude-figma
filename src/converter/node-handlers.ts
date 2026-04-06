import type { FigmaNode } from "../api/types.js";
import { buildStyles, stylesToString } from "./style-builder.js";
import { resolveTextColor } from "./paint-resolver.js";
import { resolveTypography } from "./typography-resolver.js";
import type { ParentContext } from "./layout-resolver.js";

export interface ConvertContext {
  classCounter: number;
  styleMap: Map<string, Record<string, string>>;
  useStyleTag: boolean;
  maxDepth: number;
  svgMap: Record<string, string | null>;
}

/**
 * Render a Figma node to HTML, dispatching by type.
 */
export function renderNode(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
  parentContext?: ParentContext,
): string {
  if (depth > ctx.maxDepth) {
    return `<!-- max depth reached: ${escapeHtml(node.name)} -->`;
  }
  if (node.visible === false) {
    return `<!-- hidden: ${escapeHtml(node.name)} -->`;
  }

  switch (node.type) {
    case "FRAME":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "INSTANCE":
    case "SECTION":
      return renderFrame(node, ctx, depth, parentContext);
    case "GROUP":
    case "BOOLEAN_OPERATION":
      return renderGroup(node, ctx, depth, parentContext);
    case "TEXT":
      return renderText(node, ctx, depth, parentContext);
    case "RECTANGLE":
      return renderRectangle(node, ctx, depth, parentContext);
    case "ELLIPSE":
      return renderEllipse(node, ctx, depth, parentContext);
    case "VECTOR":
    case "STAR":
    case "LINE":
    case "REGULAR_POLYGON" as FigmaNode["type"]:
      return renderVector(node, ctx, depth, parentContext);
    case "CANVAS":
      return renderCanvas(node, ctx, depth);
    case "DOCUMENT":
      return renderDocument(node, ctx, depth);
    default:
      return renderGenericContainer(node, ctx, depth, parentContext);
  }
}

function renderFrame(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
  parentContext?: ParentContext,
): string {
  // Check if this frame has an SVG export (icon frame)
  const svgUrl = ctx.svgMap[node.id];
  if (svgUrl) {
    return renderSvgImage(node, ctx, parentContext, svgUrl);
  }

  const styles = buildStyles(node, parentContext);
  const childParent: ParentContext = {
    layoutMode: node.layoutMode ?? "NONE",
    absoluteBoundingBox: node.absoluteBoundingBox,
  };

  const children = renderChildren(node, ctx, depth, childParent);
  const comment = `<!-- ${escapeHtml(node.name)} -->`;

  return `${comment}\n${openTag("div", styles, node, ctx)}${children}${closeTag("div")}`;
}

function renderGroup(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
  parentContext?: ParentContext,
): string {
  const styles = buildStyles(node, parentContext);
  if (!styles["position"]) {
    styles["position"] = "relative";
  }

  const childParent: ParentContext = {
    layoutMode: "NONE",
    absoluteBoundingBox: node.absoluteBoundingBox,
  };

  const children = renderChildren(node, ctx, depth, childParent);
  const comment = `<!-- ${escapeHtml(node.name)} -->`;

  return `${comment}\n${openTag("div", styles, node, ctx)}${children}${closeTag("div")}`;
}

function renderText(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
  parentContext?: ParentContext,
): string {
  const styles = buildStyles(node, parentContext);
  const text = node.characters ?? "";

  // Determine if this has character style overrides
  if (
    node.characterStyleOverrides?.length &&
    node.styleOverrideTable &&
    hasActualOverrides(node.characterStyleOverrides)
  ) {
    const content = renderStyledText(
      text,
      node.characterStyleOverrides,
      node.styleOverrideTable,
      node.fills,
    );
    return `${openTag("p", styles, node, ctx)}${content}${closeTag("p")}`;
  }

  // Add text color from node fills if not already set via style
  if (!styles["color"] && node.fills?.length) {
    const color = resolveTextColor(node.fills);
    if (color) styles["color"] = color;
  }

  const isMultiline = text.includes("\n");
  const tag = isMultiline ? "p" : "span";
  const escaped = escapeHtml(text);

  return `${openTag(tag, styles, node, ctx)}${escaped}${closeTag(tag)}`;
}

function renderRectangle(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
  parentContext?: ParentContext,
): string {
  const styles = buildStyles(node, parentContext);
  return `${openTag("div", styles, node, ctx)}${closeTag("div")}`;
}

function renderEllipse(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
  parentContext?: ParentContext,
): string {
  // Check for SVG export
  const svgUrl = ctx.svgMap[node.id];
  if (svgUrl) {
    return renderSvgImage(node, ctx, parentContext, svgUrl);
  }

  const styles = buildStyles(node, parentContext);
  styles["border-radius"] = "50%";
  return `${openTag("div", styles, node, ctx)}${closeTag("div")}`;
}

function renderVector(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
  parentContext?: ParentContext,
): string {
  // Check for SVG export
  const svgUrl = ctx.svgMap[node.id];
  if (svgUrl) {
    return renderSvgImage(node, ctx, parentContext, svgUrl);
  }

  const styles = buildStyles(node, parentContext);
  const comment = `<!-- vector: ${escapeHtml(node.name)} -->`;
  return `${comment}\n${openTag("div", styles, node, ctx)}${closeTag("div")}`;
}

function renderSvgImage(
  node: FigmaNode,
  ctx: ConvertContext,
  parentContext: ParentContext | undefined,
  svgUrl: string,
): string {
  const styles = buildStyles(node, parentContext);
  // Remove background/border for SVG images — the SVG itself provides the visuals
  delete styles["background"];
  delete styles["border"];
  delete styles["box-sizing"];
  const w = node.absoluteBoundingBox ? Math.round(node.absoluteBoundingBox.width) : undefined;
  const h = node.absoluteBoundingBox ? Math.round(node.absoluteBoundingBox.height) : undefined;
  const widthAttr = w ? ` width="${w}"` : "";
  const heightAttr = h ? ` height="${h}"` : "";

  if (ctx.useStyleTag) {
    const className = generateClassName(node, ctx);
    if (Object.keys(styles).length > 0) {
      ctx.styleMap.set(className, styles);
    }
    return `<img class="${className}" src="${escapeHtml(svgUrl)}" alt="${escapeHtml(node.name)}"${widthAttr}${heightAttr} />`;
  }

  const styleStr = stylesToString(styles);
  const styleAttr = styleStr ? ` style="${styleStr}"` : "";
  return `<img${styleAttr} src="${escapeHtml(svgUrl)}" alt="${escapeHtml(node.name)}"${widthAttr}${heightAttr} />`;
}

function renderCanvas(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
): string {
  const children = renderChildren(node, ctx, depth, {
    layoutMode: "NONE",
    absoluteBoundingBox: undefined,
  });
  return `<!-- Page: ${escapeHtml(node.name)} -->\n<div class="figma-page">\n${children}\n</div>`;
}

function renderDocument(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
): string {
  if (!node.children?.length) return "<!-- empty document -->";
  return node.children
    .map((child) => renderNode(child, ctx, depth + 1))
    .join("\n\n");
}

function renderGenericContainer(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
  parentContext?: ParentContext,
): string {
  const styles = buildStyles(node, parentContext);
  const children = node.children
    ? renderChildren(node, ctx, depth, {
        layoutMode: node.layoutMode ?? "NONE",
        absoluteBoundingBox: node.absoluteBoundingBox,
      })
    : "";
  return `${openTag("div", styles, node, ctx)}${children}${closeTag("div")}`;
}

// ─── Helpers ───

function renderChildren(
  node: FigmaNode,
  ctx: ConvertContext,
  depth: number,
  parentContext: ParentContext,
): string {
  if (!node.children?.length) return "";
  return (
    "\n" +
    node.children
      .map((child) => renderNode(child, ctx, depth + 1, parentContext))
      .join("\n") +
    "\n"
  );
}

function openTag(
  tag: string,
  styles: Record<string, string>,
  node: FigmaNode,
  ctx: ConvertContext,
): string {
  if (ctx.useStyleTag) {
    // Generate a class name and store styles in the map
    const className = generateClassName(node, ctx);
    if (Object.keys(styles).length > 0) {
      ctx.styleMap.set(className, styles);
    }
    return `<${tag} class="${className}">`;
  }

  // Inline styles mode
  const styleStr = stylesToString(styles);
  if (styleStr) {
    return `<${tag} style="${styleStr}">`;
  }
  return `<${tag}>`;
}

function closeTag(tag: string): string {
  return `</${tag}>`;
}

function generateClassName(node: FigmaNode, ctx: ConvertContext): string {
  ctx.classCounter++;
  const typeName = node.type.toLowerCase().replace(/_/g, "-");
  // Sanitize node name for CSS class: keep alphanumeric and hyphens
  const safeName = node.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `figma-${typeName}-${safeName}-${ctx.classCounter}`;
}

function hasActualOverrides(overrides: number[]): boolean {
  return overrides.some((id) => id !== 0);
}

function renderStyledText(
  text: string,
  overrides: number[],
  table: Record<string, import("../api/types.js").FigmaTypeStyle>,
  nodeFills?: import("../api/types.js").FigmaPaint[],
): string {
  const segments: { text: string; styleId: number }[] = [];
  let currentId = overrides[0] ?? 0;
  let currentStart = 0;

  for (let i = 1; i <= text.length; i++) {
    const nextId = i < overrides.length ? overrides[i] : -1;
    if (nextId !== currentId || i === text.length) {
      segments.push({
        text: text.slice(currentStart, i),
        styleId: currentId,
      });
      currentId = nextId;
      currentStart = i;
    }
  }

  return segments
    .map((seg) => {
      if (seg.styleId === 0) {
        return escapeHtml(seg.text);
      }
      const style = table[String(seg.styleId)];
      if (!style) return escapeHtml(seg.text);
      const css = resolveTypography(style);
      // Add text color from fills in override style
      if (!css["color"] && style.fills?.length) {
        const color = resolveTextColor(style.fills);
        if (color) css["color"] = color;
      }
      const styleStr = Object.entries(css)
        .map(([p, v]) => `${p}: ${v}`)
        .join("; ");
      return `<span style="${styleStr}">${escapeHtml(seg.text)}</span>`;
    })
    .join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
