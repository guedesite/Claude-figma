import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FigmaNode } from "../api/types.js";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractFileKey } from "../utils/url-parser.js";

export function registerGetPage(server: McpServer): void {
  server.tool(
    "figma_get_page",
    "Get the structure of a specific page in a Figma file. Shows the hierarchy of frames and elements with their IDs for further exploration or HTML conversion.",
    {
      file_key: z.string().describe("File key or Figma file URL"),
      page_id: z.string().describe("Page node ID (e.g., '0:1'), from figma_get_file_info"),
      depth: z.number().optional().default(3).describe("How deep to traverse the tree (default: 3)"),
    },
    async ({ file_key, page_id, depth }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedKey = extractFileKey(file_key);

      try {
        const result = await auth.client.getFileNodes(resolvedKey, [page_id], depth);
        const nodeData = result.nodes[page_id];
        if (!nodeData) {
          return {
            content: [{ type: "text", text: `Page with ID "${page_id}" not found in this file.` }],
            isError: true,
          };
        }

        const tree = formatNodeTree(nodeData.document, 0, depth);

        return {
          content: [{
            type: "text",
            text: [
              `**Page: ${nodeData.document.name}**`,
              ``,
              tree,
              ``,
              `**Next steps:**`,
              `- To see details of a specific frame → \`figma_get_node\` with file key \`${resolvedKey}\` and node ID`,
              `- To convert a frame to HTML → \`figma_to_html\` with file key \`${resolvedKey}\` and node ID`,
              `- To convert the entire page → \`figma_to_html\` with node ID \`${page_id}\``,
            ].join("\n"),
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}

function formatNodeTree(node: FigmaNode, indent: number, maxDepth: number): string {
  const prefix = "  ".repeat(indent);
  const dims = node.absoluteBoundingBox
    ? ` (${Math.round(node.absoluteBoundingBox.width)}x${Math.round(node.absoluteBoundingBox.height)})`
    : "";
  const layout = node.layoutMode && node.layoutMode !== "NONE"
    ? ` [${node.layoutMode.toLowerCase()}]`
    : "";
  const line = `${prefix}- **${node.name}** \`${node.type}\` ID:\`${node.id}\`${dims}${layout}`;

  if (!node.children?.length || indent >= maxDepth) {
    return line;
  }

  const children = node.children
    .map((child) => formatNodeTree(child, indent + 1, maxDepth))
    .join("\n");

  return `${line}\n${children}`;
}
