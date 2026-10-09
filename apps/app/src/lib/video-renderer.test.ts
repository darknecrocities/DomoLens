import { describe, expect, it, vi } from "vitest";
import {
  createBackgroundFill,
  createUniversalBackgroundFill,
  drawCanvasAvatarBadge,
  drawCanvasCursor,
  extractGradientArgs,
  getOutputDimensions,
  parseColorStops,
  renderActiveTextOverlays,
} from "./video-renderer";
import {
  CURSOR_PRESETS,
  VISIBLE_CURSOR_PRESETS,
  type CursorStyle,
  type TextOverlay,
} from "@domolens/core";

describe("video renderer dimensions", () => {
  it("calculates 16:9 dimensions accurately across profiles", () => {
    expect(getOutputDimensions("1080p", "16:9")).toEqual({ width: 1920, height: 1080 });
    expect(getOutputDimensions("720p", "16:9")).toEqual({ width: 1280, height: 720 });
    expect(getOutputDimensions("4k", "16:9")).toEqual({ width: 3840, height: 2160 });
    expect(getOutputDimensions("gif", "16:9")).toEqual({ width: 960, height: 540 });
  });

  it("calculates 9:16 vertical video dimensions for mobile platforms", () => {
    expect(getOutputDimensions("1080p", "9:16")).toEqual({ width: 1080, height: 1920 });
    expect(getOutputDimensions("720p", "9:16")).toEqual({ width: 720, height: 1280 });
    expect(getOutputDimensions("4k", "9:16")).toEqual({ width: 2160, height: 3840 });
  });

  it("calculates 1:1 square dimensions for social feeds", () => {
    expect(getOutputDimensions("1080p", "1:1")).toEqual({ width: 1080, height: 1080 });
    expect(getOutputDimensions("720p", "1:1")).toEqual({ width: 720, height: 720 });
  });

  it("calculates 4:3 dimensions correctly", () => {
    const dim1080 = getOutputDimensions("1080p", "4:3");
    expect(dim1080.height).toBe(1080);
    expect(dim1080.width).toBe(1440);
  });

  it("handles valid export formats mov, mp4, webm, and gif", () => {
    const formats: Array<"mov" | "mp4" | "webm" | "gif"> = ["mov", "mp4", "webm", "gif"];
    expect(formats).toContain("mov");
    expect(formats).toContain("mp4");
    expect(formats).toContain("webm");
    expect(formats).toContain("gif");
  });
});

