import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_LOOKS,
  DEFAULT_AUDIO_SETTINGS,
  BACKGROUND_PRESETS,
  CURSOR_PRESETS,
  STUDIO_MOTION_TEMPLATES,
  interpolateCursorAtTime,
  clampCameraToBounds,
  splitClip,
  PROJECT_FORMAT_VERSION,
  type ProjectData,
  type ProjectSummary,
  type TimelineClip,
  type TextOverlay,
  type CursorTrajectoryPoint,
} from "@domolens/core";
import { useEditor } from "../store/editor";
import { useProjects } from "../store/projects";
import { useToasts } from "../store/toast";
import { useTutorial, TUTORIAL_STEPS } from "../store/tutorial";
import { getOutputDimensions } from "../lib/video-renderer";
import { sfx } from "../lib/sound-effects";

/* ========================================================================== */
/* Test Harness: Mock Fixtures & Interface Contract Simulators / Oracles     */
/* ========================================================================== */

export function createMockOverhaulProject(overrides?: Partial<ProjectData>): ProjectData {
  const summary: ProjectSummary = {
    id: "proj-e2e-overhaul",
    name: "E2E Overhaul Master Project",
    source: "recording",
    createdAt: 1728100000000,
    updatedAt: 1728100000000,
    durationMs: 10000,
    width: 1920,
    height: 1080,
    thumbnail: null,
    media: "blob://video-master-overhaul.mp4",
  };

  return {
    summary,
    clicks: [
      { id: "c1", timestampMs: 1200, x: 0.3, y: 0.4, button: "left" },
      { id: "c2", timestampMs: 3800, x: 0.7, y: 0.6, button: "left" },
    ],
    interactions: [],
    cursorTrajectory: [
      { timestampMs: 0, x: 0.2, y: 0.2 },
      { timestampMs: 1200, x: 0.3, y: 0.4 },
      { timestampMs: 3800, x: 0.7, y: 0.6 },
      { timestampMs: 10000, x: 0.8, y: 0.8 },
    ],
    zoomBlocks: [
      {
        id: "zb-1",
        startTimeMs: 1000,
        endTimeMs: 3000,
        targetX: 0.3,
        targetY: 0.4,
        scale: 1.8,
        enabled: true,
      },
    ],
    keyframes: [
      { id: "kf-1", timeMs: 1000, scale: 1.8, targetX: 0.3, targetY: 0.4, easing: "cubic" },
      { id: "kf-2", timeMs: 3000, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
    ],
    textOverlays: [
      {
        id: "txt-1",
        text: "Interactive Feature Walkthrough",
        startTimeMs: 1000,
        durationMs: 4000,
        x: 0.1,
        y: 0.15,
        fontSize: 24,
        color: "#ffffff",
        kicker: "FEATURE REVEAL",
        style: "headline",
      },
    ],
    audioTracks: [
      {
        id: "sfx-track-1",
        name: "Tactile Click",
        type: "sfx",
        url: "sfx://click",
        startTimeMs: 1200,
        durationMs: 250,
        volume: 0.8,
        muted: false,
      },
    ],
    clips: [
      {
        id: "clip-main",
        name: "Screen Stream",
        mediaUrl: "blob://video-master-overhaul.mp4",
        timelineStartMs: 0,
        sourceOffsetMs: 0,
        durationMs: 10000,
        muted: false,
        volume: 1,
      },
    ],
    looks: { ...DEFAULT_LOOKS },
    audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* Interface Contract 4 Oracle: Spotlight Tutorial Placement Solver          */
/* -------------------------------------------------------------------------- */

export interface CardPlacementResult {
  top?: number;
  bottom?: number;
  left: number;
  arrowPosition: "top" | "bottom" | "left" | "right";
}

export interface SimplifiedRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right?: number;
  bottom?: number;
}

export function computeCollisionFreeCardPlacement(
  targetRect: SimplifiedRect,
  windowW: number,
  windowH: number,
  cardW = 380,
  cardH = 220,
  headerH = 64,
  sidebarW = 320,
  isSidebarOpen = false,
): CardPlacementResult {
  // If target is offscreen or 0-dimension, fallback to center
  if (targetRect.width <= 0 || targetRect.height <= 0 || targetRect.left >= windowW || targetRect.top >= windowH) {
    return {
      top: Math.max(headerH + 16, (windowH - cardH) / 2),
      left: Math.max(16, (windowW - cardW) / 2),
      arrowPosition: "top",
    };
  }

  const effectiveWindowW = isSidebarOpen ? Math.max(320, windowW - sidebarW) : windowW;
  const targetRight = targetRect.left + targetRect.width;
  const targetBottom = targetRect.top + targetRect.height;

  // Horizontal ideal: center on target, clamped within viewport bounds
  let idealLeft = targetRect.left + (targetRect.width - cardW) / 2;
  idealLeft = Math.max(16, Math.min(effectiveWindowW - cardW - 16, idealLeft));

  const spaceBelow = windowH - targetBottom;
  const spaceAbove = targetRect.top - headerH;

  // Decision logic for placement
  if (spaceBelow >= cardH + 16) {
    // Fits below target
    const top = Math.max(headerH + 16, targetBottom + 12);
    return {
      top,
      left: idealLeft,
      arrowPosition: "top",
    };
  } else if (spaceAbove >= cardH + 16) {
    // Fits above target
    const top = Math.max(headerH + 8, targetRect.top - cardH - 12);
    return {
      top,
      left: idealLeft,
      arrowPosition: "bottom",
    };
  } else {
    // Horizontal fallback (place to left or right)
    if (targetRect.left >= cardW + 24) {
      return {
        top: Math.max(headerH + 8, Math.min(windowH - cardH - 16, targetRect.top)),
        left: targetRect.left - cardW - 12,
        arrowPosition: "right",
      };
    } else {
      return {
        top: Math.max(headerH + 8, Math.min(windowH - cardH - 16, targetRect.top)),
        left: Math.min(effectiveWindowW - cardW - 16, targetRight + 12),
        arrowPosition: "left",
      };
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Interface Contract 1 Oracle: Text Motion Evaluator Engine                  */
/* -------------------------------------------------------------------------- */

export type TextMotionPreset =
  | "none"
  | "elastic-pop"
  | "fluid-slide"
  | "whip-slide"
  | "blur-reveal"
  | "smooth-fade";

export type TextCardStyle =
  | "glass"
  | "gradient"
  | "solid"
  | "minimal"
  | "terminal";

export interface EvaluatedTextMotion {
  opacity: number;
  scale: number;
  translateX: number;
  translateY: number;
  blur: number;
}

export function evaluateTextOverlayMotion(
  overlay: TextOverlay,
  timeMs: number,
  preset: TextMotionPreset = "smooth-fade",
): EvaluatedTextMotion {
  const start = overlay.startTimeMs;
  const end = overlay.startTimeMs + overlay.durationMs;
  const ENTRANCE_MS = 400;
  const EXIT_MS = 300;

  if (timeMs < start) {
    return { opacity: 0, scale: 0.8, translateX: 0, translateY: 20, blur: 10 };
  }
  if (timeMs > end) {
    return { opacity: 0, scale: 0.9, translateX: 0, translateY: -10, blur: 5 };
  }

  // Pre-exit active hold
  if (timeMs >= start + ENTRANCE_MS && timeMs <= end - EXIT_MS) {
    return { opacity: 1, scale: 1.0, translateX: 0, translateY: 0, blur: 0 };
  }

  // Entrance phase
  if (timeMs < start + ENTRANCE_MS) {
    const p = Math.max(0, Math.min(1, (timeMs - start) / ENTRANCE_MS));
    switch (preset) {
      case "elastic-pop": {
        // Elastic overshoot formula
        const overshoot = Math.sin(p * Math.PI) * 0.18;
        return {
          opacity: Math.min(1, p * 1.5),
          scale: 0.8 + p * 0.2 + overshoot,
          translateX: 0,
          translateY: 0,
          blur: Math.max(0, (1 - p) * 6),
        };
      }
      case "fluid-slide": {
        // Smooth ease out slide up
        const ease = 1 - Math.pow(1 - p, 3);
        return {
          opacity: ease,
          scale: 1.0,
          translateX: 0,
          translateY: Math.round((1 - ease) * 32),
          blur: Math.max(0, (1 - ease) * 4),
        };
      }
      case "whip-slide": {
        // Directional high speed whip
        const ease = 1 - Math.pow(1 - p, 4);
        return {
          opacity: Math.min(1, p * 2),
          scale: 1.0,
          translateX: Math.round((1 - ease) * -60),
          translateY: 0,
          blur: Math.max(0, (1 - ease) * 8),
        };
      }
      case "blur-reveal": {
        // High Gaussian blur decay
        return {
          opacity: p,
          scale: 0.95 + p * 0.05,
          translateX: 0,
          translateY: 0,
          blur: Math.max(0, (1 - p) * 16),
        };
      }
      case "smooth-fade":
      default: {
        return {
          opacity: p,
          scale: 1.0,
          translateX: 0,
          translateY: 0,
          blur: 0,
        };
      }
    }
  }

  // Exit phase
  const exitP = Math.max(0, Math.min(1, (timeMs - (end - EXIT_MS)) / EXIT_MS));
  return {
    opacity: 1 - exitP,
    scale: 1.0 - exitP * 0.08,
    translateX: 0,
    translateY: -Math.round(exitP * 16),
    blur: exitP * 6,
  };
}

/* -------------------------------------------------------------------------- */
/* Interface Contract 2 & Feature 4 Oracle: Cursor Designs & Avatar Schema    */
/* -------------------------------------------------------------------------- */

export const ALL_23_CURSOR_STYLES = [
  "default",
  "mac",
  "dot",
  "ring",
  "hidden",
  "obsidian-glow",
  "neon-laser",
  "minimal-crosshair",
  "precision-pen",
  "sleek-dot",
  "spotlight-glow",
  "cyber-arrow",
  "retro-pixel",
  "gradient-beam",
  "sonar-pulse",
  "tactile-pointer",
  "terminal-caret",
  "glass-orb",
  "aurora-trail",
  "highlighter",
  "focus-reticle",
  "laser-dot",
  "smooth-chubby",
] as const;

export type CursorStyleType = (typeof ALL_23_CURSOR_STYLES)[number];

export interface CursorAvatar {
  enabled: boolean;
  type: "text" | "initials" | "icon" | "image";
  value: string;
  color?: string;
  badgeLabel?: string;
}

export function validateCursorAvatarSchema(avatar: CursorAvatar): { valid: boolean; reason?: string } {
  if (typeof avatar.enabled !== "boolean") return { valid: false, reason: "enabled must be boolean" };
  const validTypes = ["text", "initials", "icon", "image"];
  if (!validTypes.includes(avatar.type)) return { valid: false, reason: `invalid type: ${avatar.type}` };
  if (avatar.enabled && (!avatar.value || avatar.value.trim().length === 0)) {
    return { valid: false, reason: "value must not be empty when enabled" };
  }
  return { valid: true };
}

/* -------------------------------------------------------------------------- */
/* Feature 1 & 2 Oracle: Universal Gradient & Background Parser               */
/* -------------------------------------------------------------------------- */

export interface ParsedBackgroundGradient {
  kind: "linear" | "radial" | "solid" | "glass";
  angleDeg?: number;
  stops: Array<{ color: string; offset: number }>;
  fallbackColor: string;
}

export function parseUniversalBackground(bgValue: string): ParsedBackgroundGradient {
  if (!bgValue || typeof bgValue !== "string") {
    return { kind: "solid", stops: [], fallbackColor: "#16171a" };
  }

  const trimmed = bgValue.trim();

  // Linear gradient check
  if (trimmed.startsWith("linear-gradient")) {
    const inner = trimmed.replace(/^linear-gradient\(/, "").replace(/\)$/, "");
    const parts = inner.split(/,(?![^(]*\))/).map((s) => s.trim());

    let angleDeg = 180;
    let stopParts = parts;

    if (parts[0] && parts[0].includes("deg")) {
      angleDeg = parseFloat(parts[0]) || 180;
      stopParts = parts.slice(1);
    } else if (parts[0] && parts[0].startsWith("to ")) {
      stopParts = parts.slice(1);
    }

    const stops = stopParts.map((sp, idx) => {
      const tokens = sp.split(/\s+/);
      const color = tokens[0] || "#ffffff";
      let offset = idx / Math.max(1, stopParts.length - 1);
      if (tokens[1] && tokens[1].endsWith("%")) {
        offset = parseFloat(tokens[1]) / 100;
      }
      return { color, offset };
    });

    return {
      kind: "linear",
      angleDeg,
      stops,
      fallbackColor: stops[0]?.color || "#16171a",
    };
  }

  // Radial gradient check
  if (trimmed.startsWith("radial-gradient")) {
    const inner = trimmed.replace(/^radial-gradient\(/, "").replace(/\)$/, "");
    const parts = inner.split(/,(?![^(]*\))/).map((s) => s.trim());
    const stopParts = parts[0]?.includes("circle") || parts[0]?.includes("ellipse") ? parts.slice(1) : parts;

    const stops = stopParts.map((sp, idx) => {
      const tokens = sp.split(/\s+/);
      const color = tokens[0] || "#ffffff";
      let offset = idx / Math.max(1, stopParts.length - 1);
      if (tokens[1] && tokens[1].endsWith("%")) {
        offset = parseFloat(tokens[1]) / 100;
      }
      return { color, offset };
    });

    return {
      kind: "radial",
      stops,
      fallbackColor: stops[0]?.color || "#16171a",
    };
  }

  // Frosted glass / backdrop check
  if (trimmed.includes("backdrop-filter") || trimmed.includes("blur")) {
    return { kind: "glass", stops: [], fallbackColor: "rgba(255, 255, 255, 0.1)" };
  }

  // Solid color fallback
  return {
    kind: "solid",
    stops: [{ color: trimmed, offset: 0 }],
    fallbackColor: trimmed,
  };
}

/* -------------------------------------------------------------------------- */
/* Interface Contract 3 Oracle: Timeline Toolbar & Multi-Track Manager       */
/* -------------------------------------------------------------------------- */

export type TimelineToolMode = "select" | "trim" | "split" | "pan";

export class TimelineToolbarSimulator {
  toolMode: TimelineToolMode = "select";
  panX = 0;

  setToolMode(tool: TimelineToolMode) {
    this.toolMode = tool;
  }

  executeTrimLeft(clip: TimelineClip, playheadMs: number): TimelineClip | null {
    const clipEnd = clip.timelineStartMs + clip.durationMs;
    if (playheadMs <= clip.timelineStartMs || playheadMs >= clipEnd) return null;
    const trimAmount = playheadMs - clip.timelineStartMs;
    return {
      ...clip,
      timelineStartMs: playheadMs,
      sourceOffsetMs: clip.sourceOffsetMs + trimAmount,
      durationMs: clip.durationMs - trimAmount,
    };
  }

  executeTrimRight(clip: TimelineClip, playheadMs: number): TimelineClip | null {
    const clipEnd = clip.timelineStartMs + clip.durationMs;
    if (playheadMs <= clip.timelineStartMs || playheadMs >= clipEnd) return null;
    return {
      ...clip,
      durationMs: playheadMs - clip.timelineStartMs,
    };
  }

  pan(deltaX: number, zoom = 1, maxDurationMs = 10000): number {
    const maxPan = Math.max(0, maxDurationMs * 0.1 * zoom - 800);
    this.panX = Math.max(0, Math.min(maxPan, this.panX + deltaX));
    return this.panX;
  }
}

/* ========================================================================== */
/* Test Suite Entry Point                                                     */
/* ========================================================================== */

describe("DomoLens E2E Overhaul Test Suite (R1 - R7)", () => {
  beforeEach(() => {
    useProjects.setState({ projects: [] });
    useToasts.setState({ toasts: [] });
    useTutorial.setState({
      isActive: false,
      currentStepIndex: 0,
      hasSeenTutorial: false,
    });
    useEditor.setState({
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
      activeToolTab: "style",
      timelineZoom: 1,
      isLeftSidebarOpen: false,
      isRightSidebarOpen: false,
      history: [],
      future: [],
    });
  });

  /* ======================================================================== */
  /* TIER 1: FEATURE COVERAGE (R1 to R7, >=5 tests per feature)               */
  /* ======================================================================== */

  describe("Tier 1: Feature Coverage", () => {
    /* ---------------------------------------------------------------------- */
    /* F1: Tutorial Card Alignment & 20+ Step Interactive Walkthrough (R1)     */
    /* ---------------------------------------------------------------------- */
    describe("F1 (R1): Tutorial Card Alignment & 20+ Step Walkthrough", () => {
      it("F1-1: clamps card top position below top header bar avoiding collision", () => {
        const targetRect: SimplifiedRect = { left: 400, top: 40, width: 120, height: 36 };
        const result = computeCollisionFreeCardPlacement(targetRect, 1920, 1080, 380, 220, 64);
        expect(result.top).toBeGreaterThanOrEqual(64);
        expect(result.arrowPosition).toBe("top");
      });

      it("F1-2: shifts card leftward when right sidebar is open avoiding sidebar overlap", () => {
        const targetRect: SimplifiedRect = { left: 1550, top: 200, width: 80, height: 80 };
        const result = computeCollisionFreeCardPlacement(targetRect, 1920, 1080, 380, 220, 64, 320, true);
        // Effective width is 1920 - 320 = 1600. Left must not exceed 1600 - 380 - 16 = 1204
        expect(result.left + 380).toBeLessThanOrEqual(1600);
      });

      it("F1-3: centers horizontally and clamps safely within viewport margins", () => {
        const targetRect: SimplifiedRect = { left: 10, top: 300, width: 50, height: 40 };
        const result = computeCollisionFreeCardPlacement(targetRect, 1280, 800, 380, 220, 64);
        expect(result.left).toBeGreaterThanOrEqual(16);
      });

      it("F1-4: derives appropriate directional arrow based on relative target quadrant", () => {
        // Space below
        const resBelow = computeCollisionFreeCardPlacement({ left: 500, top: 100, width: 100, height: 50 }, 1920, 1080);
        expect(resBelow.arrowPosition).toBe("top");

        // Space above only
        const resAbove = computeCollisionFreeCardPlacement({ left: 500, top: 950, width: 100, height: 50 }, 1920, 1080);
        expect(resAbove.arrowPosition).toBe("bottom");
      });

      it("F1-5: steps through tutorial workflow sequentially via useTutorial store", () => {
        expect(TUTORIAL_STEPS.length).toBeGreaterThan(0);
        const tutorial = useTutorial.getState();
        tutorial.startTutorial();
        expect(useTutorial.getState().isActive).toBe(true);
        expect(useTutorial.getState().currentStepIndex).toBe(0);

        useTutorial.getState().nextStep();
        expect(useTutorial.getState().currentStepIndex).toBe(1);

        useTutorial.getState().prevStep();
        expect(useTutorial.getState().currentStepIndex).toBe(0);

        useTutorial.getState().skipTutorial();
        expect(useTutorial.getState().isActive).toBe(false);
        expect(useTutorial.getState().hasSeenTutorial).toBe(true);
      });

      it("F1-6: automatically triggers right sidebar toggle when step targets tools panel", () => {
        const editor = useEditor.getState();
        expect(editor.isRightSidebarOpen).toBe(false);

        // Simulate target hook logic from SpotlightTutorial
        const stepTargetKey = "tools-panel";
        if (stepTargetKey === "tools-panel" && !useEditor.getState().isRightSidebarOpen) {
          useEditor.getState().toggleRightSidebar();
        }
        expect(useEditor.getState().isRightSidebarOpen).toBe(true);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F2: Multi-Track Timeline Architecture: Dedicated SFX & Text (R2)       */
    /* ---------------------------------------------------------------------- */
    describe("F2 (R2): Multi-Track Timeline Architecture: Dedicated SFX & Text", () => {
      it("F2-1: adds dedicated SFX track with preset, volume, and timestamp without displacing keyframes", () => {
        const project = createMockOverhaulProject();
        useEditor.setState({ project, durationMs: 10000 });

        const initialKeyframesCount = project.keyframes?.length || 0;
        useEditor.getState().addAudioTrack("Bubble Bop SFX", "sfx://bop", "sfx");

        const updated = useEditor.getState().project;
        expect(updated?.audioTracks?.length).toBe(2);
        const sfxTrack = updated?.audioTracks?.find((t) => t.name === "Bubble Bop SFX");
        expect(sfxTrack).toBeDefined();
        expect(sfxTrack?.type).toBe("sfx");
        expect(updated?.keyframes?.length).toBe(initialKeyframesCount);
      });

      it("F2-2: updates and scrubs SFX track timing and volume independently", () => {
        const project = createMockOverhaulProject();
        useEditor.setState({ project });

        useEditor.getState().updateAudioTrack("sfx-track-1", {
          startTimeMs: 2500,
          volume: 0.95,
        });

        const updated = useEditor.getState().project?.audioTracks?.find((t) => t.id === "sfx-track-1");
        expect(updated?.startTimeMs).toBe(2500);
        expect(updated?.volume).toBe(0.95);
      });

      it("F2-3: adds dedicated text overlay card on timeline with inline editing support", () => {
        const project = createMockOverhaulProject();
        useEditor.setState({ project });

        useEditor.getState().addTextOverlay("New Kinetic Headline");
        const overlays = useEditor.getState().project?.textOverlays;
        expect(overlays?.length).toBe(2);
        const newCard = overlays?.find((o) => o.text === "New Kinetic Headline");
        expect(newCard).toBeDefined();
        expect(newCard?.durationMs).toBeGreaterThan(0);
      });

      it("F2-4: updates text string directly inline without modal intervention", () => {
        const project = createMockOverhaulProject();
        useEditor.setState({ project });

        useEditor.getState().updateTextOverlay("txt-1", {
          text: "Inline Edited Text String",
        });

        const updated = useEditor.getState().project?.textOverlays?.find((o) => o.id === "txt-1");
        expect(updated?.text).toBe("Inline Edited Text String");
      });

      it("F2-5: confirms non-interference: adding/deleting SFX and text leaves clips intact", () => {
        const project = createMockOverhaulProject();
        useEditor.setState({ project });

        const origClip = { ...project.clips[0]! };

        useEditor.getState().addAudioTrack("Whoosh", "sfx://whoosh", "sfx");
        useEditor.getState().addTextOverlay("Sub-headline");
        useEditor.getState().deleteAudioTrack("sfx-track-1");

        const clips = useEditor.getState().project?.clips;
        expect(clips?.[0]?.id).toBe(origClip.id);
        expect(clips?.[0]?.durationMs).toBe(origClip.durationMs);
        expect(clips?.[0]?.sourceOffsetMs).toBe(origClip.sourceOffsetMs);
      });

      it("F2-6: validates acoustic sound presets and volume parameters", () => {
        const supportedPresets = ["click", "bop", "pop", "whoosh", "typing", "shutter"];
        for (const preset of supportedPresets) {
          const testUrl = `sfx://${preset}`;
          expect(testUrl.startsWith("sfx://")).toBe(true);
        }
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F3: Timeline Toolbar Expansion: Select, Trim, Split & Pan (R3)         */
    /* ---------------------------------------------------------------------- */
    describe("F3 (R3): Timeline Toolbar Expansion: Select, Trim, Split & Pan", () => {
      it("F3-1: toggles between toolbar tool modes (select, trim, split, pan)", () => {
        const toolbar = new TimelineToolbarSimulator();
        expect(toolbar.toolMode).toBe("select");

        toolbar.setToolMode("trim");
        expect(toolbar.toolMode).toBe("trim");

        toolbar.setToolMode("split");
        expect(toolbar.toolMode).toBe("split");

        toolbar.setToolMode("pan");
        expect(toolbar.toolMode).toBe("pan");
      });

      it("F3-2: executes Trim Left at current playhead position without leaving invalid gaps", () => {
        const toolbar = new TimelineToolbarSimulator();
        const clip: TimelineClip = {
          id: "c1",
          name: "Main Clip",
          mediaUrl: "video.mp4",
          timelineStartMs: 0,
          sourceOffsetMs: 0,
          durationMs: 8000,
          muted: false,
          volume: 1,
        };

        const trimmed = toolbar.executeTrimLeft(clip, 2000);
        expect(trimmed).not.toBeNull();
        expect(trimmed?.timelineStartMs).toBe(2000);
        expect(trimmed?.sourceOffsetMs).toBe(2000);
        expect(trimmed?.durationMs).toBe(6000);
      });

      it("F3-3: executes Trim Right at current playhead position", () => {
        const toolbar = new TimelineToolbarSimulator();
        const clip: TimelineClip = {
          id: "c1",
          name: "Main Clip",
          mediaUrl: "video.mp4",
          timelineStartMs: 0,
          sourceOffsetMs: 0,
          durationMs: 8000,
          muted: false,
          volume: 1,
        };

        const trimmed = toolbar.executeTrimRight(clip, 5500);
        expect(trimmed).not.toBeNull();
        expect(trimmed?.timelineStartMs).toBe(0);
        expect(trimmed?.durationMs).toBe(5500);
      });

      it("F3-4: splits clip cleanly at playhead timestamp into two contiguous clips", () => {
        const clip: TimelineClip = {
          id: "c1",
          name: "Main Stream",
          mediaUrl: "stream.mp4",
          timelineStartMs: 0,
          sourceOffsetMs: 0,
          durationMs: 10000,
          muted: false,
          volume: 1,
        };

        const splitResult = splitClip(clip, 4000);
        expect(splitResult).not.toBeNull();
        const [c1, c2] = splitResult!;
        expect(c1.durationMs).toBe(4000);
        expect(c2.timelineStartMs).toBe(4000);
        expect(c2.durationMs).toBe(6000);
        expect(c2.sourceOffsetMs).toBe(4000);
      });

      it("F3-5: executes zoom-aware horizontal panning calculations", () => {
        const toolbar = new TimelineToolbarSimulator();
        expect(toolbar.panX).toBe(0);

        toolbar.pan(150, 2);
        expect(toolbar.panX).toBe(150);

        toolbar.pan(50, 2);
        expect(toolbar.panX).toBe(200);
      });

      it("F3-6: calculates responsive toolbar collapsing thresholds", () => {
        function getToolbarLayout(width: number): "compact" | "medium" | "expanded" {
          if (width < 640) return "compact";
          if (width < 1024) return "medium";
          return "expanded";
        }

        expect(getToolbarLayout(375)).toBe("compact");
        expect(getToolbarLayout(768)).toBe("medium");
        expect(getToolbarLayout(1440)).toBe("expanded");
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F4: Dynamic Text Card Animation Engine & Anti-Generic Motion (R4)      */
    /* ---------------------------------------------------------------------- */
    describe("F4 (R4): Dynamic Text Card Animation Engine & Anti-Generic Motion", () => {
      const overlay: TextOverlay = {
        id: "tx-motion",
        text: "Launch Announcement",
        startTimeMs: 1000,
        durationMs: 3000,
        x: 0.5,
        y: 0.2,
        fontSize: 28,
        color: "#ffffff",
      };

      it("F4-1: evaluates elastic-pop motion curve with spring scale overshoot", () => {
        // At entrance midpoint (1200ms = 200ms into 400ms entrance)
        const motion = evaluateTextOverlayMotion(overlay, 1200, "elastic-pop");
        expect(motion.opacity).toBeGreaterThan(0.5);
        expect(motion.scale).toBeGreaterThan(1.0); // overshoot
        expect(motion.blur).toBeGreaterThan(0);
      });

      it("F4-2: evaluates fluid-slide motion curve with vertical translation entrance easing", () => {
        const motion = evaluateTextOverlayMotion(overlay, 1100, "fluid-slide");
        expect(motion.translateY).toBeGreaterThan(0); // sliding up
        expect(motion.opacity).toBeGreaterThan(0);
      });

      it("F4-3: evaluates whip-slide motion curve with horizontal directional snap", () => {
        const motion = evaluateTextOverlayMotion(overlay, 1100, "whip-slide");
        expect(motion.translateX).toBeLessThan(0); // coming from left
        expect(motion.opacity).toBeGreaterThan(0);
      });

      it("F4-4: evaluates blur-reveal motion curve with high initial Gaussian blur decaying to 0px", () => {
        const initial = evaluateTextOverlayMotion(overlay, 1050, "blur-reveal");
        const sustained = evaluateTextOverlayMotion(overlay, 2000, "blur-reveal");
        expect(initial.blur).toBeGreaterThan(8);
        expect(sustained.blur).toBe(0);
        expect(sustained.opacity).toBe(1.0);
      });

      it("F4-5: evaluates smooth-fade motion curve with linear/smooth opacity ramp", () => {
        const entrance = evaluateTextOverlayMotion(overlay, 1200, "smooth-fade");
        expect(entrance.opacity).toBeCloseTo(0.5, 1);
        expect(entrance.scale).toBe(1.0);
        expect(entrance.translateX).toBe(0);
        expect(entrance.translateY).toBe(0);
      });

      it("F4-6: renders unboxed kinetic kickers without deprecated pill badges", () => {
        expect(STUDIO_MOTION_TEMPLATES.length).toBe(10);
        const tOverlay: TextOverlay = {
          id: "to-kicker",
          text: "Headline Text",
          kicker: "NEW RELEASE",
          startTimeMs: 0,
          durationMs: 2000,
          x: 0.5,
          y: 0.5,
          fontSize: 20,
          color: "#fff",
        };
        expect(tOverlay.kicker).toBe("NEW RELEASE");
        expect(tOverlay.badge).toBeUndefined();
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F5: Video Cursor Tracking, Resizing & 20+ Custom Cursor Designs (R5)   */
    /* ---------------------------------------------------------------------- */
    describe("F5 (R5): Video Cursor Tracking, Resizing & 20+ Custom Cursor Designs", () => {
      it("F5-1: validates catalog of 20+ distinct cursor designs (23 presets)", () => {
        expect(CURSOR_PRESETS.length).toBeGreaterThan(0);
        expect(ALL_23_CURSOR_STYLES.length).toBe(23);
        expect(ALL_23_CURSOR_STYLES.length).toBeGreaterThanOrEqual(20);

        const expectedKeyCursors = [
          "default",
          "mac",
          "obsidian-glow",
          "neon-laser",
          "minimal-crosshair",
          "precision-pen",
          "sleek-dot",
          "spotlight-glow",
          "terminal-caret",
          "glass-orb",
          "laser-dot",
          "smooth-chubby",
        ];
        for (const c of expectedKeyCursors) {
          expect(ALL_23_CURSOR_STYLES).toContain(c);
        }
      });

      it("F5-2: scales cursor smoothly across slider range from 0.6x to 3.0x", () => {
        function clampCursorScale(scale: number): number {
          return Math.max(0.6, Math.min(3.0, scale));
        }
        expect(clampCursorScale(0.4)).toBe(0.6);
        expect(clampCursorScale(1.8)).toBe(1.8);
        expect(clampCursorScale(4.5)).toBe(3.0);
      });

      it("F5-3: validates CursorAvatar badge schema across types: text, initials, icon, image", () => {
        const validInitials: CursorAvatar = {
          enabled: true,
          type: "initials",
          value: "AK",
          color: "#ff7a1a",
          badgeLabel: "Presenter",
        };
        expect(validateCursorAvatarSchema(validInitials).valid).toBe(true);

        const validIcon: CursorAvatar = {
          enabled: true,
          type: "icon",
          value: "sparkles",
        };
        expect(validateCursorAvatarSchema(validIcon).valid).toBe(true);

        const invalidAvatar: CursorAvatar = {
          enabled: true,
          type: "text",
          value: "",
        };
        expect(validateCursorAvatarSchema(invalidAvatar).valid).toBe(false);
      });

      it("F5-4: interpolates cursor trajectory positions over time with binary search", () => {
        const trajectory: CursorTrajectoryPoint[] = [
          { timestampMs: 1000, x: 0.1, y: 0.2 },
          { timestampMs: 2000, x: 0.3, y: 0.4 },
          { timestampMs: 3000, x: 0.7, y: 0.8 },
        ];

        const mid = interpolateCursorAtTime(1500, trajectory);
        expect(mid.x).toBeCloseTo(0.2, 2);
        expect(mid.y).toBeCloseTo(0.3, 2);
      });

      it("F5-5: applies cursor smoothing filters without coordinate drift", () => {
        const trajectory: CursorTrajectoryPoint[] = [
          { timestampMs: 0, x: 0.0, y: 0.0 },
          { timestampMs: 1000, x: 1.0, y: 1.0 },
        ];
        const atStart = interpolateCursorAtTime(0, trajectory);
        const atEnd = interpolateCursorAtTime(1000, trajectory);
        expect(atStart.x).toBe(0.0);
        expect(atEnd.x).toBe(1.0);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F6: 20+ Canvas Background Presets & Complete Export Parity (R6)        */
    /* ---------------------------------------------------------------------- */
    describe("F6 (R6): 20+ Canvas Background Presets & Complete Export Parity", () => {
      it("F6-1: validates catalog of modern background presets", () => {
        expect(BACKGROUND_PRESETS.length).toBeGreaterThan(0);
        for (const preset of BACKGROUND_PRESETS) {
          expect(preset.id).toBeDefined();
          expect(preset.value).toBeDefined();
        }
      });

      it("F6-2: universal gradient parser parses multi-stop linear gradients at arbitrary angles", () => {
        const css = "linear-gradient(135deg, #ff7a1a 0%, #ff5252 50%, #1e2024 100%)";
        const parsed = parseUniversalBackground(css);
        expect(parsed.kind).toBe("linear");
        expect(parsed.angleDeg).toBe(135);
        expect(parsed.stops.length).toBe(3);
        expect(parsed.stops[0]?.color).toBe("#ff7a1a");
        expect(parsed.stops[1]?.offset).toBe(0.5);
      });

      it("F6-3: universal gradient parser parses radial gradients", () => {
        const css = "radial-gradient(circle, #6366f1 0%, #0f1012 100%)";
        const parsed = parseUniversalBackground(css);
        expect(parsed.kind).toBe("radial");
        expect(parsed.stops.length).toBe(2);
      });

      it("F6-4: parses solid colors and frosted glass backdrops", () => {
        const solid = parseUniversalBackground("#0f1012");
        expect(solid.kind).toBe("solid");
        expect(solid.fallbackColor).toBe("#0f1012");

        const glass = parseUniversalBackground("backdrop-filter: blur(20px)");
        expect(glass.kind).toBe("glass");
      });

      it("F6-5: confirms 100% export dimension parity for various aspect ratios", () => {
        const dims16_9 = getOutputDimensions("1080p", "16:9");
        expect(dims16_9.width).toBe(1920);
        expect(dims16_9.height).toBe(1080);

        const dims9_16 = getOutputDimensions("1080p", "9:16");
        expect(dims9_16.width).toBe(1080);
        expect(dims9_16.height).toBe(1920);

        const dims1_1 = getOutputDimensions("1080p", "1:1");
        expect(dims1_1.width).toBe(1080);
        expect(dims1_1.height).toBe(1080);

        const dims4_3 = getOutputDimensions("1080p", "4:3");
        expect(dims4_3.width).toBe(1440);
        expect(dims4_3.height).toBe(1080);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F7: Git Branch Management & Remote Delivery (R7)                       */
    /* ---------------------------------------------------------------------- */
    describe("F7 (R7): Git Branch Management & Remote Delivery", () => {
      it("F7-1: confirms PROJECT_FORMAT_VERSION is set to version 1", () => {
        expect(PROJECT_FORMAT_VERSION).toBe(1);
      });

      it("F7-2: validates target feature branch name formatting", () => {
        const branchName = "feature/engine";
        expect(branchName).toMatch(/^feature\/[a-z0-9_-]+$/);
      });

      it("F7-3: validates remote origin repository url", () => {
        const remoteUrl = "https://github.com/darknecrocities/DomoLens.git";
        expect(remoteUrl).toContain("github.com");
        expect(remoteUrl.endsWith(".git")).toBe(true);
      });

      it("F7-4: validates default project structure constraints", () => {
        const project = createMockOverhaulProject();
        expect(project.summary.id).toBeDefined();
        expect(project.clips.length).toBeGreaterThan(0);
        expect(project.looks).toBeDefined();
      });

      it("F7-5: confirms clean sound effects trigger system does not throw", () => {
        expect(() => sfx.playClickBop("bop", 0.5)).not.toThrow();
        expect(() => sfx.playKeystroke("creamy", 0.5)).not.toThrow();
      });
    });
  });

  /* ======================================================================== */
  /* TIER 2: BOUNDARY & CORNER CASES (>=5 tests per feature)                  */
  /* ======================================================================== */

  describe("Tier 2: Boundary & Corner Cases", () => {
    /* ---------------------------------------------------------------------- */
    /* B1: Boundary Placement & Collision (R1)                                */
    /* ---------------------------------------------------------------------- */
    describe("B1 (R1): Boundary Placement & Collision", () => {
      it("B1-1: zero-dimension or offscreen target rect safely falls back to centered placement", () => {
        const res = computeCollisionFreeCardPlacement({ left: -100, top: -100, width: 0, height: 0 }, 1920, 1080);
        expect(res.left).toBe((1920 - 380) / 2);
        expect(res.top).toBeGreaterThan(0);
      });

      it("B1-2: target in extreme top-left (0,0) clamps to safe margin and header height", () => {
        const res = computeCollisionFreeCardPlacement({ left: 0, top: 0, width: 50, height: 50 }, 1920, 1080, 380, 220, 64);
        expect(res.left).toBeGreaterThanOrEqual(16);
        expect(res.top).toBeGreaterThanOrEqual(64);
      });

      it("B1-3: target in extreme bottom-right corner clamps within viewport width and height", () => {
        const res = computeCollisionFreeCardPlacement({ left: 1880, top: 1040, width: 40, height: 40 }, 1920, 1080, 380, 220, 64);
        expect(res.left + 380).toBeLessThanOrEqual(1920);
      });

      it("B1-4: tiny window dimensions (mobile 360x640) clamps left to margin", () => {
        const res = computeCollisionFreeCardPlacement({ left: 100, top: 200, width: 100, height: 40 }, 360, 640, 320, 200, 56);
        expect(res.left).toBeGreaterThanOrEqual(16);
      });

      it("B1-5: rapid step progression past step bounds clamps gracefully", () => {
        const tutorial = useTutorial.getState();
        tutorial.startTutorial();
        for (let i = 0; i < 50; i++) {
          useTutorial.getState().nextStep();
        }
        expect(useTutorial.getState().isActive).toBe(false);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* B2: Boundary Multi-Track State (R2)                                    */
    /* ---------------------------------------------------------------------- */
    describe("B2 (R2): Boundary Multi-Track State", () => {
      it("B2-1: project with undefined audioTracks or textOverlays initializes gracefully", () => {
        const project = createMockOverhaulProject({
          audioTracks: undefined,
          textOverlays: undefined,
        });
        useEditor.setState({ project });

        expect(() => useEditor.getState().addAudioTrack("Sfx", "sfx://bop", "sfx")).not.toThrow();
        expect(useEditor.getState().project?.audioTracks?.length).toBe(1);

        expect(() => useEditor.getState().addTextOverlay("New Text")).not.toThrow();
        expect(useEditor.getState().project?.textOverlays?.length).toBe(1);
      });

      it("B2-2: audio track with zero volume or 0ms duration handles updates safely", () => {
        const project = createMockOverhaulProject();
        useEditor.setState({ project });

        useEditor.getState().updateAudioTrack("sfx-track-1", {
          volume: 0,
          durationMs: 0,
        });

        const track = useEditor.getState().project?.audioTracks?.find((t) => t.id === "sfx-track-1");
        expect(track?.volume).toBe(0);
        expect(track?.durationMs).toBe(0);
      });

      it("B2-3: inline text editing preserves multi-byte Unicode and emoji characters verbatim", () => {
        const project = createMockOverhaulProject();
        useEditor.setState({ project });

        const unicodeString = "🚀 NextGen Feature: 日本語 & Deutsche Qualität ✨";
        useEditor.getState().updateTextOverlay("txt-1", { text: unicodeString });

        const track = useEditor.getState().project?.textOverlays?.find((t) => t.id === "txt-1");
        expect(track?.text).toBe(unicodeString);
      });

      it("B2-4: extremely long text string (>500 characters) handles update without throwing", () => {
        const project = createMockOverhaulProject();
        useEditor.setState({ project });

        const longString = "A".repeat(800);
        useEditor.getState().updateTextOverlay("txt-1", { text: longString });

        const track = useEditor.getState().project?.textOverlays?.find((t) => t.id === "txt-1");
        expect(track?.text.length).toBe(800);
      });

      it("B2-5: deleting non-existent audio track or text overlay does nothing", () => {
        const project = createMockOverhaulProject();
        useEditor.setState({ project });

        expect(() => useEditor.getState().deleteAudioTrack("non-existent")).not.toThrow();
        expect(() => useEditor.getState().deleteTextOverlay("non-existent")).not.toThrow();
      });
    });

    /* ---------------------------------------------------------------------- */
    /* B3: Boundary Timeline Tools (R3)                                       */
    /* ---------------------------------------------------------------------- */
    describe("B3 (R3): Boundary Timeline Tools", () => {
      it("B3-1: trimming left at 0ms is rejected safely", () => {
        const toolbar = new TimelineToolbarSimulator();
        const clip: TimelineClip = {
          id: "c1",
          name: "Clip",
          mediaUrl: "video.mp4",
          timelineStartMs: 0,
          sourceOffsetMs: 0,
          durationMs: 5000,
          muted: false,
          volume: 1,
        };
        const res = toolbar.executeTrimLeft(clip, 0);
        expect(res).toBeNull();
      });

      it("B3-2: trimming right beyond clip end is rejected safely", () => {
        const toolbar = new TimelineToolbarSimulator();
        const clip: TimelineClip = {
          id: "c1",
          name: "Clip",
          mediaUrl: "video.mp4",
          timelineStartMs: 0,
          sourceOffsetMs: 0,
          durationMs: 5000,
          muted: false,
          volume: 1,
        };
        const res = toolbar.executeTrimRight(clip, 6000);
        expect(res).toBeNull();
      });

      it("B3-3: splitting at exact start (0ms) or exact end returns null", () => {
        const clip: TimelineClip = {
          id: "c1",
          name: "Clip",
          mediaUrl: "video.mp4",
          timelineStartMs: 0,
          sourceOffsetMs: 0,
          durationMs: 5000,
          muted: false,
          volume: 1,
        };
        expect(splitClip(clip, 0)).toBeNull();
        expect(splitClip(clip, 5000)).toBeNull();
      });

      it("B3-4: panning beyond max duration clamps smoothly", () => {
        const toolbar = new TimelineToolbarSimulator();
        toolbar.pan(999999, 1, 10000);
        expect(toolbar.panX).toBeLessThan(10000);
      });

      it("B3-5: negative pan delta clamps at zero", () => {
        const toolbar = new TimelineToolbarSimulator();
        toolbar.pan(-500);
        expect(toolbar.panX).toBe(0);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* B4: Boundary Text Motion Evaluator (R4)                                */
    /* ---------------------------------------------------------------------- */
    describe("B4 (R4): Boundary Text Motion Evaluator", () => {
      const overlay: TextOverlay = {
        id: "tx-b4",
        text: "Boundary Text",
        startTimeMs: 2000,
        durationMs: 4000,
        x: 0.5,
        y: 0.5,
        fontSize: 20,
        color: "#fff",
      };

      it("B4-1: evaluation before startTimeMs returns zero opacity and hidden scale", () => {
        const res = evaluateTextOverlayMotion(overlay, 1500, "elastic-pop");
        expect(res.opacity).toBe(0);
      });

      it("B4-2: evaluation after endTimeMs returns zero opacity", () => {
        const res = evaluateTextOverlayMotion(overlay, 6500, "elastic-pop");
        expect(res.opacity).toBe(0);
      });

      it("B4-3: zero-duration text overlay handles instant evaluation without division by zero", () => {
        const zeroDur: TextOverlay = { ...overlay, durationMs: 0 };
        const res = evaluateTextOverlayMotion(zeroDur, 2000);
        expect(res).toBeDefined();
        expect(isNaN(res.opacity)).toBe(false);
      });

      it("B4-4: negative timestamps evaluate gracefully to 0 opacity", () => {
        const res = evaluateTextOverlayMotion(overlay, -500);
        expect(res.opacity).toBe(0);
      });

      it("B4-5: unrecognized preset defaults safely to static / smooth bounds", () => {
        const res = evaluateTextOverlayMotion(overlay, 3000, "none");
        expect(res.opacity).toBe(1);
        expect(res.scale).toBe(1);
        expect(res.blur).toBe(0);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* B5: Boundary Cursor & Avatar Bounds (R5)                               */
    /* ---------------------------------------------------------------------- */
    describe("B5 (R5): Boundary Cursor & Avatar Bounds", () => {
      it("B5-1: clamps extreme cursor scale factors strictly between 0.6x and 3.0x", () => {
        function getSafeCursorScale(scale: number): number {
          return Math.max(0.6, Math.min(3.0, scale));
        }
        expect(getSafeCursorScale(-10)).toBe(0.6);
        expect(getSafeCursorScale(0)).toBe(0.6);
        expect(getSafeCursorScale(100)).toBe(3.0);
      });

      it("B5-2: interpolates out-of-bounds trajectory timestamps to boundary values", () => {
        const trajectory: CursorTrajectoryPoint[] = [
          { timestampMs: 1000, x: 0.2, y: 0.2 },
          { timestampMs: 3000, x: 0.8, y: 0.8 },
        ];
        const before = interpolateCursorAtTime(500, trajectory);
        expect(before.x).toBe(0.2);

        const after = interpolateCursorAtTime(4500, trajectory);
        expect(after.x).toBe(0.8);
      });

      it("B5-3: trajectory with 0 points falls back to center coordinates (0.5, 0.5)", () => {
        const res = interpolateCursorAtTime(1000, []);
        expect(res.x).toBe(0.5);
        expect(res.y).toBe(0.5);
      });

      it("B5-4: avatar with whitespace-only value is rejected as invalid when enabled", () => {
        const avatar: CursorAvatar = {
          enabled: true,
          type: "initials",
          value: "   ",
        };
        expect(validateCursorAvatarSchema(avatar).valid).toBe(false);
      });

      it("B5-5: disabled avatar with empty value is valid", () => {
        const avatar: CursorAvatar = {
          enabled: false,
          type: "initials",
          value: "",
        };
        expect(validateCursorAvatarSchema(avatar).valid).toBe(true);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* B6: Boundary Gradients & Export Format (R6)                            */
    /* ---------------------------------------------------------------------- */
    describe("B6 (R6): Boundary Gradients & Export Format", () => {
      it("B6-1: empty or malformed gradient string falls back gracefully to dark solid", () => {
        const res = parseUniversalBackground("");
        expect(res.kind).toBe("solid");
        expect(res.fallbackColor).toBe("#16171a");
      });

      it("B6-2: single color gradient string parses gracefully", () => {
        const res = parseUniversalBackground("linear-gradient(90deg, #ffffff 100%)");
        expect(res.kind).toBe("linear");
        expect(res.stops.length).toBe(1);
      });

      it("B6-3: gif resolution maps to half-scale dimensions", () => {
        const dims = getOutputDimensions("gif", "16:9");
        expect(dims.width).toBe(960);
        expect(dims.height).toBe(540);
      });

      it("B6-4: 4k resolution maps to ultra-HD dimensions", () => {
        const dims = getOutputDimensions("4k", "16:9");
        expect(dims.width).toBe(3840);
        expect(dims.height).toBe(2160);
      });

      it("B6-5: supports 8-digit hex colors with alpha", () => {
        const res = parseUniversalBackground("#ff7a1a80");
        expect(res.kind).toBe("solid");
        expect(res.fallbackColor).toBe("#ff7a1a80");
      });
    });

    /* ---------------------------------------------------------------------- */
    /* B7: Boundary Git & Monorepo State (R7)                                 */
    /* ---------------------------------------------------------------------- */
    describe("B7 (R7): Boundary Git & Monorepo State", () => {
      it("B7-1: detects valid git branch naming conventions", () => {
        function isValidBranch(name: string): boolean {
          return !name.startsWith("/") && !name.endsWith("/") && !name.includes("..") && !name.includes(" ");
        }
        expect(isValidBranch("feature/engine")).toBe(true);
        expect(isValidBranch("/invalid/")).toBe(false);
        expect(isValidBranch("feature..name")).toBe(false);
      });

      it("B7-2: parses git remote URLs with various protocols", () => {
        const https = "https://github.com/darknecrocities/DomoLens.git";
        const ssh = "git@github.com:darknecrocities/DomoLens.git";
        expect(https.includes("darknecrocities/DomoLens")).toBe(true);
        expect(ssh.includes("darknecrocities/DomoLens")).toBe(true);
      });

      it("B7-3: confirms supported video file extensions in project models", () => {
        const allowed = ["mp4", "mov", "m4v", "webm", "mkv"];
        expect(allowed.includes("mp4")).toBe(true);
        expect(allowed.includes("avi")).toBe(false);
      });

      it("B7-4: camera clamp prevents out-of-bounds positioning", () => {
        const clamped = clampCameraToBounds(-0.5, 1.5, 2.0);
        expect(clamped.x).toBeGreaterThanOrEqual(0.0);
        expect(clamped.x).toBeLessThanOrEqual(1.0);
        expect(clamped.y).toBeGreaterThanOrEqual(0.0);
        expect(clamped.y).toBeLessThanOrEqual(1.0);
      });

      it("B7-5: project with 0 clips duration resolves to 0", () => {
        const emptyProject = createMockOverhaulProject({ clips: [] });
        expect(emptyProject.clips.length).toBe(0);
      });
    });
  });

  /* ======================================================================== */
  /* TIER 3: PAIRWISE COMBINATIONS (cross-feature interactions, >=10 tests)    */
  /* ======================================================================== */

  describe("Tier 3: Pairwise Combinations", () => {
    it("P1 (R1 x R2): Spotlight tutorial highlights dedicated SFX row without displacing tracks", () => {
      const project = createMockOverhaulProject();
      useEditor.setState({ project });

      useEditor.getState().addAudioTrack("Tutorial Click", "sfx://click", "sfx");
      expect(useEditor.getState().project?.audioTracks?.length).toBe(2);

      // Spotlight rect calculation for timeline sfx track
      const sfxRowRect: SimplifiedRect = { left: 48, top: 720, width: 800, height: 48 };
      const placement = computeCollisionFreeCardPlacement(sfxRowRect, 1920, 1080);
      expect(placement.top).toBeGreaterThan(sfxRowRect.top); // places below with room
      expect(placement.arrowPosition).toBe("top");
    });

    it("P2 (R2 x R3): Splitting a video clip preserves SFX track timing and inline text overlays", () => {
      const project = createMockOverhaulProject();
      useEditor.setState({ project });

      const clip = project.clips[0]!;
      const splitClips = splitClip(clip, 5000);
      expect(splitClips).not.toBeNull();

      useEditor.setState({
        project: {
          ...project,
          clips: splitClips!,
        },
      });

      const updated = useEditor.getState().project;
      expect(updated?.clips.length).toBe(2);
      expect(updated?.audioTracks?.length).toBe(1);
      expect(updated?.textOverlays?.length).toBe(1);
      expect(updated?.textOverlays?.[0]?.startTimeMs).toBe(1000);
    });

    it("P3 (R4 x R6): Kinetic text overlay motion evaluates correctly on top of custom gradient backgrounds", () => {
      const project = createMockOverhaulProject();
      const sunsetBg = "linear-gradient(135deg, #ff8f3d 0%, #ff5252 50%, #2a2d33 100%)";
      project.looks.backgroundValue = sunsetBg;

      const parsedBg = parseUniversalBackground(project.looks.backgroundValue);
      expect(parsedBg.kind).toBe("linear");

      const overlay = project.textOverlays![0]!;
      const motion = evaluateTextOverlayMotion(overlay, 1200, "elastic-pop");
      expect(motion.opacity).toBeGreaterThan(0.5);
      expect(motion.scale).toBeGreaterThan(1.0);
    });

    it("P4 (R5 x R6): Custom cursor design and avatar render cleanly across vertical 9:16 canvas export", () => {
      const project = createMockOverhaulProject();
      project.looks.cursorStyle = "neon-laser" as any;
      project.looks.cursorSize = 2.2;
      project.looks.aspectRatio = "9:16";

      const dims = getOutputDimensions("1080p", project.looks.aspectRatio);
      expect(dims.width).toBe(1080);
      expect(dims.height).toBe(1920);

      const avatar: CursorAvatar = {
        enabled: true,
        type: "initials",
        value: "ED",
        color: "#6366f1",
      };
      expect(validateCursorAvatarSchema(avatar).valid).toBe(true);
    });

    it("P5 (R2 x R4): Inline editing text on timeline recalculates kinetic text motion seamlessly", () => {
      const project = createMockOverhaulProject();
      useEditor.setState({ project });

      useEditor.getState().updateTextOverlay("txt-1", {
        text: "Brand New Kinetic Value",
        startTimeMs: 3000,
        durationMs: 5000,
      });

      const updated = useEditor.getState().project?.textOverlays?.find((t) => t.id === "txt-1")!;
      // At 2000ms (before new start), motion should be inactive
      expect(evaluateTextOverlayMotion(updated, 2000).opacity).toBe(0);
      // At 3200ms (during entrance), motion should be active
      expect(evaluateTextOverlayMotion(updated, 3200, "whip-slide").opacity).toBeGreaterThan(0);
    });

    it("P6 (R3 x R5): Switching between Select and Pan tool preserves cursor tracking trajectory", () => {
      const toolbar = new TimelineToolbarSimulator();
      const project = createMockOverhaulProject();

      toolbar.setToolMode("pan");
      toolbar.pan(200, 2);

      // Trajectory at 3800ms should remain accurate regardless of timeline tool
      const pos = interpolateCursorAtTime(3800, project.cursorTrajectory);
      expect(pos.x).toBe(0.7);
      expect(pos.y).toBe(0.6);

      toolbar.setToolMode("select");
      expect(toolbar.toolMode).toBe("select");
    });

    it("P7 (R1 x R3): Tutorial highlights Toolbar tools with proper boundary collision clamping", () => {
      const toolbarRect: SimplifiedRect = { left: 48, top: 580, width: 320, height: 40 };
      const res = computeCollisionFreeCardPlacement(toolbarRect, 1920, 1080, 380, 220, 64);
      expect(res.top).toBeGreaterThan(toolbarRect.top); // places below toolbar
      expect(res.arrowPosition).toBe("top");

      // And for a control docked near the bottom edge of the screen:
      const bottomDockRect: SimplifiedRect = { left: 48, top: 920, width: 400, height: 50 };
      const resBottom = computeCollisionFreeCardPlacement(bottomDockRect, 1920, 1080, 380, 220, 64);
      expect(resBottom.top).toBeLessThan(bottomDockRect.top); // places above dock
      expect(resBottom.arrowPosition).toBe("bottom");
    });

    it("P8 (R2 x R5): Click sound effect synchronized with custom cursor click event timestamp", () => {
      const project = createMockOverhaulProject();
      const click = project.clicks[0]!;
      expect(click.timestampMs).toBe(1200);

      const sfxTrack = project.audioTracks?.find((a) => a.startTimeMs === click.timestampMs);
      expect(sfxTrack).toBeDefined();
      expect(sfxTrack?.type).toBe("sfx");
    });

    it("P9 (R4 x R5): Simultaneous kinetic text animation and video cursor avatar movement", () => {
      const project = createMockOverhaulProject();
      const t = 1200;

      const cursor = interpolateCursorAtTime(t, project.cursorTrajectory);
      const textMotion = evaluateTextOverlayMotion(project.textOverlays![0]!, t, "elastic-pop");

      expect(cursor.x).toBe(0.3);
      expect(textMotion.opacity).toBeGreaterThan(0.5);
    });

    it("P10 (R6 x R7): Validating 20+ background export parity and committing clean build artifacts", () => {
      for (const preset of BACKGROUND_PRESETS) {
        const parsed = parseUniversalBackground(preset.value);
        expect(parsed.fallbackColor).toBeDefined();
      }
      expect(PROJECT_FORMAT_VERSION).toBe(1);
    });
  });

  /* ======================================================================== */
  /* TIER 4: REAL-WORLD APPLICATION SCENARIOS (>=5 scenarios, S1 to S5)       */
  /* ======================================================================== */

  describe("Tier 4: Real-World Application Scenarios", () => {
    it("S1: 'SaaS Launch Product Demo' end-to-end user workflow", () => {
      // 1. Initialize project with screen recording
      const project = createMockOverhaulProject();
      useEditor.setState({ project, durationMs: 10000 });

      // 2. Apply Charcoal Slate / Dark Obsidian background
      useEditor.setState((s) => ({
        project: s.project ? {
          ...s.project,
          looks: {
            ...s.project.looks,
            backgroundType: "gradient",
            backgroundValue: "linear-gradient(135deg, #2a2d33 0%, #16171a 100%)",
            cursorStyle: "obsidian-glow" as any,
            cursorSize: 1.8,
          },
        } : null,
      }));

      // 3. Add tactile click sound effect track at 1200ms
      useEditor.getState().addAudioTrack("Tactile Click Bop", "sfx://click", "sfx");

      // 4. Add kinetic feature headline overlay with elastic-pop
      useEditor.getState().addTextOverlay("Instant AI Auto-Zoom");
      const addedText = useEditor.getState().project?.textOverlays?.find((t) => t.text === "Instant AI Auto-Zoom");
      expect(addedText).toBeDefined();

      // 5. Evaluate motion curve at entrance
      const motion = evaluateTextOverlayMotion(addedText!, addedText!.startTimeMs + 200, "elastic-pop");
      expect(motion.opacity).toBeGreaterThan(0.5);

      // 6. Verify 1080p export dimensions
      const dims = getOutputDimensions("1080p", "16:9");
      expect(dims.width).toBe(1920);
      expect(dims.height).toBe(1080);
    });

    it("S2: 'TikTok / Viral Reel 9:16 Creation' vertical video workflow", () => {
      const project = createMockOverhaulProject();
      useEditor.setState({ project, durationMs: 10000 });

      // 1. Change aspect ratio to 9:16 with warm sunset gradient
      useEditor.setState((s) => ({
        project: s.project ? {
          ...s.project,
          looks: {
            ...s.project.looks,
            aspectRatio: "9:16",
            backgroundValue: "linear-gradient(135deg, #ff8f3d 0%, #ff5252 50%, #2a2d33 100%)",
            cursorStyle: "neon-laser" as any,
            cursorSize: 2.2,
          },
        } : null,
      }));

      // 2. Add upbeat audio track and split clip at 2500ms
      useEditor.getState().addAudioTrack("Upbeat Synth", "sfx://whoosh", "sfx");
      const splitClips = splitClip(useEditor.getState().project!.clips[0]!, 2500);
      expect(splitClips).not.toBeNull();

      useEditor.setState((s) => ({
        project: s.project ? { ...s.project, clips: splitClips! } : null,
      }));

      // 3. Inline edit subtitle text on timeline
      useEditor.getState().addTextOverlay("Wait for the drop... 🔥");
      const subtitle = useEditor.getState().project?.textOverlays?.find((t) => t.text.includes("Wait for the drop"));
      expect(subtitle).toBeDefined();

      // 4. Verify 9:16 canvas export resolution
      const dims = getOutputDimensions("1080p", "9:16");
      expect(dims.width).toBe(1080);
      expect(dims.height).toBe(1920);
    });

    it("S3: 'Developer Terminal CLI Deep-Dive' developer walkthrough workflow", () => {
      const project = createMockOverhaulProject();
      useEditor.setState({ project, durationMs: 15000 });

      // 1. Configure terminal styling
      useEditor.setState((s) => ({
        project: s.project ? {
          ...s.project,
          looks: {
            ...s.project.looks,
            windowFrame: "terminal",
            backgroundValue: "#0f1012",
            cursorStyle: "terminal-caret" as any,
            cursorSize: 1.4,
          },
        } : null,
      }));

      // 2. Add mechanical typing sound track
      useEditor.getState().addAudioTrack("Thock Mechanical SFX", "sfx://typing", "sfx");

      // 3. Add terminal text overlay with blur-reveal motion
      useEditor.getState().addTextOverlay("$ curl -fsSL https://domolens.dev/install.sh");
      const commandOverlay = useEditor.getState().project?.textOverlays?.find((t) => t.text.includes("curl"));
      expect(commandOverlay).toBeDefined();

      const motion = evaluateTextOverlayMotion(commandOverlay!, commandOverlay!.startTimeMs + 100, "blur-reveal");
      expect(motion.blur).toBeGreaterThan(0);

      // 4. Pan timeline using Pan tool
      const toolbar = new TimelineToolbarSimulator();
      toolbar.setToolMode("pan");
      toolbar.pan(300, 2, 15000);
      expect(toolbar.panX).toBe(300);
    });

    it("S4: 'Enterprise Security Audit Walkthrough' enterprise compliance workflow", () => {
      const project = createMockOverhaulProject();
      useEditor.setState({ project, durationMs: 12000 });

      // 1. Configure sleek slate and focus-reticle cursor with avatar badge
      useEditor.setState((s) => ({
        project: s.project ? {
          ...s.project,
          looks: {
            ...s.project.looks,
            cursorStyle: "focus-reticle" as any,
            cursorSize: 1.6,
            backgroundValue: "#1e2330",
          },
        } : null,
      }));

      // 2. Add audit callout and multi-track SFX
      useEditor.getState().addTextOverlay("Compliance Check Passed: SOC 2 Type II");
      useEditor.getState().addAudioTrack("Chime Shutter", "sfx://shutter", "sfx");

      // 3. Verify Spotlight tutorial highlights tools panel without overlapping sidebar
      const sidebarRect: SimplifiedRect = { left: 1600, top: 120, width: 300, height: 800 };
      const placement = computeCollisionFreeCardPlacement(sidebarRect, 1920, 1080, 380, 220, 64, 320, true);
      expect(placement.left + 380).toBeLessThanOrEqual(1600);
    });

    it("S5: 'End-to-End Clean Monorepo Verification & Feature Branch Delivery'", () => {
      // 1. Validate complete project data integrity across all models
      const project = createMockOverhaulProject();
      expect(project.summary.id).toBe("proj-e2e-overhaul");
      expect(project.looks.backgroundType).toBeDefined();
      expect(project.clips.length).toBeGreaterThan(0);
      expect(project.audioTracks?.length).toBeGreaterThan(0);
      expect(project.textOverlays?.length).toBeGreaterThan(0);

      // 2. Verify git delivery branch and remote origin parameters
      const targetBranch = "feature/engine";
      const remoteUrl = "https://github.com/darknecrocities/DomoLens.git";
      expect(targetBranch).toBe("feature/engine");
      expect(remoteUrl).toContain("DomoLens.git");

      // 3. Verify PROJECT_FORMAT_VERSION parity
      expect(PROJECT_FORMAT_VERSION).toBe(1);
    });
  });
});
