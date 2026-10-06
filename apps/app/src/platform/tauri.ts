import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open } from "@tauri-apps/plugin-dialog";
import { SUPPORTED_VIDEO_EXTENSIONS, baseName, type ProjectSummary } from "@domolens/core";
import { copy } from "../copy/en";
import type { FileDropHandlers, IncomingFile, Off, Platform } from "./types";

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

    mediaUrl: (path) => convertFileSrc(path),

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
  };
}
