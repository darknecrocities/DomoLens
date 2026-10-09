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
  type ShiftAnimationStyle,
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


import {
  checkOllamaConnection,
  queryOllamaDirector,
  DEFAULT_OLLAMA_ENDPOINT,
} from "../lib/ollama";

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

export interface LlmQuestionOption {
  label: string;
  value: string;
}

export interface LlmQuestion {
  id: string;
  prompt: string;
  options: LlmQuestionOption[];
}

export interface LlmMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  actions?: Array<{
    label: string;
    actionKey: string;
  }>;
  questions?: LlmQuestion[];
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

  // LLM Assistant & Ollama
  llmMessages: LlmMessage[];
  isLlmThinking: boolean;
  ollamaStatus: "disconnected" | "connecting" | "connected" | "error";
  ollamaModels: string[];
  selectedOllamaModel: string;
  ollamaEndpoint: string;
  checkOllamaStatus: () => Promise<void>;
  setSelectedOllamaModel: (model: string) => void;
  setOllamaEndpoint: (endpoint: string) => void;
  answerLlmQuestion: (questionId: string, answerValue: string) => Promise<void>;

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
  applyZoomBlockSettings: (
    id: string,
    settings: {
      scale?: number;
      shiftDurationMs?: number;
      shiftAnimation?: ShiftAnimationStyle;
      targetX?: number;
      targetY?: number;
    },
  ) => void;
  applyZoomBlockSettingsToAll: (settings: {
    scale?: number;
    shiftDurationMs?: number;
    shiftAnimation?: ShiftAnimationStyle;
  }) => void;
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
  ollamaStatus: "disconnected",
  ollamaModels: [],
  selectedOllamaModel: "llama3.2:latest",
  ollamaEndpoint: DEFAULT_OLLAMA_ENDPOINT,

  checkOllamaStatus: async () => {
    set({ ollamaStatus: "connecting" });
    const res = await checkOllamaConnection(get().ollamaEndpoint);
    if (res.connected) {
      const curSelected = get().selectedOllamaModel;
      const targetModel =
        curSelected && res.models.includes(curSelected)
          ? curSelected
          : (res.recommendedModel || res.models[0] || "llama3.2:latest");
      set({
        ollamaStatus: "connected",
        ollamaModels: res.models,
        selectedOllamaModel: targetModel,
      });
      toast.success(`Ollama connected: ${targetModel}`);
    } else {
      set({ ollamaStatus: "disconnected" });
      toast.info("Ollama is offline. Start 'ollama serve' to enable local LLM.");
    }
  },

  setSelectedOllamaModel: (model: string) => {
    set({ selectedOllamaModel: model });
    toast.info(`Active Ollama Model: ${model}`);
  },

  setOllamaEndpoint: (endpoint: string) => {
    set({ ollamaEndpoint: endpoint });
    void get().checkOllamaStatus();
  },

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
      if (!parsed.textOverlays) parsed.textOverlays = [];
      // Clean up any stale legacy static dummy captions from older recordings so subtitles are 100% dynamic!
      if (parsed.textOverlays.length > 0 && parsed.summary.source === "recording") {
        const staticPatterns = [
          "Click to open application showcase navigation",
          "Navigate and inspect settings panel options",
          "Click and focus target element",
          "Typing and entering values into form",
          "Right click to inspect context options",
        ];
        parsed.textOverlays = parsed.textOverlays.filter((o) => {
          return !staticPatterns.some((pattern) => o.text.includes(pattern));
        });
      }

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

  applyZoomBlockSettings: (id, settings) => {
    const state = get();
    if (!state.project) return;
    const mappedBlocks = state.project.zoomBlocks.map((b) => (b.id === id ? { ...b, ...settings } : b));
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
    toast.success("Applied zoom settings to selected block!");
  },

  applyZoomBlockSettingsToAll: (settings) => {
    const state = get();
    if (!state.project || state.project.zoomBlocks.length === 0) return;
    const mappedBlocks = state.project.zoomBlocks.map((b) => ({ ...b, ...settings }));
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
    toast.success(`Applied shift settings to all ${mappedBlocks.length} zoom blocks!`);
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
      y: 0.88,
      fontSize: 14,
      color: "#ffffff",
      bgColor: "rgba(15, 17, 23, 0.85)",
      cardStyle: "glass",
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

  answerLlmQuestion: async (_questionId: string, answerValue: string) => {
    let promptText = answerValue;
    if (answerValue === "app_type:cli") {
      promptText = "My app is a Developer CLI / Terminal Tool. Recommend the best styling and preset.";
    } else if (answerValue === "app_type:saas") {
      promptText = "My app is a Modern SaaS Web App. Recommend the best styling and preset.";
    } else if (answerValue === "app_type:mobile") {
      promptText = "My app is a Mobile / Desktop App. Recommend the best styling and preset.";
    } else if (answerValue === "app_type:creative") {
      promptText = "My app is a Creative & Indie Tool. Recommend the best styling and preset.";
    }
    await get().sendLlmMessage(promptText);
  },

  sendLlmMessage: async (content: string) => {
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

    const proj = get().project;
    const isOllamaConnected = get().ollamaStatus === "connected";

    // 1. ATTEMPT REAL LOCAL OLLAMA INFERENCE IF CONNECTED
    if (isOllamaConnected) {
      try {
        const projectSummary = {
          name: proj?.summary.name || "Recording",
          durationSec: proj && proj.summary.durationMs != null ? Number((proj.summary.durationMs / 1000).toFixed(1)) : 0,
          width: proj?.summary.width || 1920,
          height: proj?.summary.height || 1080,
          mouseClicksCount: proj?.clicks?.length ?? 0,
          typingInteractionsCount: proj?.interactions?.filter((i) => i.type === "typing").length ?? 0,
          zoomBlocksCount: proj?.zoomBlocks?.length ?? 0,
          textOverlaysCount: proj?.textOverlays?.length ?? 0,
          windowFrame: proj?.looks?.windowFrame ?? "none",
          tiltX: proj?.looks?.tiltX ?? proj?.looks?.tiltAngle ?? 0,
          tiltY: proj?.looks?.tiltY ?? 0,
          background: proj?.looks?.backgroundValue || "obsidian",
          cursorStyle: proj?.looks?.cursorStyle || "default",
          sfxEnabled: Boolean(proj?.audioSettings?.clickSoundEnabled),
        };

        const ollamaRes = await queryOllamaDirector({
          endpoint: get().ollamaEndpoint,
          model: get().selectedOllamaModel,
          userPrompt: content,
          projectSummary,
          conversationHistory: get().llmMessages.map((m) => ({ role: m.role, content: m.content })),
        });

        // If user gave a direct command to edit (tilt, background, cursor, frame, etc.) and model returned an action, execute it!
        const isEditCommand =
          !content.toLowerCase().includes("recommend") &&
          !content.toLowerCase().includes("suggest") &&
          !content.toLowerCase().includes("what");

        if (isEditCommand && ollamaRes.actions && ollamaRes.actions.length === 1) {
          const firstAct = ollamaRes.actions[0];
          if (firstAct) {
            get().executeLlmAction(firstAct.actionKey);
          }
        }

        const aiMsg: LlmMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: ollamaRes.message,
          timestamp: Date.now(),
          actions: ollamaRes.actions,
          questions: ollamaRes.questions,
        };

        set((s) => ({
          llmMessages: [...s.llmMessages, aiMsg],
          isLlmThinking: false,
        }));
        return;
      } catch (ollamaErr) {
        console.warn("Ollama inference failed, using heuristic director fallback:", ollamaErr);
      }
    }

    // 2. RESPONSIVE HEURISTIC DIRECTOR (INSTANT FALLBACK / OFFLINE RUNNER)
    await new Promise((r) => setTimeout(r, 350));

    const lower = content.toLowerCase();
    let reply = "I analyzed your recording timeline.";
    let actions: Array<{ label: string; actionKey: string }> = [];
    let questions: LlmQuestion[] | undefined;

    const clicks = proj?.clicks?.length ?? 0;
    const typing = proj?.interactions?.filter((i) => i.type === "typing").length ?? 0;
    const zoomCount = proj?.zoomBlocks?.length ?? 0;
    const textCount = proj?.textOverlays?.length ?? 0;
    const frame = proj?.looks?.windowFrame ?? "none";
    const tiltX = proj?.looks?.tiltX ?? proj?.looks?.tiltAngle ?? 0;
    const tiltY = proj?.looks?.tiltY ?? 0;
    const bg = proj?.looks?.backgroundValue || "obsidian";
    const cursor = proj?.looks?.cursorStyle || "default";
    const sfxOn = Boolean(proj?.audioSettings?.clickSoundEnabled);
    const durSec = proj && proj.summary.durationMs != null ? (proj.summary.durationMs / 1000).toFixed(1) : "0";

    // A. APP IDENTIFICATION & VALIDATION INQUIRY
    if (
      lower.includes("what is my app") ||
      lower.includes("what app") ||
      lower.includes("analyze my app") ||
      lower.includes("app category") ||
      lower.includes("app type") ||
      lower.includes("validate")
    ) {
      const detectedCategory =
        frame === "terminal" || (clicks < 6 && typing > 0)
          ? "Developer CLI / Terminal Utility"
          : clicks >= 6
          ? "Modern SaaS Web Platform"
          : "Product Showcase & Indie App";

      reply =
        `🎬 **App Analysis & Showcase Validation**:\n` +
        `Based on your recorded window framing (${frame.toUpperCase()}), ${clicks} mouse clicks, and typing bursts, your product appears to be a **${detectedCategory}**.\n\n` +
        `To generate the most impactful, high-converting showcase recommendations, **confirm or choose your application type:**`;

      questions = [
        {
          id: "app_category",
          prompt: "Select or confirm your application type:",
          options: [
            { label: "💻 Developer CLI / Terminal", value: "app_type:cli" },
            { label: "🌐 Modern SaaS Web App", value: "app_type:saas" },
            { label: "📱 Mobile / Desktop App", value: "app_type:mobile" },
            { label: "🎨 Creative & Indie Tool", value: "app_type:creative" },
          ],
        },
      ];

      actions = [
        { label: "Apply Developer Preset", actionKey: "apply_developer_style" },
        { label: "Apply SaaS Preset", actionKey: "apply_saas_style" },
        { label: "Auto-Plot Zooms", actionKey: "plot_zooms" },
      ];
    }
    // B. TAILORED RECOMMENDATIONS: DEVELOPER CLI / TERMINAL
    else if (lower.includes("developer cli") || lower.includes("terminal tool") || lower.includes("app_type:cli")) {
      reply =
        `✨ **Tailored Recommendations for Developer CLI & Terminal Tools**:\n\n` +
        `1. **Window Frame**: Keep macOS Terminal frame with traffic lights for authentic terminal aesthetics.\n` +
        `2. **Canvas Backdrop**: Studio Obsidian with deep dark contrast to make code and syntax stand out.\n` +
        `3. **Cursor Styling**: Neon Laser Dot or Terminal Caret to guide eyes to outputs.\n` +
        `4. **Acoustic Audio**: Mechanical keyboard click sounds with music ducking.\n` +
        `5. **Camera Glides**: Smooth zoom in on compilation commands and execution results.\n\n` +
        `Click **Apply Developer Preset** below to apply all these visual settings instantly:`;

      actions = [
        { label: "Apply Developer Preset", actionKey: "apply_developer_style" },
        { label: "Auto-Plot Zooms", actionKey: "plot_zooms" },
        { label: "Turn On Tactile SFX", actionKey: "apply_rec_sfx" },
      ];
    }
    // C. TAILORED RECOMMENDATIONS: MODERN SAAS WEB APP
    else if (lower.includes("modern saas") || lower.includes("saas web") || lower.includes("app_type:saas")) {
      reply =
        `✨ **Tailored Recommendations for Modern SaaS Web Platforms**:\n\n` +
        `1. **3D Frame Perspective**: +12° pitch / -10° yaw for an Apple launch / Keynote presentation vibe.\n` +
        `2. **Backdrop**: Indigo Dusk or Studio Clean White gradient.\n` +
        `3. **Window Frame**: macOS Classic window frame with soft ambient drop-shadow.\n` +
        `4. **Cursor**: macOS Sculpted Arrow with click ripples.\n` +
        `5. **Subtitles**: Compact bottom glass pills to call out product features.\n\n` +
        `Click **Apply SaaS Preset** below to apply all these settings in one click:`;

      actions = [
        { label: "Apply SaaS Preset", actionKey: "apply_saas_style" },
        { label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" },
        { label: "Insert Subtitle", actionKey: "add_subtitle" },
      ];
    }
    // D. TAILORED RECOMMENDATIONS: MOBILE / DESKTOP APP
    else if (lower.includes("mobile") || lower.includes("app_type:mobile")) {
      reply =
        `✨ **Tailored Recommendations for Mobile & Desktop Apps**:\n\n` +
        `1. **Framing**: Frameless clean presentation with subtle glow.\n` +
        `2. **Cursor**: Scaled cursor (1.8x) for high mobile feed visibility.\n` +
        `3. **Camera**: Dynamic zoom tracking on touch/click hotspots.\n` +
        `4. **Audio**: Tactile pop sounds.\n\n` +
        `Click **Apply Mobile Preset** below:`;

      actions = [
        { label: "Apply Mobile Preset", actionKey: "apply_mobile_style" },
        { label: "Auto-Plot Zooms", actionKey: "plot_zooms" },
        { label: "Turn On Tactile SFX", actionKey: "apply_rec_sfx" },
      ];
    }
    // E. TAILORED RECOMMENDATIONS: CREATIVE & INDIE
    else if (lower.includes("creative") || lower.includes("app_type:creative")) {
      reply =
        `✨ **Tailored Recommendations for Creative & Indie Tools**:\n\n` +
        `1. **Backdrop**: Sunset Amber or Emerald Studio vibrant gradient.\n` +
        `2. **3D Frame Tilt**: +12° dynamic perspective.\n` +
        `3. **Camera**: Cinematic Camera Shift Tour across interactive elements.\n` +
        `4. **Subtitles**: Glassmorphic punchy overlays.\n\n` +
        `Click any action below:`;

      actions = [
        { label: "Sunset Amber Backdrop", actionKey: "apply_backdrop_sunset" },
        { label: "Camera Shift Tour", actionKey: "tour_shift" },
        { label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" },
      ];
    }
    // F. GENERAL RECOMMENDATIONS & AUDIT
    else if (
      lower.includes("recommend") ||
      lower.includes("suggest") ||
      lower.includes("how to improve") ||
      lower.includes("audit") ||
      lower.includes("advice") ||
      lower.includes("feedback")
    ) {
      reply =
        `✨ **DomoLens AI Director Recommendations**:\n\n` +
        `1. **Camera Focus**: ${
          zoomCount === 0 && clicks > 0
            ? `⚠️ Found ${clicks} clicks without auto-zoom. Adding camera punch zooms will highlight what you're clicking.`
            : `✓ Active camera tracking (${zoomCount} zoom blocks).`
        }\n` +
        `2. **3D Frame Tilt**: ${
          tiltX === 0
            ? `⚠️ Flat 2D orientation. A subtle +12° 3D frame tilt gives your app instant Keynote & Apple launch aesthetics.`
            : `✓ 3D tilt depth is active (${tiltX}°).`
        }\n` +
        `3. **Subtitles**: ${
          textCount === 0
            ? `⚠️ Zero subtitles. 85% of social media feeds view on mute. Adding subtitles keeps viewers engaged.`
            : `✓ ${textCount} subtitle overlay tracks active.`
        }\n` +
        `4. **Acoustic SFX**: ${
          !sfxOn
            ? `⚠️ Tactile sound effects are off. Adding click bops gives the viewer immediate tactile satisfaction.`
            : `✓ Tactile click sound effects active.`
        }\n\n` +
        `What kind of application is this? Select below to unlock targeted styling presets:`;

      questions = [
        {
          id: "app_category",
          prompt: "What kind of application are you showcasing?",
          options: [
            { label: "💻 Developer CLI / Terminal", value: "app_type:cli" },
            { label: "🌐 Modern SaaS Web App", value: "app_type:saas" },
            { label: "📱 Mobile / Desktop App", value: "app_type:mobile" },
            { label: "🎨 Creative & Indie Tool", value: "app_type:creative" },
          ],
        },
      ];

      actions = [
        ...(tiltX === 0 ? [{ label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" }] : []),
        ...(zoomCount === 0 ? [{ label: "Auto-Plot Zooms", actionKey: "apply_rec_zooms" }] : []),
        ...(!sfxOn ? [{ label: "Turn On Tactile SFX", actionKey: "apply_rec_sfx" }] : []),
        { label: "Switch to Obsidian Backdrop", actionKey: "apply_rec_backdrop" },
      ];
    }
    // G. VIDEO DESCRIPTION & TIMELINE BREAKDOWN
    else if (
      lower.includes("describe") ||
      lower.includes("what's in") ||
      lower.includes("whats in") ||
      lower.includes("analyze") ||
      lower.includes("summary") ||
      lower.includes("overview") ||
      lower.includes("breakdown")
    ) {
      reply =
        `🎬 **Video Description & Timeline Analysis**:\n` +
        `• **Project**: ${proj?.summary.name || "Recording"} (${durSec}s • ${proj?.summary.width || 1920}×${proj?.summary.height || 1080})\n` +
        `• **User Activity**: ${clicks} mouse clicks, ${typing} typing bursts captured\n` +
        `• **Camera Motion**: ${zoomCount} auto-zoom blocks (${zoomCount > 0 ? "active camera tracking" : "full frame 1.0x"})\n` +
        `• **Subtitles & Text**: ${textCount} overlay cards on timeline\n` +
        `• **Visual Styling**: ${frame.toUpperCase()} frame, 3D tilt (${tiltX}° pitch, ${tiltY}° yaw), ${bg.length > 25 ? "custom gradient" : bg} backdrop, ${cursor} pointer\n\n` +
        `Would you like me to auto-plot camera zooms, apply a 3D tilt, or audit recommendations to elevate this video?`;

      actions = [
        { label: "AI Recommendations", actionKey: "get_recommendations" },
        { label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" },
        { label: "Auto-Plot Zooms", actionKey: "plot_zooms" },
      ];
    }
    // H. DIRECT VIDEO EDITING: 3D FRAME TILT
    else if (lower.includes("tilt") || lower.includes("angle") || lower.includes("3d")) {
      if (lower.includes("reset") || lower.includes("flat") || lower.includes("zero") || lower.includes("0")) {
        get().updateLooks({ tiltX: 0, tiltY: 0, tiltAngle: 0 });
        reply = "✓ Reset 3D frame tilt to 0° (flat direct perspective).";
        actions = [{ label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" }];
      } else {
        get().updateLooks({ tiltX: 12, tiltY: -10, tiltAngle: 12 });
        reply = "✓ Applied cinematic 3D frame tilt (+12° pitch, -10° yaw) with Keynote perspective depth.";
        actions = [{ label: "Reset Tilt", actionKey: "reset_tilt" }];
      }
    }
    // I. DIRECT VIDEO EDITING: CANVAS BACKDROP & BACKGROUNDS
    else if (lower.includes("background") || lower.includes("backdrop")) {
      let bgValue = "linear-gradient(135deg, #090a0f 0%, #151821 100%)";
      let bgName = "Studio Obsidian";

      if (lower.includes("indigo") || lower.includes("blue") || lower.includes("dusk")) {
        bgValue = "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)";
        bgName = "Indigo Dusk";
      } else if (lower.includes("midnight") || lower.includes("dark")) {
        bgValue = "linear-gradient(135deg, #020617 0%, #0f172a 100%)";
        bgName = "Midnight Slate";
      } else if (lower.includes("sunset") || lower.includes("orange") || lower.includes("warm")) {
        bgValue = "linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #9a3412 100%)";
        bgName = "Sunset Amber";
      } else if (lower.includes("white") || lower.includes("clean") || lower.includes("light")) {
        bgValue = "#ffffff";
        bgName = "Studio Clean White";
      } else if (lower.includes("mint") || lower.includes("green") || lower.includes("emerald")) {
        bgValue = "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)";
        bgName = "Emerald Studio";
      }

      get().updateLooks({
        backgroundValue: bgValue,
        backgroundType: bgValue.startsWith("linear-gradient") || bgValue.startsWith("radial-gradient") ? "gradient" : "solid",
      });
      reply = `✓ Updated canvas backdrop to **${bgName}**.`;
      actions = [
        { label: "Switch to Obsidian", actionKey: "apply_rec_backdrop" },
        { label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" },
      ];
    }
    // J. DIRECT VIDEO EDITING: WINDOW FRAMING
    else if (lower.includes("frame") || lower.includes("window")) {
      if (lower.includes("terminal")) {
        get().updateLooks({ windowFrame: "terminal" });
        reply = "✓ Switched window frame to macOS Terminal style with traffic lights and studio title.";
      } else if (lower.includes("mac") || lower.includes("macos") || lower.includes("apple")) {
        get().updateLooks({ windowFrame: "macos" });
        reply = "✓ Switched window frame to classic macOS window styling.";
      } else if (lower.includes("none") || lower.includes("remove") || lower.includes("borderless")) {
        get().updateLooks({ windowFrame: "none" });
        reply = "✓ Removed window frame (frameless display).";
      } else {
        get().updateLooks({ windowFrame: "terminal" });
        reply = "✓ Applied modern terminal frame.";
      }
      actions = [{ label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" }];
    }
    // K. DIRECT VIDEO EDITING: CURSOR STYLING
    else if (lower.includes("cursor") || lower.includes("pointer")) {
      if (lower.includes("laser")) {
        get().updateLooks({ cursorStyle: "laser-dot" });
        reply = "✓ Updated cursor to Neon Laser Dot.";
      } else if (lower.includes("obsidian")) {
        get().updateLooks({ cursorStyle: "obsidian-glow" });
        reply = "✓ Updated cursor to Obsidian Glow pointer.";
      } else if (lower.includes("macos") || lower.includes("arrow")) {
        get().updateLooks({ cursorStyle: "mac" });
        reply = "✓ Updated cursor to macOS Arrow.";
      } else if (lower.includes("big") || lower.includes("large") || lower.includes("scale")) {
        get().updateLooks({ cursorSize: 1.8 });
        reply = "✓ Scaled cursor size to 1.8x for high social visibility.";
      } else {
        get().updateLooks({ cursorStyle: "laser-dot", cursorSize: 1.4 });
        reply = "✓ Applied laser dot pointer styling.";
      }
      actions = [{ label: "Auto-Plot Zooms", actionKey: "plot_zooms" }];
    }
    // L. DIRECT VIDEO EDITING: SOUND EFFECTS & AFX
    else if (lower.includes("audio") || lower.includes("sound") || lower.includes("sfx")) {
      if (lower.includes("off") || lower.includes("disable") || lower.includes("mute")) {
        get().updateAudioSettings({ clickSoundEnabled: false, typingSoundEnabled: false });
        reply = "✓ Disabled audio sound effects.";
        actions = [{ label: "Turn On Tactile SFX", actionKey: "apply_rec_sfx" }];
      } else {
        get().updateAudioSettings({ clickSoundEnabled: true, typingSoundEnabled: true, musicDuckingEnabled: true });
        reply = "✓ Enabled tactile click bops and mechanical typing sound effects with sidechain music ducking.";
        actions = [{ label: "Add Subtitle", actionKey: "add_subtitle" }];
      }
    }
    // M. DIRECT VIDEO EDITING: CAMERA ZOOMS & GLIDES
    else if (lower.includes("zoom") || lower.includes("plot") || lower.includes("click") || lower.includes("glide")) {
      if (lower.includes("clear") || lower.includes("remove") || lower.includes("delete") || lower.includes("reset")) {
        const curProj = get().project;
        if (curProj) {
          set({
            ...pushHistory(get()),
            project: { ...curProj, keyframes: [], zoomBlocks: [] },
          });
        }
        reply = "✓ Cleared all camera zoom keyframes. The video will play at full frame (1.0x).";
        actions = [{ label: "Auto-Plot Zooms", actionKey: "plot_zooms" }];
      } else {
        get().plotInteractions({ fallbackIfEmpty: true });
        reply = "✓ Auto-plotted camera zoom keyframes on recorded clicks and interactions with smooth easing glides.";
        actions = [
          { label: "Camera Shift Tour", actionKey: "tour_shift" },
          { label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" },
        ];
      }
    }
    // N. DIRECT VIDEO EDITING: SUBTITLES & TEXT
    else if (lower.includes("text") || lower.includes("caption") || lower.includes("subtitle")) {
      let customText = "";
      const matchQuotes = content.match(/["']([^"']+)["']/);
      if (matchQuotes && matchQuotes[1]) {
        customText = matchQuotes[1];
      } else {
        const matchAfter = content.match(/(?:subtitle|caption)\s+(?:saying\s+|that\s+says\s+)?(.+)/i);
        if (matchAfter && matchAfter[1]) {
          customText = matchAfter[1].trim();
        }
      }

      const textToInsert = customText || "Click and explore features";
      get().addTextOverlay(textToInsert);
      reply = `✓ Inserted compact subtitle: "${textToInsert}" at ${(get().currentTimeMs / 1000).toFixed(1)}s with glass styling.`;
      actions = [
        { label: "AI Recommendations", actionKey: "get_recommendations" },
        { label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" },
      ];
    }
    // O. TOUR / WALKTHROUGH
    else if (lower.includes("tour") || lower.includes("walkthrough") || lower.includes("shift")) {
      get().createTourCameraShift();
      reply = "✓ Created a cinematic Camera Shift Tour gliding smoothly across all UI interaction hotspots.";
      actions = [
        { label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" },
        { label: "Add Subtitle", actionKey: "add_subtitle" },
      ];
    }
    // P. CHAPTERS & HEADINGS
    else if (lower.includes("title") || lower.includes("chapter")) {
      get().addTextOverlay("Chapter: Key Feature Demonstration");
      reply = "✓ Applied chapter highlight card at current playhead position.";
      actions = [{ label: "Auto-Plot Zooms", actionKey: "plot_zooms" }];
    }
    // Q. GENERAL FALLBACK PROMPT
    else {
      reply =
        `I am your DomoLens AI Director. I can directly edit your video, describe its content, or audit improvements:\n\n` +
        `• **Ask to edit**: "change background to obsidian", "tilt frame 12 degrees", "add subtitle 'Check this out'", "turn on click sounds"\n` +
        `• **Ask to analyze**: "what is my app?", "describe my video", "give me recommendations"\n` +
        `• **Camera tools**: "plot zooms", "clear zooms", "camera shift tour"`;

      questions = [
        {
          id: "app_category",
          prompt: "What kind of application are you showcasing?",
          options: [
            { label: "💻 Developer CLI / Terminal", value: "app_type:cli" },
            { label: "🌐 Modern SaaS Web App", value: "app_type:saas" },
            { label: "📱 Mobile / Desktop App", value: "app_type:mobile" },
            { label: "🎨 Creative & Indie Tool", value: "app_type:creative" },
          ],
        },
      ];

      actions = [
        { label: "What is my App?", actionKey: "analyze_app" },
        { label: "AI Recommendations", actionKey: "get_recommendations" },
        { label: "Apply 3D Tilt (+12°)", actionKey: "apply_rec_tilt" },
        { label: "Auto-Plot Zooms", actionKey: "plot_zooms" },
      ];
    }

    const aiMsg: LlmMessage = {
      id: `ai-${Date.now()}`,
      role: "assistant",
      content: reply,
      timestamp: Date.now(),
      actions,
      questions,
    };

    set((s) => ({
      llmMessages: [...s.llmMessages, aiMsg],
      isLlmThinking: false,
    }));
  },

  executeLlmAction: (actionKey: string) => {
    const state = get();
    if (actionKey === "plot_zooms" || actionKey === "apply_rec_zooms") {
      state.plotInteractions({ fallbackIfEmpty: true });
      toast.success("Auto-plotted camera zooms!");
    } else if (actionKey === "clear_zooms") {
      const curProj = state.project;
      if (curProj) {
        set({
          ...pushHistory(state),
          project: { ...curProj, keyframes: [], zoomBlocks: [] },
        });
        toast.info("Cleared all camera zooms (full frame 1.0x)");
      }
    } else if (actionKey === "tour_shift") {
      state.createTourCameraShift();
      toast.success("Created Camera Shift Tour!");
    } else if (actionKey === "apply_rec_tilt") {
      state.updateLooks({ tiltX: 12, tiltY: -10, tiltAngle: 12 });
      toast.success("Applied 3D frame tilt (+12° / -10°)!");
    } else if (actionKey === "reset_tilt") {
      state.updateLooks({ tiltX: 0, tiltY: 0, tiltAngle: 0 });
      toast.success("Reset 3D frame tilt to 0°");
    } else if (actionKey === "apply_rec_backdrop") {
      state.updateLooks({
        backgroundValue: "linear-gradient(135deg, #090a0f 0%, #151821 100%)",
        backgroundType: "gradient",
      });
      toast.success("Applied Studio Obsidian backdrop!");
    } else if (actionKey === "apply_backdrop_indigo") {
      state.updateLooks({
        backgroundValue: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        backgroundType: "gradient",
      });
      toast.success("Applied Indigo Dusk backdrop!");
    } else if (actionKey === "apply_backdrop_sunset") {
      state.updateLooks({
        backgroundValue: "linear-gradient(135deg, #451a03 0%, #7c2d12 50%, #9a3412 100%)",
        backgroundType: "gradient",
      });
      toast.success("Applied Sunset Amber backdrop!");
    } else if (actionKey === "apply_backdrop_white") {
      state.updateLooks({
        backgroundValue: "#ffffff",
        backgroundType: "solid",
      });
      toast.success("Applied Studio Clean White backdrop!");
    } else if (actionKey === "apply_backdrop_emerald") {
      state.updateLooks({
        backgroundValue: "linear-gradient(135deg, #022c22 0%, #064e3b 50%, #047857 100%)",
        backgroundType: "gradient",
      });
      toast.success("Applied Emerald Studio backdrop!");
    } else if (actionKey === "apply_frame_terminal") {
      state.updateLooks({ windowFrame: "terminal" });
      toast.success("Applied macOS Terminal window frame!");
    } else if (actionKey === "apply_frame_macos") {
      state.updateLooks({ windowFrame: "macos" });
      toast.success("Applied macOS window frame!");
    } else if (actionKey === "apply_frame_none") {
      state.updateLooks({ windowFrame: "none" });
      toast.success("Removed window frame (frameless)!");
    } else if (actionKey === "apply_cursor_laser") {
      state.updateLooks({ cursorStyle: "laser-dot" });
      toast.success("Set cursor to Neon Laser Dot!");
    } else if (actionKey === "apply_cursor_obsidian") {
      state.updateLooks({ cursorStyle: "obsidian-glow" });
      toast.success("Set cursor to Obsidian Glow!");
    } else if (actionKey === "apply_cursor_macos") {
      state.updateLooks({ cursorStyle: "mac" });
      toast.success("Set cursor to macOS Arrow!");
    } else if (actionKey === "apply_cursor_scale_up") {
      state.updateLooks({ cursorSize: 1.8 });
      toast.success("Scaled cursor size to 1.8x!");
    } else if (actionKey === "apply_rec_sfx") {
      state.updateAudioSettings({ clickSoundEnabled: true, typingSoundEnabled: true, musicDuckingEnabled: true });
      toast.success("Tactile SFX and music ducking enabled!");
    } else if (actionKey === "mute_sfx") {
      state.updateAudioSettings({ clickSoundEnabled: false, typingSoundEnabled: false });
      toast.info("Muted acoustic sound effects");
    } else if (actionKey === "apply_developer_style") {
      state.updateLooks({
        windowFrame: "terminal",
        backgroundValue: "linear-gradient(135deg, #090a0f 0%, #151821 100%)",
        backgroundType: "gradient",
        cursorStyle: "laser-dot",
        cursorSize: 1.4,
        tiltX: 0,
        tiltY: 0,
        tiltAngle: 0,
      });
      state.updateAudioSettings({
        clickSoundEnabled: true,
        typingSoundEnabled: true,
        musicDuckingEnabled: true,
      });
      toast.success("Applied Developer CLI showcase preset!");
    } else if (actionKey === "apply_saas_style") {
      state.updateLooks({
        windowFrame: "macos",
        backgroundValue: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        backgroundType: "gradient",
        cursorStyle: "mac",
        cursorSize: 1.2,
        tiltX: 12,
        tiltY: -10,
        tiltAngle: 12,
      });
      state.updateAudioSettings({
        clickSoundEnabled: true,
        typingSoundEnabled: true,
        musicDuckingEnabled: true,
      });
      toast.success("Applied Modern SaaS showcase preset!");
    } else if (actionKey === "apply_mobile_style") {
      state.updateLooks({
        windowFrame: "none",
        backgroundValue: "linear-gradient(135deg, #020617 0%, #0f172a 100%)",
        backgroundType: "gradient",
        cursorStyle: "laser-dot",
        cursorSize: 1.8,
        tiltX: 6,
        tiltY: 0,
        tiltAngle: 6,
      });
      toast.success("Applied Mobile showcase preset!");
    } else if (actionKey === "suggest_chapters") {
      state.addTextOverlay("Chapter: Key Interaction");
      toast.success("Applied chapter highlight card!");
    } else if (actionKey === "add_subtitle") {
      state.addTextOverlay("Click here to proceed");
      toast.success("Inserted subtitle at playhead!");
    } else if (actionKey === "auto_afx") {
      state.autoAfx();
      toast.success("Synchronized tactile sound effects!");
    } else if (actionKey === "describe_video") {
      void state.sendLlmMessage("Describe my video");
    } else if (actionKey === "get_recommendations") {
      void state.sendLlmMessage("Give me recommendations to improve this video");
    } else if (actionKey === "analyze_app") {
      void state.sendLlmMessage("What is my app?");
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
