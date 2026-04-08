import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setToken } from "../config/token-manager.js";
import { FigmaClient } from "../api/figma-client.js";

export function registerSetToken(server: McpServer): void {
  server.tool(
    "set_token",
    `Save the user's Figma token. Call this when the user pastes a token (starts with "figd_").

After saving, immediately call figma_browse to show their files. Do NOT ask "what do you want to do" — just start navigating.`,
    { token: z.string().min(1).describe("Figma Personal Access Token") },
    async ({ token }) => {
      setToken(token);

      try {
        const client = new FigmaClient(token);
        const user = await client.getMe();
        return {
          content: [{
            type: "text",
            text: `Token saved. Connected as ${user.handle} (${user.email}).`,
          }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{
            type: "text",
            text: `Token saved but verification failed: ${msg}. Check that the token is valid.`,
          }],
          isError: true,
        };
      }
    },
  );
}
