import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FigmaAnnotatedNode } from "../api/types.js";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractFileKey } from "../utils/url-parser.js";
import { FigmaApiError } from "../api/figma-client.js";

export function registerGetAnnotations(server: McpServer): void {
  server.tool(
    "figma_get_annotations",
    `Retrieve Dev Mode annotations from a Figma file or node. Annotations contain development specs, design notes, and accessibility requirements added by designers in Dev Mode.

Requires a Figma paid plan (Professional/Organization/Enterprise) and a token with file_dev_resources:read scope.
If no node_id is provided, fetches the top-level page nodes to scan for annotations.`,
    {
      file_key: z.string().describe("File key or Figma file URL"),
      node_id: z.string().optional().describe("Specific node ID to get annotations for. If omitted, scans top-level page nodes."),
    },
    async ({ file_key, node_id }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedKey = extractFileKey(file_key);

      try {
        let nodeIds: string[];

        if (node_id) {
          nodeIds = [node_id];
        } else {
          // Get all pages, then their direct children
          const file = await auth.client.getFile(resolvedKey, { depth: 2 });
          const pages = file.document.children ?? [];
          nodeIds = [];
          for (const page of pages) {
            for (const child of page.children ?? []) {
              nodeIds.push(child.id);
            }
          }
          if (!nodeIds.length) {
            return {
              content: [{ type: "text", text: "No nodes found in this file." }],
            };
          }
        }

        // Fetch nodes in batches of 50 (Figma API limit for node IDs)
        const batchSize = 50;
        const allAnnotations: Array<{
          node_id: string;
          node_name: string;
          label: string;
          description: string;
          annotation_type: string;
        }> = [];

        for (let i = 0; i < nodeIds.length; i += batchSize) {
          const batch = nodeIds.slice(i, i + batchSize);
          const result = await auth.client.getFileNodes(resolvedKey, batch, 1);

          for (const [nid, nodeData] of Object.entries(result.nodes)) {
            if (!nodeData) continue;
            const doc = nodeData.document as FigmaAnnotatedNode["document"];
            const annotations = doc.annotations;
            if (!annotations?.length) continue;

            for (const ann of annotations) {
              allAnnotations.push({
                node_id: nid,
                node_name: doc.name,
                label: ann.label,
                description: ann.description,
                annotation_type: ann.annotation_type ?? "general",
              });
            }
          }
        }

        if (!allAnnotations.length) {
          return {
            content: [{
              type: "text",
              text: node_id
                ? `No annotations found on node \`${node_id}\`.`
                : "No Dev Mode annotations found in this file. Annotations require a Figma paid plan and the file_dev_resources:read token scope.",
            }],
          };
        }

        const lines: string[] = [];
        lines.push(`**Annotations** (${allAnnotations.length} found)\n`);

        // Group by node
        const byNode = new Map<string, typeof allAnnotations>();
        for (const ann of allAnnotations) {
          const key = ann.node_id;
          const arr = byNode.get(key) ?? [];
          arr.push(ann);
          byNode.set(key, arr);
        }

        for (const [nid, anns] of byNode) {
          const name = anns[0].node_name;
          lines.push(`🏷️ **${name}** (\`${nid}\`):`);
          for (const ann of anns) {
            lines.push(`  [${ann.annotation_type}] **${ann.label}**: ${ann.description}`);
          }
          lines.push("");
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        if (err instanceof FigmaApiError && err.status === 403) {
          return {
            content: [{
              type: "text",
              text: "Figma API error (403): Cannot access annotations. This requires:\n- A Figma paid plan (Professional/Organization/Enterprise)\n- A Personal Access Token with the `file_dev_resources:read` scope",
            }],
            isError: true,
          };
        }
        return formatApiError(err);
      }
    },
  );
}
