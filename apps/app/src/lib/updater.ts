import { platform } from "../platform";
import { useRecorder } from "../store/recorder";
import { useUpdateStore, type UpdateCheckOptions } from "../store/update";

export type { UpdateCheckOptions };

/**
 * Checks for DomoLens updates using the reactive useUpdateStore.
 */
export async function checkForAppUpdates(options?: {
  silent?: boolean;
  autoDownload?: boolean;
}): Promise<boolean> {
  return useUpdateStore.getState().checkForUpdates(options);
}

/**
 * Initializes automated background update checks when the desktop app opens.
 * Runs shortly after launch and on a periodic schedule (every 60 minutes).
 * Suppressed during active recordings to avoid interrupting the user.
 */
export function initBackgroundAutoUpdater(): () => void {
  if (!platform.isApp) return () => {};

  const runSafeBackgroundCheck = () => {
    const recState = useRecorder.getState().state;
    if (recState === "recording" || recState === "paused" || recState === "countdown") {
      // Do not run background checks or interrupt while user is recording
      return;
    }
    void useUpdateStore.getState().checkForUpdates({ silent: true, autoDownload: false });
  };

  // Check 8 seconds after initial launch
  const initialTimer = setTimeout(() => {
    runSafeBackgroundCheck();
  }, 8000);

  // Periodic check every 60 minutes while app is running
  const periodicInterval = setInterval(() => {
    runSafeBackgroundCheck();
  }, 60 * 60 * 1000);

  return () => {
    clearTimeout(initialTimer);
    clearInterval(periodicInterval);
  };
}
