import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger.js";

/**
 * Download SVGs from Figma CDN URLs and save them as local files.
 *
 * @param svgUrls - Map of node ID → Figma CDN URL
 * @param nodeNames - Map of node ID → node name (for filename)
 * @param outputDir - Directory to save SVG files (will be created if needed)
 * @returns Map of node ID → relative file path (e.g., "assets/icon-name.svg")
 */
export async function downloadSvgs(
  svgUrls: Record<string, string | null>,
  nodeNames: Record<string, string>,
  outputDir: string,
): Promise<Record<string, string | null>> {
  // Ensure output dir exists
  fs.mkdirSync(outputDir, { recursive: true });

  const localMap: Record<string, string | null> = {};
  const usedNames = new Set<string>();

  const downloads = Object.entries(svgUrls).map(async ([nodeId, url]) => {
    if (!url) {
      localMap[nodeId] = null;
      return;
    }

    try {
      const res = await fetch(url);
      if (!res.ok) {
        logger.warn(`Failed to download SVG for ${nodeId}: HTTP ${res.status}`);
        localMap[nodeId] = null;
        return;
      }

      const svgContent = await res.text();

      // Generate a clean filename from the node name
      const rawName = nodeNames[nodeId] ?? nodeId;
      let baseName = rawName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 50) || "icon";

      // Deduplicate filenames
      let filename = `${baseName}.svg`;
      let counter = 1;
      while (usedNames.has(filename)) {
        filename = `${baseName}-${counter}.svg`;
        counter++;
      }
      usedNames.add(filename);

      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, svgContent, "utf-8");

      // Return relative path from the assets dir name
      const dirName = path.basename(outputDir);
      localMap[nodeId] = `${dirName}/${filename}`;
    } catch (err) {
      logger.warn(`Failed to download SVG for ${nodeId}:`, err);
      localMap[nodeId] = null;
    }
  });

  await Promise.all(downloads);

  const saved = Object.values(localMap).filter(Boolean).length;
  logger.info(`Downloaded ${saved}/${Object.keys(svgUrls).length} SVG files to ${outputDir}`);

  return localMap;
}

/**
 * Collect node names from a Figma node tree for all given IDs.
 */
export function collectNodeNames(
  node: import("../api/types.js").FigmaNode,
  ids: Set<string>,
): Record<string, string> {
  const names: Record<string, string> = {};

  function walk(n: import("../api/types.js").FigmaNode) {
    if (ids.has(n.id)) {
      names[n.id] = n.name;
    }
    if (n.children) {
      for (const child of n.children) {
        walk(child);
      }
    }
  }

  walk(node);
  return names;
}
