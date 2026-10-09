import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_PRESETS,
  DEFAULT_LOOKS,
  STUDIO_MOTION_TEMPLATES,
  evaluateTextOverlayMotion,
  getCursorPreset,
  isValidCursorStyle,
  resolveOverlayMotionPreset,
  type ProjectData,
  type ProjectSummary,
  type TextOverlay,
} from "@domolens/core";
import {
  createBackgroundFill,
  createUniversalBackgroundFill,
  extractGradientArgs,
  getOutputDimensions,
  parseColorStops,
  type ExportResolution,
} from "../lib/video-renderer";
import { useEditor } from "../store/editor";
import { useProjects } from "../store/projects";
import { platform } from "../platform";

/* ========================================================================== */
/* Mock Canvas Context Generator                                              */
/* ========================================================================== */

interface RecordedLinearGradient {
  type: "linear";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  stops: Array<{ offset: number; color: string }>;
}

interface RecordedRadialGradient {
  type: "radial";
  x0: number;
  y0: number;
  r0: number;
  x1: number;
  y1: number;
  r1: number;
  stops: Array<{ offset: number; color: string }>;
}

type RecordedGradient = RecordedLinearGradient | RecordedRadialGradient;

function createHarnessMockCtx() {
  const recordedGradients: RecordedGradient[] = [];

  const ctx = {
    createLinearGradient: vi.fn((x0: number, y0: number, x1: number, y1: number) => {
      const stops: Array<{ offset: number; color: string }> = [];
      const grad = {
        type: "linear" as const,
        x0,
        y0,
        x1,
        y1,
        stops,
        addColorStop: vi.fn((offset: number, color: string) => {
          stops.push({ offset, color });
        }),
      };
      recordedGradients.push(grad);
      return grad as unknown as CanvasGradient;
    }),
    createRadialGradient: vi.fn(
      (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) => {
        const stops: Array<{ offset: number; color: string }> = [];
        const grad = {
          type: "radial" as const,
          x0,
          y0,
          r0,
          x1,
          y1,
          r1,
          stops,
          addColorStop: vi.fn((offset: number, color: string) => {
            stops.push({ offset, color });
          }),
        };
        recordedGradients.push(grad);
        return grad as unknown as CanvasGradient;
      },
    ),
  } as unknown as CanvasRenderingContext2D;

  return { ctx, recordedGradients };
}

/* ========================================================================== */
/* 1. Backward Compatibility Verification Suite                               */
/* ========================================================================== */

