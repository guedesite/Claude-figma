import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractFileKey } from "../utils/url-parser.js";
import { invalidateCommentsCache } from "../utils/comments-cache.js";

export function registerResolveComment(server: McpServer): void {
  server.tool(
    "figma_resolve_comment",
    `Delete a comment from a Figma file.

Note: The Figma REST API v1 supports deleting comments (not resolving them in-place). This removes the comment thread entirely.
Requires a token with file_comments:write scope.`,
    {
      file_key: z.string().describe("File key or Figma file URL"),
      comment_id: z.string().describe("ID of the comment to delete"),
    },
    async ({ file_key, comment_id }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedKey = extractFileKey(file_key);

      try {
        await auth.client.resolveComment(resolvedKey, comment_id);

        // Invalidate cache since comments changed
        invalidateCommentsCache(resolvedKey);

        return {
          content: [{
            type: "text",
            text: `✅ Comment \`${comment_id}\` deleted from file \`${resolvedKey}\`.`,
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
