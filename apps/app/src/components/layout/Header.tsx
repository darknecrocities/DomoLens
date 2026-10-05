import { Globe, ArrowLeft, Zap } from "lucide-react";
import { copy } from "../../copy/en";
import { platform } from "../../platform";
import { useNav } from "../../store/nav";

export function Header() {
  const { screen, go } = useNav();

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

  return (
    <header
      data-tauri-drag-region
      className={`fixed top-0 inset-x-0 z-50 flex h-14 shrink-0 select-none items-center justify-between border-b border-white/[0.08] bg-black/25 px-3 sm:px-6 pt-safe px-safe backdrop-blur-2xl backdrop-saturate-200 transition-all shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_0_0_rgba(255,255,255,0.12)] gap-2 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent ${
        platform.isMac ? "pl-20" : ""
      }`}
    >
      {/* Brand logo & title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => go({ name: "home" })}
          className="flex min-h-[44px] items-center gap-2.5 transition-opacity hover:opacity-90 focus-visible:outline-none touch-manipulation"
        >
          <img src="/domolens.png" alt="DomoLens" className="size-7 object-contain rounded-md shadow-sm" />
          <span className="text-base font-bold tracking-tight text-white font-mono uppercase">
            {copy.appName}
          </span>
        </button>
      </div>

      {/* Apple-Style Glass Pill Center Navigation Links */}
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

      {/* Right Quick Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Action Button: Quick Record */}
        <button
          type="button"
          onClick={() => go({ name: "home" })}
          className="flex min-h-[34px] items-center gap-1.5 rounded-full bg-white px-4 py-1.5 font-mono text-xs font-bold uppercase text-black hover:bg-neutral-100 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.22)] touch-manipulation"
          title="Open Studio Workspace"
        >
          <Zap className="size-3.5 fill-black" />
          <span className="hidden sm:inline">Quick Record</span>
          <span className="sm:hidden">Record</span>
        </button>

        {/* Workspace / Landing Page Mode Switcher */}
        <button
          type="button"
          onClick={() => go({ name: screen.name === "landing" ? "home" : "landing" })}
          className="flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.06] backdrop-blur-xl px-3.5 py-1.5 font-mono text-xs font-semibold uppercase text-neutral-200 hover:text-white hover:bg-white/[0.14] hover:border-white/25 active:scale-95 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] touch-manipulation"
          title={screen.name === "landing" ? "Return to Studio Workspace" : "View Official Landing Page"}
        >
          {screen.name === "landing" ? (
            <>
              <ArrowLeft className="size-3.5" />
              <span className="hidden sm:inline">Studio Workspace</span>
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
      </div>
    </header>
  );
}
