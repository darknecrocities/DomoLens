import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  Film,
  HelpCircle,
  MoreHorizontal,
  Settings,
  Sliders,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { copy } from "../copy/en";
import { Button } from "../components/ui/Button";
import { IconButton } from "../components/ui/IconButton";
import { VideoCanvas } from "../components/editor/VideoCanvas";
import { Timeline } from "../components/editor/Timeline";
import { LlmSidebar } from "../components/editor/LlmSidebar";
import { ToolsSidebar } from "../components/editor/ToolsSidebar";
import { ExportModal } from "../components/editor/ExportModal";
import { TemplatePickerModal } from "../components/editor/TemplatePickerModal";
import { SettingsModal } from "../components/settings/SettingsModal";
import { DeleteModal } from "../components/home/DeleteModal";
import { SpotlightTutorial } from "../components/editor/SpotlightTutorial";
import { ResizeHandle } from "../components/editor/ResizeHandle";
import {
  useEditor,
  DEFAULT_LLM_SIDEBAR_WIDTH,
  DEFAULT_TOOLS_SIDEBAR_WIDTH,
  DEFAULT_TIMELINE_HEIGHT,
  MAX_TOOLS_SIDEBAR_WIDTH,
  MAX_TIMELINE_HEIGHT,
} from "../store/editor";
import { useNav } from "../store/nav";
import { useTutorial } from "../store/tutorial";

interface EditorScreenProps {
  id: string;
}

