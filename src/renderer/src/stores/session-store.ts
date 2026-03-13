import { create } from "zustand";
import type { SessionSummary } from "../../../shared/types";
import { getElectronAPI } from "../lib/electron-api";

interface SessionState {
  sessions: SessionSummary[];
  selectedSessionId: string | null;
  searchQuery: string;

  loadSessions: () => Promise<void>;
  selectSession: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearData: () => Promise<void>;
  updateSessions: (sessions: SessionSummary[]) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  selectedSessionId: null,
  searchQuery: "",

  loadSessions: async () => {
    const api = getElectronAPI();
    const sessions = await api.listSessions();
    set({ sessions });
  },

  selectSession: (id) => set({ selectedSessionId: id }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  clearData: async () => {
    const api = getElectronAPI();
    await api.clearData();
    set({ sessions: [], selectedSessionId: null });
  },

  updateSessions: (sessions) => set({ sessions }),
}));
