import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { setToken } from "../config/token-manager.js";
import { FigmaClient } from "../api/figma-client.js";

export function registerSetToken(server: McpServer): void {
  server.tool(
    "set_token",
    "Save your Figma Personal Access Token and verify it works. The token is stored locally in ~/.figma-mcp-config.json.",
    { token: z.string().min(1).describe("Your Figma Personal Access Token (starts with 'figd_')") },
    async ({ token }) => {
      setToken(token);

      // Verify immediately
      try {
        const client = new FigmaClient(token);
        const user = await client.getMe();
        return {
          content: [{
            type: "text",
            text: `Token saved and verified successfully!\n\nConnected as: ${user.handle} (${user.email})\nYou can now browse your Figma files and convert designs to HTML.`,
          }],
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{
            type: "text",
            text: `Token saved, but verification failed: ${msg}\n\nPlease check that your token is valid and try again.`,
          }],
          isError: true,
        };
      }
    },
  );
}
