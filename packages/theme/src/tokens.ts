/**
 * DomoLens design tokens for code that can't use CSS (canvas, WebGL, export).
 * Keep in sync with ../theme.css.
 */

export const colors = {
  ink950: "#0f1012",
  ink900: "#16171a",
  ink800: "#1e2024",
  ink700: "#2a2d33",
  ink600: "#363940",
  ink500: "#4a4e57",
  fg: "#f2f2f3",
  fgMuted: "#a0a3ab",
  fgFaint: "#6b6f78",
  orange300: "#ffb27a",
  orange400: "#ff8f3d",
  orange500: "#ff7a1a",
  orange600: "#e5660a",
  success: "#5bd38a",
  danger: "#ff6b6b",
} as const;

/** Shared motion settings so every animation feels the same. */
export const motion = {
  /** Default ease for UI: quick start, very gentle stop. */
  easeSoft: [0.22, 1, 0.36, 1] as const,
  easeInOutSoft: [0.65, 0, 0.35, 1] as const,
  /** Durations in seconds. */
  fast: 0.15,
  base: 0.25,
  slow: 0.45,
  /** Spring used for things that move or resize. No bounce. */
  spring: { type: "spring", stiffness: 380, damping: 38, mass: 0.9 } as const,
  /** Softer spring for big panels and screens. */
  springSoft: { type: "spring", stiffness: 220, damping: 32, mass: 1 } as const,
} as const;

export type ColorToken = keyof typeof colors;
