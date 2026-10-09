import { isTauri } from "@tauri-apps/api/core";
import { createTauriPlatform } from "./tauri";
import { createWebPlatform } from "./web";
import type { Platform } from "./types";

export type { IncomingFile, Platform, PlatformKind } from "./types";

function detect(): Platform {
  const hasWindow = typeof window !== "undefined";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const isTouch = isMobile || (hasWindow && !!window.matchMedia?.("(pointer: coarse)").matches);
  const isMac = /Macintosh|Mac OS X/i.test(ua) && !isTouch;
  const isWindows = /Windows|Win32|Win64/i.test(ua);
  const isLinux = /Linux/i.test(ua) && !isMobile && !isMac && !isWindows;

  return hasWindow && isTauri()
    ? createTauriPlatform({ isMobile, isTouch, isMac, isWindows, isLinux })
    : createWebPlatform({ isTouch, isMac, isWindows, isLinux });
}

/** The one platform object for this run of the app. */
export const platform: Platform = detect();
