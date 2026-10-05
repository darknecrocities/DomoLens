import { create } from "zustand";
import {
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_LOOKS,
  clampCameraToBounds,
  detectActivityEventsFromFrames,
  insertKeyframe,
  insertVideoEffect,
  plotInteractionsToKeyframesAndZoomBlocks,
  removeClipAndRipple,
  removeKeyframe,
  removeVideoEffect,
  splitClip,
  splitZoomBlock,
  updateVideoEffect,
  type AudioTrack,
  type ClickEvent,
  type ClickSoundPreset,
  type InteractionEvent,
  type KeyframeNode,
  type OpticalAnalysisOptions,
  type ProjectAudioSettings,
  type ProjectData,
  type ProjectLooks,
  type TextOverlay,
  type TimelineClip,
  type TypingSoundPreset,
  type VideoEffect,
  type VideoEffectType,
  type ZoomBlock,
} from "@domolens/core";
import { sfx } from "../lib/sound-effects";
import { useProjects } from "./projects";
import { toast } from "./toast";


export type ToolTab =
  | "zoom"
  | "effects"
  | "text"
  | "audio"
  | "looks"
  | "cursor"
  | "export";

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

interface EditorState {
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

  selectBlock: (id: string | null) => void;
  selectClip: (id: string | null) => void;
  selectKeyframe: (id: string | null) => void;
  selectEffect: (id: string | null) => void;
  selectText: (id: string | null) => void;
  selectAudio: (id: string | null) => void;

