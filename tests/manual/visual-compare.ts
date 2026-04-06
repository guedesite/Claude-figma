/**
 * Visual comparison test: Figma PNG export vs HTML render screenshot.
 *
 * For each page in a Figma file:
 * 1. Export the main frame as PNG from Figma API
 * 2. Convert to HTML via our converter
 * 3. Screenshot the HTML with Puppeteer
 * 4. Save both images side by side for comparison
 *
 * Usage: FIGMA_TOKEN=figd_xxx npx tsx tests/manual/visual-compare.ts <file_key>
 */

import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { FigmaClient } from "../../src/api/figma-client.js";
import { convertNodeToHtml, collectVectorNodeIds } from "../../src/converter/index.js";
import { downloadSvgs, collectNodeNames } from "../../src/utils/svg-downloader.js";
import type { FigmaNode } from "../../src/api/types.js";

const token = process.env.FIGMA_TOKEN;
if (!token) {
  console.error("Set FIGMA_TOKEN env var");
  process.exit(1);
}
const fileKey = process.argv[2];
if (!fileKey) {
  console.error("Usage: npx tsx tests/manual/visual-compare.ts <file_key>");
  process.exit(1);
}

const OUTPUT_DIR = path.resolve("test-results");
const client = new FigmaClient(token);

interface PageInfo {
  pageId: string;
  pageName: string;
  mainFrameId: string;
  mainFrameName: string;
  width: number;
  height: number;
}

async function getPages(): Promise<PageInfo[]> {
  console.log("Fetching file structure...");
  const file = await client.getFile(fileKey, { depth: 2 });
  console.log(`File: ${file.name}`);

  const pages: PageInfo[] = [];
  for (const page of file.document.children ?? []) {
    if (page.type !== "CANVAS") continue;
    // Find the main frame (largest or first FRAME child)
    const frames = (page.children ?? []).filter(
      (c) => c.type === "FRAME" && c.absoluteBoundingBox,
    );
    if (frames.length === 0) continue;

    // Pick the largest frame
    const mainFrame = frames.reduce((best, f) => {
      const area =
        (f.absoluteBoundingBox?.width ?? 0) *
        (f.absoluteBoundingBox?.height ?? 0);
      const bestArea =
        (best.absoluteBoundingBox?.width ?? 0) *
        (best.absoluteBoundingBox?.height ?? 0);
      return area > bestArea ? f : best;
    });

    pages.push({
      pageId: page.id,
      pageName: page.name,
      mainFrameId: mainFrame.id,
      mainFrameName: mainFrame.name,
      width: Math.round(mainFrame.absoluteBoundingBox!.width),
      height: Math.round(mainFrame.absoluteBoundingBox!.height),
    });
  }
  return pages;
}

async function exportFigmaPng(nodeId: string, pageName: string): Promise<string> {
  const safeName = pageName.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);
  const pngPath = path.join(OUTPUT_DIR, `${safeName}-figma.png`);

  console.log(`  Exporting PNG from Figma for "${pageName}"...`);
  const images = await client.getImages(fileKey, [nodeId], "png", 2);
  const url = images[nodeId];
  if (!url) {
    console.error(`  No PNG URL for ${nodeId}`);
    return "";
  }

  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(pngPath, buffer);
  console.log(`  Figma PNG: ${pngPath} (${buffer.length} bytes)`);
  return pngPath;
}

async function convertToHtml(
  nodeId: string,
  pageName: string,
): Promise<{ htmlPath: string; width: number; height: number }> {
  const safeName = pageName.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);
  const htmlDir = path.join(OUTPUT_DIR, safeName);
  fs.mkdirSync(path.join(htmlDir, "icons"), { recursive: true });

  console.log(`  Fetching node tree...`);
  const result = await client.getFileNodes(fileKey, [nodeId]);
  const node = result.nodes[nodeId]?.document;
  if (!node) {
    console.error(`  Node ${nodeId} not found`);
    return { htmlPath: "", width: 0, height: 0 };
  }

  const width = Math.round(node.absoluteBoundingBox?.width ?? 1440);
  const height = Math.round(node.absoluteBoundingBox?.height ?? 900);

  // Export SVGs
  const vectorIds = collectVectorNodeIds(node);
  let svgMap: Record<string, string | null> = {};
  if (vectorIds.length > 0) {
    console.log(`  Exporting ${vectorIds.length} SVGs...`);
    const remoteUrls = await client.getImages(fileKey, vectorIds, "svg");
    const nodeNames = collectNodeNames(node, new Set(vectorIds));
    svgMap = await downloadSvgs(remoteUrls, nodeNames, path.join(htmlDir, "icons"));
  }

  // Convert to HTML
  console.log(`  Converting to HTML...`);
  const html = convertNodeToHtml(node, {
    includeStyleTag: true,
    maxDepth: 50,
    svgMap,
  });

  const fullPage = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${pageName}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
</style>
</head>
<body>
${html}
</body>
</html>`;

  const htmlPath = path.join(htmlDir, "index.html");
  fs.writeFileSync(htmlPath, fullPage);
  console.log(`  HTML: ${htmlPath} (${fullPage.length} chars)`);

  return { htmlPath, width, height };
}

async function screenshotHtml(
  htmlPath: string,
  pageName: string,
  width: number,
  height: number,
): Promise<string> {
  const safeName = pageName.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);
  const screenshotPath = path.join(OUTPUT_DIR, `${safeName}-html.png`);

  console.log(`  Taking screenshot (${width}x${height})...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });

  const fileUrl = `file://${htmlPath.replace(/\\/g, "/")}`;
  await page.goto(fileUrl, { waitUntil: "networkidle0", timeout: 30000 });
  // Wait a bit for fonts to load
  await new Promise((r) => setTimeout(r, 1000));

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
  });
  await browser.close();

  console.log(`  Screenshot: ${screenshotPath}`);
  return screenshotPath;
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const pages = await getPages();
  console.log(`\nFound ${pages.length} pages to test\n`);

  const results: Array<{
    page: string;
    figmaPng: string;
    htmlPng: string;
    width: number;
    height: number;
  }> = [];

  for (const p of pages) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`PAGE: ${p.pageName}`);
    console.log(`Frame: ${p.mainFrameName} (${p.width}x${p.height})`);
    console.log("=".repeat(60));

    try {
      const figmaPng = await exportFigmaPng(p.mainFrameId, p.pageName);
      const { htmlPath, width, height } = await convertToHtml(p.mainFrameId, p.pageName);

      let htmlPng = "";
      if (htmlPath) {
        htmlPng = await screenshotHtml(htmlPath, p.pageName, width, height);
      }

      results.push({
        page: p.pageName,
        figmaPng,
        htmlPng,
        width: p.width,
        height: p.height,
      });

      console.log(`  ✓ Done`);
    } catch (err) {
      console.error(`  ✗ Error:`, err);
      results.push({
        page: p.pageName,
        figmaPng: "",
        htmlPng: "",
        width: p.width,
        height: p.height,
      });
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log("=".repeat(60));
  for (const r of results) {
    const figmaOk = r.figmaPng ? "✓" : "✗";
    const htmlOk = r.htmlPng ? "✓" : "✗";
    console.log(`  ${figmaOk}/${htmlOk}  ${r.page} (${r.width}x${r.height})`);
  }
  console.log(`\nResults saved to: ${OUTPUT_DIR}`);

  // Write JSON manifest
  fs.writeFileSync(
    path.join(OUTPUT_DIR, "manifest.json"),
    JSON.stringify(results, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
