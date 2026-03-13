import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SettingsStore } from "../../src/main/store/settings-store";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("SettingsStore", () => {
  let tempDir: string;
  let store: SettingsStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "settings-test-"));
    store = new SettingsStore(join(tempDir, "settings.json"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns default settings when file does not exist", () => {
    const settings = store.getSettings();
    expect(settings.targetUrl).toBe("");
  });

  it("saves and retrieves settings", () => {
    store.saveSettings({ targetUrl: "https://api.anthropic.com" });
    const settings = store.getSettings();
    expect(settings.targetUrl).toBe("https://api.anthropic.com");
  });

  it("trims whitespace from targetUrl", () => {
    store.saveSettings({ targetUrl: "  https://api.anthropic.com  " });
    const settings = store.getSettings();
    expect(settings.targetUrl).toBe("https://api.anthropic.com");
  });

  it("persists across instances", () => {
    const filePath = join(tempDir, "settings.json");
    const store1 = new SettingsStore(filePath);
    store1.saveSettings({ targetUrl: "https://example.com" });

    const store2 = new SettingsStore(filePath);
    expect(store2.getSettings().targetUrl).toBe("https://example.com");
  });

  it("hasTargetUrl returns false for empty", () => {
    expect(store.hasTargetUrl()).toBe(false);
  });

  it("hasTargetUrl returns true when configured", () => {
    store.saveSettings({ targetUrl: "https://api.anthropic.com" });
    expect(store.hasTargetUrl()).toBe(true);
  });
});
