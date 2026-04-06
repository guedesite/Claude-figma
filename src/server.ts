import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAllTools } from "./tools/index.js";

/**
 * Create and configure the Figma MCP server with all tools registered.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    {
      name: "figma-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  registerAllTools(server);

  return server;
}
