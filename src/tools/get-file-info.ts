import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractFileKey } from "../utils/url-parser.js";
import { recordFileAccess } from "../config/token-manager.js";

export function registerGetFileInfo(server: McpServer): void {
  server.tool(
    "figma_get_file_info",
    "Get metadata and page list for a Figma file. Accepts a file key or any Figma file/design URL.",
    {
      file_key: z.string().describe("File key or Figma URL (e.g., 'ABC123' or 'https://www.figma.com/file/ABC123/...')"),
    },
    async ({ file_key }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedKey = extractFileKey(file_key);

      try {
        const file = await auth.client.getFile(resolvedKey, { depth: 1 });
        recordFileAccess(resolvedKey, file.name, file.document.children?.length);

        const pages = file.document.children ?? [];
        const pageList = pages
          .map((p, i) => `  ${i + 1}. **${p.name}** (ID: \`${p.id}\`)`)
          .join("\n");

        const componentCount = Object.keys(file.components).length;
        const styleCount = Object.keys(file.styles).length;

        return {
          content: [{
            type: "text",
            text: [
              `**${file.name}** (key: \`${resolvedKey}\`)`,
              `Last modified: ${file.lastModified}`,
              `Components: ${componentCount} | Styles: ${styleCount}`,
              ``,
              `**Pages (${pages.length}):**`,
              pageList,
              ``,
              `What do you want to do?`,
              `- **Explore a page** → \`figma_get_page\` with file key \`${resolvedKey}\` and a page ID`,
              `- **Convert to HTML** → \`figma_to_html\` with file key \`${resolvedKey}\` and a page/frame node ID`,
              `- **Node details** → \`figma_get_node\` for any specific node`,
            ].join("\n"),
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
