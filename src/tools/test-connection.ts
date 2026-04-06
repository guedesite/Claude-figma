import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";

export function registerTestConnection(server: McpServer): void {
  server.tool(
    "test_connection",
    "Test the connection to Figma. Checks if a token is configured and verifies it by calling the Figma API.",
    {},
    async () => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      try {
        const user = await auth.client.getMe();
        return {
          content: [{
            type: "text",
            text: `Connected to Figma successfully!\n\nUser: ${user.handle}\nEmail: ${user.email}\n\nYou can now use the Figma tools to browse files and convert designs.`,
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
