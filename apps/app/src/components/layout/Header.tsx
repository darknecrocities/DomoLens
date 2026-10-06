import { FolderOpen, Monitor, Mic, Sliders, Zap } from "lucide-react";
import { copy } from "../../copy/en";
import { platform } from "../../platform";
import { useNav } from "../../store/nav";
import { useProjects } from "../../store/projects";

export function Header() {
  const { screen, go } = useNav();
  const { projects, pickAndImport } = useProjects();

  const handleOpenEditor = () => {
    const first = projects[0];
    if (first) {
      go({ name: "editor", id: first.id });
    } else {
      go({ name: "editor", id: "studio-main" });
    }
  };

  const handleImportVideo = async () => {
    const project = await pickAndImport();
    if (project) {
      go({ name: "editor", id: project.id });
    }
  };

  return (
    <header
      data-tauri-drag-region
      className={`fixed top-0 inset-x-0 z-50 flex h-14 shrink-0 select-none items-center justify-between border-b border-white/[0.08] bg-black/40 px-3 sm:px-6 pt-safe px-safe backdrop-blur-2xl backdrop-saturate-200 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_0_0_rgba(255,255,255,0.12)] gap-2 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent ${
        platform.isMac ? "pl-20" : ""
      }`}
    >
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => go({ name: "home" })}
          className="flex min-h-[44px] items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none touch-manipulation"
          title="Return to DomoLens OpenScreen"
        >
          <img src="/domolens.png" alt="DomoLens" className="size-7 object-contain rounded-md shadow-sm" />
          <span className="text-base font-bold tracking-tight text-white font-mono uppercase">
            {copy.appName}
          </span>
          <span className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            Desktop Studio
          </span>
        </button>
      </div>

      {/* Hardware & Engine Status Indicators */}
      <div className="hidden lg:flex items-center gap-3 text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          <Monitor className="size-3 text-white" />
          <span className="text-neutral-300">Display Ready</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          <Mic className="size-3 text-white" />
          <span className="text-neutral-300">Audio 48kHz</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
          <span className="size-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-white font-semibold">60 FPS Engine</span>
        </div>
      </div>

      {/* Quick Action Navigation Bar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Import Video */}
        <button
          type="button"
          onClick={() => void handleImportVideo()}
          className="flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-xs font-semibold uppercase text-neutral-300 hover:text-white hover:bg-white/10 hover:border-white/25 active:scale-95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] touch-manipulation"
          title="Import Video File directly into Editor"
        >
          <FolderOpen className="size-3.5" />
          <span className="hidden md:inline">Import Clip</span>
          <span className="md:hidden">Import</span>
        </button>

        {/* Quick Record */}
        <button
          type="button"
          onClick={() => go({ name: "record" })}
          className={`flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-xs font-bold uppercase transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] touch-manipulation ${
            screen.name === "record"
              ? "bg-white text-black ring-2 ring-white/50"
              : "border border-white/20 bg-white/10 text-white hover:bg-white hover:text-black"
          }`}
          title="Start Screen Recording"
        >
          <Zap className="size-3.5 fill-current" />
          <span className="hidden sm:inline">Record Screen</span>
          <span className="sm:hidden">Record</span>
        </button>

        {/* Open Video Editor directly */}
        <button
          type="button"
          onClick={handleOpenEditor}
          className={`flex min-h-[34px] items-center gap-1.5 rounded-full px-4 py-1.5 font-mono text-xs font-bold uppercase transition-all shadow-[0_0_25px_rgba(255,255,255,0.25)] touch-manipulation ${
            screen.name === "editor"
              ? "bg-white text-black"
              : "bg-white text-black hover:bg-neutral-200 active:scale-95"
          }`}
          title="Open Video Editor Studio directly"
        >
          <Sliders className="size-3.5" />
          <span className="hidden sm:inline">Open Studio</span>
          <span className="sm:hidden">Studio</span>
        </button>
      </div>
    </header>
  );
}
