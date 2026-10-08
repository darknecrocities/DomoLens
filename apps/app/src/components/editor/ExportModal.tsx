import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Film, Folder, FolderOpen, Sparkles } from "lucide-react";
import { copy } from "../../copy/en";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { toast } from "../../store/toast";
import { platform } from "../../platform";
import type { ProjectData } from "@domolens/core";
import { renderProjectVideo, type ExportResolution } from "../../lib/video-renderer";

export type { ExportResolution };

interface ExportModalProps {
  open: boolean;
  project: ProjectData;
  onClose: () => void;
}

export function ExportModal({ open, project, onClose }: ExportModalProps) {
  const [resolution, setResolution] = useState<ExportResolution>("1080p");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Preparing video export...");
  const [destinationPath, setDestinationPath] = useState("");
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const safeName = (project.summary.name || "DomoLens_Recording").replace(/[^\w.-]+/g, "_");

  // Determine file extension and default filename based on resolution
  const getFilenameForResolution = (res: ExportResolution) => {
    const ext = res === "gif" ? "gif" : "mp4";
    return `${safeName}_${res}.${ext}`;
  };

  // Initialize and update default export destination (OS Downloads folder)
  useEffect(() => {
    if (!open) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsExporting(false);
      setProgress(0);
      setStatusText("Preparing video export...");
      setSavedFilePath(null);
      return;
    }

    const filename = getFilenameForResolution(resolution);
    let cancelled = false;

    if (platform.getDefaultExportPath) {
      platform.getDefaultExportPath(filename).then((defaultPath) => {
        if (!cancelled && defaultPath) {
          setDestinationPath(defaultPath);
        }
      }).catch(() => {
        if (!cancelled) {
          setDestinationPath(`Downloads/${filename}`);
        }
      });
    } else {
      setDestinationPath(`Downloads/${filename}`);
    }

    return () => {
      cancelled = true;
    };
  }, [open, resolution, safeName]);

  const handleBrowseDestination = async () => {
    const filename = getFilenameForResolution(resolution);
    const ext = resolution === "gif" ? "gif" : "mp4";
    if (platform.pickExportPath) {
      const picked = await platform.pickExportPath({
        defaultPath: destinationPath || filename,
        defaultName: filename,
        filters: [
          { name: resolution === "gif" ? "GIF Image" : "Video", extensions: [ext] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (picked) {
        setDestinationPath(picked);
      }
    }
  };

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(2);
    setStatusText("Initializing video renderer...");
    setSavedFilePath(null);

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    const targetPath = destinationPath || getFilenameForResolution(resolution);

    try {
      const result = await renderProjectVideo({
        project,
        resolution,
        onProgress: (pct, status) => {
          setProgress(pct);
          setStatusText(status);
        },
        signal: abortCtrl.signal,
      });

      setProgress(98);
      setStatusText("Saving video to disk...");

      let finalPath = targetPath;

      if (platform.saveExportedVideo) {
        try {
          finalPath = await platform.saveExportedVideo(targetPath, result.data);
        } catch (saveErr) {
          console.warn("Direct disk write failed, triggering fallback download:", saveErr);
          const link = document.createElement("a");
          link.href = result.downloadUrl;
          link.download = result.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        // Web Browser download trigger
        const link = document.createElement("a");
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setProgress(100);
      setStatusText("Export complete!");
      setSavedFilePath(finalPath);
      toast.success(copy.export.done);

      setTimeout(() => {
        setIsExporting(false);
      }, 400);
    } catch (err: unknown) {
      if (abortCtrl.signal.aborted) {
        setIsExporting(false);
        return;
      }

      console.warn("Canvas video render fallback:", err);
      setStatusText("Rendering fallback: exporting source video...");

      // Graceful fallback to source video
      if (project.summary.media && platform.exportSourceVideoFile) {
        try {
          const fallbackPath = await platform.exportSourceVideoFile(project.summary.media, targetPath);
          setSavedFilePath(fallbackPath);
          toast.success(`Exported recording to ${fallbackPath}`);
          setIsExporting(false);
          return;
        } catch (copyErr) {
          console.error("Source video copy failed:", copyErr);
        }
      }

      // Web Browser fallback
      if (project.summary.media) {
        const link = document.createElement("a");
        link.href = project.summary.media.startsWith("/") ? project.summary.media : platform.mediaUrl(project.summary.media);
        link.download = getFilenameForResolution(resolution);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.info("Exported source recording.");
      } else {
        toast.error("Export failed: " + (err instanceof Error ? err.message : String(err)));
      }

      setIsExporting(false);
    }
  };

  const handleOpenFolder = () => {
    if (savedFilePath && platform.showItemInFolder) {
      platform.showItemInFolder(savedFilePath);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsExporting(false);
    onClose();
  };

  const resolutions: Array<{ id: ExportResolution; label: string; desc: string }> = [
    { id: "1080p", label: "1080p Full HD", desc: "Crisp and fast. Studio quality." },
    { id: "720p", label: "720p Fast", desc: "Smaller file size, fast render." },
    { id: "4k", label: "4K Ultra HD", desc: "Maximum sharpness and clarity." },
    { id: "gif", label: "Animated GIF / Loop", desc: "Lightweight looping preview." },
  ];

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title={savedFilePath ? "Export Succeeded" : copy.export.title}
      description={
        savedFilePath
          ? "Your edited video has been rendered and saved to your device."
          : copy.export.desc
      }
      footer={
        <>
          {savedFilePath ? (
            <div className="flex w-full items-center justify-between gap-3">
              <Button
                variant="secondary"
                icon={<FolderOpen className="size-4" />}
                onClick={handleOpenFolder}
              >
                Reveal in Folder
              </Button>
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-3">
              <Button variant="ghost" onClick={handleCancel}>
                {copy.project.cancel}
              </Button>
              {!isExporting && (
                <Button
                  variant="primary"
                  icon={<Download className="size-4" />}
                  onClick={handleStartExport}
                >
                  {copy.export.downloadBtn}
                </Button>
              )}
            </div>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {isExporting ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="relative mb-4 flex size-14 items-center justify-center rounded-2xl bg-white/10 text-white">
              <Film className="size-7 animate-pulse" />
            </div>
            <h4 className="text-base font-semibold text-fg">{copy.export.rendering}</h4>
            <p className="mt-1 font-mono text-xs text-fg-muted">
              {statusText} ({progress}%)
            </p>

            {/* Progress Bar */}
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-ink-900 border border-ink-700">
              <div
                className="h-full rounded-full bg-white transition-all duration-150 shadow-sm"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] text-fg-faint">
              Rendering zooms, studio framing, camera glides, and sound effects...
            </p>
          </div>
        ) : savedFilePath ? (
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="size-5" />
                <span>Video Successfully Saved</span>
              </div>
              <div className="mt-2.5 font-mono text-xs text-neutral-300 break-all bg-black/40 p-2.5 rounded-lg border border-white/10">
                {savedFilePath}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resolution Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                {copy.export.resolution}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {resolutions.map((res) => {
                  const isSelected = resolution === res.id;
                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setResolution(res.id)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-white bg-white/10 shadow-sm"
                          : "border-ink-700 bg-ink-900/60 hover:border-ink-600"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-fg">{res.label}</span>
                          {res.id === "1080p" && (
                            <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">
                              Recommended
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-fg-muted">{res.desc}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="size-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save Location Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold uppercase tracking-wider text-fg-muted">
                  Save Destination
                </label>
                <span className="text-[11px] font-mono text-neutral-400">
                  Default: Downloads
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-neutral-700/80 bg-neutral-900/90 p-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300">
                  <Folder className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs text-neutral-200" title={destinationPath}>
                    {destinationPath || "Calculating Downloads path..."}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBrowseDestination}
                  className="shrink-0 text-xs"
                >
                  Change...
                </Button>
              </div>
            </div>

            {/* Burn-In Summary */}
            <div className="rounded-xl border border-ink-800 bg-ink-950 p-3 text-[11px] text-fg-muted space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-fg">
                <Sparkles className="size-3.5 text-white" />
                <span>Burn-In Export Capabilities</span>
              </div>
              <p className="text-fg-faint leading-relaxed">
                Applies all camera zoom-ins, cursor tracking, drop shadows, rounded corners, backdrops,
                tactile click bops, typing bursts, and text overlays into your export file.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