  // Interaction auto-plotting (translates recorded click/typing data into 2-3s zoom loops with keyframes)
  plotInteractions: (options?: {
    holdDurationMs?: number;
    scale?: number;
    continuousGlide?: boolean;
    maxGlideGapMs?: number;
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
  playClickSoundPreview: (preset?: ClickSoundPreset) => void;
  playTypingSoundPreview: (preset?: TypingSoundPreset) => void;


  updateLooks: (updates: Partial<ProjectLooks>) => void;
  splitAtCurrentTime: () => void;
  deleteSelected: () => void;

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
    content: "Hi! I'm your DomoLens AI Director. I can automatically detect button clicks & typing to plot seamless 2-3s zooms, suggest titles, add music beats, or refine keyframes.",
    timestamp: Date.now(),
    actions: [
      { label: "Auto-Plot Zooms", actionKey: "plot_zooms" },
      { label: "Suggest Title & Chapters", actionKey: "suggest_chapters" },
      { label: "Add Subtitle at Playhead", actionKey: "add_subtitle" },
      { label: "Add Lo-Fi Music", actionKey: "add_lofi_music" },
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

  isLeftSidebarOpen: true,
  isRightSidebarOpen: true,

  llmMessages: INITIAL_LLM_MESSAGES,
  isLlmThinking: false,

  history: [],
  future: [],

  loadProject: async (id: string) => {
    // 1. Check session storage for full project data
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem(`domolens_project_${id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as ProjectData;
          if (!parsed.audioSettings) {
            parsed.audioSettings = { ...DEFAULT_AUDIO_SETTINGS };
          }
          if (!parsed.effects) {
            parsed.effects = [];
          }
          set({
            project: parsed,
            currentTimeMs: 0,
            durationMs: parsed.summary.durationMs || 10000,
            selectedBlockId: parsed.zoomBlocks[0]?.id || null,
            selectedKeyframeId: null,
            selectedEffectId: null,
            history: [],
            future: [],
          });
          return true;
        } catch {
          // Fall through
        }
      }
    }

    // 2. Fall back to useProjects summary
    const summary = useProjects.getState().projects.find((p) => p.id === id);
    if (!summary) return false;

    const duration = summary.durationMs || 12000;
    // Generate starter interactions
    const starterClicks: ClickEvent[] = [
      { id: "c-1", timestampMs: Math.round(duration * 0.22), x: 0.35, y: 0.45, button: "left" },
      { id: "c-2", timestampMs: Math.round(duration * 0.62), x: 0.65, y: 0.55, button: "left" },
    ];
    const starterInteractions: InteractionEvent[] = [
      { id: "c-1", type: "click", timestampMs: Math.round(duration * 0.22), x: 0.35, y: 0.45, button: "left" },
      { id: "c-2", type: "typing", timestampMs: Math.round(duration * 0.62), x: 0.65, y: 0.55, snippet: "DomoLens" },
    ];

    const { keyframes, zoomBlocks } = plotInteractionsToKeyframesAndZoomBlocks(
      starterInteractions,
      duration,
      { holdDurationMs: 1000, leadInMs: 500, scale: 1.85 },
    );

    const starterTrajectory = [
      { timestampMs: 0, x: 0.5, y: 0.5 },
      { timestampMs: Math.round(duration * 0.12), x: 0.42, y: 0.48 },
      { timestampMs: Math.round(duration * 0.22), x: 0.35, y: 0.45 },
      { timestampMs: Math.round(duration * 0.38), x: 0.38, y: 0.46 },
      { timestampMs: Math.round(duration * 0.48), x: 0.52, y: 0.50 },
      { timestampMs: Math.round(duration * 0.62), x: 0.65, y: 0.55 },
      { timestampMs: Math.round(duration * 0.76), x: 0.68, y: 0.54 },
      { timestampMs: duration, x: 0.5, y: 0.5 },
    ];

    const projectData: ProjectData = {
      summary,
      clicks: starterClicks,
      interactions: starterInteractions,
      cursorTrajectory: starterTrajectory,
      zoomBlocks,
      keyframes,
      textOverlays: [
        {
          id: "txt-welcome",
          text: "Auto-zoom Screen Demo",
          startTimeMs: 300,
          durationMs: 2800,
          x: 0.5,
          y: 0.12,
          fontSize: 20,
          color: "#ffffff",
          bgColor: "rgba(15, 17, 23, 0.85)",
        },
      ],
      audioTracks: [
        {
          id: "audio-default-lofi",
          name: "Ambient Lo-Fi Beats",
          type: "music",
          url: "sample://lofi-chill.mp3",
          startTimeMs: 0,
          durationMs: duration,
          volume: 0.4,
          muted: false,
        },
      ],
      clips: [
        {
          id: `clip-${id}-1`,
          name: summary.name,
          mediaUrl: summary.media || "",
          timelineStartMs: 0,
          durationMs: duration,
          sourceOffsetMs: 0,
          muted: false,
          volume: 1,
        },
      ],
      looks: DEFAULT_LOOKS,
      audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
    };

    set({
      project: projectData,
      currentTimeMs: 0,
      durationMs: duration,
      selectedBlockId: zoomBlocks[0]?.id || null,
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

    // Filter out clicks or interactions that are within 400ms of recording end (stop artifacts)
    const cutoff = Math.max(0, state.durationMs - 400);
    const validInteractions = interactions.filter((i) => i.timestampMs <= cutoff);
    const validClicks = clicks.filter((c) => c.timestampMs <= cutoff);

    let eventsToUse: InteractionEvent[] =
      validInteractions.length > 0
        ? validInteractions
        : validClicks.map((c) => ({
            id: c.id,
            type: "click" as const,
            timestampMs: c.timestampMs,
            x: c.x,
            y: c.y,
            button: c.button,
          }));

    let isFallback = false;
    const isOldDummy =
      eventsToUse.length === 2 &&
      Boolean(eventsToUse[0]?.id?.startsWith("c-auto-")) &&
      Boolean(eventsToUse[1]?.id?.startsWith("c-auto-"));

    if (eventsToUse.length === 0 || isOldDummy) {
      isFallback = true;
      const dur = state.durationMs || 10000;
      const stepMs = Math.max(2800, Math.min(4500, Math.round(dur / 9)));
      const focalPoints = [
        { x: 0.50, y: 0.38, type: "typing" as const },
        { x: 0.36, y: 0.44, type: "click" as const },
        { x: 0.58, y: 0.46, type: "click" as const },
        { x: 0.42, y: 0.54, type: "typing" as const },
        { x: 0.62, y: 0.40, type: "click" as const },
        { x: 0.38, y: 0.62, type: "click" as const },
        { x: 0.52, y: 0.42, type: "typing" as const },
      ];
      const autoEvents: InteractionEvent[] = [];
      let fpIdx = 0;
      for (let t = 2000; t < dur - 1200; t += stepMs) {
        const fp = focalPoints[fpIdx % focalPoints.length]!;
        fpIdx++;
        autoEvents.push({
          id: `act-auto-${t}`,
          type: fp.type,
          timestampMs: t,
          x: fp.x,
          y: fp.y,
          button: "left",
          ...(fp.type === "typing" ? { snippet: "Input", durationMs: 1200 } : {}),
        });
      }
      if (autoEvents.length > 0) {
        eventsToUse = autoEvents;
      }
    }

    const { keyframes, zoomBlocks } = plotInteractionsToKeyframesAndZoomBlocks(
      eventsToUse,
      state.durationMs,
      {
        continuousGlide: true,
        maxGlideGapMs: 3500,
        leadInMs: 500,
        holdDurationMs: 1000,
        scale: 1.85,
        ...options,
      },
    );

    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        clicks: isFallback
          ? eventsToUse.map((e) => ({ id: e.id, timestampMs: e.timestampMs, x: e.x, y: e.y, button: "left" as const }))
          : state.project.clicks,
        interactions: isFallback ? eventsToUse : state.project.interactions,
        keyframes,
        zoomBlocks,
      },
      selectedBlockId: zoomBlocks[0]?.id ?? null,
    });
    toast.success(
      isFallback
        ? `Auto-generated ${zoomBlocks.length} zooms and ${keyframes.length} keyframes across timeline!`
        : `Plotted ${zoomBlocks.length} zooms and ${keyframes.length} keyframes!`,
    );
  },

  shiftCameraTarget: (targetX, targetY, options) => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;
    const activeScale = options?.scale ?? 1.85;
    const clamped = clampCameraToBounds(targetX, targetY, activeScale);

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

      let updatedKfs = state.project.keyframes ? [...state.project.keyframes] : [];
      const nearbyKf = updatedKfs.find((k) => Math.abs(k.timeMs - time) <= 150);
      let selectedKfId: string;
      if (nearbyKf) {
        updatedKfs = updatedKfs.map((k) =>
          k.id === nearbyKf.id ? { ...k, targetX: clamped.x, targetY: clamped.y } : k,
        );
        selectedKfId = nearbyKf.id;
      } else {
        const newKf: KeyframeNode = {
          id: `kf-shift-${Date.now()}`,
          timeMs: time,
          scale: activeBlock.scale,
          targetX: clamped.x,
          targetY: clamped.y,
          easing: "spring",
        };
        updatedKfs.push(newKf);
        updatedKfs.sort((a, b) => a.timeMs - b.timeMs);
        selectedKfId = newKf.id;
      }

      set({
        ...pushHistory(state),
        project: {
          ...state.project,
          zoomBlocks: updatedBlocks,
          keyframes: updatedKfs,
        },
        selectedKeyframeId: selectedKfId,
        selectedBlockId: activeBlock.id,
      });
      toast.info(`Camera shifted to (${Math.round(clamped.x * 100)}%, ${Math.round(clamped.y * 100)}%)`);
      return;
    }

    // Case 4: Create new focal keyframe and zoom block at playhead
    const newKf: KeyframeNode = {
      id: `kf-shift-${Date.now()}`,
      timeMs: time,
      scale: activeScale,
      targetX: clamped.x,
      targetY: clamped.y,
      easing: "cubic",
    };
    const newBlock: ZoomBlock = {
      id: `zoom-${Date.now()}`,
      startTimeMs: time,
      endTimeMs: Math.min(state.durationMs, time + 2500),
      targetX: clamped.x,
      targetY: clamped.y,
      scale: activeScale,
      enabled: true,
    };

    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        keyframes: [...(state.project.keyframes || []), newKf].sort((a, b) => a.timeMs - b.timeMs),
        zoomBlocks: [...state.project.zoomBlocks, newBlock].sort((a, b) => a.startTimeMs - b.startTimeMs),
      },
      selectedKeyframeId: newKf.id,
      selectedBlockId: newBlock.id,
    });
    toast.success(`Focal zoom created at (${Math.round(clamped.x * 100)}%, ${Math.round(clamped.y * 100)}%)`);
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
      { continuousGlide: true, holdDurationMs: 2400, scale: 1.85 },
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
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        zoomBlocks: state.project.zoomBlocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      },
    });
  },

  toggleZoomBlock: (id) => {
    const state = get();
    if (!state.project) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        zoomBlocks: state.project.zoomBlocks.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b)),
      },
    });
  },

  deleteZoomBlock: (id) => {
    const state = get();
    if (!state.project) return;
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        zoomBlocks: state.project.zoomBlocks.filter((b) => b.id !== id),
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
      },
      selectedBlockId: null,
    });
    toast.info("Cleared all zoom blocks.");
  },

  addZoomBlockAtCurrentTime: () => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;
    const newBlock: ZoomBlock = {
      id: `zoom-${Date.now()}`,
      startTimeMs: time,
      endTimeMs: Math.min(state.durationMs, time + 2500),
      targetX: 0.5,
      targetY: 0.5,
      scale: 1.8,
      enabled: true,
    };
    set({
      ...pushHistory(state),
      project: {
        ...state.project,
        zoomBlocks: [...state.project.zoomBlocks, newBlock].sort((a, b) => a.startTimeMs - b.startTimeMs),
      },
      selectedBlockId: newBlock.id,
    });
    toast.success("Zoom block added.");
  },

  addKeyframeAtCurrentTime: (
    scale = 1.8,
    targetX = 0.5,
    targetY = 0.5,
    effect?: VideoEffectType,
    effectIntensity?: number,
  ) => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;
    const newKf: KeyframeNode = {
      id: `kf-${Date.now()}`,
      timeMs: time,
      scale,
      targetX,
      targetY,
      easing: "cubic",
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

  playClickSoundPreview: (preset) => {
    const state = get();
    const settings = state.project?.audioSettings || DEFAULT_AUDIO_SETTINGS;
    sfx.playClickBop(preset || settings.clickSoundPreset, settings.clickSoundVolume);
  },

  playTypingSoundPreview: (preset) => {
    const state = get();
    const settings = state.project?.audioSettings || DEFAULT_AUDIO_SETTINGS;
    sfx.playTypingBurst(5, 90, preset || settings.typingSoundPreset, settings.typingSoundVolume);
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

  splitAtCurrentTime: () => {
    const state = get();
    if (!state.project) return;
    const time = state.currentTimeMs;

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
      set({
        ...pushHistory(state),
        project: {
          ...state.project,
          clips: removeClipAndRipple(state.project.clips, state.selectedClipId),
        },
        selectedClipId: null,
      });
      toast.info("Clip deleted.");
    }
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

    if (lower.includes("zoom") || lower.includes("plot") || lower.includes("click") || lower.includes("type")) {
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
    } else if (lower.includes("music") || lower.includes("audio") || lower.includes("sound")) {
      reply = "Adding a soft Lo-Fi background track gives your tutorial video a polished, engaging studio feel.";
      actions = [{ label: "Add Lo-Fi Beat", actionKey: "add_lofi_music" }];
    } else {
      reply = `Got it! I can help you adjust zooms, keyframes, captions, or styling for "${state.project?.summary.name || "your video"}". What would you like to tweak next?`;
      actions = [
        { label: "Auto-Plot Zooms", actionKey: "plot_zooms" },
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
      state.plotInteractions();
    } else if (actionKey === "suggest_chapters") {
      if (state.project) {
        state.addTextOverlay("Chapter: Key Interaction");
        toast.success("Applied chapters and title highlights!");
      }
    } else if (actionKey === "add_subtitle") {
      state.addTextOverlay("Click here to proceed");
    } else if (actionKey === "add_lofi_music") {
      state.addAudioTrack("Smooth Lo-Fi Chill", "sample://lofi-chill.mp3", "music");
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
