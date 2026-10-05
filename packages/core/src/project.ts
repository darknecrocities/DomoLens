/**
 * Project format shared by every platform.
 *
 * A project made on a phone opens on a computer and the other way round,
 * so this file is the single source of truth for what a project looks like.
 */

export const PROJECT_FORMAT_VERSION = 1;

/** Where the first video in a project came from. */
export type ProjectSource = "recording" | "import";

/** The small version of a project shown on the Home screen. */
export interface ProjectSummary {
  id: string;
  name: string;
  source: ProjectSource;
  /** Milliseconds since 1970 (UTC). */
  createdAt: number;
  updatedAt: number;
  /** Length of the main video, once we know it. */
  durationMs: number | null;
  width: number | null;
  height: number | null;
  /** Absolute path (desktop/mobile) or object URL (browser) of the cover image. */
  thumbnail: string | null;
  /** Absolute path (desktop/mobile) or object URL (browser) of the main video. */
  media: string | null;
}

/** Video file types we accept today. Lower case, no dot. */
export const SUPPORTED_VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "mkv"] as const;

export type SupportedVideoExtension = (typeof SUPPORTED_VIDEO_EXTENSIONS)[number];

export const MAX_PROJECT_NAME_LENGTH = 80;
export const DEFAULT_PROJECT_NAME = "Untitled recording";

/** A single user click recorded during capture. Coordinates normalized 0.0 - 1.0. */
export interface ClickEvent {
  id: string;
  timestampMs: number;
  /** Normalized X (0.0 left to 1.0 right). */
  x: number;
  /** Normalized Y (0.0 top to 1.0 bottom). */
  y: number;
  button: "left" | "right" | "middle";
  clickCount?: number;
}

/** User interaction (click, button press, or typing input) to trigger auto-zoom. */
export interface InteractionEvent {
  id: string;
  type: "click" | "typing";
  timestampMs: number;
  x: number;
  y: number;
  snippet?: string;
  button?: "left" | "right" | "middle";
  durationMs?: number;
}

/** A single cursor/mouse coordinate sample recorded over time. */
export interface CursorTrajectoryPoint {
  timestampMs: number;
  x: number;
  y: number;
}

/** A zoom section on the timeline focusing on a point of interest. */
export interface ZoomBlock {
  id: string;
  startTimeMs: number;
  endTimeMs: number;
  /** Normalized focus target center X (0.0 to 1.0). */
  targetX: number;
  /** Normalized focus target center Y (0.0 to 1.0). */
  targetY: number;
  /** Scale factor (e.g. 1.5x, 2.0x). 1.0 means no zoom. */
  scale: number;
  /** Whether this zoom block is active. */
  enabled: boolean;
}

/** A video or media clip on the editor timeline. */
export interface TimelineClip {
  id: string;
  name: string;
  mediaUrl: string;
  /** Start time on the overall timeline in ms. */
  timelineStartMs: number;
  /** Duration on the timeline in ms. */
  durationMs: number;
  /** Start trim offset within the source media in ms. */
  sourceOffsetMs: number;
  muted: boolean;
  volume: number;
}

export type BackgroundKind = "solid" | "gradient" | "mesh" | "image";

export interface ProjectLooks {
  backgroundType: BackgroundKind;
  /** CSS background value (e.g. solid hex or gradient definition). */
  backgroundValue: string;
  /** Padding around the video in pixels (0 to 80). */
  padding: number;
  /** Border radius in pixels (0 to 48). */
  borderRadius: number;
  /** Shadow preset. */
  shadow: "none" | "soft" | "lift" | "glow";
  /** Cursor style to render. */
  cursorStyle: "default" | "mac" | "dot" | "ring" | "hidden";
  /** Show artificial cursor pointer overlay (defaults to false). */
  showCursor?: boolean;
  /** Show expanding ripple effect on clicks. */
  showClickRipples: boolean;
  /** Inset border color. */
  borderColor?: string;
  /** Scale multiplier for cursor pointer overlay (1.0 to 2.5). */
  cursorSize?: number;
  /** Cursor path smoothing filter. */
  cursorSmoothing?: "none" | "smooth" | "cinematic";
  /** Continuous auto-tracking camera following cursor. */
  autoTrackCursor?: boolean;
  /** Camera zoom scale when auto-tracking cursor (1.2 to 2.5). */
  autoTrackScale?: number;
}