describe("Milestone 1: Backward Compatibility & Legacy Projects", () => {
  const legacyPresetIds = [
    "charcoal-gradient",
    "orange-glow",
    "midnight",
    "sunset",
    "aurora",
    "solid-dark",
    "solid-charcoal",
    "solid-gray",
  ] as const;

  const legacyCursorStyles = ["default", "mac", "dot", "ring", "hidden"] as const;

  beforeEach(() => {
    useProjects.setState({ projects: [] });
    useEditor.setState({
      project: null,
      currentTimeMs: 0,
      durationMs: 0,
      isPlaying: false,
      history: [],
      future: [],
    });
  });

  it("all 8 legacy background presets exist in BACKGROUND_PRESETS with valid CSS", () => {
    for (const legacyId of legacyPresetIds) {
      const preset = BACKGROUND_PRESETS.find((p) => p.id === legacyId);
      expect(preset, `Legacy preset ${legacyId} must exist`).toBeDefined();
      expect(preset!.id).toBe(legacyId);
      expect(preset!.value).toBeTruthy();
      expect(["solid", "gradient"]).toContain(preset!.type);
    }
  });

  it("all 5 legacy cursor styles remain valid according to isValidCursorStyle and CURSOR_PRESETS", () => {
    for (const cursorStyle of legacyCursorStyles) {
      expect(isValidCursorStyle(cursorStyle), `Cursor style ${cursorStyle} must be valid`).toBe(true);
      const found = getCursorPreset(cursorStyle);
      expect(found, `Cursor preset metadata for ${cursorStyle} must exist`).toBeDefined();
      expect(found!.id).toBe(cursorStyle);
      expect(found!.hotspot).toBeDefined();
      expect(found!.hotspot.length).toBe(2);
    }
  });

  it("loads and validates legacy projects with legacy background presets and cursors into useEditor without errors", async () => {
    for (let i = 0; i < legacyPresetIds.length; i++) {
      const bgId = legacyPresetIds[i]!;
      const cursorStyle = legacyCursorStyles[i % legacyCursorStyles.length]!;
      const bgPreset = BACKGROUND_PRESETS.find((p) => p.id === bgId)!;

      const legacyProjId = `legacy-project-${bgId}`;
      const legacySummary: ProjectSummary = {
        id: legacyProjId,
        name: `Legacy Project ${bgId}`,
        source: "recording",
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
        durationMs: 6000,
        width: 1920,
        height: 1080,
        thumbnail: null,
        media: "blob://legacy-video.mp4",
      };

      // Construct authentic legacy project object without newer properties
      const legacyProject: ProjectData = {
        summary: legacySummary,
        clicks: [{ id: "c1", timestampMs: 1000, x: 0.5, y: 0.5, button: "left" }],
        zoomBlocks: [
          {
            id: "zb1",
            startTimeMs: 800,
            endTimeMs: 2500,
            targetX: 0.5,
            targetY: 0.5,
            scale: 1.8,
            enabled: true,
          },
        ],
        keyframes: [{ id: "kf1", timeMs: 800, scale: 1.8, targetX: 0.5, targetY: 0.5, easing: "cubic" }],
        clips: [
          {
            id: "clip-1",
            name: "Recording",
            mediaUrl: "blob://legacy-video.mp4",
            timelineStartMs: 0,
            sourceOffsetMs: 0,
            durationMs: 6000,
            muted: false,
            volume: 1,
          },
        ],
        looks: {
          backgroundType: bgPreset.type,
          backgroundValue: bgPreset.value,
          padding: 32,
          borderRadius: 16,
          shadow: "lift",
          cursorStyle: cursorStyle as any,
          showCursor: true,
          showClickRipples: true,
          // Note: cursorAvatar, brandAccentColor, aspectRatio are omitted to simulate legacy save
        },
      };

      // Save into platform memory storage
      await platform.saveFullProject!(legacyProject);
      useProjects.setState({ projects: [legacySummary] });

      // Load into useEditor
      const ok = await useEditor.getState().loadProject(legacyProjId);
      expect(ok, `loadProject should succeed for legacy project ${legacyProjId}`).toBe(true);

      const state = useEditor.getState();
      expect(state.project).not.toBeNull();
      expect(state.project?.summary.id).toBe(legacyProjId);
      expect(state.project?.looks.backgroundValue).toBe(bgPreset.value);
      expect(state.project?.looks.cursorStyle).toBe(cursorStyle);

      // Verify defaults applied safely without crashing
      expect(state.project?.audioSettings).toBeDefined();
      expect(state.project?.effects).toEqual([]);
      expect(state.durationMs).toBe(6000);

      // Verify state update operations succeed on legacy project
      useEditor.getState().updateLooks({ padding: 40 });
      expect(useEditor.getState().project?.looks.padding).toBe(40);
    }
  });

  it("handles legacy text overlays with deprecated badge fields and maps legacy typography animations", () => {
    // 1. Legacy text overlay with deprecated badge fields
    const legacyOverlayWithBadge: TextOverlay = {
      id: "txt-legacy-1",
      text: "Legacy Headline",
      startTimeMs: 1000,
      durationMs: 3000,
      x: 0.1,
      y: 0.1,
      fontSize: 24,
      color: "#ffffff",
      badge: "Beta", // Deprecated field
      badgeStyle: "purple" as any, // Deprecated field
    };

    const motionResult = evaluateTextOverlayMotion(legacyOverlayWithBadge, 2000);
    expect(motionResult.opacity).toBe(1);
    expect(motionResult.scale).toBe(1);

    // 2. Legacy typography animation mapping
    const fadeUpOverlay: TextOverlay = {
      id: "txt-legacy-2",
      text: "Fade Up Text",
      startTimeMs: 0,
      durationMs: 2000,
      x: 0.5,
      y: 0.5,
      fontSize: 20,
      color: "#ffffff",
      typography: {
        fontFamily: "Inter",
        animation: "fade-up",
      },
    };
    expect(resolveOverlayMotionPreset(fadeUpOverlay)).toBe("fluid-slide");

    const blurRevealOverlay: TextOverlay = {
      id: "txt-legacy-3",
      text: "Blur Reveal Text",
      startTimeMs: 0,
      durationMs: 2000,
      x: 0.5,
      y: 0.5,
      fontSize: 20,
      color: "#ffffff",
      typography: {
        fontFamily: "Inter",
        animation: "blur-reveal",
      },
    };
    expect(resolveOverlayMotionPreset(blurRevealOverlay)).toBe("blur-reveal");

    const elasticPopOverlay: TextOverlay = {
      id: "txt-legacy-4",
      text: "Elastic Pop Text",
      startTimeMs: 0,
      durationMs: 2000,
      x: 0.5,
      y: 0.5,
      fontSize: 20,
      color: "#ffffff",
      typography: {
        fontFamily: "Inter",
        animation: "elastic-pop",
      },
    };
    expect(resolveOverlayMotionPreset(elasticPopOverlay)).toBe("elastic-pop");

    const whipSlideOverlay: TextOverlay = {
      id: "txt-legacy-5",
      text: "Whip Slide Text",
      startTimeMs: 0,
      durationMs: 2000,
      x: 0.5,
      y: 0.5,
      fontSize: 20,
      color: "#ffffff",
      typography: {
        fontFamily: "Inter",
        animation: "whip-slide",
      },
    };
    expect(resolveOverlayMotionPreset(whipSlideOverlay)).toBe("whip-slide");
  });

  it("self-heals legacy projects that have clicks but 0 zoomBlocks/keyframes", async () => {
    const unplottedId = "legacy-unplotted";
    const unplottedSummary: ProjectSummary = {
      id: unplottedId,
      name: "Legacy Unplotted Recording",
      source: "recording",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
      durationMs: 5000,
      width: 1920,
      height: 1080,
      thumbnail: null,
      media: "blob://video-unplotted.mp4",
    };

    const legacyUnplottedProject: ProjectData = {
      summary: unplottedSummary,
      clicks: [
        { id: "c1", timestampMs: 1200, x: 0.4, y: 0.3, button: "left" },
        { id: "c2", timestampMs: 3200, x: 0.7, y: 0.6, button: "left" },
      ],
      zoomBlocks: [], // Empty
      keyframes: [], // Empty
      clips: [
        {
          id: "clip-1",
          name: "Raw Stream",
          mediaUrl: "blob://video-unplotted.mp4",
          timelineStartMs: 0,
          sourceOffsetMs: 0,
          durationMs: 5000,
          muted: false,
          volume: 1,
        },
      ],
      looks: { ...DEFAULT_LOOKS, backgroundValue: "linear-gradient(135deg, #2a2d33 0%, #16171a 100%)" },
    };

    await platform.saveFullProject!(legacyUnplottedProject);
    useProjects.setState({ projects: [unplottedSummary] });

    const ok = await useEditor.getState().loadProject(unplottedId);
    expect(ok).toBe(true);

    const loaded = useEditor.getState().project;
    expect(loaded?.zoomBlocks.length).toBeGreaterThan(0);
    expect(loaded?.keyframes?.length).toBeGreaterThan(0);
  });
});

