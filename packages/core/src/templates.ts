import type {
  CameraPhysicsPreset,
  CameraTransitionStyle,
  ClickEvent,
  InteractionEvent,
  KeyframeNode,
  KineticVisualAccentType,
  MultiDeviceLayoutType,
  ProjectAudioSettings,
  ProjectLooks,
  TemplateTypography,
  TextOverlay,
  ZoomBlock,
} from "./project";

export type {
  CameraTransitionStyle,
  KineticVisualAccentType,
  MultiDeviceLayoutType,
  TemplateTypography,
};

/** High-impact camera transition choreography styles. */
export type { CameraTransitionStyle as TransitionStyle };

/** Transition and choreography timing specifications for a motion template. */
export interface TemplateTransitionTiming {
  /** Milliseconds delay before camera zooms in/out (defaults to 250ms). */
  cameraLeadInMs?: number;
  /** Duration in milliseconds for text overlay and element entrance animations (defaults to 500ms). */
  entranceDurationMs?: number;
  /** Signature camera transition choreography style. */
  transitionStyle?: CameraTransitionStyle;
  /** Speed ramping multiplier curve during transition peak (e.g. 1.1 - 2.5). */
  speedRampMultiplier?: number;
  /** Whip pan sweep direction for whip-pan transitions. */
  whipPanDirection?: "left" | "right" | "up" | "down";
  /** Stagger delay in milliseconds between cascade device layers. */
  cascadeStaggerMs?: number;
}

export type TemplateCategory =
  | "saas"
  | "keynote"
  | "social"
  | "developer"
  | "tutorial"
  | "teaser"
  | "showcase"
  | "mobile";

export interface TemplateCustomizableField {
  id: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  type: "text" | "color" | "image";
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
  description: string;
}

/** Photo placeholder users can fill with their own image. */
export interface TemplatePhotoSlot {
  label: string;
  shape: "circle" | "rounded" | "square";
  x: number;
  y: number;
  size: number;
}

/** Source-video size requirement for a template (e.g. mobile portrait recordings). */
export interface TemplateVideoRequirement {
  label: string;
  /** Inclusive width/height ratio range accepted. */
  minAspect: number;
  maxAspect: number;
  minWidth?: number;
  minHeight?: number;
}

