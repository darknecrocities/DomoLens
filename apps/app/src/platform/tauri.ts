import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { SUPPORTED_VIDEO_EXTENSIONS, baseName, type ProjectSummary } from "@domolens/core";
import { copy } from "../copy/en";
import type { FileDropHandlers, IncomingFile, Off, Platform } from "./types";

const blobCache = new Map<string, string>();

/** Registers an in-memory blob URL for a file path */
export function registerLocalBlobUrl(path: string, url: string): void {
  blobCache.set(path, url);
}

/** Wraps a listener that resolves its unsubscribe function later. */
function lazyOff(pending: Promise<() => void>): Off {
  let off: (() => void) | null = null;
  let cancelled = false;
  pending.then((fn) => {
    if (cancelled) fn();
    else off = fn;
  });
  return () => {
    cancelled = true;
    off?.();
  };
}

export function createTauriPlatform(opts: { isMobile: boolean; isTouch: boolean; isMac: boolean }): Platform {
  return {
    kind: opts.isMobile ? "mobile" : "desktop",
    isApp: true,
    isTouch: opts.isTouch,
    isMac: opts.isMac,

    listProjects: () => invoke<ProjectSummary[]>("list_projects"),

    async importVideo(file: IncomingFile) {
      if (file.kind !== "path") throw new Error("Desktop import needs a file path");
      return invoke<ProjectSummary>("import_video", { path: file.path });
    },

    async pickVideo() {
      const picked = await open({
        title: copy.import.pickerTitle,
        multiple: false,
        directory: false,
        filters: [{ name: copy.import.pickerFilter, extensions: [...SUPPORTED_VIDEO_EXTENSIONS] }],
      });
      if (typeof picked !== "string") return null;
      return { kind: "path", path: picked, name: baseName(picked) };
    },

    renameProject: (id, name) => invoke<ProjectSummary>("rename_project", { id, name }),
    deleteProject: (id) => invoke<void>("delete_project", { id }),

    saveProject: async (project: ProjectSummary) => {
      await invoke<ProjectSummary>("save_project", { project });
    },

    saveRecordingFile: async (id: string, data: number[], ext: string) => {
      const savedPath = await invoke<string>("save_recording_file", { id, data, ext });
      return savedPath;
    },

    registerBlobUrl: (path: string, url: string) => {
      blobCache.set(path, url);
    },

    mediaUrl: (path) => {
      if (!path) return "";
      if (
        path.startsWith("blob:") ||
        path.startsWith("data:") ||
        path.startsWith("http://") ||
        path.startsWith("https://")
      ) {
        return path;
      }
      if (blobCache.has(path)) {
        return blobCache.get(path)!;
      }
      return convertFileSrc(path);
    },

    readMediaFile: (path: string) => invoke<number[]>("read_media_file", { path }),

    readMediaBlob: async (path: string) => {
      if (!path) return "";
      if (path.startsWith("blob:") || path.startsWith("data:")) return path;
      if (blobCache.has(path)) return blobCache.get(path)!;
      try {
        const bytes = await invoke<number[]>("read_media_file", { path });
        const mime = path.endsWith(".webm") ? "video/webm" : "video/mp4";
        const blob = new Blob([new Uint8Array(bytes)], { type: mime });
        const url = URL.createObjectURL(blob);
        blobCache.set(path, url);
        return url;
      } catch (err) {
        console.warn("Falling back to convertFileSrc for media:", err);
        return convertFileSrc(path);
      }
    },

    startGlobalInputCapture: () => invoke<void>("start_global_input_capture"),
    stopGlobalInputCapture: () => invoke<void>("stop_global_input_capture"),

    onGlobalClick(callback) {
      return lazyOff(listen<{ x: number; y: number; norm_x: number; norm_y: number; button: string }>("global-click", (ev) => callback(ev.payload)));
    },

    onGlobalMouseMove(callback) {
      return lazyOff(listen<{ x: number; y: number; norm_x: number; norm_y: number }>("global-mouse-move", (ev) => callback(ev.payload)));
    },

    onGlobalTyping(callback) {
      return lazyOff(listen<{ x: number; y: number; norm_x: number; norm_y: number }>("global-typing", (ev) => callback(ev.payload)));
    },

    onProjectsChanged(callback) {
      return lazyOff(listen("projects://changed", () => callback()));
    },

    listenForFileDrops(handlers: FileDropHandlers) {
      return lazyOff(
        getCurrentWebview().onDragDropEvent((event) => {
          const payload = event.payload;
          if (payload.type === "enter") handlers.onEnter();
          else if (payload.type === "leave") handlers.onLeave();
          else if (payload.type === "drop") {
            handlers.onDrop(payload.paths.map((path) => ({ kind: "path", path, name: baseName(path) })));
          }
        }),
      );
    },

    setAlwaysOnTop(alwaysOnTop: boolean) {
      return invoke<void>("set_recording_hud_mode", { floating: alwaysOnTop });
    },

    showRecordingHud: () => invoke<void>("show_recording_hud"),
    hideRecordingHud: () => invoke<void>("hide_recording_hud"),

    syncHudState: (state) => emit("domolens://hud-state", state),

    onHudStateSync(callback) {
      return lazyOff(listen<{ state: string; elapsedMs: number; clicksCount: number; micEnabled: boolean }>("domolens://hud-state", (ev) => callback(ev.payload)));
    },

    sendHudCommand: (action) => emit("domolens://hud-command", { action }),

    onHudCommand(callback) {
      return lazyOff(listen<{ action: string }>("domolens://hud-command", (ev) => callback(ev.payload.action)));
    },
  };
}
