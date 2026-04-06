import { describe, it, expect } from "vitest";
import { parseFigmaUrl, extractFileKey, extractTeamId, extractProjectId } from "../../src/utils/url-parser.js";

describe("parseFigmaUrl", () => {
  it("should return null for non-Figma URLs", () => {
    expect(parseFigmaUrl("https://google.com")).toBeNull();
    expect(parseFigmaUrl("hello world")).toBeNull();
  });

  it("should parse team URL", () => {
    const result = parseFigmaUrl("https://www.figma.com/files/team/123456789/MyTeam");
    expect(result).toBeTruthy();
    expect(result!.type).toBe("team");
    expect(result!.teamId).toBe("123456789");
  });

  it("should parse project URL", () => {
    const result = parseFigmaUrl("https://www.figma.com/files/project/789012/MyProject");
    expect(result).toBeTruthy();
    expect(result!.type).toBe("project");
    expect(result!.projectId).toBe("789012");
  });

  it("should parse file URL", () => {
    const result = parseFigmaUrl("https://www.figma.com/file/ABC123def/MyDesign");
    expect(result).toBeTruthy();
    expect(result!.type).toBe("file");
    expect(result!.fileKey).toBe("ABC123def");
  });

  it("should parse design URL", () => {
    const result = parseFigmaUrl("https://www.figma.com/design/XYZ789/DesignName");
    expect(result).toBeTruthy();
    expect(result!.type).toBe("file");
    expect(result!.fileKey).toBe("XYZ789");
  });

  it("should parse proto URL", () => {
    const result = parseFigmaUrl("https://www.figma.com/proto/ABC123/ProtoName");
    expect(result).toBeTruthy();
    expect(result!.type).toBe("file");
    expect(result!.fileKey).toBe("ABC123");
  });

  it("should parse board URL (FigJam)", () => {
    const result = parseFigmaUrl("https://www.figma.com/board/DEF456/BoardName");
    expect(result).toBeTruthy();
    expect(result!.type).toBe("file");
    expect(result!.fileKey).toBe("DEF456");
  });

  it("should extract node-id from query params", () => {
    const result = parseFigmaUrl("https://www.figma.com/design/ABC123/Name?node-id=1-2&t=abc");
    expect(result).toBeTruthy();
    expect(result!.fileKey).toBe("ABC123");
    expect(result!.nodeId).toBe("1:2");
  });

  it("should convert hyphenated node-id to colon format", () => {
    const result = parseFigmaUrl("https://www.figma.com/file/ABC/Name?node-id=123-456");
    expect(result!.nodeId).toBe("123:456");
  });

  it("should handle URL without protocol", () => {
    const result = parseFigmaUrl("www.figma.com/file/ABC123/Name");
    expect(result).toBeTruthy();
    expect(result!.type).toBe("file");
    expect(result!.fileKey).toBe("ABC123");
  });

  it("should handle figma.com without www", () => {
    const result = parseFigmaUrl("https://figma.com/file/ABC123/Name");
    expect(result).toBeTruthy();
    expect(result!.type).toBe("file");
  });
});

describe("extractFileKey", () => {
  it("should extract key from Figma URL", () => {
    expect(extractFileKey("https://www.figma.com/file/ABC123/Name")).toBe("ABC123");
  });

  it("should return raw input if not a URL", () => {
    expect(extractFileKey("ABC123")).toBe("ABC123");
  });

  it("should trim whitespace", () => {
    expect(extractFileKey("  ABC123  ")).toBe("ABC123");
  });
});

describe("extractTeamId", () => {
  it("should extract team ID from team URL", () => {
    expect(extractTeamId("https://www.figma.com/files/team/12345/Name")).toBe("12345");
  });

  it("should return raw input if not a URL", () => {
    expect(extractTeamId("12345")).toBe("12345");
  });
});

describe("extractProjectId", () => {
  it("should extract project ID from project URL", () => {
    expect(extractProjectId("https://www.figma.com/files/project/789/Name")).toBe("789");
  });

  it("should return raw input if not a URL", () => {
    expect(extractProjectId("789")).toBe("789");
  });
});
