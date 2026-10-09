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
  type: "click" | "typing" | "highlight";
  timestampMs: number;
  x: number;
  y: number;
  snippet?: string;
  button?: "left" | "right" | "middle";
  durationMs?: number;
  xEnd?: number;
  yEnd?: number;
}

/** A single cursor/mouse coordinate sample recorded over time. */
export interface CursorTrajectoryPoint {
  timestampMs: number;
  x: number;
  y: number;
}

export type ShiftAnimationStyle = "smooth" | "cinematic" | "spring" | "drift" | "linear";

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
  /** Camera transition / shifting duration in milliseconds (default 750ms). */
  shiftDurationMs?: number;
  /** Camera shifting animation style (smooth, cinematic, spring, drift, linear). */
  shiftAnimation?: ShiftAnimationStyle;
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

export type WindowFrameStyle =
  | "macos"
  | "windows"
  | "safari"
  | "chrome"
  | "glass"
  | "terminal"
  | "none";

export type CameraPhysicsPreset = "smooth" | "snappy" | "spring" | "linear";

/**
 * 23 distinct cursor design styles plus "hidden" native pass-through.
 */
export type CursorStyle =
  | "hidden"              // Hidden (Native Video cursor preserved)
  // System & OS
  | "default"             // Default Pointer (Standard Desktop Arrow)
  | "mac"                 // macOS Arrow (Modern Cupertino Sculpted Arrow)
  | "macos-classic"       // macOS Classic (System 7 Monochrome Bevel Arrow)
  // Minimal & Dots
  | "dot"                 // Minimal Dot (Solid White Circle with Dark Ring)
  | "sleek-dot"           // Sleek Dot (High-DPI Focal Bead with Ambient Halo)
  | "laser-dot"           // Laser Dot (Ruby-Red High-Intensity Presentation Laser)
  // Precision & Reticles
  | "ring"                // Target Ring (Concentric Viewfinder Ring)
  | "minimal-crosshair"   // Minimal Crosshair (1px Hairline Reticle with Open Center)
  | "focus-reticle"       // Focus Reticle (Four Corner HUD Brackets with Center Dot)
  | "sonar-pulse"         // Sonar Pulse (Aviation Radar Sweep with Expanding Pulse)
  // Glow & Luminous
  | "obsidian-glow"       // Obsidian Glow (Deep OLED Black with Radiant Violet Aura)
  | "neon-laser"          // Neon Laser (Electric Cyan & Magenta Laser Dart)
  | "spotlight-glow"      // Spotlight Glow (Soft Radial Luminescent Focus Disc)
  | "aurora-trail"        // Aurora Trail (Teal/Emerald/Violet Northern Lights Comet)
  | "gradient-beam"       // Gradient Beam (Sunset-to-Indigo Vibrant Gradient Flow)
  // Creative & Tools
  | "precision-pen"       // Precision Pen (Vector Calligraphy Nib with Brass Collar)
  | "highlighter"         // Highlighter (Fluorescent Chisel-Tip Markup Marker)
  | "tactile-pointer"     // Tactile Pointer (Skeuomorphic Hand Pointing Finger)
  // Tech & Developer
  | "cyber-arrow"         // Cyber Arrow (Sci-Fi Angular Arrow with Emerald Insets)
  | "terminal-caret"      // Terminal Caret (Hacker Phosphor CRT Green Beam & Bracket)
  | "retro-pixel"         // Retro Pixel (8-Bit Pixel-Art Stepped Staircase Arrow)
  // Playful & Modern
  | "glass-orb"           // Glass Orb (Translucent Frosted Glass Sphere with Specular)
  | "smooth-chubby";      // Smooth Chubby (Friendly Pillowy Rounded Contour Arrow)

/**
 * Avatar content type attached to the cursor pointer.
 */
export type CursorAvatarType = "initials" | "icon" | "image" | "text";

/**
 * Preset vector icons supported for cursor avatar badges.
 */
export type CursorAvatarIconPreset =
  | "sparkles"
  | "star"
  | "zap"
  | "flame"
  | "shield"
  | "crown"
  | "check"
  | "heart"
  | "user";

/**
 * Configuration for the user avatar / presenter badge attached to the tracked cursor.
 */
