import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// We need to test the module's behavior so we import after mocking
vi.mock("node:fs");
vi.mock("node:os", () => ({
  default: { homedir: () => "/mock/home" },
  homedir: () => "/mock/home",
}));

// Import after mocks
const { getToken, setToken, hasToken } = await import(
  "../../src/config/token-manager.js"
);

describe("token-manager", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.FIGMA_TOKEN;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getToken", () => {
    it("should return env var token first", () => {
      process.env.FIGMA_TOKEN = "figd_env_token";
      expect(getToken()).toBe("figd_env_token");
    });

    it("should read from config file when no env var", () => {
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ figmaToken: "figd_file_token" }),
      );
      expect(getToken()).toBe("figd_file_token");
    });

    it("should return null when no token found", () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      expect(getToken()).toBeNull();
    });

    it("should prioritize env var over config file", () => {
      process.env.FIGMA_TOKEN = "figd_env_token";
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ figmaToken: "figd_file_token" }),
      );
      expect(getToken()).toBe("figd_env_token");
    });
  });

  describe("setToken", () => {
    it("should write token to config file", () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      vi.mocked(fs.writeFileSync).mockImplementation(() => {});
      vi.mocked(fs.chmodSync).mockImplementation(() => {});

      setToken("figd_new_token");

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(".figma-mcp-config.json"),
        expect.stringContaining("figd_new_token"),
        "utf-8",
      );
    });
  });

  describe("hasToken", () => {
    it("should return true when env var is set", () => {
      process.env.FIGMA_TOKEN = "figd_test";
      expect(hasToken()).toBe(true);
    });

    it("should return false when no token", () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT");
      });
      expect(hasToken()).toBe(false);
    });
  });
});
