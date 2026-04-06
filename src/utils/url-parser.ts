/**
 * Parse any Figma URL and extract relevant IDs.
 *
 * Supported URL formats:
 *   https://www.figma.com/files/team/123456/TeamName        → teamId
 *   https://www.figma.com/files/project/789/ProjectName     → projectId
 *   https://www.figma.com/file/ABC123/FileName              → fileKey
 *   https://www.figma.com/design/ABC123/FileName            → fileKey
 *   https://www.figma.com/file/ABC123/Name?node-id=1-2      → fileKey + nodeId
 *   https://www.figma.com/design/ABC123/Name?node-id=1-2    → fileKey + nodeId
 *   https://www.figma.com/proto/ABC123/Name                 → fileKey (prototype)
 *   https://www.figma.com/board/ABC123/Name                 → fileKey (FigJam)
 */

export interface FigmaUrlInfo {
  type: "team" | "project" | "file" | "unknown";
  teamId?: string;
  projectId?: string;
  fileKey?: string;
  nodeId?: string;
  rawUrl: string;
}

export function parseFigmaUrl(input: string): FigmaUrlInfo | null {
  const trimmed = input.trim();

  // Check if it's a URL at all
  if (!trimmed.includes("figma.com")) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  // segments: e.g. ["files", "team", "123456", "TeamName"]
  //           or   ["file", "ABC123", "FileName"]
  //           or   ["design", "ABC123", "FileName"]

  const result: FigmaUrlInfo = { type: "unknown", rawUrl: trimmed };

  // Team URL: /files/team/:teamId/...
  if (segments[0] === "files" && segments[1] === "team" && segments[2]) {
    result.type = "team";
    result.teamId = segments[2];
    return result;
  }

  // Project URL: /files/project/:projectId/...
  if (segments[0] === "files" && segments[1] === "project" && segments[2]) {
    result.type = "project";
    result.projectId = segments[2];
    return result;
  }

  // File URL: /file/:key/... or /design/:key/... or /proto/:key/... or /board/:key/...
  if (["file", "design", "proto", "board"].includes(segments[0]) && segments[1]) {
    result.type = "file";
    result.fileKey = segments[1];

    // Extract node-id from query params
    const nodeIdParam = url.searchParams.get("node-id");
    if (nodeIdParam) {
      // Figma URLs use "1-2" format, API uses "1:2" format
      result.nodeId = nodeIdParam.replace(/-/g, ":");
    }

    return result;
  }

  return result;
}

/**
 * Try to interpret user input as either a Figma URL or a raw ID.
 * Returns the extracted value or the raw input as-is.
 */
export function extractFileKey(input: string): string {
  const parsed = parseFigmaUrl(input);
  if (parsed?.fileKey) return parsed.fileKey;
  // If not a URL, treat as raw file key
  return input.trim();
}

export function extractTeamId(input: string): string {
  const parsed = parseFigmaUrl(input);
  if (parsed?.teamId) return parsed.teamId;
  return input.trim();
}

export function extractProjectId(input: string): string {
  const parsed = parseFigmaUrl(input);
  if (parsed?.projectId) return parsed.projectId;
  return input.trim();
}
