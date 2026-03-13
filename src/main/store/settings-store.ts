import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { AppSettings } from "../../shared/types";
import { DEFAULT_SETTINGS } from "../../shared/defaults";

export class SettingsStore {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  getSettings(): AppSettings {
    try {
      const raw = readFileSync(this.filePath, "utf-8");
      const data = JSON.parse(raw) as AppSettings;
      return { targetUrl: data.targetUrl ?? DEFAULT_SETTINGS.targetUrl };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  saveSettings(input: { targetUrl: string }): void {
    const settings: AppSettings = {
      targetUrl: input.targetUrl.trim(),
    };
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, JSON.stringify(settings, null, 2), "utf-8");
  }

  hasTargetUrl(): boolean {
    const settings = this.getSettings();
    return settings.targetUrl.length > 0;
  }
}