/* ========================================================================== */
/* 2. Export Parity Verification Suite                                        */
/* ========================================================================== */

describe("Milestone 1: Export Parity (createUniversalBackgroundFill vs createBackgroundFill)", () => {
  const resolutions: ExportResolution[] = ["720p", "1080p", "4k", "gif"];
  const aspectRatios = ["16:9", "9:16", "1:1", "4:3"] as const;

  it("createBackgroundFill is exported as a strict alias of createUniversalBackgroundFill", () => {
    expect(createBackgroundFill).toBe(createUniversalBackgroundFill);
  });

  it("produces identical gradient definitions and color stops for all 32 presets across resolutions", () => {
    for (const preset of BACKGROUND_PRESETS) {
      for (const res of resolutions) {
        for (const aspect of aspectRatios) {
          const { width, height } = getOutputDimensions(res, aspect);

          const h1 = createHarnessMockCtx();
          const fill1 = createUniversalBackgroundFill(h1.ctx, width, height, preset.value);

          const h2 = createHarnessMockCtx();
          const fill2 = createBackgroundFill(h2.ctx, width, height, preset.value);

          // 1. Result type parity
          if (typeof fill1 === "string") {
            expect(typeof fill2).toBe("string");
            expect(fill1).toBe(fill2);
            expect(fill1).toBe(preset.value);
            expect(h1.recordedGradients).toHaveLength(0);
            expect(h2.recordedGradients).toHaveLength(0);
          } else {
            expect(typeof fill2).not.toBe("string");
            expect(h1.recordedGradients).toHaveLength(1);
            expect(h2.recordedGradients).toHaveLength(1);

            const g1 = h1.recordedGradients[0]!;
            const g2 = h2.recordedGradients[0]!;

            // 2. Gradient geometry parity
            expect(g1.type).toBe(g2.type);
            expect(g1.x0).toBeCloseTo(g2.x0, 5);
            expect(g1.y0).toBeCloseTo(g2.y0, 5);
            expect(g1.x1).toBeCloseTo(g2.x1, 5);
            expect(g1.y1).toBeCloseTo(g2.y1, 5);

            if (g1.type === "radial" && g2.type === "radial") {
              expect(g1.r0).toBe(g2.r0);
              expect(g1.r1).toBeCloseTo(g2.r1, 5);
            }

            // 3. Color stop parity
            expect(g1.stops).toHaveLength(g2.stops.length);
            for (let s = 0; s < g1.stops.length; s++) {
              expect(g1.stops[s]!.offset).toBeCloseTo(g2.stops[s]!.offset, 5);
              expect(g1.stops[s]!.color.trim().toLowerCase()).toBe(
                g2.stops[s]!.color.trim().toLowerCase(),
              );
            }
          }
        }
      }
    }
  });

  it("handles complex, diverse CSS gradients identically between functions", () => {
    const complexGradients = [
      // Multiline with tabs and extra whitespace
      `linear-gradient(
        135deg,
        rgba(30, 41, 59, 0.75) 0%,
        rgba(15, 23, 42, 0.9) 100%
      )`,
      // Negative angle
      "linear-gradient(-45deg, #ff0000 0%, #00ff00 50%, #0000ff 100%)",
      // Arbitrary degree angles
      "linear-gradient(215deg, #121316 0%, #343538 50%, #08090a 100%)",
      // Directional keywords
      "linear-gradient(to right, #000000 0%, #ffffff 100%)",
      "linear-gradient(to top, #ff7a1a 0%, #1e2024 100%)",
      "linear-gradient(to bottom left, #09090b 0%, #6366f1 100%)",
      // Radial with non-center anchor
      "radial-gradient(circle at 20% 80%, #ff7a1a 0%, #1e2024 70%)",
      "radial-gradient(circle at right top, #4f46e5 0%, #09090b 75%)",
      "radial-gradient(circle at 100px 200px, #0891b2 0%, #020617 80%)",
      // 4-stop gradient
      "linear-gradient(90deg, #111 0%, #222 25%, #333 75%, #444 100%)",
      // Pure solid colors
      "#ffffff",
      "#000000",
      "#ff7a1a",
      "rgba(0, 0, 0, 0.5)",
      // Empty string fallback
      "",
      "   ",
    ];

    for (const css of complexGradients) {
      const h1 = createHarnessMockCtx();
      const fill1 = createUniversalBackgroundFill(h1.ctx, 1920, 1080, css);

      const h2 = createHarnessMockCtx();
      const fill2 = createBackgroundFill(h2.ctx, 1920, 1080, css);

      if (typeof fill1 === "string") {
        expect(fill2).toBe(fill1);
      } else {
        expect(typeof fill2).not.toBe("string");
        const g1 = h1.recordedGradients[0]!;
        const g2 = h2.recordedGradients[0]!;
        expect(g1.type).toBe(g2.type);
        expect(g1.x0).toBeCloseTo(g2.x0, 5);
        expect(g1.y0).toBeCloseTo(g2.y0, 5);
        expect(g1.x1).toBeCloseTo(g2.x1, 5);
        expect(g1.y1).toBeCloseTo(g2.y1, 5);
        expect(g1.stops).toEqual(g2.stops);
      }
    }
  });

  it("extractGradientArgs correctly separates top-level tokens without splitting nested parenthesis commas", () => {
    const css = "linear-gradient(135deg, rgba(255, 122, 26, 0.8) 0%, rgba(30, 32, 36, 0.95) 70%, #000000 100%)";
    const args = extractGradientArgs(css);
    expect(args).toHaveLength(4);
    expect(args[0]).toBe("135deg");
    expect(args[1]).toBe("rgba(255, 122, 26, 0.8) 0%");
    expect(args[2]).toBe("rgba(30, 32, 36, 0.95) 70%");
    expect(args[3]).toBe("#000000 100%");
  });

  it("parseColorStops interpolates unspecified offsets cleanly", () => {
    const stops = parseColorStops(["#ff0000", "#00ff00", "#00ffff", "#0000ff"]);
    expect(stops).toHaveLength(4);
    expect(stops[0]!.offset).toBe(0);
    expect(stops[1]!.offset).toBeCloseTo(0.333, 2);
    expect(stops[2]!.offset).toBeCloseTo(0.667, 2);
    expect(stops[3]!.offset).toBe(1);
  });
});

