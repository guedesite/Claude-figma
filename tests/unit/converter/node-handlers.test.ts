import { describe, it, expect } from "vitest";
import { convertNodeToHtml } from "../../../src/converter/index.js";
import type { FigmaNode } from "../../../src/api/types.js";
import simpleFrame from "../../fixtures/simple-frame.json";
import autoLayout from "../../fixtures/auto-layout.json";
import textNode from "../../fixtures/text-node.json";
import nestedComponents from "../../fixtures/nested-components.json";

describe("convertNodeToHtml", () => {
  describe("simple frame", () => {
    it("should render a simple frame as a div", () => {
      const html = convertNodeToHtml(simpleFrame as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("<div");
      expect(html).toContain("</div>");
      expect(html).toContain("SimpleCard");
    });

    it("should include background color", () => {
      const html = convertNodeToHtml(simpleFrame as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("#ffffff");
    });

    it("should include border-radius", () => {
      const html = convertNodeToHtml(simpleFrame as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("border-radius: 8px");
    });
  });

  describe("auto-layout frame", () => {
    it("should render with flex layout", () => {
      const html = convertNodeToHtml(autoLayout as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("display: flex");
      expect(html).toContain("flex-direction: column");
    });

    it("should include gap from itemSpacing", () => {
      const html = convertNodeToHtml(autoLayout as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("gap: 8px");
    });

    it("should render child text nodes", () => {
      const html = convertNodeToHtml(autoLayout as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("Hello World");
      expect(html).toContain("This is a simple card component");
    });

    it("should include box-shadow from effects", () => {
      const html = convertNodeToHtml(autoLayout as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("box-shadow");
    });
  });

  describe("text node", () => {
    it("should render text content", () => {
      const html = convertNodeToHtml(textNode as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("Welcome to Figma");
    });

    it("should include typography CSS", () => {
      const html = convertNodeToHtml(textNode as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("font-family");
      expect(html).toContain("Inter");
      expect(html).toContain("font-size: 32px");
      expect(html).toContain("font-weight: 800");
    });

    it("should include text-transform uppercase", () => {
      const html = convertNodeToHtml(textNode as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("text-transform: uppercase");
    });

    it("should include text-align center", () => {
      const html = convertNodeToHtml(textNode as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("text-align: center");
    });
  });

  describe("nested components", () => {
    it("should render nested structure", () => {
      const html = convertNodeToHtml(nestedComponents as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("Navbar");
      expect(html).toContain("MyApp");
      expect(html).toContain("Home");
      expect(html).toContain("About");
      expect(html).toContain("Contact");
      expect(html).toContain("Sign Up");
    });

    it("should render space-between for navbar", () => {
      const html = convertNodeToHtml(nestedComponents as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("justify-content: space-between");
    });

    it("should include border from strokes", () => {
      const html = convertNodeToHtml(nestedComponents as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 50,
      });
      expect(html).toContain("border:");
      expect(html).toContain("1px solid");
    });
  });

  describe("style tag mode", () => {
    it("should generate a <style> block with classes", () => {
      const html = convertNodeToHtml(autoLayout as unknown as FigmaNode, {
        includeStyleTag: true,
        maxDepth: 50,
      });
      expect(html).toContain("<style>");
      expect(html).toContain("</style>");
      expect(html).toContain("class=");
    });

    it("should use figma- prefixed class names", () => {
      const html = convertNodeToHtml(simpleFrame as unknown as FigmaNode, {
        includeStyleTag: true,
        maxDepth: 50,
      });
      expect(html).toMatch(/class="figma-/);
    });
  });

  describe("edge cases", () => {
    it("should handle hidden nodes", () => {
      const node: FigmaNode = {
        id: "1:1",
        name: "Hidden",
        type: "FRAME",
        visible: false,
      };
      const html = convertNodeToHtml(node, { includeStyleTag: false, maxDepth: 50 });
      expect(html).toContain("hidden");
    });

    it("should respect max depth", () => {
      const html = convertNodeToHtml(nestedComponents as unknown as FigmaNode, {
        includeStyleTag: false,
        maxDepth: 1,
      });
      expect(html).toContain("max depth reached");
    });

    it("should escape HTML in text content", () => {
      const node: FigmaNode = {
        id: "1:1",
        name: "HTMLText",
        type: "TEXT",
        characters: '<script>alert("xss")</script>',
        fills: [],
      };
      const html = convertNodeToHtml(node, { includeStyleTag: false, maxDepth: 50 });
      expect(html).not.toContain("<script>");
      expect(html).toContain("&lt;script&gt;");
    });
  });
});
