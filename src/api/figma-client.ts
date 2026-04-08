import { logger } from "../utils/logger.js";
import type {
  FigmaUser,
  FigmaFileResponse,
  FigmaFileNodesResponse,
  FigmaTeamProjectsResponse,
  FigmaProjectFilesResponse,
  FigmaCommentsResponse,
  FigmaComment,
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

  private async requestWithBody<T>(
    method: "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    logger.debug(`Figma API: ${method} ${url.pathname}`);

    const res = await fetch(url.toString(), {
      method,
      headers: {
        "X-Figma-Token": this.token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(`Figma API error: ${res.status} ${text.slice(0, 200)}`);
      throw new FigmaApiError(res.status, text);
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

  // ─── Comments ───

  /** Get all comments for a file. */
  async getComments(fileKey: string): Promise<FigmaCommentsResponse> {
    return this.request<FigmaCommentsResponse>(
      `/v1/files/${fileKey}/comments`,
    );
  }

  /** Post a comment on a file. */
  async postComment(
    fileKey: string,
    message: string,
    opts?: { node_id?: string; parent_id?: string },
  ): Promise<FigmaComment> {
    const body: Record<string, unknown> = { message };
    if (opts?.node_id) {
      body.client_meta = { node_id: opts.node_id, node_offset: { x: 0, y: 0 } };
    }
    if (opts?.parent_id) {
      body.comment_id = opts.parent_id;
    }
    return this.requestWithBody<FigmaComment>(
      "POST",
      `/v1/files/${fileKey}/comments`,
      body,
    );
  }

  /** Resolve (or unresolve) a comment. */
  async resolveComment(
    fileKey: string,
    commentId: string,
  ): Promise<FigmaComment> {
    return this.requestWithBody<FigmaComment>(
      "DELETE",
      `/v1/files/${fileKey}/comments/${commentId}`,
    );
  }
}