export function EditorScreen({ id }: EditorScreenProps) {
  const { back } = useNav();
  const project = useEditor((s) => s.project);
  const isPlaying = useEditor((s) => s.isPlaying);
  const isLeftSidebarOpen = useEditor((s) => s.isLeftSidebarOpen);
  const isRightSidebarOpen = useEditor((s) => s.isRightSidebarOpen);
  const toggleLeftSidebar = useEditor((s) => s.toggleLeftSidebar);
  const toggleRightSidebar = useEditor((s) => s.toggleRightSidebar);
  const loadProject = useEditor((s) => s.loadProject);
  const setCurrentTime = useEditor((s) => s.setCurrentTime);
  const setPlaying = useEditor((s) => s.setPlaying);
  const togglePlay = useEditor((s) => s.togglePlay);
  const splitAtCurrentTime = useEditor((s) => s.splitAtCurrentTime);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const addKeyframeAtCurrentTime = useEditor((s) => s.addKeyframeAtCurrentTime);
  const addEffectAtCurrentTime = useEditor((s) => s.addEffectAtCurrentTime);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const isExportModalOpen = useEditor((s) => s.isExportModalOpen);
  const setExportModalOpen = useEditor((s) => s.setExportModalOpen);
  const isTemplateModalOpen = useEditor((s) => s.isTemplateModalOpen);
  const setTemplateModalOpen = useEditor((s) => s.setTemplateModalOpen);
  const renameProject = useEditor((s) => s.renameProject);

  // Studio Resizable Layout Dimensions & Setters
  const llmSidebarWidth = useEditor((s) => s.llmSidebarWidth);
  const toolsSidebarWidth = useEditor((s) => s.toolsSidebarWidth);
  const timelineHeight = useEditor((s) => s.timelineHeight);
  const setLlmSidebarWidth = useEditor((s) => s.setLlmSidebarWidth);
  const setToolsSidebarWidth = useEditor((s) => s.setToolsSidebarWidth);
  const setTimelineHeight = useEditor((s) => s.setTimelineHeight);

  // Responsive boundary safety clamping for Windows Snap & display scaling
  useEffect(() => {
    const handleWindowResize = () => {
      if (typeof window === "undefined") return;
      const maxSidebar = Math.min(MAX_TOOLS_SIDEBAR_WIDTH, Math.floor(window.innerWidth * 0.42));
      const curTools = useEditor.getState().toolsSidebarWidth;
      if (curTools > maxSidebar) {
        useEditor.getState().setToolsSidebarWidth(maxSidebar);
      }
      const curLlm = useEditor.getState().llmSidebarWidth;
      if (curLlm > maxSidebar) {
        useEditor.getState().setLlmSidebarWidth(maxSidebar);
      }
      const maxTimeline = Math.min(MAX_TIMELINE_HEIGHT, Math.floor(window.innerHeight * 0.6));
      const curTimeline = useEditor.getState().timelineHeight;
      if (curTimeline > maxTimeline) {
        useEditor.getState().setTimelineHeight(maxTimeline);
      }
    };
    window.addEventListener("resize", handleWindowResize, { passive: true });
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  // Mobile responsive view selector (<md)
  const [mobileTab, setMobileTab] = useState<"canvas" | "ai" | "tools">("canvas");

  const hasSeenTutorial = useTutorial((s) => s.hasSeenTutorial);
  const startTutorial = useTutorial((s) => s.startTutorial);

  // Auto-launch tutorial card on first launch
  useEffect(() => {
    if (!hasSeenTutorial && project) {
      const timer = setTimeout(() => {
        startTutorial();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTutorial, project, startTutorial]);

  // Load project on mount or when id changes
  useEffect(() => {
    void loadProject(id);
  }, [id, loadProject]);

  // Sync draft title when project loads
  useEffect(() => {
    if (project?.summary?.name) {
      setTitleDraft(project.summary.name);
    }
  }, [project?.summary?.name]);

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

          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              const trimmed = titleDraft.trim();
              if (trimmed && trimmed !== project.summary.name) {
                void renameProject(trimmed);
              } else {
                setTitleDraft(project.summary.name);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="max-w-[110px] xs:max-w-[160px] sm:max-w-xs truncate text-xs sm:text-sm font-semibold text-fg bg-transparent hover:bg-white/5 focus:bg-ink-900 focus:ring-1 focus:ring-white/20 rounded px-1.5 py-0.5 outline-none transition-all cursor-text"
            title="Click to rename project"
            aria-label="Project name"
          />
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
            data-tutorial-target="ai-director"
            title="Toggle AI Director Panel"
          >
            <Sparkles className={`size-3.5 ${isLeftSidebarOpen ? "text-black" : "text-white"}`} />
            <span>AI Director</span>
          </button>

          {/* Templates Modal Trigger */}
          <button
            type="button"
            onClick={() => setTemplateModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-2 sm:px-2.5 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-white hover:border-neutral-600 transition-all shadow-sm"
            data-tutorial-target="templates-button"
            title="Browse & Apply Motion Video Templates"
          >
            <Wand2 className="size-3.5 text-neutral-300" />
            <span className="hidden sm:inline">Templates</span>
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
            data-tutorial-target="tools-toggle"
            title="Toggle Tools Panel"
          >
            <Sliders className="size-3.5" />
            <span>Tools</span>
          </button>

          <div className="h-4 w-px bg-ink-800 hidden sm:block" />

          {/* Compact More Actions Dropdown (Decluttered Topbar) */}
          <div className="relative">
            <IconButton
              label="More Project Actions"
              icon={<MoreHorizontal className="size-4" />}
              variant="ghost"
              size="sm"
              onClick={() => setIsMoreMenuOpen((v) => !v)}
              className={`text-neutral-400 hover:text-white hover:bg-white/10 ${isMoreMenuOpen ? "bg-white/15 text-white" : ""}`}
            />

            {isMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-neutral-800 bg-neutral-950/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setSettingsOpen(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Settings className="size-3.5 text-neutral-400" />
                    <span>{copy.editor.settingsBtn}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      startTutorial();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <HelpCircle className="size-3.5 text-neutral-400" />
                    <span>Studio Walkthrough Tutorial</span>
                  </button>
                  <div className="my-1 h-px bg-neutral-800" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setShowDeleteModal(true);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Trash2 className="size-3.5 text-neutral-500 hover:text-neutral-300" />
                    <span>Delete Project</span>
                  </button>
                </div>
              </>
            )}
          </div>


          <Button
            variant="primary"
            size="sm"
            data-tutorial-target="export-button"
            icon={<Download className="size-4 text-ink-950" />}
            onClick={() => setExportModalOpen(true)}
            className="px-2.5 sm:px-3.5"
          >
            <span className="hidden sm:inline">{copy.editor.exportBtn}</span>
          </Button>
        </div>
      </header>

      {/* 2. Main Studio Workspace: Fluidly Responsive with Resizable Line Borders */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* DESKTOP LAYOUT (>= md): True 3-Panel Studio with Interactive Draggable Borders */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          {/* LEFT PANEL: LLM AI DIRECTOR */}
          <LlmSidebar />

          {/* Left Vertical Line Border Splitter */}
          {isLeftSidebarOpen && (
            <ResizeHandle
              orientation="vertical"
              ariaLabel="Resize AI Director sidebar width"
              onResize={(delta) => {
                setLlmSidebarWidth(llmSidebarWidth + delta);
              }}
              onReset={() => {
                setLlmSidebarWidth(DEFAULT_LLM_SIDEBAR_WIDTH);
              }}
            />
          )}

          {/* CENTER PANEL: CANVAS + KEYFRAMES TIMELINE */}
          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            {/* Canvas Player Area with live mouse tracking */}
            <div className="relative flex flex-1 items-center justify-center overflow-hidden p-2 sm:p-3 min-h-[140px]">
              <VideoCanvas project={project} />
            </div>

            {/* Bottom Keyframes Section Resizable Line Border */}
            <ResizeHandle
              orientation="horizontal"
              ariaLabel="Resize keyframes timeline section height"
              onResize={(delta) => {
                // Dragging DOWN (positive delta) makes canvas larger and timeline smaller
                // Dragging UP (negative delta) makes canvas smaller and timeline taller
                setTimelineHeight(timelineHeight - delta);
              }}
              onReset={() => {
                setTimelineHeight(DEFAULT_TIMELINE_HEIGHT);
              }}
            />

            {/* Bottom Multi-Track Keyframe Timeline */}
            <Timeline project={project} />
          </div>

          {/* Right Vertical Line Border Splitter */}
          {isRightSidebarOpen && (
            <ResizeHandle
              orientation="vertical"
              ariaLabel="Resize Tools and Effects sidebar width"
              onResize={(delta) => {
                // Dragging LEFT (negative delta) widens the right sidebar
                // Dragging RIGHT (positive delta) narrows the right sidebar
                setToolsSidebarWidth(toolsSidebarWidth - delta);
              }}
              onReset={() => {
                setToolsSidebarWidth(DEFAULT_TOOLS_SIDEBAR_WIDTH);
              }}
            />
          )}

          {/* RIGHT PANEL: COMPREHENSIVE TOOLS */}
          <ToolsSidebar />
        </div>

        {/* MOBILE LAYOUT (< md): 100% Screen Real Estate Per View */}
        <div className="flex md:hidden flex-1 flex-col overflow-hidden">
          {mobileTab === "canvas" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="relative flex flex-1 items-center justify-center overflow-hidden p-2 min-h-[140px]">
                <VideoCanvas project={project} />
              </div>
              <ResizeHandle
                orientation="horizontal"
                ariaLabel="Resize keyframes timeline section height"
                onResize={(delta) => {
                  setTimelineHeight(timelineHeight - delta);
                }}
                onReset={() => {
                  setTimelineHeight(DEFAULT_TIMELINE_HEIGHT);
                }}
              />
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
        open={isExportModalOpen}
        project={project}
        onClose={() => setExportModalOpen(false)}
      />
      <TemplatePickerModal
        open={isTemplateModalOpen}
        onClose={() => setTemplateModalOpen(false)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <SpotlightTutorial />
      {showDeleteModal && (
        <DeleteModal
          open={showDeleteModal}
          projectName={project.summary.name}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            setShowDeleteModal(false);
            await useEditor.getState().deleteCurrentProject();
          }}
        />
      )}
    </div>
  );
}
