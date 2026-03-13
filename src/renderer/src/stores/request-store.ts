import { create } from "zustand";
import type { RequestRecord } from "../../../shared/types";
import { getElectronAPI } from "../lib/electron-api";

interface RequestState {
  requests: RequestRecord[];
  selectedRequestId: string | null;
  inspectorOpen: boolean;
  rawMode: boolean;

  loadRequests: (sessionId: string) => Promise<void>;
  selectRequest: (id: string | null) => void;
  toggleInspector: () => void;
  toggleRawMode: () => void;
}

export const useRequestStore = create<RequestState>((set) => ({
  requests: [],
  selectedRequestId: null,
  inspectorOpen: false,
  rawMode: false,

  loadRequests: async (sessionId) => {
    const api = getElectronAPI();
    const requests = await api.getSessionRequests(sessionId);
    set({ requests, selectedRequestId: null });
  },

  selectRequest: (id) => set({ selectedRequestId: id }),

  toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),

  toggleRawMode: () => set((s) => ({ rawMode: !s.rawMode })),
}));
