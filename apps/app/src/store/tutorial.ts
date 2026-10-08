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
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "auto-zoom",
    targetKey: "auto-zoom",
    title: "Intelligent Auto-Zoom",
    badge: "Smart Tracking",
    description:
      "Click Auto Zoom to automatically scan your recording for clicks and typing bursts. DomoLens generates organic camera zooms that glide directly to the action and smoothly ease back out.",
    padding: 8,
    borderRadius: 12,
  },
  {
    id: "canvas-player",
    targetKey: "canvas-player",
    title: "Interactive Video Canvas",
    badge: "Camera Framing",
    description:
      "Preview your recording in real-time. Click anywhere on the video preview during playback or pause to dynamically nudge and re-center camera focus onto any element.",
    padding: 12,
    borderRadius: 16,
  },
  {
    id: "timeline-tracks",
    targetKey: "timeline-tracks",
    title: "Multi-Track Timeline",
    badge: "Precision Editing",
    description:
      "Scrub the playhead to pinpoint exact moments. Split clips with (S) or drop custom keyframe diamonds with (K) to tailor zoom depth, holds, and pans.",
    padding: 10,
    borderRadius: 14,
  },
  {
    id: "tools-panel",
    targetKey: "tools-panel",
    title: "Custom Canvas & Tactile SFX",
    badge: "Full Customization",
    description:
      "Customize canvas gradients, paddings, shadows, and cursor styles. Enable crisp mechanical keyboard typing sounds and tactile click bops in the Audio tab.",
    padding: 10,
    borderRadius: 14,
  },
  {
    id: "export-button",
    targetKey: "export-button",
    title: "Instant Offline Export",
    badge: "Ready to Share",
    description:
      "Render your video in crisp 1080p, 4K, or animated GIF with zero cloud queues, subscriptions, or watermarks. Everything processes 100% locally on your machine.",
    padding: 8,
    borderRadius: 12,
  },
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