/* ========================================================================== */
/* 3. Template defaultTextOverlays Motion Evaluation Suite                    */
/* ========================================================================== */

describe("Milestone 1: Studio Templates defaultTextOverlays Motion Evaluation", () => {
  it("defines exactly 10 high-craft studio motion templates", () => {
    expect(STUDIO_MOTION_TEMPLATES.length).toBe(10);
  });

  it("every template contains at least 1 defaultTextOverlay without any pill badge properties", () => {
    for (const template of STUDIO_MOTION_TEMPLATES) {
      expect(template.defaultTextOverlays.length, `Template ${template.id} must have text overlays`).toBeGreaterThanOrEqual(1);
      for (const overlay of template.defaultTextOverlays) {
        expect((overlay as any).badge).toBeUndefined();
        expect((overlay as any).badgeStyle).toBeUndefined();
        expect("badge" in overlay).toBe(false);
        expect("badgeStyle" in overlay).toBe(false);
        expect(overlay.text).toBeTruthy();
        expect(overlay.startTimeMs).toBeGreaterThanOrEqual(0);
        expect(overlay.durationMs).toBeGreaterThan(0);
      }
    }
  });

  it("evaluates defaultTextOverlays across all 10 templates cleanly with evaluateTextOverlayMotion", () => {
    for (const template of STUDIO_MOTION_TEMPLATES) {
      for (let i = 0; i < template.defaultTextOverlays.length; i++) {
        const rawOverlay = template.defaultTextOverlays[i]!;
        const overlay: TextOverlay = {
          ...rawOverlay,
          id: `${template.id}-overlay-${i}`,
        };

        const start = overlay.startTimeMs;
        const dur = overlay.durationMs;
        const end = start + dur;

        // Sample timestamps across all motion phases
        const testTimestamps = [
          -500, // Pre-start far
          start - 50, // Pre-start near
          start - 1, // Pre-start boundary
          start, // Entrance begin
          start + 50, // Entrance early
          start + 150, // Entrance mid
          start + 300, // Entrance late
          start + dur * 0.5, // Sustain / Hold exact center
          end - 150, // Exit early
          end - 50, // Exit mid
          end, // Exit complete boundary
          end + 1, // Post-end boundary
          end + 500, // Post-end far
        ];

        // Also perform continuous 60fps frame-by-frame evaluation (every 16ms)
        const frameStepMs = 16.67;
        for (let t = Math.max(0, start - 200); t <= end + 200; t += frameStepMs) {
          testTimestamps.push(t);
        }

        for (const t of testTimestamps) {
          const motion = evaluateTextOverlayMotion(overlay, t);

          // Parity & validity assertions
          expect(Number.isFinite(motion.opacity), `Template ${template.id} opacity at ${t}ms must be finite`).toBe(true);
          expect(Number.isFinite(motion.scale), `Template ${template.id} scale at ${t}ms must be finite`).toBe(true);
          expect(Number.isFinite(motion.translateX), `Template ${template.id} translateX at ${t}ms must be finite`).toBe(true);
          expect(Number.isFinite(motion.translateY), `Template ${template.id} translateY at ${t}ms must be finite`).toBe(true);
          expect(Number.isFinite(motion.blur), `Template ${template.id} blur at ${t}ms must be finite`).toBe(true);

          // Range assertions
          expect(motion.opacity).toBeGreaterThanOrEqual(0);
          expect(motion.opacity).toBeLessThanOrEqual(1.0001);

          expect(motion.scale).toBeGreaterThan(0);
          expect(motion.scale).toBeLessThanOrEqual(2.0);

          expect(motion.blur).toBeGreaterThanOrEqual(0);
          expect(motion.blur).toBeLessThanOrEqual(25.0);

          // Phase-specific mathematical guarantees
          if (t < start) {
            expect(motion.opacity, `Opacity before start must be 0 at ${t}ms`).toBe(0);
          } else if (t > end) {
            expect(motion.opacity, `Opacity after end must be 0 at ${t}ms`).toBe(0);
          }
        }

        // Midpoint must be fully visible and centered during sustain
        const midMotion = evaluateTextOverlayMotion(overlay, start + dur * 0.5);
        expect(midMotion.opacity).toBe(1);
        expect(midMotion.scale).toBe(1);
        expect(midMotion.translateX).toBe(0);
        expect(midMotion.translateY).toBe(0);
        expect(midMotion.blur).toBe(0);
      }
    }
  });

  it("each template has distinct motion choreography settings and assigned motionPresets", () => {
    const motionPresetsFound = new Set<string>();

    for (const template of STUDIO_MOTION_TEMPLATES) {
      expect(template.motionSignature).toBeDefined();
      expect(template.motionSignature?.type).toBeTruthy();
      expect(template.visualAccent).toBeDefined();

      for (const overlay of template.defaultTextOverlays) {
        if (overlay.motionPreset) {
          motionPresetsFound.add(overlay.motionPreset);
        }
      }
    }

    // Verify diversity of motion presets across templates (not all identical generic fade)
    expect(motionPresetsFound.size).toBeGreaterThanOrEqual(4);
    expect(motionPresetsFound.has("elastic-pop") || motionPresetsFound.has("fluid-slide")).toBe(true);
  });
});
