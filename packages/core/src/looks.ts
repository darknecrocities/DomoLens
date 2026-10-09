import type { CursorStyle, ProjectLooks } from "./project";

/**
 * Aesthetic categories covering the 10 core design archetypes.
 */
export type BackgroundCategory =
  | "linear-gradient"
  | "radial-gradient"
  | "single-tone"
  | "two-tone"
  | "three-tone"
  | "frosted-glass"
  | "monochrome"
  | "warm-beige"
  | "studio-white"
  | "dark-obsidian"
  // Aliases for UI flexibility and backward compatibility
  | "glassmorphism"
  | "obsidian"
  | "gradient-linear"
  | "gradient-radial";

export interface BackgroundPreset {
  id: string;
  name: string;
  category: BackgroundCategory;
  type: ProjectLooks["backgroundType"];
  value: string;
  description?: string;
}

export const BACKGROUND_CATEGORIES: Array<{ id: BackgroundCategory; label: string }> = [
  { id: "linear-gradient", label: "Linear Gradients" },
  { id: "radial-gradient", label: "Radial Gradients" },
  { id: "single-tone", label: "Single Tone" },
  { id: "two-tone", label: "Two-Tone" },
  { id: "three-tone", label: "Three-Tone" },
  { id: "frosted-glass", label: "Frosted Glass" },
  { id: "monochrome", label: "Monochrome" },
  { id: "warm-beige", label: "Warm Beige" },
  { id: "studio-white", label: "Studio White" },
  { id: "dark-obsidian", label: "Dark Obsidian" },
];

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // 1. Linear Gradients
  {
    id: "linear-indigo-dusk",
    name: "Indigo Dusk",
    category: "linear-gradient",
    type: "gradient",
    value: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)",
  },
  {
    id: "linear-sunset-glow",
    name: "Sunset Horizon",
    category: "linear-gradient",
    type: "gradient",
    value: "linear-gradient(135deg, #ff7a1a 0%, #dc2626 50%, #1e1b4b 100%)",
  },
  {
    id: "linear-emerald-flow",
    name: "Emerald Flow",
    category: "linear-gradient",
    type: "gradient",
    value: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%)",
  },
  {
    id: "orange-glow",
    name: "Warm Ember",
    category: "linear-gradient",
    type: "gradient",
    value: "linear-gradient(135deg, #ff7a1a 0%, #1e2024 70%)",
  },

  // 2. Radial Gradients
  {
    id: "radial-warm-ember",
    name: "Warm Ember Radial",
    category: "radial-gradient",
    type: "gradient",
    value: "radial-gradient(circle at 50% 50%, #ff7a1a 0%, #1e2024 70%)",
  },
  {
    id: "radial-spotlight-indigo",
    name: "Indigo Spotlight",
    category: "radial-gradient",
    type: "gradient",
    value: "radial-gradient(circle at 50% 30%, #4f46e5 0%, #09090b 75%)",
  },
  {
    id: "radial-cyan-bloom",
    name: "Cyan Bloom Radial",
    category: "radial-gradient",
    type: "gradient",
    value: "radial-gradient(circle at 50% 50%, #0891b2 0%, #020617 80%)",
  },
  {
    id: "radial-deep-space",
    name: "Deep Space Void",
    category: "radial-gradient",
    type: "gradient",
    value: "radial-gradient(circle at 50% 50%, #1e293b 0%, #020617 100%)",
  },

  // 3. Single Tone Solids
  {
    id: "solid-dark",
    name: "Pure Dark Solid",
    category: "single-tone",
    type: "solid",
    value: "#0f1012",
  },
  {
    id: "solid-charcoal",
    name: "Deep Charcoal Solid",
    category: "single-tone",
    type: "solid",
    value: "#16171a",
  },
  {
    id: "solid-gray",
    name: "Studio Gray Solid",
    category: "single-tone",
    type: "solid",
    value: "#2a2d33",
  },

  // 4. Two-Tone Gradients
  {
    id: "midnight",
    name: "Midnight Blue",
    category: "two-tone",
    type: "gradient",
    value: "linear-gradient(135deg, #1e2330 0%, #0f1012 100%)",
  },
  {
    id: "aurora",
    name: "Emerald Aurora",
    category: "two-tone",
    type: "gradient",
    value: "linear-gradient(135deg, #1b3837 0%, #182236 100%)",
  },
  {
    id: "two-tone-crimson-velvet",
    name: "Crimson Velvet",
    category: "two-tone",
    type: "gradient",
    value: "linear-gradient(135deg, #4c0519 0%, #0f172a 100%)",
  },

  // 5. Three-Tone Gradients
  {
    id: "sunset",
    name: "Sunset Radiance",
    category: "three-tone",
    type: "gradient",
    value: "linear-gradient(135deg, #ff8f3d 0%, #ff5252 50%, #2a2d33 100%)",
  },
  {
    id: "three-tone-cosmic-twilight",
    name: "Cosmic Twilight",
    category: "three-tone",
    type: "gradient",
    value: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #09090b 100%)",
  },
  {
    id: "three-tone-cyber-neon",
    name: "Cyberpunk Neon",
    category: "three-tone",
    type: "gradient",
    value: "linear-gradient(135deg, #4c1d95 0%, #be185d 50%, #09090b 100%)",
  },

  // 6. Frosted Glass / Glassmorphism
  {
    id: "frosted-quartz",
    name: "Frosted Quartz Glass",
    category: "frosted-glass",
    type: "gradient",
    value: "linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)",
  },
  {
    id: "frosted-aurora",
    name: "Frosted Aurora Sheen",
    category: "frosted-glass",
    type: "gradient",
    value: "linear-gradient(135deg, rgba(13, 40, 46, 0.8) 0%, rgba(22, 36, 56, 0.85) 50%, rgba(12, 21, 36, 0.95) 100%)",
  },
  {
    id: "frosted-obsidian",
    name: "Frosted Obsidian Tint",
    category: "frosted-glass",
    type: "gradient",
    value: "linear-gradient(135deg, rgba(31, 36, 45, 0.8) 0%, rgba(16, 18, 22, 0.95) 100%)",
  },

  // 7. Monochrome
  {
    id: "charcoal-gradient",
    name: "Charcoal Slate",
    category: "monochrome",
    type: "gradient",
    value: "linear-gradient(135deg, #2a2d33 0%, #16171a 100%)",
  },
  {
    id: "monochrome-zinc",
    name: "Zinc Monochrome",
    category: "monochrome",
    type: "gradient",
    value: "linear-gradient(135deg, #3f3f46 0%, #18181b 100%)",
  },
  {
    id: "monochrome-graphite",
    name: "Studio Graphite",
    category: "monochrome",
    type: "solid",
    value: "#18181b",
  },

  // 8. Warm Beige
  {
    id: "warm-editorial-beige",
    name: "Warm Editorial Beige",
    category: "warm-beige",
    type: "solid",
    value: "#f5f0eb",
  },
  {
    id: "warm-nordic-sand",
    name: "Nordic Sand",
    category: "warm-beige",
    type: "gradient",
    value: "linear-gradient(135deg, #fdfbf7 0%, #ede6db 100%)",
  },
  {
    id: "warm-linen-cream",
    name: "Linen Cream",
    category: "warm-beige",
    type: "gradient",
    value: "linear-gradient(135deg, #faf7f2 0%, #e8e0d5 100%)",
  },

  // 9. Crisp Studio White
  {
    id: "studio-crisp-white",
    name: "Crisp Studio White",
    category: "studio-white",
    type: "solid",
    value: "#ffffff",
  },
  {
    id: "studio-gallery-platinum",
    name: "Gallery Platinum",
    category: "studio-white",
    type: "gradient",
    value: "linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%)",
  },
  {
    id: "studio-keynote-silver",
    name: "Keynote Silver Bloom",
    category: "studio-white",
    type: "gradient",
    value: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)",
  },

  // 10. Dark Obsidian
  {
    id: "obsidian-metallic",
    name: "Obsidian Metallic",
    category: "dark-obsidian",
    type: "gradient",
    value: "linear-gradient(135deg, #18191c 0%, #0d0e11 50%, #141519 100%)",
  },
  {
    id: "obsidian-carbon",
    name: "Obsidian Carbon",
    category: "dark-obsidian",
    type: "gradient",
    value: "linear-gradient(180deg, #121316 0%, #08090a 100%)",
  },
  {
    id: "obsidian-deep-oled",
    name: "Deep OLED Black",
    category: "dark-obsidian",
    type: "solid",
    value: "#08080a",
  },
];