export interface CursorAvatar {
  /** Whether the cursor avatar badge is rendered. */
  enabled: boolean;
  /** Content type of the badge (initials, icon preset, image URL, or text). */
  type: CursorAvatarType;
  /**
   * Primary display value:
   * - type 'initials': 1-3 letters (e.g. "AK", "DL", "JD")
   * - type 'icon': icon identifier (e.g. "sparkles", "star", "zap")
   * - type 'image': URL to image (https://... or data:...)
   * - type 'text': short text or emoji (e.g. "Host", "🚀")
   */
  value: string;
  /** Custom badge background / accent color (e.g. "#6366f1", "#ec4899", "#10b981"). */
  color?: string;
  /** Optional subtitle or role pill rendered next to the avatar (e.g. "Presenter", "Speaker"). */
  badgeLabel?: string;
  /** Optional icon identifier for backward/alternative compatibility. */
  icon?: CursorAvatarIconPreset | string;
  /** Optional image URL for backward/alternative compatibility. */
  imageUrl?: string;
  /** Optional text string for backward/alternative compatibility. */
  text?: string;
}

/**
 * Safe default cursor avatar configuration.
 */
export const DEFAULT_CURSOR_AVATAR: CursorAvatar = {
  enabled: false,
  type: "initials",
  value: "DL",
  color: "#6366f1",
  badgeLabel: "",
};

/** User photo inserted into a template's photo placeholder. */
export interface PhotoOverlay {
  /** Image data URL or media URL. */
  src: string;
  /** Normalized center X (0..1). */
  x: number;
  /** Normalized center Y (0..1). */
  y: number;
  /** Size as a fraction of the canvas width (0.08..0.6). */
  size: number;
  shape: "circle" | "rounded" | "square";
}

export type TiltMotionMode = "none" | "hover" | "reactive" | "sweep";

export type AspectRatioPreset = "auto" | "16:9" | "9:16" | "1:1" | "4:3";
export type VideoFitMode = "contain" | "cover";

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
  /** Cursor style to render (23 distinct designs + "hidden"). */
  cursorStyle: CursorStyle;
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
  /** Optional user avatar / presenter badge anchored to the cursor pointer. */
  cursorAvatar?: CursorAvatar;
  /** Optional user-supplied photo placed on the canvas (template photo placeholder). */
  photoOverlay?: PhotoOverlay;
  /** Aspect ratio of the canvas (default "16:9", or "auto" to match source video). */
  aspectRatio?: AspectRatioPreset;
  /** Video framing fit mode ("contain" preserves all edges without cropping, "cover" fills viewport). */
  fit?: VideoFitMode;
  /** Window mockup frame shell around the recording. */
  windowFrame?: WindowFrameStyle;
  /** 3D Perspective tilt pitch angle (-15 to 15 degrees, legacy master pitch). */
  tiltAngle?: number;
  /** 3D Perspective Pitch: rotation around X axis in degrees (-30 to +30). */
  tiltX?: number;
  /** 3D Perspective Yaw: rotation around Y axis in degrees (-30 to +30). */
  tiltY?: number;
  /** 3D Perspective Roll: rotation around Z axis in degrees (-20 to +20). */
  tiltZ?: number;
  /** 3D Perspective viewing distance in pixels (default 1200). */
  tiltPerspective?: number;
  /** Kinetic motion animation mode for the 3D frame. */
  tiltAnimation?: TiltMotionMode;
  /** Intensity scaling for 3D motion animation (0.0 to 1.0, default 0.6). */
  tiltAnimationIntensity?: number;
  /** Whether to render specular glass light reflection across the tilted frame. */
  tiltGlare?: boolean;
  /** Motion blur strength (0.0 to 1.0). */
  motionBlur?: number;
  /** Camera physics model for zoom transitions. */
  cameraPhysics?: CameraPhysicsPreset;
  /** Primary brand accent color (e.g. #6366f1) for dynamic highlights and visual accents. */
  brandAccentColor?: string;
  /** Browser mockup custom URL string (e.g. "app.domain.com"). */
  mockupUrl?: string;
  /** Enable dynamic video background glow blur. */
  ambientBackdropBlur?: boolean;
  /** Kinetic visual accent treatment replacing static pill badges. */
  visualAccent?: KineticVisualAccentType;
  /** Multi-device layout cascade for 3D perspective depth staging. */
  multiDeviceLayout?: MultiDeviceLayoutType;
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

