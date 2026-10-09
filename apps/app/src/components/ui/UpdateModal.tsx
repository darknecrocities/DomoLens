import { useMemo } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  Minimize2,
  RefreshCw,
  RotateCw,
  Sparkles,
} from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { useUpdateStore, formatBytes } from "../../store/update";

export function UpdateModal() {
  const {
    status,
    isModalOpen,
    isChecking,
    updateInfo,
    downloadProgress,
    downloadedBytes,
    totalBytes,
    errorMessage,
    closeModal,
    dismissUpdate,
    checkForUpdates,
    startDownload,
    relaunchApp,
  } = useUpdateStore();

  const formattedTotal = useMemo(() => {
    return totalBytes ? formatBytes(totalBytes) : null;
  }, [totalBytes]);

  const formattedDownloaded = useMemo(() => {
    return formatBytes(downloadedBytes);
  }, [downloadedBytes]);

  if (!isModalOpen) return null;

  return (
    <Modal
      open={isModalOpen}
      onClose={status === "downloading" ? closeModal : dismissUpdate}
      title="Software Update"
      size="md"
      showCloseButton={status !== "checking"}
    >
      <div className="space-y-5">
        {/* State 1: Checking for updates */}
        {isChecking && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl shadow-lg">
              <RefreshCw className="size-6 text-white animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-white">Checking for Updates...</h3>
            <p className="mt-1.5 text-xs text-neutral-400">
              Contacting DomoLens release servers to check for the latest version.
            </p>
          </div>
        )}

        {/* State 2: Up to Date */}
        {!isChecking && status === "up-to-date" && (
          <div className="flex flex-col items-center justify-center py-5 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-xl shadow-[0_0_24px_rgba(16,185,129,0.15)]">
              <CheckCircle2 className="size-7 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-white">DomoLens is Up to Date</h3>
            <p className="mt-1.5 text-xs text-neutral-300">
              You are running the latest version of DomoLens Studio.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-neutral-400">
              <span>Current version:</span>
              <span className="font-semibold text-white">
                v{updateInfo?.currentVersion || "0.1.9"}
              </span>
            </div>
            <div className="mt-6 w-full flex justify-end">
              <Button variant="primary" onClick={closeModal} className="w-full sm:w-auto">
                Done
              </Button>
            </div>
          </div>
        )}

        {/* State 3: Update Available */}
        {!isChecking && status === "available" && updateInfo && (
          <div>
            {/* Version comparison card */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Installed
                </div>
                <div className="text-sm font-semibold text-neutral-300">
                  v{updateInfo.currentVersion}
                </div>
              </div>

              <div className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white">
                <ArrowRight className="size-4" />
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-mono uppercase font-bold text-white">
                  <Sparkles className="size-3" />
                  <span>Available</span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  v{updateInfo.version}
                </div>
              </div>
            </div>

            {/* Release notes if present */}
            {updateInfo.body && (
              <div className="mt-4">
                <div className="mb-1.5 text-xs font-semibold text-neutral-300">Release Notes</div>
                <div className="max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {updateInfo.body}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={dismissUpdate}>
                Later
              </Button>
              <Button
                variant="primary"
                onClick={() => void startDownload()}
                className="gap-2 bg-white hover:bg-neutral-200 text-black font-semibold border-0 shadow-lg"
              >
                <Download className="size-4" />
                <span>{updateInfo.downloadUrl ? "Download Installer" : "Download & Install"}</span>
              </Button>
            </div>
          </div>
        )}

        {/* State 4: Downloading (With Live Progress Bar) */}
        {!isChecking && status === "downloading" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-sky-400 animate-ping" />
                <span className="text-sm font-semibold text-white">
                  Downloading DomoLens v{updateInfo?.version || ""}...
                </span>
              </div>
              <span className="font-mono text-sm font-bold text-sky-400">
                {downloadProgress}%
              </span>
            </div>

            {/* Animated Gradient Progress Bar */}
            <div className="relative h-3 w-full overflow-hidden rounded-full border border-white/10 bg-white/5 p-[1px]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-neutral-400 via-sky-400 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                style={{ width: `${Math.max(downloadProgress, 3)}%` }}
              />
            </div>

            {/* Download Metrics (Bytes & Status) */}
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>{formattedDownloaded}</span>
              <span>
                {formattedTotal ? `/ ${formattedTotal}` : "downloading..."}
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              The update is downloading in the background. You can minimize this dialog and
              continue recording or editing without interruption.
            </p>

            <div className="mt-5 flex justify-end">
              <Button
                variant="ghost"
                onClick={closeModal}
                className="gap-1.5 text-xs text-neutral-300 hover:text-white"
              >
                <Minimize2 className="size-3.5" />
                <span>Run in Background</span>
              </Button>
            </div>
          </div>
        )}

        {/* State 5: Update Ready to Install */}
        {!isChecking && status === "ready" && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15 backdrop-blur-xl shadow-[0_0_28px_rgba(16,185,129,0.25)]">
              <Sparkles className="size-7 text-emerald-300" />
            </div>
            <h3 className="text-base font-semibold text-white">Update Downloaded & Ready</h3>
            <p className="mt-1.5 text-xs text-neutral-300 max-w-xs leading-relaxed">
              DomoLens v{updateInfo?.version || ""} is verified and ready to install. Relaunch now to
              apply the update.
            </p>

            {/* 100% Complete Progress Bar Indicator */}
            <div className="mt-4 w-full">
              <div className="relative h-2 w-full overflow-hidden rounded-full border border-emerald-500/20 bg-emerald-500/10">
                <div className="h-full w-full rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] font-mono text-neutral-400">
                <span>Verified package</span>
                <span className="text-emerald-400 font-semibold">100% Ready</span>
              </div>
            </div>

            <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeModal}>
                Later
              </Button>
              <Button
                variant="primary"
                onClick={() => void relaunchApp()}
                className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold border-0 shadow-lg shadow-emerald-500/20"
              >
                <RotateCw className="size-4" />
                <span>Relaunch Now</span>
              </Button>
            </div>
          </div>
        )}

        {/* State 6: Error */}
        {!isChecking && status === "error" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-200">
              <AlertTriangle className="size-5 shrink-0 text-amber-400 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-semibold text-amber-300">Update Check Notice</p>
                <p className="mt-1 text-amber-200/90">
                  {errorMessage || "Unable to reach update servers. Please check your network connection."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>You can also check releases on GitHub directly.</span>
              <a
                href="https://github.com/darknecrocities/DomoLens/releases"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-white hover:text-neutral-300 underline underline-offset-2"
              >
                <span>Releases</span>
                <ExternalLink className="size-3" />
              </a>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={closeModal}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                onClick={() => void checkForUpdates({ silent: false })}
                className="gap-2"
              >
                <RefreshCw className="size-3.5" />
                <span>Retry Check</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
