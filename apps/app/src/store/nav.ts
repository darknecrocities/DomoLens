import { create } from "zustand";
import { platform } from "../platform";

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
  // In a browser, default to the landing page. In the downloaded desktop app, default directly to OpenScreen.
  screen: platform.isApp ? { name: "home" } : { name: "landing" },
  direction: 1,
  go: (screen) => {
    // If running inside the desktop app, prevent navigating to the landing page.
    if (platform.isApp && screen.name === "landing") {
      set({ screen: { name: "home" }, direction: 1 });
      return;
    }
    set({ screen, direction: 1 });
  },
  back: () => set({ screen: { name: "home" }, direction: -1 }),
}));

/** Stable key for animating between screens. */
export function screenKey(screen: Screen): string {
  if (screen.name === "project") return `project:${screen.id}`;
  if (screen.name === "editor") return `editor:${screen.id}`;
  return screen.name;
}
