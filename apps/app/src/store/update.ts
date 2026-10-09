import { create } from "zustand";
import { platform } from "../platform";
import { toast, useToasts } from "./toast";
import { useRecorder } from "./recorder";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "ready"
  | "up-to-date"
  | "error";

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
  downloadUrl?: string;
}

export interface UpdateCheckOptions {
  silent?: boolean;
  autoDownload?: boolean;
}

export type DownloadProgressEvent =
  | { event: "Started"; data: { contentLength?: number } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" };

export interface UpdateProviderHandle {
  version: string;
  currentVersion: string;
  date?: string;
  body?: string;
  downloadAndInstall: (onEvent?: (event: DownloadProgressEvent) => void) => Promise<void>;
  close?: () => Promise<void>;
}

export interface UpdateProvider {
  check: () => Promise<UpdateProviderHandle | null>;
  relaunch: () => Promise<void>;
}

export interface UpdateState {
  status: UpdateStatus;
  isChecking: boolean;
  isModalOpen: boolean;
  updateInfo: UpdateInfo | null;
  downloadProgress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number | null;
  errorMessage: string | null;
  lastCheckedAt: number | null;
  dismissedVersion: string | null;

  // Actions
  openModal: () => void;
  closeModal: () => void;
  dismissUpdate: () => void;
  checkForUpdates: (options?: { silent?: boolean; autoDownload?: boolean }) => Promise<boolean>;
  startDownload: () => Promise<boolean>;
  relaunchApp: () => Promise<void>;
  reset: () => void;
}

// Module-level reference to the active update handle so download can be triggered on demand
let activeUpdateHandle: UpdateProviderHandle | null = null;
let customProvider: UpdateProvider | null = null;

/**
 * Configure a custom update provider (for test suites and simulation).
 */
export function setUpdateProvider(provider: UpdateProvider | null) {
  customProvider = provider;
  activeUpdateHandle = null;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

/**
 * Compares two SemVer strings (e.g. "0.1.46" vs "0.1.43").
 * Returns > 0 if a > b, < 0 if a < b, and 0 if equal.
 */
export function compareSemVer(a: string, b: string): number {
  const cleanA = a.replace(/^v/, "").split("-")[0] ?? "";
  const cleanB = b.replace(/^v/, "").split("-")[0] ?? "";
  const partsA = cleanA.split(".").map((n) => parseInt(n, 10) || 0);
  const partsB = cleanB.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const valA = partsA[i] ?? 0;
    const valB = partsB[i] ?? 0;
    if (valA > valB) return 1;
    if (valA < valB) return -1;
  }
  return 0;
}

/**
 * Detects current installed app version from Tauri runtime or falls back gracefully.
 */
export async function getCurrentAppVersion(): Promise<string> {
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    const v = await getVersion();
    if (v) return v;
  } catch {
    // Fallback when outside Tauri shell or during unit tests
  }
  return "0.1.9";
}

/**
 * Fallback update checker that directly queries GitHub Releases REST API.
 * Ensures users on Windows, Mac, and Linux can always check for updates even if
 * the static latest.json manifest is momentarily missing or experiencing 404s.
 */
