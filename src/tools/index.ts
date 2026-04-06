import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSetToken } from "./set-token.js";
import { registerTestConnection } from "./test-connection.js";
import { registerBrowse } from "./browse.js";
import { registerListProjects } from "./list-projects.js";
import { registerListFiles } from "./list-files.js";
import { registerGetFileInfo } from "./get-file-info.js";
import { registerGetPage } from "./get-page.js";
import { registerGetNode } from "./get-node.js";
import { registerFigmaToHtml } from "./figma-to-html.js";

/**
 * Register all Figma MCP tools on the server.
 */
export function registerAllTools(server: McpServer): void {
  registerSetToken(server);
  registerTestConnection(server);
  registerBrowse(server);
  registerListProjects(server);
  registerListFiles(server);
  registerGetFileInfo(server);
  registerGetPage(server);
  registerGetNode(server);
  registerFigmaToHtml(server);
}
