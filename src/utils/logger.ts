/**
 * Logger that writes exclusively to stderr.
 * CRITICAL: Never use console.log in an MCP STDIO server — it corrupts the JSON-RPC transport.
 */
export const logger = {
  info: (...args: unknown[]) => console.error("[INFO]", ...args),
  warn: (...args: unknown[]) => console.error("[WARN]", ...args),
  error: (...args: unknown[]) => console.error("[ERROR]", ...args),
  debug: (...args: unknown[]) => {
    if (process.env.DEBUG) console.error("[DEBUG]", ...args);
  },
};
