import { useRef } from "react";
import {
  Diamond,
  Film,
  Keyboard,
  Maximize2,
  Minimize2,
  MousePointer,
  Music,
  Pause,
  Play,
  Plus,
  Redo2,
  Scissors,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Volume2,
  VolumeX,
  Wand2,
} from "lucide-react";
import { formatDuration, type ProjectData } from "@domolens/core";
import { copy } from "../../copy/en";
import { IconButton } from "../ui/IconButton";
import { useEditor } from "../../store/editor";

interface TimelineProps {
  project: ProjectData;
}

function TimelineTimeDisplay({ durationMs }: { durationMs: number }) {
  const currentTimeMs = useEditor((s) => s.currentTimeMs);
  return (
    <span className="ml-1 sm:ml-2 font-mono text-xs font-semibold text-fg tabular">
      {formatDuration(currentTimeMs)} / {formatDuration(durationMs)}
    </span>
  );
}

function TimelinePlayhead({ durationMs }: { durationMs: number }) {
  const currentTimeMs = useEditor((s) => s.currentTimeMs);
  const percent = durationMs > 0 ? Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100)) : 0;
  return (
    <div
      className="pointer-events-none absolute inset-y-0 w-0.5 bg-white z-30 shadow-sm will-change-transform"
      style={{ left: `${percent}%` }}
    >
      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-3.5 rotate-45 rounded-sm bg-white border border-neutral-900" />
    </div>
  );
}

