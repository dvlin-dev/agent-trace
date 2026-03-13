import type { AppSettings, SessionSummary, RequestRecord } from "../../../shared/types";

export interface ElectronAPI {
  getSettings(): Promise<AppSettings>;
  saveSettings(input: { targetUrl: string }): Promise<AppSettings>;
  toggleListening(
    value: boolean,
  ): Promise<{ isRunning: boolean; address: string | null; port: number }>;
  getProxyStatus(): Promise<{ isRunning: boolean }>;
  listSessions(): Promise<SessionSummary[]>;
  getSessionRequests(sessionId: string): Promise<RequestRecord[]>;
  getRequestDetail(requestId: string): Promise<RequestRecord | null>;
  clearData(): Promise<void>;
  search(
    query: string,
  ): Promise<{ sessions: SessionSummary[]; requests: RequestRecord[] }>;
  onCaptureUpdated(cb: (sessions: SessionSummary[]) => void): () => void;
  onProxyError(cb: (error: string) => void): () => void;
}

export function getElectronAPI(): ElectronAPI {
  return (window as Window & { electronAPI: ElectronAPI }).electronAPI;
}
