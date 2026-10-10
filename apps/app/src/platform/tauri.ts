import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open, save } from "@tauri-apps/plugin-dialog";
import { SUPPORTED_VIDEO_EXTENSIONS, baseName, type ProjectData, type ProjectSummary } from "@domolens/core";
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

export function createTauriPlatform(opts: {
  isMobile: boolean;
  isTouch: boolean;
  isMac: boolean;
  isWindows?: boolean;
  isLinux?: boolean;
}): Platform {
  return {
    kind: opts.isMobile ? "mobile" : "desktop",
    isApp: true,
    isTouch: opts.isTouch,
    isMac: opts.isMac,
    isWindows: opts.isWindows ?? false,
    isLinux: opts.isLinux ?? false,

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
    deleteProject: async (id) => {
      await invoke<void>("delete_project", { id });
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(`domolens_full_project_${id}`);
        }
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(`domolens_project_${id}`);
        }
      } catch {}
    },

    saveProject: async (project: ProjectSummary) => {
      await invoke<ProjectSummary>("save_project", { project });
    },

    saveFullProject: async (project: ProjectData) => {
      const id = project.summary.id;
      const projectJson = JSON.stringify(project);
      try {
        await invoke<void>("save_full_project", { id, projectJson });
      } catch (err) {
        console.warn("Failed saving full project to disk via Tauri command:", err);
      }
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(`domolens_full_project_${id}`, projectJson);
        }
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(`domolens_project_${id}`, projectJson);
        }
      } catch {}
    },

    loadFullProject: async (id: string): Promise<ProjectData | null> => {
      try {
        const json = await invoke<string | null>("load_full_project", { id });
        if (json) {
          const parsed = JSON.parse(json) as ProjectData;
          return parsed;
        }
      } catch (err) {
        console.warn("Failed loading full project from disk via Tauri command:", err);
      }
      try {
        if (typeof localStorage !== "undefined") {
          const stored = localStorage.getItem(`domolens_full_project_${id}`);
          if (stored) {
            return JSON.parse(stored) as ProjectData;
          }
        }
        if (typeof sessionStorage !== "undefined") {
          const storedSession = sessionStorage.getItem(`domolens_project_${id}`);
          if (storedSession) {
            return JSON.parse(storedSession) as ProjectData;
          }
        }
      } catch {}
      return null;
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
    checkAccessibilityPermission: () => invoke<boolean>("check_accessibility_permission"),
    requestAccessibilityPermission: () => invoke<boolean>("request_accessibility_permission"),

    onGlobalClick(callback) {
      return lazyOff(listen<{ x: number; y: number; norm_x: number; norm_y: number; button: string }>("global-click", (ev) => callback(ev.payload)));
    },

    onGlobalMouseUp(callback) {
      return lazyOff(listen<{ x: number; y: number; norm_x: number; norm_y: number; button: string }>("global-mouse-up", (ev) => callback(ev.payload)));
    },

    onGlobalMouseMove(callback) {
      return lazyOff(listen<{ x: number; y: number; norm_x: number; norm_y: number }>("global-mouse-move", (ev) => callback(ev.payload)));
    },

    onGlobalTyping(callback) {
      return lazyOff(listen<{ x: number; y: number; norm_x: number; norm_y: number }>("global-typing", (ev) => callback(ev.payload)));
    },

    onMobileTouch(callback) {
      return lazyOff(listen<{ x: number; y: number; event_type: string; timestamp_ms: number }>("mobile-touch", (ev) => callback(ev.payload)));
    },

    startDeviceTouchMonitor(serial, width, height) {
      return invoke<void>("start_device_touch_monitor", { serial, width, height });
    },

    stopDeviceTouchMonitor() {
      return invoke<void>("stop_device_touch_monitor");
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

    getDefaultExportPath: async (filename: string) => {
      try {
        const path = await invoke<string>("get_default_export_path", { filename });
        return path;
      } catch (err) {
        console.warn("Failed to get default export path from Tauri:", err);
        return filename;
      }
    },

    pickExportPath: async (options) => {
      try {
        const picked = await save({
          title: "Export Video As",
          defaultPath: options.defaultPath,
          filters: options.filters || [
            { name: "MP4 Video", extensions: ["mp4"] },
            { name: "WebM Video", extensions: ["webm"] },
            { name: "All Files", extensions: ["*"] },
          ],
        });
        if (typeof picked !== "string") return null;
        return picked;
      } catch (err) {
        console.warn("Save dialog failed or cancelled:", err);
        return null;
      }
    },

    saveExportedVideo: async (destinationPath: string, data: Uint8Array | number[]) => {
      if (!data || data.length === 0) {
        throw new Error("Cannot save empty video data (0 bytes)");
      }
      const payload = Array.isArray(data) ? data : Array.from(data);
      const saved = await invoke<string>("save_exported_video", {
        destinationPath,
        data: payload,
      });
      return saved;
    },

    exportSourceVideoFile: async (sourcePath: string, destinationPath: string) => {
      const saved = await invoke<string>("export_source_video_file", {
        sourcePath,
        destinationPath,
      });
      return saved;
    },

    showItemInFolder: async (path: string) => {
      try {
        await invoke<void>("show_item_in_folder", { path });
      } catch (err) {
        console.warn("show_item_in_folder failed:", err);
      }
    },

    onMenuAction: (callback) => {
      return lazyOff(listen<string>("domolens://menu-action", (ev) => callback(ev.payload)));
    },

    syncTrayRecordingState: async (isRecording: boolean, isPaused: boolean) => {
      try {
        await invoke<void>("sync_tray_recording_state", { isRecording, isPaused });
      } catch (err) {
        console.warn("Failed to sync tray recording state:", err);
      }
    },

    syncTrayRecentProjects: async (projects) => {
      try {
        await invoke<void>("sync_tray_recent_projects", { projects });
      } catch (err) {
        console.warn("Failed to sync tray recent projects:", err);
      }
    },
  };
}
