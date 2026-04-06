import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getAuthenticatedClient, isAuthError, formatApiError } from "./helpers.js";
import { parseFigmaUrl } from "../utils/url-parser.js";
import {
  getFileHistory,
  searchFileHistory,
  recordFileAccess,
} from "../config/token-manager.js";

export function registerBrowse(server: McpServer): void {
  server.tool(
    "figma_browse",
    `Navigate your Figma workspace interactively. This is the main entry point.

You can provide:
- A Figma URL (any figma.com URL — file, team, project, prototype)
- A file name (searches in previously accessed files)
- A file key, team ID, or project ID
- Nothing — to see recent files and navigation options

This tool remembers previously accessed files, so users can refer to them by name.`,
    {
      input: z.string().optional().describe(
        "A Figma URL, file name, file key, team ID, project ID, or empty for recent files",
      ),
    },
    async ({ input }) => {
      const auth = getAuthenticatedClient();
      if (isAuthError(auth)) return auth;

      // No input → show recent files + navigation menu
      if (!input || input.trim() === "") {
        return showNavigationMenu();
      }

      const trimmed = input.trim();

      // 1. Try as Figma URL
      const parsed = parseFigmaUrl(trimmed);
      if (parsed && parsed.type !== "unknown") {
        return await navigateFromUrl(parsed, auth.client);
      }

      // 2. Search in file history by name
      const historyMatches = searchFileHistory(trimmed);
      if (historyMatches.length === 1) {
        // Exact single match → navigate directly
        try {
          const file = await auth.client.getFile(historyMatches[0].key, { depth: 1 });
          recordFileAccess(historyMatches[0].key, file.name, file.document.children?.length);
          return formatFileInfo(file, historyMatches[0].key);
        } catch {
          // File may have been deleted or token changed
        }
      } else if (historyMatches.length > 1) {
        // Multiple matches → show choices
        const list = historyMatches
          .map((f, i) => `  ${i + 1}. **${f.name}** (key: \`${f.key}\`) — last used: ${new Date(f.lastAccessed).toLocaleDateString()}`)
          .join("\n");
        return {
          content: [{
            type: "text" as const,
            text: [
              `Found ${historyMatches.length} files matching "${trimmed}":`,
              ``,
              list,
              ``,
              `Which one do you want? Give me the number or paste the exact URL.`,
            ].join("\n"),
          }],
        };
      }

      // 3. Try as file key
      try {
        const file = await auth.client.getFile(trimmed, { depth: 1 });
        recordFileAccess(trimmed, file.name, file.document.children?.length);
        return formatFileInfo(file, trimmed);
      } catch {
        // Not a file key
      }

      // 4. Try as team ID
      try {
        const result = await auth.client.getTeamProjects(trimmed);
        return formatProjects(result.projects, trimmed);
      } catch {
        // Not a team ID
      }

      // 5. Try as project ID
      try {
        const result = await auth.client.getProjectFiles(trimmed);
        return formatFiles(result.files, trimmed);
      } catch {
        // Nothing worked
      }

      // 6. Nothing found — show helpful message
      const history = getFileHistory();
      let suggestion = "";
      if (history.length > 0) {
        const recent = history.slice(0, 5)
          .map((f) => `  - **${f.name}** (key: \`${f.key}\`)`)
          .join("\n");
        suggestion = `\n\n**Your recent files:**\n${recent}\n\nDid you mean one of these?`;
      }

      return {
        content: [{
          type: "text" as const,
          text: [
            `Could not find "${trimmed}" — it's not a known file name, file key, URL, or team/project ID.`,
            ``,
            `You can:`,
            `- Paste a Figma URL from your browser`,
            `- Give me the exact file name`,
            `- Provide a file key (from the Figma URL)`,
            suggestion,
          ].join("\n"),
        }],
      };
    },
  );
}

