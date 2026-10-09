import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  STUDIO_MOTION_TEMPLATES,
  CURSOR_PRESETS,
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_LOOKS,
  evaluateTextOverlayMotion,
  getCursorPreset,
  type CursorAvatar,
  type CursorStyle,
  type ProjectData,
  type ProjectSummary,
  type TextCardStyle,
  type TextMotionPreset,
  type TextOverlay,
} from "@domolens/core";
import { VideoCanvas, CursorAvatarBadge } from "../components/editor/VideoCanvas";
import {
  drawCanvasAvatarBadge,
  drawCanvasAvatarIcon,
  drawCanvasCursor,
  renderActiveTextOverlays,
} from "../lib/video-renderer";
import { useEditor } from "../store/editor";
import { useProjects } from "../store/projects";

/* ========================================================================== */
/* Challenger Empirical Mock Context with Strict NaN / Infinity Detectors    */
/* ========================================================================== */

interface StrictMockCanvas {
  ctx: CanvasRenderingContext2D;
  filledTexts: string[];
  strokedTexts: string[];
  fills: Array<string | CanvasGradient | CanvasPattern>;
  strokes: Array<string | CanvasGradient | CanvasPattern>;
  nanViolations: string[];
  getSaveBalance: () => number;
}

function createStrictMockCanvas(): StrictMockCanvas {
  let saveCount = 0;
  let restoreCount = 0;
  const filledTexts: string[] = [];
  const strokedTexts: string[] = [];
  const fills: Array<string | CanvasGradient | CanvasPattern> = [];
  const strokes: Array<string | CanvasGradient | CanvasPattern> = [];
  const nanViolations: string[] = [];

  function assertNumbers(method: string, ...args: unknown[]) {
    for (let i = 0; i < args.length; i++) {
      const val = args[i];
      if (typeof val === "number" && (!Number.isFinite(val) || Number.isNaN(val))) {
        nanViolations.push(`${method} arg[${i}] is invalid number: ${val}`);
      }
    }
  }

  const gradientMock = {
    addColorStop: vi.fn((offset: number, _color: string) => {
      assertNumbers("addColorStop", offset);
    }),
  };

  const ctx = {
    save: vi.fn(() => {
      saveCount++;
    }),
    restore: vi.fn(() => {
      restoreCount++;
    }),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn((x: number, y: number) => {
      assertNumbers("moveTo", x, y);
    }),
    lineTo: vi.fn((x: number, y: number) => {
      assertNumbers("lineTo", x, y);
    }),
    arc: vi.fn((x: number, y: number, r: number, sa: number, ea: number) => {
      assertNumbers("arc", x, y, r, sa, ea);
    }),
    arcTo: vi.fn((x1: number, y1: number, x2: number, y2: number, r: number) => {
      assertNumbers("arcTo", x1, y1, x2, y2, r);
    }),
    quadraticCurveTo: vi.fn((cpx: number, cpy: number, x: number, y: number) => {
      assertNumbers("quadraticCurveTo", cpx, cpy, x, y);
    }),
    bezierCurveTo: vi.fn(
      (cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number) => {
        assertNumbers("bezierCurveTo", cp1x, cp1y, cp2x, cp2y, x, y);
      },
    ),
    rect: vi.fn((x: number, y: number, w: number, h: number) => {
      assertNumbers("rect", x, y, w, h);
    }),
    roundRect: vi.fn((x: number, y: number, w: number, h: number, r: number) => {
      assertNumbers("roundRect", x, y, w, h, r);
    }),
    fill: vi.fn(function (this: { fillStyle: string | CanvasGradient | CanvasPattern }) {
      if (this.fillStyle) fills.push(this.fillStyle);
    }),
    stroke: vi.fn(function (this: { strokeStyle: string | CanvasGradient | CanvasPattern }) {
      if (this.strokeStyle) strokes.push(this.strokeStyle);
    }),
    clip: vi.fn(),
    translate: vi.fn((x: number, y: number) => {
      assertNumbers("translate", x, y);
    }),
    scale: vi.fn((sx: number, sy: number) => {
      assertNumbers("scale", sx, sy);
    }),
    rotate: vi.fn((angle: number) => {
      assertNumbers("rotate", angle);
    }),
    transform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) => {
      assertNumbers("transform", a, b, c, d, e, f);
    }),
    setTransform: vi.fn((a: number, b: number, c: number, d: number, e: number, f: number) => {
      assertNumbers("setTransform", a, b, c, d, e, f);
    }),
    resetTransform: vi.fn(),
    clearRect: vi.fn((x: number, y: number, w: number, h: number) => {
      assertNumbers("clearRect", x, y, w, h);
    }),
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      assertNumbers("fillRect", x, y, w, h);
    }),
    strokeRect: vi.fn((x: number, y: number, w: number, h: number) => {
      assertNumbers("strokeRect", x, y, w, h);
    }),
    fillText: vi.fn((text: string, x: number, y: number) => {
      assertNumbers("fillText", x, y);
      filledTexts.push(text);
    }),
    strokeText: vi.fn((text: string, x: number, y: number) => {
      assertNumbers("strokeText", x, y);
      strokedTexts.push(text);
    }),
    measureText: vi.fn((text: string) => ({
      width: text.length * 10,
      actualBoundingBoxAscent: 11,
      actualBoundingBoxDescent: 3,
    })),
    createLinearGradient: vi.fn((x0: number, y0: number, x1: number, y1: number) => {
      assertNumbers("createLinearGradient", x0, y0, x1, y1);
      return gradientMock;
    }),
    createRadialGradient: vi.fn(
      (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) => {
        assertNumbers("createRadialGradient", x0, y0, r0, x1, y1, r1);
        return gradientMock;
      },
    ),
    drawImage: vi.fn(),
    fillStyle: "#000000",
    strokeStyle: "#000000",
    lineWidth: 1,
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    globalAlpha: 1,
    font: "12px sans-serif",
    textAlign: "start" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    shadowColor: "transparent",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    filter: "none",
  } as unknown as CanvasRenderingContext2D;

  return {
    ctx,
    filledTexts,
    strokedTexts,
    fills,
    strokes,
    nanViolations,
    getSaveBalance: () => saveCount - restoreCount,
  };
}

