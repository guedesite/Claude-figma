/**
 * Manual integration test script.
 * Tests each MCP tool against the real Figma API.
 *
 * Usage: FIGMA_TOKEN=figd_xxx npx tsx tests/manual/test-tools.ts [file_key]
 */

import { FigmaClient } from "../../src/api/figma-client.js";
import { convertNodeToHtml } from "../../src/converter/index.js";

const token = process.env.FIGMA_TOKEN;
if (!token) {
  console.error("ERROR: Set FIGMA_TOKEN environment variable");
  process.exit(1);
}

const fileKey = process.argv[2]; // optional file key as argument

const client = new FigmaClient(token);

function separator(title: string) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

async function testConnection() {
  separator("TEST 1: Connection (GET /v1/me)");
  try {
    const user = await client.getMe();
    console.log(`  User: ${user.handle}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  ID: ${user.id}`);
    console.log("  -> PASS");
    return true;
  } catch (err) {
    console.error("  -> FAIL:", err);
    return false;
  }
}

async function testGetFileInfo(key: string) {
  separator(`TEST 2: Get File Info (${key})`);
  try {
    const file = await client.getFile(key, { depth: 1 });
    console.log(`  File: ${file.name}`);
    console.log(`  Last modified: ${file.lastModified}`);
    console.log(`  Pages:`);
    const pages = file.document.children ?? [];
    for (const page of pages) {
      console.log(`    - ${page.name} (ID: ${page.id})`);
    }
    console.log(`  Components: ${Object.keys(file.components).length}`);
    console.log(`  Styles: ${Object.keys(file.styles).length}`);
    console.log("  -> PASS");
    return pages;
  } catch (err) {
    console.error("  -> FAIL:", err);
    return [];
  }
}

async function testGetPage(key: string, pageId: string, pageName: string) {
  separator(`TEST 3: Get Page "${pageName}" (${pageId})`);
  try {
    const result = await client.getFileNodes(key, [pageId], 2);
    const nodeData = result.nodes[pageId];
    if (!nodeData) {
      console.error(`  Page ${pageId} not found`);
      return null;
    }
    const doc = nodeData.document;
    console.log(`  Page: ${doc.name}`);
    console.log(`  Children: ${doc.children?.length ?? 0}`);
    if (doc.children) {
      for (const child of doc.children.slice(0, 10)) {
        const dims = child.absoluteBoundingBox
          ? ` (${Math.round(child.absoluteBoundingBox.width)}x${Math.round(child.absoluteBoundingBox.height)})`
          : "";
        console.log(`    - ${child.name} [${child.type}]${dims} (ID: ${child.id})`);
      }
      if (doc.children.length > 10) {
        console.log(`    ... and ${doc.children.length - 10} more`);
      }
    }
    console.log("  -> PASS");
    return doc;
  } catch (err) {
    console.error("  -> FAIL:", err);
    return null;
  }
}

async function testGetNode(key: string, nodeId: string, nodeName: string) {
  separator(`TEST 4: Get Node "${nodeName}" (${nodeId})`);
  try {
    const result = await client.getFileNodes(key, [nodeId], 3);
    const nodeData = result.nodes[nodeId];
    if (!nodeData) {
      console.error(`  Node ${nodeId} not found`);
      return null;
    }
    const node = nodeData.document;
    console.log(`  Name: ${node.name}`);
    console.log(`  Type: ${node.type}`);
    if (node.absoluteBoundingBox) {
      const { width, height } = node.absoluteBoundingBox;
      console.log(`  Size: ${Math.round(width)}x${Math.round(height)}`);
    }
    if (node.layoutMode && node.layoutMode !== "NONE") {
      console.log(`  Layout: ${node.layoutMode}`);
    }
    console.log(`  Children: ${node.children?.length ?? 0}`);
    console.log("  -> PASS");
    return node;
  } catch (err) {
    console.error("  -> FAIL:", err);
    return null;
  }
}

async function testFigmaToHtml(key: string, nodeId: string, nodeName: string) {
  separator(`TEST 5: Figma-to-HTML "${nodeName}" (${nodeId})`);
  try {
    const result = await client.getFileNodes(key, [nodeId]);
    const nodeData = result.nodes[nodeId];
    if (!nodeData) {
      console.error(`  Node ${nodeId} not found`);
      return;
    }

    // Test with style tag mode
    const htmlStyleTag = convertNodeToHtml(nodeData.document, {
      includeStyleTag: true,
      maxDepth: 50,
    });
    console.log(`  Style-tag mode: ${htmlStyleTag.length} chars`);
    console.log(`  Has <style>: ${htmlStyleTag.includes("<style>")}`);
    console.log(`  Has class=: ${htmlStyleTag.includes('class=')}`);

    // Test with inline styles mode
    const htmlInline = convertNodeToHtml(nodeData.document, {
      includeStyleTag: false,
      maxDepth: 50,
    });
    console.log(`  Inline mode: ${htmlInline.length} chars`);
    console.log(`  Has style=: ${htmlInline.includes('style=')}`);

    // Print first 80 lines of style-tag HTML
    console.log(`\n  --- HTML Preview (style-tag mode, first 80 lines) ---`);
    const lines = htmlStyleTag.split("\n").slice(0, 80);
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    if (htmlStyleTag.split("\n").length > 80) {
      console.log(`  ... (${htmlStyleTag.split("\n").length - 80} more lines)`);
    }

    console.log("  -> PASS");
  } catch (err) {
    console.error("  -> FAIL:", err);
  }
}

async function main() {
  console.log("Figma MCP Server — Manual Integration Tests");
  console.log(`Token: ${token.slice(0, 8)}...${token.slice(-4)}`);

  // Test 1: Connection
  const connected = await testConnection();
  if (!connected) {
    console.error("\nConnection failed — aborting remaining tests.");
    process.exit(1);
  }

  // If no file key provided, just test connection
  if (!fileKey) {
    console.log("\n" + "=".repeat(60));
    console.log("  No file key provided — only connection was tested.");
    console.log("  Run with: npx tsx tests/manual/test-tools.ts <file_key>");
    console.log("=".repeat(60));
    return;
  }

  // Test 2: Get file info
  const pages = await testGetFileInfo(fileKey);
  if (!pages.length) {
    console.error("\nNo pages found — aborting remaining tests.");
    process.exit(1);
  }

  // Test 3: Get first page
  const firstPage = pages[0];
  const pageData = await testGetPage(fileKey, firstPage.id, firstPage.name);

  // Test 4: Get first frame from the page
  if (pageData?.children?.length) {
    const firstFrame = pageData.children[0];
    await testGetNode(fileKey, firstFrame.id, firstFrame.name);

    // Test 5: Convert first frame to HTML
    await testFigmaToHtml(fileKey, firstFrame.id, firstFrame.name);
  } else {
    console.log("\n  No children on the page — skipping node and HTML tests.");
  }

  separator("ALL TESTS COMPLETE");
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