function showNavigationMenu() {
  const history = getFileHistory();
  const recentSection = history.length > 0
    ? [
        `**Recent files / Fichiers recents:**`,
        ...history.slice(0, 10).map(
          (f, i) => `  ${i + 1}. **${f.name}** (key: \`${f.key}\`${f.pageCount ? `, ${f.pageCount} pages` : ""})`,
        ),
        ``,
        `You can open a recent file by name or number.`,
        ``,
      ]
    : [];

  return {
    content: [{
      type: "text" as const,
      text: [
        `**Figma Navigation**`,
        ``,
        ...recentSection,
        `**Other options:**`,
        `- **Paste a Figma URL** — any URL from figma.com (file, design, prototype, team, project)`,
        `- **Search by name** — type a file name to search in your recent files`,
        `- **Browse by team** — give me a team URL: \`figma.com/files/team/TEAM_ID/...\``,
        ``,
        `What would you like to do?`,
      ].join("\n"),
    }],
  };
}

async function navigateFromUrl(
  parsed: ReturnType<typeof parseFigmaUrl> & {},
  client: import("../api/figma-client.js").FigmaClient,
) {
  try {
    switch (parsed.type) {
      case "team": {
        const result = await client.getTeamProjects(parsed.teamId!);
        return formatProjects(result.projects, parsed.teamId!);
      }
      case "project": {
        const result = await client.getProjectFiles(parsed.projectId!);
        return formatFiles(result.files, parsed.projectId!);
      }
      case "file": {
        const file = await client.getFile(parsed.fileKey!, { depth: 1 });
        recordFileAccess(parsed.fileKey!, file.name, file.document.children?.length);
        let response = formatFileInfo(file, parsed.fileKey!);

        if (parsed.nodeId) {
          response.content[0].text += `\n\n**Note:** Your URL points to node \`${parsed.nodeId}\`. You can use \`figma_get_node\` or \`figma_to_html\` with this node ID directly.`;
        }
        return response;
      }
      default:
        return showNavigationMenu();
    }
  } catch (err) {
    return formatApiError(err);
  }
}

function formatProjects(
  projects: Array<{ id: string; name: string }>,
  teamId: string,
) {
  if (!projects.length) {
    return { content: [{ type: "text" as const, text: `No projects found for team ${teamId}.` }] };
  }
  const list = projects
    .map((p, i) => `  ${i + 1}. **${p.name}** (project ID: \`${p.id}\`)`)
    .join("\n");
  return {
    content: [{
      type: "text" as const,
      text: `**Team Projects** (${projects.length})\n\n${list}\n\nWhich project? Give me the number, name, or ID.`,
    }],
  };
}

function formatFiles(
  files: Array<{ key: string; name: string; last_modified: string; thumbnail_url: string }>,
  projectId: string,
) {
  if (!files.length) {
    return { content: [{ type: "text" as const, text: `No files found in project ${projectId}.` }] };
  }
  const list = files
    .map((f, i) => `  ${i + 1}. **${f.name}** (key: \`${f.key}\`) — ${f.last_modified}`)
    .join("\n");
  return {
    content: [{
      type: "text" as const,
      text: `**Project Files** (${files.length})\n\n${list}\n\nWhich file? Give me the number, name, or key.`,
    }],
  };
}

function formatFileInfo(
  file: import("../api/types.js").FigmaFileResponse,
  fileKey: string,
) {
  const pages = file.document.children ?? [];
  const pageList = pages
    .map((p, i) => `  ${i + 1}. **${p.name}** (ID: \`${p.id}\`)`)
    .join("\n");

  const componentCount = Object.keys(file.components).length;
  const styleCount = Object.keys(file.styles).length;

  return {
    content: [{
      type: "text" as const,
      text: [
        `**${file.name}** (key: \`${fileKey}\`)`,
        `Last modified: ${file.lastModified}`,
        `Components: ${componentCount} | Styles: ${styleCount}`,
        ``,
        `**Pages (${pages.length}):**`,
        pageList,
        ``,
        `What do you want to do?`,
        `- **Explore**: give me a page number/name → \`figma_get_page\``,
        `- **Convert to HTML**: give me a page number/name → \`figma_to_html\``,
        `- **Node details**: \`figma_get_node\` for any specific element`,
      ].join("\n"),
    }],
  };
}
