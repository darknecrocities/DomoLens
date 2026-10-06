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
  /** Sets window always-on-top mode for floating HUD overlay during screen recording. */
  setAlwaysOnTop?(alwaysOnTop: boolean): Promise<void>;
  /** Saves or registers a project summary on the platform. */
  saveProject?(project: ProjectSummary): Promise<void>;
  /** Starts native OS-level global mouse/keyboard capture across entire computer. */
  startGlobalInputCapture?(): Promise<void>;
  /** Stops native OS-level global mouse/keyboard capture. */
  stopGlobalInputCapture?(): Promise<void>;
  /** Subscribes to global mouse clicks outside the app anywhere on screen. */
  onGlobalClick?(callback: (payload: { x: number; y: number; norm_x: number; norm_y: number; button: string }) => void): Off;
  /** Subscribes to global mouse moves outside the app anywhere on screen. */
  onGlobalMouseMove?(callback: (payload: { x: number; y: number; norm_x: number; norm_y: number }) => void): Off;
  /** Subscribes to global keystrokes outside the app anywhere on screen. */
  onGlobalTyping?(callback: (payload: { x: number; y: number; norm_x: number; norm_y: number }) => void): Off;
  /** Saves recorded video data to permanent storage on disk. */
  saveRecordingFile?(id: string, data: number[], ext: string): Promise<string>;
  /** Shows OS-level global floating recording HUD window and minimizes studio. */
  showRecordingHud?(): Promise<void>;
  /** Hides OS-level global floating recording HUD window and restores studio. */
  hideRecordingHud?(): Promise<void>;
  /** Syncs recording state to the global HUD window. */
  syncHudState?(state: { state: string; elapsedMs: number; clicksCount: number; micEnabled: boolean }): Promise<void>;
  /** Subscribes to commands emitted from the global HUD window. */
  onHudCommand?(callback: (action: string) => void): Off;
  /** Subscribes to recording state updates inside the HUD window. */
  onHudStateSync?(callback: (state: { state: string; elapsedMs: number; clicksCount: number; micEnabled: boolean }) => void): Off;
  /** Emits a command from the HUD window to the main app. */
  sendHudCommand?(action: string): Promise<void>;
  /** Reads local media file bytes from disk into memory for infallible video playback. */
  readMediaFile?(path: string): Promise<number[]>;
  /** Returns an in-memory blob URL for a local media path. */
  readMediaBlob?(path: string): Promise<string>;
  /** Associates an in-memory blob URL with a disk path. */
  registerBlobUrl?(path: string, url: string): void;
}