export async function checkGitHubReleasesFallback(currentVersion: string): Promise<{
  isHandled: boolean;
  status?: "up-to-date" | "available";
  updateInfo?: UpdateInfo;
  error?: string;
}> {
  try {
    const res = await fetch("https://api.github.com/repos/darknecrocities/DomoLens/releases/latest", {
      headers: {
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      throw new Error(`GitHub Releases HTTP ${res.status}`);
    }

    const releaseData = (await res.json()) as {
      tag_name?: string;
      name?: string;
      body?: string;
      published_at?: string;
      html_url?: string;
      assets?: Array<{ name: string; browser_download_url: string; size: number }>;
    };

    const tagName = releaseData.tag_name;
    if (!tagName) {
      return { isHandled: false };
    }

    const remoteVersion = tagName.replace(/^v/, "");

    // If current version >= latest remote tag, user is completely up-to-date
    if (compareSemVer(currentVersion, remoteVersion) >= 0) {
      return {
        isHandled: true,
        status: "up-to-date",
      };
    }

    // A newer version is available on GitHub Releases
    const assets = releaseData.assets || [];
    let downloadUrl = releaseData.html_url || "https://github.com/darknecrocities/DomoLens/releases/latest";

    // Detect user OS for direct installer asset download link
    const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
    const isWin = ua.includes("win");
    const isMac = ua.includes("mac");
    const isLinux = ua.includes("linux");

    if (isWin) {
      const winAsset = assets.find((a) => a.name.includes("Windows-Setup.exe") || a.name.endsWith(".exe"));
      if (winAsset) downloadUrl = winAsset.browser_download_url;
    } else if (isMac) {
      const macAsset = assets.find(
        (a) => a.name.includes("Universal.dmg") || a.name.includes("macOS.dmg") || a.name.endsWith(".dmg")
      );
      if (macAsset) downloadUrl = macAsset.browser_download_url;
    } else if (isLinux) {
      const linuxAsset = assets.find((a) => a.name.endsWith(".AppImage") || a.name.endsWith(".deb"));
      if (linuxAsset) downloadUrl = linuxAsset.browser_download_url;
    }

    return {
      isHandled: true,
      status: "available",
      updateInfo: {
        version: remoteVersion,
        currentVersion,
        date: releaseData.published_at ? new Date(releaseData.published_at).toLocaleDateString() : undefined,
        body: releaseData.body || releaseData.name || `DomoLens ${tagName}`,
        downloadUrl,
      },
    };
  } catch (err) {
    return {
      isHandled: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: "idle",
  isChecking: false,
  isModalOpen: false,
  updateInfo: null,
  downloadProgress: 0,
  downloadedBytes: 0,
  totalBytes: null,
  errorMessage: null,
  lastCheckedAt: null,
  dismissedVersion: null,

  openModal: () => {
    set({ isModalOpen: true });
  },

  closeModal: () => {
    set({ isModalOpen: false });
  },

  dismissUpdate: () => {
    const current = get().updateInfo?.version ?? null;
    set({
      dismissedVersion: current,
      isModalOpen: false,
    });
  },

  checkForUpdates: async (options) => {
    const silent = options?.silent ?? false;
    const autoDownload = options?.autoDownload ?? false;

    // 1. Anti-spam / non-intrusive guard: DO NOT interrupt an active recording session!
    const recState = useRecorder.getState().state;
    if (recState === "recording" || recState === "paused" || recState === "countdown") {
      return false;
    }

    // 2. Prevent overlapping / spammy requests while a check is already underway
    if (get().isChecking) {
      return false;
    }

    // 3. If currently downloading, just open the modal to display the live progress bar
    if (get().status === "downloading") {
      if (!silent) {
        set({ isModalOpen: true });
      }
      return true;
    }

    // 4. If update is already downloaded and ready to relaunch
    if (get().status === "ready") {
      if (!silent) {
        set({ isModalOpen: true });
      }
      return true;
    }

    set({ isChecking: true, errorMessage: null });
    if (!silent) {
      set({ isModalOpen: true });
    }

    // 5. Web environment (browser): inform that web runs the latest deployment
    if (!platform.isApp && !customProvider) {
      set({
        status: "up-to-date",
        isChecking: false,
        lastCheckedAt: Date.now(),
        updateInfo: null,
      });
      if (!silent) {
        toast.info("Web Studio runs the latest version automatically.");
      }
      return false;
    }

    try {
      let update: UpdateProviderHandle | null = null;

      if (customProvider) {
        update = await customProvider.check();
      } else {
        try {
          const { check } = await import("@tauri-apps/plugin-updater");
          const tauriUpdate = await check();
          if (tauriUpdate) {
            update = {
              version: tauriUpdate.version,
              currentVersion: tauriUpdate.currentVersion,
              date: tauriUpdate.date,
              body: tauriUpdate.body,
              downloadAndInstall: (cb) => tauriUpdate.downloadAndInstall(cb),
              close: () => tauriUpdate.close(),
            };
          }
        } catch (tauriErr) {
          console.warn("Tauri updater check error, attempting GitHub Releases fallback:", tauriErr);
          const currentVersion = await getCurrentAppVersion();
          const fallback = await checkGitHubReleasesFallback(currentVersion);

          if (fallback.isHandled) {
            set({ lastCheckedAt: Date.now(), isChecking: false });

            if (fallback.status === "up-to-date") {
              activeUpdateHandle = null;
              set({
                status: "up-to-date",
                updateInfo: null,
              });
              if (!silent) {
                toast.info("DomoLens is up to date.");
              }
              return false;
            }

            if (fallback.status === "available" && fallback.updateInfo) {
              activeUpdateHandle = null;
              set({
                status: "available",
                updateInfo: fallback.updateInfo,
              });

              if (autoDownload) {
                void get().startDownload();
              } else if (!silent) {
                set({ isModalOpen: true });
              } else if (get().dismissedVersion !== fallback.updateInfo.version) {
                useToasts.getState().show(`DomoLens v${fallback.updateInfo.version} is available.`, {
                  tone: "neutral",
                  durationMs: 12000,
                  action: {
                    label: "View Update",
                    run: () => {
                      set({ isModalOpen: true });
                    },
                  },
                });
              }
              return true;
            }
          }

          // If fallback could not resolve (e.g. completely offline), throw to user-friendly handler
          throw tauriErr;
        }
      }

      set({ lastCheckedAt: Date.now(), isChecking: false });

      if (!update) {
        activeUpdateHandle = null;
        set({
          status: "up-to-date",
          updateInfo: null,
        });
        if (!silent) {
          toast.info("DomoLens is up to date.");
        }
        return false;
      }

      activeUpdateHandle = update;
      const info: UpdateInfo = {
        version: update.version,
        currentVersion: update.currentVersion,
        date: update.date,
        body: update.body,
      };

      set({
        status: "available",
        updateInfo: info,
      });

      if (autoDownload) {
        void get().startDownload();
      } else if (!silent) {
        set({ isModalOpen: true });
      } else {
        // Background check found an update!
        // Anti-spam guard: Do not spam user if they previously dismissed this version
        if (get().dismissedVersion !== info.version) {
          useToasts.getState().show(`DomoLens v${info.version} is available.`, {
            tone: "neutral",
            durationMs: 12000,
            action: {
              label: "View Update",
              run: () => {
                set({ isModalOpen: true });
              },
            },
          });
        }
      }

      return true;
    } catch (err) {
      console.error("Failed to check for DomoLens updates:", err);
      const rawMsg = err instanceof Error ? err.message : String(err);
      const userMessage =
        rawMsg.includes("Could not fetch a valid release JSON") ||
        rawMsg.includes("Failed to fetch") ||
        rawMsg.includes("Network")
          ? "Unable to reach update servers. Please check your network connection or check GitHub Releases directly."
          : `Unable to check for updates: ${rawMsg}`;

      set({
        status: "error",
        isChecking: false,
        errorMessage: userMessage,
      });

      if (!silent) {
        toast.error("Unable to check for updates at this time.");
      }
      return false;
    }
  },

  startDownload: async () => {
    const state = get();
    if (state.status === "downloading") return false;

    // Fallback mode: No native Tauri updater bundle handle, but fallback download URL is available
    if (!activeUpdateHandle) {
      const url = state.updateInfo?.downloadUrl || "https://github.com/darknecrocities/DomoLens/releases/latest";
      if (typeof window !== "undefined") {
        window.open(url, "_blank");
      }
      toast.info("Opening DomoLens installer download from GitHub Releases...");
      return true;
    }

    set({
      status: "downloading",
      downloadProgress: 0,
      downloadedBytes: 0,
      totalBytes: null,
      errorMessage: null,
    });

    try {
      let total = 0;
      let accumulated = 0;

      await activeUpdateHandle.downloadAndInstall((event) => {
        if (event.event === "Started") {
          total = event.data?.contentLength ?? 0;
          set({
            totalBytes: total > 0 ? total : null,
            downloadProgress: 0,
          });
        } else if (event.event === "Progress") {
          accumulated += event.data.chunkLength;
          let pct = 0;
          if (total > 0) {
            pct = Math.min(Math.round((accumulated / total) * 100), 99);
          } else {
            // If server didn't provide contentLength, estimate based on ~42MB standard bundle size
            pct = Math.min(Math.round((accumulated / (42 * 1024 * 1024)) * 100), 95);
          }
          set({
            downloadedBytes: accumulated,
            downloadProgress: pct,
          });
        } else if (event.event === "Finished") {
          set({
            downloadProgress: 100,
            downloadedBytes: total > 0 ? total : accumulated,
            status: "ready",
          });
        }
      });

      set({
        status: "ready",
        downloadProgress: 100,
      });

      const ver = get().updateInfo?.version || "";
      useToasts.getState().show(`DomoLens v${ver} downloaded. Relaunch to apply.`, {
        tone: "success",
        durationMs: 20000,
        action: {
          label: "Relaunch Now",
          run: () => {
            void get().relaunchApp();
          },
        },
      });

      return true;
    } catch (err) {
      console.error("Failed to download and install update:", err);
      const message = err instanceof Error ? err.message : String(err);
      set({
        status: "error",
        errorMessage: `Download failed: ${message}`,
      });
      toast.error("Download failed. You can retry later.");
      return false;
    }
  },

  relaunchApp: async () => {
    if (customProvider) {
      await customProvider.relaunch();
      return;
    }

    if (!platform.isApp) return;

    try {
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (err) {
      console.error("Failed to relaunch application automatically:", err);
      toast.error("Failed to relaunch automatically. Please restart DomoLens manually.");
    }
  },

  reset: () => {
    activeUpdateHandle = null;
    set({
      status: "idle",
      isChecking: false,
      isModalOpen: false,
      updateInfo: null,
      downloadProgress: 0,
      downloadedBytes: 0,
      totalBytes: null,
      errorMessage: null,
      lastCheckedAt: null,
      dismissedVersion: null,
    });
  },
}));
