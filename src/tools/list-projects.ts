import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractTeamId } from "../utils/url-parser.js";

export function registerListProjects(server: McpServer): void {
  server.tool(
    "figma_list_projects",
    "List all projects in a Figma team. Accepts a team ID or a Figma team URL (e.g., https://www.figma.com/files/team/123456/TeamName).",
    { team_id: z.string().describe("Team ID or Figma team URL") },
    async ({ team_id }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedId = extractTeamId(team_id);

      try {
        const result = await auth.client.getTeamProjects(resolvedId);
        if (!result.projects.length) {
          return {
            content: [{ type: "text", text: "No projects found in this team." }],
          };
        }

        const list = result.projects
          .map((p, i) => `  ${i + 1}. **${p.name}** (project ID: \`${p.id}\`)`)
          .join("\n");

        return {
          content: [{
            type: "text",
            text: [
              `**Team Projects** (${result.projects.length} found)`,
              ``,
              list,
              ``,
              `Which project do you want to explore? Use \`figma_list_files\` with the project ID.`,
            ].join("\n"),
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
