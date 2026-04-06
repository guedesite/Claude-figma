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
    `Convert a Figma frame or page to clean HTML + CSS. This is the core tool for implementing Figma designs in code.

Icons and vectors are automatically exported as SVG files into an assets/ folder next to the output, and referenced with relative paths.

If output_dir is provided, the SVG files are saved there. Otherwise, SVGs use remote Figma CDN URLs (temporary, will expire).`,
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
              ``,
              `Use this HTML/CSS as a reference to implement the interface.${svgInfo}`,
            ].join("\n"),
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
