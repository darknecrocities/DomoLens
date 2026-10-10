import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Film, Folder, FolderOpen, Monitor, Smartphone, Sparkles, Square, Video } from "lucide-react";
import { copy } from "../../copy/en";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { toast } from "../../store/toast";
import { platform } from "../../platform";
import { useEditor } from "../../store/editor";
import type { ProjectData } from "@domolens/core";
import {
  renderProjectVideo,
  type ExportResolution,
  type ExportFormat,
  type CanvasAspectRatio,
} from "../../lib/video-renderer";

export type { ExportResolution, ExportFormat, CanvasAspectRatio };

interface ExportModalProps {
  open: boolean;
  project: ProjectData;
  onClose: () => void;
}

export function ExportModal({ open, project, onClose }: ExportModalProps) {
  const [resolution, setResolution] = useState<ExportResolution>("1080p");
  // Default format based on hardware platform: .mov on macOS, .mp4 on Windows/Linux
  const defaultFormat: ExportFormat = platform.isMac ? "mov" : "mp4";
  const [format, setFormat] = useState<ExportFormat>(defaultFormat);
  // Canvas aspect ratio: defaults to whole canvas 16:9 widescreen
  const [canvasAspectRatio, setCanvasAspectRatio] = useState<CanvasAspectRatio>("16:9");

  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Preparing video export...");
  const [destinationPath, setDestinationPath] = useState("");
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [projectName, setProjectName] = useState(project.summary.name || "DomoLens_Recording");
  const renameProject = useEditor((s) => s.renameProject);

  useEffect(() => {
    if (open) {
      setProjectName(project.summary.name || "DomoLens_Recording");
      setCanvasAspectRatio("16:9");
    }
  }, [open, project.summary.name]);

  const safeName = (projectName || "DomoLens_Recording").replace(/[^\w.-]+/g, "_");

  // Determine file extension and default filename based on resolution & format
  const getFilenameForExport = (res: ExportResolution, fmt: ExportFormat, name = safeName) => {
    const ext = res === "gif" ? "gif" : fmt;
    return `${name}_${res}.${ext}`;
  };

  const handleProjectNameChange = (val: string) => {
    setProjectName(val);
    const trimmed = val.trim();
    if (trimmed) {
      renameProject(trimmed);
      const newSafeName = trimmed.replace(/[^\w.-]+/g, "_");
      const newFilename = getFilenameForExport(resolution, format, newSafeName);
      if (destinationPath) {
        const separator = destinationPath.includes("\\") ? "\\" : "/";
        const parts = destinationPath.split(/[/\\]/);
        parts[parts.length - 1] = newFilename;
        setDestinationPath(parts.join(separator));
      }
    }
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

    const filename = getFilenameForExport(resolution, format);
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
  }, [open, resolution, format, safeName]);

  const handleFormatChange = (newFormat: ExportFormat) => {
    setFormat(newFormat);
    if (destinationPath) {
      const updated = destinationPath.replace(/\.(mp4|mov|webm|gif)$/i, `.${newFormat}`);
      setDestinationPath(updated);
    }
  };

  const handleResolutionChange = (newRes: ExportResolution) => {
    setResolution(newRes);
    const ext = newRes === "gif" ? "gif" : format;
    if (destinationPath) {
      const updated = destinationPath.replace(/\.(mp4|mov|webm|gif)$/i, `.${ext}`);
      setDestinationPath(updated);
    }
  };

  const handleBrowseDestination = async () => {
    const activeExt = resolution === "gif" ? "gif" : format;
    const filename = getFilenameForExport(resolution, format);

    const filterName =
      activeExt === "mov"
        ? "QuickTime Movie (*.mov)"
        : activeExt === "mp4"
        ? "MP4 Video (*.mp4)"
        : activeExt === "webm"
        ? "WebM Video (*.webm)"
        : "GIF Image (*.gif)";

    if (platform.pickExportPath) {
      const picked = await platform.pickExportPath({
        defaultPath: destinationPath || filename,
        defaultName: filename,
        filters: [
          { name: filterName, extensions: [activeExt] },
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

    const activeFormat = resolution === "gif" ? "gif" : format;
    const targetPath = destinationPath || getFilenameForExport(resolution, activeFormat);

    try {
      const result = await renderProjectVideo({
        project,
        resolution,
        format: activeFormat,
        canvasAspectRatio,
        onProgress: (pct, status) => {
          setProgress(pct);
          setStatusText(status);
        },
        signal: abortCtrl.signal,
      });

      if (!result.data || result.data.length === 0) {
        throw new Error("Rendered video data is empty (0 bytes)");
      }

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
      setStatusText("Rendering fallback: exporting source video with compatibility...");

      // Graceful fallback to source video copy / remux
      if (project.summary.media && platform.exportSourceVideoFile) {
        try {
          const fallbackPath = await platform.exportSourceVideoFile(project.summary.media, targetPath);
          setSavedFilePath(fallbackPath);
          toast.success(`Exported video to ${fallbackPath}`);
          setIsExporting(false);
          return;
        } catch (copyErr) {
          console.error("Source video copy/remux failed:", copyErr);
        }
      }

      // Web Browser fallback
      if (project.summary.media) {
        const link = document.createElement("a");
        link.href = project.summary.media.startsWith("/") ? project.summary.media : platform.mediaUrl(project.summary.media);
        link.download = getFilenameForExport(resolution, activeFormat);
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

  const formats: Array<{
    id: ExportFormat;
    label: string;
    desc: string;
    badge?: string;
  }> = [
    {
      id: "mov",
      label: "QuickTime (.mov)",
      desc: "Native Apple format. 100% compatible with Mac QuickTime Player & Final Cut Pro.",
      badge: platform.isMac ? "Default on Mac" : undefined,
    },
    {
      id: "mp4",
      label: "Universal MP4 (.mp4)",
      desc: "Universal standard. Compatible with Windows Media Player, Mac, Web, & mobile.",
      badge: !platform.isMac ? "Default on Windows" : "Universal",
    },
    {
      id: "webm",
      label: "WebM Video (.webm)",
      desc: "High-efficiency open web video container.",
    },
  ];

  const resolutions: Array<{ id: ExportResolution; label: string; desc: string }> = [
    { id: "1080p", label: "1080p Full HD", desc: "Crisp and fast. Studio quality." },
    { id: "720p", label: "720p Fast", desc: "Smaller file size, fast render." },
    { id: "4k", label: "4K Ultra HD", desc: "Maximum sharpness and clarity." },
    { id: "gif", label: "Animated GIF / Loop", desc: "Lightweight looping preview." },
  ];

  const canvasAspectOptions: Array<{
    id: CanvasAspectRatio;
    label: string;
    ratio: string;
    desc: string;
    badge?: string;
    icon: typeof Monitor;
  }> = [
    {
      id: "16:9",
      label: "Whole Canvas (16:9)",
      ratio: resolution === "4k" ? "3840×2160" : resolution === "720p" ? "1280×720" : "1920×1080",
      desc: "Widescreen stage with backdrop & device centered. Default for YouTube & presentations.",
      badge: "Recommended",
      icon: Monitor,
    },
    {
      id: "9:16",
      label: "Vertical Video (9:16)",
      ratio: resolution === "4k" ? "2160×3840" : resolution === "720p" ? "720×1280" : "1080×1920",
      desc: "Vertical orientation optimized for TikTok, Instagram Reels, and YouTube Shorts.",
      icon: Smartphone,
    },
    {
      id: "1:1",
      label: "Square Post (1:1)",
      ratio: resolution === "4k" ? "2160×2160" : resolution === "720p" ? "720×720" : "1080×1080",
      desc: "Square post format with background for LinkedIn, X (Twitter), and Instagram.",
      icon: Square,
    },
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
            {/* Canvas Aspect Ratio Selector (Widescreen Whole Canvas vs Vertical Social) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold uppercase tracking-wider text-fg-muted">
                  Canvas Aspect Ratio
                </label>
                <span className="text-[11px] font-mono text-neutral-400">
                  {canvasAspectRatio === "16:9" ? "Exports whole studio canvas & backdrop" : "Custom canvas orientation"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {canvasAspectOptions.map((opt) => {
                  const isSelected = canvasAspectRatio === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCanvasAspectRatio(opt.id)}
                      className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-white bg-white/10 shadow-sm"
                          : "border-ink-700 bg-ink-900/60 hover:border-ink-600"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                          <Icon className="size-3.5 text-neutral-300" />
                          {opt.label}
                        </span>
                        {isSelected && <CheckCircle2 className="size-3.5 text-white" />}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-neutral-300">
                          {opt.ratio}
                        </span>
                        {opt.badge && (
                          <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-fg-muted leading-tight">
                        {opt.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Format Option Selector (Hardware aware) */}
            {resolution !== "gif" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold uppercase tracking-wider text-fg-muted">
                    Video Format
                  </label>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Hardware default: {platform.isMac ? ".MOV (Apple)" : ".MP4 (Windows)"}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {formats.map((fmt) => {
                    const isSelected = format === fmt.id;
                    return (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => handleFormatChange(fmt.id)}
                        className={`flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                          isSelected
                            ? "border-white bg-white/10 shadow-sm"
                            : "border-ink-700 bg-ink-900/60 hover:border-ink-600"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold text-fg flex items-center gap-1.5">
                            <Video className="size-3.5 text-neutral-300" />
                            {fmt.label}
                          </span>
                          {isSelected && <CheckCircle2 className="size-3.5 text-white" />}
                        </div>
                        {fmt.badge && (
                          <div className="mt-1.5">
                            <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700">
                              {fmt.badge}
                            </span>
                          </div>
                        )}
                        <p className="mt-1 text-[10px] text-fg-muted leading-tight">
                          {fmt.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resolution Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                {copy.export.resolution}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {resolutions.map((res) => {
                  const isSelected = resolution === res.id;
                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => handleResolutionChange(res.id)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-white bg-white/10 shadow-sm"
                          : "border-ink-700 bg-ink-900/60 hover:border-ink-600"
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-fg">{res.label}</span>
                          {res.id === "1080p" && (
                            <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">
                              Recommended
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-fg-muted">{res.desc}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="size-4 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Project / Output File Name */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold uppercase tracking-wider text-fg-muted">
                  Project & File Name
                </label>
                <span className="text-[11px] font-mono text-neutral-400">
                  Renames project and export file
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-neutral-700/80 bg-neutral-900/90 p-2 focus-within:border-white/50 focus-within:ring-1 focus-within:ring-white/20 transition-all">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300">
                  <Film className="size-4" />
                </div>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => handleProjectNameChange(e.target.value)}
                  placeholder="Enter project name..."
                  className="min-w-0 flex-1 bg-transparent px-1 font-mono text-xs text-white placeholder-neutral-500 outline-none"
                  aria-label="Project and file name"
                />
              </div>
            </div>

            {/* Save Location Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold uppercase tracking-wider text-fg-muted">
                  Save Destination
                </label>
                <span className="text-[11px] font-mono text-neutral-400">
                  Format: .{resolution === "gif" ? "gif" : format}
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
