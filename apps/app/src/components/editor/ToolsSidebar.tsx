import { useState } from "react";
import {
  Sparkles,
  Type,
  Music,
  Paintbrush,
  MousePointer,
  Download,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Sliders,
  Volume2,
  VolumeX,
  Diamond,
  Play,
  Wand2,
  Zap,
  Circle,
  SunMedium,
} from "lucide-react";
import { formatDuration, type ProjectLooks } from "@domolens/core";
import { useEditor, type ToolTab } from "../../store/editor";

export function ToolsSidebar() {
  const {
    project,
    currentTimeMs,
    isRightSidebarOpen,
    toggleRightSidebar,
    activeToolTab,
    setActiveToolTab,
    selectedBlockId,
    selectedKeyframeId,
    selectedEffectId,
    selectedTextId,
    plotInteractions,
    updateZoomBlock,
    deleteZoomBlock,
    clearZoomBlocks,
    addKeyframeAtCurrentTime,
    updateKeyframe,
    deleteKeyframe,
    clearKeyframes,
    addEffectAtCurrentTime,
    updateEffect,
    deleteEffect,
    clearEffects,
    addTextOverlay,
    updateTextOverlay,
    deleteTextOverlay,
    addAudioTrack,
    updateAudioTrack,
    deleteAudioTrack,
    updateAudioSettings,
    playClickSoundPreview,
    playTypingSoundPreview,
    updateLooks,
    setCurrentTime,
    selectKeyframe,
    selectEffect,
    selectText,
  } = useEditor();

  const [holdDurationSec, setHoldDurationSec] = useState(2.4);
  const [zoomScale, setZoomScale] = useState(1.85);

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
    { id: "audio", label: "Audio", icon: <Music className="size-3.5" /> },
    { id: "looks", label: "Canvas", icon: <Paintbrush className="size-3.5" /> },
    { id: "cursor", label: "Cursor", icon: <MousePointer className="size-3.5" /> },
    { id: "export", label: "Export", icon: <Download className="size-3.5" /> },
  ];

  const selectedBlock = project?.zoomBlocks.find((b) => b.id === selectedBlockId);
  const selectedKeyframe = project?.keyframes?.find((kf) => kf.id === selectedKeyframeId);
  const selectedEffect = project?.effects?.find((e) => e.id === selectedEffectId);
  const selectedText = project?.textOverlays?.find((t) => t.id === selectedTextId);

  return (
    <aside className="flex h-full w-full md:w-72 lg:w-80 shrink-0 flex-col border-l border-ink-800 bg-ink-950/95 backdrop-blur-md z-10 select-none">
      {/* Sidebar Header & Tab Navigation */}
      <div className="flex h-12 items-center justify-between border-b border-ink-800 px-3">
        <span className="text-xs sm:text-sm font-semibold text-fg">Tools & Effects</span>
        <button
          type="button"
          onClick={toggleRightSidebar}
          className="rounded p-1 text-fg-muted hover:bg-ink-800 hover:text-fg transition-colors"
          title="Collapse Tools Panel"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Tab Switcher Icons */}
      <div className="flex border-b border-ink-800 bg-ink-900/40 p-1 gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
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
      <div className="flex-1 overflow-y-auto p-3 text-xs space-y-4">
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
                Translates every recorded mouse click and typing action into an iterative camera zoom that tracks the target, holds 2-3s, and returns to full screen.
              </p>

              <div className="space-y-2 mb-3 bg-ink-950/60 rounded-lg p-2 border border-ink-800">
                <div className="flex justify-between text-[11px]">
                  <span className="text-fg-muted">Zoom Hold Time:</span>
                  <span className="font-mono text-white font-semibold">{holdDurationSec.toFixed(1)}s</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="3.5"
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
              </div>

              <button
                type="button"
                onClick={() =>
                  plotInteractions({
                    holdDurationMs: Math.round(holdDurationSec * 1000),
                    scale: zoomScale,
                  })
                }
                className="w-full rounded-lg bg-white py-2 text-center text-xs font-bold text-black hover:bg-neutral-200 transition-colors shadow-sm flex items-center justify-center gap-1.5"
              >
                <Sparkles className="size-3.5 fill-black" />
                Auto-Plot Clicks & Typing
              </button>
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
                  <button
                    type="button"
                    onClick={() => addKeyframeAtCurrentTime(zoomScale)}
                    className="flex items-center gap-1 text-[11px] font-medium text-white hover:text-neutral-300"
                  >
                    <Plus className="size-3" /> Add at {formatDuration(currentTimeMs)}
                  </button>
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
                              ? "bg-amber-400 text-black font-bold shadow-sm"
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
                          className="w-full accent-amber-400 cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                        />
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
              <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-ink-800 bg-ink-900/60 p-1.5">
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
                        {kf.effect && (
                          <span className="rounded bg-amber-400/20 text-amber-300 text-[9px] px-1 py-0.2 shrink-0">
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
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Wand2 className="size-4 text-amber-300" />
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
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-amber-200 hover:border-amber-400 hover:bg-ink-800 transition-colors"
                >
                  <SunMedium className="size-3.5 text-amber-400 shrink-0" />
                  <span>Spotlight</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("vignette")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-purple-200 hover:border-purple-400 hover:bg-ink-800 transition-colors"
                >
                  <Circle className="size-3.5 text-purple-400 shrink-0" />
                  <span>Vignette</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("blur")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-blue-200 hover:border-blue-400 hover:bg-ink-800 transition-colors"
                >
                  <Sparkles className="size-3.5 text-blue-400 shrink-0" />
                  <span>Motion Blur</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("glow")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-cyan-200 hover:border-cyan-400 hover:bg-ink-800 transition-colors"
                >
                  <Zap className="size-3.5 text-cyan-400 shrink-0" />
                  <span>Cursor Glow</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("filter", "cinematic")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-rose-200 hover:border-rose-400 hover:bg-ink-800 transition-colors"
                >
                  <Paintbrush className="size-3.5 text-rose-400 shrink-0" />
                  <span>Color Grade</span>
                </button>

                <button
                  type="button"
                  onClick={() => addEffectAtCurrentTime("speed")}
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-900/80 px-2 py-2 text-left text-[11px] font-medium text-emerald-200 hover:border-emerald-400 hover:bg-ink-800 transition-colors"
                >
                  <Play className="size-3.5 text-emerald-400 shrink-0" />
                  <span>Slow-Mo (0.5x)</span>
                </button>
              </div>
            </div>

            {/* Inspector for selected effect */}
            {selectedEffect ? (
              <div className="rounded-xl border border-ink-800 bg-ink-900 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-fg flex items-center gap-1.5">
                    <Wand2 className="size-3.5 text-amber-400" />
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
                        ? "border-amber-400 bg-amber-500/15 text-amber-200 font-medium"
                        : "border-ink-800 bg-ink-900/60 text-fg-muted hover:border-ink-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Wand2 className="size-3 shrink-0 text-amber-400" />
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
                    <Type className="size-3.5 text-purple-400 shrink-0" />
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
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: "mechanical" as const, label: "Thocky Mech" },
                      { id: "laptop" as const, label: "Laptop Key" },
                      { id: "typewriter" as const, label: "Typewriter" },
                    ].map((preset) => {
                      const isActive = (project?.audioSettings?.typingSoundPreset ?? "mechanical") === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            updateAudioSettings({ typingSoundPreset: preset.id });
                            playTypingSoundPreview(preset.id);
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

            {/* 3. Audio Ducking Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-900/60 p-2.5">
              <div>
                <span className="block text-xs font-semibold text-white">Smart Audio Ducking</span>
                <span className="block text-[10px] text-fg-faint">Dips music volume during clicks & typing</span>
              </div>
              <input
                type="checkbox"
                checked={project?.audioSettings?.musicDuckingEnabled ?? true}
                onChange={(e) => updateAudioSettings({ musicDuckingEnabled: e.target.checked })}
                className="size-4 accent-white rounded cursor-pointer"
              />
            </div>

            {/* 4. Background Music */}
            <div className="space-y-2 pt-1 border-t border-ink-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
                  Background Music
                </span>
                <label className="cursor-pointer rounded-lg bg-ink-800 px-2 py-0.5 text-[10px] font-semibold text-fg-muted hover:text-white hover:bg-ink-700 transition-colors">
                  + Upload Audio
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        addAudioTrack(file.name.replace(/\.[^/.]+$/, ""), url, "music");
                      }
                    }}
                  />
                </label>
              </div>

              {[
                { name: "Ambient Lo-Fi Chill", url: "sample://lofi-chill.mp3" },
                { name: "Modern Tech Flow", url: "sample://tech-flow.mp3" },
                { name: "Energetic Upbeat Beat", url: "sample://upbeat-beat.mp3" },
                { name: "Deep Focus Minimal", url: "sample://focus-drone.mp3" },
              ].map((preset) => (
                <div
                  key={preset.name}
                  className="flex items-center justify-between rounded-xl border border-ink-800 bg-ink-900 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Music className="size-3.5" />
                    </div>
                    <div>
                      <span className="block font-medium text-fg text-xs">{preset.name}</span>
                      <span className="block text-[10px] text-fg-faint">Royalty-free background track</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => addAudioTrack(preset.name, preset.url, "music")}
                    className="rounded-lg bg-ink-800 px-2.5 py-1 text-[11px] font-semibold text-fg hover:bg-white hover:text-black transition-colors"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>

            {/* Active tracks list */}
            {project?.audioTracks && project.audioTracks.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-ink-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
                  Active Audio Tracks
                </span>
                {project.audioTracks.map((tr) => (
                  <div
                    key={tr.id}
                    className="space-y-2 rounded-lg border border-ink-800 bg-ink-900/60 p-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <Music className="size-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate text-xs font-medium text-fg">{tr.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateAudioTrack(tr.id, { muted: !tr.muted })}
                          className="p-1 text-fg-muted hover:text-fg"
                          title={tr.muted ? "Unmute" : "Mute"}
                        >
                          {tr.muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteAudioTrack(tr.id)}
                          className="p-1 text-danger hover:opacity-80"
                          title="Remove track"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-fg-faint">Volume</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={tr.volume}
                        onChange={(e) =>
                          updateAudioTrack(tr.id, { volume: parseFloat(e.target.value) })
                        }
                        className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
                      />
                      <span className="font-mono text-[10px] text-fg-muted w-8 text-right">
                        {Math.round(tr.volume * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CANVAS & LOOKS */}
        {activeToolTab === "looks" && (
          <div className="space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
              Canvas Presets
            </span>

            <div className="grid grid-cols-2 gap-2">
              {[
                { name: "Obsidian", val: "linear-gradient(135deg, #1e2024 0%, #16171a 100%)" },
                { name: "Monochrome Silver", val: "linear-gradient(135deg, #71717a 0%, #27272a 100%)" },
                { name: "Pure Black", val: "linear-gradient(135deg, #09090b 0%, #18181b 100%)" },
                { name: "Studio Charcoal", val: "linear-gradient(135deg, #27272a 0%, #09090b 100%)" },
              ].map((bg) => (
                <button
                  key={bg.name}
                  type="button"
                  onClick={() => updateLooks({ backgroundValue: bg.val })}
                  className="rounded-lg border border-ink-800 p-2 text-left hover:border-white transition-colors"
                  style={{ background: bg.val }}
                >
                  <span className="block text-[11px] font-bold text-white drop-shadow-sm">
                    {bg.name}
                  </span>
                </button>
              ))}
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
            </div>
          </div>
        )}

        {/* TAB 5: CURSOR & RIPPLES */}
        {activeToolTab === "cursor" && (
          <div className="space-y-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-faint">
              Pointer & Click Indicators
            </span>

            <div className="space-y-2">
              <label className="text-[11px] text-fg-muted block">Cursor Pointer Style</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "default", label: "Default OS" },
                  { id: "mac", label: "Mac Arrow" },
                  { id: "dot", label: "Focus Dot" },
                  { id: "ring", label: "Glow Ring" },
                ].map((cur) => (
                  <button
                    key={cur.id}
                    type="button"
                    onClick={() => updateLooks({ cursorStyle: cur.id as ProjectLooks["cursorStyle"] })}
                    className={`rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                      project?.looks.cursorStyle === cur.id
                        ? "border-white bg-white/20 text-white font-bold"
                        : "border-ink-800 bg-ink-900 text-fg-muted hover:text-fg hover:border-neutral-600"
                    }`}
                  >
                    {cur.label}
                  </button>
                ))}
              </div>
            </div>

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
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
