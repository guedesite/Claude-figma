import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractFileKey } from "../utils/url-parser.js";
import { invalidateCommentsCache } from "../utils/comments-cache.js";

export function registerPostComment(server: McpServer): void {
  server.tool(
    "figma_post_comment",
    `Post a comment on a Figma file or a specific node. Can also reply to an existing comment thread.

Requires a token with file_comments:write scope. Useful for automated feedback on designs.`,
    {
      file_key: z.string().describe("File key or Figma file URL"),
      message: z.string().describe("Comment text (supports @mentions)"),
      node_id: z.string().optional().describe("Attach comment to a specific node ID"),
      parent_id: z.string().optional().describe("Reply to an existing comment by its ID"),
    },
    async ({ file_key, message, node_id, parent_id }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedKey = extractFileKey(file_key);

      try {
        const comment = await auth.client.postComment(resolvedKey, message, {
          node_id,
          parent_id,
        });

        // Invalidate cache since comments changed
        invalidateCommentsCache(resolvedKey);

        const target = parent_id
          ? `reply to comment ${parent_id}`
          : node_id
            ? `comment on node \`${node_id}\``
            : "comment on canvas";

        return {
          content: [{
            type: "text",
            text: `✅ Posted ${target} (comment ID: \`${comment.id}\`)\n\n> ${message}`,
          }],
        };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}
