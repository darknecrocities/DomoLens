import { create } from "zustand";
import {
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_LOOKS,
  clampCameraToBounds,
  detectActivityEventsFromFrames,
  generateTourShiftSequence,
  insertKeyframe,
  insertVideoEffect,
  interpolateCursorAtTime,
  plotInteractionsToKeyframesAndZoomBlocks,
  removeClipAndRipple,
  removeKeyframe,
  removeVideoEffect,
  splitClip,
  splitZoomBlock,
  updateVideoEffect,
  zoomBlocksToKeyframes,
  type AudioTrack,
  type ClickEvent,
  type ClickSoundPreset,
  type InteractionEvent,
  type KeyframeNode,
  type OpticalAnalysisOptions,
  type PlotInteractionsOptions,
  type ProjectAudioSettings,
  type ProjectData,
  type ProjectLooks,
  type TextOverlay,
  type TimelineClip,
  type TypingSoundPreset,
  type VideoEffect,
  type VideoEffectType,
  type ZoomBlock,
  STUDIO_MOTION_TEMPLATES,
  generateTemplateKeyframes,
  checkTemplateVideoFit,
  enforceNonOverlappingZoomBlocks,
} from "@domolens/core";
import { sfx } from "../lib/sound-effects";
import { platform } from "../platform";
import { useProjects } from "./projects";
import { useNav } from "./nav";
import { toast } from "./toast";


export type ToolTab =
  | "style"
  | "motion"
  | "sound"
  | "overlays"
  | "templates"
  | "zoom"
  | "effects"
  | "text"
  | "audio"
  | "looks"
  | "cursor"
  | "export";

/**
 * Active tool mode in the timeline toolbar.
 * - "select": Default pointer tool for selecting, dragging, and resizing track elements.
 * - "split": Razor blade tool for splitting clips or tracks at the playhead or cursor.
 * - "pan": Hand tool for click-and-drag viewport panning across zoomed-in timelines.
 */
export type TimelineToolMode = "select" | "split" | "pan";

export interface LlmMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actions?: Array<{
    label: string;
    actionKey: string;
  }>;
}

export interface EditorState {
  project: ProjectData | null;
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  selectedBlockId: string | null;
  selectedClipId: string | null;
  selectedKeyframeId: string | null;
  selectedEffectId: string | null;
  selectedTextId: string | null;
  selectedAudioId: string | null;
  activeTab: "timeline" | "looks";
  activeToolTab: ToolTab;
  timelineZoom: number; // 1 to 5
  activeTimelineTool: TimelineToolMode;

  // Sidebars
  isLeftSidebarOpen: boolean; // LLM
  isRightSidebarOpen: boolean; // Tools

  // LLM Assistant
  llmMessages: LlmMessage[];
  isLlmThinking: boolean;

  // History for undo/redo
  history: ProjectData[];
  future: ProjectData[];

  // Actions
  loadProject: (id: string) => Promise<boolean>;
  setCurrentTime: (ms: number) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setActiveTab: (tab: "timeline" | "looks") => void;
  setActiveToolTab: (tab: ToolTab) => void;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  setTimelineZoom: (zoom: number) => void;
  isExportModalOpen: boolean;
  setExportModalOpen: (open: boolean) => void;
  isTemplateModalOpen: boolean;
  setTemplateModalOpen: (open: boolean) => void;
  activeTemplateId: string | null;
  applyTemplate: (templateId: string, customFields?: Record<string, string>) => void;

  selectBlock: (id: string | null) => void;
  selectClip: (id: string | null) => void;
  selectKeyframe: (id: string | null) => void;
  selectEffect: (id: string | null) => void;
  selectText: (id: string | null) => void;
  selectAudio: (id: string | null) => void;

  // Interaction auto-plotting (translates recorded click/typing data into 2-3s zoom loops with keyframes)
  plotInteractions: (options?: PlotInteractionsOptions) => void;
  autoZoom: (options?: PlotInteractionsOptions) => void;
  autoAfx: () => void;

  // Cinematic camera tour shift walkthrough across focal elements
  createTourCameraShift: (options?: {
    stepHoldMs?: number;
    scale?: number;
    shiftDurationMs?: number;
  }) => void;

  // Optical video activity detection & camera shifting
  shiftCameraTarget: (
    targetX: number,
    targetY: number,
    options?: { createKeyframe?: boolean; scale?: number },
  ) => void;
  detectActivityFromFrames: (
    frames: Array<{
      timestampMs: number;
      data: Uint8ClampedArray | number[];
      width?: number;
      height?: number;
    }>,
    options?: OpticalAnalysisOptions,
  ) => void;

  // Editing actions with undo support
  updateZoomBlock: (id: string, updates: Partial<ZoomBlock>) => void;
  toggleZoomBlock: (id: string) => void;
  deleteZoomBlock: (id: string) => void;
  clearZoomBlocks: () => void;
  addZoomBlockAtCurrentTime: () => void;

  // Keyframes
  addKeyframeAtCurrentTime: (
    scale?: number,
    targetX?: number,
    targetY?: number,
    effect?: VideoEffectType,
    effectIntensity?: number,
  ) => void;
  updateKeyframe: (id: string, updates: Partial<KeyframeNode>) => void;
  deleteKeyframe: (id: string) => void;
  clearKeyframes: () => void;

  // Video Effects
  addEffectAtCurrentTime: (type?: VideoEffectType, preset?: string) => void;
  updateEffect: (id: string, updates: Partial<VideoEffect>) => void;
  deleteEffect: (id: string) => void;
  clearEffects: () => void;

  // Text Overlays
  addTextOverlay: (text?: string) => void;
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  deleteTextOverlay: (id: string) => void;

  // Audio & Music
  addAudioTrack: (name: string, url: string, type?: "music" | "sfx") => void;
  updateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;
  deleteAudioTrack: (id: string) => void;
  updateAudioSettings: (updates: Partial<ProjectAudioSettings>) => void;
  playClickSoundPreview: (preset?: ClickSoundPreset, volume?: number) => void;
  playTypingSoundPreview: (preset?: TypingSoundPreset, volume?: number) => void;


  updateLooks: (updates: Partial<ProjectLooks>) => void;
  splitAtPlayhead: () => void;
  splitAtCurrentTime: () => void;
  trimLeftAtPlayhead: () => void;
  trimRightAtPlayhead: () => void;
  trimLeftAtCurrentTime: () => void;
  trimRightAtCurrentTime: () => void;
  setActiveTimelineTool: (tool: TimelineToolMode) => void;
  setTimelineTool: (tool: TimelineToolMode) => void;
  addSfxTrackAtCurrentTime: (
    preset?: ClickSoundPreset | TypingSoundPreset | string,
    name?: string,
  ) => void;
  deleteSelected: () => void;
  deleteVideoClip: (clipId?: string) => void;
  deleteCurrentProject: () => Promise<boolean>;

  // Conversational AI Assistant
  sendLlmMessage: (content: string) => Promise<void>;
  executeLlmAction: (actionKey: string) => void;

  undo: () => void;
  redo: () => void;
}

function pushHistory(state: EditorState): Partial<EditorState> {
  if (!state.project) return {};
  return {
    history: [JSON.parse(JSON.stringify(state.project)), ...state.history.slice(0, 19)],
    future: [],
  };
}

const INITIAL_LLM_MESSAGES: LlmMessage[] = [
  {
    id: "msg-welcome",
    role: "assistant",
    content: "Hi! I'm your DomoLens AI Director. I can automatically detect button clicks & typing to plot seamless 2-3s zooms, suggest titles, or refine keyframes.",
    timestamp: Date.now(),
    actions: [
      { label: "Auto-Plot Zooms", actionKey: "plot_zooms" },
      { label: "Camera Shift Tour", actionKey: "tour_shift" },
      { label: "Suggest Title & Chapters", actionKey: "suggest_chapters" },
      { label: "Add Subtitle at Playhead", actionKey: "add_subtitle" },
    ],
  },
];

