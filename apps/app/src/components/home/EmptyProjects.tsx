import { motion } from "framer-motion";
import {
  AppWindow,
  Globe,
  Monitor,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { useNav } from "../../store/nav";
import { useProjects } from "../../store/projects";

export function EmptyProjects() {
  const { go } = useNav();
  const { pickAndImport } = useProjects();

  return (
    <div className="flex flex-col gap-10">
      {/* Studio Showcase Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-ink-850 to-ink-950 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full bg-white/[0.04] blur-3xl" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-neutral-200">
                <Sparkles className="size-3 text-white" />
                Product Showcase Engine
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
                Zero Latency
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-medium text-neutral-400">
                60 FPS Hardware Render
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Turn any screen recording into a cinematic product showcase
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
              DomoLens automatically focuses on clicked buttons, reveals the context with smooth zoom-outs, tracks your moving cursor, and inserts acoustic sound effects.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              type="button"
              onClick={() => go({ name: "record" })}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-black shadow-lg hover:bg-neutral-100 active:scale-95 transition-all"
            >
              <Zap className="size-4 fill-black" />
              Quick Record
            </button>
            <button
              type="button"
              onClick={() => pickAndImport()}
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              <UploadCloud className="size-4" />
              Import Video
            </button>
          </div>
        </div>
      </motion.div>



      {/* Direct Capture Hub Cards */}
      <section className="flex flex-col gap-4">
        <h3 className="text-base font-semibold tracking-tight text-white">
          Quick Capture Modes
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => go({ name: "record" })}
            className="group flex flex-col items-start rounded-2xl border border-white/10 bg-ink-900/40 p-4 text-left hover:border-white/20 hover:bg-ink-850/60 transition-all"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-neutral-300 group-hover:bg-white group-hover:text-black transition-all mb-3">
              <Monitor className="size-4" />
            </div>
            <span className="text-xs font-bold text-white">Full Screen Studio</span>
            <span className="text-[11px] text-fg-muted mt-0.5">
              Record entire display with automatic mouse tracking and button focus
            </span>
          </button>

          <button
            type="button"
            onClick={() => go({ name: "record" })}
            className="group flex flex-col items-start rounded-2xl border border-white/10 bg-ink-900/40 p-4 text-left hover:border-white/20 hover:bg-ink-850/60 transition-all"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-neutral-300 group-hover:bg-white group-hover:text-black transition-all mb-3">
              <AppWindow className="size-4" />
            </div>
            <span className="text-xs font-bold text-white">Application Window</span>
            <span className="text-[11px] text-fg-muted mt-0.5">
              Isolate and record a specific window (Chrome, Slack, VS Code)
            </span>
          </button>

          <button
            type="button"
            onClick={() => go({ name: "record" })}
            className="group flex flex-col items-start rounded-2xl border border-white/10 bg-ink-900/40 p-4 text-left hover:border-white/20 hover:bg-ink-850/60 transition-all"
          >
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/5 text-neutral-300 group-hover:bg-white group-hover:text-black transition-all mb-3">
              <Globe className="size-4" />
            </div>
            <span className="text-xs font-bold text-white">Browser Tab</span>
            <span className="text-[11px] text-fg-muted mt-0.5">
              Clean web view recording without OS desktop chrome
            </span>
          </button>
        </div>
      </section>

      {/* Drag & Drop Import Dropzone */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        onClick={() => pickAndImport()}
        className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-ink-900/30 px-6 py-8 text-center hover:border-white/30 hover:bg-ink-850/40 transition-all cursor-pointer"
      >
        <div className="mb-2.5 flex size-10 items-center justify-center rounded-xl bg-white/5 text-neutral-300">
          <UploadCloud className="size-5" />
        </div>
        <span className="text-xs font-semibold text-white">
          Drop any video file here or click to browse
        </span>
        <span className="text-[11px] text-fg-muted mt-0.5">
          Supports MP4, WebM, and MOV • Automatically converts into timeline project
        </span>
      </motion.div>

      {/* Studio Keyboard Shortcuts Quick Guide */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-4 text-xs text-fg-muted">
        <span className="font-semibold text-neutral-400">Editor Shortcuts:</span>
        <span><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">Space</kbd> Play / Pause</span>
        <span><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">Click</kbd> Shift Camera Focal Target</span>
        <span><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">Z</kbd> Focal Zoom</span>
        <span><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">S</kbd> Split Clip</span>
        <span><kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-neutral-200">Cmd + E</kbd> Export</span>
      </div>
    </div>
  );
}
