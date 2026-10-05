import { useRef } from "react";
import {
  Maximize2,
  Minimize2,
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
} from "lucide-react";
import { formatDuration, type ProjectData } from "@domolens/core";
import { copy } from "../../copy/en";
import { IconButton } from "../ui/IconButton";
import { useEditor } from "../../store/editor";

interface TimelineProps {
  project: ProjectData;
}

export function Timeline({ project }: TimelineProps) {
  const {
    currentTimeMs,
    durationMs,
    isPlaying,
    selectedBlockId,
    selectedClipId,
    selectedKeyframeId,
    selectedTextId,
    selectedAudioId,
    timelineZoom,
    history,
    future,
    setCurrentTime,
    togglePlay,
    setTimelineZoom,
    selectBlock,
    selectClip,
    selectKeyframe,
    selectText,
    selectAudio,
    splitAtCurrentTime,
    deleteSelected,
    addZoomBlockAtCurrentTime,
    updateZoomBlock,
    addKeyframeAtCurrentTime,
    addTextOverlay,
    addAudioTrack,
    plotInteractions,
    undo,
    redo,
  } = useEditor();

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

          <span className="ml-1 sm:ml-2 font-mono text-xs font-semibold text-fg tabular">
            {formatDuration(currentTimeMs)} / {formatDuration(durationMs)}
          </span>
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
            <span className="hidden sm:inline">⚡ Auto-Plot</span>
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
            className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-800 px-2 py-1 text-xs font-medium text-fg hover:border-white hover:text-white transition-colors"
            title="Add keyframe diamond at current playhead"
          >
            <span className="text-white font-bold">◆</span>
            <span className="hidden md:inline">+ Keyframe</span>
          </button>

          {/* + Text */}
          <button
            type="button"
            onClick={() => addTextOverlay("New Caption")}
            className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-800 px-2 py-1 text-xs font-medium text-fg hover:border-purple-500/40 hover:text-purple-300 transition-colors"
            title="Add text overlay"
          >
            <Type className="size-3.5 text-purple-400" />
            <span className="hidden md:inline">+ Text</span>
          </button>

          {/* + Music */}
          <button
            type="button"
            onClick={() => addAudioTrack("Lo-Fi Beat", "sample://lofi-chill.mp3", "music")}
            className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-800 px-2 py-1 text-xs font-medium text-fg hover:border-emerald-500/40 hover:text-emerald-300 transition-colors"
            title="Add background audio track"
          >
            <Music className="size-3.5 text-emerald-400" />
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
      <div className="relative px-3 sm:px-4 py-3">
        <div
          ref={trackContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative flex flex-col gap-1.5 rounded-xl bg-ink-950 p-2 cursor-pointer shadow-inner touch-none"
        >
          {/* TRACK 1: KEYFRAMES TRACK (◆ Nodes) */}
          <div className="relative h-6 rounded-md bg-ink-900/90 border border-ink-800/80 overflow-hidden flex items-center">
            <span className="absolute left-2 text-[9px] font-semibold uppercase tracking-wider text-fg-faint pointer-events-none z-10">
              Keyframes
            </span>

            {project.keyframes &&
              project.keyframes.map((kf, idx) => {
                const pos = getPositionPercent(kf.timeMs);
                const isSelected = selectedKeyframeId === kf.id;
                return (
                  <div
                    key={kf.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectKeyframe(kf.id);
                      setCurrentTime(kf.timeMs);
                    }}
                    title={`Keyframe #${idx + 1}: ${kf.scale.toFixed(1)}x at ${formatDuration(kf.timeMs)} (${kf.easing})`}
                    className={`absolute -translate-x-1/2 cursor-pointer transition-all z-20 group ${
                      isSelected
                        ? "scale-125 z-30"
                        : "hover:scale-125 opacity-90 hover:opacity-100"
                    }`}
                    style={{ left: `${pos}%` }}
                  >
                    <div
                      className={`size-3 rotate-45 border shadow-sm ${
                        isSelected
                          ? "bg-white border-black shadow-md scale-110"
                          : "bg-neutral-300 border-neutral-500"
                      }`}
                    />
                  </div>
                );
              })}
          </div>

          {/* TRACK 2: ZOOM BLOCKS TRACK */}
          <div className="relative h-9 rounded-lg bg-ink-900 border border-ink-800/80 overflow-hidden">
            <span className="absolute left-2 top-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-faint pointer-events-none">
              {copy.editor.autoZoomTrack}
            </span>

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
                  }}
                  className={`absolute top-1 bottom-1 flex items-center justify-between rounded-md border px-2 text-xs font-medium transition-all ${
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

          {/* TRACK 3: VIDEO CLIPS */}
          <div className="relative h-11 rounded-lg bg-ink-900 border border-ink-800/80 overflow-hidden">
            <span className="absolute left-2 top-1.5 text-[10px] font-semibold uppercase tracking-wider text-fg-faint pointer-events-none">
              {copy.editor.videoTrack}
            </span>

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
                  <span className="truncate font-medium text-fg">{clip.name}</span>
                  <div className="flex items-center gap-1.5 opacity-70">
                    {clip.muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
                    <span className="font-mono text-[10px]">{formatDuration(clip.durationMs)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TRACK 4: TEXT OVERLAYS TRACK */}
          {project.textOverlays && project.textOverlays.length > 0 && (
            <div className="relative h-7 rounded-md bg-ink-900/80 border border-ink-800/70 overflow-hidden">
              <span className="absolute left-2 text-[9px] font-semibold uppercase tracking-wider text-fg-faint pointer-events-none">
                Captions
              </span>

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
                        ? "border-purple-400 bg-purple-500/30 text-purple-200 z-10"
                        : "border-purple-500/40 bg-purple-500/15 text-purple-300"
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
              <span className="absolute left-2 text-[9px] font-semibold uppercase tracking-wider text-fg-faint pointer-events-none">
                Music & SFX
              </span>

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
                        ? "border-emerald-400 bg-emerald-500/30 text-emerald-200 z-10"
                        : "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
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
          <div
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-white z-30 shadow-sm"
            style={{ left: `${getPositionPercent(currentTimeMs)}%` }}
          >
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 size-3.5 rotate-45 rounded-sm bg-white border border-neutral-900" />
          </div>
        </div>
      </div>
    </div>
  );
}
