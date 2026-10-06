import type { ProjectSummary } from "@domolens/core";

export type PlatformKind = "desktop" | "mobile" | "web";

/** A file the user dropped or picked. Desktop/mobile give paths, browsers give File objects. */
export type IncomingFile =
  | { kind: "path"; path: string; name: string }
  | { kind: "file"; file: File; name: string };

export interface FileDropHandlers {
  onEnter: () => void;
  onLeave: () => void;
  onDrop: (files: IncomingFile[]) => void;
}

/** Unsubscribe function returned by listeners. */
export type Off = () => void;

/**
 * Everything the interface needs from the device.
 * Each platform (desktop, mobile, browser) provides its own version,
 * so screens never care where they're running.
 */
export interface Platform {
  kind: PlatformKind;
  /** True when running as an installed desktop or mobile app (Tauri runtime). */
  isApp: boolean;
  /** True on phones and tablets (fingers instead of a mouse). */
  isTouch: boolean;
  /** True on macOS desktop (used to leave room for the window buttons). */
  isMac: boolean;

  listProjects(): Promise<ProjectSummary[]>;
  importVideo(file: IncomingFile): Promise<ProjectSummary>;
  /** Opens the system file picker. Resolves null if the user cancels. */
  pickVideo(): Promise<IncomingFile | null>;
  renameProject(id: string, name: string): Promise<ProjectSummary>;
  deleteProject(id: string): Promise<void>;

  /** Turns a stored path into something an <img> or <video> can load. */
  mediaUrl(pathOrUrl: string): string;

  /** Called when projects change in the background (for example a cover image finished). */
  onProjectsChanged(callback: () => void): Off;
  listenForFileDrops(handlers: FileDropHandlers): Off;
}
