import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FigmaComment } from "../api/types.js";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractFileKey } from "../utils/url-parser.js";
import { getCachedComments, setCachedComments } from "../utils/comments-cache.js";

export function registerGetNodeComments(server: McpServer): void {
  server.tool(
    "figma_get_node_comments",
    `Retrieve comments attached to a specific Figma node. Filters all file comments by node ID and includes full threads (replies).

Use this to get functional specs or design notes for a specific element before implementing it.`,
    {
      file_key: z.string().describe("File key or Figma file URL"),
      node_id: z.string().describe("Node ID to filter comments for (e.g., '240:188')"),
    },
    async ({ file_key, node_id }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedKey = extractFileKey(file_key);

      try {
        let commentsResponse = getCachedComments(resolvedKey);
        if (!commentsResponse) {
          commentsResponse = await auth.client.getComments(resolvedKey);
          setCachedComments(resolvedKey, commentsResponse);
        }

        const allComments = commentsResponse.comments;

        // Find root comments attached to this node
        const nodeRoots = allComments.filter(
          (c) =>
            (!c.parent_id || c.parent_id === "") &&
            c.client_meta?.node_id === node_id,
        );

        if (!nodeRoots.length) {
          return {
            content: [{
              type: "text",
              text: `No comments found on node \`${node_id}\`.`,
            }],
          };
        }

        // Collect root IDs to find replies
        const rootIds = new Set(nodeRoots.map((c) => c.id));
        const replies = allComments.filter((c) => c.parent_id && rootIds.has(c.parent_id));

        const replyMap = new Map<string, FigmaComment[]>();
        for (const reply of replies) {
          const arr = replyMap.get(reply.parent_id) ?? [];
          arr.push(reply);
          replyMap.set(reply.parent_id, arr);
        }

        const lines: string[] = [];
        lines.push(`**Comments on node \`${node_id}\`** (${nodeRoots.length} threads)\n`);

        for (const comment of nodeRoots) {
          lines.push(`💬 **@${comment.user.handle}** (${formatDate(comment.created_at)}):`);
          lines.push(`> ${comment.message}`);

          const threadReplies = replyMap.get(comment.id) ?? [];
          for (const reply of threadReplies) {
            lines.push(`  ↳ **@${reply.user.handle}** (${formatDate(reply.created_at)}):`);
            lines.push(`  > ${reply.message}`);
          }

          if (comment.resolved_at) {
            lines.push(`✅ Resolved ${formatDate(comment.resolved_at)}`);
          }
          lines.push("");
        }

        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().split("T")[0];
}
