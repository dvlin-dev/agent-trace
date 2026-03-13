import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessionStore } from "../../src/renderer/src/stores/session-store";
import { useAppStore } from "../../src/renderer/src/stores/app-store";
import type { SessionSummary } from "../../src/shared/types";

// Mock the electron API
const mockGetSettings = vi.fn().mockResolvedValue({ targetUrl: "https://api.anthropic.com" });
const mockGetProxyStatus = vi.fn().mockResolvedValue({ isRunning: false });
const mockListSessions = vi.fn().mockResolvedValue([]);
const mockClearData = vi.fn().mockResolvedValue(undefined);

vi.mock("../../src/renderer/src/lib/electron-api", () => ({
  getElectronAPI: () => ({
    getSettings: mockGetSettings,
    getProxyStatus: mockGetProxyStatus,
    listSessions: mockListSessions,
    clearData: mockClearData,
    onCaptureUpdated: vi.fn().mockReturnValue(() => {}),
    onProxyError: vi.fn().mockReturnValue(() => {}),
  }),
}));

const makeSessions = (count: number): SessionSummary[] =>
  Array.from({ length: count }, (_, i) => ({
    sessionId: `s${i}`,
    title: `Session ${i}`,
    startedAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() - i * 60000).toISOString(),
    requestCount: i + 1,
    model: "claude-opus-4-6",
  }));

describe("Session Store", () => {
  beforeEach(() => {
    useSessionStore.setState({
      sessions: [],
      selectedSessionId: null,
      searchQuery: "",
    });
  });

  it("updateSessions updates the session list", () => {
    const sessions = makeSessions(3);
    act(() => {
      useSessionStore.getState().updateSessions(sessions);
    });
    expect(useSessionStore.getState().sessions).toHaveLength(3);
  });

  it("selectSession sets the selected session", () => {
    act(() => {
      useSessionStore.getState().selectSession("s1");
    });
    expect(useSessionStore.getState().selectedSessionId).toBe("s1");
  });

  it("clearData empties sessions and selection", async () => {
    useSessionStore.setState({
      sessions: makeSessions(2),
      selectedSessionId: "s1",
    });

    await act(async () => {
      await useSessionStore.getState().clearData();
    });

    expect(useSessionStore.getState().sessions).toHaveLength(0);
    expect(useSessionStore.getState().selectedSessionId).toBeNull();
  });

  it("new capture updates session list", () => {
    const initialSessions = makeSessions(2);
    act(() => {
      useSessionStore.getState().updateSessions(initialSessions);
    });
    expect(useSessionStore.getState().sessions).toHaveLength(2);

    // Simulate new capture arriving
    const updatedSessions = makeSessions(3);
    act(() => {
      useSessionStore.getState().updateSessions(updatedSessions);
    });
    expect(useSessionStore.getState().sessions).toHaveLength(3);
  });
});

describe("App Store", () => {
  beforeEach(() => {
    useAppStore.setState({
      settings: null,
      isListening: false,
      proxyAddress: null,
      initialized: false,
    });
  });

  it("initialize loads settings", async () => {
    await act(async () => {
      await useAppStore.getState().initialize();
    });

    expect(useAppStore.getState().settings).toEqual({
      targetUrl: "https://api.anthropic.com",
    });
    expect(useAppStore.getState().initialized).toBe(true);
  });

  it("initialize loads proxy status", async () => {
    mockGetProxyStatus.mockResolvedValueOnce({ isRunning: true });

    await act(async () => {
      await useAppStore.getState().initialize();
    });

    expect(useAppStore.getState().isListening).toBe(true);
  });
});
