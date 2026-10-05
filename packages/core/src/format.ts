import {
  DEFAULT_PROJECT_NAME,
  MAX_PROJECT_NAME_LENGTH,
  SUPPORTED_VIDEO_EXTENSIONS,
  type SupportedVideoExtension,
} from "./project";

/** Returns the lower-case extension of a file name or path, without the dot. */
export function fileExtension(fileName: string): string {
  const base = baseName(fileName);
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : "";
}

/** Last part of a path. Handles both / and \ separators. */
export function baseName(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] ?? "";
}

export function isSupportedVideo(fileName: string): boolean {
  return (SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(fileExtension(fileName));
}

export function asSupportedVideoExtension(fileName: string): SupportedVideoExtension | null {
  const ext = fileExtension(fileName);
  return isSupportedVideo(fileName) ? (ext as SupportedVideoExtension) : null;
}

/**
 * Makes a name safe and tidy for display.
 * Removes control characters, squashes spaces, trims, and limits length.
 */
export function cleanProjectName(input: string): string {
  const cleaned = input
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return DEFAULT_PROJECT_NAME;
  return Array.from(cleaned).slice(0, MAX_PROJECT_NAME_LENGTH).join("").trim();
}

/** "my-demo_final.mp4" -> "my demo final" */
export function projectNameFromFile(fileName: string): string {
  const base = baseName(fileName);
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  return cleanProjectName(stem.replace(/[-_]+/g, " "));
}

/** 42_000 -> "0:42", 725_000 -> "12:05", 3_723_000 -> "1:02:03" */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "--:--";
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${ss}`;
  return `${minutes}:${ss}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Friendly "when" text: "Just now", "5 min ago", "Yesterday", "Oct 3". */
export function formatWhen(timestamp: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - timestamp);
  const minute = 60_000;
  const hour = 60 * minute;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;

  const then = new Date(timestamp);
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const dayMs = 24 * hour;

  if (timestamp >= startOfToday) {
    const hours = Math.floor(diff / hour);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  if (timestamp >= startOfToday - dayMs) return "Yesterday";
  if (timestamp >= startOfToday - 6 * dayMs) {
    return `${Math.ceil((startOfToday - timestamp) / dayMs)} days ago`;
  }
  const label = `${MONTHS[then.getMonth()]} ${then.getDate()}`;
  return then.getFullYear() === today.getFullYear() ? label : `${label}, ${then.getFullYear()}`;
}
