import type {
  CameraPhysicsPreset,
  ClickEvent,
  InteractionEvent,
  KeyframeNode,
  ProjectAudioSettings,
  ProjectLooks,
  TemplateBadgeStyle,
  TemplateTypography,
  TextOverlay,
  ZoomBlock,
} from "./project";

export type { TemplateBadgeStyle, TemplateTypography };

/** Transition and choreography timing specifications for a motion template. */
export interface TemplateTransitionTiming {
  /** Milliseconds delay before camera zooms in/out (defaults to 250ms). */
  cameraLeadInMs?: number;
  /** Duration in milliseconds for text overlay and element entrance animations (defaults to 500ms). */
  entranceDurationMs?: number;
}

export type TemplateCategory =
  | "saas"
  | "keynote"
  | "social"
  | "developer"
  | "tutorial"
  | "teaser"
  | "showcase";

export interface TemplateCustomizableField {
  id: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  type: "text" | "color" | "badge";
}

export type MotionSignatureType =
  | "3d-gyro-float"
  | "cinematic-push"
  | "rhythmic-punch"
  | "kinetic-phone"
  | "cli-scanlines"
  | "step-focus"
  | "isometric-upvote"
  | "radar-scan"
  | "click-ripples"
  | "curved-cursor";

/** Distinct motion choreography signature definition for studio templates. */
export interface TemplateMotionSignature {
  type: MotionSignatureType;
  label: string;
  badge: string;
  description: string;
}

export interface MotionTemplate {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: TemplateCategory;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3";
  accentColor: string;
  badge: string;
  /** Custom badge pill styling (background, text color, and border). */
  badgeStyle?: TemplateBadgeStyle;
  /** Visual typography styling for headlines and overlays. */
  typography?: TemplateTypography;
  /** Signature motion choreography profile for live preview and canvas simulation. */
  motionSignature?: TemplateMotionSignature;
  /** Choreography transition timings for camera moves and entrances. */
  transitionTiming?: TemplateTransitionTiming;
  /** Camera physics motion curve ('smooth' | 'snappy' | 'spring' | 'linear'). */
  cameraPhysics?: CameraPhysicsPreset;
  looks: Partial<ProjectLooks>;
  audioSettings: Partial<ProjectAudioSettings>;
  customizableFields: TemplateCustomizableField[];
  defaultTextOverlays: Array<Omit<TextOverlay, "id">>;
}

