import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "../utils/logger.js";

const CONFIG_FILENAME = ".figma-mcp-config.json";

function getConfigPath(): string {
  return path.join(os.homedir(), CONFIG_FILENAME);
}

export interface FileHistoryEntry {
  key: string;
  name: string;
  lastAccessed: string;
  pageCount?: number;
}

interface ConfigFile {
  figmaToken?: string;
  fileHistory?: FileHistoryEntry[];
}

function readConfigFile(): ConfigFile {
  try {
    const content = fs.readFileSync(getConfigPath(), "utf-8");
    return JSON.parse(content) as ConfigFile;
  } catch {
    return {};
  }
}

function writeConfigFile(config: ConfigFile): void {
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  try {
    fs.chmodSync(configPath, 0o600);
  } catch {
    // chmod may not work on Windows
  }
}

/**
 * Get the Figma token.
 * Priority: 1) FIGMA_TOKEN env var  2) ~/.figma-mcp-config.json
 */
export function getToken(): string | null {
  const envToken = process.env.FIGMA_TOKEN;
  if (envToken) return envToken;

  const config = readConfigFile();
  return config.figmaToken ?? null;
}

/**
 * Save the Figma token to ~/.figma-mcp-config.json
 */
export function setToken(token: string): void {
  const config = readConfigFile();
  config.figmaToken = token;
  writeConfigFile(config);
}

/**
 * Check if a token is available (env or config file).
 */
export function hasToken(): boolean {
  return getToken() !== null;
}

// ─── File History ───

/**
 * Record a file access in the history.
 * Keeps the 50 most recent files.
 */
export function recordFileAccess(key: string, name: string, pageCount?: number): void {
  const config = readConfigFile();
  const history = config.fileHistory ?? [];

  // Remove existing entry for this key
  const filtered = history.filter((e) => e.key !== key);

  // Add at the top
  filtered.unshift({
    key,
    name,
    lastAccessed: new Date().toISOString(),
    pageCount,
  });

  // Keep max 50
  config.fileHistory = filtered.slice(0, 50);
  writeConfigFile(config);
}

/**
 * Get the file history (most recent first).
 */
export function getFileHistory(): FileHistoryEntry[] {
  const config = readConfigFile();
  return config.fileHistory ?? [];
}

/**
 * Search file history by name (case-insensitive partial match).
 */
export function searchFileHistory(query: string): FileHistoryEntry[] {
  const history = getFileHistory();
  const lower = query.toLowerCase();
  return history.filter((e) =>
    e.name.toLowerCase().includes(lower) ||
    e.key.toLowerCase().includes(lower),
  );
}

/**
 * Message to display when no token is configured.
 */
export const NO_TOKEN_MESSAGE = `No Figma token configured.

To connect to Figma, you need a Personal Access Token:

1. Go to https://www.figma.com/developers/api#access-tokens
2. Click "Create a new personal access token"
3. Copy the generated token (starts with "figd_")

Then provide it by typing your token in the chat, and I'll save it for you using the set_token tool.

Alternatively, you can set the FIGMA_TOKEN environment variable in your MCP server configuration.`;
