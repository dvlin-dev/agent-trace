import { create } from "zustand";
import type { AppSettings } from "../../../shared/types";
import { getElectronAPI } from "../lib/electron-api";

interface AppState {
  settings: AppSettings | null;
  isListening: boolean;
  proxyAddress: string | null;
  initialized: boolean;

  initialize: () => Promise<void>;
  saveSettings: (input: { targetUrl: string }) => Promise<void>;
  toggleListening: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  settings: null,
  isListening: false,
  proxyAddress: null,
  initialized: false,

  initialize: async () => {
    const api = getElectronAPI();
    const settings = await api.getSettings();
    const status = await api.getProxyStatus();
    set({ settings, isListening: status.isRunning, initialized: true });
  },

  saveSettings: async (input) => {
    const api = getElectronAPI();
    const settings = await api.saveSettings(input);
    set({ settings });
  },

  toggleListening: async () => {
    const api = getElectronAPI();
    const current = get().isListening;
    const result = await api.toggleListening(!current);
    set({
      isListening: result.isRunning,
      proxyAddress: result.address,
    });
  },
}));