export function Timeline({ project }: TimelineProps) {
  const durationMs = useEditor((s) => s.durationMs);
  const isPlaying = useEditor((s) => s.isPlaying);
  const selectedBlockId = useEditor((s) => s.selectedBlockId);
  const selectedClipId = useEditor((s) => s.selectedClipId);
  const selectedKeyframeId = useEditor((s) => s.selectedKeyframeId);
  const selectedEffectId = useEditor((s) => s.selectedEffectId);
  const selectedTextId = useEditor((s) => s.selectedTextId);
  const selectedAudioId = useEditor((s) => s.selectedAudioId);
  const timelineZoom = useEditor((s) => s.timelineZoom);
  const history = useEditor((s) => s.history);
  const future = useEditor((s) => s.future);
  const setCurrentTime = useEditor((s) => s.setCurrentTime);
  const togglePlay = useEditor((s) => s.togglePlay);
  const setTimelineZoom = useEditor((s) => s.setTimelineZoom);
  const selectBlock = useEditor((s) => s.selectBlock);
  const selectClip = useEditor((s) => s.selectClip);
  const selectKeyframe = useEditor((s) => s.selectKeyframe);
  const selectEffect = useEditor((s) => s.selectEffect);
  const selectText = useEditor((s) => s.selectText);
  const selectAudio = useEditor((s) => s.selectAudio);
  const splitAtCurrentTime = useEditor((s) => s.splitAtCurrentTime);
  const deleteSelected = useEditor((s) => s.deleteSelected);
  const addZoomBlockAtCurrentTime = useEditor((s) => s.addZoomBlockAtCurrentTime);
  const updateZoomBlock = useEditor((s) => s.updateZoomBlock);
  const addKeyframeAtCurrentTime = useEditor((s) => s.addKeyframeAtCurrentTime);
  const updateKeyframe = useEditor((s) => s.updateKeyframe);
  const deleteKeyframe = useEditor((s) => s.deleteKeyframe);
  const addEffectAtCurrentTime = useEditor((s) => s.addEffectAtCurrentTime);
  const updateEffect = useEditor((s) => s.updateEffect);
  const deleteEffect = useEditor((s) => s.deleteEffect);
  const addTextOverlay = useEditor((s) => s.addTextOverlay);
  const addAudioTrack = useEditor((s) => s.addAudioTrack);
  const plotInteractions = useEditor((s) => s.plotInteractions);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  const trackContainerRef = useRef<HTMLDivElement>(null);

  // Convert timeline timestamp to percentage position
  const getPositionPercent = (timeMs: number) => {
    if (durationMs <= 0) return 0;
    return Math.min(100, Math.max(0, (timeMs / durationMs) * 100));
  };

  // Pointer scrubbing state
  const isDraggingScrubber = useRef(false);

  const seekFromPointer = (clientX: number) => {
    if (!trackContainerRef.current || durationMs <= 0) return;
    const rect = trackContainerRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const percent = Math.min(1, Math.max(0, clickX / rect.width));
    setCurrentTime(Math.round(percent * durationMs));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    isDraggingScrubber.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    seekFromPointer(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScrubber.current) return;
    seekFromPointer(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingScrubber.current) {
      isDraggingScrubber.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="flex flex-col border-t border-ink-800 bg-ink-900 select-none pb-[max(0.5rem,var(--safe-bottom))]">
      {/* 1. Timeline Controls Toolbar */}
      <div className="flex h-12 items-center justify-between border-b border-ink-800 px-3 sm:px-4 gap-2 overflow-x-auto no-scrollbar">
        {/* Playback Controls & Time */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <IconButton
            label={isPlaying ? copy.editor.pause : copy.editor.play}
            icon={isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
            variant="secondary"
            size="sm"
            onClick={togglePlay}
          />

          <TimelineTimeDisplay durationMs={durationMs} />
        </div>

        {/* Multi-Track Editing Actions: Auto-Plot, Keyframe, Split, Text, Music, Undo/Redo */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Quick Auto-Plot Button */}
          <button
            type="button"
            onClick={() => plotInteractions({ holdDurationMs: 2400, scale: 1.85 })}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2 sm:px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-700 hover:border-white shadow-sm transition-all"
            title="Auto-plot 2-3s camera zooms on all clicks and typing"
          >
            <Sparkles className="size-3.5 text-white" />
            <span className="hidden sm:inline">Auto-Plot</span>
          </button>

          <div className="mx-0.5 h-4 w-px bg-ink-800" />

          {/* Split */}
          <button
            type="button"
            onClick={splitAtCurrentTime}
            className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-800 px-2 py-1 text-xs font-medium text-fg hover:border-ink-600 hover:bg-ink-700 transition-colors"
            title="Split clip at playhead (S)"
          >
            <Scissors className="size-3.5 text-white" />
            <span className="hidden md:inline">Split</span>
          </button>

          {/* + Keyframe */}
          <button
            type="button"
            onClick={() => addKeyframeAtCurrentTime()}
            className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800 px-2 py-1 text-xs font-medium text-fg hover:border-white hover:text-white transition-colors"
            title="Add keyframe diamond at current playhead (K)"
          >
            <Diamond className="size-3 text-white fill-white shrink-0" />
            <span className="hidden md:inline">+ Keyframe</span>
          </button>

          {/* + Effect */}
          <button
            type="button"
            onClick={() => addEffectAtCurrentTime("spotlight")}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
            title="Add visual effect at playhead (Spotlight, Blur, Vignette, Glow, Filter)"
          >
            <Wand2 className="size-3 text-neutral-300 shrink-0" />
            <span className="hidden md:inline">+ Effect</span>
          </button>

          {/* + Text */}
          <button
            type="button"
            onClick={() => addTextOverlay("New Caption")}
            className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
            title="Add text overlay"
          >
            <Type className="size-3.5 text-neutral-300" />
            <span className="hidden md:inline">+ Text</span>
          </button>

          {/* + Music */}
          <button
            type="button"
            onClick={() => addAudioTrack("Lo-Fi Beat", "sample://lofi-chill.mp3", "music")}
            className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors"
            title="Add background audio track"
          >
            <Music className="size-3.5 text-neutral-300" />
            <span className="hidden md:inline">+ Music</span>
          </button>

          {/* + Zoom */}
          <button
            type="button"
            onClick={addZoomBlockAtCurrentTime}
            className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700 hover:border-white transition-colors"
            title="Add Zoom Block"
          >
            <Plus className="size-3.5" />
            <span className="hidden md:inline">Zoom</span>
          </button>

          <IconButton
            label={copy.editor.delete}
            icon={<Trash2 className="size-4 text-danger" />}
            variant="ghost"
            size="sm"
            disabled={
              !selectedBlockId &&
              !selectedClipId &&
              !selectedKeyframeId &&
              !selectedEffectId &&
              !selectedTextId &&
              !selectedAudioId
            }
            onClick={deleteSelected}
          />

          <div className="mx-1 h-4 w-px bg-ink-800" />

          <IconButton
            label={copy.editor.undo}
            icon={<Undo2 className="size-4" />}
            variant="ghost"
            size="sm"
            disabled={history.length === 0}
            onClick={undo}
          />
          <IconButton
            label={copy.editor.redo}
            icon={<Redo2 className="size-4" />}
            variant="ghost"
            size="sm"
            disabled={future.length === 0}
            onClick={redo}
          />

          <div className="mx-1 h-4 w-px bg-ink-800" />

          {/* Timeline Zoom Controls */}
          <IconButton
            label={copy.editor.zoomOutTimeline}
            icon={<Minimize2 className="size-3.5" />}
            variant="ghost"
            size="sm"
            disabled={timelineZoom <= 0.75}
            onClick={() => setTimelineZoom(timelineZoom - 0.25)}
          />
          <IconButton
            label={copy.editor.zoomInTimeline}
            icon={<Maximize2 className="size-3.5" />}
            variant="ghost"
            size="sm"
            disabled={timelineZoom >= 3}
            onClick={() => setTimelineZoom(timelineZoom + 0.25)}
          />
        </div>
      </div>

      {/* 2. Visual Tracks Container */}
      <div className="relative px-3 sm:px-4 py-3 flex gap-2 sm:gap-3 items-stretch">
        {/* Left Track Headers Sidebar Column */}
        <div className="flex flex-col gap-1.5 shrink-0 w-24 sm:w-28 md:w-32 select-none py-2 pr-1 sm:pr-2 border-r border-ink-800/70">
          {/* TRACK 1: KEYFRAMES HEADER */}
          <div className="h-7 flex items-center gap-1.5 px-2 rounded-md bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            <Diamond className="size-3 text-neutral-300 fill-neutral-300 shrink-0" />
            <span className="truncate">Keyframes</span>
          </div>

          {/* TRACK 2: ZOOM BLOCKS HEADER */}
          <button
            type="button"
            onClick={() => plotInteractions({ holdDurationMs: 2400, scale: 1.85 })}
            className="h-9 flex items-center justify-between px-2 rounded-lg bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-fg-muted hover:text-white hover:bg-ink-800 transition-colors text-left group"
            title="Auto-plot 2-3s camera zooms on all clicks and typing (applies immediately)"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles className="size-3 text-neutral-300 group-hover:text-white shrink-0" />
              <span className="truncate">{copy.editor.autoZoomTrack}</span>
            </div>
            <Plus className="size-3 text-neutral-400 group-hover:text-white shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* TRACK: VIDEO EFFECTS HEADER */}
          {project.effects && project.effects.length > 0 && (
            <div className="h-8 flex items-center gap-1.5 px-2 rounded-lg bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              <Wand2 className="size-3 text-neutral-300 shrink-0" />
              <span className="truncate">Effects</span>
            </div>
          )}

          {/* TRACK 3: VIDEO CLIPS HEADER */}
          <div className="h-11 flex items-center gap-1.5 px-2 rounded-lg bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
            <Film className="size-3 text-neutral-300 shrink-0" />
            <span className="truncate">{copy.editor.videoTrack}</span>
          </div>

          {/* TRACK 4: TEXT OVERLAYS TRACK HEADER */}
          {project.textOverlays && project.textOverlays.length > 0 && (
            <div className="h-7 flex items-center gap-1.5 px-2 rounded-md bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              <Type className="size-3 text-neutral-300 shrink-0" />
              <span className="truncate">Captions</span>
            </div>
          )}

          {/* TRACK 5: AUDIO TRACK HEADER */}
          {project.audioTracks && project.audioTracks.length > 0 && (
            <div className="h-7 flex items-center gap-1.5 px-2 rounded-md bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              <Music className="size-3 text-neutral-300 shrink-0" />
              <span className="truncate">Music & SFX</span>
            </div>
          )}

          {/* TRACK 6: MARKERS HEADER */}
          <div className="h-3 flex items-center gap-1 px-2 text-[9px] font-semibold uppercase tracking-wider text-fg-faint">
            <MousePointer className="size-2.5 text-neutral-500 shrink-0" />
            <span className="truncate">Events</span>
          </div>
        </div>

        {/* Right Scrubber and Lanes Container */}
        <div
          ref={trackContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative flex-1 min-w-0 flex flex-col gap-1.5 rounded-xl bg-ink-950 p-2 cursor-pointer shadow-inner touch-none"
        >
          {/* TRACK 1: KEYFRAMES TRACK (Diamond Nodes) */}
          <div className="relative h-7 rounded-md bg-ink-900/90 border border-ink-800/80 flex items-center">

            {project.keyframes &&
              project.keyframes.map((kf, idx) => {
                const rawPos = getPositionPercent(kf.timeMs);
                const pos = Math.max(1.5, Math.min(98.5, rawPos));
                const isSelected = selectedKeyframeId === kf.id;
                return (
                  <div
                    key={kf.id}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      selectKeyframe(kf.id);
                      setCurrentTime(kf.timeMs);
                      const startX = e.clientX;
                      const origTime = kf.timeMs;
                      const onMove = (me: PointerEvent) => {
                        const deltaRatio =
                          (me.clientX - startX) / (trackContainerRef.current?.clientWidth || 1);
                        const newTime = Math.max(0, Math.min(durationMs, origTime + deltaRatio * durationMs));
                        updateKeyframe(kf.id, { timeMs: Math.round(newTime) });
                      };
                      const onUp = () => {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                    }}
                    title={`Keyframe #${idx + 1}: ${kf.scale.toFixed(1)}x at ${formatDuration(kf.timeMs)} (${kf.easing})${kf.sound ? ` - Sound: ${kf.sound}` : ""}${kf.effect ? ` - Effect: ${kf.effect}` : ""}`}
                    className={`absolute -translate-x-1/2 cursor-grab active:cursor-grabbing transition-all z-20 group ${
                      isSelected
                        ? "scale-125 z-30"
                        : "hover:scale-125 opacity-90 hover:opacity-100"
                    }`}
                    style={{ left: `${pos}%` }}
                  >
                    <div
                      className={`relative size-3.5 rotate-45 border shadow-sm ${
                        isSelected
                          ? "bg-white border-black shadow-md scale-110"
                          : kf.effect
                          ? "bg-neutral-100 border-neutral-400 shadow"
                          : kf.sound === "typing"
                          ? "bg-neutral-300 border-neutral-500 shadow"
                          : kf.sound === "click"
                          ? "bg-neutral-400 border-neutral-600 shadow"
                          : "bg-neutral-200 border-neutral-400"
                      }`}
                    />
                    {kf.sound && (
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center">
                        {kf.sound === "typing" ? (
                          <Keyboard className="size-2 text-neutral-300" />
                        ) : (
                          <MousePointer className="size-2 text-neutral-300" />
                        )}
                      </div>
                    )}
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteKeyframe(kf.id);
                        }}
                        className="absolute -top-5 left-1/2 -translate-x-1/2 size-4 rounded-full bg-danger text-white flex items-center justify-center hover:scale-110 transition-transform shadow-lg z-40 border border-ink-950"
                        title="Delete keyframe (Delete)"
                      >
                        <Trash2 className="size-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
          </div>

          {/* TRACK 2: ZOOM BLOCKS TRACK */}
          <div className="relative h-9 rounded-lg bg-ink-900 border border-ink-800/80 overflow-hidden">
            {project.zoomBlocks.map((block) => {
              const left = getPositionPercent(block.startTimeMs);
              const width = Math.max(2, getPositionPercent(block.endTimeMs) - left);
              const isSelected = selectedBlockId === block.id;

              return (
                <div
                  key={block.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectBlock(block.id);
                    setCurrentTime(Math.round((block.startTimeMs + block.endTimeMs) / 2));
                  }}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest(".group\\/handle")) return;
                    e.stopPropagation();
                    selectBlock(block.id);
                    const startX = e.clientX;
                    const origStart = block.startTimeMs;
                    const blockDur = block.endTimeMs - block.startTimeMs;
                    const onMove = (me: PointerEvent) => {
                      const deltaRatio =
                        (me.clientX - startX) / (trackContainerRef.current?.clientWidth || 1);
                      const newStart = Math.max(
                        0,
                        Math.min(durationMs - blockDur, Math.round(origStart + deltaRatio * durationMs)),
                      );
                      updateZoomBlock(block.id, {
                        startTimeMs: newStart,
                        endTimeMs: newStart + blockDur,
                      });
                    };
                    const onUp = () => {
                      window.removeEventListener("pointermove", onMove);
                      window.removeEventListener("pointerup", onUp);
                    };
                    window.addEventListener("pointermove", onMove);
                    window.addEventListener("pointerup", onUp);
                  }}
                  className={`absolute top-1 bottom-1 flex items-center justify-between rounded-md border px-2 text-xs font-medium cursor-grab active:cursor-grabbing transition-all ${
                    isSelected
                      ? "border-white bg-white/25 text-white font-bold shadow-sm z-10"
                      : block.enabled
                      ? "border-neutral-600 bg-neutral-800/90 text-neutral-200 hover:border-neutral-400"
                      : "border-ink-600 bg-ink-800/50 text-fg-faint"
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                >
                  <span className="truncate text-[11px] font-semibold">
                    {block.scale.toFixed(1)}x Auto-Zoom
                  </span>

                  {/* Left & Right Drag Handles */}
                  <div
                    className="absolute -left-2 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center touch-none z-20 group/handle"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const origStart = block.startTimeMs;
                      const onMove = (me: PointerEvent) => {
                        const deltaRatio =
                          (me.clientX - startX) / (trackContainerRef.current?.clientWidth || 1);
                        const newTime = Math.max(
                          0,
                          Math.min(block.endTimeMs - 500, origStart + deltaRatio * durationMs),
                        );
                        updateZoomBlock(block.id, { startTimeMs: Math.round(newTime) });
                      };
                      const onUp = () => {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                    }}
                  >
                    <div className="w-1 h-3/4 rounded-full bg-white group-hover/handle:bg-neutral-300" />
                  </div>
                  <div
                    className="absolute -right-2 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center touch-none z-20 group/handle"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const origEnd = block.endTimeMs;
                      const onMove = (me: PointerEvent) => {
                        const deltaRatio =
                          (me.clientX - startX) / (trackContainerRef.current?.clientWidth || 1);
                        const newTime = Math.max(
                          block.startTimeMs + 500,
                          Math.min(durationMs, origEnd + deltaRatio * durationMs),
                        );
                        updateZoomBlock(block.id, { endTimeMs: Math.round(newTime) });
                      };
                      const onUp = () => {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                    }}
                  >
                    <div className="w-1 h-3/4 rounded-full bg-white group-hover/handle:bg-neutral-300" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK: VIDEO EFFECTS */}
          {project.effects && project.effects.length > 0 && (
            <div className="relative h-8 rounded-lg bg-ink-900 border border-ink-800/80 overflow-hidden">
              {project.effects.map((eff) => {
                const left = getPositionPercent(eff.startTimeMs);
                const width = Math.max(3, getPositionPercent(eff.startTimeMs + eff.durationMs) - left);
                const isSelected = selectedEffectId === eff.id;

                const effectTheme = isSelected
                  ? "border-white bg-white/20 text-white shadow-sm"
                  : "border-neutral-700 bg-neutral-800/80 text-neutral-300";

                return (
                  <div
                    key={eff.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectEffect(eff.id);
                    }}
                    onPointerDown={(e) => {
                      if (
                        (e.target as HTMLElement).closest(".group\\/handle") ||
                        (e.target as HTMLElement).closest("button")
                      ) {
                        return;
                      }
                      e.stopPropagation();
                      selectEffect(eff.id);
                      const startX = e.clientX;
                      const origStart = eff.startTimeMs;
                      const origDur = eff.durationMs;
                      const onMove = (me: PointerEvent) => {
                        const deltaRatio =
                          (me.clientX - startX) / (trackContainerRef.current?.clientWidth || 1);
                        const newStart = Math.max(
                          0,
                          Math.min(durationMs - origDur, Math.round(origStart + deltaRatio * durationMs)),
                        );
                        updateEffect(eff.id, { startTimeMs: newStart });
                      };
                      const onUp = () => {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                    }}
                    className={`absolute top-1 bottom-1 flex items-center justify-between rounded-md border px-2 text-[10px] font-medium cursor-grab active:cursor-grabbing transition-all group/eff ${
                      isSelected
                        ? "border-white bg-white/25 text-white font-bold shadow-md z-10"
                        : `${effectTheme} hover:border-white/50`
                    }`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                    }}
                  >
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      <Wand2 className="size-2.5 shrink-0" />
                      <span className="truncate">{eff.name}</span>
                    </div>

                    {/* Quick delete button on effect */}
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEffect(eff.id);
                        }}
                        className="ml-1 rounded p-0.5 text-danger hover:bg-danger/20 transition-colors shrink-0"
                        title="Delete effect (Delete)"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}

                    {/* Left & Right Drag Handles */}
                    <div
                      className="absolute -left-2 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center touch-none z-20 group/handle"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const origStart = eff.startTimeMs;
                        const onMove = (me: PointerEvent) => {
                          const deltaRatio =
                            (me.clientX - startX) / (trackContainerRef.current?.clientWidth || 1);
                          const newTime = Math.max(
                            0,
                            Math.min(eff.startTimeMs + eff.durationMs - 400, origStart + deltaRatio * durationMs),
                          );
                          const newDur = eff.startTimeMs + eff.durationMs - newTime;
                          updateEffect(eff.id, {
                            startTimeMs: Math.round(newTime),
                            durationMs: Math.round(newDur),
                          });
                        };
                        const onUp = () => {
                          window.removeEventListener("pointermove", onMove);
                          window.removeEventListener("pointerup", onUp);
                        };
                        window.addEventListener("pointermove", onMove);
                        window.addEventListener("pointerup", onUp);
                      }}
                    >
                      <div className="w-1 h-3/4 rounded-full bg-white/80 group-hover/handle:bg-white" />
                    </div>
                    <div
                      className="absolute -right-2 top-0 bottom-0 w-4 cursor-ew-resize flex items-center justify-center touch-none z-20 group/handle"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const origDur = eff.durationMs;
                        const onMove = (me: PointerEvent) => {
                          const deltaRatio =
                            (me.clientX - startX) / (trackContainerRef.current?.clientWidth || 1);
                          const newDur = Math.max(
                            400,
                            Math.min(durationMs - eff.startTimeMs, origDur + deltaRatio * durationMs),
                          );
                          updateEffect(eff.id, { durationMs: Math.round(newDur) });
                        };
                        const onUp = () => {
                          window.removeEventListener("pointermove", onMove);
                          window.removeEventListener("pointerup", onUp);
                        };
                        window.addEventListener("pointermove", onMove);
                        window.addEventListener("pointerup", onUp);
                      }}
                    >
                      <div className="w-1 h-3/4 rounded-full bg-white/80 group-hover/handle:bg-white" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TRACK 3: VIDEO CLIPS */}
          <div className="relative h-11 rounded-lg bg-ink-900 border border-ink-800/80 overflow-hidden">
            {project.clips.map((clip) => {
              const left = getPositionPercent(clip.timelineStartMs);
              const width = Math.max(2, getPositionPercent(clip.timelineStartMs + clip.durationMs) - left);
              const isSelected = selectedClipId === clip.id;

              return (
                <div
                  key={clip.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectClip(clip.id);
                  }}
                  className={`absolute top-1 bottom-1 flex items-center justify-between rounded-md border px-3 text-xs transition-all ${
                    isSelected
                      ? "border-white bg-ink-700 text-fg shadow-sm z-10"
                      : "border-ink-700 bg-ink-800 text-fg-muted hover:border-ink-600"
                  }`}
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                  }}
                >
                  <span className="truncate font-medium text-fg min-w-0 mr-2">{clip.name}</span>
                  <div className="flex items-center gap-1.5 opacity-80 shrink-0">
                    {clip.muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
                    <span className="font-mono text-[10px]">{formatDuration(clip.durationMs)}</span>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          useEditor.getState().deleteVideoClip(clip.id);
                        }}
                        className="ml-1 p-0.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                        title="Delete video clip"
                      >
                        <Trash2 className="size-3 text-neutral-300 hover:text-white" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 4: TEXT OVERLAYS TRACK */}
          {project.textOverlays && project.textOverlays.length > 0 && (
            <div className="relative h-7 rounded-md bg-ink-900/80 border border-ink-800/70 overflow-hidden">
              {project.textOverlays.map((t) => {
                const left = getPositionPercent(t.startTimeMs);
                const width = Math.max(3, getPositionPercent(t.startTimeMs + t.durationMs) - left);
                const isSelected = selectedTextId === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectText(t.id);
                    }}
                    className={`absolute top-0.5 bottom-0.5 flex items-center rounded border px-2 text-[10px] truncate cursor-pointer transition-all ${
                      isSelected
                        ? "border-white bg-white/20 text-white z-10"
                        : "border-neutral-700 bg-neutral-800 text-neutral-300"
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <Type className="size-2.5 mr-1 shrink-0" />
                    <span className="truncate">{t.text}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* TRACK 5: AUDIO TRACK */}
          {project.audioTracks && project.audioTracks.length > 0 && (
            <div className="relative h-7 rounded-md bg-ink-900/80 border border-ink-800/70 overflow-hidden">
              {project.audioTracks.map((a) => {
                const left = getPositionPercent(a.startTimeMs);
                const width = Math.max(3, getPositionPercent(a.startTimeMs + a.durationMs) - left);
                const isSelected = selectedAudioId === a.id;

                return (
                  <div
                    key={a.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAudio(a.id);
                    }}
                    className={`absolute top-0.5 bottom-0.5 flex items-center rounded border px-2 text-[10px] truncate cursor-pointer transition-all ${
                      isSelected
                        ? "border-white bg-white/20 text-white z-10"
                        : "border-neutral-700 bg-neutral-800 text-neutral-300"
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <Music className="size-2.5 mr-1 shrink-0" />
                    <span className="truncate">{a.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* TRACK 6: CLICK & TYPING MARKERS */}
          <div className="relative h-3 w-full">
            {/* Clicks (Orange) */}
            {project.clicks.map((click) => (
              <div
                key={click.id}
                title={`Mouse Click at ${formatDuration(click.timestampMs)}`}
                className="absolute top-0 bottom-0 w-1 -translate-x-1/2 rounded-full bg-white hover:scale-150 transition-transform"
                style={{ left: `${getPositionPercent(click.timestampMs)}%` }}
              />
            ))}

            {/* Typing interactions */}
            {project.interactions?.filter((i) => i.type === "typing").map((typeEvt) => (
              <div
                key={typeEvt.id}
                title={`Typing "${typeEvt.snippet || "key"}" at ${formatDuration(typeEvt.timestampMs)}`}
                className="absolute top-0 bottom-0 w-1 -translate-x-1/2 rounded-full bg-neutral-300 hover:scale-150 transition-transform"
                style={{ left: `${getPositionPercent(typeEvt.timestampMs)}%` }}
              />
            ))}
          </div>

          {/* Draggable Playhead Scrubber */}
          <TimelinePlayhead durationMs={durationMs} />
        </div>
      </div>
    </div>
  );
}