export function getBackgroundPresetsByCategory(category: BackgroundCategory): BackgroundPreset[] {
  return BACKGROUND_PRESETS.filter((p) => p.category === category);
}

export function isFrostedGlassBackground(value: string): boolean {
  if (!value) return false;
  return (
    value.includes("rgba(") ||
    BACKGROUND_PRESETS.some((p) => p.category === "frosted-glass" && p.value === value)
  );
}

export const SHADOW_PRESETS: Array<{ id: ProjectLooks["shadow"]; name: string; css: string }> = [
  { id: "none", name: "None", css: "none" },
  { id: "soft", name: "Soft", css: "0 12px 32px -16px rgb(0 0 0 / 0.7)" },
  { id: "lift", name: "Lift", css: "0 24px 60px -24px rgb(0 0 0 / 0.8)" },
  { id: "glow", name: "Glow", css: "0 10px 36px -10px rgb(255 122 26 / 0.55)" },
];

export type CursorPresetCategory =
  | "system"
  | "precision"
  | "glow"
  | "creative"
  | "tech"
  | "presentation"
  | "utility";

export interface CursorPreset {
  id: CursorStyle;
  name: string;
  category: CursorPresetCategory;
  description: string;
  /** Hotspot anchor coordinate in local coordinate space [x, y]. */
  hotspot: [number, number];
}

