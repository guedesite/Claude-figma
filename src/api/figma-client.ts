import { logger } from "../utils/logger.js";
import type {
  FigmaUser,
  FigmaFileResponse,
  FigmaFileNodesResponse,
  FigmaTeamProjectsResponse,
  FigmaProjectFilesResponse,
} from "./types.js";

export class FigmaApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Figma API error ${status}: ${body}`);
    this.name = "FigmaApiError";
  }
}

export class FigmaClient {
  private baseUrl = "https://api.figma.com";

  constructor(private token: string) {}

  private async request<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }

    logger.debug(`Figma API: GET ${url.pathname}${url.search}`);

    const res = await fetch(url.toString(), {
      headers: { "X-Figma-Token": this.token },
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error(`Figma API error: ${res.status} ${body.slice(0, 200)}`);
      throw new FigmaApiError(res.status, body);
    }

    return (await res.json()) as T;
  }

  /** Get the authenticated user's info. */
  async getMe(): Promise<FigmaUser> {
    return this.request<FigmaUser>("/v1/me");
  }

  /**
   * Get a file's full data.
   * @param key - File key from the Figma URL
   * @param opts.depth - Limit depth of the node tree (1 = document + pages only)
   * @param opts.ids - Only return specific node IDs
   */
  async getFile(
    key: string,
    opts?: { depth?: number; ids?: string[] },
  ): Promise<FigmaFileResponse> {
    const params: Record<string, string> = {};
    if (opts?.depth !== undefined) params.depth = String(opts.depth);
    if (opts?.ids?.length) params.ids = opts.ids.join(",");
    return this.request<FigmaFileResponse>(`/v1/files/${key}`, params);
  }

  /**
   * Get specific nodes from a file.
   * @param key - File key
   * @param ids - Node IDs to fetch (e.g. ["1:2", "3:4"])
   * @param depth - Optional depth limit
   */
  async getFileNodes(
    key: string,
    ids: string[],
    depth?: number,
  ): Promise<FigmaFileNodesResponse> {
    const params: Record<string, string> = { ids: ids.join(",") };
    if (depth !== undefined) params.depth = String(depth);
    return this.request<FigmaFileNodesResponse>(
      `/v1/files/${key}/nodes`,
      params,
    );
  }

  /** List projects for a team. */
  async getTeamProjects(teamId: string): Promise<FigmaTeamProjectsResponse> {
    return this.request<FigmaTeamProjectsResponse>(
      `/v1/teams/${teamId}/projects`,
    );
  }

  /** List files in a project. */
  async getProjectFiles(
    projectId: string,
  ): Promise<FigmaProjectFilesResponse> {
    return this.request<FigmaProjectFilesResponse>(
      `/v1/projects/${projectId}/files`,
    );
  }

  /**
   * Export nodes as images (SVG, PNG, etc.).
   * @param key - File key
   * @param ids - Node IDs to export
   * @param format - Image format (svg, png, jpg, pdf)
   * @param scale - Export scale (default 1)
   * @returns Map of node ID → image URL
   */
  async getImages(
    key: string,
    ids: string[],
    format: "svg" | "png" | "jpg" | "pdf" = "svg",
    scale?: number,
  ): Promise<Record<string, string | null>> {
    const params: Record<string, string> = {
      ids: ids.join(","),
      format,
    };
    if (scale !== undefined) params.scale = String(scale);
    const result = await this.request<{ images: Record<string, string | null> }>(
      `/v1/images/${key}`,
      params,
    );
    return result.images;
  }
}
