import { useEffect, useRef, useState } from "react";
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Diamond,
  Film,
  Hand,
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
import { formatDuration, type AudioTrack, type ProjectData } from "@domolens/core";
import { copy } from "../../copy/en";
import { IconButton } from "../ui/IconButton";
import { useEditor, DEFAULT_TRACK_HEADER_WIDTH } from "../../store/editor";
import { sfx } from "../../lib/sound-effects";
import { ResizeHandle } from "./ResizeHandle";

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
  const timelineHeight = useEditor((s) => s.timelineHeight);
  const timelineTrackHeaderWidth = useEditor((s) => s.timelineTrackHeaderWidth);
  const activeTimelineTool = useEditor((s) => s.activeTimelineTool ?? "select");
  const setActiveTimelineTool = useEditor((s) => s.setActiveTimelineTool);
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
  const splitAtPlayhead = useEditor((s) => s.splitAtPlayhead ?? s.splitAtCurrentTime);
  const trimLeftAtPlayhead = useEditor((s) => s.trimLeftAtPlayhead ?? s.trimLeftAtCurrentTime);
  const trimRightAtPlayhead = useEditor((s) => s.trimRightAtPlayhead ?? s.trimRightAtCurrentTime);
  const addSfxTrackAtCurrentTime = useEditor((s) => s.addSfxTrackAtCurrentTime);
  const deleteAudioTrack = useEditor((s) => s.deleteAudioTrack);
  const updateAudioTrack = useEditor((s) => s.updateAudioTrack);
  const addAudioTrack = useEditor((s) => s.addAudioTrack);
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
  const updateTextOverlay = useEditor((s) => s.updateTextOverlay);
  const deleteTextOverlay = useEditor((s) => s.deleteTextOverlay);
  const plotInteractions = useEditor((s) => s.plotInteractions);
  const autoZoom = useEditor((s) => s.autoZoom);
  const autoAfx = useEditor((s) => s.autoAfx);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  const allAudioTracks = project.audioTracks || [];
  const sfxTracks = allAudioTracks.filter((t) => t.type === "sfx");
  const musicTracks = allAudioTracks.filter((t) => t.type !== "sfx");

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackContainerRef = useRef<HTMLDivElement>(null);

  // Pan mode dragging state
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ startX: number; scrollLeft: number } | null>(null);

  // Split mode razor blade hover guide
  const [hoverTimeMs, setHoverTimeMs] = useState<number | null>(null);

  // Text inline editing state
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>("");

  const commitTextEdit = (id: string) => {
    const trimmed = editingTextValue.trim();
    if (trimmed && trimmed.length > 0) {
      updateTextOverlay(id, { text: trimmed });
    }
    setEditingTextId(null);
    setEditingTextValue("");
  };

  const cancelTextEdit = () => {
    setEditingTextId(null);
    setEditingTextValue("");
  };

  const handleAddSfx = (preset: "bop" | "mechanical" = "bop", name = "Click Bop") => {
    if (addSfxTrackAtCurrentTime) {
      addSfxTrackAtCurrentTime(preset, name);
    } else {
      addAudioTrack(name, `/sounds/${preset}.mp3`, "sfx");
    }
  };

  const auditionSfx = (track: AudioTrack) => {
    const nameLower = track.name.toLowerCase();
    const vol = track.volume ?? 0.7;
    if (
      nameLower.includes("typ") ||
      nameLower.includes("key") ||
      nameLower.includes("thock") ||
      nameLower.includes("creamy") ||
      nameLower.includes("switch")
    ) {
      sfx.playKeystroke("creamy", vol);
    } else {
      sfx.playClickBop("bop", vol);
    }
  };

  const handleSfxPointerDown = (e: React.PointerEvent, sfxItem: AudioTrack) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    selectAudio(sfxItem.id);
    setCurrentTime(sfxItem.startTimeMs);
    auditionSfx(sfxItem);

    const startX = e.clientX;
    const origStart = sfxItem.startTimeMs;
    const clipDur = sfxItem.durationMs;
    const trackW = trackContainerRef.current?.clientWidth || 1;

    const onMove = (me: PointerEvent) => {
      const deltaRatio = (me.clientX - startX) / trackW;
      const newStart = Math.max(
        0,
        Math.min(durationMs - clipDur, Math.round(origStart + deltaRatio * durationMs)),
      );
      updateAudioTrack(sfxItem.id, { startTimeMs: newStart });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // Keyboard shortcut listener: V (Select), C/S (Split), H (Pan), Q (Trim Left), W (Trim Right)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      if (key === "v") {
        e.preventDefault();
        setActiveTimelineTool("select");
      } else if (key === "c" || key === "s") {
        e.preventDefault();
        setActiveTimelineTool("split");
      } else if (key === "h") {
        e.preventDefault();
        setActiveTimelineTool("pan");
      } else if (key === "q") {
        e.preventDefault();
        trimLeftAtPlayhead();
      } else if (key === "w") {
        e.preventDefault();
        trimRightAtPlayhead();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTimelineTool, trimLeftAtPlayhead, trimRightAtPlayhead]);

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

  const handleViewportPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTimelineTool === "pan" || e.button === 1) {
      if (!viewportRef.current) return;
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = {
        startX: e.clientX,
        scrollLeft: viewportRef.current.scrollLeft,
      };
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (e.button === 0) {
      if (activeTimelineTool === "split") {
        seekFromPointer(e.clientX);
        splitAtPlayhead();
        return;
      }
      isDraggingScrubber.current = true;
      try {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      } catch {}
      seekFromPointer(e.clientX);
    }
  };

  const handleViewportPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning && panStartRef.current && viewportRef.current) {
      const deltaX = e.clientX - panStartRef.current.startX;
      viewportRef.current.scrollLeft = panStartRef.current.scrollLeft - deltaX;
      return;
    }

    if (activeTimelineTool === "split") {
      if (!trackContainerRef.current || durationMs <= 0) return;
      const rect = trackContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, clickX / rect.width));
      setHoverTimeMs(Math.round(ratio * durationMs));
      return;
    }

    if (isDraggingScrubber.current) {
      seekFromPointer(e.clientX);
    }
  };

  const handleViewportPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      return;
    }

    if (isDraggingScrubber.current) {
      isDraggingScrubber.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTimelineTool === "split") {
      e.stopPropagation();
      if (hoverTimeMs !== null) {
        setCurrentTime(hoverTimeMs);
      }
      splitAtPlayhead();
    }
  };

  return (
    <div
      style={{ height: `${timelineHeight}px` }}
      className="flex flex-col shrink-0 border-t border-ink-800 bg-ink-900 select-none overflow-hidden pb-[max(0.25rem,var(--safe-bottom))]"
    >
      {/* 1. Timeline Controls Toolbar (Responsive with flex-wrap) */}
      <div className="flex flex-wrap items-center justify-between min-h-12 border-b border-ink-800 px-2 sm:px-4 py-1.5 sm:py-0 gap-1.5 sm:gap-2 bg-ink-900/95 overflow-x-auto no-scrollbar">
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

        {/* Feature 12: Tool Switcher (Select, Split, Pan) */}
        <div
          role="group"
          aria-label="Timeline editing tools"
          data-tutorial-target="timeline-tool-switcher"
          className="flex items-center rounded-lg border border-ink-700 bg-ink-950 p-0.5 shadow-sm shrink-0"
        >
          {/* Select Tool (V) */}
          <button
            type="button"
            onClick={() => setActiveTimelineTool("select")}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
              activeTimelineTool === "select"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white hover:bg-ink-800"
            }`}
            data-tutorial-target="tl-select"
            title="Select Tool (V) - Select and edit clips, keyframes, and handles"
            aria-label="Select tool (V)"
            aria-pressed={activeTimelineTool === "select"}
          >
            <MousePointer className="size-3.5 shrink-0" />
            <span className="hidden lg:inline">Select</span>
            <kbd className="hidden xl:inline text-[9px] font-mono opacity-60">V</kbd>
          </button>

          {/* Split / Razor Tool (C or S) */}
          <button
            type="button"
            onClick={() => setActiveTimelineTool("split")}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
              activeTimelineTool === "split"
                ? "bg-rose-500 text-white font-semibold shadow-sm"
                : "text-neutral-400 hover:text-rose-400 hover:bg-ink-800"
            }`}
            data-tutorial-target="tl-razor"
            title="Razor / Split Tool (C or S) - Click anywhere on timeline tracks to split at playhead"
            aria-label="Razor split tool (C or S)"
            aria-pressed={activeTimelineTool === "split"}
          >
            <Scissors className="size-3.5 shrink-0" />
            <span className="hidden lg:inline">Split</span>
            <kbd className="hidden xl:inline text-[9px] font-mono opacity-60">C</kbd>
          </button>

          {/* Pan / Hand Tool (H) */}
          <button
            type="button"
            onClick={() => setActiveTimelineTool("pan")}
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all ${
              activeTimelineTool === "pan"
                ? "bg-amber-500 text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-amber-400 hover:bg-ink-800"
            }`}
            data-tutorial-target="tl-pan"
            title="Hand / Pan Tool (H) - Drag to pan horizontally across zoomed timeline"
            aria-label="Hand pan tool (H)"
            aria-pressed={activeTimelineTool === "pan"}
          >
            <Hand className="size-3.5 shrink-0" />
            <span className="hidden lg:inline">Pan</span>
            <kbd className="hidden xl:inline text-[9px] font-mono opacity-60">H</kbd>
          </button>
        </div>

        {/* Feature 13: Playhead Trim Tools */}
        <div data-tutorial-target="timeline-trim-tools" className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={trimLeftAtPlayhead}
            className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-800 px-2 py-1 text-xs font-medium text-fg hover:border-ink-500 hover:bg-ink-700 transition-colors shadow-sm"
            data-tutorial-target="tl-trim-left"
            title="Trim Left (Q) - Trim media start up to current playhead"
            aria-label="Trim Left at playhead"
          >
            <ArrowLeftToLine className="size-3.5 text-neutral-300 shrink-0" />
            <span className="hidden md:inline">Trim Left</span>
          </button>

          <button
            type="button"
            onClick={trimRightAtPlayhead}
            className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-800 px-2 py-1 text-xs font-medium text-fg hover:border-ink-500 hover:bg-ink-700 transition-colors shadow-sm"
            data-tutorial-target="tl-trim-right"
            title="Trim Right (W) - Trim media end down to current playhead"
            aria-label="Trim Right at playhead"
          >
            <ArrowRightToLine className="size-3.5 text-neutral-300 shrink-0" />
            <span className="hidden md:inline">Trim Right</span>
          </button>
        </div>

        {/* Multi-Track Editing Actions: Auto Zoom, Auto AFX, Keyframe, Split, Text, Zoom */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          {/* Auto Zoom Button */}
          <button
            type="button"
            data-tutorial-target="auto-zoom"
            onClick={() => autoZoom({ holdDurationMs: 1000, inactivityResetMs: 1000, continuousGlide: true, scale: 1.85 })}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2 sm:px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-700 hover:border-white shadow-sm transition-all"
            title="Auto Zoom: Automatically generates smooth camera zooms centered on typing, clicks, and text highlights"
          >
            <Sparkles className="size-3.5 text-white" />
            <span className="hidden sm:inline">Auto Zoom</span>
          </button>

          {/* Auto AFX Button */}
          <button
            type="button"
            onClick={() => autoAfx()}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2 sm:px-2.5 py-1 text-xs font-semibold text-white hover:bg-neutral-700 hover:border-white shadow-sm transition-all"
            data-tutorial-target="tl-auto-afx"
            title="Auto AFX: Automatically synchronizes tactile click bops and mechanical typing audio"
          >
            <Volume2 className="size-3.5 text-white" />
            <span className="hidden sm:inline">Auto AFX</span>
          </button>

          <div className="mx-0.5 h-4 w-px bg-ink-800" />

          {/* Split button */}
          <button
            type="button"
            onClick={splitAtPlayhead}
            className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-800 px-2 py-1 text-xs font-medium text-fg hover:border-ink-600 hover:bg-ink-700 transition-colors"
            data-tutorial-target="tl-split"
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
            data-tutorial-target="tl-add-keyframe"
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
            data-tutorial-target="tl-add-effect"
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
            data-tutorial-target="tl-add-text"
            title="Add text overlay"
          >
            <Type className="size-3.5 text-neutral-300" />
            <span className="hidden md:inline">+ Text</span>
          </button>

          {/* + Zoom */}
          <button
            type="button"
            onClick={addZoomBlockAtCurrentTime}
            className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700 hover:border-white transition-colors"
            data-tutorial-target="tl-add-zoom"
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
          <span className="font-mono text-[10px] text-neutral-400 font-semibold px-1 min-w-[2.5rem] text-center select-none">
            {Math.round(timelineZoom * 100)}%
          </span>
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
      <div data-tutorial-target="timeline-tracks" className="relative px-2 sm:px-3 py-2 flex-1 min-h-0 overflow-y-auto flex gap-1 sm:gap-1.5 items-stretch">
        {/* Left Track Headers Sidebar Column */}
        <div
          style={{ width: `${timelineTrackHeaderWidth}px` }}
          className="flex flex-col gap-1.5 shrink-0 select-none py-1 pr-1"
        >
          {/* TRACK 1: KEYFRAMES HEADER */}
          <div className="h-7 flex items-center justify-between px-2 rounded-md bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-fg-muted group">
            <div className="flex items-center gap-1.5 min-w-0">
              <Diamond className="size-3 text-neutral-300 fill-neutral-300 shrink-0" />
              <span className="truncate">Keyframes</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addKeyframeAtCurrentTime(1.85);
              }}
              className="p-0.5 rounded hover:bg-ink-800 text-neutral-400 hover:text-white transition-colors"
              title="Add keyframe at playhead position (+)"
            >
              <Plus className="size-3" />
            </button>
          </div>

          {/* TRACK 1B: DEDICATED SFX HEADER (Directly Below Keyframes) */}
          <div
            data-tutorial-target="timeline-sfx-track"
            className="h-7 flex items-center justify-between px-2 rounded-md bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-fg-muted group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Volume2 className="size-3 text-cyan-400 shrink-0" />
              <span className="truncate text-cyan-300">SFX</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddSfx();
              }}
              className="flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-cyan-950/60 text-cyan-400 hover:text-cyan-200 border border-cyan-800/60 hover:border-cyan-500 transition-colors"
              title="Add sound effect at playhead (+ SFX)"
              aria-label="Add sound effect at playhead"
            >
              <Plus className="size-2.5" />
              <span className="text-[9px] font-bold">SFX</span>
            </button>
          </div>

          {/* TRACK 2: ZOOM BLOCKS HEADER */}
          <button
            type="button"
            onClick={() => plotInteractions({ holdDurationMs: 1000, inactivityResetMs: 1000, scale: 1.85 })}
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

          {/* TRACK 4: DEDICATED TEXT OVERLAYS TRACK HEADER */}
          <div
            data-tutorial-target="timeline-text-track"
            className="h-8 flex items-center justify-between px-2 rounded-md bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-fg-muted group"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Type className="size-3 text-neutral-300 shrink-0" />
              <span className="truncate text-neutral-300">Text</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addTextOverlay("New Caption");
              }}
              className="flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 hover:border-neutral-500 transition-colors"
              title="Add text overlay at playhead (+ Text)"
              aria-label="Add text overlay at playhead"
            >
              <Plus className="size-2.5" />
              <span className="text-[9px] font-bold">Text</span>
            </button>
          </div>

          {/* TRACK 5: MUSIC TRACK HEADER */}
          {musicTracks.length > 0 && (
            <div className="h-7 flex items-center gap-1.5 px-2 rounded-md bg-ink-900/60 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              <Music className="size-3 text-neutral-300 shrink-0" />
              <span className="truncate">Music</span>
            </div>
          )}

          {/* TRACK 6: MARKERS HEADER */}
          <div className="h-3 flex items-center gap-1 px-2 text-[9px] font-semibold uppercase tracking-wider text-fg-faint">
            <MousePointer className="size-2.5 text-neutral-500 shrink-0" />
            <span className="truncate">Events</span>
          </div>
        </div>

        {/* Resizable Vertical Line Border between Track Headers and Track Viewport */}
        <ResizeHandle
          orientation="vertical"
          ariaLabel="Resize timeline track headers column width"
          title="Drag horizontally to resize track headers width • Double-click to reset"
          onResize={(delta) => {
            const cur = useEditor.getState().timelineTrackHeaderWidth;
            useEditor.getState().setTimelineTrackHeaderWidth(cur + delta);
          }}
          onReset={() => {
            useEditor.getState().setTimelineTrackHeaderWidth(DEFAULT_TRACK_HEADER_WIDTH);
          }}
        />

        {/* Right Scrollable Track Viewport (Feature 14) */}
        <div
          ref={viewportRef}
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onMouseLeave={() => setHoverTimeMs(null)}
          className={`relative flex-1 min-w-0 overflow-x-auto overflow-y-hidden rounded-xl bg-ink-950 shadow-inner no-scrollbar ${
            activeTimelineTool === "pan"
              ? isPanning
                ? "cursor-grabbing select-none"
                : "cursor-grab select-none"
              : activeTimelineTool === "split"
              ? "cursor-crosshair"
              : "cursor-pointer"
          }`}
        >
          {/* Inner Canvas scaling with timelineZoom */}
          <div
            ref={trackContainerRef}
            onClick={handleTrackClick}
            style={{ width: `${Math.round(timelineZoom * 100)}%` }}
            className="relative min-w-full flex flex-col gap-1.5 p-2 touch-none"
          >
          {/* TRACK 1: KEYFRAMES TRACK (Diamond Nodes) */}
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / (rect.width || 1)));
              const targetTime = Math.round(ratio * durationMs);
              setCurrentTime(targetTime);
              addKeyframeAtCurrentTime(1.85);
            }}
            title="Keyframes Track - Double-click anywhere to add keyframe diamond at that time"
            className="relative h-7 rounded-md bg-ink-900/90 border border-ink-800/80 flex items-center"
          >

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
                      className={`relative size-3.5 rotate-45 border shadow-sm transition-transform ${
                        isSelected
                          ? "bg-white border-white ring-2 ring-white/60 shadow-lg scale-110"
                          : kf.sound === "typing"
                          ? "bg-amber-400 border-amber-200 shadow-amber-500/40 shadow"
                          : kf.sound === "click"
                          ? "bg-cyan-400 border-cyan-200 shadow-cyan-500/40 shadow"
                          : kf.effect
                          ? "bg-fuchsia-400 border-fuchsia-200 shadow"
                          : "bg-neutral-200 border-neutral-400"
                      }`}
                    />
                    {kf.sound && (
                      <div
                        className={`absolute -bottom-3 left-1/2 -translate-x-1/2 pointer-events-none flex items-center justify-center rounded px-1 py-0.2 shadow-sm text-[8px] font-bold ${
                          kf.sound === "typing"
                            ? "bg-amber-500/90 text-black border border-amber-300"
                            : "bg-cyan-500/90 text-black border border-cyan-300"
                        }`}
                        title={`SFX: ${kf.sound} (${kf.soundPreset || (kf.sound === "typing" ? "mechanical" : "bop")})`}
                      >
                        {kf.sound === "typing" ? (
                          <Keyboard className="size-2 text-black shrink-0" />
                        ) : (
                          <MousePointer className="size-2 text-black shrink-0" />
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

          {/* TRACK 1B: DEDICATED SFX TRACK (Directly Below Keyframes) */}
          <div
            data-tutorial-target="timeline-sfx-lane"
            onDoubleClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / (rect.width || 1)));
              const targetTime = Math.round(ratio * durationMs);
              setCurrentTime(targetTime);
              handleAddSfx("bop", "Click Bop");
            }}
            title="SFX Track - Double-click or click + SFX to add sound effect"
            className="relative h-7 rounded-md bg-ink-900/90 border border-ink-800/80 overflow-hidden flex items-center"
          >
            {sfxTracks.length === 0 ? (
              <div className="w-full text-center text-[10px] text-fg-faint/60 italic select-none">
                Double-click or click + SFX to add sound effect
              </div>
            ) : (
              sfxTracks.map((sfxItem) => {
                const left = getPositionPercent(sfxItem.startTimeMs);
                const width = Math.max(2.5, getPositionPercent(sfxItem.startTimeMs + sfxItem.durationMs) - left);
                const isSelected = selectedAudioId === sfxItem.id;
                const isTyping =
                  sfxItem.name.toLowerCase().includes("typ") ||
                  sfxItem.name.toLowerCase().includes("key") ||
                  sfxItem.name.toLowerCase().includes("switch");
                const volPercent = Math.round((sfxItem.volume ?? 0.7) * 100);

                return (
                  <div
                    key={sfxItem.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAudio(sfxItem.id);
                      auditionSfx(sfxItem);
                    }}
                    onPointerDown={(e) => handleSfxPointerDown(e, sfxItem)}
                    title={`SFX: ${sfxItem.name} (${formatDuration(sfxItem.durationMs)}) - Volume: ${volPercent}% - Click to audition, drag to reposition`}
                    className={`absolute top-0.5 bottom-0.5 flex items-center justify-between rounded px-2 text-[10px] cursor-grab active:cursor-grabbing transition-all select-none border shadow-sm group ${
                      isSelected
                        ? "border-white bg-white/25 text-white ring-1 ring-white/60 shadow-md z-20 font-bold"
                        : isTyping
                        ? "border-amber-500/70 bg-amber-500/20 text-amber-200 hover:border-amber-400"
                        : "border-cyan-500/70 bg-cyan-500/20 text-cyan-200 hover:border-cyan-400"
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    {/* Visual 4-bar equalizer icon */}
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      <div className="flex items-end gap-0.5 h-2.5 shrink-0" aria-label="Acoustic waveform">
                        <span className={`w-0.5 h-1.5 rounded-full ${isTyping ? "bg-amber-400" : "bg-cyan-400"}`} />
                        <span className={`w-0.5 h-2.5 rounded-full ${isTyping ? "bg-amber-300" : "bg-cyan-300"}`} />
                        <span className={`w-0.5 h-1.5 rounded-full ${isTyping ? "bg-amber-400" : "bg-cyan-400"}`} />
                        <span className={`w-0.5 h-2 rounded-full ${isTyping ? "bg-amber-300" : "bg-cyan-300"}`} />
                      </div>
                      <span className="truncate font-medium">{sfxItem.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-black/50 opacity-80">
                        {volPercent}%
                      </span>
                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteAudioTrack(sfxItem.id);
                          }}
                          className="p-0.5 rounded text-neutral-300 hover:text-white hover:bg-black/40 transition-colors"
                          title="Delete SFX clip (Delete)"
                          aria-label="Delete sound effect"
                        >
                          <Trash2 className="size-2.5 text-danger" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* TRACK 2: ZOOM BLOCKS TRACK */}
          <div className="relative h-9 rounded-lg bg-ink-900 border border-ink-800/80 overflow-hidden">
            {project.zoomBlocks.map((block) => {
              const left = getPositionPercent(block.startTimeMs);
              const width = Math.max(0.6, getPositionPercent(block.endTimeMs) - left);
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
                  className={`absolute top-1 bottom-1 flex items-center justify-between rounded-md border px-2 text-xs font-medium cursor-grab active:cursor-grabbing transition-all overflow-hidden ${
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
                  <span className="truncate text-[11px] font-semibold select-none px-1">
                    {block.scale.toFixed(1)}x Auto-Zoom
                  </span>

                  {/* Left & Right Drag Handles (cleanly inside block borders to prevent adjacent collisions) */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center touch-none z-20 group/handle"
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
                    <div className={`w-1 h-3/4 rounded-full transition-colors ${isSelected ? "bg-white shadow-sm" : "bg-white/50 group-hover/handle:bg-white"}`} />
                  </div>
                  <div
                    className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center touch-none z-20 group/handle"
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
                    <div className={`w-1 h-3/4 rounded-full transition-colors ${isSelected ? "bg-white shadow-sm" : "bg-white/50 group-hover/handle:bg-white"}`} />
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

          {/* TRACK 4: DEDICATED TEXT OVERLAYS TRACK */}
          <div
            data-tutorial-target="timeline-text-lane"
            onDoubleClick={(e) => {
              if ((e.target as HTMLElement).closest(".group\\/text-chip")) return;
              e.stopPropagation();
              addTextOverlay("New Caption");
            }}
            title="Text Overlays Track - Double-click or click + Text to add text overlay"
            className="relative h-8 rounded-lg bg-ink-900 border border-ink-800/80 overflow-hidden flex items-center"
          >
            {(!project.textOverlays || project.textOverlays.length === 0) ? (
              <div className="w-full text-center text-[10px] text-fg-faint/60 italic select-none">
                Double-click or click + Text to add text overlay
              </div>
            ) : (
              project.textOverlays.map((t) => {
                const left = getPositionPercent(t.startTimeMs);
                const width = Math.max(3.5, getPositionPercent(t.startTimeMs + t.durationMs) - left);
                const isSelected = selectedTextId === t.id;
                const isEditing = editingTextId === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectText(t.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingTextId(t.id);
                      setEditingTextValue(t.text);
                    }}
                    onPointerDown={(e) => {
                      if (
                        isEditing ||
                        (e.target as HTMLElement).closest(".group\\/handle") ||
                        (e.target as HTMLElement).closest("button") ||
                        (e.target as HTMLElement).closest("input")
                      ) {
                        return;
                      }
                      e.stopPropagation();
                      selectText(t.id);
                      const startX = e.clientX;
                      const origStart = t.startTimeMs;
                      const origDur = t.durationMs;
                      const trackW = trackContainerRef.current?.clientWidth || 1;

                      const onMove = (me: PointerEvent) => {
                        const deltaRatio = (me.clientX - startX) / trackW;
                        const newStart = Math.max(
                          0,
                          Math.min(durationMs - origDur, Math.round(origStart + deltaRatio * durationMs)),
                        );
                        updateTextOverlay(t.id, { startTimeMs: newStart });
                      };
                      const onUp = () => {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                    }}
                    title={
                      isEditing
                        ? "Editing text: Press Enter to commit, Escape to cancel"
                        : `Text: "${t.text}" (${formatDuration(t.durationMs)}) - Double-click to edit, drag to reposition`
                    }
                    className={`group/text-chip absolute top-1 bottom-1 flex items-center justify-between rounded-md border px-2 text-[11px] transition-all overflow-hidden ${
                      isSelected
                        ? "border-white bg-white/20 text-white ring-1 ring-white/40 shadow-md z-20 font-bold"
                        : "border-neutral-700 bg-neutral-900/90 text-neutral-200 hover:border-neutral-500"
                    } ${isEditing ? "cursor-text z-30" : "cursor-grab active:cursor-grabbing"}`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    {isEditing ? (
                      <input
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        type="text"
                        value={editingTextValue}
                        onChange={(e) => setEditingTextValue(e.target.value)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitTextEdit(t.id);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelTextEdit();
                          }
                        }}
                        onBlur={() => commitTextEdit(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="w-full bg-ink-950 text-white text-[10px] font-medium px-1.5 py-0.5 rounded border border-neutral-600 focus:outline-none focus:ring-1 focus:ring-white/40"
                        aria-label="Edit text overlay"
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-1 min-w-0 truncate select-none">
                          <Type className="size-3 text-neutral-300 shrink-0" />
                          <span className="truncate">{t.text}</span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <span className="font-mono text-[9px] opacity-75 hidden sm:inline">
                            {formatDuration(t.durationMs)}
                          </span>
                          {isSelected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTextOverlay(t.id);
                              }}
                              className="p-0.5 rounded text-neutral-300 hover:text-white hover:bg-black/40 transition-colors"
                              title="Delete text overlay (Delete)"
                              aria-label="Delete text overlay"
                            >
                              <Trash2 className="size-2.5 text-danger" />
                            </button>
                          )}
                        </div>

                        {/* Left & Right Drag Handles */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center touch-none z-20 group/handle"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const origStart = t.startTimeMs;
                            const origDur = t.durationMs;
                            const trackW = trackContainerRef.current?.clientWidth || 1;

                            const onMove = (me: PointerEvent) => {
                              const deltaRatio = (me.clientX - startX) / trackW;
                              const newStart = Math.max(
                                0,
                                Math.min(origStart + origDur - 300, origStart + deltaRatio * durationMs),
                              );
                              const newDur = origStart + origDur - newStart;
                              updateTextOverlay(t.id, {
                                startTimeMs: Math.round(newStart),
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
                          <div className={`w-1 h-3/4 rounded-full transition-colors ${isSelected ? "bg-white" : "bg-neutral-400/40 group-hover/handle:bg-white"}`} />
                        </div>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center touch-none z-20 group/handle"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            const startX = e.clientX;
                            const origDur = t.durationMs;
                            const trackW = trackContainerRef.current?.clientWidth || 1;

                            const onMove = (me: PointerEvent) => {
                              const deltaRatio = (me.clientX - startX) / trackW;
                              const newDur = Math.max(
                                300,
                                Math.min(durationMs - t.startTimeMs, origDur + deltaRatio * durationMs),
                              );
                              updateTextOverlay(t.id, { durationMs: Math.round(newDur) });
                            };
                            const onUp = () => {
                              window.removeEventListener("pointermove", onMove);
                              window.removeEventListener("pointerup", onUp);
                            };
                            window.addEventListener("pointermove", onMove);
                            window.addEventListener("pointerup", onUp);
                          }}
                        >
                          <div className={`w-1 h-3/4 rounded-full transition-colors ${isSelected ? "bg-white" : "bg-neutral-400/40 group-hover/handle:bg-white"}`} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* TRACK 5: MUSIC TRACK */}
          {musicTracks.length > 0 && (
            <div className="relative h-7 rounded-md bg-ink-900/80 border border-ink-800/70 overflow-hidden">
              {musicTracks.map((a) => {
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
                    onPointerDown={(e) => {
                      if (
                        (e.target as HTMLElement).closest(".group\\/handle") ||
                        (e.target as HTMLElement).closest("button")
                      ) {
                        return;
                      }
                      e.stopPropagation();
                      selectAudio(a.id);
                      const startX = e.clientX;
                      const origStart = a.startTimeMs;
                      const trackDur = a.durationMs;
                      const trackW = trackContainerRef.current?.clientWidth || 1;

                      const onMove = (me: PointerEvent) => {
                        const deltaRatio = (me.clientX - startX) / trackW;
                        const newStart = Math.max(
                          0,
                          Math.min(durationMs - trackDur, Math.round(origStart + deltaRatio * durationMs)),
                        );
                        updateAudioTrack(a.id, { startTimeMs: newStart });
                      };
                      const onUp = () => {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                    }}
                    className={`absolute top-0.5 bottom-0.5 flex items-center justify-between rounded border px-2 text-[10px] cursor-grab active:cursor-grabbing transition-all ${
                      isSelected
                        ? "border-emerald-400 bg-emerald-500/20 text-white z-10 font-bold"
                        : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500"
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    <div className="flex items-center gap-1 min-w-0 truncate">
                      <Music className="size-2.5 mr-1 shrink-0 text-emerald-400" />
                      <span className="truncate">{a.name}</span>
                    </div>
                    {isSelected && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAudioTrack(a.id);
                        }}
                        className="p-0.5 rounded text-neutral-300 hover:text-white hover:bg-black/40 transition-colors shrink-0"
                        title="Delete audio track"
                      >
                        <Trash2 className="size-2.5 text-danger" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TRACK 6: CLICK & TYPING MARKERS */}
          <div className="relative h-3 w-full">
            {/* Clicks */}
            {(() => {
              const allClicks = [...project.clicks];
              if (project.interactions) {
                for (const inter of project.interactions) {
                  if (
                    inter.type === "click" &&
                    !allClicks.some(
                      (c) => c.id === inter.id || Math.abs(c.timestampMs - inter.timestampMs) < 100,
                    )
                  ) {
                    allClicks.push({
                      id: inter.id,
                      timestampMs: inter.timestampMs,
                      x: inter.x,
                      y: inter.y,
                      button: inter.button || "left",
                    });
                  }
                }
              }
              return allClicks.map((click) => (
                <div
                  key={click.id}
                  title={`Mouse Click at ${formatDuration(click.timestampMs)}`}
                  className="absolute top-0 bottom-0 w-1 -translate-x-1/2 rounded-full bg-white hover:scale-150 transition-transform"
                  style={{ left: `${getPositionPercent(click.timestampMs)}%` }}
                />
              ));
            })()}

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

          {/* Split Tool Razor Blade Guideline (Feature 12) */}
          {activeTimelineTool === "split" && hoverTimeMs !== null && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-30 flex flex-col items-center -translate-x-1/2"
              style={{ left: `${getPositionPercent(hoverTimeMs)}%` }}
            >
              <div className="flex items-center gap-1 rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-md">
                <Scissors className="size-2.5" />
                <span>{formatDuration(hoverTimeMs)}</span>
              </div>
              <div className="w-0.5 flex-1 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
