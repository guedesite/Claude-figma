import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import path from "node:path";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { convertNodeToHtml, collectVectorNodeIds } from "../converter/index.js";
import { extractFileKey, parseFigmaUrl } from "../utils/url-parser.js";
import { downloadSvgs, collectNodeNames } from "../utils/svg-downloader.js";
import { logger } from "../utils/logger.js";

export function registerFigmaToHtml(server: McpServer): void {
  server.tool(
    "figma_to_html",
    `Convert a Figma frame/page to HTML + CSS with local SVG export. This is the core design-to-code tool.

WORKFLOW when the user wants to implement a design:
1. Call this tool with output_dir set to the project's assets folder (e.g., "./src/assets" or "./public/assets")
2. Read the project's existing components BEFORE writing any code
3. Use the HTML output as a structural reference — extract colors, spacing, typography values
4. Create or update components in the project's framework (React, Vue, etc.) — NEVER paste raw HTML
5. Reuse existing layout/sidebar/header components — only implement what's new`,
    {
      file_key: z.string().describe("File key or Figma file URL"),
      node_id: z.string().describe("Node ID of the frame/page to convert (e.g., '123:456')."),
      output_dir: z.string().optional()
        .describe("Directory to save SVG assets (e.g., './src/assets'). An 'icons/' subfolder will be created. If omitted, SVGs use temporary remote URLs."),
      include_style_tag: z.boolean().optional().default(true)
        .describe("If true, emit a <style> block with CSS classes. If false, use inline styles."),
      max_depth: z.number().optional().default(50)
        .describe("Maximum nesting depth (default: 50)"),
    },
    async ({ file_key, node_id, output_dir, include_style_tag, max_depth }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      let resolvedKey = extractFileKey(file_key);
      let resolvedNodeId = node_id;

      const parsed = parseFigmaUrl(file_key);
      if (parsed?.nodeId && (!node_id || node_id === "")) {
        resolvedNodeId = parsed.nodeId;
      }

      try {
        const result = await auth.client.getFileNodes(resolvedKey, [resolvedNodeId]);
        const nodeData = result.nodes[resolvedNodeId];
        if (!nodeData) {
          return {
            content: [{ type: "text", text: `Node with ID "${resolvedNodeId}" not found in file "${resolvedKey}".` }],
            isError: true,
          };
        }

        // Collect vector/icon node IDs for SVG export
        let svgMap: Record<string, string | null> = {};
        const vectorIds = collectVectorNodeIds(nodeData.document);

        if (vectorIds.length > 0) {
          logger.info(`Found ${vectorIds.length} vector/icon node(s) to export as SVG`);

          // Get SVG URLs from Figma API
          const batchSize = 500;
          let remoteUrls: Record<string, string | null> = {};
          try {
            for (let i = 0; i < vectorIds.length; i += batchSize) {
              const batch = vectorIds.slice(i, i + batchSize);
              const images = await auth.client.getImages(resolvedKey, batch, "svg");
              Object.assign(remoteUrls, images);
            }
          } catch (err) {
            logger.warn("SVG export API call failed:", err);
          }

          if (output_dir) {
            // Download SVGs to local files
            const assetsDir = path.resolve(output_dir, "icons");
            const nodeNames = collectNodeNames(nodeData.document, new Set(vectorIds));
            svgMap = await downloadSvgs(remoteUrls, nodeNames, assetsDir);

            // Make paths relative to output_dir
            const relativeBase = path.basename(output_dir);
            for (const [id, localPath] of Object.entries(svgMap)) {
              if (localPath) {
                // localPath is like "icons/my-icon.svg"
                svgMap[id] = localPath;
              }
            }
          } else {
            // Use remote URLs directly (temporary)
            svgMap = remoteUrls;
          }

          const found = Object.values(svgMap).filter(Boolean).length;
          logger.info(`${found}/${vectorIds.length} SVG(s) ready`);
        }

        const html = convertNodeToHtml(nodeData.document, {
          includeStyleTag: include_style_tag,
          maxDepth: max_depth,
          svgMap,
        });

        const svgInfo = output_dir && vectorIds.length > 0
          ? `\n\nSVG icons saved to \`${path.resolve(output_dir, "icons")}\` (${Object.values(svgMap).filter(Boolean).length} files). Referenced with relative paths in the HTML.`
          : "";

        return {
          content: [{
            type: "text",
            text: [
              `**HTML conversion of "${nodeData.document.name}"** (${nodeData.document.type}, ${resolvedNodeId})`,
              ``,
              "```html",
              html,
              "```",
              svgInfo,
              ``,
              `## Implementation rules (for Claude)`,
              `This HTML is a STRUCTURAL REFERENCE. Follow these rules:`,
              `1. **Read the existing codebase first** — search for existing components (sidebar, header, layout, buttons) before creating anything new.`,
              `2. **Don't replace existing code** — only create or modify components that are new or changed. If a sidebar/header already exists, reuse it.`,
              `3. **Detect what this design represents:**`,
              `   - Full page with sidebar/header → implement only the CONTENT area (layout already exists)`,
              `   - Modal/dialog/overlay → implement as a modal component`,
              `   - Component variant → update the existing component`,
              `4. **Adapt to the project's framework** — use React/Vue/Svelte/etc. patterns, not raw HTML. Use the project's existing CSS approach (Tailwind, CSS modules, etc.).`,
              `5. **Extract reusable patterns** — repeated buttons → Button component with props, repeated cards → Card component, etc.`,
              `6. **Use the CSS values** (colors, spacing, font sizes, border-radius) from the HTML as design tokens, not the HTML structure itself.`,
            ].join("\n"),
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
