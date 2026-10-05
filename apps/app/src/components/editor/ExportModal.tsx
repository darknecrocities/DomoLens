import { useEffect, useState } from "react";
import { CheckCircle2, Download, Film } from "lucide-react";
import { copy } from "../../copy/en";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { toast } from "../../store/toast";
import type { ProjectData } from "@domolens/core";

interface ExportModalProps {
  open: boolean;
  project: ProjectData;
  onClose: () => void;
}

export type ExportResolution = "1080p" | "720p" | "4k" | "gif";

export function ExportModal({ open, project, onClose }: ExportModalProps) {
  const [resolution, setResolution] = useState<ExportResolution>("1080p");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) {
      setIsExporting(false);
      setProgress(0);
    }
  }, [open]);

  const handleStartExport = () => {
    setIsExporting(true);
    setProgress(0);

    // Simulate/run render progress increments
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsExporting(false);
          toast.success(copy.export.done);

          // Trigger simulated download
          const link = document.createElement("a");
          link.href = project.summary.media || "#";
          link.download = `${project.summary.name.replace(/\s+/g, "_")}_${resolution}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          onClose();
          return 100;
        }
        return prev + Math.random() * 20 + 10;
      });
    }, 250);
  };

  const resolutions: Array<{ id: ExportResolution; label: string; desc: string }> = [
    { id: "1080p", label: "1080p Full HD", desc: "Crisp and fast. Perfect for sharing." },
    { id: "720p", label: "720p Fast", desc: "Smaller file size." },
    { id: "4k", label: "4K Ultra HD", desc: "Maximum sharpness." },
    { id: "gif", label: "Animated GIF", desc: "No audio, loops forever." },
  ];

  return (
    <Modal
      open={open}
      onClose={isExporting ? () => {} : onClose}
      title={copy.export.title}
      description={copy.export.desc}
      footer={
        <>
          <Button variant="ghost" disabled={isExporting} onClick={onClose}>
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
            <p className="mt-1 font-mono text-xs text-fg-muted">{copy.export.progress(progress)}</p>

            {/* Progress Bar */}
            <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-ink-900 border border-ink-700">
              <div
                className="h-full rounded-full bg-white transition-all duration-200 shadow-sm"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
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
                      <span className="block text-sm font-semibold text-fg">{res.label}</span>
                      <span className="text-xs text-fg-muted">{res.desc}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="size-4 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
