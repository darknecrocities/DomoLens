import { create } from "zustand";
import { sfx } from "../lib/sound-effects";

export interface TutorialStep {
  id: string;
  targetKey: string;
  title: string;
  description: string;
  badge: string;
  padding?: number;
  borderRadius?: number;
  tab?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { id: "templates-button", targetKey: "templates-button", title: "Motion Templates", badge: "Tour", description:
    "Browse ready-made motion templates. One click applies camera moves, text cards and looks together.", padding: 8, borderRadius: 12 },
  { id: "ai-director", targetKey: "ai-director", title: "AI Director", badge: "Tour", description:
    "Open the AI Director panel to describe an edit in plain words and let it plot zooms and effects for you.", padding: 8, borderRadius: 12 },
  { id: "tools-toggle", targetKey: "tools-toggle", title: "Tools Panel Toggle", badge: "Tour", description:
    "Show or hide the Tools & Effects panel to give the canvas more room.", padding: 8, borderRadius: 12 },
  { id: "canvas-player", targetKey: "canvas-player", title: "Video Canvas", badge: "Tour", description:
    "Live preview with your cursor, background and text cards. Click the video to move the camera focus.", padding: 8, borderRadius: 12 },
  { id: "tl-select", targetKey: "tl-select", title: "Select Tool (V)", badge: "Tour", description:
    "Pick and drag clips, keyframes, SFX and text blocks on the timeline.", padding: 8, borderRadius: 12 },
  { id: "tl-razor", targetKey: "tl-razor", title: "Split Tool (C)", badge: "Tour", description:
    "Click a track to cut it at the playhead.", padding: 8, borderRadius: 12 },
  { id: "tl-pan", targetKey: "tl-pan", title: "Hand Tool (H)", badge: "Tour", description:
    "Drag to pan across a zoomed-in timeline.", padding: 8, borderRadius: 12 },
  { id: "timeline-trim-tools", targetKey: "timeline-trim-tools", title: "Trim Left / Right", badge: "Tour", description:
    "Trim the start or end of the clip to the playhead with Q and W.", padding: 8, borderRadius: 12 },
  { id: "auto-zoom", targetKey: "auto-zoom", title: "Auto Zoom", badge: "Tour", description:
    "Scans clicks and typing and plots smooth camera zooms for you.", padding: 8, borderRadius: 12 },
  { id: "tl-auto-afx", targetKey: "tl-auto-afx", title: "Auto SFX", badge: "Tour", description:
    "Adds tactile click and typing sounds in sync with your recording.", padding: 8, borderRadius: 12 },
  { id: "tl-split", targetKey: "tl-split", title: "Split Clip (S)", badge: "Tour", description:
    "Cut the clip into two at the playhead.", padding: 8, borderRadius: 12 },
  { id: "tl-add-keyframe", targetKey: "tl-add-keyframe", title: "Add Keyframe (K)", badge: "Tour", description:
    "Drop a keyframe to control zoom depth, easing and pan.", padding: 8, borderRadius: 12 },
  { id: "tl-add-effect", targetKey: "tl-add-effect", title: "Add Effect", badge: "Tour", description:
    "Insert spotlight, blur, vignette, glow or filter effects at the playhead.", padding: 8, borderRadius: 12 },
  { id: "tl-add-text", targetKey: "tl-add-text", title: "Add Text", badge: "Tour", description:
    "Create a text card at the playhead. Double-click it on the Text row to edit inline.", padding: 8, borderRadius: 12 },
  { id: "tl-add-zoom", targetKey: "tl-add-zoom", title: "Add Zoom Block", badge: "Tour", description:
    "Create a manual zoom block over a time range.", padding: 8, borderRadius: 12 },
  { id: "timeline-sfx-lane", targetKey: "timeline-sfx-lane", title: "SFX Track", badge: "Tour", description:
    "Own row below keyframes: add and drag sound effects without disturbing zooms.", padding: 8, borderRadius: 12 },
  { id: "timeline-text-lane", targetKey: "timeline-text-lane", title: "Text Track", badge: "Tour", description:
    "Text cards live here. Double-click one to type directly in the timeline.", padding: 8, borderRadius: 12 },
  { id: "tab-zoom", targetKey: "tab-zoom", title: "Zoom Tab", badge: "Tour", description:
    "Tune scale, easing and focal point for the selected zoom or keyframe.", tab: "zoom", padding: 8, borderRadius: 12 },
  { id: "tab-effects", targetKey: "tab-effects", title: "Effects Tab", badge: "Tour", description:
    "Configure the spotlight, blur, vignette and glow effects.", tab: "effects", padding: 8, borderRadius: 12 },
  { id: "tab-text", targetKey: "tab-text", title: "Text Tab", badge: "Tour", description:
    "Choose kinetic animations: elastic pop, whip slide, blur reveal and fade.", tab: "text", padding: 8, borderRadius: 12 },
  { id: "tab-audio", targetKey: "tab-audio", title: "Audio Tab", badge: "Tour", description:
    "Manage mechanical typing, click bops and SFX volume.", tab: "audio", padding: 8, borderRadius: 12 },
  { id: "tab-looks", targetKey: "tab-looks", title: "Canvas Tab", badge: "Tour", description:
    "32 backgrounds: gradients, glass, monochrome, beige, white and more. All appear in export.", tab: "looks", padding: 8, borderRadius: 12 },
  { id: "tab-cursor", targetKey: "tab-cursor", title: "Cursor Tab", badge: "Tour", description:
    "Pick from 23 tracked cursor styles, resize them and add a user avatar.", tab: "cursor", padding: 8, borderRadius: 12 },
  { id: "tools-collapse", targetKey: "tools-collapse", title: "Collapse Panel", badge: "Tour", description:
    "Collapse the tools panel when you need more canvas space.", padding: 8, borderRadius: 12 },
  { id: "export-button", targetKey: "export-button", title: "Export", badge: "Tour", description:
    "Render offline in 1080p, 4K or GIF with no watermark.", padding: 8, borderRadius: 12 },
];

const STORAGE_KEY = "domolens_tutorial_seen";

interface TutorialState {
  isActive: boolean;
  currentStepIndex: number;
  hasSeenTutorial: boolean;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  resetTutorial: () => void;
}

export const useTutorial = create<TutorialState>((set, get) => ({
  isActive: false,
  currentStepIndex: 0,
  hasSeenTutorial:
    typeof localStorage !== "undefined"
      ? localStorage.getItem(STORAGE_KEY) === "true"
      : false,

  startTutorial: () => {
    sfx.playClickBop("bop", 0.5);
    set({ isActive: true, currentStepIndex: 0 });
  },

  nextStep: () => {
    const { currentStepIndex } = get();
    sfx.playClickBop("bop", 0.45);
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      get().skipTutorial();
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    sfx.playClickBop("tap", 0.4);
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  skipTutorial: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    set({ isActive: false, hasSeenTutorial: true });
  },

  resetTutorial: () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({ hasSeenTutorial: false });
    get().startTutorial();
  },
}));
