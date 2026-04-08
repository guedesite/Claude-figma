import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractProjectId } from "../utils/url-parser.js";

export function registerListFiles(server: McpServer): void {
  server.tool(
    "figma_list_files",
    `List files in a Figma project. Only use when you have a project ID (from figma_list_projects). Present results as a numbered list.`,
    { project_id: z.string().describe("Project ID or Figma project URL") },
    async ({ project_id }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedId = extractProjectId(project_id);

      try {
        const result = await auth.client.getProjectFiles(resolvedId);
        if (!result.files.length) {
          return {
            content: [{ type: "text", text: "No files found in this project." }],
          };
        }

        const list = result.files
          .map((f, i) => `  ${i + 1}. **${f.name}** (key: \`${f.key}\`) — modified: ${f.last_modified}`)
          .join("\n");

        return {
          content: [{
            type: "text",
            text: [
              `**Project Files** (${result.files.length} found)`,
              ``,
              list,
              ``,
              `Which file do you want to open? Use \`figma_get_file_info\` with the file key, or \`figma_to_html\` to convert directly.`,
            ].join("\n"),
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
