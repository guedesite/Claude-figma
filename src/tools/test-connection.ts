import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";

export function registerTestConnection(server: McpServer): void {
  server.tool(
    "test_connection",
    `Check the Figma connection. Call this FIRST when the user mentions Figma.

If no token: ask the user to paste their Figma Personal Access Token (from https://www.figma.com/developers/api#access-tokens), then call set_token.
If connected: immediately call figma_browse to start navigating. Do NOT ask the user what they want to do — just show them their recent files or ask for a URL.`,
    {},
    async () => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      try {
        const user = await auth.client.getMe();
        return {
          content: [{
            type: "text",
            text: `Connected as ${user.handle} (${user.email}).`,
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