/**
 * Kinetic visual accent treatments replacing static pill badges with dynamic,
 * atmospheric CapCut & After Effects-inspired effects.
 */
export type KineticVisualAccentType =
  | "specular-sweep"     // Diagonal glass reflection light beam
  | "glass-sheen"         // Ambient frosted glass prismatic sheen
  | "crt-scanlines"       // Cyberpunk phosphor CRT scanline shimmer with jitter
  | "laser-radar-sweep"   // High-tech horizontal security laser radar beam
  | "tactile-shockwave"   // Expanding circular micro-interaction ripple rings
  | "particle-burst"      // Floating glowing launch/upvote particles
  | "ambient-pulse"       // Pulsing edge neon glow
  | "curved-cursor-glide" // Smooth floating animated cursor vector
  | "kinetic-soundwave";  // Rhythmic audio wave accent

/**
 * Layout configuration for 3D multi-device and multi-card perspective cascades.
 */
export type MultiDeviceLayoutType =
  | "single"
  | "dual-cascade"
  | "triple-deck"
  | "isometric-stack";

/**
 * High-impact camera transition styles inspired by CapCut & After Effects choreography.
 */
export type CameraTransitionStyle =
  | "snap-zoom"
  | "whip-pan"
  | "speed-ramp"
  | "perspective-cascade"
  | "ken-burns"
  | "kinetic-punch";

/**
 * Animation entrance and choreography presets for badgeless kinetic typography.
 */
export type KineticTypographyAnimation =
  | "fade-up"
  | "blur-reveal"
  | "typewriter"
  | "elastic-pop"
  | "whip-slide"
  | "stagger-chars";

/** Typography styling configuration for text overlays and motion templates. */
export interface TemplateTypography {
  /** CSS font-family string (e.g. "'Plus Jakarta Sans', sans-serif"). */
  fontFamily: string;
  /** CSS font-weight (e.g. '600', '700', '800', '900', 'bold'). */
  fontWeight?: string;
  /** CSS letter-spacing (e.g. '-0.02em', '0.05em'). */
  letterSpacing?: string;
  /** Tailwind or CSS class name for additional headline treatment. */
  headlineClass?: string;
  /** CSS font-size or text class for kinetic kicker / category micro-labels. */
  kickerClass?: string;
  /** Text transformation for kicker (e.g. 'uppercase'). */
  kickerTransform?: "uppercase" | "capitalize" | "lowercase" | "none";
  /** Kinetic typography motion animation preset. */
  animation?: KineticTypographyAnimation;
}

/**
 * Visual styling for pill badges in templates and overlays.
 * @deprecated Pill badges are eradicated in favor of badgeless kinetic typography and visual accents.
 * Retained temporarily for backward compatibility during migration.
 */
export interface TemplateBadgeStyle {
  /** CSS background color or gradient (e.g. 'rgba(99, 102, 241, 0.2)'). */
  bg: string;
  /** Text color (e.g. '#818cf8'). */
  text: string;
  /** Border stroke color (e.g. 'rgba(99, 102, 241, 0.45)'). */
  border?: string;
}

/**
 * Kinetic motion presets for text overlays and template title animations.
 * Provides high-energy, modern choreography inspired by OpenScreen and CapCut.
 */
export type TextMotionPreset =
  | "none"
  | "elastic-pop"
  | "fluid-slide"
  | "whip-slide"
  | "blur-reveal"
  | "smooth-fade";

export const TEXT_MOTION_PRESETS: readonly TextMotionPreset[] = [
  "none",
  "elastic-pop",
  "fluid-slide",
  "whip-slide",
  "blur-reveal",
  "smooth-fade",
] as const;

/**
 * Modern aesthetic card styling treatments for text overlay backdrops.
 */
export type TextCardStyle =
  | "glass"
  | "gradient"
  | "solid"
  | "minimal"
  | "terminal";

export const TEXT_CARD_STYLES: readonly TextCardStyle[] = [
  "glass",
  "gradient",
  "solid",
  "minimal",
  "terminal",
] as const;

/**
 * Styling attributes and design tokens associated with each TextCardStyle.
 */
