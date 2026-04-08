import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FigmaComment } from "../api/types.js";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { extractFileKey } from "../utils/url-parser.js";
import { getCachedComments, setCachedComments } from "../utils/comments-cache.js";

export function registerGetComments(server: McpServer): void {
  server.tool(
    "figma_get_comments",
    `Retrieve all comments from a Figma file. Shows comment threads, authors, attached nodes, and resolution status.

Use this to understand functional specs, design notes, and feedback attached to a Figma file before implementing.
Returns comments grouped by thread with node attachments.`,
    {
      file_key: z.string().describe("File key or Figma file URL"),
      as_md: z.boolean().optional().default(true).describe("Format output as Markdown (default: true)"),
    },
    async ({ file_key, as_md }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      const resolvedKey = extractFileKey(file_key);

      try {
        let commentsResponse = getCachedComments(resolvedKey);
        if (!commentsResponse) {
          commentsResponse = await auth.client.getComments(resolvedKey);
          setCachedComments(resolvedKey, commentsResponse);
        }

        const comments = commentsResponse.comments;
        if (!comments.length) {
          return {
            content: [{ type: "text", text: "No comments found in this file." }],
          };
        }

        const text = as_md
          ? formatCommentsMarkdown(comments)
          : JSON.stringify(comments, null, 2);

        return { content: [{ type: "text", text }] };
      } catch (err) {
        return formatApiError(err);
      }
    },
  );
}

function formatCommentsMarkdown(comments: FigmaComment[]): string {
  const rootComments = comments.filter((c) => !c.parent_id || c.parent_id === "");
  const replies = comments.filter((c) => c.parent_id && c.parent_id !== "");

  const resolved = rootComments.filter((c) => c.resolved_at);
  const total = rootComments.length;

  const lines: string[] = [];
  lines.push(`**Comments** (${total} threads, ${resolved.length} resolved)\n`);

  // Group replies by parent
  const replyMap = new Map<string, FigmaComment[]>();
  for (const reply of replies) {
    const arr = replyMap.get(reply.parent_id) ?? [];
    arr.push(reply);
    replyMap.set(reply.parent_id, arr);
  }

  for (const comment of rootComments) {
    const nodeInfo = comment.client_meta?.node_id
      ? `On node \`${comment.client_meta.node_id}\``
      : "On canvas (no node)";

    lines.push(`---`);
    lines.push(`📍 ${nodeInfo}`);
    lines.push(`  💬 **@${comment.user.handle}** (${formatDate(comment.created_at)}):`);
    lines.push(`  > ${comment.message}`);

    // Replies
    const threadReplies = replyMap.get(comment.id) ?? [];
    for (const reply of threadReplies) {
      lines.push(`  ↳ **@${reply.user.handle}** (${formatDate(reply.created_at)}):`);
      lines.push(`  > ${reply.message}`);
    }

    if (comment.resolved_at) {
      lines.push(`  ✅ Resolved ${formatDate(comment.resolved_at)}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

function formatDate(iso: string): string {
  return new Date(iso).toISOString().split("T")[0];
}
