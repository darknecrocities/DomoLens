import { create } from "zustand";

interface SettingsState {
  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

const STORAGE_KEY = "domolens_user_ai_key";

export const useSettings = create<SettingsState>((set) => ({
  apiKey: typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "" : "",

  setApiKey: (key: string) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, key.trim());
    }
    set({ apiKey: key.trim() });
  },

  clearApiKey: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ apiKey: "" });
  },
}));
