import {
  SUPPORTED_VIDEO_EXTENSIONS,
  cleanProjectName,
  projectNameFromFile,
  type ProjectData,
  type ProjectSummary,
} from "@domolens/core";
import type { FileDropHandlers, IncomingFile, Platform } from "./types";

/**
 * Browser version of the platform.
 *
 * Used when the interface runs in a normal browser: for quick design work and
 * for automated tests. Projects live in memory only. Add `?demo` to the URL to
 * start with a few sample projects.
 */

const projects = new Map<string, ProjectSummary>();
const fullProjects = new Map<string, ProjectData>();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

function newId() {
  return crypto.randomUUID();
}

/** Grabs a frame from a video to use as its cover image. */
function makeCover(url: string): Promise<{ thumbnail: string | null; durationMs: number | null; width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve({ thumbnail: null, durationMs: null, width: null, height: null });
      return;
    }
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.src = url;

    const done = (thumbnail: string | null) => {
      resolve({
        thumbnail,
        durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : null,
        width: video.videoWidth || null,
        height: video.videoHeight || null,
      });
      video.removeAttribute("src");
      video.load();
    };

    const timer = window.setTimeout(() => done(null), 8000);
    video.addEventListener("error", () => {
      window.clearTimeout(timer);
      done(null);
    });
    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(1, (video.duration || 0) / 3);
    });
    video.addEventListener("seeked", () => {
      window.clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        const scale = 480 / (video.videoWidth || 480);
        canvas.width = 480;
        canvas.height = Math.round((video.videoHeight || 270) * scale);
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        done(canvas.toDataURL("image/jpeg", 0.8));
      } catch {
        done(null);
      }
    });
  });
}

