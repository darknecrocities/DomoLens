import { platform } from "../platform";
import { toast, useToasts } from "../store/toast";

export interface UpdateCheckOptions {
  silent?: boolean;
  autoInstall?: boolean;
}

/**
 * Checks for DomoLens updates using Tauri plugin-updater.
 * In a browser environment, informs that the web app is running the latest deployment.
 */
export async function checkForAppUpdates(options?: UpdateCheckOptions): Promise<boolean> {
  const silent = options?.silent ?? false;
  const autoInstall = options?.autoInstall ?? true;

  if (!platform.isApp) {
    if (!silent) {
      toast.info("Web Studio runs the latest version automatically.");
    }
    return false;
  }

  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();

    if (!update) {
      if (!silent) {
        toast.info("DomoLens is up to date.");
      }
      return false;
    }

    const version = update.version;
    const currentVersion = update.currentVersion;
    if (!silent) {
      toast.info(`Updating DomoLens from v${currentVersion} to v${version}...`);
    }

    if (autoInstall) {
      let downloadedBytes = 0;
      await update.downloadAndInstall((event) => {
        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
        }
      });

      const { relaunch } = await import("@tauri-apps/plugin-process");
      useToasts.getState().show(`DomoLens v${version} downloaded. Relaunch to apply.`, {
        tone: "success",
        durationMs: 20000,
        action: {
          label: "Relaunch Now",
          run: () => {
            void relaunch();
          },
        },
      });
      return true;
    }

    return true;
  } catch (err) {
    console.error("Failed to check for DomoLens updates:", err);
    if (!silent) {
      toast.error("Unable to check for updates at this time.");
    }
    return false;
  }
}

/**
 * Initializes automated background update checks when the desktop app opens.
 * Runs shortly after launch and on a periodic schedule.
 */
export function initBackgroundAutoUpdater(): () => void {
  if (!platform.isApp) return () => {};

  // Check 3 seconds after app launch
  const initialTimer = setTimeout(() => {
    void checkForAppUpdates({ silent: true, autoInstall: true });
  }, 3000);

  // Periodic check every 30 minutes while open
  const periodicInterval = setInterval(() => {
    void checkForAppUpdates({ silent: true, autoInstall: true });
  }, 30 * 60 * 1000);

  return () => {
    clearTimeout(initialTimer);
    clearInterval(periodicInterval);
  };
}