export const STUDIO_MOTION_TEMPLATES: MotionTemplate[] = [
  {
    id: "saas-launch-hero",
    name: "SaaS Launch Hero",
    tagline: "High-converting dark obsidian launch video with 3D perspective",
    description: "Built for Twitter/X announcements, Product Hunt heroes, and marketing landing pages. Features a subtle 3D tilt, dark mesh gradient, and creamy mechanical keystroke accents.",
    category: "saas",
    aspectRatio: "16:9",
    accentColor: "#6366f1",
    badge: "NEW RELEASE",
    badgeStyle: {
      bg: "rgba(99, 102, 241, 0.2)",
      text: "#818cf8",
      border: "rgba(99, 102, 241, 0.45)",
    },
    motionSignature: {
      type: "3d-gyro-float",
      label: "3D Gyro Float & Specular Sweep",
      badge: "3D GYRO FLOAT",
      description: "Continuous 3D gyroscopic camera drift with sweeping specular light sheen across the glass",
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontWeight: "800",
      letterSpacing: "-0.03em",
      headlineClass: "font-extrabold tracking-tight text-white drop-shadow-md",
    },
    transitionTiming: {
      cameraLeadInMs: 280,
      entranceDurationMs: 450,
    },
    cameraPhysics: "spring",
    looks: {
      aspectRatio: "16:9",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)",
      padding: 36,
      borderRadius: 18,
      shadow: "glow",
      windowFrame: "macos",
      tiltAngle: 6.5,
      cameraPhysics: "spring",
      cursorStyle: "mac",
      showCursor: true,
      cursorSize: 1.45,
      cursorSmoothing: "cinematic",
      brandAccentColor: "#6366f1",
      mockupUrl: "app.yourstartup.io",
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "bop",
      clickSoundVolume: 0.75,
      typingSoundEnabled: true,
      typingSoundPreset: "creamy",
      typingSoundVolume: 0.7,
      musicDuckingEnabled: true,
      duckingAmount: 0.45,
    },
    customizableFields: [
      { id: "headline", label: "Hero Title", placeholder: "Introducing DomoLens 2.0", defaultValue: "Introducing DomoLens 2.0", type: "text" },
      { id: "tagline", label: "Tagline", placeholder: "Studio-quality recordings in seconds", defaultValue: "Studio-quality recordings in seconds", type: "text" },
      { id: "badge", label: "Pill Badge", placeholder: "NEW RELEASE", defaultValue: "NEW RELEASE", type: "badge" },
      { id: "accent", label: "Brand Accent", placeholder: "#6366f1", defaultValue: "#6366f1", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Introducing DomoLens 2.0",
        badge: "NEW RELEASE",
        startTimeMs: 300,
        durationMs: 4000,
        x: 0.5,
        y: 0.08,
        fontSize: 26,
        color: "#ffffff",
        bgColor: "rgba(15, 23, 42, 0.85)",
        style: "headline",
        typography: {
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontWeight: "800",
          letterSpacing: "-0.03em",
        },
        badgeStyle: {
          bg: "rgba(99, 102, 241, 0.2)",
          text: "#818cf8",
          border: "rgba(99, 102, 241, 0.45)",
        },
      },
    ],
  },
  {
    id: "apple-keynote-polish",
    name: "Apple Keynote Polish",
    tagline: "Ultra-clean silver gradient, Safari chrome, and cinematic calm",
    description: "The gold standard of minimalist hardware and software presentations. Clean light-mode silver tone with frosted glass window depth and whisper-quiet typing sounds.",
    category: "keynote",
    aspectRatio: "16:9",
    accentColor: "#0071e3",
    badge: "PRO DEMO",
    badgeStyle: {
      bg: "rgba(0, 113, 227, 0.12)",
      text: "#0071e3",
      border: "rgba(0, 113, 227, 0.3)",
    },
    motionSignature: {
      type: "cinematic-push",
      label: "Cinematic Ken Burns Push",
      badge: "CINEMATIC PUSH",
      description: "Silky-smooth slow camera zoom-in with Safari chrome and pristine silver bloom",
    },
    typography: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif",
      fontWeight: "600",
      letterSpacing: "-0.015em",
      headlineClass: "font-semibold tracking-tight text-slate-900",
    },
    transitionTiming: {
      cameraLeadInMs: 300,
      entranceDurationMs: 500,
    },
    cameraPhysics: "smooth",
    looks: {
      aspectRatio: "16:9",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 100%)",
      padding: 42,
      borderRadius: 16,
      shadow: "lift",
      windowFrame: "safari",
      tiltAngle: 0,
      cameraPhysics: "smooth",
      cursorStyle: "mac",
      showCursor: true,
      cursorSize: 1.35,
      cursorSmoothing: "cinematic",
      brandAccentColor: "#0071e3",
      mockupUrl: "craft.do/workspace",
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "click",
      clickSoundVolume: 0.65,
      typingSoundEnabled: true,
      typingSoundPreset: "laptop",
      typingSoundVolume: 0.5,
      musicDuckingEnabled: true,
      duckingAmount: 0.4,
    },
    customizableFields: [
      { id: "headline", label: "Feature Headline", placeholder: "Simplicity, redefined.", defaultValue: "Simplicity, redefined.", type: "text" },
      { id: "tagline", label: "Omnibar URL", placeholder: "craft.do/workspace", defaultValue: "craft.do/workspace", type: "text" },
      { id: "badge", label: "Status Badge", placeholder: "DESIGN REEL", defaultValue: "DESIGN REEL", type: "badge" },
      { id: "accent", label: "Accent Color", placeholder: "#0071e3", defaultValue: "#0071e3", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Simplicity, redefined.",
        badge: "DESIGN REEL",
        startTimeMs: 400,
        durationMs: 3800,
        x: 0.5,
        y: 0.90,
        fontSize: 22,
        color: "#0f172a",
        bgColor: "rgba(255, 255, 255, 0.9)",
        style: "callout",
        typography: {
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontWeight: "600",
          letterSpacing: "-0.015em",
        },
        badgeStyle: {
          bg: "rgba(0, 113, 227, 0.12)",
          text: "#0071e3",
          border: "rgba(0, 113, 227, 0.3)",
        },
      },
    ],
  },
  {
    id: "feature-drop-changelog",
    name: "Feature Drop / Changelog",
    tagline: "Snappy rhythmic zoom with violet mesh and feature pills",
    description: "Engineered for weekly shipping updates and release notes. Highlights newly shipped buttons and interactions with energetic clack keystrokes.",
    category: "saas",
    aspectRatio: "16:9",
    accentColor: "#a855f7",
    badge: "v2.4 UPDATE",
    badgeStyle: {
      bg: "rgba(168, 85, 247, 0.2)",
      text: "#c084fc",
      border: "rgba(168, 85, 247, 0.45)",
    },
    motionSignature: {
      type: "rhythmic-punch",
      label: "Rhythmic Feature Punch-In",
      badge: "RHYTHMIC PUNCH",
      description: "Snappy camera punch zooms with elastic bouncy badge pop-ins and violet spotlight",
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: "700",
      letterSpacing: "-0.02em",
      headlineClass: "font-bold tracking-tight text-purple-200",
    },
    transitionTiming: {
      cameraLeadInMs: 200,
      entranceDurationMs: 450,
    },
    cameraPhysics: "snappy",
    looks: {
      aspectRatio: "16:9",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(135deg, #18002a 0%, #2e0854 50%, #0d001a 100%)",
      padding: 32,
      borderRadius: 16,
      shadow: "glow",
      windowFrame: "macos",
      tiltAngle: 4.0,
      cameraPhysics: "snappy",
      cursorStyle: "mac",
      showCursor: true,
      cursorSize: 1.5,
      cursorSmoothing: "smooth",
      brandAccentColor: "#a855f7",
      mockupUrl: "app.linear.app/changelog",
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "click",
      clickSoundVolume: 0.75,
      typingSoundEnabled: true,
      typingSoundPreset: "thack",
      typingSoundVolume: 0.65,
      musicDuckingEnabled: true,
      duckingAmount: 0.5,
    },
    customizableFields: [
      { id: "headline", label: "Update Title", placeholder: "Shipped: Instant Auto-Zoom", defaultValue: "Shipped: Instant Auto-Zoom", type: "text" },
      { id: "badge", label: "Version Tag", placeholder: "v2.4 UPDATE", defaultValue: "v2.4 UPDATE", type: "badge" },
      { id: "accent", label: "Accent Color", placeholder: "#a855f7", defaultValue: "#a855f7", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Shipped: Instant Auto-Zoom",
        badge: "v2.4 UPDATE",
        startTimeMs: 200,
        durationMs: 3600,
        x: 0.5,
        y: 0.08,
        fontSize: 24,
        color: "#ffffff",
        bgColor: "rgba(30, 10, 60, 0.85)",
        style: "headline",
        typography: {
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "700",
          letterSpacing: "-0.02em",
        },
        badgeStyle: {
          bg: "rgba(168, 85, 247, 0.2)",
          text: "#c084fc",
          border: "rgba(168, 85, 247, 0.45)",
        },
      },
    ],
  },
  {
    id: "viral-short-tiktok",
    name: "Viral Short / TikTok Walkthrough",
    tagline: "9:16 vertical story with centered auto-pan and bold captions",
    description: "Optimized for high-retention TikToks, YouTube Shorts, and Instagram Reels. Places the recording in an ergonomic vertical frame with an ambient blurred background.",
    category: "social",
    aspectRatio: "9:16",
    accentColor: "#facc15",
    badge: "MUST WATCH",
    badgeStyle: {
      bg: "rgba(250, 204, 21, 0.22)",
      text: "#facc15",
      border: "rgba(250, 204, 21, 0.6)",
    },
    motionSignature: {
      type: "kinetic-phone",
      label: "Floating Phone & Kinetic Captions",
      badge: "KINETIC SHORT",
      description: "Vertical handheld phone sway with bold bouncing kinetic typography caption sync",
    },
    typography: {
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: "900",
      letterSpacing: "-0.02em",
      headlineClass: "font-black tracking-tight text-yellow-400 drop-shadow-lg",
    },
    transitionTiming: {
      cameraLeadInMs: 150,
      entranceDurationMs: 350,
    },
    cameraPhysics: "snappy",
    looks: {
      aspectRatio: "9:16",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(180deg, #09090b 0%, #171717 100%)",
      padding: 24,
      borderRadius: 22,
      shadow: "glow",
      windowFrame: "glass",
      tiltAngle: 0,
      cameraPhysics: "snappy",
      cursorStyle: "dot",
      showCursor: true,
      cursorSize: 1.8,
      cursorSmoothing: "smooth",
      brandAccentColor: "#facc15",
      ambientBackdropBlur: true,
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "bop",
      clickSoundVolume: 0.85,
      typingSoundEnabled: true,
      typingSoundPreset: "creamy",
      typingSoundVolume: 0.8,
      musicDuckingEnabled: true,
      duckingAmount: 0.6,
    },
    customizableFields: [
      { id: "headline", label: "Hook Caption", placeholder: "Secret Chrome Shortcut 👇", defaultValue: "Secret Chrome Shortcut 👇", type: "text" },
      { id: "badge", label: "Video Tag", placeholder: "PRO TIP", defaultValue: "PRO TIP", type: "badge" },
      { id: "accent", label: "Highlight Color", placeholder: "#facc15", defaultValue: "#facc15", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Secret Chrome Shortcut 👇",
        badge: "PRO TIP",
        startTimeMs: 100,
        durationMs: 5000,
        x: 0.5,
        y: 0.12,
        fontSize: 26,
        color: "#ffffff",
        bgColor: "rgba(0, 0, 0, 0.85)",
        style: "headline",
        typography: {
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "900",
          letterSpacing: "-0.02em",
        },
        badgeStyle: {
          bg: "rgba(250, 204, 21, 0.22)",
          text: "#facc15",
          border: "rgba(250, 204, 21, 0.6)",
        },
      },
    ],
  },
  {
    id: "developer-cli",
    name: "Developer CLI Deep-Dive",
    tagline: "Monochrome cyberpunk terminal with deep POM mechanical thocks",
    description: "Designed for open-source repositories, developer tools, and terminal CLIs. Features authentic mechanical thock acoustics and high-contrast terminal framing.",
    category: "developer",
    aspectRatio: "16:9",
    accentColor: "#22c55e",
    badge: "CLI TOOL",
    badgeStyle: {
      bg: "rgba(34, 197, 94, 0.15)",
      text: "#4ade80",
      border: "rgba(34, 197, 94, 0.4)",
    },
    motionSignature: {
      type: "cli-scanlines",
      label: "CRT Scanlines & Command Prompt",
      badge: "CRT SCANLINE",
      description: "Retro CRT scanlines, terminal window framing, and blinking command line cursor",
    },
    typography: {
      fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontWeight: "700",
      letterSpacing: "-0.01em",
      headlineClass: "font-mono font-bold tracking-tight text-emerald-400",
    },
    transitionTiming: {
      cameraLeadInMs: 200,
      entranceDurationMs: 400,
    },
    cameraPhysics: "snappy",
    looks: {
      aspectRatio: "16:9",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(135deg, #050b07 0%, #0d1a10 50%, #050b07 100%)",
      padding: 34,
      borderRadius: 14,
      shadow: "lift",
      windowFrame: "terminal",
      tiltAngle: 3.5,
      cameraPhysics: "snappy",
      cursorStyle: "dot",
      showCursor: true,
      cursorSize: 1.4,
      cursorSmoothing: "smooth",
      brandAccentColor: "#22c55e",
      mockupUrl: "terminal — zsh — 80x24",
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "tap",
      clickSoundVolume: 0.7,
      typingSoundEnabled: true,
      typingSoundPreset: "thock",
      typingSoundVolume: 0.85,
      musicDuckingEnabled: true,
      duckingAmount: 0.45,
    },
    customizableFields: [
      { id: "headline", label: "Command Title", placeholder: "$ npx create-domo-app", defaultValue: "$ npx create-domo-app", type: "text" },
      { id: "badge", label: "Branch / Tag", placeholder: "v1.0 • Node 22", defaultValue: "v1.0 • Node 22", type: "badge" },
      { id: "accent", label: "Terminal Green", placeholder: "#22c55e", defaultValue: "#22c55e", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "$ npx create-domo-app",
        badge: "v1.0 RELEASE",
        startTimeMs: 300,
        durationMs: 4200,
        x: 0.5,
        y: 0.08,
        fontSize: 22,
        color: "#22c55e",
        bgColor: "rgba(5, 15, 10, 0.9)",
        style: "headline",
        typography: {
          fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontWeight: "700",
          letterSpacing: "-0.01em",
        },
        badgeStyle: {
          bg: "rgba(34, 197, 94, 0.15)",
          text: "#4ade80",
          border: "rgba(34, 197, 94, 0.4)",
        },
      },
    ],
  },
  {
    id: "micro-tutorial",
    name: "30-Second Micro-Tutorial",
    tagline: "Structured step-by-step numbered callouts for documentation",
    description: "The ideal template for user documentation, knowledge base articles, and onboarding steps. Provides clean numbered step pills that guide viewer focus.",
    category: "tutorial",
    aspectRatio: "16:9",
    accentColor: "#0ea5e9",
    badge: "STEP-BY-STEP",
    badgeStyle: {
      bg: "rgba(14, 165, 233, 0.2)",
      text: "#38bdf8",
      border: "rgba(14, 165, 233, 0.4)",
    },
    motionSignature: {
      type: "step-focus",
      label: "Step-by-Step Focus Callout",
      badge: "STEP FOCUS",
      description: "Clean sequential step indicator with focused spotlight ring and tutorial callouts",
    },
    typography: {
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: "600",
      letterSpacing: "-0.01em",
      headlineClass: "font-semibold tracking-tight text-sky-200",
    },
    transitionTiming: {
      cameraLeadInMs: 300,
      entranceDurationMs: 600,
    },
    cameraPhysics: "smooth",
    looks: {
      aspectRatio: "16:9",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(135deg, #0b192c 0%, #1e3a5f 100%)",
      padding: 36,
      borderRadius: 16,
      shadow: "lift",
      windowFrame: "macos",
      tiltAngle: 0,
      cameraPhysics: "smooth",
      cursorStyle: "mac",
      showCursor: true,
      cursorSize: 1.5,
      cursorSmoothing: "cinematic",
      brandAccentColor: "#0ea5e9",
      mockupUrl: "help.domolens.dev/guides",
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "tap",
      clickSoundVolume: 0.7,
      typingSoundEnabled: true,
      typingSoundPreset: "creamy",
      typingSoundVolume: 0.6,
      musicDuckingEnabled: true,
      duckingAmount: 0.5,
    },
    customizableFields: [
      { id: "headline", label: "Step 1 Text", placeholder: "Step 1: Open Settings Panel", defaultValue: "Step 1: Open Settings Panel", type: "text" },
      { id: "badge", label: "Step Badge", placeholder: "TUTORIAL", defaultValue: "TUTORIAL", type: "badge" },
      { id: "accent", label: "Sky Accent", placeholder: "#0ea5e9", defaultValue: "#0ea5e9", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Step 1: Click Settings to configure audio",
        badge: "STEP 1 OF 3",
        startTimeMs: 400,
        durationMs: 4500,
        x: 0.5,
        y: 0.90,
        fontSize: 22,
        color: "#ffffff",
        bgColor: "rgba(11, 25, 44, 0.9)",
        style: "callout",
        typography: {
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "600",
          letterSpacing: "-0.01em",
        },
        badgeStyle: {
          bg: "rgba(14, 165, 233, 0.2)",
          text: "#38bdf8",
          border: "rgba(14, 165, 233, 0.4)",
        },
      },
    ],
  },
  {
    id: "product-hunt-teaser",
    name: "Product Hunt Teaser",
    tagline: "High-octane warm sunset gradient with clicky tactile switches",
    description: "Built to drive launch-day upvotes. Features rhythmic fast zooms, high-energy clicky switch sounds, and bright energetic typography.",
    category: "teaser",
    aspectRatio: "1:1",
    accentColor: "#ea580c",
    badge: "LIVE TODAY",
    badgeStyle: {
      bg: "rgba(234, 88, 12, 0.25)",
      text: "#fb923c",
      border: "rgba(234, 88, 12, 0.5)",
    },
    motionSignature: {
      type: "isometric-upvote",
      label: "Isometric Pitch & Upvote Burst",
      badge: "ISOMETRIC BURST",
      description: "12° dynamic 3D isometric pitch with floating, bouncing upvote badge particles",
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: "800",
      letterSpacing: "-0.03em",
      headlineClass: "font-extrabold tracking-tight text-orange-200",
    },
    transitionTiming: {
      cameraLeadInMs: 180,
      entranceDurationMs: 450,
    },
    cameraPhysics: "spring",
    looks: {
      aspectRatio: "1:1",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(135deg, #431407 0%, #9a3412 50%, #ea580c 100%)",
      padding: 30,
      borderRadius: 20,
      shadow: "glow",
      windowFrame: "macos",
      tiltAngle: 5.0,
      cameraPhysics: "spring",
      cursorStyle: "mac",
      showCursor: true,
      cursorSize: 1.6,
      cursorSmoothing: "smooth",
      brandAccentColor: "#ea580c",
      mockupUrl: "producthunt.com/posts/domolens",
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "click",
      clickSoundVolume: 0.85,
      typingSoundEnabled: true,
      typingSoundPreset: "clicky",
      typingSoundVolume: 0.75,
      musicDuckingEnabled: true,
      duckingAmount: 0.55,
    },
    customizableFields: [
      { id: "headline", label: "Launch Tagline", placeholder: "We are live on Product Hunt! 🚀", defaultValue: "We are live on Product Hunt! 🚀", type: "text" },
      { id: "badge", label: "Badge Tag", placeholder: "FEATURED #1", defaultValue: "FEATURED #1", type: "badge" },
      { id: "accent", label: "Brand Orange", placeholder: "#ea580c", defaultValue: "#ea580c", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "We are live on Product Hunt! 🚀",
        badge: "FEATURED #1",
        startTimeMs: 200,
        durationMs: 4000,
        x: 0.5,
        y: 0.08,
        fontSize: 24,
        color: "#ffffff",
        bgColor: "rgba(40, 15, 5, 0.9)",
        style: "headline",
        typography: {
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "800",
          letterSpacing: "-0.03em",
        },
        badgeStyle: {
          bg: "rgba(234, 88, 12, 0.25)",
          text: "#fb923c",
          border: "rgba(234, 88, 12, 0.5)",
        },
      },
    ],
  },
  {
    id: "enterprise-security",
    name: "Enterprise Security Demo",
    tagline: "Navy slate palette with privacy blur and silenced keystrokes",
    description: "Designed for enterprise procurement and security whitepapers. Features calm, measured camera transitions and silenced thick mechanical acoustics.",
    category: "saas",
    aspectRatio: "16:9",
    accentColor: "#38bdf8",
    badge: "SOC2 TYPE II",
    badgeStyle: {
      bg: "rgba(56, 189, 248, 0.15)",
      text: "#38bdf8",
      border: "rgba(56, 189, 248, 0.35)",
    },
    motionSignature: {
      type: "radar-scan",
      label: "Radar Grid & Laser Scanner",
      badge: "RADAR SCAN",
      description: "Solid corporate framing with high-tech blue laser scan line and radar pulse",
    },
    typography: {
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      fontWeight: "600",
      letterSpacing: "-0.01em",
      headlineClass: "font-semibold tracking-tight text-slate-100",
    },
    transitionTiming: {
      cameraLeadInMs: 350,
      entranceDurationMs: 750,
    },
    cameraPhysics: "smooth",
    looks: {
      aspectRatio: "16:9",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      padding: 38,
      borderRadius: 14,
      shadow: "lift",
      windowFrame: "macos",
      tiltAngle: 0,
      cameraPhysics: "smooth",
      cursorStyle: "mac",
      showCursor: true,
      cursorSize: 1.3,
      cursorSmoothing: "cinematic",
      brandAccentColor: "#38bdf8",
      mockupUrl: "enterprise.portal.corp",
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "tap",
      clickSoundVolume: 0.6,
      typingSoundEnabled: true,
      typingSoundPreset: "thick",
      typingSoundVolume: 0.65,
      musicDuckingEnabled: true,
      duckingAmount: 0.4,
    },
    customizableFields: [
      { id: "headline", label: "Compliance Headline", placeholder: "Role-Based Access Control (RBAC)", defaultValue: "Role-Based Access Control (RBAC)", type: "text" },
      { id: "badge", label: "Security Badge", placeholder: "ENTERPRISE", defaultValue: "ENTERPRISE", type: "badge" },
      { id: "accent", label: "Corporate Blue", placeholder: "#38bdf8", defaultValue: "#38bdf8", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Role-Based Access Control (RBAC)",
        badge: "SOC2 COMPLIANT",
        startTimeMs: 400,
        durationMs: 4200,
        x: 0.5,
        y: 0.08,
        fontSize: 22,
        color: "#ffffff",
        bgColor: "rgba(15, 23, 42, 0.9)",
        style: "headline",
        typography: {
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontWeight: "600",
          letterSpacing: "-0.01em",
        },
        badgeStyle: {
          bg: "rgba(56, 189, 248, 0.15)",
          text: "#38bdf8",
          border: "rgba(56, 189, 248, 0.35)",
        },
      },
    ],
  },
  {
    id: "interactive-click",
    name: "Interactive Click Showcase",
    tagline: "Micro-interaction focus with radar ripples and bubble bops",
    description: "Highlights tactile UI responsiveness. Every click generates an expanding sonar pulse synchronized with bubbly low-end bop audio feedback.",
    category: "showcase",
    aspectRatio: "16:9",
    accentColor: "#06b6d4",
    badge: "INTERACTIONS",
    badgeStyle: {
      bg: "rgba(6, 182, 212, 0.2)",
      text: "#22d3ee",
      border: "rgba(6, 182, 212, 0.45)",
    },
    motionSignature: {
      type: "click-ripples",
      label: "Tactile Click Shockwaves",
      badge: "TACTILE RIPPLES",
      description: "Glassmorphic frame with rhythmic simulated cursor taps and expanding ripple rings",
    },
    typography: {
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: "700",
      letterSpacing: "-0.02em",
      headlineClass: "font-bold tracking-tight text-cyan-200",
    },
    transitionTiming: {
      cameraLeadInMs: 240,
      entranceDurationMs: 550,
    },
    cameraPhysics: "spring",
    looks: {
      aspectRatio: "16:9",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(135deg, #082f49 0%, #0c4a6e 50%, #031826 100%)",
      padding: 34,
      borderRadius: 18,
      shadow: "glow",
      windowFrame: "glass",
      tiltAngle: 4.5,
      cameraPhysics: "spring",
      cursorStyle: "ring",
      showCursor: true,
      showClickRipples: true,
      cursorSize: 1.55,
      cursorSmoothing: "smooth",
      brandAccentColor: "#06b6d4",
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "bop",
      clickSoundVolume: 0.85,
      typingSoundEnabled: true,
      typingSoundPreset: "creamy",
      typingSoundVolume: 0.7,
      musicDuckingEnabled: true,
      duckingAmount: 0.5,
    },
    customizableFields: [
      { id: "headline", label: "Callout Title", placeholder: "Zero-Latency Micro Interactions", defaultValue: "Zero-Latency Micro Interactions", type: "text" },
      { id: "badge", label: "Feature Pill", placeholder: "TACTILE UI", defaultValue: "TACTILE UI", type: "badge" },
      { id: "accent", label: "Cyan Tone", placeholder: "#06b6d4", defaultValue: "#06b6d4", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Zero-Latency Micro Interactions",
        badge: "TACTILE UI",
        startTimeMs: 300,
        durationMs: 3800,
        x: 0.5,
        y: 0.08,
        fontSize: 24,
        color: "#ffffff",
        bgColor: "rgba(8, 47, 73, 0.9)",
        style: "headline",
        typography: {
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "700",
          letterSpacing: "-0.02em",
        },
        badgeStyle: {
          bg: "rgba(6, 182, 212, 0.2)",
          text: "#22d3ee",
          border: "rgba(6, 182, 212, 0.45)",
        },
      },
    ],
  },
  {
    id: "dribbble-design-reel",
    name: "Dribbble Design Reel",
    tagline: "Pastel lavender aesthetic in 4:3 with floating soft shadows",
    description: "Crafted specifically for design portfolios and Dribbble/Twitter design showcases. Elegant pastel hues, multi-layer soft shadows, and lubed creamy typing sounds.",
    category: "showcase",
    aspectRatio: "4:3",
    accentColor: "#ec4899",
    badge: "FIGMA REEL",
    badgeStyle: {
      bg: "rgba(236, 72, 153, 0.18)",
      text: "#db2777",
      border: "rgba(236, 72, 153, 0.35)",
    },
    motionSignature: {
      type: "curved-cursor",
      label: "Curved Cursor Flow & Pastel Mesh",
      badge: "CURVED CURSOR",
      description: "Fluid pastel morph with animated curved cursor gliding and click ripple",
    },
    typography: {
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      fontWeight: "600",
      letterSpacing: "-0.02em",
      headlineClass: "font-semibold tracking-tight text-pink-700",
    },
    transitionTiming: {
      cameraLeadInMs: 320,
      entranceDurationMs: 700,
    },
    cameraPhysics: "smooth",
    looks: {
      aspectRatio: "4:3",
      backgroundType: "gradient",
      backgroundValue: "linear-gradient(135deg, #fdf2f8 0%, #fae8ff 50%, #ede9fe 100%)",
      padding: 44,
      borderRadius: 24,
      shadow: "lift",
      windowFrame: "glass",
      tiltAngle: 5.5,
      cameraPhysics: "smooth",
      cursorStyle: "dot",
      showCursor: true,
      cursorSize: 1.4,
      cursorSmoothing: "cinematic",
      brandAccentColor: "#ec4899",
      mockupUrl: "figma.com/@studio/design-system",
    },
    audioSettings: {
      clickSoundEnabled: true,
      clickSoundPreset: "tap",
      clickSoundVolume: 0.6,
      typingSoundEnabled: true,
      typingSoundPreset: "creamy",
      typingSoundVolume: 0.65,
      musicDuckingEnabled: true,
      duckingAmount: 0.4,
    },
    customizableFields: [
      { id: "headline", label: "Design System Title", placeholder: "Design System v3.0 by Studio", defaultValue: "Design System v3.0 by Studio", type: "text" },
      { id: "badge", label: "Badge Label", placeholder: "FIGMA PRO", defaultValue: "FIGMA PRO", type: "badge" },
      { id: "accent", label: "Pastel Pink", placeholder: "#ec4899", defaultValue: "#ec4899", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Design System v3.0 by Studio",
        badge: "FIGMA PRO",
        startTimeMs: 400,
        durationMs: 4200,
        x: 0.5,
        y: 0.90,
        fontSize: 22,
        color: "#831843",
        bgColor: "rgba(255, 255, 255, 0.92)",
        style: "callout",
        typography: {
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "600",
          letterSpacing: "-0.02em",
        },
        badgeStyle: {
          bg: "rgba(236, 72, 153, 0.18)",
          text: "#db2777",
          border: "rgba(236, 72, 153, 0.35)",
        },
      },
    ],
  },
];

export interface GenerateTemplateKeyframesOptions {
  existingKeyframes?: KeyframeNode[];
  existingZoomBlocks?: ZoomBlock[];
  existingClicks?: ClickEvent[];
  existingInteractions?: InteractionEvent[];
}

export interface TemplateKeyframeResult {
  keyframes: KeyframeNode[];
  zoomBlocks: ZoomBlock[];
}

/**
 * Converts a template's camera physics preset to a keyframe easing curve.
 */
export function templatePhysicsToEasing(physics?: CameraPhysicsPreset): "spring" | "cubic" | "linear" {
  switch (physics) {
    case "smooth":
      return "cubic";
    case "linear":
      return "linear";
    case "snappy":
    case "spring":
    default:
      return "spring";
  }
}

/**
 * Generates or harmonizes timeline keyframes and zoom blocks reflecting a motion template's
 * camera lead-in, zoom scale, easing physics, video effects, and tactile keyboard soundscapes.
 */
export function generateTemplateKeyframes(
  template: MotionTemplate,
  videoDurationMs: number,
  options: GenerateTemplateKeyframesOptions = {}
): TemplateKeyframeResult {
  const duration = Math.max(3000, videoDurationMs || 6000);
  const easing = templatePhysicsToEasing(template.looks.cameraPhysics);
  const targetScale = template.looks.autoTrackScale || 1.5;
  const leadIn = Math.min(600, Math.max(100, template.transitionTiming?.cameraLeadInMs || 250));

  // If existing keyframes already exist on the project, harmonize their easing, sound preset, and scale
  if (options.existingKeyframes && options.existingKeyframes.length > 0) {
    const harmonizedKeyframes: KeyframeNode[] = options.existingKeyframes.map((kf) => {
      const updated: KeyframeNode = {
        ...kf,
        easing,
      };
      if (kf.sound) {
        updated.sound = kf.sound === "typing" && template.audioSettings.typingSoundPreset !== "none" ? "typing" : "click";
        updated.soundPreset =
          updated.sound === "typing"
            ? template.audioSettings.typingSoundPreset || "creamy"
            : template.audioSettings.clickSoundPreset || "bop";
      }
      return updated;
    });

    const harmonizedBlocks: ZoomBlock[] = (options.existingZoomBlocks || []).map((b) => ({
      ...b,
      scale: Math.max(1.15, Math.min(2.5, b.scale > 1 ? targetScale : b.scale)),
    }));

    return { keyframes: harmonizedKeyframes, zoomBlocks: harmonizedBlocks };
  }

  // Generate signature choreography keyframes tailored to the template's motionSignature
  const sigType = template.motionSignature?.type || "3d-gyro-float";
  const idPrefix = `kf-${template.id}`;
  const blockId = `zb-${template.id}-${Date.now()}`;

  let signatureNodes: KeyframeNode[] = [];
  let zoomBlock: ZoomBlock | null = null;

  switch (sigType) {
    case "3d-gyro-float": {
      const outMs = Math.min(4800, Math.round(duration * 0.85));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.49,
          targetY: 0.46,
          easing,
          sound: "click",
          soundPreset: "bop",
          soundVolume: 0.7,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.45),
          scale: Number((targetScale * 1.03).toFixed(2)),
          targetX: 0.52,
          targetY: 0.5,
          easing,
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.5,
        targetY: 0.48,
        scale: targetScale,
        enabled: true,
      };
      break;
    }

    case "cinematic-push": {
      const outMs = Math.min(5400, Math.round(duration * 0.9));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.5,
          targetY: 0.42,
          easing: "cubic",
          effect: "spotlight",
          effectIntensity: 0.25,
          sound: "click",
          soundPreset: "tap",
          soundVolume: 0.65,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.55),
          scale: Number((targetScale * 1.05).toFixed(2)),
          targetX: 0.54,
          targetY: 0.46,
          easing: "cubic",
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.52,
        targetY: 0.44,
        scale: targetScale,
        enabled: true,
      };
      break;
    }

    case "rhythmic-punch": {
      const outMs = Math.min(3400, Math.round(duration * 0.7));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "spring" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.48,
          targetY: 0.38,
          easing: "spring",
          effect: "glow",
          effectIntensity: 0.4,
          sound: "click",
          soundPreset: "thock",
          soundVolume: 0.8,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.48),
          scale: Number((targetScale * 0.96).toFixed(2)),
          targetX: 0.53,
          targetY: 0.56,
          easing: "spring",
          sound: "click",
          soundPreset: "thock",
          soundVolume: 0.75,
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "spring" },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.5,
        targetY: 0.45,
        scale: targetScale,
        enabled: true,
      };
      break;
    }

    case "kinetic-phone": {
      const outMs = Math.min(3200, Math.round(duration * 0.75));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "spring" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.5,
          targetY: 0.32,
          easing: "spring",
          sound: "click",
          soundPreset: "bop",
          soundVolume: 0.7,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.48),
          scale: Number((targetScale * 0.95).toFixed(2)),
          targetX: 0.5,
          targetY: 0.6,
          easing: "spring",
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "spring" },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.5,
        targetY: 0.45,
        scale: targetScale,
        enabled: true,
      };
      break;
    }

    case "cli-scanlines": {
      const outMs = Math.min(3800, Math.round(duration * 0.8));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "linear" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.45,
          targetY: 0.35,
          easing: "linear",
          effect: "glow",
          effectIntensity: 0.3,
          sound: "typing",
          soundPreset: "mechanical",
          soundVolume: 0.75,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.5),
          scale: targetScale,
          targetX: 0.48,
          targetY: 0.45,
          easing: "linear",
          sound: "typing",
          soundPreset: "mechanical",
          soundVolume: 0.75,
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "linear" },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.46,
        targetY: 0.4,
        scale: targetScale,
        enabled: true,
      };
      break;
    }

    case "step-focus": {
      const outMs = Math.min(4400, Math.round(duration * 0.85));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.35,
          targetY: 0.3,
          easing: "cubic",
          effect: "spotlight",
          effectIntensity: 0.5,
          sound: "click",
          soundPreset: "creamy",
          soundVolume: 0.7,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.5),
          scale: targetScale,
          targetX: 0.65,
          targetY: 0.55,
          easing: "cubic",
          effect: "spotlight",
          effectIntensity: 0.5,
          sound: "click",
          soundPreset: "creamy",
          soundVolume: 0.7,
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.5,
        targetY: 0.45,
        scale: targetScale,
        enabled: true,
      };
      break;
    }

    case "isometric-upvote": {
      const outMs = Math.min(3800, Math.round(duration * 0.8));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "spring" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.54,
          targetY: 0.44,
          easing: "spring",
          effect: "glow",
          effectIntensity: 0.4,
          sound: "click",
          soundPreset: "bop",
          soundVolume: 0.75,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.48),
          scale: Number((targetScale * 1.04).toFixed(2)),
          targetX: 0.5,
          targetY: 0.4,
          easing: "spring",
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "spring" },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.52,
        targetY: 0.42,
        scale: targetScale,
        enabled: true,
      };
      break;
    }

    case "radar-scan": {
      const outMs = Math.min(4200, Math.round(duration * 0.85));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.5,
          targetY: 0.4,
          easing: "cubic",
          effect: "vignette",
          effectIntensity: 0.4,
          sound: "click",
          soundPreset: "tap",
          soundVolume: 0.65,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.5),
          scale: targetScale,
          targetX: 0.55,
          targetY: 0.52,
          easing: "cubic",
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.52,
        targetY: 0.46,
        scale: targetScale,
        enabled: true,
      };
      break;
    }

    case "click-ripples": {
      const outMs = Math.min(3200, Math.round(duration * 0.75));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "spring" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.46,
          targetY: 0.36,
          easing: "spring",
          sound: "click",
          soundPreset: "bop",
          soundVolume: 0.8,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.48),
          scale: targetScale,
          targetX: 0.56,
          targetY: 0.6,
          easing: "spring",
          sound: "click",
          soundPreset: "bop",
          soundVolume: 0.8,
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "spring" },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.51,
        targetY: 0.48,
        scale: targetScale,
        enabled: true,
      };
      break;
    }

    case "curved-cursor":
    default: {
      const outMs = Math.min(4600, Math.round(duration * 0.85));
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: 0.48,
          targetY: 0.46,
          easing: "cubic",
          effect: "blur",
          effectIntensity: 0.15,
          sound: "typing",
          soundPreset: "creamy",
          soundVolume: 0.65,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: Math.round(leadIn + (outMs - leadIn) * 0.5),
          scale: Number((targetScale * 1.02).toFixed(2)),
          targetX: 0.54,
          targetY: 0.5,
          easing: "cubic",
        },
        { id: `${idPrefix}-3`, timeMs: outMs, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
      ];
      zoomBlock = {
        id: blockId,
        startTimeMs: leadIn,
        endTimeMs: outMs,
        targetX: 0.51,
        targetY: 0.48,
        scale: targetScale,
        enabled: true,
      };
      break;
    }
  }

  // Ensure timestamps are strictly non-decreasing and within duration
  signatureNodes.forEach((node, i) => {
    if (i > 0 && node.timeMs <= signatureNodes[i - 1]!.timeMs) {
      node.timeMs = signatureNodes[i - 1]!.timeMs + 50;
    }
    if (node.timeMs > duration) {
      node.timeMs = duration;
    }
  });

  return {
    keyframes: signatureNodes,
    zoomBlocks: zoomBlock ? [zoomBlock] : [],
  };
}