/** A soft gradient cover for demo projects. */
function demoCover(hueA: number, hueB: number, label: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const g = ctx.createLinearGradient(0, 0, 480, 270);
  g.addColorStop(0, `hsl(${hueA} 70% 55%)`);
  g.addColorStop(1, `hsl(${hueB} 60% 30%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 480, 270);
  ctx.fillStyle = "rgba(22,23,26,0.85)";
  ctx.beginPath();
  ctx.roundRect(60, 40, 360, 190, 14);
  ctx.fill();
  ctx.fillStyle = "rgba(242,242,243,0.9)";
  ctx.font = "600 22px Inter Variable, sans-serif";
  ctx.fillText(label, 84, 90);
  ctx.fillStyle = "rgba(160,163,171,0.6)";
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.roundRect(84, 112 + i * 24, 220 - i * 30, 10, 5);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(360, 180, 12, 0, Math.PI * 2);
  ctx.fill();
  return canvas.toDataURL("image/jpeg", 0.85);
}

function seedDemo() {
  if (projects.size > 0) return;
  const now = Date.now();
  const samples: Array<[string, number, number, number, number]> = [
    ["Sign up flow", 24, 350, 42_000, 5 * 60_000],
    ["Dashboard tour", 200, 260, 96_000, 26 * 3_600_000],
    ["Settings walkthrough", 280, 20, 61_000, 4 * 24 * 3_600_000],
  ];
  for (const [name, a, b, durationMs, age] of samples) {
    const id = newId();
    projects.set(id, {
      id,
      name,
      source: "recording",
      createdAt: now - age,
      updatedAt: now - age,
      durationMs,
      width: 1920,
      height: 1080,
      thumbnail: demoCover(a, b, name),
      media: null,
    });
  }
}

const VIDEO_ACCEPT = SUPPORTED_VIDEO_EXTENSIONS.map((ext) => `.${ext}`).join(",");

export function createWebPlatform(opts: {
  isTouch: boolean;
  isMac: boolean;
  isWindows?: boolean;
  isLinux?: boolean;
}): Platform {
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo")) {
    seedDemo();
  }

  return {
    kind: "web",
    isApp: false,
    isTouch: opts.isTouch,
    isMac: opts.isMac,
    isWindows: opts.isWindows ?? false,
    isLinux: opts.isLinux ?? false,

    async listProjects() {
      return [...projects.values()].sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async importVideo(file: IncomingFile) {
      if (file.kind !== "file") throw new Error("Browser import needs a File");
      const media =
        typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(file.file)
          : `mock://${file.name}`;
      const now = Date.now();
      const id = newId();
      const summary: ProjectSummary = {
        id,
        name: projectNameFromFile(file.name),
        source: "import",
        createdAt: now,
        updatedAt: now,
        durationMs: null,
        width: null,
        height: null,
        thumbnail: null,
        media,
      };
      projects.set(id, summary);

      // Cover image is made in the background, like on desktop.
      void makeCover(media).then((info) => {
        const current = projects.get(id);
        if (!current) return;
        projects.set(id, { ...current, ...info });
        notify();
      });
      return summary;
    },

    pickVideo() {
      return new Promise<IncomingFile | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = `video/*,${VIDEO_ACCEPT}`;
        input.addEventListener("change", () => {
          const file = input.files?.[0];
          resolve(file ? { kind: "file", file, name: file.name } : null);
        });
        input.addEventListener("cancel", () => resolve(null));
        input.click();
      });
    },

    async renameProject(id, name) {
      const current = projects.get(id);
      if (!current) throw new Error("Project not found");
      const next = { ...current, name: cleanProjectName(name), updatedAt: Date.now() };
      projects.set(id, next);
      return next;
    },

    async deleteProject(id) {
      const current = projects.get(id);
      if (current?.media?.startsWith("blob:")) URL.revokeObjectURL(current.media);
      projects.delete(id);
      fullProjects.delete(id);
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(`domolens_full_project_${id}`);
        }
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(`domolens_project_${id}`);
        }
      } catch {}
      notify();
    },

    async saveProject(project: ProjectSummary) {
      projects.set(project.id, project);
      notify();
    },

    async saveFullProject(project: ProjectData) {
      const id = project.summary.id;
      projects.set(id, project.summary);
      fullProjects.set(id, project);
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(`domolens_full_project_${id}`, JSON.stringify(project));
        }
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(`domolens_project_${id}`, JSON.stringify(project));
        }
      } catch {}
      notify();
    },

    async loadFullProject(id: string): Promise<ProjectData | null> {
      if (fullProjects.has(id)) {
        return JSON.parse(JSON.stringify(fullProjects.get(id)!)) as ProjectData;
      }
      try {
        if (typeof localStorage !== "undefined") {
          const stored = localStorage.getItem(`domolens_full_project_${id}`);
          if (stored) {
            const parsed = JSON.parse(stored) as ProjectData;
            fullProjects.set(id, parsed);
            return parsed;
          }
        }
        if (typeof sessionStorage !== "undefined") {
          const storedSession = sessionStorage.getItem(`domolens_project_${id}`);
          if (storedSession) {
            const parsed = JSON.parse(storedSession) as ProjectData;
            fullProjects.set(id, parsed);
            return parsed;
          }
        }
      } catch {}
      return null;
    },

    mediaUrl: (url) => url,
    registerBlobUrl: () => {},

    onProjectsChanged(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },

    listenForFileDrops(handlers: FileDropHandlers) {
      if (typeof window === "undefined") return () => {};
      // Count enter/leave pairs so moving over child elements doesn't flicker.
      let depth = 0;
      const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

      const onEnter = (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        if (depth++ === 0) handlers.onEnter();
      };
      const onOver = (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      };
      const onLeave = (e: DragEvent) => {
        if (!hasFiles(e)) return;
        if (--depth <= 0) {
          depth = 0;
          handlers.onLeave();
        }
      };
      const onDrop = (e: DragEvent) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth = 0;
        const files = Array.from(e.dataTransfer?.files ?? []);
        handlers.onDrop(files.map((file) => ({ kind: "file", file, name: file.name })));
      };

      window.addEventListener("dragenter", onEnter);
      window.addEventListener("dragover", onOver);
      window.addEventListener("dragleave", onLeave);
      window.addEventListener("drop", onDrop);
      return () => {
        window.removeEventListener("dragenter", onEnter);
        window.removeEventListener("dragover", onOver);
        window.removeEventListener("dragleave", onLeave);
        window.removeEventListener("drop", onDrop);
      };
    },

    setAlwaysOnTop() {
      return Promise.resolve();
    },

    getDefaultExportPath: async (filename: string) => {
      return `Downloads/${filename}`;
    },

    pickExportPath: async (options) => {
      return options.defaultPath || `Downloads/export.mp4`;
    },

    saveExportedVideo: async (destinationPath: string, data: Uint8Array | number[]) => {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      if (bytes.length === 0) {
        throw new Error("Cannot save empty video data (0 bytes)");
      }
      const mime = destinationPath.endsWith(".webm")
        ? "video/webm"
        : destinationPath.endsWith(".mov")
        ? "video/quicktime"
        : "video/mp4";
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = destinationPath.split(/[/\\]/).pop() || "export.mp4";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return destinationPath;
    },

    exportSourceVideoFile: async (_sourcePath: string, destinationPath: string) => {
      return destinationPath;
    },

    showItemInFolder: async () => {},
    onMenuAction: () => () => {},
    syncTrayRecordingState: async () => {},
    syncTrayRecentProjects: async () => {},
  };
}