export const CURSOR_PRESETS: CursorPreset[] = [
  // Utility
  {
    id: "hidden",
    name: "Hidden (Native Video)",
    category: "utility",
    description: "Preserves native recorded cursor without artificial overlay",
    hotspot: [0, 0],
  },
  // System & OS
  {
    id: "default",
    name: "Default Pointer",
    category: "system",
    description: "Classic standard desktop arrow pointer",
    hotspot: [0, 0],
  },
  {
    id: "mac",
    name: "macOS Arrow",
    category: "system",
    description: "Modern Cupertino sculpted pointer with organic curves",
    hotspot: [0, 0],
  },
  {
    id: "macos-classic",
    name: "macOS Classic",
    category: "system",
    description: "Nostalgic System 7 monochrome bevel pointer",
    hotspot: [0, 0],
  },
  // Minimal & Dots
  {
    id: "dot",
    name: "Minimal Dot",
    category: "precision",
    description: "Clean solid white focus dot with dark hairline ring",
    hotspot: [6, 6],
  },
  {
    id: "sleek-dot",
    name: "Sleek Dot",
    category: "precision",
    description: "High-DPI focal bead with ambient outer diffusion ring",
    hotspot: [10, 10],
  },
  {
    id: "laser-dot",
    name: "Laser Dot",
    category: "presentation",
    description: "Vibrant ruby-red presentation laser pointer with luminous halo",
    hotspot: [8, 8],
  },
  // Precision & Reticles
  {
    id: "ring",
    name: "Target Ring",
    category: "precision",
    description: "Concentric target ring with translucent viewfinder center",
    hotspot: [12, 12],
  },
  {
    id: "minimal-crosshair",
    name: "Minimal Crosshair",
    category: "precision",
    description: "Ultra-thin 1px hairline reticle with open center aperture",
    hotspot: [12, 12],
  },
  {
    id: "focus-reticle",
    name: "Focus Reticle",
    category: "precision",
    description: "Camera viewfinder HUD brackets with center focal dot",
    hotspot: [12, 12],
  },
  {
    id: "sonar-pulse",
    name: "Sonar Pulse",
    category: "precision",
    description: "Aviation radar sweep ring with rhythmic pulse waves",
    hotspot: [12, 12],
  },
  // Glow & Luminous
  {
    id: "obsidian-glow",
    name: "Obsidian Glow",
    category: "glow",
    description: "Deep OLED matte black arrow with radiant purple halo",
    hotspot: [0, 0],
  },
  {
    id: "neon-laser",
    name: "Neon Laser",
    category: "glow",
    description: "Electric cyan and magenta high-energy laser dart",
    hotspot: [2, 2],
  },
  {
    id: "spotlight-glow",
    name: "Spotlight Glow",
    category: "presentation",
    description: "Luminescent radial spotlight disc illuminating content",
    hotspot: [16, 16],
  },
  {
    id: "aurora-trail",
    name: "Aurora Trail",
    category: "glow",
    description: "Ethereal teal and violet northern lights plasma trail",
    hotspot: [2, 2],
  },
  {
    id: "gradient-beam",
    name: "Gradient Beam",
    category: "glow",
    description: "Sleek pointer filled with multi-stop sunset-to-indigo gradient",
    hotspot: [2, 2],
  },
  // Creative & Tools
  {
    id: "precision-pen",
    name: "Precision Pen",
    category: "creative",
    description: "Calligraphic fountain pen nib with metallic brass collar",
    hotspot: [2, 2],
  },
  {
    id: "highlighter",
    name: "Highlighter",
    category: "creative",
    description: "Angled fluorescent chisel-tip markup highlighter",
    hotspot: [2, 2],
  },
  {
    id: "tactile-pointer",
    name: "Tactile Pointer",
    category: "creative",
    description: "Skeuomorphic pointing finger hand with soft knuckles",
    hotspot: [7, 2],
  },
  // Tech & Developer
  {
    id: "cyber-arrow",
    name: "Cyber Arrow",
    category: "tech",
    description: "Angular sci-fi arrowhead with neon emerald insets",
    hotspot: [2, 2],
  },
  {
    id: "terminal-caret",
    name: "Terminal Caret",
    category: "tech",
    description: "Phosphor green CRT terminal beam with command bracket",
    hotspot: [6, 10],
  },
  {
    id: "retro-pixel",
    name: "Retro Pixel",
    category: "tech",
    description: "Nostalgic 8-bit arcade stepped staircase arrow",
    hotspot: [0, 0],
  },
  // Playful & Modern
  {
    id: "glass-orb",
    name: "Glass Orb",
    category: "creative",
    description: "Translucent frosted glass sphere with specular highlight",
    hotspot: [12, 12],
  },
  {
    id: "smooth-chubby",
    name: "Smooth Chubby",
    category: "creative",
    description: "Friendly pillowy cursor with generous curved contours",
    hotspot: [3, 3],
  },
];

/**
 * Array of all 23 distinct visible cursor designs (excluding 'hidden').
 */
export const VISIBLE_CURSOR_PRESETS = CURSOR_PRESETS.filter((p) => p.id !== "hidden");

/**
 * Lookup helper returning a cursor preset by ID.
 */
export function getCursorPreset(id: string): CursorPreset | undefined {
  return CURSOR_PRESETS.find((preset) => preset.id === id);
}

/**
 * Type guard verifying if an arbitrary string is a valid CursorStyle.
 */
export function isValidCursorStyle(id: string): id is CursorStyle {
  return CURSOR_PRESETS.some((preset) => preset.id === id);
}
