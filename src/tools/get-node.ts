import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FigmaNode } from "../api/types.js";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractFileKey } from "../utils/url-parser.js";

export function registerGetNode(server: McpServer): void {
  server.tool(
    "figma_get_node",
    "Get detailed information about a specific node in a Figma file, including its properties, styles, and children.",
    {
      file_key: z.string().describe("File key or Figma file URL"),
      node_id: z.string().describe("Node ID (e.g., '123:456')"),
      depth: z.number().optional().default(5).describe("How deep to include children (default: 5)"),
    },
    async ({ file_key, node_id, depth }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedKey = extractFileKey(file_key);

      try {
        const result = await auth.client.getFileNodes(resolvedKey, [node_id], depth);
        const nodeData = result.nodes[node_id];
        if (!nodeData) {
          return {
            content: [{ type: "text", text: `Node with ID "${node_id}" not found.` }],
            isError: true,
          };
        }

        const details = formatNodeDetails(nodeData.document, resolvedKey);

        return {
          content: [{ type: "text", text: details }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}

function formatNodeDetails(node: FigmaNode, fileKey: string): string {
  const sections: string[] = [];

  sections.push(`**${node.name}** (\`${node.type}\`, ID: \`${node.id}\`)`);

  if (node.absoluteBoundingBox) {
    const { x, y, width, height } = node.absoluteBoundingBox;
    sections.push(`Position: (${Math.round(x)}, ${Math.round(y)}) | Size: ${Math.round(width)} x ${Math.round(height)}`);
  }

  if (node.layoutMode && node.layoutMode !== "NONE") {
    const parts = [`Auto-layout: ${node.layoutMode.toLowerCase()}`];
    if (node.primaryAxisAlignItems) parts.push(`justify: ${node.primaryAxisAlignItems}`);
    if (node.counterAxisAlignItems) parts.push(`align: ${node.counterAxisAlignItems}`);
    if (node.itemSpacing) parts.push(`gap: ${node.itemSpacing}px`);
    const pt = node.paddingTop ?? 0, pr = node.paddingRight ?? 0;
    const pb = node.paddingBottom ?? 0, pl = node.paddingLeft ?? 0;
    if (pt || pr || pb || pl) parts.push(`padding: ${pt} ${pr} ${pb} ${pl}`);
    sections.push(parts.join(" | "));
  }

  if (node.fills?.length) {
    const visible = node.fills.filter((f) => f.visible !== false);
    if (visible.length) {
      const fillDesc = visible.map((f) => {
        if (f.type === "SOLID" && f.color) {
          const { r, g, b } = f.color;
          return `solid(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
        }
        return f.type.toLowerCase();
      }).join(", ");
      sections.push(`Fills: ${fillDesc}`);
    }
  }

  if (node.effects?.length) {
    const visible = node.effects.filter((e) => e.visible !== false);
    if (visible.length) {
      sections.push(`Effects: ${visible.map((e) => e.type.toLowerCase().replace(/_/g, " ")).join(", ")}`);
    }
  }

  if (node.type === "TEXT" && node.characters) {
    const preview = node.characters.length > 100
      ? node.characters.slice(0, 100) + "..."
      : node.characters;
    sections.push(`Text: "${preview}"`);
    if (node.style) {
      const parts: string[] = [];
      if (node.style.fontFamily) parts.push(node.style.fontFamily);
      if (node.style.fontSize) parts.push(`${node.style.fontSize}px`);
      if (node.style.fontWeight) parts.push(`weight ${node.style.fontWeight}`);
      sections.push(`Font: ${parts.join(", ")}`);
    }
  }

  if (node.cornerRadius) {
    sections.push(`Border radius: ${node.cornerRadius}px`);
  }

  if (node.children?.length) {
    sections.push(`\n**Children (${node.children.length}):**`);
    for (const child of node.children) {
      const dims = child.absoluteBoundingBox
        ? ` (${Math.round(child.absoluteBoundingBox.width)}x${Math.round(child.absoluteBoundingBox.height)})`
        : "";
      sections.push(`  - ${child.name} \`${child.type}\` ID:\`${child.id}\`${dims}`);
    }
  }

  sections.push(``);
  sections.push(`**Actions:** Convert this node to HTML → \`figma_to_html\` with file key \`${fileKey}\` and node ID \`${node.id}\``);

  return sections.join("\n");
}
