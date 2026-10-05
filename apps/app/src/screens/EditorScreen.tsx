import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Film,
  Settings,
  Sliders,
  Sparkles,
} from "lucide-react";
import { copy } from "../copy/en";
import { Button } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import { VideoCanvas } from "../components/editor/VideoCanvas";
import { Timeline } from "../components/editor/Timeline";
import { LlmSidebar } from "../components/editor/LlmSidebar";
import { ToolsSidebar } from "../components/editor/ToolsSidebar";
import { ExportModal } from "../components/editor/ExportModal";
import { SettingsModal } from "../components/settings/SettingsModal";
import { useEditor } from "../store/editor";
import { useNav } from "../store/nav";

interface EditorScreenProps {
  id: string;
}

export function EditorScreen({ id }: EditorScreenProps) {
  const { back } = useNav();
  const {
    project,
    currentTimeMs,
    isPlaying,
    isLeftSidebarOpen,
    isRightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar,
    loadProject,
    setCurrentTime,
    setPlaying,
    togglePlay,
    splitAtCurrentTime,
    deleteSelected,
    addKeyframeAtCurrentTime,
    addEffectAtCurrentTime,
    undo,
    redo,
  } = useEditor();

  const [exportOpen, setExportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Mobile responsive view selector (<md)
  const [mobileTab, setMobileTab] = useState<"canvas" | "ai" | "tools">("canvas");

  // Load project on mount or when id changes
  useEffect(() => {
    void loadProject(id);
  }, [id, loadProject]);

  // Playback timer loop: if no video is mounted, this rAF timer advances playback smoothly;
  // when an HTML5 video is loaded, VideoCanvas's hardware presentation clock drives currentTimeMs with zero latency.
  useEffect(() => {
    if (!isPlaying) return;
    if (project?.summary?.media) return;

    let lastTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      const current = useEditor.getState().currentTimeMs;
      const duration = useEditor.getState().durationMs;
      const next = current + delta;
      if (next >= duration) {
        setCurrentTime(0);
        setPlaying(false);
      } else {
        setCurrentTime(next);
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, project?.summary?.media, setCurrentTime, setPlaying]);

  // Global editor keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "KeyS") {
        e.preventDefault();
        splitAtCurrentTime();
      } else if (e.code === "KeyK") {
        e.preventDefault();
        addKeyframeAtCurrentTime();
      } else if (e.code === "KeyE") {
        e.preventDefault();
        addEffectAtCurrentTime("spotlight");
      } else if (e.code === "Delete" || e.code === "Backspace") {
        e.preventDefault();
        deleteSelected();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, splitAtCurrentTime, deleteSelected, addKeyframeAtCurrentTime, addEffectAtCurrentTime, undo, redo]);

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-fg-muted">{copy.home.loading}</p>
        <Button variant="secondary" className="mt-4" onClick={back}>
          {copy.record.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-ink-950">
      {/* 1. Header Toolbar */}
      <header className="flex h-13 shrink-0 items-center justify-between border-b border-ink-800 bg-ink-950/90 px-3 sm:px-4 backdrop-blur-md gap-2">
        {/* Left: Back, Landing Switcher & Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="size-4" />}
            onClick={back}
            aria-label={copy.editor.backToHome}
            className="px-2 sm:px-3"
          >
            <span className="hidden md:inline">{copy.editor.backToHome}</span>
          </Button>

          <div className="h-4 w-px bg-ink-800 hidden sm:block" />

          <span className="max-w-[100px] xs:max-w-[140px] sm:max-w-xs truncate text-xs sm:text-sm font-semibold text-fg">
            {project.summary.name}
          </span>
        </div>

        {/* Center / Right: Sidebar Toggles & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Desktop Left AI Sidebar Toggle */}
          <button
            type="button"
            onClick={toggleLeftSidebar}
            className={`hidden md:flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-semibold transition-all ${
              isLeftSidebarOpen
                ? "bg-white text-black font-bold shadow-sm"
                : "border border-ink-700 bg-ink-800 text-fg-muted hover:text-fg hover:border-neutral-500"
            }`}
            title="Toggle AI Director Panel"
          >
            <Sparkles className={`size-3.5 ${isLeftSidebarOpen ? "text-black" : "text-white"}`} />
            <span>AI Director</span>
          </button>

          {/* Desktop Right Tools Sidebar Toggle */}
          <button
            type="button"
            onClick={toggleRightSidebar}
            className={`hidden md:flex items-center gap-1.5 rounded-lg px-2 sm:px-2.5 py-1 text-xs font-semibold transition-all ${
              isRightSidebarOpen
                ? "bg-ink-700 text-fg border border-ink-600"
                : "border border-ink-700 bg-ink-800 text-fg-muted hover:text-fg"
            }`}
            title="Toggle Tools Panel"
          >
            <Sliders className="size-3.5" />
            <span>Tools</span>
          </button>

          <div className="h-4 w-px bg-ink-800 hidden sm:block" />

          <IconButton
            label={copy.editor.settingsBtn}
            icon={<Settings className="size-4" />}
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
          />

          <Button
            variant="primary"
            size="sm"
            icon={<Download className="size-4 text-ink-950" />}
            onClick={() => setExportOpen(true)}
            className="px-2.5 sm:px-3.5"
          >
            <span className="hidden sm:inline">{copy.editor.exportBtn}</span>
          </Button>
        </div>
      </header>

      {/* 2. Main Studio Workspace: Fluidly Responsive across Desktop and Android Mobile */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* DESKTOP LAYOUT (>= md): True 3-Panel Studio */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {/* LEFT PANEL: LLM AI DIRECTOR */}
          <LlmSidebar />

          {/* CENTER PANEL: CANVAS + TIMELINE */}
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            {/* Canvas Player Area with live mouse tracking */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-3 lg:p-6 min-h-[180px]">
              <VideoCanvas project={project} currentTimeMs={currentTimeMs} />
            </div>

            {/* Bottom Multi-Track Keyframe Timeline */}
            <Timeline project={project} />
          </div>

          {/* RIGHT PANEL: COMPREHENSIVE TOOLS */}
          <ToolsSidebar />
        </div>

        {/* MOBILE LAYOUT (< md): 100% Screen Real Estate Per View */}
        <div className="flex md:hidden flex-1 flex-col overflow-hidden">
          {mobileTab === "canvas" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="relative flex flex-1 items-center justify-center overflow-hidden p-2 min-h-[160px]">
                <VideoCanvas project={project} currentTimeMs={currentTimeMs} />
              </div>
              <Timeline project={project} />
            </div>
          )}

          {mobileTab === "ai" && (
            <div className="flex flex-1 overflow-hidden bg-ink-950">
              <LlmSidebar />
            </div>
          )}

          {mobileTab === "tools" && (
            <div className="flex flex-1 overflow-hidden bg-ink-950">
              <ToolsSidebar />
            </div>
          )}
        </div>
      </div>

      {/* 3. Mobile Responsive Bottom Navigation Dock (< md) */}
      <nav className="md:hidden flex h-14 shrink-0 items-center justify-around border-t border-ink-800 bg-ink-950 px-2 pb-safe backdrop-blur-md z-30">
        <button
          type="button"
          onClick={() => setMobileTab("canvas")}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition-all touch-manipulation ${
            mobileTab === "canvas"
              ? "text-white font-bold"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          <Film className="size-4" />
          <span className="mt-0.5">Canvas</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("ai")}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition-all touch-manipulation ${
            mobileTab === "ai"
              ? "text-white font-bold"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          <Sparkles className="size-4" />
          <span className="mt-0.5">AI Director</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("tools")}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[11px] font-semibold transition-all touch-manipulation ${
            mobileTab === "tools"
              ? "text-white font-bold"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          <Sliders className="size-4" />
          <span className="mt-0.5">Tools</span>
        </button>
      </nav>

      {/* Modals */}
      <ExportModal
        open={exportOpen}
        project={project}
        onClose={() => setExportOpen(false)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
