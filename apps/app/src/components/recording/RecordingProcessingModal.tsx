import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Film, Wand2, CheckCircle2 } from "lucide-react";
import { useRecorder } from "../../store/recorder";

export function RecordingProcessingModal() {
  const isProcessing = useRecorder((s) => s.isProcessing);
  const progress = useRecorder((s) => s.processingProgress);
  const step = useRecorder((s) => s.processingStep);

  return (
    <AnimatePresence>
      {isProcessing && (
        <motion.div
          key="recording-processing-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none"
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full max-w-md rounded-3xl border border-neutral-800 bg-black/95 p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden"
          >
            {/* Ambient Lighting Accents (Monochromatic) */}
            <div className="absolute -top-24 -left-24 size-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 size-48 rounded-full bg-white/5 blur-3xl pointer-events-none" />

            {/* DomoLens Panda Director Mascot */}
            <div className="relative mb-4 flex size-20 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-white/10 blur-md animate-pulse" />
              <div className="relative flex size-16 items-center justify-center rounded-2xl border border-white/20 bg-neutral-900 shadow-xl overflow-hidden p-2">
                <img
                  src="/domolens.png"
                  alt="DomoLens Director Mascot"
                  className="size-full object-contain drop-shadow"
                />
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="text-lg font-bold tracking-tight text-white mb-1.5 flex items-center gap-2">
              <span>Finalizing Studio Recording</span>
              <Sparkles className="size-4 text-white animate-pulse" />
            </h3>

            <p className="text-xs text-neutral-400 mb-6 max-w-xs leading-relaxed min-h-[32px] flex items-center justify-center">
              {step || "DomoLens is calculating camera glides, keyframes, and subtitles..."}
            </p>

            {/* Progress Bar & Numerical Counter */}
            <div className="w-full space-y-2">
              <div className="flex justify-between items-center text-[11px] font-mono text-neutral-400 px-1">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <Film className="size-3 text-white animate-spin" />
                  <span>Processing Engine</span>
                </span>
                <span className="font-bold text-white text-xs tabular">{Math.round(progress)}%</span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-900 border border-neutral-800 p-0.5 shadow-inner">
                <motion.div
                  className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                  initial={{ width: "0%" }}
                  animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* 3-Stage Visual Pipeline */}
            <div className="mt-5 grid grid-cols-3 gap-2 w-full text-[10px] text-neutral-500 font-mono">
              <div
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  progress >= 30
                    ? "border-white/30 bg-white/10 text-white font-semibold shadow-sm"
                    : "border-neutral-850 bg-neutral-900/40 text-neutral-500"
                }`}
              >
                <Film className="size-3.5" />
                <span>Media Capture</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  progress >= 70
                    ? "border-white/30 bg-white/10 text-white font-semibold shadow-sm"
                    : "border-neutral-850 bg-neutral-900/40 text-neutral-500"
                }`}
              >
                <Wand2 className="size-3.5" />
                <span>Smart Zooms</span>
              </div>
              <div
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                  progress >= 95
                    ? "border-white/30 bg-white/10 text-white font-semibold shadow-sm"
                    : "border-neutral-850 bg-neutral-900/40 text-neutral-500"
                }`}
              >
                <CheckCircle2 className="size-3.5" />
                <span>Studio Ready</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
