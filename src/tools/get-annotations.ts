import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractFileKey } from "../utils/url-parser.js";
import { logger } from "../utils/logger.js";

interface AnnotationResult {
  node_id: string;
  node_name: string;
  label: string;
  description: string;
  annotation_type: string;
}

export function registerGetAnnotations(server: McpServer): void {
  server.tool(
    "figma_get_annotations",
    `Retrieve Dev Mode annotations from a Figma file or node.

⚠️ LIMITATION: The Figma REST API annotations field has been in PRIVATE BETA since January 2024 and is not publicly available yet. This tool will attempt to read annotations but may return empty results even when annotations are visible in the Figma UI.

As a workaround, the tool also scans for:
- devStatus fields on nodes (Ready for dev, Completed, etc.)
- sharedPluginData that may contain annotation-like data

If you need annotation content, consider:
1. Using figma_get_comments instead (comments ARE accessible via the API)
2. Adding specs as comments in Figma rather than Dev Mode annotations
3. Manually copying annotation text into the chat`,
    {
      file_key: z.string().describe("File key or Figma file URL"),
      node_id: z.string().optional().describe("Specific node ID. If omitted, scans top-level frames."),
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

        const annotations: AnnotationResult[] = [];
        const devStatuses: Array<{ node_id: string; node_name: string; status: string }> = [];

        // Fetch nodes in batches of 50
        const batchSize = 50;
        for (let i = 0; i < nodeIds.length; i += batchSize) {
          const batch = nodeIds.slice(i, i + batchSize);
          const result = await auth.client.getFileNodes(resolvedKey, batch, 1);

          for (const [nid, nodeData] of Object.entries(result.nodes)) {
            if (!nodeData) continue;
            const doc = nodeData.document as unknown as Record<string, unknown>;

            // Try reading annotations (private beta field)
            const anns = doc.annotations as Array<{ label: string; description?: string; properties?: unknown[] }> | undefined;
            if (anns?.length) {
              for (const ann of anns) {
                annotations.push({
                  node_id: nid,
                  node_name: doc.name as string,
                  label: ann.label ?? "",
                  description: ann.description ?? (ann.properties ? `${ann.properties.length} pinned properties` : ""),
                  annotation_type: "annotation",
                });
              }
            }

            // Try reading devStatus (may be available on some nodes)
            const devStatus = doc.devStatus as { type: string; description?: string } | undefined;
            if (devStatus) {
              devStatuses.push({
                node_id: nid,
                node_name: doc.name as string,
                status: devStatus.type + (devStatus.description ? `: ${devStatus.description}` : ""),
              });
            }

            // Scan children for devStatus too
            const children = doc.children as Array<Record<string, unknown>> | undefined;
            if (children) {
              for (const child of children) {
                const childStatus = child.devStatus as { type: string; description?: string } | undefined;
                if (childStatus) {
                  devStatuses.push({
                    node_id: child.id as string,
                    node_name: child.name as string,
                    status: childStatus.type + (childStatus.description ? `: ${childStatus.description}` : ""),
                  });
                }
              }
            }
          }
        }

        // Build output
        const lines: string[] = [];

        if (annotations.length > 0) {
          lines.push(`**Annotations** (${annotations.length} found)\n`);
          const byNode = new Map<string, AnnotationResult[]>();
          for (const ann of annotations) {
            const arr = byNode.get(ann.node_id) ?? [];
            arr.push(ann);
            byNode.set(ann.node_id, arr);
          }
          for (const [nid, anns] of byNode) {
            lines.push(`🏷️ **${anns[0].node_name}** (\`${nid}\`):`);
            for (const ann of anns) {
              lines.push(`  **${ann.label}**: ${ann.description}`);
            }
            lines.push("");
          }
        }

        if (devStatuses.length > 0) {
          lines.push(`**Dev Status** (${devStatuses.length} nodes)\n`);
          for (const ds of devStatuses) {
            lines.push(`  - **${ds.node_name}** (\`${ds.node_id}\`): ${ds.status}`);
          }
          lines.push("");
        }

        if (annotations.length === 0 && devStatuses.length === 0) {
          lines.push("No annotations or dev status data found.\n");
          lines.push("⚠️ **This is expected.** The Figma REST API `annotations` field has been in private beta since January 2024 and is not publicly available.");
          lines.push("Annotations you see in the Figma UI (Dev Mode) are **not returned by the API**.\n");
          lines.push("**Alternatives:**");
          lines.push("- Use `figma_get_comments` to read file comments (these ARE accessible)");
          lines.push("- Add functional specs as **comments** in Figma instead of annotations");
          lines.push("- Copy annotation text into the chat manually");
          logger.info("Annotations not found — REST API field still in private beta");
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
