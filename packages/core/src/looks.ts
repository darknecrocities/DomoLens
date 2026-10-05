import type { ProjectLooks } from "./project";

export interface BackgroundPreset {
  id: string;
  name: string;
  type: ProjectLooks["backgroundType"];
  value: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "charcoal-gradient",
    name: "Charcoal Slate",
    type: "gradient",
    value: "linear-gradient(135deg, #2a2d33 0%, #16171a 100%)",
  },
  {
    id: "orange-glow",
    name: "Warm Ember",
    type: "gradient",
    value: "linear-gradient(135deg, #ff7a1a 0%, #1e2024 70%)",
  },
  {
    id: "midnight",
    name: "Midnight",
    type: "gradient",
    value: "linear-gradient(135deg, #1e2330 0%, #0f1012 100%)",
  },
  {
    id: "sunset",
    name: "Sunset",
    type: "gradient",
    value: "linear-gradient(135deg, #ff8f3d 0%, #ff5252 50%, #2a2d33 100%)",
  },
  {
    id: "aurora",
    name: "Aurora",
    type: "gradient",
    value: "linear-gradient(135deg, #1b3837 0%, #182236 100%)",
  },
  {
    id: "solid-dark",
    name: "Pure Dark",
    type: "solid",
    value: "#0f1012",
  },
  {
    id: "solid-charcoal",
    name: "Deep Charcoal",
    type: "solid",
    value: "#16171a",
  },
  {
    id: "solid-gray",
    name: "Studio Gray",
    type: "solid",
    value: "#2a2d33",
  },
];

export const SHADOW_PRESETS: Array<{ id: ProjectLooks["shadow"]; name: string; css: string }> = [
  { id: "none", name: "None", css: "none" },
  { id: "soft", name: "Soft", css: "0 12px 32px -16px rgb(0 0 0 / 0.7)" },
  { id: "lift", name: "Lift", css: "0 24px 60px -24px rgb(0 0 0 / 0.8)" },
  { id: "glow", name: "Glow", css: "0 10px 36px -10px rgb(255 122 26 / 0.55)" },
];

export const CURSOR_PRESETS: Array<{ id: ProjectLooks["cursorStyle"]; name: string }> = [
  { id: "hidden", name: "Hidden (Native Video)" },
  { id: "default", name: "Default Pointer" },
  { id: "mac", name: "macOS Arrow" },
  { id: "dot", name: "Minimal Dot" },
  { id: "ring", name: "Target Ring" },
];
