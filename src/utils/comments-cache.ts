import type { FigmaCommentsResponse } from "../api/types.js";
import { logger } from "./logger.js";

interface CacheEntry {
  data: FigmaCommentsResponse;
  timestamp: number;
}

const TTL_MS = 60_000; // 60 seconds
const cache = new Map<string, CacheEntry>();

export function getCachedComments(fileKey: string): FigmaCommentsResponse | null {
  const entry = cache.get(fileKey);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > TTL_MS) {
    cache.delete(fileKey);
    logger.debug(`Comments cache expired for ${fileKey}`);
    return null;
  }

  logger.debug(`Comments cache hit for ${fileKey}`);
  return entry.data;
}

export function setCachedComments(fileKey: string, data: FigmaCommentsResponse): void {
  cache.set(fileKey, { data, timestamp: Date.now() });
  logger.debug(`Comments cached for ${fileKey} (${data.comments.length} comments)`);
}

export function invalidateCommentsCache(fileKey: string): void {
  cache.delete(fileKey);
}