function createBaseProject(overrides?: Partial<ProjectData>): ProjectData {
  const summary: ProjectSummary = {
    id: "proj-challenger",
    name: "Challenger Regression Project",
    source: "recording",
    createdAt: 1728000000000,
    updatedAt: 1728000000000,
    durationMs: 10000,
    width: 1920,
    height: 1080,
    thumbnail: null,
    media: "blob://video-fixture.mp4",
  };

  return {
    summary,
    clicks: [
      { id: "c1", timestampMs: 1000, x: 0.5, y: 0.5, button: "left" },
      { id: "c2", timestampMs: 3500, x: 0.25, y: 0.75, button: "left" },
    ],
    zoomBlocks: [
      {
        id: "zb1",
        startTimeMs: 800,
        endTimeMs: 2500,
        targetX: 0.5,
        targetY: 0.5,
        scale: 1.6,
        enabled: true,
      },
    ],
    keyframes: [
      { id: "kf1", timeMs: 800, scale: 1.6, targetX: 0.5, targetY: 0.5, easing: "cubic" },
      { id: "kf2", timeMs: 2500, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
    ],
    clips: [
      {
        id: "clip-1",
        name: "Test Clip",
        mediaUrl: "blob://video-fixture.mp4",
        timelineStartMs: 0,
        sourceOffsetMs: 0,
        durationMs: 10000,
        muted: false,
        volume: 1,
      },
    ],
    cursorTrajectory: [
      { timestampMs: 0, x: 0.5, y: 0.5 },
      { timestampMs: 1000, x: 0.5, y: 0.5 },
      { timestampMs: 3500, x: 0.25, y: 0.75 },
      { timestampMs: 10000, x: 0.25, y: 0.75 },
    ],
    effects: [],
    textOverlays: [],
    audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
    looks: {
      ...DEFAULT_LOOKS,
      cursorStyle: "mac",
      cursorSize: 1.4,
      showCursor: true,
    },
    ...overrides,
  };
}

/* ========================================================================== */
/* EMPIRICAL TEST SUITE                                                       */
/* ========================================================================== */

describe("M2 Challenger 2: Empirical Regressions & Backward Compatibility", () => {
  beforeEach(() => {
    useProjects.setState({ projects: [] });
    useEditor.setState({
      project: null,
      currentTimeMs: 0,
      durationMs: 10000,
      isPlaying: false,
      history: [],
      future: [],
    });
  });

  /* ------------------------------------------------------------------------ */
  /* CHALLENGE 1: Legacy Projects & Missing cursorAvatar In VideoCanvas & Export */
  /* ------------------------------------------------------------------------ */
  describe("Challenge 1: Projects without cursorAvatar and legacy cursor styles", () => {
    const legacyStyles: CursorStyle[] = ["default", "mac", "dot", "ring", "hidden"];

    it("1.1. renders VideoCanvas cleanly without runtime exceptions when cursorAvatar is undefined across all legacy cursorStyles", () => {
      for (const style of legacyStyles) {
        const project = createBaseProject({
          looks: {
            ...DEFAULT_LOOKS,
            cursorStyle: style,
            showCursor: true,
            cursorAvatar: undefined, // Explicitly missing
          },
        });

        useEditor.setState({ project, currentTimeMs: 1000 });

        // Execute React SSR rendering of VideoCanvas
        let markup = "";
        expect(() => {
          markup = renderToStaticMarkup(
            React.createElement(VideoCanvas, { project, currentTimeMs: 1000 }),
          );
        }).not.toThrow();

        expect(markup).toBeTruthy();
        expect(markup.length).toBeGreaterThan(100);

        if (style === "hidden") {
          // Hidden style should NOT render a cursor pointer overlay
          expect(markup.includes('data-testid="cursor-svg"')).toBe(false);
        } else {
          // Visible cursor styles render an SVG element
          expect(markup.includes("<svg")).toBe(true);
        }
      }
    });

    it("1.2. renders VideoCanvas cleanly when cursorAvatar is null or empty object", () => {
      const edgeCases: Array<CursorAvatar | null | undefined> = [
        null as unknown as undefined,
        {} as unknown as CursorAvatar,
        { enabled: false } as CursorAvatar,
        { enabled: false, type: "icon", value: "star" } as CursorAvatar,
      ];

      for (const avatar of edgeCases) {
        const project = createBaseProject({
          looks: {
            ...DEFAULT_LOOKS,
            cursorStyle: "mac",
            showCursor: true,
            cursorAvatar: avatar as unknown as CursorAvatar | undefined,
          },
        });

        useEditor.setState({ project, currentTimeMs: 1000 });

        let markup = "";
        expect(() => {
          markup = renderToStaticMarkup(
            React.createElement(VideoCanvas, { project, currentTimeMs: 1000 }),
          );
        }).not.toThrow();

        expect(markup).toBeTruthy();
      }
    });

    it("1.3. renders VideoCanvas cleanly when showCursor is false", () => {
      const project = createBaseProject({
        looks: {
          ...DEFAULT_LOOKS,
          cursorStyle: "mac",
          showCursor: false, // Turned off
          cursorAvatar: undefined,
        },
      });

      useEditor.setState({ project, currentTimeMs: 1000 });

      let markup = "";
      expect(() => {
        markup = renderToStaticMarkup(
          React.createElement(VideoCanvas, { project, currentTimeMs: 1000 }),
        );
      }).not.toThrow();

      expect(markup).toBeTruthy();
    });

    it("1.4. executes export cursor rendering pipeline in video-renderer without runtime exceptions or NaN values for legacy styles", () => {
      for (const style of legacyStyles) {
        const h = createStrictMockCanvas();
        const looks = {
          ...DEFAULT_LOOKS,
          cursorStyle: style,
          cursorAvatar: undefined,
          showCursor: true,
        };

        // Replicate export renderFrame cursor block (video-renderer.ts lines 1434-1470)
        expect(() => {
          if (looks.showCursor && looks.cursorStyle !== "hidden") {
            const preset = getCursorPreset(looks.cursorStyle) || getCursorPreset("mac")!;
            const [hx, hy] = preset.hotspot;
            h.ctx.save();
            h.ctx.translate(100, 100);
            h.ctx.scale(1.4, 1.4);
            h.ctx.translate(-hx, -hy);

            drawCanvasCursor(h.ctx, looks.cursorStyle);

            const avatar = looks.cursorAvatar as CursorAvatar | undefined;
            if (avatar?.enabled) {
              drawCanvasAvatarBadge(h.ctx, avatar, hx, hy);
            }

            h.ctx.restore();
          }
        }).not.toThrow();

        expect(h.nanViolations, `NaN violations detected for cursor style ${style}`).toHaveLength(0);
        expect(h.getSaveBalance(), `Save/restore balance violated for ${style}`).toBe(0);

        // Avatar badge with enabled: false should safely no-op
        expect(() => {
          drawCanvasAvatarBadge(h.ctx, { enabled: false, type: "initials", value: "DL" }, 0, 0);
        }).not.toThrow();
        expect(h.getSaveBalance()).toBe(0);
      }
    });

    it("1.5. empirical finding: exported drawCanvasAvatarBadge lacks optional chaining guard when called directly with undefined", () => {
      const h = createStrictMockCanvas();
      // Observation: while renderFrame at line 1466 guards with `if (looks.cursorAvatar?.enabled)`,
      // the standalone exported utility function drawCanvasAvatarBadge at line 798 executes
      // `if (!avatar.enabled) return;` rather than `if (!avatar?.enabled) return;`, throwing TypeError.
      expect(() => {
        drawCanvasAvatarBadge(h.ctx, undefined as unknown as CursorAvatar, 0, 0);
      }).toThrow(TypeError);
    });

    it("1.6. tests CursorAvatarBadge across all 4 modes with live badge labels", () => {
      // 1. Initials
      const initials = CursorAvatarBadge({
        avatar: { enabled: true, type: "initials", value: "DL", color: "#6366f1", badgeLabel: "Host" },
        hx: 0,
        hy: 0,
      });
      expect(initials).not.toBeNull();
      const initialsHtml = renderToStaticMarkup(initials!);
      expect(initialsHtml).toContain("DL");
      expect(initialsHtml).toContain("Host");

      // 2. Text
      const text = CursorAvatarBadge({
        avatar: { enabled: true, type: "text", value: "Presenter", color: "#10b981", badgeLabel: "Live" },
        hx: 2,
        hy: 2,
      });
      expect(text).not.toBeNull();
      const textHtml = renderToStaticMarkup(text!);
      expect(textHtml).toContain("Presenter");
      expect(textHtml).toContain("Live");

      // 3. Icons (all 9 supported vector icons)
      const iconTypes = ["sparkles", "star", "zap", "flame", "shield", "crown", "check", "heart", "user"] as const;
      for (const ic of iconTypes) {
        const el = CursorAvatarBadge({
          avatar: { enabled: true, type: "icon", value: ic, color: "#f59e0b" },
          hx: 6,
          hy: 6,
        });
        expect(el).not.toBeNull();
        const html = renderToStaticMarkup(el!);
        expect(html).toContain("<svg");
      }

      // 4. Image
      const img = CursorAvatarBadge({
        avatar: { enabled: true, type: "image", value: "https://example.com/avatar.png", color: "#3b82f6" },
        hx: 4,
        hy: 4,
      });
      expect(img).not.toBeNull();
      const imgHtml = renderToStaticMarkup(img!);
      expect(imgHtml).toContain("<img");
      expect(imgHtml).toContain("src=\"https://example.com/avatar.png\"");
    });

    it("1.7. tests Canvas 2D export avatar badge across all 9 icons and text modes with zero NaN arguments", () => {
      const h = createStrictMockCanvas();
      const iconTypes = ["sparkles", "star", "zap", "flame", "shield", "crown", "check", "heart", "user"] as const;

      for (const icon of iconTypes) {
        expect(() => {
          drawCanvasAvatarIcon(h.ctx, icon, 10, 10);
        }).not.toThrow();
        expect(h.nanViolations).toHaveLength(0);
        expect(h.getSaveBalance()).toBe(0);

        expect(() => {
          drawCanvasAvatarBadge(
            h.ctx,
            { enabled: true, type: "icon", value: icon, badgeLabel: "Pro" },
            4,
            4,
          );
        }).not.toThrow();
        expect(h.nanViolations).toHaveLength(0);
        expect(h.getSaveBalance()).toBe(0);
      }
    });

    it("1.8. gracefully degrades on invalid / legacy unrecognized cursorStyle without throwing", () => {
      const invalidStyles = ["", "custom-unrecognized", "old-style-pointer", "none"] as unknown as CursorStyle[];

      for (const badStyle of invalidStyles) {
        // VideoCanvas React render fallback
        const project = createBaseProject({
          looks: {
            ...DEFAULT_LOOKS,
            cursorStyle: badStyle,
          },
        });

        useEditor.setState({ project, currentTimeMs: 500 });

        expect(() => {
          renderToStaticMarkup(React.createElement(VideoCanvas, { project, currentTimeMs: 500 }));
        }).not.toThrow();

        // Canvas 2D export fallback
        const h = createStrictMockCanvas();
        expect(() => {
          drawCanvasCursor(h.ctx, badStyle);
        }).not.toThrow();
        expect(h.getSaveBalance()).toBe(0);
        expect(h.nanViolations).toHaveLength(0);
      }
    });
  });

  /* ------------------------------------------------------------------------ */
  /* CHALLENGE 2: All 10 Studio Templates Motion Overlays In Live & Export     */
  /* ------------------------------------------------------------------------ */
  describe("Challenge 2: All 10 studio templates text overlay rendering with motionPreset and cardStyle", () => {
    it("2.1. verifies all 10 templates have valid defaultTextOverlays with explicit motionPreset and cardStyle", () => {
      expect(STUDIO_MOTION_TEMPLATES).toHaveLength(10);

      const validMotionPresets: TextMotionPreset[] = [
        "none",
        "elastic-pop",
        "fluid-slide",
        "whip-slide",
        "blur-reveal",
        "smooth-fade",
      ];

      const validCardStyles: TextCardStyle[] = [
        "glass",
        "gradient",
        "solid",
        "minimal",
        "terminal",
      ];

      for (const template of STUDIO_MOTION_TEMPLATES) {
        expect(
          template.defaultTextOverlays.length,
          `Template ${template.id} must define default text overlays`,
        ).toBeGreaterThanOrEqual(1);

        for (const overlay of template.defaultTextOverlays) {
          expect(overlay.text, `Template ${template.id} overlay text must not be empty`).toBeTruthy();
          expect(overlay.motionPreset, `Template ${template.id} overlay motionPreset must be defined`).toBeDefined();
          expect(
            validMotionPresets.includes(overlay.motionPreset as TextMotionPreset),
            `Template ${template.id} motionPreset "${overlay.motionPreset}" must be valid`,
          ).toBe(true);

          expect(overlay.cardStyle, `Template ${template.id} overlay cardStyle must be defined`).toBeDefined();
          expect(
            validCardStyles.includes(overlay.cardStyle as TextCardStyle),
            `Template ${template.id} cardStyle "${overlay.cardStyle}" must be valid`,
          ).toBe(true);

          // Confirm zero legacy badge pill containers
          expect((overlay as any).badge).toBeUndefined();
          expect((overlay as any).badgeStyle).toBeUndefined();
        }
      }
    });

    it("2.2. verifies VideoCanvas renders text overlays properly with motionPreset and cardStyle attributes across all 10 templates", () => {
      for (const template of STUDIO_MOTION_TEMPLATES) {
        const textOverlays: TextOverlay[] = template.defaultTextOverlays.map((o, idx) => ({
          ...o,
          id: `${template.id}-txt-${idx}`,
        }));

        const project = createBaseProject({
          looks: {
            ...DEFAULT_LOOKS,
            ...template.looks,
          },
          textOverlays,
        });

        useEditor.setState({ project, currentTimeMs: 0 });

        for (const overlay of textOverlays) {
          const midTimeMs = overlay.startTimeMs + overlay.durationMs / 2;

          useEditor.setState({ currentTimeMs: midTimeMs });

          const markup = renderToStaticMarkup(
            React.createElement(VideoCanvas, { project, currentTimeMs: midTimeMs }),
          );

          // 1. Must render overlay test id
          expect(markup).toContain(`data-testid="text-overlay-${overlay.id}"`);

          // 2. Must carry data-card-style
          expect(markup).toContain(`data-card-style="${overlay.cardStyle}"`);

          // 3. Must carry data-motion-preset
          expect(markup).toContain(`data-motion-preset="${overlay.motionPreset}"`);

          // 4. Must render headline text
          expect(markup).toContain(overlay.text);

          // 5. Must NOT render legacy badge pill classes
          expect(markup).not.toContain("rounded-full px-2.5");
        }
      }
    });

    it("2.3. verifies video-renderer.ts export renderActiveTextOverlays executes with 100% parity across all 10 templates", () => {
      const resolutions = [
        { name: "1080p", width: 1920, height: 1080, scale: 1 },
        { name: "4k", width: 3840, height: 2160, scale: 2 },
        { name: "720p", width: 1280, height: 720, scale: 0.667 },
      ];

      for (const template of STUDIO_MOTION_TEMPLATES) {
        const textOverlays: TextOverlay[] = template.defaultTextOverlays.map((o, idx) => ({
          ...o,
          id: `${template.id}-export-${idx}`,
        }));

        for (const res of resolutions) {
          for (const overlay of textOverlays) {
            const midTime = overlay.startTimeMs + overlay.durationMs / 2;

            const h = createStrictMockCanvas();

            expect(() => {
              renderActiveTextOverlays(
                h.ctx,
                [overlay],
                midTime,
                0,
                0,
                res.width,
                res.height,
                res.scale,
                template.accentColor,
              );
            }).not.toThrow();

            // 1. Text rendered on canvas
            expect(h.filledTexts, `Template ${template.id} overlay text must be drawn in export`).toContain(
              overlay.text,
            );

            // 2. If kicker is present, kicker drawn
            if (overlay.kicker) {
              expect(h.filledTexts).toContain(overlay.kicker.toUpperCase());
            }

            // 3. Context save/restore must balance perfectly
            expect(
              h.getSaveBalance(),
              `Template ${template.id} at resolution ${res.name} must balance ctx.save/restore`,
            ).toBe(0);

            // 4. Zero NaN violations in canvas coordinate calls
            expect(
              h.nanViolations,
              `Template ${template.id} produced invalid NaN arguments: ${h.nanViolations.join(", ")}`,
            ).toHaveLength(0);
          }
        }
      }
    });

    it("2.4. verifies mathematical lifecycle of evaluateTextOverlayMotion across all 5 motion presets", () => {
      const presets: TextMotionPreset[] = [
        "elastic-pop",
        "fluid-slide",
        "whip-slide",
        "blur-reveal",
        "smooth-fade",
      ];

      for (const preset of presets) {
        const overlay: TextOverlay = {
          id: `eval-${preset}`,
          text: `Test ${preset}`,
          startTimeMs: 1000,
          durationMs: 4000,
          x: 0.5,
          y: 0.8,
          fontSize: 24,
          color: "#ffffff",
          motionPreset: preset,
          cardStyle: "glass",
        };

        // Pre-entrance (t = 800ms)
        const pre = evaluateTextOverlayMotion(overlay, 800);
        expect(pre.opacity).toBe(0);

        // Entrance start (t = 1000ms)
        const atStart = evaluateTextOverlayMotion(overlay, 1000);
        expect(atStart.opacity).toBeGreaterThanOrEqual(0);

        // Midpoint sustain (t = 3000ms)
        const mid = evaluateTextOverlayMotion(overlay, 3000);
        expect(mid.opacity).toBe(1);
        expect(mid.scale).toBe(1);
        expect(mid.translateX).toBe(0);
        expect(mid.translateY).toBe(0);
        expect(mid.blur).toBe(0);

        // Post-exit (t = 5200ms)
        const post = evaluateTextOverlayMotion(overlay, 5200);
        expect(post.opacity).toBe(0);
      }
    });
  });

  /* ------------------------------------------------------------------------ */
  /* CHALLENGE 3: High-Stress Boundary Fuzzing & Malformed Inputs              */
  /* ------------------------------------------------------------------------ */
  describe("Challenge 3: High-stress boundary fuzzing and edge inputs", () => {
    it("3.1. survives extreme overlay values (huge text, zero duration, negative coords)", () => {
      const extremeOverlays: TextOverlay[] = [
        {
          id: "huge-text",
          text: "A".repeat(1500),
          startTimeMs: 500,
          durationMs: 3000,
          x: 0.5,
          y: 0.5,
          fontSize: 24,
          color: "#ffffff",
          cardStyle: "glass",
          motionPreset: "elastic-pop",
        },
        {
          id: "empty-text",
          text: "",
          startTimeMs: 500,
          durationMs: 3000,
          x: 0.5,
          y: 0.5,
          fontSize: 24,
          color: "#ffffff",
          cardStyle: "terminal",
          motionPreset: "smooth-fade",
        },
        {
          id: "zero-duration",
          text: "Flash",
          startTimeMs: 500,
          durationMs: 0,
          x: 0.5,
          y: 0.5,
          fontSize: 24,
          color: "#ffffff",
          cardStyle: "solid",
          motionPreset: "whip-slide",
        },
        {
          id: "negative-coords",
          text: "Offscreen",
          startTimeMs: 500,
          durationMs: 3000,
          x: -1.5,
          y: 2.5,
          fontSize: 8,
          color: "#ffffff",
          cardStyle: "minimal",
          motionPreset: "blur-reveal",
        },
        {
          id: "huge-font",
          text: "Giant",
          startTimeMs: 500,
          durationMs: 3000,
          x: 0.5,
          y: 0.5,
          fontSize: 400,
          color: "#ffffff",
          cardStyle: "gradient",
          motionPreset: "fluid-slide",
        },
      ];

      const project = createBaseProject({ textOverlays: extremeOverlays });

      // VideoCanvas render
      expect(() => {
        renderToStaticMarkup(React.createElement(VideoCanvas, { project, currentTimeMs: 1500 }));
      }).not.toThrow();

      // Export render
      const h = createStrictMockCanvas();
      expect(() => {
        renderActiveTextOverlays(h.ctx, extremeOverlays, 1500, 0, 0, 1920, 1080, 1);
      }).not.toThrow();
      expect(h.getSaveBalance()).toBe(0);
    });

    it("3.2. survives 10,000 dense cursor trajectory updates without leaking or throwing", () => {
      const denseTrajectory = Array.from({ length: 10000 }, (_, i) => ({
        timestampMs: i * 2, // 20 seconds total
        x: (Math.sin(i * 0.05) + 1) / 2,
        y: (Math.cos(i * 0.05) + 1) / 2,
      }));

      const base = createBaseProject();
      const project: ProjectData = {
        ...base,
        summary: {
          ...base.summary,
          durationMs: 20000,
        },
        cursorTrajectory: denseTrajectory,
        looks: {
          ...DEFAULT_LOOKS,
          cursorStyle: "mac",
          cursorSmoothing: "cinematic",
          showCursor: true,
        },
      };

      // Sample timestamps
      const testTimes = [0, 500, 2500, 7890, 15400, 19999];
      for (const t of testTimes) {
        expect(() => {
          renderToStaticMarkup(React.createElement(VideoCanvas, { project, currentTimeMs: t }));
        }).not.toThrow();
      }
    });

    it("3.3. verifies all 24 CURSOR_PRESETS hotspots are finite numbers", () => {
      for (const preset of CURSOR_PRESETS) {
        expect(Number.isFinite(preset.hotspot[0])).toBe(true);
        expect(Number.isFinite(preset.hotspot[1])).toBe(true);
        expect(preset.hotspot[0]).toBeGreaterThanOrEqual(0);
        expect(preset.hotspot[1]).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
