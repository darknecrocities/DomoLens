import { useState } from "react";
import {
  Sparkles,
  Type,
  Paintbrush,
  MousePointer,
  Download,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Sliders,
  Volume2,
  Diamond,
  Play,
  Wand2,
  Zap,
  Circle,
  Crosshair,
  SunMedium,
  HelpCircle,
  Check,
  Star,
  Flame,
  Shield,
  Crown,
  Heart,
  User,
} from "lucide-react";
import {
  formatDuration,
  BACKGROUND_CATEGORIES,
  BACKGROUND_PRESETS,
  CURSOR_PRESETS,
  DEFAULT_CURSOR_AVATAR,
  type CursorAvatar,
  type ClickSoundPreset,
  type TypingSoundPreset,
} from "@domolens/core";
import { useEditor, type ToolTab } from "../../store/editor";
import { useTutorial } from "../../store/tutorial";

function AddKeyframeButton({ zoomScale }: { zoomScale: number }) {
  const currentTimeMs = useEditor((s) => s.currentTimeMs);
  const addKeyframeAtCurrentTime = useEditor((s) => s.addKeyframeAtCurrentTime);
  return (
    <button
      type="button"
      onClick={() => addKeyframeAtCurrentTime(zoomScale)}
      className="flex items-center gap-1 rounded bg-white text-black font-semibold px-2 py-0.5 text-[10px] hover:bg-neutral-200 transition-colors shadow-sm"
      title={`Add keyframe diamond at ${formatDuration(currentTimeMs)}`}
    >
      <Plus className="size-3" /> Add at {formatDuration(currentTimeMs)}
    </button>
  );
}

