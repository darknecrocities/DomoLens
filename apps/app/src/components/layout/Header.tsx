import { FolderOpen, Globe, Monitor, Mic, RefreshCw, Sliders, Zap } from "lucide-react";
import { copy } from "../../copy/en";
import { platform } from "../../platform";
import { useNav } from "../../store/nav";
import { useProjects } from "../../store/projects";
import { checkForAppUpdates } from "../../lib/updater";

export function Header() {
  const { screen, go } = useNav();
  const { projects, pickAndImport } = useProjects();

  const navLinks = [
    { label: "Overview", targetId: "hero" },
    { label: "Features", targetId: "features" },
    { label: "Showcase", targetId: "product-showcase" },
    { label: "How It Works", targetId: "workflow" },
    { label: "Download", targetId: "downloads" },
  ];

  const handleNavClick = (targetId: string) => {
    if (screen.name !== "landing") {
      go({ name: "landing" });
      setTimeout(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } else {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
    }
  };

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
          onClick={() => go({ name: platform.isApp ? "home" : "landing" })}
          className="flex min-h-[44px] items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none touch-manipulation"
          title={platform.isApp ? "Return to DomoLens OpenScreen" : "Return to DomoLens Overview"}
        >
          <img src="/domolens.png" alt="DomoLens" className="size-7 object-contain rounded-md shadow-sm" />
          <span className="text-base font-bold tracking-tight text-white font-mono uppercase">
            {copy.appName}
          </span>
          <span className="hidden sm:inline-flex rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-neutral-400">
            {platform.isApp ? "Desktop Studio" : "Web Studio"}
          </span>
        </button>
      </div>

      {/* Center Navigation:
          - In Browser: Apple-Style Glass Pill Navigation Links
          - In Native App: Hardware & Engine Status Indicators
      */}
      {!platform.isApp ? (
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-white/[0.12] bg-white/[0.05] p-1 backdrop-blur-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_2px_10px_rgba(0,0,0,0.3)]">
          {navLinks.map((link) => (
            <button
              key={link.targetId}
              type="button"
              onClick={() => handleNavClick(link.targetId)}
              className="rounded-full px-3 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-neutral-300 hover:text-white hover:bg-white/[0.12] active:bg-white/20 transition-all"
            >
              {link.label}
            </button>
          ))}
        </nav>
      ) : (
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
      )}

      {/* Right Quick Action Navigation Bar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Browser Only: Switcher between Landing Page and Studio Workspace */}
        {!platform.isApp && (
          <button
            type="button"
            onClick={() => go({ name: screen.name === "landing" ? "home" : "landing" })}
            className="flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.06] backdrop-blur-xl px-3.5 py-1.5 font-mono text-xs font-semibold uppercase text-neutral-200 hover:text-white hover:bg-white/[0.14] hover:border-white/25 active:scale-95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] touch-manipulation"
            title={screen.name === "landing" ? "Open Studio Workspace" : "View Landing Page"}
          >
            {screen.name === "landing" ? (
              <>
                <Sliders className="size-3.5" />
                <span className="hidden sm:inline">Launch Studio</span>
                <span className="sm:hidden">Studio</span>
              </>
            ) : (
              <>
                <Globe className="size-3.5" />
                <span className="hidden sm:inline">Landing Page</span>
                <span className="sm:hidden">Landing</span>
              </>
            )}
          </button>
        )}

        {/* Native App: Import Clip button */}
        {platform.isApp && (
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
        )}

        {/* Native App: Check for Updates */}
        {platform.isApp && (
          <button
            type="button"
            onClick={() => void checkForAppUpdates({ silent: false })}
            className="flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs font-semibold uppercase text-neutral-300 hover:text-white hover:bg-white/10 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] touch-manipulation"
            title="Check for DomoLens updates"
          >
            <RefreshCw className="size-3.5" />
            <span className="hidden xl:inline">Check Updates</span>
            <span className="xl:hidden">Update</span>
          </button>
        )}

        {/* Quick Record Button */}
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
          <span className="hidden sm:inline">Quick Record</span>
          <span className="sm:hidden">Record</span>
        </button>

        {/* Native App: Open Studio directly */}
        {platform.isApp && (
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
        )}
      </div>
    </header>
  );
}