/** Video effect types that can be placed on the timeline or attached to keyframes. */
export type VideoEffectType =
  | "spotlight"
  | "vignette"
  | "blur"
  | "glow"
  | "speed"
  | "filter"
  | "shake";

/** A video effect block on the editor timeline. */
export interface VideoEffect {
  id: string;
  name: string;
  type: VideoEffectType;
  startTimeMs: number;
  durationMs: number;
  intensity: number; // 0.0 to 1.0 (or speed multiplier e.g. 0.5 to 2.5)
  targetX?: number; // Normalized X coordinate (0.0 to 1.0) for localized effects
  targetY?: number; // Normalized Y coordinate (0.0 to 1.0)
  radius?: number; // Pixel radius for localized spotlight (60 to 300)
  preset?: string; // Optional styling preset (e.g. "cinematic", "noir", "cyberpunk")
  enabled: boolean;
}

/** A discrete keyframe node on the timeline for zooming or camera positioning. */
export interface KeyframeNode {
  id: string;
  timeMs: number;
  scale: number;
  targetX: number;
  targetY: number;
  easing: "spring" | "cubic" | "linear";
  effect?: VideoEffectType;
  effectIntensity?: number;
  /** Sound effect attached to this keyframe. */
  sound?: "click" | "typing";
  soundPreset?: string;
  soundVolume?: number;
}

/** A text caption or graphic title on the timeline. */
export interface TextOverlay {
  id: string;
  text: string;
  startTimeMs: number;
  durationMs: number;
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
  fontSize: number;
  color: string;
  bgColor?: string;
}

/** An audio track or sound effect on the timeline. */
export interface AudioTrack {
  id: string;
  name: string;
  type: "music" | "sfx";
  url: string;
  startTimeMs: number;
  durationMs: number;
  volume: number;
  muted: boolean;
}

export interface ProjectAiData {
  titleSuggestions?: string[];
  summary?: string;
  chapters?: Array<{ timeMs: number; title: string }>;
}

export type ClickSoundPreset = "bop" | "click" | "tap" | "none";
export type TypingSoundPreset = "mechanical" | "laptop" | "typewriter" | "none";

export interface ProjectAudioSettings {
  /** Whether clicks automatically trigger a tactile sound effect. */
  clickSoundEnabled: boolean;
  clickSoundPreset: ClickSoundPreset;
  /** Volume from 0.0 to 1.0. */
  clickSoundVolume: number;
  /** Whether typing automatically plays typing sounds. */
  typingSoundEnabled: boolean;
  typingSoundPreset: TypingSoundPreset;
  /** Volume from 0.0 to 1.0. */
  typingSoundVolume: number;
  /** Whether to duck background music during clicks and typing. */
  musicDuckingEnabled: boolean;
  /** Ducking volume factor (0.0 to 1.0). */
  duckingAmount: number;
}

export const DEFAULT_AUDIO_SETTINGS: ProjectAudioSettings = {
  clickSoundEnabled: true,
  clickSoundPreset: "bop",
  clickSoundVolume: 0.7,
  typingSoundEnabled: true,
  typingSoundPreset: "mechanical",
  typingSoundVolume: 0.6,
  musicDuckingEnabled: true,
  duckingAmount: 0.45,
};

/** The full project state loaded in the editor. */
export interface ProjectData {
  summary: ProjectSummary;
  clicks: ClickEvent[];
  interactions?: InteractionEvent[];
  cursorTrajectory?: CursorTrajectoryPoint[];
  zoomBlocks: ZoomBlock[];
  keyframes?: KeyframeNode[];
  effects?: VideoEffect[];
  textOverlays?: TextOverlay[];
  audioTracks?: AudioTrack[];
  audioSettings?: ProjectAudioSettings;
  clips: TimelineClip[];
  looks: ProjectLooks;
  ai?: ProjectAiData;
}

export const DEFAULT_LOOKS: ProjectLooks = {
  backgroundType: "gradient",
  backgroundValue: "linear-gradient(135deg, #1e2024 0%, #16171a 100%)",
  padding: 32,
  borderRadius: 16,
  shadow: "lift",
  cursorStyle: "hidden",
  showCursor: false,
  showClickRipples: true,
  cursorSize: 1.4,
  cursorSmoothing: "smooth",
  autoTrackCursor: true,
  autoTrackScale: 1.6,
};

