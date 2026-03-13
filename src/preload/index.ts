import { contextBridge, ipcRenderer } from "electron";
import { IPC } from "../shared/ipc-channels";
import type { AppSettings, SessionSummary, RequestRecord } from "../shared/types";

const electronAPI = {
  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.GET_SETTINGS),

  saveSettings: (input: { targetUrl: string }): Promise<AppSettings> =>
    ipcRenderer.invoke(IPC.SAVE_SETTINGS, input),

  toggleListening: (
    value: boolean,
  ): Promise<{ isRunning: boolean; address: string | null; port: number }> =>
    ipcRenderer.invoke(IPC.TOGGLE_LISTENING, value),

  getProxyStatus: (): Promise<{ isRunning: boolean }> =>
    ipcRenderer.invoke(IPC.GET_PROXY_STATUS),

  listSessions: (): Promise<SessionSummary[]> =>
    ipcRenderer.invoke(IPC.LIST_SESSIONS),

  getSessionRequests: (sessionId: string): Promise<RequestRecord[]> =>
    ipcRenderer.invoke(IPC.GET_SESSION_REQUESTS, sessionId),

  getRequestDetail: (requestId: string): Promise<RequestRecord | null> =>
    ipcRenderer.invoke(IPC.GET_REQUEST_DETAIL, requestId),

  clearData: (): Promise<void> => ipcRenderer.invoke(IPC.CLEAR_DATA),

  search: (
    query: string,
  ): Promise<{ sessions: SessionSummary[]; requests: RequestRecord[] }> =>
    ipcRenderer.invoke(IPC.SEARCH, query),

  onCaptureUpdated: (cb: (sessions: SessionSummary[]) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, sessions: SessionSummary[]) =>
      cb(sessions);
    ipcRenderer.on(IPC.CAPTURE_UPDATED, handler);
    return () => ipcRenderer.removeListener(IPC.CAPTURE_UPDATED, handler);
  },

  onProxyError: (cb: (error: string) => void): (() => void) => {
    const handler = (_e: Electron.IpcRendererEvent, error: string) => cb(error);
    ipcRenderer.on(IPC.PROXY_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC.PROXY_ERROR, handler);
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

export type ElectronAPI = typeof electronAPI;
