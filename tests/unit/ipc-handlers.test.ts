import { describe, it, expect } from "vitest";
import { IPC } from "../../src/shared/ipc-channels";

describe("IPC Channels", () => {
  it("defines all required channels", () => {
    expect(IPC.GET_SETTINGS).toBe("app:get-settings");
    expect(IPC.SAVE_SETTINGS).toBe("app:save-settings");
    expect(IPC.TOGGLE_LISTENING).toBe("app:toggle-listening");
    expect(IPC.GET_PROXY_STATUS).toBe("app:get-proxy-status");
    expect(IPC.LIST_SESSIONS).toBe("app:list-sessions");
    expect(IPC.GET_SESSION_REQUESTS).toBe("app:get-session-requests");
    expect(IPC.GET_REQUEST_DETAIL).toBe("app:get-request-detail");
    expect(IPC.CLEAR_DATA).toBe("app:clear-data");
    expect(IPC.SEARCH).toBe("app:search");
    expect(IPC.CAPTURE_UPDATED).toBe("proxy:capture-updated");
    expect(IPC.PROXY_ERROR).toBe("proxy:error");
  });

  it("has unique channel names", () => {
    const values = Object.values(IPC);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("all channels follow naming convention", () => {
    for (const channel of Object.values(IPC)) {
      expect(channel).toMatch(/^(app|proxy):/);
    }
  });
});
