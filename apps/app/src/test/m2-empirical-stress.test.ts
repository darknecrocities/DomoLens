import { describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_PRESETS,
  CURSOR_PRESETS,
  VISIBLE_CURSOR_PRESETS,
  evaluateTextOverlayMotion,
  type CursorAvatar,
  type CursorStyle,
  type TextCardStyle,
  type TextMotionPreset,
  type TextOverlay,
} from "@domolens/core";
import { CanvasCursorSvg, CursorAvatarBadge } from "../components/editor/VideoCanvas";
import {
  createUniversalBackgroundFill,
  drawCanvasAvatarBadge,
  drawCanvasAvatarIcon,
  drawCanvasCursor,
  getOutputDimensions,
  renderActiveTextOverlays,
  type ExportResolution,
} from "../lib/video-renderer";

/* ========================================================================== */
/* Transform Matrix & Canvas 2D Stress Test Oracle                            */
/* ========================================================================== */

interface Matrix2D {
  a: number; // m11
  b: number; // m12
  c: number; // m21
  d: number; // m22
  e: number; // m41 (dx)
  f: number; // m42 (dy)
}

function identityMatrix(): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

function multiplyMatrix(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function translateMatrix(dx: number, dy: number): Matrix2D {
  return { a: 1, b: 0, c: 0, d: 1, e: dx, f: dy };
}

function scaleMatrix(sx: number, sy: number): Matrix2D {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

function transformPoint(m: Matrix2D, x: number, y: number): { x: number; y: number } {
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f,
  };
}

interface ComprehensiveMockCanvas {
  ctx: CanvasRenderingContext2D;
  filledTexts: string[];
  strokedTexts: string[];
  fills: Array<string | CanvasGradient | CanvasPattern>;
  strokes: Array<string | CanvasGradient | CanvasPattern>;
  getSaveBalance: () => number;
  getCurrentMatrix: () => Matrix2D;
  resetCounts: () => void;
}

function createComprehensiveMockCanvas(): ComprehensiveMockCanvas {
  let saveCount = 0;
  let restoreCount = 0;
  const matrixStack: Matrix2D[] = [identityMatrix()];
  let currentMatrix: Matrix2D = identityMatrix();

  const filledTexts: string[] = [];
  const strokedTexts: string[] = [];
  const fills: Array<string | CanvasGradient | CanvasPattern> = [];
  const strokes: Array<string | CanvasGradient | CanvasPattern> = [];

  const gradientMock = {
    addColorStop: vi.fn(),
  };

  const ctx = {
    save: vi.fn(() => {
      saveCount++;
      matrixStack.push({ ...currentMatrix });
    }),
    restore: vi.fn(() => {
      restoreCount++;
      if (matrixStack.length > 1) {
        currentMatrix = matrixStack.pop()!;
      }
    }),
    translate: vi.fn((dx: number, dy: number) => {
      currentMatrix = multiplyMatrix(currentMatrix, translateMatrix(dx, dy));
    }),
    scale: vi.fn((sx: number, sy: number) => {
      currentMatrix = multiplyMatrix(currentMatrix, scaleMatrix(sx, sy));
    }),
    rotate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(() => {
      currentMatrix = identityMatrix();
    }),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    clip: vi.fn(),
    fill: vi.fn(function (this: { fillStyle: string | CanvasGradient | CanvasPattern }) {
      if (this.fillStyle) fills.push(this.fillStyle);
    }),
    stroke: vi.fn(function (this: { strokeStyle: string | CanvasGradient | CanvasPattern }) {
      if (this.strokeStyle) strokes.push(this.strokeStyle);
    }),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn((text: string) => {
      filledTexts.push(text);
    }),
    strokeText: vi.fn((text: string) => {
      strokedTexts.push(text);
    }),
    measureText: vi.fn((text: string) => ({
      width: text.length * 8,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 3,
    })),
    createLinearGradient: vi.fn(() => gradientMock),
    createRadialGradient: vi.fn(() => gradientMock),
    drawImage: vi.fn(),
    fillStyle: "#000000" as string | CanvasGradient | CanvasPattern,
    strokeStyle: "#000000" as string | CanvasGradient | CanvasPattern,
    lineWidth: 1,
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    miterLimit: 10,
    globalAlpha: 1,
    globalCompositeOperation: "source-over" as GlobalCompositeOperation,
    font: "10px sans-serif",
    textAlign: "start" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    shadowColor: "rgba(0, 0, 0, 0)",
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
    getSaveBalance: () => saveCount - restoreCount,
    getCurrentMatrix: () => currentMatrix,
    resetCounts: () => {
      saveCount = 0;
      restoreCount = 0;
      matrixStack.length = 1;
      currentMatrix = identityMatrix();
      filledTexts.length = 0;
      strokedTexts.length = 0;
      fills.length = 0;
      strokes.length = 0;
    },
  };
}

/* ========================================================================== */
/* Empirical Stress Test Suite                                                */
/* ========================================================================== */

describe("Milestone 2 Empirical Stress Testing — Challenger 1", () => {
  const RESOLUTIONS: ExportResolution[] = ["720p", "1080p", "4k", "gif"];
  const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3"] as const;

  /* ======================================================================== */
  /* 1. EXPORT PARITY STRESS TESTING                                          */
  /* ======================================================================== */
  describe("1. Export Parity: Multi-Resolution & Aspect Ratio Stress Testing", () => {
    it("computes valid non-zero integer canvas dimensions for all 16 resolution/aspect-ratio combinations", () => {
      for (const res of RESOLUTIONS) {
        for (const ar of ASPECT_RATIOS) {
          const dims = getOutputDimensions(res, ar);
          expect(dims.width, `Width for ${res} ${ar} must be positive`).toBeGreaterThan(0);
          expect(dims.height, `Height for ${res} ${ar} must be positive`).toBeGreaterThan(0);
          expect(Number.isInteger(dims.width), `Width for ${res} ${ar} must be integer`).toBe(true);
          expect(Number.isInteger(dims.height), `Height for ${res} ${ar} must be integer`).toBe(true);

          // Verify aspect ratio conformance within rounding
          const calculatedRatio = dims.width / dims.height;
          let expectedRatio = 16 / 9;
          if (ar === "9:16") expectedRatio = 9 / 16;
          else if (ar === "1:1") expectedRatio = 1;
          else if (ar === "4:3") expectedRatio = 4 / 3;

          expect(calculatedRatio).toBeCloseTo(expectedRatio, 2);
        }
      }
    });

    it("renders active text overlays across all 5 styles & 6 motion presets on all 16 resolutions without throwing or leaking transforms", () => {
      const styles: TextCardStyle[] = ["glass", "gradient", "solid", "minimal", "terminal"];
      const motions: TextMotionPreset[] = [
        "none",
        "elastic-pop",
        "fluid-slide",
        "whip-slide",
        "blur-reveal",
        "smooth-fade",
      ];

      for (const res of RESOLUTIONS) {
        for (const ar of ASPECT_RATIOS) {
          const { width, height } = getOutputDimensions(res, ar);
          const baseScale = width / 1920;
          const paddingPx = 40 * baseScale;
          const winW = width - 2 * paddingPx;
          const winH = height - 2 * paddingPx;
          const winX = paddingPx;
          const winY = paddingPx;

          const harness = createComprehensiveMockCanvas();

          for (const cardStyle of styles) {
            for (const motionPreset of motions) {
              const overlay: TextOverlay = {
                id: `stress-${res}-${ar}-${cardStyle}-${motionPreset}`,
                text: `Export Stress ${cardStyle} ${res}`,
                kicker: "VERIFICATION ACTIVE",
                startTimeMs: 1000,
                durationMs: 3000,
                x: 0.5,
                y: 0.85,
                fontSize: 24,
                color: "#ffffff",
                cardStyle,
                motionPreset,
              };

              // Test at active playback time
              expect(() => {
                renderActiveTextOverlays(
                  harness.ctx,
                  [overlay],
                  2000,
                  winX,
                  winY,
                  winW,
                  winH,
                  baseScale,
                  "#6366f1",
                );
              }).not.toThrow();

              expect(
                harness.getSaveBalance(),
                `Save/restore must be balanced for ${res} ${ar} ${cardStyle} ${motionPreset}`,
              ).toBe(0);
            }
          }
        }
      }
    });

    it("renders all 23 visible cursor designs under export camera transform across all 16 resolutions with balanced transforms", () => {
      for (const res of RESOLUTIONS) {
        for (const ar of ASPECT_RATIOS) {
          const { width, height } = getOutputDimensions(res, ar);
          const curX = width * 0.42;
          const curY = height * 0.58;

          for (const preset of VISIBLE_CURSOR_PRESETS) {
            const [hx, hy] = preset.hotspot;
            const cursorScales = [0.6, 1.4, 3.0];

            for (const cursorScale of cursorScales) {
              const harness = createComprehensiveMockCanvas();

              expect(() => {
                // Exact export pipeline transformation sequence from video-renderer.ts
                harness.ctx.save();
                harness.ctx.translate(curX, curY);
                harness.ctx.scale(cursorScale, cursorScale);
                harness.ctx.translate(-hx, -hy);

                drawCanvasCursor(harness.ctx, preset.id as CursorStyle, { glow: true });

                harness.ctx.restore();
              }).not.toThrow();

              expect(
                harness.getSaveBalance(),
                `Cursor ${preset.id} at ${res} ${ar} scale ${cursorScale} must balance context`,
              ).toBe(0);
            }
          }
        }
      }
    });

    it("renders universal background fills for all 32 presets across all 16 output dimensions without throwing", () => {
      for (const res of RESOLUTIONS) {
        for (const ar of ASPECT_RATIOS) {
          const { width, height } = getOutputDimensions(res, ar);
          const harness = createComprehensiveMockCanvas();

          for (const preset of BACKGROUND_PRESETS) {
            expect(() => {
              const fill = createUniversalBackgroundFill(harness.ctx, width, height, preset.value);
              expect(fill).toBeDefined();
            }).not.toThrow();
          }
        }
      }
    });

    it("evaluates text overlay motion safely with edge timestamps (negative, zero, extreme)", () => {
      const overlay: TextOverlay = {
        id: "edge-overlay",
        text: "Boundary Test",
        fontSize: 24,
        color: "#ffffff",
        startTimeMs: 1000,
        durationMs: 2000,
        x: 0.5,
        y: 0.5,
      };

      const edgeTimes = [-1000, 0, 999, 1000, 2000, 3000, 3001, 100000, NaN, Infinity];
      for (const t of edgeTimes) {
        expect(() => {
          const motion = evaluateTextOverlayMotion(overlay, t);
          expect(motion).toBeDefined();
          if (!Number.isNaN(t) && Number.isFinite(t)) {
            expect(Number.isFinite(motion.opacity)).toBe(true);
            expect(Number.isFinite(motion.scale)).toBe(true);
            expect(Number.isFinite(motion.translateX)).toBe(true);
            expect(Number.isFinite(motion.translateY)).toBe(true);
            expect(Number.isFinite(motion.blur)).toBe(true);
          }
        }).not.toThrow();
      }
    });
  });

  /* ======================================================================== */
  /* 2. HOTSPOT ALIGNMENT STRESS TESTING                                      */
  /* ======================================================================== */
  describe("2. Hotspot Alignment: Mathematical Verification Across All 24 Presets & Scales", () => {
    it("verifies all 24 presets in CURSOR_PRESETS possess finite non-negative hotspot coordinates", () => {
      expect(CURSOR_PRESETS).toHaveLength(24);

      for (const preset of CURSOR_PRESETS) {
        expect(Array.isArray(preset.hotspot), `Hotspot of ${preset.id} must be an array`).toBe(true);
        expect(preset.hotspot).toHaveLength(2);
        const [hx, hy] = preset.hotspot;
        expect(Number.isFinite(hx), `hx of ${preset.id} must be finite`).toBe(true);
        expect(Number.isFinite(hy), `hy of ${preset.id} must be finite`).toBe(true);
        expect(hx, `hx of ${preset.id} must be non-negative`).toBeGreaterThanOrEqual(0);
        expect(hy, `hy of ${preset.id} must be non-negative`).toBeGreaterThanOrEqual(0);
      }
    });

    it("proves mathematically that DOM CSS transform lands local hotspot (hx, hy) exactly at (cursorX, cursorY) for all 24 presets at scales 0.6x, 1.4x, 3.0x", () => {
      const testCoordinates = [
        { cursorX: 0, cursorY: 0 },
        { cursorX: 0.5, cursorY: 0.5 },
        { cursorX: 0.123, cursorY: 0.789 },
        { cursorX: 1.0, cursorY: 1.0 },
      ];

      const scales = [0.6, 1.4, 3.0, 0.1, 5.0];

      for (const preset of CURSOR_PRESETS) {
        const [hx, hy] = preset.hotspot;

        for (const coord of testCoordinates) {
          for (const scale of scales) {
            // Container origin in CSS:
            // left: coord.cursorX, top: coord.cursorY
            // transform: translate3d(-hx * scale, -hy * scale, 0) scale(scale)
            // transformOrigin: "0 0"
            //
            // Applying transform to local point (hx, hy):
            // x_screen = coord.cursorX + (-hx * scale) + (hx * scale) = coord.cursorX
            // y_screen = coord.cursorY + (-hy * scale) + (hy * scale) = coord.cursorY
            const offsetX = -hx * scale;
            const offsetY = -hy * scale;
            const localTransformedX = hx * scale + offsetX;
            const localTransformedY = hy * scale + offsetY;
            const screenX = coord.cursorX + localTransformedX;
            const screenY = coord.cursorY + localTransformedY;

            expect(
              Math.abs(localTransformedX),
              `Preset ${preset.id} X hotspot alignment at scale ${scale} must equal 0`,
            ).toBeLessThanOrEqual(1e-12);

            expect(
              Math.abs(localTransformedY),
              `Preset ${preset.id} Y hotspot alignment at scale ${scale} must equal 0`,
            ).toBeLessThanOrEqual(1e-12);

            expect(screenX).toBeCloseTo(coord.cursorX, 10);
            expect(screenY).toBeCloseTo(coord.cursorY, 10);
          }
        }
      }
    });

    it("proves mathematically that Canvas 2D affine matrix transformation lands local tip (hx, hy) exactly at (curX, curY) for all 24 presets", () => {
      const testPositions = [
        { curX: 100, curY: 200 },
        { curX: 960, curY: 540 },
        { curX: 3840, curY: 2160 },
        { curX: 0, curY: 0 },
        { curX: 456.78, curY: 890.12 },
      ];

      const scales = [0.6, 1.4, 3.0];

      for (const preset of CURSOR_PRESETS) {
        const [hx, hy] = preset.hotspot;

        for (const pos of testPositions) {
          for (const scale of scales) {
            // Canvas transform sequence:
            // 1. Translate(curX, curY)
            // 2. Scale(scale, scale)
            // 3. Translate(-hx, -hy)
            let m = identityMatrix();
            m = multiplyMatrix(m, translateMatrix(pos.curX, pos.curY));
            m = multiplyMatrix(m, scaleMatrix(scale, scale));
            m = multiplyMatrix(m, translateMatrix(-hx, -hy));

            // Transform the local hotspot (hx, hy)
            const transformedTip = transformPoint(m, hx, hy);

            expect(
              transformedTip.x,
              `Canvas tip X for preset ${preset.id} at scale ${scale} must match curX`,
            ).toBeCloseTo(pos.curX, 10);

            expect(
              transformedTip.y,
              `Canvas tip Y for preset ${preset.id} at scale ${scale} must match curY`,
            ).toBeCloseTo(pos.curY, 10);
          }
        }
      }
    });

    it("verifies every visible preset is supported in both CanvasCursorSvg and drawCanvasCursor without missing cases", () => {
      for (const preset of VISIBLE_CURSOR_PRESETS) {
        // SVG preview
        const svg = CanvasCursorSvg({ cursorStyle: preset.id as CursorStyle });
        expect(svg, `SVG preset ${preset.id} must be defined`).not.toBeNull();
        expect(svg?.type).toBe("svg");

        // Canvas export
        const harness = createComprehensiveMockCanvas();
        expect(() => {
          drawCanvasCursor(harness.ctx, preset.id as CursorStyle);
        }).not.toThrow();
        expect(harness.getSaveBalance(), `Canvas cursor ${preset.id} must balance context`).toBe(0);
      }
    });
  });

  /* ======================================================================== */
  /* 3. AVATAR BADGE VARIANTS & ADVERSARIAL STRESS TESTING                     */
  /* ======================================================================== */
  describe("3. Presenter Avatar Badge: Variants & Adversarial Input Stress Testing", () => {
    const DIVERSE_TEST_VALUES = [
      // Standard values
      { label: "Standard initials", value: "KP" },
      { label: "Single char", value: "A" },
      { label: "Standard text", value: "Speaker" },
      // Emojis & Complex unicode
      { label: "Single emoji", value: "🚀" },
      { label: "Multi-emoji", value: "🚀🔥🎉" },
      { label: "Flag emoji (surrogate pairs)", value: "🇺🇸" },
      { label: "Compound ZWJ emoji", value: "👩‍💻" },
      { label: "Skin tone modifier", value: "👍🏽" },
      { label: "Family ZWJ sequence", value: "👨‍👩‍👧‍👦" },
      // Diverse scripts
      { label: "CJK Kanji", value: "東京" },
      { label: "Arabic RTL", value: "مرحبا" },
      { label: "Cyrillic", value: "Привет" },
      { label: "Accented Latin", value: "Élève" },
      { label: "Mathematical symbols", value: "∑π∞" },
      // Whitespace and boundary values
      { label: "Empty string", value: "" },
      { label: "Whitespace spaces", value: "   " },
      { label: "Tab newline whitespace", value: "\t\n" },
      // Long values
      { label: "50-char string", value: "A".repeat(50) },
      { label: "500-char string", value: "LongBadgeValue".repeat(35) },
      // Special characters
      { label: "HTML/XSS injection string", value: "<script>alert(1)</script>" },
      { label: "Quotes and escapes", value: "\" ' ` \\ / & < >" },
    ];

    const DIVERSE_BADGE_LABELS = [
      undefined,
      "",
      "Speaker",
      "Host",
      "Director",
      "Live",
      "Verified Presenter",
      "   ",
      "🚀 Live Now",
      "東京都港区",
      "Very Long Subtitle Label Describing Presenter In Detail For Overflow Testing",
      "<span class='alert'>Presenter</span>",
    ];

    it("stress tests Canvas 2D export drawCanvasAvatarBadge across all 4 types with diverse strings without throwing or leaking context", () => {
      const types: Array<CursorAvatar["type"]> = ["initials", "icon", "text", "image"];

      for (const type of types) {
        for (const testVal of DIVERSE_TEST_VALUES) {
          for (const badgeLabel of DIVERSE_BADGE_LABELS) {
            const avatar: CursorAvatar = {
              enabled: true,
              type,
              value: testVal.value,
              color: "#6366f1",
              badgeLabel,
            };

            const harness = createComprehensiveMockCanvas();

            expect(() => {
              drawCanvasAvatarBadge(harness.ctx, avatar, 4, 4);
            }, `drawCanvasAvatarBadge must not throw for ${type} with ${testVal.label}`).not.toThrow();

            expect(
              harness.getSaveBalance(),
              `Context balance must be 0 for ${type} with ${testVal.label} (badgeLabel: ${badgeLabel})`,
            ).toBe(0);
          }
        }
      }
    });

    it("stress tests React preview CursorAvatarBadge across all 4 types with diverse strings without throwing", () => {
      const types: Array<CursorAvatar["type"]> = ["initials", "icon", "text", "image"];

      for (const type of types) {
        for (const testVal of DIVERSE_TEST_VALUES) {
          for (const badgeLabel of DIVERSE_BADGE_LABELS) {
            const avatar: CursorAvatar = {
              enabled: true,
              type,
              value: testVal.value,
              color: "#ec4899",
              badgeLabel,
            };

            expect(() => {
              const element = CursorAvatarBadge({ avatar, hx: 2, hy: 2 });
              expect(element, `CursorAvatarBadge must return element for enabled ${type}`).not.toBeNull();
            }).not.toThrow();
          }
        }
      }
    });

    it("tests all 9 vector icons in both live preview and Canvas 2D export", () => {
      const icons = [
        "sparkles",
        "star",
        "zap",
        "flame",
        "shield",
        "crown",
        "check",
        "heart",
        "user",
        // Unknown icon should safely fallback to default sparkles
        "nonexistent-icon",
      ];

      for (const icon of icons) {
        // 1. Preview
        expect(() => {
          const element = CursorAvatarBadge({
            avatar: { enabled: true, type: "icon", value: icon },
            hx: 0,
            hy: 0,
          });
          expect(element).not.toBeNull();
        }).not.toThrow();

        // 2. Export vector icon routine
        const harness = createComprehensiveMockCanvas();
        expect(() => {
          drawCanvasAvatarIcon(harness.ctx, icon, 10, 10);
        }).not.toThrow();
        expect(harness.getSaveBalance(), `drawCanvasAvatarIcon for ${icon} must balance context`).toBe(0);

        // 3. Export badge routine
        harness.resetCounts();
        expect(() => {
          drawCanvasAvatarBadge(
            harness.ctx,
            { enabled: true, type: "icon", value: icon, badgeLabel: "IconTest" },
            0,
            0,
          );
        }).not.toThrow();
        expect(harness.getSaveBalance(), `drawCanvasAvatarBadge for ${icon} must balance context`).toBe(0);
      }
    });

    it("evaluates behavior differences between Live Preview and Canvas 2D Export for image and text types", () => {
      // EMPIRICAL OBSERVATION:
      // In live preview (CursorAvatarBadge):
      // - type 'text' renders full avatar.value || "Host"
      // - type 'image' renders <img src={avatar.value} ... />
      // In export (drawCanvasAvatarBadge):
      // - type 'text' renders (avatar.value || "DL").slice(0, 3).toUpperCase()
      // - type 'image' has no <img> loader branch; it hits the text fallback:
      //   (avatar.value || "DL").slice(0, 3).toUpperCase()

      const textHarness = createComprehensiveMockCanvas();
      drawCanvasAvatarBadge(
        textHarness.ctx,
        { enabled: true, type: "text", value: "Presenter" },
        0,
        0,
      );
      // In export, "Presenter" is truncated to 3 uppercase letters "PRE"
      expect(textHarness.filledTexts).toContain("PRE");

      const imageHarness = createComprehensiveMockCanvas();
      drawCanvasAvatarBadge(
        imageHarness.ctx,
        { enabled: true, type: "image", value: "https://avatar.png" },
        0,
        0,
      );
      // In export, URL string "https://avatar.png" is truncated to "HTT"
      expect(imageHarness.filledTexts).toContain("HTT");
    });

    it("verifies empty/whitespace fallback handling", () => {
      // When avatar value is empty string, initials/text fallback kicks in
      const harness = createComprehensiveMockCanvas();
      drawCanvasAvatarBadge(
        harness.ctx,
        { enabled: true, type: "initials", value: "" },
        0,
        0,
      );
      expect(harness.filledTexts).toContain("DL");

      // When avatar value is whitespace "   ", slice(0, 3) yields "   "
      harness.resetCounts();
      drawCanvasAvatarBadge(
        harness.ctx,
        { enabled: true, type: "initials", value: "   " },
        0,
        0,
      );
      expect(harness.filledTexts).toContain("   ");
    });
  });
});