export interface MotionTemplate {
  /** Optional photo placeholder (user can insert a photo). */
  photoSlot?: TemplatePhotoSlot;
  /** If set, template is disabled when the project's video does not match. */
  videoRequirement?: TemplateVideoRequirement;
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: TemplateCategory;
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3";
  accentColor: string;
  /** Kinetic visual atmospheric accent treatment replacing static indicators. */
  visualAccent?: KineticVisualAccentType;
  /** Multi-device or layered card 3D staging layout. */
  multiDeviceLayout?: MultiDeviceLayoutType;
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
    visualAccent: "specular-sweep",
    multiDeviceLayout: "dual-cascade",
    motionSignature: {
      type: "3d-gyro-float",
      label: "3D Gyro Float & Specular Sweep",
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
      transitionStyle: "perspective-cascade",
      speedRampMultiplier: 1.8,
      cascadeStaggerMs: 140,
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
      { id: "accent", label: "Brand Accent", placeholder: "#6366f1", defaultValue: "#6366f1", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Introducing DomoLens 2.0",
        startTimeMs: 300,
        durationMs: 4000,
        x: 0.5,
        y: 0.08,
        fontSize: 26,
        color: "#ffffff",
        bgColor: "rgba(15, 23, 42, 0.85)",
        style: "headline",
        motionPreset: "elastic-pop",
        cardStyle: "glass",
        typography: {
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontWeight: "800",
          letterSpacing: "-0.03em",
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
    visualAccent: "glass-sheen",
    multiDeviceLayout: "single",
    motionSignature: {
      type: "cinematic-push",
      label: "Cinematic Ken Burns Push",
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
      transitionStyle: "ken-burns",
      speedRampMultiplier: 1.2,
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
      { id: "accent", label: "Accent Color", placeholder: "#0071e3", defaultValue: "#0071e3", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Simplicity, redefined.",
        startTimeMs: 400,
        durationMs: 3800,
        x: 0.5,
        y: 0.90,
        fontSize: 22,
        color: "#0f172a",
        bgColor: "rgba(255, 255, 255, 0.9)",
        style: "callout",
        motionPreset: "blur-reveal",
        cardStyle: "glass",
        typography: {
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontWeight: "600",
          letterSpacing: "-0.015em",
        },
      },
    ],
  },
  {
    id: "feature-drop-changelog",
    name: "Feature Drop / Changelog",
    tagline: "Snappy rhythmic punch with violet mesh and spotlight pulses",
    description: "Engineered for weekly shipping updates and release notes. Highlights newly shipped buttons and interactions with energetic clack keystrokes.",
    category: "saas",
    aspectRatio: "16:9",
    accentColor: "#a855f7",
    visualAccent: "ambient-pulse",
    multiDeviceLayout: "single",
    motionSignature: {
      type: "rhythmic-punch",
      label: "Rhythmic Feature Punch-In",
      description: "Snappy camera punch zooms with rhythmic spotlight pulses and violet glow",
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
      transitionStyle: "snap-zoom",
      speedRampMultiplier: 2.2,
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
      { id: "accent", label: "Accent Color", placeholder: "#a855f7", defaultValue: "#a855f7", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Shipped: Instant Auto-Zoom",
        startTimeMs: 200,
        durationMs: 3600,
        x: 0.5,
        y: 0.08,
        fontSize: 24,
        color: "#ffffff",
        bgColor: "rgba(30, 10, 60, 0.85)",
        style: "headline",
        motionPreset: "elastic-pop",
        cardStyle: "gradient",
        typography: {
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "700",
          letterSpacing: "-0.02em",
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
    visualAccent: "kinetic-soundwave",
    multiDeviceLayout: "triple-deck",
    motionSignature: {
      type: "kinetic-phone",
      label: "Floating Phone & Kinetic Captions",
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
      transitionStyle: "whip-pan",
      whipPanDirection: "right",
      speedRampMultiplier: 2.5,
      cascadeStaggerMs: 100,
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
      { id: "accent", label: "Highlight Color", placeholder: "#facc15", defaultValue: "#facc15", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Secret Chrome Shortcut 👇",
        startTimeMs: 100,
        durationMs: 5000,
        x: 0.5,
        y: 0.12,
        fontSize: 26,
        color: "#ffffff",
        bgColor: "rgba(0, 0, 0, 0.85)",
        style: "headline",
        motionPreset: "elastic-pop",
        cardStyle: "gradient",
        typography: {
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "900",
          letterSpacing: "-0.02em",
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
    visualAccent: "crt-scanlines",
    multiDeviceLayout: "single",
    motionSignature: {
      type: "cli-scanlines",
      label: "CRT Scanlines & Command Prompt",
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
      transitionStyle: "snap-zoom",
      speedRampMultiplier: 1.8,
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
      { id: "accent", label: "Terminal Green", placeholder: "#22c55e", defaultValue: "#22c55e", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "$ npx create-domo-app",
        startTimeMs: 300,
        durationMs: 4200,
        x: 0.5,
        y: 0.08,
        fontSize: 22,
        color: "#22c55e",
        bgColor: "rgba(5, 15, 10, 0.9)",
        style: "headline",
        motionPreset: "smooth-fade",
        cardStyle: "terminal",
        typography: {
          fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontWeight: "700",
          letterSpacing: "-0.01em",
        },
      },
    ],
  },
  {
    id: "micro-tutorial",
    name: "30-Second Micro-Tutorial",
    tagline: "Structured step-by-step numbered callouts for documentation",
    description: "The ideal template for user documentation, knowledge base articles, and onboarding steps. Provides clean numbered step callouts that guide viewer focus.",
    category: "tutorial",
    aspectRatio: "16:9",
    accentColor: "#0ea5e9",
    visualAccent: "specular-sweep",
    multiDeviceLayout: "single",
    motionSignature: {
      type: "step-focus",
      label: "Step-by-Step Focus Callout",
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
      transitionStyle: "kinetic-punch",
      speedRampMultiplier: 1.5,
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
      { id: "accent", label: "Sky Accent", placeholder: "#0ea5e9", defaultValue: "#0ea5e9", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Step 1: Click Settings to configure audio",
        startTimeMs: 400,
        durationMs: 4500,
        x: 0.5,
        y: 0.90,
        fontSize: 22,
        color: "#ffffff",
        bgColor: "rgba(11, 25, 44, 0.9)",
        style: "callout",
        motionPreset: "fluid-slide",
        cardStyle: "solid",
        typography: {
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "600",
          letterSpacing: "-0.01em",
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
    visualAccent: "particle-burst",
    multiDeviceLayout: "isometric-stack",
    motionSignature: {
      type: "isometric-upvote",
      label: "Isometric Pitch & Upvote Burst",
      description: "12° dynamic 3D isometric pitch with floating, bouncing upvote particle bursts",
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
      transitionStyle: "speed-ramp",
      speedRampMultiplier: 2.4,
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
      { id: "accent", label: "Brand Orange", placeholder: "#ea580c", defaultValue: "#ea580c", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "We are live on Product Hunt! 🚀",
        startTimeMs: 200,
        durationMs: 4000,
        x: 0.5,
        y: 0.08,
        fontSize: 24,
        color: "#ffffff",
        bgColor: "rgba(40, 15, 5, 0.9)",
        style: "headline",
        motionPreset: "elastic-pop",
        cardStyle: "gradient",
        typography: {
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "800",
          letterSpacing: "-0.03em",
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
    visualAccent: "laser-radar-sweep",
    multiDeviceLayout: "single",
    motionSignature: {
      type: "radar-scan",
      label: "Radar Grid & Laser Scanner",
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
      transitionStyle: "ken-burns",
      speedRampMultiplier: 1.1,
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
      { id: "accent", label: "Corporate Blue", placeholder: "#38bdf8", defaultValue: "#38bdf8", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Role-Based Access Control (RBAC)",
        startTimeMs: 400,
        durationMs: 4200,
        x: 0.5,
        y: 0.08,
        fontSize: 22,
        color: "#ffffff",
        bgColor: "rgba(15, 23, 42, 0.9)",
        style: "headline",
        motionPreset: "smooth-fade",
        cardStyle: "solid",
        typography: {
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          fontWeight: "600",
          letterSpacing: "-0.01em",
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
    visualAccent: "tactile-shockwave",
    multiDeviceLayout: "single",
    motionSignature: {
      type: "click-ripples",
      label: "Tactile Click Shockwaves",
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
      transitionStyle: "snap-zoom",
      speedRampMultiplier: 2.0,
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
      { id: "accent", label: "Cyan Tone", placeholder: "#06b6d4", defaultValue: "#06b6d4", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Zero-Latency Micro Interactions",
        startTimeMs: 300,
        durationMs: 3800,
        x: 0.5,
        y: 0.08,
        fontSize: 24,
        color: "#ffffff",
        bgColor: "rgba(8, 47, 73, 0.9)",
        style: "headline",
        motionPreset: "whip-slide",
        cardStyle: "minimal",
        typography: {
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "700",
          letterSpacing: "-0.02em",
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
    visualAccent: "curved-cursor-glide",
    multiDeviceLayout: "triple-deck",
    motionSignature: {
      type: "curved-cursor",
      label: "Curved Cursor Flow & Pastel Mesh",
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
      transitionStyle: "whip-pan",
      whipPanDirection: "left",
      speedRampMultiplier: 2.0,
      cascadeStaggerMs: 150,
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
      { id: "accent", label: "Pastel Pink", placeholder: "#ec4899", defaultValue: "#ec4899", type: "color" },
    ],
    defaultTextOverlays: [
      {
        text: "Design System v3.0 by Studio",
        startTimeMs: 400,
        durationMs: 4200,
        x: 0.5,
        y: 0.90,
        fontSize: 22,
        color: "#831843",
        bgColor: "rgba(255, 255, 255, 0.92)",
        style: "callout",
        motionPreset: "fluid-slide",
        cardStyle: "glass",
        typography: {
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          fontWeight: "600",
          letterSpacing: "-0.02em",
        },
      },
    ],
  },
];

const viralBase = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "viral-short-tiktok")!;
const MOBILE_REQUIREMENT: TemplateVideoRequirement = {
  label: "Needs a portrait phone recording (9:16, about 1080x1920)",
  minAspect: 0.5,
  maxAspect: 0.62,
  minWidth: 540,
  minHeight: 960,
};

STUDIO_MOTION_TEMPLATES.push(
  {
    ...viralBase,
    id: "mobile-app-showcase",
    name: "Mobile App Showcase",
    tagline: "Phone-shaped hero with floating device and spring captions",
    description: "Made for app store previews and launch posts. Requires a 9:16 phone screen recording.",
    category: "mobile",
    accentColor: "#38bdf8",
    visualAccent: "specular-sweep",
    looks: {
      ...viralBase.looks,
      backgroundValue: "linear-gradient(160deg, #0b1220 0%, #1e3a5f 55%, #0ea5e9 130%)",
      brandAccentColor: "#38bdf8",
      cursorStyle: "dot",
      cursorSize: 2,
      tiltAngle: 4,
    },
    customizableFields: [
      { id: "headline", label: "App Headline", placeholder: "Meet your new favorite app", defaultValue: "Meet your new favorite app", type: "text" },
      { id: "accent", label: "Accent Color", placeholder: "#38bdf8", defaultValue: "#38bdf8", type: "color" },
    ],
    defaultTextOverlays: viralBase.defaultTextOverlays.map((o) => ({
      ...o,
      text: "Meet your new favorite app",
      motionPreset: "whip-slide" as typeof o.motionPreset,
    })),
    videoRequirement: MOBILE_REQUIREMENT,
    photoSlot: { label: "App icon / logo photo", shape: "rounded", x: 0.5, y: 0.1, size: 0.16 },
  },
  {
    ...viralBase,
    id: "mobile-story-reel",
    name: "Mobile Story Reel",
    tagline: "Warm editorial gradient with blur-reveal caption for in-app flows",
    description: "Story-style walkthrough for mobile flows. Requires a 9:16 phone screen recording.",
    category: "mobile",
    accentColor: "#fb7185",
    looks: {
      ...viralBase.looks,
      backgroundValue: "linear-gradient(200deg, #fde68a 0%, #fb7185 60%, #7c3aed 120%)",
      brandAccentColor: "#fb7185",
      cursorStyle: "dot",
      cursorSize: 2.1,
    },
    customizableFields: [
      { id: "headline", label: "Story Caption", placeholder: "Swipe through in seconds", defaultValue: "Swipe through in seconds", type: "text" },
      { id: "accent", label: "Accent Color", placeholder: "#fb7185", defaultValue: "#fb7185", type: "color" },
    ],
    defaultTextOverlays: viralBase.defaultTextOverlays.map((o) => ({
      ...o,
      text: "Swipe through in seconds",
      motionPreset: "blur-reveal" as typeof o.motionPreset,
    })),
    videoRequirement: MOBILE_REQUIREMENT,
    photoSlot: { label: "Profile photo", shape: "circle", x: 0.5, y: 0.1, size: 0.18 },
  },
);

// Every template gets a user photo placeholder.
const PHOTO_SLOT_BY_CATEGORY: Record<TemplateCategory, TemplatePhotoSlot> = {
  saas: { label: "Logo / product photo", shape: "rounded", x: 0.9, y: 0.12, size: 0.1 },
  keynote: { label: "Presenter photo", shape: "circle", x: 0.1, y: 0.14, size: 0.09 },
  social: { label: "Creator photo", shape: "circle", x: 0.5, y: 0.1, size: 0.18 },
  developer: { label: "Avatar photo", shape: "square", x: 0.92, y: 0.12, size: 0.08 },
  tutorial: { label: "Instructor photo", shape: "circle", x: 0.9, y: 0.14, size: 0.1 },
  teaser: { label: "Maker photo", shape: "circle", x: 0.12, y: 0.12, size: 0.14 },
  showcase: { label: "Designer photo", shape: "rounded", x: 0.88, y: 0.14, size: 0.12 },
  mobile: { label: "App icon / photo", shape: "rounded", x: 0.5, y: 0.1, size: 0.16 },
};
for (const t of STUDIO_MOTION_TEMPLATES) {
  t.photoSlot ??= PHOTO_SLOT_BY_CATEGORY[t.category];
  if (!t.customizableFields.some((f) => f.type === "image")) {
    t.customizableFields = [
      ...t.customizableFields,
      { id: "photo", label: t.photoSlot.label, placeholder: "Choose a photo", defaultValue: "", type: "image" },
    ];
  }
}

/** Checks whether a project's source video satisfies a template's size requirement. */
export function checkTemplateVideoFit(
  template: Pick<MotionTemplate, "videoRequirement">,
  width?: number | null,
  height?: number | null,
): { ok: boolean; reason?: string } {
  const req = template.videoRequirement;
  if (!req) return { ok: true };
  if (!width || !height) return { ok: true };
  const aspect = width / height;
  if (aspect < req.minAspect || aspect > req.maxAspect) return { ok: false, reason: req.label };
  if ((req.minWidth && width < req.minWidth) || (req.minHeight && height < req.minHeight)) {
    return { ok: false, reason: req.label };
  }
  return { ok: true };
}


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
 * Upgraded to incorporate high-impact transitions (snap zooms, whip pans, speed ramps, and cascades).
 */
export function generateTemplateKeyframes(
  template: MotionTemplate,
  videoDurationMs: number,
  options: GenerateTemplateKeyframesOptions = {}
): TemplateKeyframeResult {
  // 1. Sanitize video duration: positive finite number, default 6000ms, minimum 1000ms
  const safeDuration =
    typeof videoDurationMs === "number" && Number.isFinite(videoDurationMs) && videoDurationMs > 0
      ? Math.max(1000, videoDurationMs)
      : 6000;
  const duration = safeDuration;

  const easing = templatePhysicsToEasing(template.looks.cameraPhysics);
  const targetScale =
    typeof template.looks.autoTrackScale === "number" &&
    Number.isFinite(template.looks.autoTrackScale) &&
    template.looks.autoTrackScale >= 1.0
      ? template.looks.autoTrackScale
      : 1.5;

  // Camera lead-in: clamped between 100ms and safeDuration * 0.25 (up to 600ms)
  const rawLeadIn = template.transitionTiming?.cameraLeadInMs;
  const nominalLeadIn = typeof rawLeadIn === "number" && Number.isFinite(rawLeadIn) ? rawLeadIn : 250;
  const maxLeadIn = Math.min(600, Math.max(100, Math.round(safeDuration * 0.25)));
  const leadIn = Math.min(maxLeadIn, Math.max(100, nominalLeadIn));

  // Transition style, speed-ramp multiplier, and whip pan direction
  const transitionStyle = template.transitionTiming?.transitionStyle;
  const rawSpeedRamp = template.transitionTiming?.speedRampMultiplier;
  const speedRamp =
    typeof rawSpeedRamp === "number" && Number.isFinite(rawSpeedRamp) && rawSpeedRamp > 0
      ? Math.max(0.5, Math.min(4.0, rawSpeedRamp))
      : 1.0;
  const whipPanDir = template.transitionTiming?.whipPanDirection || "right";

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

  // Determine motion choreography signature (fall back to transitionStyle if motionSignature is omitted)
  let sigType = template.motionSignature?.type;
  if (!sigType) {
    switch (transitionStyle) {
      case "ken-burns":
        sigType = "cinematic-push";
        break;
      case "whip-pan":
        sigType = "kinetic-phone";
        break;
      case "snap-zoom":
        sigType = "rhythmic-punch";
        break;
      case "speed-ramp":
        sigType = "isometric-upvote";
        break;
      case "kinetic-punch":
        sigType = "step-focus";
        break;
      case "perspective-cascade":
      default:
        sigType = "3d-gyro-float";
        break;
    }
  }

  const idPrefix = `kf-${template.id}`;
  const blockId = `zb-${template.id}-${Date.now()}`;

  // Speed ramp pacing ratio: higher speed ramp accelerates attack towards apex
  const rampPacing = Math.max(0.25, Math.min(0.65, 0.48 / Math.sqrt(speedRamp)));

  let signatureNodes: KeyframeNode[] = [];
  let zoomBlock: ZoomBlock | null = null;

  switch (sigType) {
    case "3d-gyro-float": {
      // Perspective cascade transition with 3D gyroscopic drift
      const outMs = Math.min(4800, Math.round(duration * 0.85));
      const midTime = Math.min(outMs - 200, Math.round(leadIn + (outMs - leadIn) * 0.45));
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
          timeMs: midTime,
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
      // Silky Ken Burns slow camera push with pristine silver spotlight bloom
      const outMs = Math.min(5400, Math.round(duration * 0.9));
      const midTime = Math.min(outMs - 250, Math.round(leadIn + (outMs - leadIn) * 0.55));
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
          timeMs: midTime,
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
      // Snappy snap-zoom punch with dynamic spring overshoot and violet glow
      const outMs = Math.min(3400, Math.round(duration * 0.7));
      const punchSettle = Math.min(outMs - 200, Math.round(leadIn + (outMs - leadIn) * 0.48));
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
          timeMs: punchSettle,
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
      // High-energy whip pan lateral transition and vertical phone framing
      const outMs = Math.min(3200, Math.round(duration * 0.75));
      const midTime = Math.min(outMs - 200, Math.round(leadIn + (outMs - leadIn) * 0.48));
      const whipTargetX = whipPanDir === "right" ? 0.52 : 0.48;
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "spring" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: whipTargetX,
          targetY: 0.32,
          easing: "spring",
          sound: "click",
          soundPreset: "bop",
          soundVolume: 0.7,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: midTime,
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
      // Terminal scanline snap zoom with typewriter mechanical thocks
      const outMs = Math.min(3800, Math.round(duration * 0.8));
      const midTime = Math.min(outMs - 250, Math.round(leadIn + (outMs - leadIn) * 0.5));
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
          timeMs: midTime,
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
      // Kinetic punch step-by-step sequential spotlight focus
      const outMs = Math.min(4400, Math.round(duration * 0.85));
      const midTime = Math.min(outMs - 250, Math.round(leadIn + (outMs - leadIn) * 0.5));
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
          timeMs: midTime,
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
      // High-octane speed ramp with 3D isometric pitch and upvote particle burst
      const outMs = Math.min(3800, Math.round(safeDuration * 0.8));
      const midTime = Math.min(outMs - 200, Math.round(leadIn + (outMs - leadIn) * rampPacing));
      const rampScaleBoost = Number((1.0 + 0.02 * speedRamp).toFixed(2));
      const rampGlowIntensity = Math.min(0.8, Number((0.25 * speedRamp).toFixed(2)));

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
          effectIntensity: rampGlowIntensity,
          sound: "click",
          soundPreset: "bop",
          soundVolume: 0.75,
        },
        {
          id: `${idPrefix}-2`,
          timeMs: midTime,
          scale: Number((targetScale * rampScaleBoost).toFixed(2)),
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
      // Measured enterprise Ken Burns push with laser radar sweep & vignette
      const outMs = Math.min(4200, Math.round(duration * 0.85));
      const midTime = Math.min(outMs - 250, Math.round(leadIn + (outMs - leadIn) * 0.5));
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
          timeMs: midTime,
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
      // Zero-latency snap zoom synchronized with expanding tactile shockwaves
      const outMs = Math.min(3200, Math.round(duration * 0.75));
      const midTime = Math.min(outMs - 200, Math.round(leadIn + (outMs - leadIn) * 0.48));
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
          timeMs: midTime,
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
      // Fluid whip-pan into organic curved cursor flow in 4:3 canvas
      const outMs = Math.min(4600, Math.round(duration * 0.85));
      const midTime = Math.min(outMs - 250, Math.round(leadIn + (outMs - leadIn) * 0.5));
      const whipTargetX = whipPanDir === "left" ? 0.47 : 0.53;
      signatureNodes = [
        { id: `${idPrefix}-0`, timeMs: 0, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
        {
          id: `${idPrefix}-1`,
          timeMs: leadIn,
          scale: targetScale,
          targetX: whipTargetX,
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
          timeMs: midTime,
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

  // Ensure zoom block has at least 500ms duration and stays within safeDuration
  if (zoomBlock) {
    const minZoomDuration = 500;
    if (zoomBlock.endTimeMs <= zoomBlock.startTimeMs + minZoomDuration) {
      zoomBlock.endTimeMs = Math.min(safeDuration, zoomBlock.startTimeMs + minZoomDuration);
    }
    if (zoomBlock.endTimeMs > safeDuration) {
      zoomBlock.endTimeMs = safeDuration;
    }
    if (zoomBlock.startTimeMs >= zoomBlock.endTimeMs) {
      zoomBlock.startTimeMs = Math.max(0, zoomBlock.endTimeMs - minZoomDuration);
    }
    // Sync the outro keyframe with zoomBlock.endTimeMs
    if (signatureNodes.length > 0) {
      signatureNodes[signatureNodes.length - 1]!.timeMs = zoomBlock.endTimeMs;
    }
  }

  // Enforce strictly non-decreasing, non-negative, and forward-spaced timestamps
  const minSpacing = 50;
  for (let i = 0; i < signatureNodes.length; i++) {
    const node = signatureNodes[i]!;
    if (i === 0) {
      node.timeMs = 0;
    } else {
      if (node.timeMs <= signatureNodes[i - 1]!.timeMs) {
        node.timeMs = signatureNodes[i - 1]!.timeMs + minSpacing;
      }
    }
  }

  // Backward pass: if any keyframe exceeds safeDuration, cascade backward cleanly
  const lastIndex = signatureNodes.length - 1;
  if (lastIndex >= 0 && signatureNodes[lastIndex]!.timeMs > safeDuration) {
    signatureNodes[lastIndex]!.timeMs = safeDuration;
    for (let j = lastIndex - 1; j >= 0; j--) {
      if (signatureNodes[j]!.timeMs >= signatureNodes[j + 1]!.timeMs) {
        signatureNodes[j]!.timeMs = Math.max(0, signatureNodes[j + 1]!.timeMs - minSpacing);
      }
    }
  }

  // Final check: clamp targetX/targetY, scale >= 1.0, zero NaN/Infinity
  signatureNodes.forEach((node) => {
    if (!Number.isFinite(node.timeMs) || node.timeMs < 0) node.timeMs = 0;
    if (!Number.isFinite(node.scale) || node.scale < 1.0) node.scale = 1.0;
    if (!Number.isFinite(node.targetX)) node.targetX = 0.5;
    if (!Number.isFinite(node.targetY)) node.targetY = 0.5;
    node.targetX = Math.max(0, Math.min(1, node.targetX));
    node.targetY = Math.max(0, Math.min(1, node.targetY));
  });

  return {
    keyframes: signatureNodes,
    zoomBlocks: zoomBlock ? [zoomBlock] : [],
  };
}
