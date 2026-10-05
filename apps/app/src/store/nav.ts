import { create } from "zustand";

export type Screen =
  | { name: "home" }
  | { name: "record" }
  | { name: "project"; id: string }
  | { name: "editor"; id: string }
  | { name: "landing" };

interface NavState {
  screen: Screen;
  /** +1 when going deeper, -1 when going back. Used for slide direction. */
  direction: 1 | -1;
  go: (screen: Screen) => void;
  back: () => void;
}

export const useNav = create<NavState>((set) => ({
  screen: { name: "home" },
  direction: 1,
  go: (screen) => set({ screen, direction: 1 }),
  back: () => set({ screen: { name: "home" }, direction: -1 }),
}));

/** Stable key for animating between screens. */
export function screenKey(screen: Screen): string {
  if (screen.name === "project") return `project:${screen.id}`;
  if (screen.name === "editor") return `editor:${screen.id}`;
  return screen.name;
}