export interface TextCardStyleDefinition {
  id: TextCardStyle;
  name: string;
  description: string;
  defaultBgColor: string;
  defaultColor: string;
  borderStyle: string;
  backdropBlurPx: number;
  boxShadow: string;
  fontFamily?: string;
}

export const TEXT_CARD_STYLE_DEFINITIONS: Record<TextCardStyle, TextCardStyleDefinition> = {
  glass: {
    id: "glass",
    name: "Frosted Glass",
    description: "Frosted glassmorphism backdrop with soft translucent border",
    defaultBgColor: "rgba(15, 23, 42, 0.65)",
    defaultColor: "#ffffff",
    borderStyle: "1px solid rgba(255, 255, 255, 0.18)",
    backdropBlurPx: 12,
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
  },
  gradient: {
    id: "gradient",
    name: "Vibrant Gradient",
    description: "Vibrant brand gradient pill with radiant highlight",
    defaultBgColor: "linear-gradient(135deg, rgba(99, 102, 241, 0.85) 0%, rgba(168, 85, 247, 0.85) 100%)",
    defaultColor: "#ffffff",
    borderStyle: "1px solid rgba(255, 255, 255, 0.25)",
    backdropBlurPx: 8,
    boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)",
  },
  solid: {
    id: "solid",
    name: "Solid Slate",
    description: "Opaque high-contrast slate card with crisp definition",
    defaultBgColor: "#0f172a",
    defaultColor: "#f8fafc",
    borderStyle: "1px solid rgba(255, 255, 255, 0.10)",
    backdropBlurPx: 0,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
  },
  minimal: {
    id: "minimal",
    name: "Minimalist Floating",
    description: "Frameless floating typography with pure drop shadow",
    defaultBgColor: "transparent",
    defaultColor: "#ffffff",
    borderStyle: "none",
    backdropBlurPx: 0,
    boxShadow: "none",
  },
  terminal: {
    id: "terminal",
    name: "Cyber Terminal",
    description: "Retro monospace console card with emerald CRT border",
    defaultBgColor: "rgba(5, 8, 12, 0.92)",
    defaultColor: "#4ade80",
    borderStyle: "1px solid rgba(74, 222, 128, 0.4)",
    backdropBlurPx: 4,
    boxShadow: "0 0 15px rgba(74, 222, 128, 0.2)",
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
};

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
  /**
   * Optional unboxed kicker / category micro-label rendered above the main headline.
   * Replaces static pill badges with clean, stylized kinetic typography.
   */
  kicker?: string;
  style?: "headline" | "callout" | "subtitle" | "badge";
  /** Optional typography specification. */
  typography?: TemplateTypography;
  /** Kinetic motion animation preset. Default: "smooth-fade". */
  motionPreset?: TextMotionPreset;
  /** Backdrop card styling treatment. Default: "glass". */
  cardStyle?: TextCardStyle;
  /** Entrance animation duration in milliseconds. Defaults to preset baseline. */
  entranceDurationMs?: number;
  /** Exit animation duration in milliseconds. Defaults to preset baseline. */
  exitDurationMs?: number;
  /**
   * @deprecated Pill badges are eradicated in favor of unboxed kinetic kickers and visual accents.
   */
  badge?: string;
  /**
   * @deprecated Visual styling for pill badges is eradicated.
   */
  badgeStyle?: TemplateBadgeStyle;
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
export type TypingSoundPreset =
  | "thock"
  | "creamy"
  | "thack"
  | "clicky"
  | "thick"
  | "mechanical"
  | "laptop"
  | "typewriter"
  | "none";

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
  typingSoundPreset: "creamy",
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
  autoTrackCursor: false,
  autoTrackScale: 1.6,
  cursorAvatar: DEFAULT_CURSOR_AVATAR,
  aspectRatio: "16:9",
  fit: "contain",
  windowFrame: "macos",
  tiltAngle: 0,
  tiltX: 0,
  tiltY: 0,
  tiltZ: 0,
  tiltPerspective: 1200,
  tiltAnimation: "none",
  tiltAnimationIntensity: 0.6,
  tiltGlare: true,
  motionBlur: 0,
  cameraPhysics: "spring",
  brandAccentColor: "#6366f1",
  mockupUrl: "",
};