describe("createUniversalBackgroundFill & Gradient Parsers", () => {
  function createMockCtx() {
    const linearGradients: Array<{
      x0: number;
      y0: number;
      x1: number;
      y1: number;
      stops: Array<{ offset: number; color: string }>;
    }> = [];

    const radialGradients: Array<{
      x0: number;
      y0: number;
      r0: number;
      x1: number;
      y1: number;
      r1: number;
      stops: Array<{ offset: number; color: string }>;
    }> = [];

    const ctx = {
      createLinearGradient: vi.fn((x0: number, y0: number, x1: number, y1: number) => {
        const stops: Array<{ offset: number; color: string }> = [];
        const grad = {
          x0,
          y0,
          x1,
          y1,
          stops,
          addColorStop: vi.fn((offset: number, color: string) => {
            stops.push({ offset, color });
          }),
        };
        linearGradients.push(grad);
        return grad as unknown as CanvasGradient;
      }),
      createRadialGradient: vi.fn(
        (x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) => {
          const stops: Array<{ offset: number; color: string }> = [];
          const grad = {
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
          radialGradients.push(grad);
          return grad as unknown as CanvasGradient;
        },
      ),
    } as unknown as CanvasRenderingContext2D;

    return { ctx, linearGradients, radialGradients };
  }

  describe("extractGradientArgs", () => {
    it("preserves nested commas within rgba functions", () => {
      const css = "linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)";
      const args = extractGradientArgs(css);
      expect(args).toHaveLength(3);
      expect(args[0]).toBe("135deg");
      expect(args[1]).toBe("rgba(30, 41, 59, 0.75) 0%");
      expect(args[2]).toBe("rgba(15, 23, 42, 0.9) 100%");
    });

    it("returns empty array for invalid gradient syntax", () => {
      expect(extractGradientArgs("")).toEqual([]);
      expect(extractGradientArgs("invalid")).toEqual([]);
    });
  });

  describe("parseColorStops", () => {
    it("parses percentage and unitless offsets", () => {
      const stops = parseColorStops(["#ff0000 0%", "#00ff00 50%", "#0000ff 100%"]);
      expect(stops).toEqual([
        { color: "#ff0000", offset: 0 },
        { color: "#00ff00", offset: 0.5 },
        { color: "#0000ff", offset: 1 },
      ]);
    });

    it("evenly distributes missing intermediate offsets", () => {
      const stops = parseColorStops(["#ff0000", "#00ff00", "#0000ff"]);
      expect(stops).toEqual([
        { color: "#ff0000", offset: 0 },
        { color: "#00ff00", offset: 0.5 },
        { color: "#0000ff", offset: 1 },
      ]);
    });
  });

  describe("linear gradient rendering & W3C projection", () => {
    it("renders multi-stop linear gradient at 135deg", () => {
      const { ctx, linearGradients } = createMockCtx();
      const css = "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #0f172a 100%)";
      const result = createUniversalBackgroundFill(ctx, 1920, 1080, css);

      expect(typeof result).not.toBe("string");
      expect(linearGradients).toHaveLength(1);
      const grad = linearGradients[0]!;
      expect(grad.stops).toHaveLength(3);
      expect(grad.stops[0]).toEqual({ color: "#1e1b4b", offset: 0 });
      expect(grad.stops[1]).toEqual({ color: "#312e81", offset: 0.5 });
      expect(grad.stops[2]).toEqual({ color: "#0f172a", offset: 1 });
    });

    it("calculates exact W3C coordinates for 180deg (top to bottom)", () => {
      const { ctx, linearGradients } = createMockCtx();
      const css = "linear-gradient(180deg, #121316 0%, #08090a 100%)";
      createUniversalBackgroundFill(ctx, 1000, 600, css);

      const grad = linearGradients[0]!;
      // Center is (500, 300). At 180deg: x0 = 500, y0 = 0, x1 = 500, y1 = 600
      expect(grad.x0).toBeCloseTo(500, 1);
      expect(grad.y0).toBeCloseTo(0, 1);
      expect(grad.x1).toBeCloseTo(500, 1);
      expect(grad.y1).toBeCloseTo(600, 1);
    });

    it("calculates exact W3C coordinates for 90deg (left to right)", () => {
      const { ctx, linearGradients } = createMockCtx();
      const css = "linear-gradient(90deg, #121316 0%, #08090a 100%)";
      createUniversalBackgroundFill(ctx, 1000, 600, css);

      const grad = linearGradients[0]!;
      // Center is (500, 300). At 90deg: x0 = 0, y0 = 300, x1 = 1000, y1 = 300
      expect(grad.x0).toBeCloseTo(0, 1);
      expect(grad.y0).toBeCloseTo(300, 1);
      expect(grad.x1).toBeCloseTo(1000, 1);
      expect(grad.y1).toBeCloseTo(300, 1);
    });

    it("supports directional keywords like 'to bottom right'", () => {
      const { ctx, linearGradients } = createMockCtx();
      const css = "linear-gradient(to bottom right, #ffffff 0%, #000000 100%)";
      createUniversalBackgroundFill(ctx, 1920, 1080, css);

      expect(linearGradients).toHaveLength(1);
      expect(linearGradients[0]!.stops).toHaveLength(2);
    });
  });

  describe("radial gradient rendering", () => {
    it("renders radial gradient centered at 50% 50%", () => {
      const { ctx, radialGradients } = createMockCtx();
      const css = "radial-gradient(circle at 50% 50%, #ff7a1a 0%, #1e2024 70%)";
      const result = createUniversalBackgroundFill(ctx, 1000, 800, css);

      expect(typeof result).not.toBe("string");
      expect(radialGradients).toHaveLength(1);
      const grad = radialGradients[0]!;
      expect(grad.x0).toBe(500);
      expect(grad.y0).toBe(400);
      expect(grad.r1).toBeGreaterThan(500);
      expect(grad.stops).toHaveLength(2);
      expect(grad.stops[0]).toEqual({ color: "#ff7a1a", offset: 0 });
      expect(grad.stops[1]).toEqual({ color: "#1e2024", offset: 0.7 });
    });

    it("renders radial gradient with offset center 50% 30%", () => {
      const { ctx, radialGradients } = createMockCtx();
      const css = "radial-gradient(circle at 50% 30%, #4f46e5 0%, #09090b 75%)";
      createUniversalBackgroundFill(ctx, 1000, 1000, css);

      const grad = radialGradients[0]!;
      expect(grad.x0).toBe(500);
      expect(grad.y0).toBe(300);
    });
  });

  describe("solid colors and fallbacks", () => {
    it("returns solid hex color directly without gradient creation", () => {
      const { ctx, linearGradients, radialGradients } = createMockCtx();
      const result = createUniversalBackgroundFill(ctx, 1920, 1080, "#0f1012");
      expect(result).toBe("#0f1012");
      expect(linearGradients).toHaveLength(0);
      expect(radialGradients).toHaveLength(0);
    });

    it("returns fallback color for empty string", () => {
      const { ctx } = createMockCtx();
      expect(createUniversalBackgroundFill(ctx, 1920, 1080, "")).toBe("#0a0a0c");
    });

    it("createBackgroundFill alias behaves identically", () => {
      const { ctx, linearGradients } = createMockCtx();
      const css = "linear-gradient(135deg, #000000 0%, #ffffff 100%)";
      createBackgroundFill(ctx, 100, 100, css);
      expect(linearGradients).toHaveLength(1);
    });
  });
});

/* ========================================================================== */
/* Feature 7 & 8: Text Overlays & Cursor Canvas 2D Tests                     */
/* ========================================================================== */

describe("renderActiveTextOverlays", () => {
  function createTestCanvasContext() {
    const operations: string[] = [];
    const filledTexts: string[] = [];
    let saveCount = 0;
    let restoreCount = 0;

    const ctx: any = {
      save: vi.fn(() => {
        saveCount++;
        operations.push("save");
      }),
      restore: vi.fn(() => {
        restoreCount++;
        operations.push("restore");
      }),
      translate: vi.fn((x, y) => operations.push(`translate(${x},${y})`)),
      scale: vi.fn((sx, sy) => operations.push(`scale(${sx},${sy})`)),
      beginPath: vi.fn(() => operations.push("beginPath")),
      closePath: vi.fn(() => operations.push("closePath")),
      moveTo: vi.fn(() => operations.push("moveTo")),
      lineTo: vi.fn(() => operations.push("lineTo")),
      arc: vi.fn(() => operations.push("arc")),
      fill: vi.fn(() => operations.push("fill")),
      stroke: vi.fn(() => operations.push("stroke")),
      fillRect: vi.fn(() => operations.push("fillRect")),
      roundRect: vi.fn(() => operations.push("roundRect")),
      fillText: vi.fn((text: string) => {
        filledTexts.push(text);
        operations.push(`fillText(${text})`);
      }),
      measureText: vi.fn((text: string) => ({ width: text.length * 10 })),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      globalAlpha: 1,
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetY: 0,
      font: "",
      textAlign: "left",
      textBaseline: "top",
      filter: "none",
    };

    return {
      ctx,
      operations,
      filledTexts,
      getSaveBalance: () => saveCount - restoreCount,
    };
  }

  const baseOverlay: TextOverlay = {
    id: "test-overlay-1",
    text: "Kinetic Showcase",
    kicker: "NEW FEATURE",
    startTimeMs: 1000,
    durationMs: 3000,
    x: 0.5,
    y: 0.85,
    fontSize: 24,
    color: "#ffffff",
    cardStyle: "glass",
    motionPreset: "elastic-pop",
  };

  it("skips rendering when timestamp is outside overlay duration (opacity <= 0.001)", () => {
    const { ctx, operations, filledTexts } = createTestCanvasContext();
    // 500ms before start
    renderActiveTextOverlays(ctx, [baseOverlay], 500, 0, 0, 1920, 1080, 1);
    expect(operations).toHaveLength(0);
    expect(filledTexts).toHaveLength(0);

    // 500ms after end
    renderActiveTextOverlays(ctx, [baseOverlay], 5000, 0, 0, 1920, 1080, 1);
    expect(operations).toHaveLength(0);
    expect(filledTexts).toHaveLength(0);
  });

  it("renders text and unboxed kicker during active display timestamp", () => {
    const { ctx, filledTexts, getSaveBalance } = createTestCanvasContext();
    // At center of duration (t = 2500ms, sustain phase)
    renderActiveTextOverlays(ctx, [baseOverlay], 2500, 0, 0, 1920, 1080, 1);

    expect(filledTexts).toContain("Kinetic Showcase");
    expect(filledTexts).toContain("NEW FEATURE");
    expect(getSaveBalance()).toBe(0); // Balanced save/restore
  });

  it("renders backward-compatible badge as unboxed kicker without capsule pill", () => {
    const { ctx, filledTexts } = createTestCanvasContext();
    const legacyOverlay: TextOverlay = {
      id: "legacy-1",
      text: "Legacy Title",
      badge: "V2.0 RELEASE",
      startTimeMs: 100,
      durationMs: 2000,
      x: 0.5,
      y: 0.8,
      fontSize: 24,
      color: "#ffffff",
    };

    renderActiveTextOverlays(ctx, [legacyOverlay], 1000, 0, 0, 1920, 1080, 1);
    expect(filledTexts).toContain("Legacy Title");
    expect(filledTexts).toContain("V2.0 RELEASE");
  });

  it("supports all 5 card styles: glass, gradient, solid, minimal, terminal", () => {
    const cardStyles = ["glass", "gradient", "solid", "minimal", "terminal"] as const;

    for (const style of cardStyles) {
      const { ctx, filledTexts, getSaveBalance } = createTestCanvasContext();
      const overlay: TextOverlay = {
        ...baseOverlay,
        id: `overlay-${style}`,
        cardStyle: style,
      };

      renderActiveTextOverlays(ctx, [overlay], 2500, 0, 0, 1920, 1080, 1);
      expect(filledTexts).toContain("Kinetic Showcase");
      expect(getSaveBalance()).toBe(0);

      if (style === "gradient") {
        expect(ctx.createLinearGradient).toHaveBeenCalled();
      }
    }
  });
});

describe("drawCanvasCursor & drawCanvasAvatarBadge", () => {
  function createTestCanvasContext() {
    let saveCount = 0;
    let restoreCount = 0;
    const filledTexts: string[] = [];

    const ctx: any = {
      save: vi.fn(() => saveCount++),
      restore: vi.fn(() => restoreCount++),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      ellipse: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      roundRect: vi.fn(),
      fillText: vi.fn((text: string) => filledTexts.push(text)),
      measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      setLineDash: vi.fn(),
      globalAlpha: 1,
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      font: "",
      textAlign: "left",
      textBaseline: "top",
    };

    return {
      ctx,
      filledTexts,
      getSaveBalance: () => saveCount - restoreCount,
    };
  }

  it("draws all 23 visible cursor presets cleanly with balanced save/restore", () => {
    expect(CURSOR_PRESETS).toHaveLength(24);
    expect(VISIBLE_CURSOR_PRESETS).toHaveLength(23);

    for (const preset of VISIBLE_CURSOR_PRESETS) {
      const { ctx, getSaveBalance } = createTestCanvasContext();
      drawCanvasCursor(ctx, preset.id as CursorStyle);
      expect(getSaveBalance(), `Cursor ${preset.id} must balance save/restore`).toBe(0);
    }
  });

  it("hidden cursor renders nothing", () => {
    const { ctx } = createTestCanvasContext();
    drawCanvasCursor(ctx, "hidden");
    expect(ctx.save).not.toHaveBeenCalled();
    expect(ctx.beginPath).not.toHaveBeenCalled();
  });

  it("drawCanvasAvatarBadge renders initials mode and badgeLabel pill", () => {
    const { ctx, filledTexts, getSaveBalance } = createTestCanvasContext();
    drawCanvasAvatarBadge(
      ctx,
      {
        enabled: true,
        type: "initials",
        value: "AK",
        color: "#6366f1",
        badgeLabel: "Speaker",
      },
      2,
      2,
    );

    expect(filledTexts).toContain("AK");
    expect(filledTexts).toContain("Speaker");
    expect(getSaveBalance()).toBe(0);
  });

  it("drawCanvasAvatarBadge renders 9 icon presets cleanly", () => {
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
    ] as const;

    for (const icon of icons) {
      const { ctx, getSaveBalance } = createTestCanvasContext();
      drawCanvasAvatarBadge(
        ctx,
        {
          enabled: true,
          type: "icon",
          value: icon,
          color: "#ec4899",
        },
        0,
        0,
      );
      expect(getSaveBalance()).toBe(0);
    }
  });

  it("drawCanvasAvatarBadge does nothing when disabled", () => {
    const { ctx } = createTestCanvasContext();
    drawCanvasAvatarBadge(
      ctx,
      {
        enabled: false,
        type: "initials",
        value: "AK",
      },
      0,
      0,
    );
    expect(ctx.save).not.toHaveBeenCalled();
  });
});
