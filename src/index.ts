#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { logger } from "./utils/logger.js";

async function main() {
  logger.info("Starting Figma MCP Server v1.0.0");

  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  logger.info("Figma MCP Server connected via STDIO");
}

main().catch((err) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