export const useEditor = create<EditorState>((set, get) => ({
  project: null,
  currentTimeMs: 0,
  durationMs: 0,
  isPlaying: false,
  selectedBlockId: null,
  selectedClipId: null,
  selectedKeyframeId: null,
  selectedEffectId: null,
  selectedTextId: null,
  selectedAudioId: null,
  activeTab: "timeline",
  activeToolTab: "zoom",
  timelineZoom: 1,
  activeTimelineTool: "select" as TimelineToolMode,
  isExportModalOpen: false,
  isTemplateModalOpen: false,
  activeTemplateId: null,

  isLeftSidebarOpen: false,
  isRightSidebarOpen: true,

  llmMessages: INITIAL_LLM_MESSAGES,
  isLlmThinking: false,

  history: [],
  future: [],

  loadProject: async (id: string) => {
    // 1. First, check platform disk storage for full project data
    let parsed: ProjectData | null = null;
    if (platform.loadFullProject) {
      try {
        parsed = await platform.loadFullProject(id);
      } catch (err) {
        console.warn("Failed loading full project from platform:", err);
      }
    }

    // 2. Check local storage fallback
    if (!parsed && typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem(`domolens_full_project_${id}`);
        if (stored) {
          parsed = JSON.parse(stored) as ProjectData;
        }
      } catch {}
    }

    // 3. Check session storage fallback
    if (!parsed && typeof sessionStorage !== "undefined") {
      try {
        const stored = sessionStorage.getItem(`domolens_project_${id}`);
        if (stored) {
          parsed = JSON.parse(stored) as ProjectData;
        }
      } catch {}
    }

    if (parsed) {
      if (!parsed.audioSettings) {
        parsed.audioSettings = { ...DEFAULT_AUDIO_SETTINGS };
      }
      if (!parsed.effects) {
        parsed.effects = [];
      }
      if (parsed.looks) {
        parsed.looks.autoTrackCursor = false;
        parsed.looks.showClickRipples = true;
      }
      if (!parsed.zoomBlocks) parsed.zoomBlocks = [];
      if (!parsed.keyframes) parsed.keyframes = [];
      if (!parsed.clicks) parsed.clicks = [];
      if (!parsed.interactions) parsed.interactions = [];
      if (!parsed.cursorTrajectory) parsed.cursorTrajectory = [];
      if (!parsed.textOverlays) parsed.textOverlays = [];
      if (!parsed.audioTracks) parsed.audioTracks = [];

      if (!parsed.looks) parsed.looks = { ...DEFAULT_LOOKS };
      // Self-heal: If recording had windowFrame stripped to "none", restore MacBook terminal frame
      if (parsed.summary.source === "recording" && (parsed.looks.windowFrame === "none" || !parsed.looks.windowFrame)) {
        parsed.looks.windowFrame = "terminal";
        if (parsed.looks.padding === 0) parsed.looks.padding = 32;
        if (parsed.looks.borderRadius === 0) parsed.looks.borderRadius = 16;
        if (parsed.looks.shadow === "none") parsed.looks.shadow = "lift";
        parsed.looks.fit = "contain";
      }

      const duration = parsed.summary.durationMs || 10000;

      // Self-heal: If project has media and duration, but 0 zoomBlocks and 0 keyframes (e.g. past recording before fix):
      if (parsed.zoomBlocks.length === 0 && parsed.keyframes.length === 0 && duration >= 1000) {
        if (parsed.interactions.length > 0) {
          const plotted = plotInteractionsToKeyframesAndZoomBlocks(
            parsed.interactions,
            duration,
            { holdDurationMs: 1400, leadInMs: 450, scale: 1.85 },
          );
          parsed.zoomBlocks = plotted.zoomBlocks;
          parsed.keyframes = plotted.keyframes;
        } else if (parsed.clicks.length > 0) {
          const pseudoInteractions: InteractionEvent[] = parsed.clicks.map((c) => ({
            id: c.id,
            type: "click" as const,
            timestampMs: c.timestampMs,
            x: c.x,
            y: c.y,
            button: c.button,
          }));
          const plotted = plotInteractionsToKeyframesAndZoomBlocks(
            pseudoInteractions,
            duration,
            { holdDurationMs: 1400, leadInMs: 450, scale: 1.85 },
          );
          parsed.zoomBlocks = plotted.zoomBlocks;
          parsed.keyframes = plotted.keyframes;
        }
        if (parsed.zoomBlocks.length > 0) {
          platform.saveFullProject?.(parsed);
        }
      }

      set({
        project: parsed,
        currentTimeMs: 0,
        durationMs: duration,
        selectedBlockId: parsed.zoomBlocks[0]?.id || null,
        selectedKeyframeId: null,
        selectedEffectId: null,
        selectedTextId: null,
        selectedAudioId: null,
        selectedClipId: parsed.clips?.[0]?.id || null,
        history: [],
        future: [],
      });
      return true;
    }

    // 2. Fall back to useProjects summary or built-in demo templates
    const isSampleShowcase =
      id === "demo-saas" || id === "demo-code" || id === "demo-mobile" || id === "sample-demo";

    let summary = useProjects.getState().projects.find((p) => p.id === id);
    if (!summary) {
      const now = Date.now();
      const demoTitles: Record<string, string> = {
        "demo-saas": "SaaS Product Walkthrough",
        "demo-code": "Developer Code Tour",
        "demo-mobile": "App Workflow Showcase",
        "sample-demo": "Wikipedia Article Demo",
        "proj-test": "Test Project",
        "studio-main": "Studio Workspace",
        "blank": "New Studio Project",
      };
      summary = {
        id,
        name: demoTitles[id] || "Studio Workspace",
        source: "recording",
        createdAt: now,
        updatedAt: now,
        durationMs: isSampleShowcase ? 14000 : 0,
        width: 1920,
        height: 1080,
        thumbnail: null,
        media: isSampleShowcase ? "/domolens_smooth_autozoom_demo.mp4" : null,
      };
    }

    const duration = summary.durationMs || (isSampleShowcase ? 14000 : 0);

    let starterClicks: ClickEvent[] = [];
    let starterInteractions: InteractionEvent[] = [];
    let starterTrajectory: import("@domolens/core").CursorTrajectoryPoint[] = [];
    let zoomBlocks: ZoomBlock[] = [];
    let keyframes: KeyframeNode[] = [];
    let textOverlays: TextOverlay[] = [];
    let audioTracks: AudioTrack[] = [];
    let clips: TimelineClip[] = [];

    // Only seed mock zooms, music, and text for explicit sample demos!
    if (isSampleShowcase) {
      starterClicks = [
        { id: "c-1", timestampMs: Math.round(duration * 0.22), x: 0.35, y: 0.45, button: "left" },
        { id: "c-2", timestampMs: Math.round(duration * 0.62), x: 0.65, y: 0.55, button: "left" },
      ];
      starterInteractions = [
        { id: "c-1", type: "click", timestampMs: Math.round(duration * 0.22), x: 0.35, y: 0.45, button: "left" },
        { id: "c-2", type: "typing", timestampMs: Math.round(duration * 0.62), x: 0.65, y: 0.55 },
      ];

      const plotted = plotInteractionsToKeyframesAndZoomBlocks(
        starterInteractions,
        duration,
        { holdDurationMs: 1000, leadInMs: 500, scale: 1.85 },
      );
      keyframes = plotted.keyframes;
      zoomBlocks = plotted.zoomBlocks;

      starterTrajectory = [
        { timestampMs: 0, x: 0.5, y: 0.5 },
        { timestampMs: Math.round(duration * 0.12), x: 0.42, y: 0.48 },
        { timestampMs: Math.round(duration * 0.22), x: 0.35, y: 0.45 },
        { timestampMs: Math.round(duration * 0.38), x: 0.38, y: 0.46 },
        { timestampMs: Math.round(duration * 0.48), x: 0.52, y: 0.50 },
        { timestampMs: Math.round(duration * 0.62), x: 0.65, y: 0.55 },
        { timestampMs: Math.round(duration * 0.76), x: 0.68, y: 0.54 },
        { timestampMs: duration, x: 0.5, y: 0.5 },
      ];

      textOverlays = [
        {
          id: "txt-welcome",
          text: "Auto-zoom Screen Demo",
          startTimeMs: 300,
          durationMs: 2800,
          x: 0.5,
          y: 0.85,
          fontSize: 20,
          color: "#ffffff",
          bgColor: "rgba(15, 17, 23, 0.85)",
        },
      ];

      audioTracks = [];
    }

    if (summary.media) {
      clips = [
        {
          id: `clip-${id}-1`,
          name: summary.name,
          mediaUrl: summary.media,
          timelineStartMs: 0,
          durationMs: duration,
          sourceOffsetMs: 0,
          muted: false,
          volume: 1,
        },
      ];
    }

    const projectData: ProjectData = {
      summary,
      clicks: starterClicks,
      interactions: starterInteractions,
      cursorTrajectory: starterTrajectory,
      zoomBlocks,
      keyframes,
      textOverlays,
      audioTracks,
      clips,
      looks:
        summary.source === "recording"
          ? {
              ...DEFAULT_LOOKS,
              windowFrame: "terminal" as const,
              fit: "contain" as const,
              padding: 32,
              borderRadius: 16,
              shadow: "lift" as const,
            }
          : DEFAULT_LOOKS,
      audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
    };

    // Persist immediately to disk & storage
    platform.saveFullProject?.(projectData);

    set({
      project: projectData,
      currentTimeMs: 0,
      durationMs: duration,
      selectedBlockId: zoomBlocks[0]?.id || null,
      selectedKeyframeId: null,
      selectedEffectId: null,
      selectedTextId: null,
      selectedAudioId: null,
      selectedClipId: clips[0]?.id || null,
      history: [],
      future: [],
    });
    return true;
  },

  setCurrentTime: (ms) => {
    const clamped = Math.max(0, Math.min(ms, get().durationMs));
    set({ currentTimeMs: clamped });
  },

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveToolTab: (tab) => set({ activeToolTab: tab }),
  toggleLeftSidebar: () => set((s) => ({ isLeftSidebarOpen: !s.isLeftSidebarOpen })),
  toggleRightSidebar: () => set((s) => ({ isRightSidebarOpen: !s.isRightSidebarOpen })),
  setTimelineZoom: (zoom) => set({ timelineZoom: Math.max(0.5, Math.min(5, zoom)) }),
  setActiveTimelineTool: (tool: TimelineToolMode) => {
    const valid: TimelineToolMode[] = ["select", "split", "pan"];
    const targetTool = valid.includes(tool) ? tool : "select";
    set({ activeTimelineTool: targetTool });
  },
  setTimelineTool: (tool: TimelineToolMode) => {
    get().setActiveTimelineTool(tool);
  },
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  setTemplateModalOpen: (open) => set({ isTemplateModalOpen: open }),

  applyTemplate: (templateId, customFields) => {
    const state = get();
    if (!state.project) return;
    const template = STUDIO_MOTION_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const fit = checkTemplateVideoFit(
      template,
      state.project.summary.width,
      state.project.summary.height,
    );
    if (!fit.ok) return;

    // Generate fresh IDs for template text overlays with user-customized fields merged
    const newTextOverlays: TextOverlay[] = template.defaultTextOverlays.map((to, i) => ({
      ...to,
      id: `text-tpl-${Date.now()}-${i}`,
      text: customFields?.["headline"] || to.text,
      kicker: customFields?.["kicker"] || to.kicker,
      color: customFields?.["accent"] ? "#ffffff" : to.color,
    }));

    const updatedLooks: ProjectLooks = {
      ...state.project.looks,
      ...template.looks,
      brandAccentColor: customFields?.["accent"] || template.looks.brandAccentColor || state.project.looks.brandAccentColor,
      photoOverlay:
        customFields?.["photo"] && template.photoSlot
          ? {
              src: customFields["photo"],
              x: template.photoSlot.x,
              y: template.photoSlot.y,
              size: template.photoSlot.size,
              shape: template.photoSlot.shape,
            }
          : template.photoSlot
            ? undefined
            : state.project.looks.photoOverlay,
    };

    const updatedAudio: ProjectAudioSettings = {
      ...(state.project.audioSettings || DEFAULT_AUDIO_SETTINGS),
      ...template.audioSettings,
    };

    // Generate or harmonize timeline keyframes & zoom blocks reflecting the template's motion signature
    const { keyframes: templateKeyframes, zoomBlocks: templateZoomBlocks } = generateTemplateKeyframes(
      template,
      state.durationMs || state.project.summary.durationMs || 6000,
      {
        existingKeyframes: state.project.keyframes,
        existingZoomBlocks: state.project.zoomBlocks,
        existingClicks: state.project.clicks,
        existingInteractions: state.project.interactions,
      }
    );

    set({
      ...pushHistory(state),
      activeTemplateId: template.id,
      isTemplateModalOpen: false,
      selectedKeyframeId: templateKeyframes[1]?.id ?? templateKeyframes[0]?.id ?? null,
      selectedBlockId: templateZoomBlocks[0]?.id ?? null,
      project: {
        ...state.project,
        looks: updatedLooks,
        audioSettings: updatedAudio,
        keyframes: templateKeyframes,
        zoomBlocks: templateZoomBlocks,
        textOverlays: [
          ...(state.project.textOverlays || []).filter((o) => !o.id.startsWith("text-tpl-")),
          ...newTextOverlays,
        ],
      },
    });

    // Audition template sound feedback
    if (template.audioSettings.typingSoundPreset && template.audioSettings.typingSoundPreset !== "none") {
      sfx.playTypingBurst(4, 90, template.audioSettings.typingSoundPreset, 0.7);
    } else {
      sfx.playClickBop(template.audioSettings.clickSoundPreset || "bop", 0.75);
    }

    toast.success(
      `Applied "${template.name}": ${templateKeyframes.length} signature keyframes plotted on timeline.`
    );
  },

  selectBlock: (id) =>
    set({
      selectedBlockId: id,
      selectedClipId: null,
      selectedKeyframeId: null,
      selectedEffectId: null,
      selectedTextId: null,
      selectedAudioId: null,
    }),
  selectClip: (id) =>
    set({
      selectedClipId: id,
      selectedBlockId: null,
      selectedKeyframeId: null,
      selectedEffectId: null,
      selectedTextId: null,
      selectedAudioId: null,
    }),
  selectKeyframe: (id) =>
    set({
      selectedKeyframeId: id,
      selectedBlockId: null,
      selectedClipId: null,
      selectedEffectId: null,
      selectedTextId: null,
      selectedAudioId: null,
    }),
  selectEffect: (id) =>
    set({
      selectedEffectId: id,
      selectedBlockId: null,
      selectedClipId: null,
      selectedKeyframeId: null,
      selectedTextId: null,
      selectedAudioId: null,
    }),
  selectText: (id) =>
    set({
      selectedTextId: id,
      selectedBlockId: null,
      selectedClipId: null,
      selectedKeyframeId: null,
      selectedEffectId: null,
      selectedAudioId: null,
    }),
  selectAudio: (id) =>
    set({
      selectedAudioId: id,
      selectedBlockId: null,
      selectedClipId: null,
      selectedKeyframeId: null,
      selectedEffectId: null,
      selectedTextId: null,
    }),

  plotInteractions: (options) => {
    const state = get();
    if (!state.project) return;
    const interactions = state.project.interactions ?? [];
    const clicks = state.project.clicks ?? [];

    // Filter out clicks or interactions from the user finishing the recording (hud stop/finish artifacts)
    const isFinishOrStop = (e: { id?: string; timestampMs: number }) => {
      const id = (e.id || "").toLowerCase();
      return id.startsWith("hud-stop") || id.startsWith("hud-finish") || id === "finish";
    };
    const validInteractions = interactions.filter((i) => !isFinishOrStop(i));
    const validClicks = clicks.filter((c) => !isFinishOrStop(c));

    // STRICT INVARIANT:
    // If no clicks occurred during recording (excluding user finish/stop action),
    // strictly DO NOT apply zoom in! The video remains in full screen (1.0x) only,
    // UNLESS the user explicitly requested AI fallback plotting (fallbackIfEmpty).
    if (validClicks.length === 0 && !options?.fallbackIfEmpty) {
      set({
        ...pushHistory(state),
        project: {
          ...state.project,
          zoomBlocks: [],
          keyframes: [],
        },
        selectedBlockId: null,
        selectedKeyframeId: null,
      });
      toast.info("No clicks recorded during recording. Full screen preserved.");
      return;
    }

    let clickEventsAsInteractions: InteractionEvent[] = validClicks.map((c) => ({
      id: c.id,
      type: "click" as const,
      timestampMs: c.timestampMs,
      x: c.x,
      y: c.y,
      button: c.button,
    }));

    if (validClicks.length === 0 && options?.fallbackIfEmpty) {
      const dur = Math.max(8000, state.durationMs || 10000);
      const stepMs = Math.max(2500, Math.round(dur / 4));
      for (let t = 1800; t < dur - 1000; t += stepMs) {
        clickEventsAsInteractions.push({
          id: `act-auto-${t}`,
          type: "click",
          timestampMs: t,
          x: 0.5,
          y: 0.5,
          button: "left",
        });
      }
    }

    const mergedEvents: InteractionEvent[] = [...validInteractions];
    for (const c of clickEventsAsInteractions) {
      const exists = mergedEvents.some(
        (e) => Math.abs(e.timestampMs - c.timestampMs) < 180 && (e.id === c.id || Math.hypot(e.x - c.x, e.y - c.y) < 0.05),
      );
      if (!exists) {
        mergedEvents.push(c);
      }
    }
    mergedEvents.sort((a, b) => a.timestampMs - b.timestampMs);
    let eventsToUse: InteractionEvent[] = mergedEvents;

    // Strict Cleanup: Deduplicate micro-flutter closer than 400ms at virtually the same spot
    const cleanedEvents: InteractionEvent[] = [];
    for (const e of eventsToUse) {
      const prev = cleanedEvents[cleanedEvents.length - 1];
      if (!prev || e.timestampMs - prev.timestampMs >= 400 || Math.hypot(e.x - prev.x, e.y - prev.y) > 0.05) {
        cleanedEvents.push(e);
      }
    }
    eventsToUse = cleanedEvents;

    const currentMs = state.currentTimeMs;
    const { keyframes, zoomBlocks } = plotInteractionsToKeyframesAndZoomBlocks(
      eventsToUse,
      state.durationMs,
      {
        continuousGlide: options?.continuousGlide ?? true,
        centerTyping: options?.centerTyping ?? true,
        maxGlideGapMs: options?.maxGlideGapMs ?? 1000,
        leadInMs: options?.leadInMs ?? 1000,
        holdDurationMs: options?.holdDurationMs ?? 1000,
        leadOutMs: options?.leadOutMs ?? 400,
        inactivityResetMs: options?.inactivityResetMs ?? 1000,
        scale: options?.scale ?? 1.85,
        minRestMs: 400,
        enableRevealDip: false,
        cursorTrajectory: state.project.cursorTrajectory,
        typingZoomOut: false,
        ...options,
      },
    );

    const activeAtCurrent = zoomBlocks.find((b) => currentMs >= b.startTimeMs && currentMs <= b.endTimeMs);
    const selectedBlockId = activeAtCurrent ? activeAtCurrent.id : (zoomBlocks[0]?.id ?? null);

    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        clicks: state.project.clicks,
        interactions: state.project.interactions,
        keyframes,
        zoomBlocks,
      },
      selectedBlockId,
    });
    sfx.playClickBop(state.project.audioSettings?.clickSoundPreset || "bop", 0.7);
    toast.success(`Plotted ${zoomBlocks.length} zooms on user clicks!`);
  },

  autoZoom: (options) => {
    get().plotInteractions(options);
  },

  autoAfx: () => {
    const state = get();
    if (!state.project) return;
    const project = state.project;

    // 1. Enable click sound, typing sound, ducking, and set balanced volume profiles
    const updatedAudioSettings: ProjectAudioSettings = {
      ...project.audioSettings,
      clickSoundEnabled: true,
      clickSoundPreset: project.audioSettings?.clickSoundPreset || "bop",
      clickSoundVolume: project.audioSettings?.clickSoundVolume || 0.65,
      typingSoundEnabled: true,
      typingSoundPreset: project.audioSettings?.typingSoundPreset || "mechanical",
      typingSoundVolume: project.audioSettings?.typingSoundVolume || 0.55,
      musicDuckingEnabled: true,
      duckingAmount: project.audioSettings?.duckingAmount || 0.35,
    };

    // 2. Attach sound tags to keyframes synchronized with clicks and typing
    const clicks = project.clicks || [];
    const interactions = project.interactions || [];
    const updatedKeyframes = (project.keyframes || []).map((kf) => {
      if (kf.sound) return kf;
      const matchedClick = clicks.find((c) => Math.abs(c.timestampMs - kf.timeMs) <= 180);
      const matchedInteraction = interactions.find((i) => Math.abs(i.timestampMs - kf.timeMs) <= 180);

      if (matchedInteraction?.type === "typing") {
        return {
          ...kf,
          sound: "typing" as const,
          soundPreset: updatedAudioSettings.typingSoundPreset,
          soundVolume: updatedAudioSettings.typingSoundVolume,
        };
      }
      if (matchedClick || matchedInteraction?.type === "click") {
        return {
          ...kf,
          sound: "click" as const,
          soundPreset: updatedAudioSettings.clickSoundPreset,
          soundVolume: updatedAudioSettings.clickSoundVolume,
        };
      }
      return kf;
    });

    set({
      ...pushHistory(state),
      project: {
        ...project,
        audioSettings: updatedAudioSettings,
        keyframes: updatedKeyframes,
      },
    });

    sfx.playClickBop(updatedAudioSettings.clickSoundPreset, 0.7);
    toast.success("Auto AFX enabled: Tactile click bops and mechanical typing audio synchronized.");
  },

  createTourCameraShift: (options) => {
    const state = get();
    if (!state.project) return;
    let eventsToUse: InteractionEvent[] = (state.project.interactions && state.project.interactions.length > 0)
      ? [...state.project.interactions]
      : (state.project.clicks && state.project.clicks.length > 0)
        ? state.project.clicks.map((c) => ({
            id: c.id,
            type: "click" as const,
            timestampMs: c.timestampMs,
            x: c.x,
            y: c.y,
            button: c.button,
          }))
        : [];

    if (eventsToUse.length === 0) {
      const dur = state.durationMs || 10000;
      const stepMs = Math.max(2600, Math.min(4200, Math.round(dur / 5)));
      const tourPoints = [
        { x: 0.38, y: 0.35, type: "click" as const },
        { x: 0.62, y: 0.45, type: "typing" as const },
        { x: 0.44, y: 0.60, type: "click" as const },
        { x: 0.58, y: 0.38, type: "click" as const },
      ];
      let pIdx = 0;
      for (let t = 1800; t < dur - 1000; t += stepMs) {
        const pt = tourPoints[pIdx % tourPoints.length]!;
        pIdx++;
        eventsToUse.push({
          id: `tour-pt-${t}`,
          type: pt.type,
          timestampMs: t,
          x: pt.x,
          y: pt.y,
          button: "left",
          ...(pt.type === "typing" ? { durationMs: 1200 } : {}),
        });
      }
    }

    const { keyframes, zoomBlocks } = generateTourShiftSequence(
      eventsToUse,
      state.durationMs,
      options,
    );

    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        keyframes,
        zoomBlocks,
      },
      selectedBlockId: zoomBlocks[0]?.id ?? null,
    });

    sfx.playClickBop(state.project.audioSettings?.clickSoundPreset || "bop", 0.75);
    toast.success(`Cinematic Camera Shift Tour applied across ${zoomBlocks.length} steps!`);
  },

  shiftCameraTarget: (targetX, targetY, options) => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;
    const activeScale = options?.scale ?? 1.85;
    const clamped = clampCameraToBounds(targetX, targetY, activeScale, "center");
    const now = Date.now();

    // Trigger acoustic bop feedback immediately
    sfx.playClickBop(state.project.audioSettings?.clickSoundPreset || "bop", state.project.audioSettings?.clickSoundVolume || 0.75);

    // Update cursor trajectory around time so cursor coordinates align with click
    const existingTraj = state.project.cursorTrajectory ? [...state.project.cursorTrajectory] : [];
    const trajIdx = existingTraj.findIndex((p) => Math.abs(p.timestampMs - time) <= 80);
    if (trajIdx >= 0) {
      existingTraj[trajIdx] = { timestampMs: time, x: clamped.x, y: clamped.y };
    } else {
      existingTraj.push({ timestampMs: time, x: clamped.x, y: clamped.y });
      existingTraj.sort((a, b) => a.timestampMs - b.timestampMs);
    }

    const newClickId = `c-shift-${now}`;
    const newClick: ClickEvent = {
      id: newClickId,
      timestampMs: time,
      x: clamped.x,
      y: clamped.y,
      button: "left",
    };
    const newInteraction: InteractionEvent = {
      id: newClickId,
      type: "click",
      timestampMs: time,
      x: clamped.x,
      y: clamped.y,
      button: "left",
    };

    // Case 1: An existing keyframe is explicitly selected
    if (state.selectedKeyframeId && state.project.keyframes) {
      const exists = state.project.keyframes.some((k) => k.id === state.selectedKeyframeId);
      if (exists) {
        state.updateKeyframe(state.selectedKeyframeId, { targetX: clamped.x, targetY: clamped.y });
        toast.info(`Updated keyframe target to (${Math.round(clamped.x * 100)}%, ${Math.round(clamped.y * 100)}%)`);
        return;
      }
    }

    // Case 2: Playhead is inside an active zoom block
    const activeBlock = state.project.zoomBlocks.find((b) => time >= b.startTimeMs && time <= b.endTimeMs);
    if (activeBlock) {
      const updatedBlocks = state.project.zoomBlocks.map((b) =>
        b.id === activeBlock.id ? { ...b, targetX: clamped.x, targetY: clamped.y } : b,
      );

      // Lock all zoomed keyframes in this zoom block directly on the newly selected interaction coordinates
      let updatedKfs = (state.project.keyframes ? [...state.project.keyframes] : []).map((k) => {
        if (k.timeMs >= activeBlock.startTimeMs && k.timeMs <= activeBlock.endTimeMs && k.scale > 1.05) {
          return { ...k, targetX: clamped.x, targetY: clamped.y };
        }
        return k;
      });

      const nearbyKf = updatedKfs.find((k) => Math.abs(k.timeMs - time) <= 150);
      let selectedKfId: string;
      if (nearbyKf) {
        selectedKfId = nearbyKf.id;
      } else {
        const newKf: KeyframeNode = {
          id: `kf-shift-${now}`,
          timeMs: time,
          scale: activeBlock.scale,
          targetX: clamped.x,
          targetY: clamped.y,
          easing: "spring",
          sound: "click",
          soundPreset: "bop",
          soundVolume: 0.70,
        };
        updatedKfs.push(newKf);
        updatedKfs.sort((a, b) => a.timeMs - b.timeMs);
        selectedKfId = newKf.id;
      }

      set({
        ...pushHistory(state),
        project: {
          ...state.project,
          cursorTrajectory: existingTraj,
          clicks: [...(state.project.clicks || []), newClick].sort((a, b) => a.timestampMs - b.timestampMs),
          interactions: [...(state.project.interactions || []), newInteraction].sort((a, b) => a.timestampMs - b.timestampMs),
          zoomBlocks: updatedBlocks,
          keyframes: updatedKfs,
        },
        selectedKeyframeId: selectedKfId,
        selectedBlockId: activeBlock.id,
      });
      toast.info(`Camera shifted to (${Math.round(clamped.x * 100)}%, ${Math.round(clamped.y * 100)}%)`);
      return;
    }

    // Case 3 / 4: Click outside any zoom block (e.g. at 0:14 halfway through recording)
    // Create a complete, beautifully formed zoom block and keyframe cluster centered on the clicked position!
    const leadInMs = 350;
    const holdMs = 2200;
    const leadOutMs = 350;

    // Determine non-overlapping startMs with previous block
    const prevBlock = [...state.project.zoomBlocks]
      .filter((b) => b.endTimeMs <= time)
      .sort((a, b) => b.endTimeMs - a.endTimeMs)[0];
    const rawStart = Math.max(0, time - leadInMs);
    const startMs = prevBlock && prevBlock.endTimeMs > rawStart
      ? Math.min(time - 80, prevBlock.endTimeMs + 50)
      : rawStart;

    // Determine non-overlapping end with next block
    const nextBlock = [...state.project.zoomBlocks]
      .filter((b) => b.startTimeMs >= time)
      .sort((a, b) => a.startTimeMs - b.startTimeMs)[0];
    const rawHoldEnd = Math.min(state.durationMs, time + holdMs);
    const holdEndMs = nextBlock && nextBlock.startTimeMs < rawHoldEnd + leadOutMs
      ? Math.max(time + 400, nextBlock.startTimeMs - leadOutMs - 50)
      : rawHoldEnd;
    const outMs = Math.min(state.durationMs, holdEndMs + leadOutMs);

    const clusterKfs: KeyframeNode[] = [
      {
        id: `kf-in-${now}`,
        timeMs: startMs,
        scale: 1.0,
        targetX: 0.5,
        targetY: 0.5,
        easing: "cubic",
      },
      {
        id: `kf-peak-${now}`,
        timeMs: time,
        scale: activeScale,
        targetX: clamped.x,
        targetY: clamped.y,
        easing: "spring",
        sound: "click",
        soundPreset: "bop",
        soundVolume: 0.70,
      },
      {
        id: `kf-hold-${now}`,
        timeMs: holdEndMs,
        scale: activeScale,
        targetX: clamped.x,
        targetY: clamped.y,
        easing: "cubic",
      },
      {
        id: `kf-out-${now}`,
        timeMs: outMs,
        scale: 1.0,
        targetX: 0.5,
        targetY: 0.5,
        easing: "cubic",
      },
    ];

    const newBlock: ZoomBlock = {
      id: `zoom-shift-${now}`,
      startTimeMs: startMs,
      endTimeMs: holdEndMs,
      targetX: clamped.x,
      targetY: clamped.y,
      scale: activeScale,
      enabled: true,
    };

    // Filter out conflicting dummy keyframes between startMs and outMs
    const filteredExistingKfs = (state.project.keyframes || []).filter(
      (k) => k.timeMs < startMs || k.timeMs > outMs,
    );

    const mergedKfs = [...filteredExistingKfs, ...clusterKfs].sort((a, b) => a.timeMs - b.timeMs);
    const mergedBlocks = [...state.project.zoomBlocks, newBlock].sort((a, b) => a.startTimeMs - b.startTimeMs);

    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        cursorTrajectory: existingTraj,
        clicks: [...(state.project.clicks || []), newClick].sort((a, b) => a.timestampMs - b.timestampMs),
        interactions: [...(state.project.interactions || []), newInteraction].sort((a, b) => a.timestampMs - b.timestampMs),
        keyframes: mergedKfs,
        zoomBlocks: mergedBlocks,
      },
      selectedKeyframeId: clusterKfs[1]!.id,
      selectedBlockId: newBlock.id,
    });
    toast.success(`Camera shifted to (${Math.round(clamped.x * 100)}%, ${Math.round(clamped.y * 100)}%)`);
  },

  detectActivityFromFrames: (frames, options) => {
    const state = get();
    if (!state.project || frames.length === 0) return;
    const { interactions, clicks, cursorTrajectory } = detectActivityEventsFromFrames(
      frames,
      320,
      180,
      options,
    );

    const { keyframes, zoomBlocks } = plotInteractionsToKeyframesAndZoomBlocks(
      interactions,
      state.durationMs,
      { continuousGlide: true, centerTyping: true, holdDurationMs: 1000, inactivityResetMs: 1000, maxGlideGapMs: 1000, scale: 1.80, minRestMs: 600, enableRevealDip: false },
    );

    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        clicks: clicks.length > 0 ? clicks : state.project.clicks,
        interactions: interactions.length > 0 ? interactions : state.project.interactions,
        cursorTrajectory: cursorTrajectory.length > 0 ? cursorTrajectory : state.project.cursorTrajectory,
        zoomBlocks,
        keyframes,
      },
      selectedBlockId: zoomBlocks[0]?.id ?? null,
    });
    toast.success(
      `Detected ${interactions.length} activities from video frames. Auto-plotted ${zoomBlocks.length} zooms.`,
    );
  },

  updateZoomBlock: (id, updates) => {
    const state = get();
    if (!state.project) return;
    const mappedBlocks = state.project.zoomBlocks.map((b) => (b.id === id ? { ...b, ...updates } : b));
    const sortedBlocks = enforceNonOverlappingZoomBlocks(mappedBlocks, 250);
    const updatedKeyframes = zoomBlocksToKeyframes(sortedBlocks, state.durationMs);
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        zoomBlocks: sortedBlocks,
        keyframes: updatedKeyframes,
      },
    });
  },

  toggleZoomBlock: (id) => {
    const state = get();
    if (!state.project) return;
    const updatedBlocks = state.project.zoomBlocks.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b));
    const updatedKeyframes = zoomBlocksToKeyframes(updatedBlocks, state.durationMs);
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        zoomBlocks: updatedBlocks,
        keyframes: updatedKeyframes,
      },
    });
  },

  deleteZoomBlock: (id) => {
    const state = get();
    if (!state.project) return;
    const updatedBlocks = state.project.zoomBlocks.filter((b) => b.id !== id);
    const updatedKeyframes = zoomBlocksToKeyframes(updatedBlocks, state.durationMs);
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        zoomBlocks: updatedBlocks,
        keyframes: updatedKeyframes,
      },
      selectedBlockId: null,
    });
    toast.info("Zoom block removed.");
  },

  clearZoomBlocks: () => {
    const state = get();
    if (!state.project) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        zoomBlocks: [],
        keyframes: [],
      },
      selectedBlockId: null,
      selectedKeyframeId: null,
    });
    toast.info("Cleared all zoom blocks.");
  },

  addZoomBlockAtCurrentTime: () => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;
    const cur = interpolateCursorAtTime(time, state.project.cursorTrajectory, 0.5, 0.5);
    const clamped = clampCameraToBounds(cur.x, cur.y, 1.85, "center");

    const leadInMs = 400;
    const holdDurationMs = 2200;
    const startMs = Math.max(0, time - leadInMs);
    const endMs = Math.min(state.durationMs, time + holdDurationMs);

    const newBlock: ZoomBlock = {
      id: `zoom-${Date.now()}`,
      startTimeMs: startMs,
      endTimeMs: endMs,
      targetX: clamped.x,
      targetY: clamped.y,
      scale: 1.85,
      enabled: true,
    };

    const updatedBlocks = [...state.project.zoomBlocks, newBlock].sort((a, b) => a.startTimeMs - b.startTimeMs);
    const updatedKeyframes = zoomBlocksToKeyframes(updatedBlocks, state.durationMs);

    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        zoomBlocks: updatedBlocks,
        keyframes: updatedKeyframes,
      },
      selectedBlockId: newBlock.id,
    });
    sfx.playClickBop(state.project.audioSettings?.clickSoundPreset || "bop", 0.7);
    toast.success("Zoom applied at current playhead.");
  },

  addKeyframeAtCurrentTime: (
    scale = 1.85,
    targetX,
    targetY,
    effect?: VideoEffectType,
    effectIntensity?: number,
  ) => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;
    const cur = interpolateCursorAtTime(time, state.project.cursorTrajectory, 0.5, 0.5);
    const finalX = targetX !== undefined ? targetX : cur.x;
    const finalY = targetY !== undefined ? targetY : cur.y;
    const clamped = clampCameraToBounds(finalX, finalY, scale, "center");
    const newKf: KeyframeNode = {
      id: `kf-${Date.now()}`,
      timeMs: time,
      scale,
      targetX: clamped.x,
      targetY: clamped.y,
      easing: "cubic",
      sound: "click",
      soundPreset: "bop",
      soundVolume: 0.7,
      ...(effect ? { effect, effectIntensity: effectIntensity ?? 0.8 } : {}),
    };
    const updated = insertKeyframe(state.project.keyframes || [], newKf);
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        keyframes: updated,
      },
      selectedKeyframeId: newKf.id,
      selectedBlockId: null,
      selectedEffectId: null,
    });
    toast.success("Keyframe added at playhead.");
  },

  updateKeyframe: (id, updates) => {
    const state = get();
    if (!state.project || !state.project.keyframes) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        keyframes: state.project.keyframes.map((kf) => (kf.id === id ? { ...kf, ...updates } : kf)),
      },
    });
  },

  deleteKeyframe: (id) => {
    const state = get();
    if (!state.project || !state.project.keyframes) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        keyframes: removeKeyframe(state.project.keyframes, id),
      },
      selectedKeyframeId: null,
    });
    toast.info("Keyframe deleted.");
  },

  clearKeyframes: () => {
    const state = get();
    if (!state.project) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        keyframes: [],
      },
      selectedKeyframeId: null,
    });
    toast.info("Cleared all keyframes.");
  },

  addEffectAtCurrentTime: (type = "spotlight", preset = "cinematic") => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;
    const activeBlock = state.project.zoomBlocks.find(
      (b) => time >= b.startTimeMs && time <= b.endTimeMs,
    );
    const newEffect: VideoEffect = {
      id: `eff-${Date.now()}`,
      name:
        type === "spotlight"
          ? "Spotlight Focus"
          : type === "vignette"
          ? "Cinematic Vignette"
          : type === "blur"
          ? "Motion Blur"
          : type === "glow"
          ? "Cursor Glow"
          : type === "speed"
          ? "Speed Ramp (0.5x)"
          : type === "filter"
          ? `Color Grade (${preset})`
          : "Video Effect",
      type,
      startTimeMs: time,
      durationMs: 2500,
      intensity: type === "speed" ? 0.5 : 0.75,
      targetX: activeBlock?.targetX ?? 0.5,
      targetY: activeBlock?.targetY ?? 0.5,
      preset,
      enabled: true,
    };
    const updated = insertVideoEffect(state.project.effects || [], newEffect);
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        effects: updated,
      },
      selectedEffectId: newEffect.id,
      selectedBlockId: null,
      selectedKeyframeId: null,
    });
    toast.success(`Added ${newEffect.name} effect.`);
  },

  updateEffect: (id, updates) => {
    const state = get();
    if (!state.project || !state.project.effects) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        effects: updateVideoEffect(state.project.effects, id, updates),
      },
    });
  },

  deleteEffect: (id) => {
    const state = get();
    if (!state.project || !state.project.effects) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        effects: removeVideoEffect(state.project.effects, id),
      },
      selectedEffectId: null,
    });
    toast.info("Effect removed.");
  },

  clearEffects: () => {
    const state = get();
    if (!state.project) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        effects: [],
      },
      selectedEffectId: null,
    });
    toast.info("Cleared all effects.");
  },

  addTextOverlay: (text = "New Caption") => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;
    const newText: TextOverlay = {
      id: `txt-${Date.now()}`,
      text,
      startTimeMs: time,
      durationMs: 3000,
      x: 0.5,
      y: 0.85,
      fontSize: 22,
      color: "#ffffff",
      bgColor: "rgba(15, 17, 23, 0.85)",
    };
    const updated = [...(state.project.textOverlays || []), newText];
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        textOverlays: updated,
      },
      selectedTextId: newText.id,
    });
    toast.success("Text overlay added.");
  },

  updateTextOverlay: (id, updates) => {
    const state = get();
    if (!state.project || !state.project.textOverlays) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        textOverlays: state.project.textOverlays.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      },
    });
  },

  deleteTextOverlay: (id) => {
    const state = get();
    if (!state.project || !state.project.textOverlays) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        textOverlays: state.project.textOverlays.filter((t) => t.id !== id),
      },
      selectedTextId: null,
    });
    toast.info("Text overlay removed.");
  },

  addAudioTrack: (name, url, type = "music") => {
    const state = get();
    if (!state.project) return;
    const newAudio: AudioTrack = {
      id: `audio-${Date.now()}`,
      name,
      type,
      url,
      startTimeMs: 0,
      durationMs: state.durationMs,
      volume: 0.5,
      muted: false,
    };
    const updated = [...(state.project.audioTracks || []), newAudio];
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        audioTracks: updated,
      },
      selectedAudioId: newAudio.id,
    });
    toast.success(`Added ${name} to timeline.`);
  },

  updateAudioTrack: (id, updates) => {
    const state = get();
    if (!state.project || !state.project.audioTracks) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        audioTracks: state.project.audioTracks.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      },
    });
  },

  deleteAudioTrack: (id) => {
    const state = get();
    if (!state.project || !state.project.audioTracks) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        audioTracks: state.project.audioTracks.filter((a) => a.id !== id),
      },
      selectedAudioId: null,
    });
    toast.info("Audio track removed.");
  },

  updateAudioSettings: (updates) => {
    const state = get();
    if (!state.project) return;
    const current = state.project.audioSettings || { ...DEFAULT_AUDIO_SETTINGS };
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        audioSettings: { ...current, ...updates },
      },
    });
  },

  playClickSoundPreview: (preset, volume) => {
    const state = get();
    const settings = state.project?.audioSettings || DEFAULT_AUDIO_SETTINGS;
    sfx.playClickBop(
      preset || settings.clickSoundPreset,
      volume !== undefined ? volume : settings.clickSoundVolume,
    );
  },

  playTypingSoundPreview: (preset, volume) => {
    const state = get();
    const settings = state.project?.audioSettings || DEFAULT_AUDIO_SETTINGS;
    sfx.playTypingBurst(
      5,
      90,
      preset || settings.typingSoundPreset,
      volume !== undefined ? volume : settings.typingSoundVolume,
    );
  },

  updateLooks: (updates) => {
    const state = get();
    if (!state.project) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        looks: { ...state.project.looks, ...updates },
      },
    });
  },

  addSfxTrackAtCurrentTime: (preset = "bop", name) => {
    const state = get();
    if (!state.project) return;

    const startTimeMs = Math.max(0, state.currentTimeMs);
    const durationMs = 600;
    const resolvedPreset = preset || "bop";
    const resolvedName = name || (preset ? `SFX (${resolvedPreset})` : "SFX Track");

    const newSfxTrack: AudioTrack = {
      id: `sfx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: resolvedName,
      type: "sfx",
      url: `sfx://${resolvedPreset}`,
      startTimeMs,
      durationMs,
      volume: 0.7,
      muted: false,
    };

    const currentTracks = state.project.audioTracks || [];
    const updatedTracks = [...currentTracks, newSfxTrack];

    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        audioTracks: updatedTracks,
      },
      selectedAudioId: newSfxTrack.id,
    });

    toast.success(`Added ${newSfxTrack.name} to timeline.`);
  },

  trimLeftAtPlayhead: () => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;

    // Prioritize explicitly selected item
    if (state.selectedClipId) {
      const clip = state.project.clips.find((c) => c.id === state.selectedClipId);
      if (clip && time > clip.timelineStartMs && time < clip.timelineStartMs + clip.durationMs) {
        const delta = time - clip.timelineStartMs;
        const newDuration = clip.durationMs - delta;
        if (newDuration >= 100) {
          const newClips = state.project.clips.map((c) =>
            c.id === clip.id
              ? {
                  ...c,
                  timelineStartMs: time,
                  durationMs: newDuration,
                  sourceOffsetMs: c.sourceOffsetMs + delta,
                }
              : c,
          );
          set({
            ...pushHistory(state),
            project: { ...state.project, clips: newClips },
          });
          toast.info("Trimmed clip start to playhead.");
          return;
        }
      }
    }

    if (state.selectedBlockId) {
      const block = state.project.zoomBlocks.find((b) => b.id === state.selectedBlockId);
      if (block && time > block.startTimeMs && time < block.endTimeMs) {
        if (block.endTimeMs - time >= 200) {
          const newBlocks = state.project.zoomBlocks.map((b) =>
            b.id === block.id ? { ...b, startTimeMs: time } : b,
          );
          set({
            ...pushHistory(state),
            project: { ...state.project, zoomBlocks: newBlocks },
          });
          toast.info("Trimmed zoom block start to playhead.");
          return;
        }
      }
    }

    if (state.selectedTextId) {
      const text = state.project.textOverlays?.find((t) => t.id === state.selectedTextId);
      if (text && time > text.startTimeMs && time < text.startTimeMs + text.durationMs) {
        const delta = time - text.startTimeMs;
        const newDuration = text.durationMs - delta;
        if (newDuration >= 100) {
          const newTexts = (state.project.textOverlays || []).map((t) =>
            t.id === text.id
              ? {
                  ...t,
                  startTimeMs: time,
                  durationMs: newDuration,
                }
              : t,
          );
          set({
            ...pushHistory(state),
            project: { ...state.project, textOverlays: newTexts },
          });
          toast.info("Trimmed text start to playhead.");
          return;
        }
      }
    }

    if (state.selectedAudioId) {
      const audio = state.project.audioTracks?.find((a) => a.id === state.selectedAudioId);
      if (audio && time > audio.startTimeMs && time < audio.startTimeMs + audio.durationMs) {
        const delta = time - audio.startTimeMs;
        const newDuration = audio.durationMs - delta;
        if (newDuration >= 100) {
          const newAudios = (state.project.audioTracks || []).map((a) =>
            a.id === audio.id
              ? {
                  ...a,
                  startTimeMs: time,
                  durationMs: newDuration,
                }
              : a,
          );
          set({
            ...pushHistory(state),
            project: { ...state.project, audioTracks: newAudios },
          });
          toast.info("Trimmed audio start to playhead.");
          return;
        }
      }
    }

    // Default: find video clip intersecting playhead
    const defaultClip = state.project.clips.find(
      (c) => time > c.timelineStartMs && time < c.timelineStartMs + c.durationMs,
    );
    if (defaultClip) {
      const delta = time - defaultClip.timelineStartMs;
      const newDuration = defaultClip.durationMs - delta;
      if (newDuration >= 100) {
        const newClips = state.project.clips.map((c) =>
          c.id === defaultClip.id
            ? {
                ...c,
                timelineStartMs: time,
                durationMs: newDuration,
                sourceOffsetMs: c.sourceOffsetMs + delta,
              }
            : c,
        );
        set({
          ...pushHistory(state),
          project: { ...state.project, clips: newClips },
        });
        toast.info("Trimmed clip start to playhead.");
        return;
      }
    }
  },

  trimLeftAtCurrentTime: () => {
    get().trimLeftAtPlayhead();
  },

  trimRightAtPlayhead: () => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;

    // Prioritize explicitly selected item
    if (state.selectedClipId) {
      const clip = state.project.clips.find((c) => c.id === state.selectedClipId);
      if (clip && time > clip.timelineStartMs && time < clip.timelineStartMs + clip.durationMs) {
        const newDuration = time - clip.timelineStartMs;
        if (newDuration >= 100) {
          const newClips = state.project.clips.map((c) =>
            c.id === clip.id ? { ...c, durationMs: newDuration } : c,
          );
          set({
            ...pushHistory(state),
            project: { ...state.project, clips: newClips },
          });
          toast.info("Trimmed clip end to playhead.");
          return;
        }
      }
    }

    if (state.selectedBlockId) {
      const block = state.project.zoomBlocks.find((b) => b.id === state.selectedBlockId);
      if (block && time > block.startTimeMs && time < block.endTimeMs) {
        if (time - block.startTimeMs >= 200) {
          const newBlocks = state.project.zoomBlocks.map((b) =>
            b.id === block.id ? { ...b, endTimeMs: time } : b,
          );
          set({
            ...pushHistory(state),
            project: { ...state.project, zoomBlocks: newBlocks },
          });
          toast.info("Trimmed zoom block end to playhead.");
          return;
        }
      }
    }

    if (state.selectedTextId) {
      const text = state.project.textOverlays?.find((t) => t.id === state.selectedTextId);
      if (text && time > text.startTimeMs && time < text.startTimeMs + text.durationMs) {
        const newDuration = time - text.startTimeMs;
        if (newDuration >= 100) {
          const newTexts = (state.project.textOverlays || []).map((t) =>
            t.id === text.id ? { ...t, durationMs: newDuration } : t,
          );
          set({
            ...pushHistory(state),
            project: { ...state.project, textOverlays: newTexts },
          });
          toast.info("Trimmed text end to playhead.");
          return;
        }
      }
    }

    if (state.selectedAudioId) {
      const audio = state.project.audioTracks?.find((a) => a.id === state.selectedAudioId);
      if (audio && time > audio.startTimeMs && time < audio.startTimeMs + audio.durationMs) {
        const newDuration = time - audio.startTimeMs;
        if (newDuration >= 100) {
          const newAudios = (state.project.audioTracks || []).map((a) =>
            a.id === audio.id ? { ...a, durationMs: newDuration } : a,
          );
          set({
            ...pushHistory(state),
            project: { ...state.project, audioTracks: newAudios },
          });
          toast.info("Trimmed audio end to playhead.");
          return;
        }
      }
    }

    // Default: find video clip intersecting playhead
    const defaultClip = state.project.clips.find(
      (c) => time > c.timelineStartMs && time < c.timelineStartMs + c.durationMs,
    );
    if (defaultClip) {
      const newDuration = time - defaultClip.timelineStartMs;
      if (newDuration >= 100) {
        const newClips = state.project.clips.map((c) =>
          c.id === defaultClip.id ? { ...c, durationMs: newDuration } : c,
        );
        set({
          ...pushHistory(state),
          project: { ...state.project, clips: newClips },
        });
        toast.info("Trimmed clip end to playhead.");
        return;
      }
    }
  },

  trimRightAtCurrentTime: () => {
    get().trimRightAtPlayhead();
  },

  splitAtPlayhead: () => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;

    // Check if user has selected audio track to split
    if (state.selectedAudioId && state.project.audioTracks) {
      const audio = state.project.audioTracks.find((a) => a.id === state.selectedAudioId);
      if (audio && time > audio.startTimeMs && time < audio.startTimeMs + audio.durationMs) {
        const firstDur = time - audio.startTimeMs;
        const secondDur = audio.durationMs - firstDur;
        const firstAudio = { ...audio, durationMs: firstDur };
        const secondAudio = {
          ...audio,
          id: `audio-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          startTimeMs: time,
          durationMs: secondDur,
        };
        const newAudios = state.project.audioTracks.flatMap((a) =>
          a.id === audio.id ? [firstAudio, secondAudio] : [a],
        );
        set({
          ...pushHistory(state),
          project: {
            ...state.project,
            audioTracks: newAudios,
          },
        });
        toast.info("Split applied to audio track.");
        return;
      }
    }

    // Check if user has selected text overlay to split
    if (state.selectedTextId && state.project.textOverlays) {
      const text = state.project.textOverlays.find((t) => t.id === state.selectedTextId);
      if (text && time > text.startTimeMs && time < text.startTimeMs + text.durationMs) {
        const firstDur = time - text.startTimeMs;
        const secondDur = text.durationMs - firstDur;
        const firstText = { ...text, durationMs: firstDur };
        const secondText = {
          ...text,
          id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          startTimeMs: time,
          durationMs: secondDur,
        };
        const newTexts = state.project.textOverlays.flatMap((t) =>
          t.id === text.id ? [firstText, secondText] : [t],
        );
        set({
          ...pushHistory(state),
          project: {
            ...state.project,
            textOverlays: newTexts,
          },
        });
        toast.info("Split applied to text overlay.");
        return;
      }
    }

    // Split active clip
    let clipSplit = false;
    const newClips: TimelineClip[] = [];
    for (const clip of state.project.clips) {
      if (!clipSplit && time > clip.timelineStartMs && time < clip.timelineStartMs + clip.durationMs) {
        const split = splitClip(clip, time);
        if (split) {
          newClips.push(split[0], split[1]);
          clipSplit = true;
          continue;
        }
      }
      newClips.push(clip);
    }

    // Split zoom block if playhead is inside one
    let blockSplit = false;
    const newBlocks: ZoomBlock[] = [];
    for (const block of state.project.zoomBlocks) {
      if (!blockSplit && time > block.startTimeMs && time < block.endTimeMs) {
        const split = splitZoomBlock(block, time);
        if (split) {
          newBlocks.push(split[0], split[1]);
          blockSplit = true;
          continue;
        }
      }
      newBlocks.push(block);
    }

    if (clipSplit || blockSplit) {
      set({
        ...pushHistory(state),
        project: {
          ...state.project,
          clips: newClips,
          zoomBlocks: newBlocks,
        },
      });
      toast.info("Split applied at playhead.");
    }
  },

  splitAtCurrentTime: () => {
    get().splitAtPlayhead();
  },

  deleteSelected: () => {
    const state = get();
    if (!state.project) return;

    if (state.selectedBlockId) {
      state.deleteZoomBlock(state.selectedBlockId);
    } else if (state.selectedKeyframeId) {
      state.deleteKeyframe(state.selectedKeyframeId);
    } else if (state.selectedEffectId) {
      state.deleteEffect(state.selectedEffectId);
    } else if (state.selectedTextId) {
      state.deleteTextOverlay(state.selectedTextId);
    } else if (state.selectedAudioId) {
      state.deleteAudioTrack(state.selectedAudioId);
    } else if (state.selectedClipId) {
      state.deleteVideoClip(state.selectedClipId);
    }
  },

  deleteVideoClip: (clipId?: string) => {
    const state = get();
    if (!state.project) return;
    const targetId = clipId || state.selectedClipId || state.project.clips[0]?.id;
    if (!targetId) {
      if (state.project.summary.media) {
        set({
          ...pushHistory(state),
          project: {
            ...state.project,
            summary: { ...state.project.summary, media: null },
            clips: [],
            zoomBlocks: [],
            keyframes: [],
          },
        });
        toast.info("Video media cleared.");
      }
      return;
    }
    const updatedClips = removeClipAndRipple(state.project.clips, targetId);
    const hasClipsLeft = updatedClips.length > 0;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        clips: updatedClips,
        summary: {
          ...state.project.summary,
          media: hasClipsLeft ? state.project.summary.media : null,
        },
        zoomBlocks: hasClipsLeft ? state.project.zoomBlocks : [],
        keyframes: hasClipsLeft ? state.project.keyframes : [],
      },
      selectedClipId: null,
    });
    toast.info("Video clip deleted.");
  },

  deleteCurrentProject: async () => {
    const state = get();
    if (!state.project) return false;
    const id = state.project.summary.id;
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(`domolens_project_${id}`);
    }
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(`domolens_full_project_${id}`);
    }
    const success = await useProjects.getState().remove(id);
    if (success) {
      useNav.getState().go({ name: "home" });
      set({ project: null, currentTimeMs: 0, durationMs: 0 });
    }
    return success;
  },

  sendLlmMessage: async (content: string) => {
    const state = get();
    const userMsg: LlmMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    set((s) => ({
      llmMessages: [...s.llmMessages, userMsg],
      isLlmThinking: true,
    }));

    // Generate responsive contextual AI answer
    await new Promise((r) => setTimeout(r, 600));

    const lower = content.toLowerCase();
    let reply = "I analyzed your recording timeline.";
    let actions: Array<{ label: string; actionKey: string }> = [];

    if (lower.includes("tour") || lower.includes("walkthrough") || lower.includes("shift")) {
      reply =
        "I can generate a cinematic Camera Shift Tour across your recorded UI interactions. The camera will smoothly glide between elements with organic crane pullbacks without dropping to full frame.";
      actions = [{ label: "Generate Camera Shift Tour", actionKey: "tour_shift" }];
    } else if (lower.includes("zoom") || lower.includes("plot") || lower.includes("click") || lower.includes("type")) {
      reply =
        "I can automatically plot camera zooms for every button click and typing action. Each zoom tracks the mouse/target, holds for 2.4 seconds, and smoothly glides back to full screen.";
      actions = [{ label: "Run Auto-Plot Zooms", actionKey: "plot_zooms" }];
    } else if (lower.includes("title") || lower.includes("chapter") || lower.includes("summary")) {
      reply =
        "Here are suggested chapters for your video based on recorded interactions:\n• 00:00 - Introduction & Workspace\n• 00:02 - Button Interaction\n• 00:06 - Key Input & Focus\n• 00:10 - Overview & Outro";
      actions = [{ label: "Apply Chapters & Title", actionKey: "suggest_chapters" }];
    } else if (lower.includes("text") || lower.includes("caption") || lower.includes("subtitle")) {
      reply = `I can add an elegant subtitle at the current playhead position (${(get().currentTimeMs / 1000).toFixed(1)}s).`;
      actions = [{ label: "Insert Subtitle", actionKey: "add_subtitle" }];
    } else if (lower.includes("audio") || lower.includes("sound") || lower.includes("sfx")) {
      reply = "Synchronizing tactile click bops and crisp typing sound effects gives your demo a professional tactile response.";
      actions = [{ label: "Apply Auto AFX", actionKey: "auto_afx" }];
    } else {
      reply = `Got it! I can help you adjust zooms, keyframes, captions, or styling for "${state.project?.summary.name || "your video"}". What would you like to tweak next?`;
      actions = [
        { label: "Auto-Plot Zooms", actionKey: "plot_zooms" },
        { label: "Camera Shift Tour", actionKey: "tour_shift" },
        { label: "Add Subtitle", actionKey: "add_subtitle" },
      ];
    }

    const aiMsg: LlmMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: reply,
      timestamp: Date.now(),
      actions,
    };

    set((s) => ({
      llmMessages: [...s.llmMessages, aiMsg],
      isLlmThinking: false,
    }));
  },

  executeLlmAction: (actionKey: string) => {
    const state = get();
    if (actionKey === "plot_zooms") {
      state.plotInteractions({ fallbackIfEmpty: true });
    } else if (actionKey === "tour_shift") {
      state.createTourCameraShift();
    } else if (actionKey === "suggest_chapters") {
      if (state.project) {
        state.addTextOverlay("Chapter: Key Interaction");
        toast.success("Applied chapters and title highlights!");
      }
    } else if (actionKey === "add_subtitle") {
      state.addTextOverlay("Click here to proceed");
    } else if (actionKey === "auto_afx") {
      state.autoAfx();
    }
  },

  undo: () => {
    const state = get();
    if (state.history.length === 0 || !state.project) return;
    const previous = state.history[0]!;
    const nextHistory = state.history.slice(1);
    set({
      project: previous,
      history: nextHistory,
      future: [JSON.parse(JSON.stringify(state.project)), ...state.future],
    });
    toast.info("Undo");
  },

  redo: () => {
    const state = get();
    if (state.future.length === 0 || !state.project) return;
    const next = state.future[0]!;
    const nextFuture = state.future.slice(1);
    set({
      project: next,
      history: [JSON.parse(JSON.stringify(state.project)), ...state.history],
      future: nextFuture,
    });
    toast.info("Redo");
  },
}));

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
useEditor.subscribe((state, prevState) => {
  if (state.project && state.project !== prevState.project) {
    const proj = state.project;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      try {
        platform.saveFullProject?.(proj);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(`domolens_full_project_${proj.summary.id}`, JSON.stringify(proj));
        }
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(`domolens_project_${proj.summary.id}`, JSON.stringify(proj));
        }
      } catch (err) {
        console.warn("Auto-save project failed:", err);
      }
    }, 400);
  }
});
