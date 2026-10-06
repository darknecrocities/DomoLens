import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Film, Sparkles } from "lucide-react";
import { copy } from "../../copy/en";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { toast } from "../../store/toast";
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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      setIsExporting(false);
      setProgress(0);
      setStatusText("Preparing video export...");
    }
  }, [open]);

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgress(2);
    setStatusText("Initializing video renderer...");

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

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

      setProgress(100);
      setStatusText("Export complete!");
      toast.success(copy.export.done);

      // Trigger download of real rendered video
      const link = document.createElement("a");
      link.href = result.downloadUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        setIsExporting(false);
        onClose();
      }, 500);
    } catch (err: unknown) {
      if (abortCtrl.signal.aborted) {
        setIsExporting(false);
        return;
      }

      console.warn("Canvas video render fallback:", err);
      toast.info("Rendering fallback: exporting source video.");

      // Graceful fallback to source video
      const link = document.createElement("a");
      link.href = project.summary.media || "#";
      link.download = `${project.summary.name.replace(/\s+/g, "_")}_${resolution}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
      onClose();
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
      title={copy.export.title}
      description={copy.export.desc}
      footer={
        <>
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
        ) : (
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

            <div className="mt-4 rounded-xl border border-ink-800 bg-ink-950 p-3 text-[11px] text-fg-muted space-y-1">
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