export function ToolsSidebar() {
  const project = useEditor((s) => s.project);
  const isRightSidebarOpen = useEditor((s) => s.isRightSidebarOpen);
  const toggleRightSidebar = useEditor((s) => s.toggleRightSidebar);
  const activeToolTab = useEditor((s) => s.activeToolTab);
  const setActiveToolTab = useEditor((s) => s.setActiveToolTab);
  const selectedBlockId = useEditor((s) => s.selectedBlockId);
  const selectedKeyframeId = useEditor((s) => s.selectedKeyframeId);
  const selectedEffectId = useEditor((s) => s.selectedEffectId);
  const selectedTextId = useEditor((s) => s.selectedTextId);
  const plotInteractions = useEditor((s) => s.plotInteractions);
  const createTourCameraShift = useEditor((s) => s.createTourCameraShift);
  const updateZoomBlock = useEditor((s) => s.updateZoomBlock);
  const deleteZoomBlock = useEditor((s) => s.deleteZoomBlock);
  const clearZoomBlocks = useEditor((s) => s.clearZoomBlocks);
  const updateKeyframe = useEditor((s) => s.updateKeyframe);
  const deleteKeyframe = useEditor((s) => s.deleteKeyframe);
  const clearKeyframes = useEditor((s) => s.clearKeyframes);
  const addEffectAtCurrentTime = useEditor((s) => s.addEffectAtCurrentTime);
  const updateEffect = useEditor((s) => s.updateEffect);
  const deleteEffect = useEditor((s) => s.deleteEffect);
  const clearEffects = useEditor((s) => s.clearEffects);
  const addTextOverlay = useEditor((s) => s.addTextOverlay);
  const updateTextOverlay = useEditor((s) => s.updateTextOverlay);
  const deleteTextOverlay = useEditor((s) => s.deleteTextOverlay);
  const updateAudioSettings = useEditor((s) => s.updateAudioSettings);
  const autoAfx = useEditor((s) => s.autoAfx);
  const playClickSoundPreview = useEditor((s) => s.playClickSoundPreview);
  const playTypingSoundPreview = useEditor((s) => s.playTypingSoundPreview);
  const updateLooks = useEditor((s) => s.updateLooks);
  const setCurrentTime = useEditor((s) => s.setCurrentTime);
  const selectKeyframe = useEditor((s) => s.selectKeyframe);
  const selectEffect = useEditor((s) => s.selectEffect);
  const selectText = useEditor((s) => s.selectText);
  const setExportModalOpen = useEditor((s) => s.setExportModalOpen);

  const [holdDurationSec, setHoldDurationSec] = useState(1.0);
  const [zoomScale, setZoomScale] = useState(1.85);
  const [selectedBgCategory, setSelectedBgCategory] = useState<string>("all");

  if (!isRightSidebarOpen) {
    return (
      <button
        type="button"
        onClick={toggleRightSidebar}
        title="Open Tools Panel"
        className="hidden md:flex h-full w-10 shrink-0 flex-col items-center justify-start border-l border-ink-800 bg-ink-950/80 py-4 hover:bg-ink-900 transition-colors"
      >
        <div className="flex size-7 items-center justify-center rounded-lg bg-ink-800 text-fg">
          <Sliders className="size-4" />
        </div>
        <span className="mt-8 -rotate-90 text-[11px] font-semibold uppercase tracking-wider text-fg-muted whitespace-nowrap">
          Tools
        </span>
        <ChevronLeft className="mt-auto size-4 text-fg-faint" />
      </button>
    );
  }

  const tabs: Array<{ id: ToolTab; label: string; icon: React.ReactNode }> = [
    { id: "zoom", label: "Zoom", icon: <Sparkles className="size-3.5" /> },
    { id: "effects", label: "Effects", icon: <Wand2 className="size-3.5" /> },
    { id: "text", label: "Text", icon: <Type className="size-3.5" /> },
    { id: "audio", label: "Audio", icon: <Volume2 className="size-3.5" /> },
    { id: "looks", label: "Canvas", icon: <Paintbrush className="size-3.5" /> },
    { id: "cursor", label: "Cursor", icon: <MousePointer className="size-3.5" /> },
    { id: "export", label: "Export", icon: <Download className="size-3.5" /> },
  ];

  const selectedBlock = project?.zoomBlocks.find((b) => b.id === selectedBlockId);
  const selectedKeyframe = project?.keyframes?.find((kf) => kf.id === selectedKeyframeId);
  const selectedEffect = project?.effects?.find((e) => e.id === selectedEffectId);
  const selectedText = project?.textOverlays?.find((t) => t.id === selectedTextId);

  return (
    <aside data-tutorial-target="tools-panel" className="flex h-full max-h-full min-h-0 w-full md:w-72 lg:w-80 shrink-0 flex-col border-l border-ink-800 bg-ink-950/95 backdrop-blur-md z-10 select-none">
      {/* Sidebar Header & Tab Navigation */}
      <div className="flex h-12 items-center justify-between border-b border-ink-800 px-3">
        <span className="text-xs sm:text-sm font-semibold text-fg">Tools & Effects</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => useTutorial.getState().startTutorial()}
            className="rounded p-1 text-fg-muted hover:bg-ink-800 hover:text-white transition-colors"
            data-tutorial-target="tutorial-help"
            title="Studio Walkthrough Tutorial"
          >
            <HelpCircle className="size-4" />
          </button>
          <button
            type="button"
            onClick={toggleRightSidebar}
            className="rounded p-1 text-fg-muted hover:bg-ink-800 hover:text-fg transition-colors"
            data-tutorial-target="tools-collapse"
            title="Collapse Tools Panel"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Tab Switcher Icons */}
      <div className="flex border-b border-ink-800 bg-ink-900/40 p-1 gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-tutorial-target={`tab-${tab.id}`}
            onClick={() => setActiveToolTab(tab.id)}
            className={`flex flex-1 flex-col items-center justify-center rounded-lg py-1.5 px-1 text-[10px] font-semibold transition-all ${
              activeToolTab === tab.id
                ? "bg-white text-black font-bold shadow-sm"
                : "text-fg-muted hover:bg-ink-800 hover:text-fg"
            }`}
          >
            {tab.icon}
            <span className="mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 text-xs space-y-4">
        {/* TAB 1: ZOOM & KEYFRAMES */}
        {activeToolTab === "zoom" && (
          <div className="space-y-4">
            {/* Auto-Plot Master Button */}
            <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-white" />
                  <span className="font-semibold text-white text-xs">Auto-Zoom Generator</span>
                </div>
                {(project?.zoomBlocks?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={clearZoomBlocks}
                    className="text-[10px] text-danger hover:underline font-medium"
                    title="Clear all zoom blocks"
                  >
                    Clear Zooms
                  </button>
                )}
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed mb-3">
                Starts smooth zoom 0.5s before click or typing, auto-tracks the cursor, and shifts back to full-screen frame after 1.2s of inactivity.
              </p>

              <div className="space-y-2 mb-3 bg-ink-950/60 rounded-lg p-2 border border-ink-800">
                <div className="flex justify-between text-[11px]">
                  <span className="text-fg-muted">Inactivity Reset / Hold:</span>
                  <span className="font-mono text-white font-semibold">{holdDurationSec.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={holdDurationSec}
                  onChange={(e) => setHoldDurationSec(parseFloat(e.target.value))}
                  className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                />

                <div className="flex justify-between text-[11px] pt-1">
                  <span className="text-fg-muted">Zoom Scale:</span>
                  <span className="font-mono text-white font-semibold">{zoomScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.2"
                  max="2.8"
                  step="0.05"
                  value={zoomScale}
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                  className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                />

                <div className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950/80 p-2.5 mt-2">
                  <div>
                    <span className="block text-xs font-semibold text-white">Dynamic Camera Reframing</span>
                    <span className="block text-[10px] text-fg-faint">Gently reframes on highlights or wide drags</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(project?.looks.autoTrackCursor)}
                    onChange={(e) => updateLooks({ autoTrackCursor: e.target.checked })}
                    className="size-4 accent-white rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() =>
                    plotInteractions({
                      holdDurationMs: Math.round(holdDurationSec * 1000),
                      inactivityResetMs: Math.round(holdDurationSec * 1000),
                      continuousGlide: true,
                      scale: zoomScale,
                    })
                  }
                  className="w-full rounded-lg bg-white py-2 text-center text-xs font-bold text-black hover:bg-neutral-200 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="size-3.5 fill-black" />
                  Auto Zoom (In & Out)
                </button>

                <button
                  type="button"
                  onClick={() =>
                    createTourCameraShift({
                      stepHoldMs: Math.round(holdDurationSec * 1000),
                      scale: zoomScale,
                    })
                  }
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 py-2 text-center text-xs font-semibold text-white transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Crosshair className="size-3.5 text-neutral-300" />
                  Create Camera Shift Tour
                </button>
              </div>
            </div>

            {/* Manual Keyframe Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
                  Keyframes ({project?.keyframes?.length ?? 0})
                </span>
                <div className="flex items-center gap-2">
                  {(project?.keyframes?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={clearKeyframes}
                      className="text-[10px] text-danger hover:underline font-medium"
                      title="Clear all keyframes"
                    >
                      Clear All
                    </button>
                  )}
                  <AddKeyframeButton zoomScale={zoomScale} />
                </div>
              </div>

              {selectedBlock && (
                <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg">Selected Zoom Block</span>
                    <button
                      type="button"
                      onClick={() => deleteZoomBlock(selectedBlock.id)}
                      className="text-danger hover:opacity-80 p-0.5"
                      title="Delete Zoom Block"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-fg-muted">Scale: {selectedBlock.scale.toFixed(1)}x</span>
                    <span className="font-mono text-fg-faint">
                      {formatDuration(selectedBlock.startTimeMs)} - {formatDuration(selectedBlock.endTimeMs)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="2.8"
                    step="0.05"
                    value={selectedBlock.scale}
                    onChange={(e) =>
                      updateZoomBlock(selectedBlock.id, { scale: parseFloat(e.target.value) })
                    }
                    className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-fg-muted pt-1">
                    <span>Focal Target:</span>
                    <span className="font-mono text-white">
                      ({Math.round(selectedBlock.targetX * 100)}%, {Math.round(selectedBlock.targetY * 100)}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateZoomBlock(selectedBlock.id, {
                          targetX: 0.50,
                          targetY: 0.38,
                        })
                      }
                      className="flex items-center justify-center gap-1 rounded bg-ink-800 hover:bg-ink-700 py-1 px-1.5 text-[10px] font-medium text-fg hover:text-white transition-colors border border-ink-700"
                      title="Center on search bar / recording stage (50%, 38%)"
                    >
                      <Crosshair className="size-3 text-white" />
                      Center Stage (50%, 38%)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateZoomBlock(selectedBlock.id, {
                          targetX: 0.50,
                          targetY: 0.50,
                        })
                      }
                      className="flex items-center justify-center gap-1 rounded bg-ink-800 hover:bg-ink-700 py-1 px-1.5 text-[10px] font-medium text-fg hover:text-white transition-colors border border-ink-700"
                      title="Reset focal target to dead center (50%, 50%)"
                    >
                      <Crosshair className="size-3 text-fg-muted" />
                      Dead Center (50%, 50%)
                    </button>
                  </div>
                  <p className="text-[10px] text-fg-faint leading-tight">
                    Tip: Click directly on the preview video canvas to center this zoom on any button, search bar, or element.
                  </p>
                </div>
              )}

              {selectedKeyframe && (
                <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-fg flex items-center gap-1.5">
                      <Diamond className="size-3 text-white fill-white" />
                      Selected Keyframe
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteKeyframe(selectedKeyframe.id)}
                      className="text-danger hover:opacity-80 p-0.5"
                      title="Delete Keyframe (Delete)"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-fg-muted">Scale: {selectedKeyframe.scale.toFixed(1)}x</span>
                    <span className="font-mono text-fg-faint">{formatDuration(selectedKeyframe.timeMs)}</span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={selectedKeyframe.scale}
                    onChange={(e) =>
                      updateKeyframe(selectedKeyframe.id, { scale: parseFloat(e.target.value) })
                    }
                    className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                  />

                  {/* Target Coordinates */}
                  <div className="flex justify-between text-[10px] text-fg-muted">
                    <span>Focal Target:</span>
                    <span className="font-mono text-white">
                      ({Math.round(selectedKeyframe.targetX * 100)}%, {Math.round(selectedKeyframe.targetY * 100)}%)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateKeyframe(selectedKeyframe.id, {
                          targetX: 0.50,
                          targetY: 0.38,
                        })
                      }
                      className="flex items-center justify-center gap-1 rounded bg-ink-800 hover:bg-ink-700 py-1 px-1.5 text-[10px] font-medium text-fg hover:text-white transition-colors border border-ink-700"
                      title="Center on search bar / recording stage (50%, 38%)"
                    >
                      <Crosshair className="size-3 text-white" />
                      Center Stage
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateKeyframe(selectedKeyframe.id, {
                          targetX: 0.50,
                          targetY: 0.50,
                        })
                      }
                      className="flex items-center justify-center gap-1 rounded bg-ink-800 hover:bg-ink-700 py-1 px-1.5 text-[10px] font-medium text-fg hover:text-white transition-colors border border-ink-700"
                      title="Reset focal target to dead center (50%, 50%)"
                    >
                      <Crosshair className="size-3 text-fg-muted" />
                      Dead Center
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateKeyframe(selectedKeyframe.id, { easing: "cubic" })}
                      className={`flex-1 rounded py-1 text-[10px] font-medium ${
                        selectedKeyframe.easing === "cubic"
                          ? "bg-white text-black font-bold"
                          : "bg-ink-800 text-fg-muted"
                      }`}
                    >
                      Cubic Easing
                    </button>
                    <button
                      type="button"
                      onClick={() => updateKeyframe(selectedKeyframe.id, { easing: "spring" })}
                      className={`flex-1 rounded py-1 text-[10px] font-medium ${
                        selectedKeyframe.easing === "spring"
                          ? "bg-white text-black font-bold"
                          : "bg-ink-800 text-fg-muted"
                      }`}
                    >
                      Spring Physics
                    </button>
                  </div>

                  {/* Keyframe Attached Effect */}
                  <div className="pt-2 border-t border-ink-800">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-fg-muted uppercase tracking-wider mb-1.5">
                      <span>Attached Effect</span>
                      {selectedKeyframe.effect && (
                        <button
                          type="button"
                          onClick={() => updateKeyframe(selectedKeyframe.id, { effect: undefined })}
                          className="text-danger hover:underline font-normal text-[9px]"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(["spotlight", "blur", "vignette", "glow"] as const).map((eff) => (
                        <button
                          key={eff}
                          type="button"
                          onClick={() =>
                            updateKeyframe(selectedKeyframe.id, {
                              effect: selectedKeyframe.effect === eff ? undefined : eff,
                              effectIntensity: selectedKeyframe.effectIntensity ?? 0.8,
                            })
                          }
                          className={`rounded px-1.5 py-1 text-[9px] capitalize font-medium transition-colors ${
                            selectedKeyframe.effect === eff
                              ? "bg-white text-black font-bold shadow-sm"
                              : "bg-ink-800 text-fg-muted hover:bg-ink-700"
                          }`}
                        >
                          {eff}
                        </button>
                      ))}
                    </div>
                    {selectedKeyframe.effect && (
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] text-fg-muted">
                          <span>Intensity</span>
                          <span className="font-mono text-fg font-semibold">
                            {Math.round((selectedKeyframe.effectIntensity ?? 0.8) * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={selectedKeyframe.effectIntensity ?? 0.8}
                          onChange={(e) =>
                            updateKeyframe(selectedKeyframe.id, {
                              effectIntensity: parseFloat(e.target.value),
                            })
                          }
                          className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                        />
                      </div>
                    )}
                  </div>

                  {/* Keyframe Attached Sound Trigger & SFX Studio */}
                  <div className="pt-2 border-t border-ink-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-fg-muted uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Volume2 className="size-3 text-fg" />
                        Keyframe SFX
                      </span>
                      {selectedKeyframe.sound && (
                        <button
                          type="button"
                          onClick={() =>
                            updateKeyframe(selectedKeyframe.id, {
                              sound: undefined,
                              soundPreset: undefined,
                              soundVolume: undefined,
                            })
                          }
                          className="text-danger hover:underline font-normal text-[9px]"
                        >
                          Remove SFX
                        </button>
                      )}
                    </div>

                    {/* SFX Type Selector */}
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: "None", value: undefined },
                        { label: "Typing Sound", value: "typing" },
                        { label: "Click Bop", value: "click" },
                      ].map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            const newSound = item.value as any;
                            const preset =
                              newSound === "typing"
                                ? "mechanical"
                                : newSound === "click"
                                ? "bop"
                                : undefined;
                            const vol = newSound ? (newSound === "typing" ? 0.55 : 0.70) : undefined;
                            updateKeyframe(selectedKeyframe.id, {
                              sound: newSound,
                              soundPreset: preset,
                              soundVolume: vol,
                            });
                            if (newSound === "typing") {
                              playTypingSoundPreview((preset as TypingSoundPreset) || "mechanical", vol || 0.55);
                            } else if (newSound === "click") {
                              playClickSoundPreview((preset as ClickSoundPreset) || "bop", vol || 0.70);
                            }
                          }}
                          className={`rounded px-1.5 py-1 text-[9px] font-medium transition-colors ${
                            selectedKeyframe.sound === item.value
                              ? "bg-white text-black font-bold shadow-sm"
                              : "bg-ink-800 text-fg-muted hover:bg-ink-700"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* SFX Customization: Preset & Volume Adjustments */}
                    {selectedKeyframe.sound && (
                      <div className="rounded-lg bg-ink-950/70 p-2 border border-ink-800/80 space-y-2">
                        {/* Sound Preset Picker */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-fg-muted">
                            <span>Sound Style</span>
                            <span className="font-mono text-white capitalize text-[9px]">
                              {selectedKeyframe.soundPreset || (selectedKeyframe.sound === "typing" ? "mechanical" : "bop")}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {(selectedKeyframe.sound === "click"
                              ? (["bop", "pop", "camera", "click"] as const)
                              : (["mechanical", "laptop", "soft", "thock"] as const)
                            ).map((preset) => {
                              const activePreset = selectedKeyframe.soundPreset || (selectedKeyframe.sound === "typing" ? "mechanical" : "bop");
                              const isCur = activePreset === preset;
                              return (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => {
                                    updateKeyframe(selectedKeyframe.id, { soundPreset: preset });
                                    if (selectedKeyframe.sound === "typing") {
                                      playTypingSoundPreview(preset as TypingSoundPreset, selectedKeyframe.soundVolume ?? 0.55);
                                    } else {
                                      playClickSoundPreview(preset as ClickSoundPreset, selectedKeyframe.soundVolume ?? 0.70);
                                    }
                                  }}
                                  className={`rounded px-1 py-1 text-[9px] capitalize font-medium transition-colors ${
                                    isCur
                                      ? "bg-amber-400 text-black font-bold shadow-sm"
                                      : "bg-ink-800 text-fg-muted hover:bg-ink-700 hover:text-white"
                                  }`}
                                >
                                  {preset}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Volume Slider & Play Preview Button */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-fg-muted">
                            <span>SFX Volume</span>
                            <span className="font-mono text-fg font-semibold">
                              {Math.round((selectedKeyframe.soundVolume ?? (selectedKeyframe.sound === "typing" ? 0.55 : 0.70)) * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min="0.1"
                              max="1.0"
                              step="0.05"
                              value={selectedKeyframe.soundVolume ?? (selectedKeyframe.sound === "typing" ? 0.55 : 0.70)}
                              onChange={(e) =>
                                updateKeyframe(selectedKeyframe.id, {
                                  soundVolume: parseFloat(e.target.value),
                                })
                              }
                              className="flex-1 accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const vol = selectedKeyframe.soundVolume ?? (selectedKeyframe.sound === "typing" ? 0.55 : 0.70);
                                const pst = selectedKeyframe.soundPreset || (selectedKeyframe.sound === "typing" ? "mechanical" : "bop");
                                if (selectedKeyframe.sound === "typing") {
                                  playTypingSoundPreview(pst as TypingSoundPreset, vol);
                                } else {
                                  playClickSoundPreview(pst as ClickSoundPreset, vol);
                                }
                              }}
                              className="flex items-center gap-1 rounded bg-ink-800 hover:bg-ink-700 px-2 py-0.5 text-[9px] font-semibold text-white border border-ink-700 transition-colors shrink-0"
                              title="Test sound effect"
                            >
                              <Play className="size-2.5 fill-white" />
                              Test
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete Keyframe Action */}
                  <button
                    type="button"
                    onClick={() => deleteKeyframe(selectedKeyframe.id)}
                    className="w-full rounded-lg border border-danger/40 bg-danger/10 py-1.5 text-center text-[11px] font-semibold text-danger hover:bg-danger/20 transition-colors flex items-center justify-center gap-1.5 mt-1"
                  >
                    <Trash2 className="size-3" />
                    Delete Keyframe
                  </button>
                </div>
              )}

              {/* Keyframe Nodes List */}
              <div className="max-h-80 md:max-h-96 overflow-y-auto space-y-1 rounded-lg border border-ink-800 bg-ink-900/60 p-1.5">
                {(!project?.keyframes || project.keyframes.length === 0) ? (
                  <p className="p-2 text-center text-[11px] text-fg-faint">
                    No keyframes yet. Click "Auto-Plot" above or add one manually.
                  </p>
                ) : (
                  project.keyframes.map((kf, i) => (
                    <div
                      key={kf.id}
                      onClick={() => {
                        selectKeyframe(kf.id);
                        setCurrentTime(kf.timeMs);
                      }}
                      className={`flex items-center justify-between rounded px-2 py-1 cursor-pointer transition-colors ${
                        selectedKeyframeId === kf.id
                          ? "bg-white/20 text-white font-semibold"
                          : "text-fg-muted hover:bg-ink-800 hover:text-fg"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <Diamond className="size-2.5 text-white fill-white shrink-0" />
                        <span className="truncate">Node #{i + 1} ({kf.scale.toFixed(1)}x)</span>
                        {kf.sound ? (
                          <span
                            className={`rounded border text-[9px] px-1 py-0.2 shrink-0 flex items-center gap-0.5 font-medium ${
                              kf.sound === "typing"
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                            }`}
                            title={`SFX: ${kf.sound} (${kf.soundPreset || (kf.sound === "typing" ? "mech" : "bop")})`}
                          >
                            <Volume2 className="size-2.5 shrink-0" />
                            {kf.sound === "typing" ? "Typing" : "Click"} ({kf.soundPreset || (kf.sound === "typing" ? "mech" : "bop")})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateKeyframe(kf.id, {
                                sound: "click",
                                soundPreset: "bop",
                                soundVolume: 0.70,
                              });
                              playClickSoundPreview("bop", 0.70);
                            }}
                            className="rounded border border-dashed border-ink-700 bg-ink-800/80 hover:bg-ink-700 text-neutral-400 hover:text-white text-[9px] px-1.5 py-0.5 flex items-center gap-0.5 transition-colors shrink-0"
                            title="Add Click SFX to this keyframe"
                          >
                            <Plus className="size-2 shrink-0" />
                            SFX
                          </button>
                        )}
                        {kf.effect && (
                          <span className="rounded bg-ink-800 border border-ink-700 text-fg text-[9px] px-1 py-0.2 shrink-0">
                            {kf.effect}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="font-mono text-[10px] text-fg-faint">
                          {formatDuration(kf.timeMs)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteKeyframe(kf.id);
                          }}
                          className="rounded p-0.5 text-danger hover:bg-ink-800 transition-colors"
                          title="Delete keyframe"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VIDEO EFFECTS */}
        {activeToolTab === "effects" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Wand2 className="size-4 text-white" />
                  <span className="font-semibold text-white text-xs">Video Effects</span>
                </div>
                {(project?.effects?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={clearEffects}
                    className="text-[10px] text-danger hover:underline font-medium"
                    title="Clear all effects"
                  >
                    Clear All
                  </button>
                )}
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed mb-3">
                Apply spotlights, cinematic vignettes, motion blur, cursor glow, or color grades on the timeline.
              </p>

              {/* 1-Click Effect Presets */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("spotlight")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-fg hover:border-white hover:bg-ink-800 transition-colors"
                >
                  <SunMedium className="size-3.5 text-white shrink-0" />
                  <span>Spotlight</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("vignette")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-fg hover:border-white hover:bg-ink-800 transition-colors"
                >
                  <Circle className="size-3.5 text-white shrink-0" />
                  <span>Vignette</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("blur")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-fg hover:border-white hover:bg-ink-800 transition-colors"
                >
                  <Sparkles className="size-3.5 text-white shrink-0" />
                  <span>Motion Blur</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("glow")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-fg hover:border-white hover:bg-ink-800 transition-colors"
                >
                  <Zap className="size-3.5 text-white shrink-0" />
                  <span>Cursor Glow</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("filter", "cinematic")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-fg hover:border-white hover:bg-ink-800 transition-colors"
                >
                  <Paintbrush className="size-3.5 text-white shrink-0" />
                  <span>Color Grade</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("speed")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-fg hover:border-white hover:bg-ink-800 transition-colors"
                >
                  <Play className="size-3.5 text-white shrink-0" />
                  <span>Slow-Mo (0.5x)</span>
                </button>
              </div>
            </div>

            {/* Inspector for selected effect */}
            {selectedEffect ? (
              <div className="rounded-xl border border-ink-800 bg-ink-900 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg flex items-center gap-1.5">
                    <Wand2 className="size-3.5 text-white" />
                    Edit Effect
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteEffect(selectedEffect.id)}
                    className="text-danger hover:opacity-80 p-0.5"
                    title="Delete effect (Delete)"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-fg-faint uppercase font-semibold">Effect Name</label>
                  <input
                    type="text"
                    value={selectedEffect.name}
                    onChange={(e) => updateEffect(selectedEffect.id, { name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-xs text-fg focus:border-white focus:outline-none"
                  />
                </div>

                {selectedEffect.type === "filter" && (
                  <div>
                    <label className="text-[10px] text-fg-faint uppercase font-semibold">Color Preset</label>
                    <div className="grid grid-cols-2 gap-1.5 mt-1">
                      {(["cinematic", "noir", "cyberpunk", "warm"] as const).map((pr) => (
                        <button
                          key={pr}
                          type="button"
                          onClick={() => updateEffect(selectedEffect.id, { preset: pr, name: `Color Grade (${pr})` })}
                          className={`rounded px-2 py-1 text-[10px] capitalize font-medium transition-colors ${
                            selectedEffect.preset === pr
                              ? "bg-white text-black font-bold"
                              : "bg-ink-800 text-fg-muted hover:bg-ink-700"
                          }`}
                        >
                          {pr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-fg-muted">
                      {selectedEffect.type === "speed" ? "Playback Speed" : "Effect Intensity"}
                    </span>
                    <span className="font-mono text-fg font-semibold">
                      {selectedEffect.type === "speed"
                        ? `${selectedEffect.intensity.toFixed(2)}x`
                        : `${Math.round(selectedEffect.intensity * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={selectedEffect.type === "speed" ? "0.25" : "0.1"}
                    max={selectedEffect.type === "speed" ? "2.0" : "1.0"}
                    step={selectedEffect.type === "speed" ? "0.05" : "0.05"}
                    value={selectedEffect.intensity}
                    onChange={(e) =>
                      updateEffect(selectedEffect.id, { intensity: parseFloat(e.target.value) })
                    }
                    className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg mt-1"
                  />
                </div>

                {selectedEffect.type === "spotlight" && (
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-fg-muted">Spotlight Radius:</span>
                      <span className="font-mono text-fg font-semibold">
                        {(selectedEffect.radius ?? 140)}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="60"
                      max="300"
                      step="10"
                      value={selectedEffect.radius ?? 140}
                      onChange={(e) =>
                        updateEffect(selectedEffect.id, { radius: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg mt-1"
                    />
                    <div className="flex justify-between text-[10px] text-fg-muted mt-1.5">
                      <span>Focal Target:</span>
                      <span className="font-mono text-white">
                        ({Math.round((selectedEffect.targetX ?? 0.5) * 100)}%, {Math.round((selectedEffect.targetY ?? 0.5) * 100)}%)
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between text-[11px] pt-1 border-t border-ink-800">
                  <span className="text-fg-muted">Duration:</span>
                  <span className="font-mono text-fg-faint">
                    {formatDuration(selectedEffect.startTimeMs)} - {formatDuration(selectedEffect.startTimeMs + selectedEffect.durationMs)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => deleteEffect(selectedEffect.id)}
                  className="w-full rounded-lg border border-danger/40 bg-danger/10 py-1.5 text-center text-[11px] font-semibold text-danger hover:bg-danger/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="size-3" />
                  Delete Effect
                </button>
              </div>
            ) : (
              <p className="text-[11px] text-fg-faint">
                Select an effect on the timeline or click an effect preset above to add one.
              </p>
            )}

            {/* List of active video effects */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
                Active Effects ({project?.effects?.length ?? 0})
              </span>
              {(!project?.effects || project.effects.length === 0) ? (
                <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-3 text-center text-[11px] text-fg-faint">
                  No effects added yet. Click an effect above to add to timeline.
                </div>
              ) : (
                project.effects.map((eff) => (
                  <div
                    key={eff.id}
                    onClick={() => selectEffect(eff.id)}
                    className={`flex items-center justify-between rounded-lg border p-2 cursor-pointer transition-colors ${
                      selectedEffectId === eff.id
                        ? "border-white bg-white/10 text-white font-medium"
                        : "border-ink-800 bg-ink-900/60 text-fg-muted hover:border-ink-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Wand2 className="size-3 shrink-0 text-white" />
                      <div className="truncate">
                        <span className="font-semibold text-fg block text-xs truncate">{eff.name}</span>
                        <span className="font-mono text-[10px] text-fg-faint">
                          {formatDuration(eff.startTimeMs)} ({Math.round(eff.intensity * 100)}%)
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteEffect(eff.id);
                      }}
                      className="rounded p-1 text-danger hover:bg-ink-800 transition-colors"
                      title="Delete effect"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TEXT & CAPTIONS */}
        {activeToolTab === "text" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
                Text Overlays ({project?.textOverlays?.length ?? 0})
              </span>
              <button
                type="button"
                onClick={() => addTextOverlay("New Caption")}
                className="flex items-center gap-1 rounded bg-neutral-800 border border-neutral-700 px-2 py-1 text-[11px] font-medium text-white hover:border-white"
              >
                <Plus className="size-3" /> Add Text
              </button>
            </div>

            {selectedText ? (
              <div className="rounded-xl border border-ink-800 bg-ink-900 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg">Edit Caption</span>
                  <button
                    type="button"
                    onClick={() => deleteTextOverlay(selectedText.id)}
                    className="text-danger hover:opacity-80 p-0.5"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] text-fg-faint uppercase font-semibold">Content</label>
                  <input
                    type="text"
                    value={selectedText.text}
                    onChange={(e) => updateTextOverlay(selectedText.id, { text: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-1.5 text-xs text-fg focus:border-white focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-fg-muted">Font Size</span>
                    <span className="font-mono text-fg">{selectedText.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="44"
                    value={selectedText.fontSize}
                    onChange={(e) =>
                      updateTextOverlay(selectedText.id, { fontSize: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => updateTextOverlay(selectedText.id, { y: 0.15 })}
                    className="flex-1 rounded bg-ink-800 py-1 text-[10px] font-medium text-fg-muted hover:text-fg"
                  >
                    Top Title
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTextOverlay(selectedText.id, { y: 0.5 })}
                    className="flex-1 rounded bg-ink-800 py-1 text-[10px] font-medium text-fg-muted hover:text-fg"
                  >
                    Center
                  </button>
                  <button
                    type="button"
                    onClick={() => updateTextOverlay(selectedText.id, { y: 0.85 })}
                    className="flex-1 rounded bg-ink-800 py-1 text-[10px] font-medium text-fg-muted hover:text-fg"
                  >
                    Bottom Subtitle
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-fg-faint">
                Select a text track or click "Add Text" to insert captions.
              </p>
            )}

            {/* List of text overlays */}
            <div className="space-y-1.5">
              {project?.textOverlays?.map((t) => (
                <div
                  key={t.id}
                  onClick={() => selectText(t.id)}
                  className={`flex items-center justify-between rounded-lg border p-2 cursor-pointer transition-colors ${
                    selectedTextId === t.id
                      ? "border-white bg-white/10 text-white font-medium"
                      : "border-ink-800 bg-ink-900/60 text-fg-muted hover:border-ink-700"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Type className="size-3.5 text-white shrink-0" />
                    <span className="truncate font-medium">{t.text}</span>
                  </div>
                  <span className="font-mono text-[10px] text-fg-faint shrink-0">
                    {formatDuration(t.startTimeMs)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: AUDIO & MUSIC */}
        {activeToolTab === "audio" && (
          <div className="space-y-4">
            {/* 0. Auto AFX Master Generator */}
            <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <Volume2 className="size-4 text-white" />
                <span className="font-semibold text-white text-xs">Auto AFX Generator</span>
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed mb-3">
                Automatically attaches tactile click bops to clicks and clean mechanical typing sounds.
              </p>
              <button
                type="button"
                onClick={autoAfx}
                className="w-full rounded-lg bg-white py-2 text-center text-xs font-bold text-black hover:bg-neutral-200 transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Sparkles className="size-3.5 fill-black" />
                Apply Auto AFX
              </button>
            </div>

            {/* 1. Click Sound Effects */}
            <div className="rounded-xl border border-ink-800 bg-ink-900/80 p-3 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-white">Click Sound Effects</span>
                  <span className="block text-[10px] text-fg-faint">Tactile bop sound on every button click</span>
                </div>
                <input
                  type="checkbox"
                  checked={project?.audioSettings?.clickSoundEnabled ?? true}
                  onChange={(e) => updateAudioSettings({ clickSoundEnabled: e.target.checked })}
                  className="size-4 accent-white rounded cursor-pointer"
                />
              </div>

              {(project?.audioSettings?.clickSoundEnabled ?? true) && (
                <div className="space-y-2 pt-1 border-t border-ink-800/80">
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "bop" as const, label: "Bop (Bubble)" },
                      { id: "click" as const, label: "Modern Click" },
                      { id: "tap" as const, label: "Wooden Tap" },
                    ].map((preset) => {
                      const isActive = (project?.audioSettings?.clickSoundPreset ?? "bop") === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateAudioSettings({ clickSoundPreset: preset.id });
                            playClickSoundPreview(preset.id);
                          }}
                          className={`rounded-lg py-1.5 px-2 text-[10px] font-semibold transition-all ${
                            isActive
                              ? "bg-white text-black font-bold shadow-sm"
                              : "bg-ink-800 text-fg-muted hover:text-white hover:bg-ink-700"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-fg-muted">Click Volume:</span>
                    <span className="font-mono text-white font-semibold">
                      {Math.round((project?.audioSettings?.clickSoundVolume ?? 0.7) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={project?.audioSettings?.clickSoundVolume ?? 0.7}
                    onChange={(e) => updateAudioSettings({ clickSoundVolume: parseFloat(e.target.value) })}
                    className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => playClickSoundPreview()}
                    className="w-full mt-1 rounded-lg border border-ink-700 bg-ink-800/60 py-1 text-[11px] font-medium text-fg-muted hover:text-white hover:bg-ink-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play className="size-3 fill-current" />
                    <span>Test Click Bop</span>
                  </button>
                </div>
              )}
            </div>

            {/* 2. Typing Keystroke Sound Effects */}
            <div className="rounded-xl border border-ink-800 bg-ink-900/80 p-3 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-white">Auto Typing Sounds</span>
                  <span className="block text-[10px] text-fg-faint">Plays mechanical key sounds during typing</span>
                </div>
                <input
                  type="checkbox"
                  checked={project?.audioSettings?.typingSoundEnabled ?? true}
                  onChange={(e) => updateAudioSettings({ typingSoundEnabled: e.target.checked })}
                  className="size-4 accent-white rounded cursor-pointer"
                />
              </div>

              {(project?.audioSettings?.typingSoundEnabled ?? true) && (
                <div className="space-y-2 pt-1 border-t border-ink-800/80">
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "creamy" as const, label: "Creamy Marbly", desc: "Silky lubed linear" },
                      { id: "thock" as const, label: "Deep Thock", desc: "Heavy POM bottom-out" },
                      { id: "thack" as const, label: "Crisp Thack", desc: "Snappy aluminum clack" },
                      { id: "clicky" as const, label: "Tactile Clicky", desc: "Crisp click-bar snap" },
                      { id: "thick" as const, label: "Thick Heavy", desc: "Dampened tactile thud" },
                      { id: "mechanical" as const, label: "Classic Mech", desc: "Standard mechanical" },
                      { id: "laptop" as const, label: "Laptop Scissor", desc: "Flat chiclet key" },
                      { id: "typewriter" as const, label: "Typewriter", desc: "Metallic strike chime" },
                    ].map((preset) => {
                      const isActive = (project?.audioSettings?.typingSoundPreset ?? "creamy") === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateAudioSettings({ typingSoundPreset: preset.id });
                            playTypingSoundPreview(preset.id);
                          }}
                          className={`rounded-lg p-2 text-left transition-all ${
                            isActive
                              ? "bg-white text-black font-bold shadow-sm ring-1 ring-white/50"
                              : "bg-ink-800 text-fg-muted hover:text-white hover:bg-ink-700"
                          }`}
                        >
                          <span className="block text-[11px] font-semibold leading-tight">
                            {preset.label}
                          </span>
                          <span className={`block text-[9px] mt-0.5 leading-tight ${isActive ? "text-neutral-600" : "text-fg-faint"}`}>
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <span className="text-fg-muted">Typing Volume:</span>
                    <span className="font-mono text-white font-semibold">
                      {Math.round((project?.audioSettings?.typingSoundVolume ?? 0.6) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={project?.audioSettings?.typingSoundVolume ?? 0.6}
                    onChange={(e) => updateAudioSettings({ typingSoundVolume: parseFloat(e.target.value) })}
                    className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={() => playTypingSoundPreview()}
                    className="w-full mt-1 rounded-lg border border-ink-700 bg-ink-800/60 py-1 text-[11px] font-medium text-fg-muted hover:text-white hover:bg-ink-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play className="size-3 fill-current" />
                    <span>Test Typing Burst</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CANVAS & LOOKS */}
        {activeToolTab === "looks" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
                Canvas Presets
              </span>
              <span className="text-[10px] text-fg-muted font-mono">
                {BACKGROUND_PRESETS.length} Presets
              </span>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedBgCategory("all")}
                className={`shrink-0 rounded-md px-2 py-1 font-medium transition-colors ${
                  selectedBgCategory === "all"
                    ? "bg-white text-black font-semibold shadow-sm"
                    : "bg-ink-900 text-fg-muted hover:text-white hover:bg-ink-800 border border-ink-800"
                }`}
              >
                All ({BACKGROUND_PRESETS.length})
              </button>
              {BACKGROUND_CATEGORIES.map((cat) => {
                const count = BACKGROUND_PRESETS.filter((p) => p.category === cat.id).length;
                const isActive = selectedBgCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedBgCategory(cat.id)}
                    className={`shrink-0 rounded-md px-2 py-1 font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? "bg-white text-black font-semibold shadow-sm"
                        : "bg-ink-900 text-fg-muted hover:text-white hover:bg-ink-800 border border-ink-800"
                    }`}
                  >
                    {cat.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Categorized Preset Selector Grid */}
            <div className="max-h-80 overflow-y-auto space-y-3.5 pr-1 scrollbar-thin">
              {(selectedBgCategory === "all"
                ? BACKGROUND_CATEGORIES
                : BACKGROUND_CATEGORIES.filter((c) => c.id === selectedBgCategory)
              ).map((cat) => {
                const catPresets = BACKGROUND_PRESETS.filter((p) => p.category === cat.id);
                if (catPresets.length === 0) return null;

                return (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-fg-muted font-medium">
                      <span className="uppercase tracking-wider text-fg-faint font-semibold">
                        {cat.label}
                      </span>
                      <span className="text-[9px] text-fg-faint font-mono">
                        {catPresets.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {catPresets.map((preset) => {
                        const isSelected = project?.looks.backgroundValue === preset.value;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() =>
                              updateLooks({
                                backgroundType: preset.type,
                                backgroundValue: preset.value,
                              })
                            }
                            className={`group relative h-16 w-full overflow-hidden rounded-lg border text-left transition-all ${
                              isSelected
                                ? "border-white ring-2 ring-white/60 shadow-md scale-[1.02]"
                                : "border-ink-800 hover:border-neutral-500 hover:scale-[1.01]"
                            }`}
                            style={{ background: preset.value }}
                            title={`${preset.name} (${cat.label})`}
                          >
                            {/* Contrast Protection Scrim */}
                            <div className="absolute inset-0 flex flex-col justify-between p-2 bg-gradient-to-t from-black/80 via-black/25 to-transparent">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] font-semibold uppercase tracking-wider text-white/75 truncate">
                                  {preset.type}
                                </span>
                                {isSelected && (
                                  <div className="flex size-3.5 items-center justify-center rounded-full bg-white text-black shadow">
                                    <Check className="size-2.5 stroke-[3]" />
                                  </div>
                                )}
                              </div>
                              <span className="text-[11px] font-bold text-white drop-shadow-sm truncate">
                                {preset.name}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-fg-muted">Canvas Padding</span>
                  <span className="font-mono text-fg">{project?.looks.padding}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="64"
                  value={project?.looks.padding ?? 32}
                  onChange={(e) => updateLooks({ padding: parseInt(e.target.value, 10) })}
                  className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg mt-1"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-fg-muted">Corner Radius</span>
                  <span className="font-mono text-fg">{project?.looks.borderRadius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="36"
                  value={project?.looks.borderRadius ?? 16}
                  onChange={(e) => updateLooks({ borderRadius: parseInt(e.target.value, 10) })}
                  className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg mt-1"
                />
              </div>

              {/* Window Mockup Frame */}
              <div className="pt-2 border-t border-ink-800/80">
                <span className="block text-[11px] font-semibold text-white mb-1.5">
                  Window Frame Shell
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "macos" as const, label: "macOS" },
                    { id: "safari" as const, label: "Safari" },
                    { id: "terminal" as const, label: "Terminal" },
                    { id: "chrome" as const, label: "Chrome" },
                    { id: "glass" as const, label: "Glass" },
                    { id: "none" as const, label: "None" },
                  ].map((wf) => {
                    const isActive = (project?.looks.windowFrame || "macos") === wf.id;
                    return (
                      <button
                        key={wf.id}
                        type="button"
                        onClick={() => updateLooks({ windowFrame: wf.id })}
                        className={`rounded-lg py-1 px-2 text-[10px] font-semibold transition-all ${
                          isActive
                            ? "bg-white text-black font-bold shadow-sm"
                            : "bg-ink-800 text-fg-muted hover:text-white hover:bg-ink-700"
                        }`}
                      >
                        {wf.label}
                      </button>
                    );
                  })}
                </div>

                {(project?.looks.windowFrame === "safari" ||
                  project?.looks.windowFrame === "terminal" ||
                  project?.looks.windowFrame === "chrome") && (
                  <div className="mt-2">
                    <span className="text-[10px] text-fg-muted block mb-0.5">Mockup URL / Title:</span>
                    <input
                      type="text"
                      value={project?.looks.mockupUrl || ""}
                      placeholder="app.yourdomain.com"
                      onChange={(e) => updateLooks({ mockupUrl: e.target.value })}
                      className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] text-white font-mono"
                    />
                  </div>
                )}
              </div>

              {/* 3D Perspective Tilt Pitch */}
              <div className="pt-2 border-t border-ink-800/80">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-fg-muted">3D Perspective Tilt</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-white font-semibold">
                      {(project?.looks.tiltAngle ?? 0).toFixed(1)}°
                    </span>
                    {(project?.looks.tiltAngle ?? 0) !== 0 && (
                      <button
                        type="button"
                        onClick={() => updateLooks({ tiltAngle: 0 })}
                        className="text-[9px] rounded bg-ink-800 px-1 py-0.5 text-neutral-400 hover:text-white"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="-15"
                  max="15"
                  step="0.5"
                  value={project?.looks.tiltAngle ?? 0}
                  onChange={(e) => updateLooks({ tiltAngle: parseFloat(e.target.value) })}
                  className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg mt-1"
                />
              </div>

              {/* Camera Physics Model */}
              <div className="pt-2 border-t border-ink-800/80">
                <span className="block text-[11px] font-semibold text-white mb-1.5">
                  Camera Transition Physics
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: "spring" as const, label: "Spring SaaS" },
                    { id: "smooth" as const, label: "Apple Smooth" },
                    { id: "snappy" as const, label: "Fast Snap" },
                    { id: "linear" as const, label: "Linear" },
                  ].map((p) => {
                    const isActive = (project?.looks.cameraPhysics || "spring") === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updateLooks({ cameraPhysics: p.id })}
                        className={`rounded-lg py-1 px-2 text-[10px] font-semibold transition-all ${
                          isActive
                            ? "bg-white text-black font-bold shadow-sm"
                            : "bg-ink-800 text-fg-muted hover:text-white hover:bg-ink-700"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ambient Video Blur Glow Toggle */}
              <div className="pt-2 border-t border-ink-800/80 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-white">Ambient Blur Glow</span>
                  <span className="block text-[10px] text-fg-faint">
                    Blurs video frames into dynamic ambient aura
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(project?.looks.ambientBackdropBlur)}
                  onChange={(e) => updateLooks({ ambientBackdropBlur: e.target.checked })}
                  className="size-4 accent-white rounded cursor-pointer"
                />
              </div>

              {/* Brand Accent Color */}
              <div className="pt-2 border-t border-ink-800/80 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-white">Brand Accent Color</span>
                  <span className="block text-[10px] text-fg-faint">
                    Synchronized across badges and pills
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={project?.looks.brandAccentColor || "#6366f1"}
                    onChange={(e) => updateLooks({ brandAccentColor: e.target.value })}
                    className="size-6 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="font-mono text-[11px] text-white">
                    {project?.looks.brandAccentColor || "#6366f1"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CURSOR & AUTOTRACKING (OPENSCREEN) */}
        {activeToolTab === "cursor" && (
          <div className="space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
              OpenScreen Auto-Tracking & Cursor
            </span>

            {/* 1. Auto-Track Camera Toggle */}
            <div className="rounded-xl border border-ink-800 bg-ink-900/80 p-3 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-white">Dynamic Camera Reframing</span>
                  <span className="block text-[10px] text-fg-faint">
                    Gently reframes camera on highlights or wide drags
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(project?.looks.autoTrackCursor)}
                  onChange={(e) => updateLooks({ autoTrackCursor: e.target.checked })}
                  className="size-4 accent-white rounded cursor-pointer"
                />
              </div>

              {Boolean(project?.looks.autoTrackCursor) && (
                <div className="space-y-1 pt-1 border-t border-ink-800/80">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-fg-muted">Follow Zoom Scale</span>
                    <span className="font-mono text-white font-semibold">
                      {(project?.looks.autoTrackScale ?? 1.6).toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="2.5"
                    step="0.05"
                    value={project?.looks.autoTrackScale ?? 1.6}
                    onChange={(e) => updateLooks({ autoTrackScale: parseFloat(e.target.value) })}
                    className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                  />
                </div>
              )}
            </div>

            {/* 2. Expanded Cursor Size Multiplier & Quick Presets */}
            <div className="rounded-xl border border-ink-800 bg-ink-900/80 p-3 shadow-sm space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-fg-muted">Cursor Size</span>
                <span className="font-mono text-white font-semibold">
                  {(project?.looks.cursorSize ?? 1.4).toFixed(2)}x ({Math.round((project?.looks.cursorSize ?? 1.4) * 100)}%)
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="3.0"
                step="0.05"
                value={project?.looks.cursorSize ?? 1.4}
                onChange={(e) => updateLooks({ cursorSize: parseFloat(e.target.value) })}
                className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
              />

              {/* Quick Presets: S, M, L, XL */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { label: "S", value: 0.8, tooltip: "Small (0.8x)" },
                  { label: "M", value: 1.4, tooltip: "Medium (1.4x - Default)" },
                  { label: "L", value: 2.0, tooltip: "Large (2.0x)" },
                  { label: "XL", value: 2.8, tooltip: "Extra Large (2.8x)" },
                ].map((preset) => {
                  const isPresetActive = Math.abs((project?.looks.cursorSize ?? 1.4) - preset.value) < 0.04;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateLooks({ cursorSize: preset.value })}
                      className={`rounded-md py-1 text-[10px] font-semibold transition-all ${
                        isPresetActive
                          ? "bg-white text-black font-bold shadow-sm"
                          : "bg-ink-800 text-fg-muted hover:text-white hover:bg-ink-700"
                      }`}
                      title={preset.tooltip}
                    >
                      {preset.label} ({preset.value}x)
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-fg-faint">
                Smooth vector pointer scale from 0.6x (compact) to 3.0x (presentation).
              </p>
            </div>

            {/* 3. Presenter Avatar Badge Customization Controls */}
            {(() => {
              const avatar = project?.looks.cursorAvatar ?? DEFAULT_CURSOR_AVATAR;
              const updateAvatar = (partial: Partial<CursorAvatar>) => {
                updateLooks({
                  cursorAvatar: {
                    ...DEFAULT_CURSOR_AVATAR,
                    ...(project?.looks.cursorAvatar ?? {}),
                    ...partial,
                  },
                });
              };

              return (
                <div className="rounded-xl border border-ink-800 bg-ink-900/80 p-3 shadow-sm space-y-3">
                  {/* Avatar Enable Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-semibold text-white">Presenter Avatar Badge</span>
                      <span className="block text-[10px] text-fg-faint">
                        Display user badge / icon pinned to cursor
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(avatar.enabled)}
                      onChange={(e) => updateAvatar({ enabled: e.target.checked })}
                      className="size-4 accent-white rounded cursor-pointer"
                    />
                  </div>

                  {avatar.enabled && (
                    <div className="space-y-3 pt-2 border-t border-ink-800/80">
                      {/* Badge Type Selector */}
                      <div>
                        <label className="text-[10px] font-medium text-fg-muted block mb-1">Badge Type</label>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { id: "initials" as const, label: "Initials" },
                            { id: "icon" as const, label: "Icon" },
                            { id: "text" as const, label: "Text" },
                            { id: "image" as const, label: "Photo" },
                          ].map((t) => {
                            const isTypeActive = avatar.type === t.id;
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => {
                                  let defaultVal = avatar.value;
                                  if (t.id === "initials" && !defaultVal) defaultVal = "DL";
                                  if (t.id === "icon" && !defaultVal) defaultVal = "sparkles";
                                  if (t.id === "text" && !defaultVal) defaultVal = "Host";
                                  updateAvatar({ type: t.id, value: defaultVal });
                                }}
                                className={`rounded-md py-1 text-[10px] font-semibold transition-all ${
                                  isTypeActive
                                    ? "bg-white text-black font-bold shadow-sm"
                                    : "bg-ink-800 text-fg-muted hover:text-white hover:bg-ink-700"
                                }`}
                              >
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Badge Value Input */}
                      {avatar.type === "initials" && (
                        <div>
                          <label className="text-[10px] font-medium text-fg-muted block mb-1">
                            Initials (1-3 letters)
                          </label>
                          <input
                            type="text"
                            maxLength={3}
                            value={avatar.value || ""}
                            placeholder="DL"
                            onChange={(e) => updateAvatar({ value: e.target.value.toUpperCase() })}
                            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white font-mono uppercase"
                          />
                        </div>
                      )}

                      {avatar.type === "icon" && (
                        <div>
                          <label className="text-[10px] font-medium text-fg-muted block mb-1">
                            Preset Icon
                          </label>
                          <div className="grid grid-cols-5 gap-1.5">
                            {[
                              { id: "sparkles", label: "Sparkles", Icon: Sparkles },
                              { id: "star", label: "Star", Icon: Star },
                              { id: "zap", label: "Zap", Icon: Zap },
                              { id: "flame", label: "Flame", Icon: Flame },
                              { id: "shield", label: "Shield", Icon: Shield },
                              { id: "crown", label: "Crown", Icon: Crown },
                              { id: "check", label: "Check", Icon: Check },
                              { id: "heart", label: "Heart", Icon: Heart },
                              { id: "user", label: "User", Icon: User },
                            ].map(({ id, label, Icon }) => {
                              const isSelectedIcon = (avatar.value || "sparkles") === id;
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => updateAvatar({ value: id, icon: id })}
                                  className={`flex items-center justify-center p-1.5 rounded-md border transition-all ${
                                    isSelectedIcon
                                      ? "border-white bg-white/20 text-white"
                                      : "border-ink-800 bg-ink-950 text-fg-muted hover:text-white hover:border-neutral-600"
                                  }`}
                                  title={label}
                                >
                                  <Icon className="size-3.5" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {avatar.type === "text" && (
                        <div>
                          <label className="text-[10px] font-medium text-fg-muted block mb-1">
                            Text or Emoji
                          </label>
                          <input
                            type="text"
                            maxLength={10}
                            value={avatar.value || ""}
                            placeholder="Host or 🚀"
                            onChange={(e) => updateAvatar({ value: e.target.value, text: e.target.value })}
                            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white"
                          />
                        </div>
                      )}

                      {avatar.type === "image" && (
                        <div>
                          <label className="text-[10px] font-medium text-fg-muted block mb-1">
                            Photo URL
                          </label>
                          <input
                            type="url"
                            value={avatar.value || ""}
                            placeholder="https://example.com/avatar.png"
                            onChange={(e) => updateAvatar({ value: e.target.value, imageUrl: e.target.value })}
                            className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white font-mono"
                          />
                        </div>
                      )}

                      {/* Badge Accent Color */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-medium text-fg-muted">Badge Color</label>
                          <span className="font-mono text-[10px] text-white">{avatar.color || "#6366f1"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={avatar.color || "#6366f1"}
                            onChange={(e) => updateAvatar({ color: e.target.value })}
                            className="size-6 rounded cursor-pointer bg-transparent border-0 p-0"
                          />
                          <div className="flex flex-wrap gap-1">
                            {[
                              "#6366f1",
                              "#ec4899",
                              "#10b981",
                              "#f59e0b",
                              "#3b82f6",
                              "#8b5cf6",
                              "#ef4444",
                              "#06b6d4",
                            ].map((c) => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updateAvatar({ color: c })}
                                className={`size-4 rounded-full border transition-transform ${
                                  (avatar.color || "#6366f1") === c
                                    ? "scale-125 border-white ring-1 ring-white"
                                    : "border-ink-800"
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Role Subtitle Pill */}
                      <div>
                        <label className="text-[10px] font-medium text-fg-muted block mb-1">
                          Role Subtitle Pill (optional)
                        </label>
                        <input
                          type="text"
                          maxLength={18}
                          value={avatar.badgeLabel || ""}
                          placeholder="e.g. Presenter, Speaker, Host"
                          onChange={(e) => updateAvatar({ badgeLabel: e.target.value })}
                          className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-white"
                        />
                      </div>

                      {/* Live Preview Widget */}
                      <div className="rounded-lg bg-ink-950 p-2 border border-ink-800/80 flex items-center justify-between">
                        <span className="text-[10px] text-fg-faint">Live Preview:</span>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm overflow-hidden"
                            style={{ backgroundColor: avatar.color || "#6366f1" }}
                          >
                            {avatar.type === "initials" && (avatar.value || "DL")}
                            {avatar.type === "text" && (avatar.value || "Host")}
                            {avatar.type === "icon" && (
                              avatar.value === "star" ? <Star className="size-3" /> :
                              avatar.value === "zap" ? <Zap className="size-3" /> :
                              avatar.value === "flame" ? <Flame className="size-3" /> :
                              avatar.value === "shield" ? <Shield className="size-3" /> :
                              avatar.value === "crown" ? <Crown className="size-3" /> :
                              avatar.value === "check" ? <Check className="size-3" /> :
                              avatar.value === "heart" ? <Heart className="size-3" /> :
                              avatar.value === "user" ? <User className="size-3" /> :
                              <Sparkles className="size-3" />
                            )}
                            {avatar.type === "image" && (
                              avatar.value ? (
                                <img src={avatar.value} alt="Avatar" className="size-full object-cover" />
                              ) : (
                                <User className="size-3" />
                              )
                            )}
                          </div>
                          {avatar.badgeLabel && (
                            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-medium text-white tracking-wide">
                              {avatar.badgeLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 4. Trajectory Smoothing Presets */}
            <div className="space-y-2">
              <label className="text-[11px] text-fg-muted block">Cursor Motion Smoothing</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: "none" as const, label: "Raw (None)" },
                  { id: "smooth" as const, label: "Balanced" },
                  { id: "cinematic" as const, label: "Cinematic" },
                ].map((sm) => {
                  const isActive = (project?.looks.cursorSmoothing ?? "smooth") === sm.id;
                  return (
                    <button
                      key={sm.id}
                      type="button"
                      onClick={() => updateLooks({ cursorSmoothing: sm.id })}
                      className={`rounded-lg py-1.5 px-2 text-[10px] font-semibold transition-all ${
                        isActive
                          ? "bg-white text-black font-bold shadow-sm"
                          : "bg-ink-800 text-fg-muted hover:text-white hover:bg-ink-700"
                      }`}
                    >
                      {sm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Pointer Style (Catalog of 24 Presets) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[11px] text-fg-muted block">Cursor Pointer Style</label>
                <span className="text-[10px] text-fg-faint font-mono">24 Designs</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                {CURSOR_PRESETS.map((cur) => {
                  const isActive = project?.looks.cursorStyle === cur.id;
                  return (
                    <button
                      key={cur.id}
                      type="button"
                      onClick={() => updateLooks({ cursorStyle: cur.id })}
                      className={`rounded-lg border p-2 text-left text-xs transition-all ${
                        isActive
                          ? "border-white bg-white/20 text-white font-bold ring-1 ring-white/50"
                          : "border-ink-800 bg-ink-900 text-fg-muted hover:text-fg hover:border-neutral-600"
                      }`}
                      title={`${cur.name}: ${cur.description}`}
                    >
                      <span className="block truncate font-semibold text-[11px] text-fg">{cur.name}</span>
                      <span className="block text-[9px] text-fg-faint capitalize">{cur.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Click Ripples */}
            <div className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-900 p-3">
              <div>
                <span className="block text-xs font-semibold text-fg">Click Ripples</span>
                <span className="block text-[10px] text-fg-faint">
                  Expand glowing rings on click locations
                </span>
              </div>
              <input
                type="checkbox"
                checked={project?.looks.showClickRipples ?? true}
                onChange={(e) => updateLooks({ showClickRipples: e.target.checked })}
                className="size-4 accent-white rounded cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* TAB 6: EXPORT */}
        {activeToolTab === "export" && (
          <div className="space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
              Export Rendering
            </span>

            <div className="space-y-2">
              <div className="rounded-xl border border-ink-800 bg-ink-900 p-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-fg font-medium">Quality Profile</span>
                  <span className="text-white font-bold">1080p 60 FPS</span>
                </div>
                <p className="text-[11px] text-fg-faint">
                  Ultra-smooth spring camera motion with zero jitter and crisp UI text.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="rounded-lg border border-ink-800 bg-ink-900/60 p-2">
                  <span className="text-fg-faint text-[10px] block">Encoder</span>
                  <span className="font-semibold text-fg">H.264 / MP4</span>
                </div>
                <div className="rounded-lg border border-ink-800 bg-ink-900/60 p-2">
                  <span className="text-fg-faint text-[10px] block">Platform</span>
                  <span className="font-semibold text-fg">Desktop & Mobile</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExportModalOpen(true)}
                className="w-full rounded-xl bg-white py-2.5 text-center text-xs font-bold text-black hover:bg-neutral-200 transition-colors shadow-sm flex items-center justify-center gap-2 mt-3"
              >
                <Download className="size-4" />
                Render & Export Video
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
