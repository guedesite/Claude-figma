import { getToken, NO_TOKEN_MESSAGE } from "../config/token-manager.js";
import { FigmaClient, FigmaApiError } from "../api/figma-client.js";

interface AuthResult {
  client: FigmaClient;
}

interface AuthError {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError: true;
}

/**
 * Get an authenticated Figma client, or return an error response if no token.
 */
export function getAuthenticatedClient(): AuthResult | AuthError {
  const token = getToken();
  if (!token) {
    return {
      content: [{ type: "text" as const, text: NO_TOKEN_MESSAGE }],
      isError: true as const,
    };
  }
  return { client: new FigmaClient(token) };
}

export function isAuthError(result: AuthResult | AuthError): result is AuthError {
  return "isError" in result;
}

/**
 * Format a Figma API error into an MCP tool error response.
 */
export function formatApiError(err: unknown) {
  if (err instanceof FigmaApiError) {
    let message = `Figma API error (${err.status})`;
    if (err.status === 403) {
      message += ": Access denied. Check that your token has the required permissions.";
    } else if (err.status === 404) {
      message += ": Resource not found. Check the file key, node ID, or project ID.";
    } else {
      message += `: ${err.body.slice(0, 300)}`;
    }
    return { content: [{ type: "text" as const, text: message }], isError: true as const };
  }
  const msg = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true as const };
}
