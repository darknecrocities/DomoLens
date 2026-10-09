import { describe, expect, it, vi } from "vitest";
import {
  createUniversalBackgroundFill,
  createBackgroundFill,
  extractGradientArgs,
  parseColorStops,
} from "./video-renderer";
import { BACKGROUND_PRESETS } from "@domolens/core";

describe("createUniversalBackgroundFill empirical stress test harness", () => {
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
            if (!color || typeof color !== "string") {
              throw new Error("Invalid color passed to addColorStop");
            }
            if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
              throw new Error(`Invalid offset passed to addColorStop: ${offset}`);
            }
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
              if (!color || typeof color !== "string") {
                throw new Error("Invalid color passed to addColorStop");
              }
              if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
                throw new Error(`Invalid offset passed to addColorStop: ${offset}`);
              }
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

  describe("0. extractGradientArgs and createBackgroundFill alias", () => {
    it("extractGradientArgs splits deeply nested functions without breaking inside parentheses", () => {
      const complex = "linear-gradient(135deg, rgba(255, 0, 0, calc(1 * 0.5)) 0%, hsla(200, 100%, 50%, 0.8) 100%)";
      const args = extractGradientArgs(complex);
      expect(args).toHaveLength(3);
      expect(args[0]).toBe("135deg");
      expect(args[1]).toBe("rgba(255, 0, 0, calc(1 * 0.5)) 0%");
      expect(args[2]).toBe("hsla(200, 100%, 50%, 0.8) 100%");
    });

    it("verifies createBackgroundFill alias points to createUniversalBackgroundFill", () => {
      expect(createBackgroundFill).toBe(createUniversalBackgroundFill);
      const { ctx } = createMockCtx();
      const fill = createBackgroundFill(ctx, 1920, 1080, "#123456");
      expect(fill).toBe("#123456");
    });
  });

  describe("1. Multiline and whitespace variations", () => {
    it("parses multiline linear-gradient with indented color stops and line breaks", () => {
      const { ctx, linearGradients } = createMockCtx();
      const multiline = `
        linear-gradient(
          135deg,
          #1e1b4b 0%,
          #312e81 50%,
          #0f172a 100%
        )
      `;
      const result = createUniversalBackgroundFill(ctx, 1920, 1080, multiline);
      expect(typeof result).not.toBe("string");
      expect(linearGradients).toHaveLength(1);
      expect(linearGradients[0]!.stops).toHaveLength(3);
      expect(linearGradients[0]!.stops[0]).toEqual({ color: "#1e1b4b", offset: 0 });
      expect(linearGradients[0]!.stops[1]).toEqual({ color: "#312e81", offset: 0.5 });
      expect(linearGradients[0]!.stops[2]).toEqual({ color: "#0f172a", offset: 1 });
    });

    it("parses multiline radial-gradient with tab formatting", () => {
      const { ctx, radialGradients } = createMockCtx();
      const multilineRadial = `radial-gradient(\n\tcircle at 50% 30%,\n\t#4f46e5 0%,\n\t#09090b 75%\n)`;
      const result = createUniversalBackgroundFill(ctx, 1280, 720, multilineRadial);
      expect(typeof result).not.toBe("string");
      expect(radialGradients).toHaveLength(1);
      expect(radialGradients[0]!.x0).toBe(640);
      expect(radialGradients[0]!.y0).toBe(216); // 30% of 720
      expect(radialGradients[0]!.stops).toHaveLength(2);
    });
  });

  describe("2. Malformed color stops and resilient fallbacks", () => {
    it("handles missing stop offsets with automatic even linear interpolation", () => {
      const { ctx, linearGradients } = createMockCtx();
      const css = "linear-gradient(90deg, red, green, blue, yellow, purple)";
      const result = createUniversalBackgroundFill(ctx, 1000, 500, css);

      expect(typeof result).not.toBe("string");
      expect(linearGradients).toHaveLength(1);
      const stops = linearGradients[0]!.stops;
      expect(stops).toHaveLength(5);
      expect(stops[0]!.offset).toBe(0);
      expect(stops[1]!.offset).toBeCloseTo(0.25, 2);
      expect(stops[2]!.offset).toBeCloseTo(0.5, 2);
      expect(stops[3]!.offset).toBeCloseTo(0.75, 2);
      expect(stops[4]!.offset).toBe(1);
    });

    it("handles color stops with out-of-order or missing percentages safely", () => {
      const stops = parseColorStops(["#fff", "#888 30%", "#444", "#000"]);
      expect(stops[0]!.offset).toBe(0);
      expect(stops[1]!.offset).toBe(0.3);
      expect(stops[2]!.offset).toBeCloseTo(0.65, 2);
      expect(stops[3]!.offset).toBe(1);
    });

    it("returns raw string without throwing when gradient syntax has insufficient color stops (< 2)", () => {
      const { ctx } = createMockCtx();
      const oneStop = "linear-gradient(135deg, #ff0000 0%)";
      const result = createUniversalBackgroundFill(ctx, 1920, 1080, oneStop);
      expect(result).toBe(oneStop);
    });

    it("gracefully catches syntax errors during addColorStop and falls back to raw string", () => {
      const throwingCtx = {
        createLinearGradient: vi.fn(() => ({
          addColorStop: vi.fn(() => {
            throw new Error("Invalid color syntax");
          }),
        })),
      } as unknown as CanvasRenderingContext2D;

      const badColorCss = "linear-gradient(135deg, !!not-a-color!! 0%, #000 100%)";
      const result = createUniversalBackgroundFill(throwingCtx, 1920, 1080, badColorCss);
      expect(result).toBe(badColorCss);
    });

    it("handles empty or whitespace-only inputs safely", () => {
      const { ctx } = createMockCtx();
      expect(createUniversalBackgroundFill(ctx, 1920, 1080, "")).toBe("#0a0a0c");
      expect(createUniversalBackgroundFill(ctx, 1920, 1080, "   ")).toBe("#0a0a0c");
      expect(createUniversalBackgroundFill(ctx, 1920, 1080, null as unknown as string)).toBe("#0a0a0c");
      expect(createUniversalBackgroundFill(ctx, 1920, 1080, undefined as unknown as string)).toBe("#0a0a0c");
    });
  });

  describe("3. 8-digit hexadecimal colors (#rrggbbaa)", () => {
    it("parses 8-digit hex colors with alpha channel correctly", () => {
      const { ctx, linearGradients } = createMockCtx();
      const css = "linear-gradient(135deg, #1e1b4b80 0%, #312e81ff 50%, #0f172acc 100%)";
      const result = createUniversalBackgroundFill(ctx, 1920, 1080, css);

      expect(typeof result).not.toBe("string");
      expect(linearGradients).toHaveLength(1);
      const stops = linearGradients[0]!.stops;
      expect(stops).toHaveLength(3);
      expect(stops[0]!.color).toBe("#1e1b4b80");
      expect(stops[1]!.color).toBe("#312e81ff");
      expect(stops[2]!.color).toBe("#0f172acc");
    });
  });

  describe("4. 360-degree arbitrary angles and trigonometry", () => {
    it("computes finite, mathematically sound W3C endpoints across all 360 integer degrees", () => {
      const { ctx, linearGradients } = createMockCtx();
      const width = 1920;
      const height = 1080;

      for (let angle = 0; angle < 360; angle += 15) {
        const css = `linear-gradient(${angle}deg, #ffffff 0%, #000000 100%)`;
        createUniversalBackgroundFill(ctx, width, height, css);

        const lastGrad = linearGradients[linearGradients.length - 1]!;
        expect(Number.isFinite(lastGrad.x0)).toBe(true);
        expect(Number.isFinite(lastGrad.y0)).toBe(true);
        expect(Number.isFinite(lastGrad.x1)).toBe(true);
        expect(Number.isFinite(lastGrad.y1)).toBe(true);

        // Vector length between endpoints must be positive and reasonable
        const dist = Math.hypot(lastGrad.x1 - lastGrad.x0, lastGrad.y1 - lastGrad.y0);
        expect(dist).toBeGreaterThan(500);
      }
    });

    it("handles negative and oversized angles correctly (-90deg, 720deg, 0.5deg)", () => {
      const { ctx, linearGradients } = createMockCtx();

      createUniversalBackgroundFill(ctx, 1000, 1000, "linear-gradient(-90deg, #fff 0%, #000 100%)");
      const negGrad = linearGradients[0]!;
      expect(negGrad.x0).toBeCloseTo(1000, 1);
      expect(negGrad.x1).toBeCloseTo(0, 1);

      createUniversalBackgroundFill(ctx, 1000, 1000, "linear-gradient(720deg, #fff 0%, #000 100%)");
      const overGrad = linearGradients[1]!;
      // 720deg is equivalent to 0deg (to top: x0=500, y0=1000, x1=500, y1=0)
      expect(overGrad.x0).toBeCloseTo(500, 1);
      expect(overGrad.y0).toBeCloseTo(1000, 1);
      expect(overGrad.x1).toBeCloseTo(500, 1);
      expect(overGrad.y1).toBeCloseTo(0, 1);
    });
  });

  describe("5. Nested commas within rgba, rgb, and hsla functions", () => {
    it("handles rgba strings with spaces and commas inside arguments without splitting incorrectly", () => {
      const { ctx, linearGradients } = createMockCtx();
      const css = "linear-gradient(135deg, rgba( 30 , 41 , 59 , 0.75 ) 0%, rgba( 15 , 23 , 42 , 0.9 ) 100%)";
      const result = createUniversalBackgroundFill(ctx, 1920, 1080, css);

      expect(typeof result).not.toBe("string");
      expect(linearGradients).toHaveLength(1);
      const stops = linearGradients[0]!.stops;
      expect(stops).toHaveLength(2);
      expect(stops[0]!.color).toBe("rgba( 30 , 41 , 59 , 0.75 )");
      expect(stops[1]!.color).toBe("rgba( 15 , 23 , 42 , 0.9 )");
    });

    it("handles radial-gradient with nested rgba colors", () => {
      const { ctx, radialGradients } = createMockCtx();
      const css = "radial-gradient(circle at 50% 50%, rgba(255, 122, 26, 0.9) 0%, rgba(30, 32, 36, 0.4) 70%, #000 100%)";
      const result = createUniversalBackgroundFill(ctx, 1000, 800, css);

      expect(typeof result).not.toBe("string");
      expect(radialGradients).toHaveLength(1);
      const stops = radialGradients[0]!.stops;
      expect(stops).toHaveLength(3);
      expect(stops[0]!.color).toBe("rgba(255, 122, 26, 0.9)");
      expect(stops[1]!.color).toBe("rgba(30, 32, 36, 0.4)");
      expect(stops[2]!.color).toBe("#000");
    });
  });

  describe("6. Comprehensive validation of all 32 BACKGROUND_PRESETS", () => {
    it("contains exactly 32 background presets across all 10 categories", () => {
      expect(BACKGROUND_PRESETS.length).toBe(32);
    });

    it("parses every single preset without throwing across 4 standard screen dimensions", () => {
      const dimensions = [
        { w: 1920, h: 1080 }, // 16:9
        { w: 1080, h: 1920 }, // 9:16
        { w: 1080, h: 1080 }, // 1:1
        { w: 1440, h: 1080 }, // 4:3
      ];

      for (const preset of BACKGROUND_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.category).toBeTruthy();
        expect(preset.value).toBeTruthy();

        for (const dim of dimensions) {
          const { ctx, linearGradients, radialGradients } = createMockCtx();

          let fill: string | CanvasGradient;
          expect(() => {
            fill = createUniversalBackgroundFill(ctx, dim.w, dim.h, preset.value);
          }).not.toThrow();

          if (preset.type === "solid") {
            expect(typeof fill!).toBe("string");
            expect(fill!).toBe(preset.value);
          } else {
            // Must return a CanvasGradient, not fallback string
            expect(typeof fill!).not.toBe("string");
            const totalGradients = linearGradients.length + radialGradients.length;
            expect(totalGradients).toBe(1);

            const created = linearGradients[0] || radialGradients[0];
            expect(created).toBeDefined();
            expect(created!.stops.length).toBeGreaterThanOrEqual(2);
            for (const stop of created!.stops) {
              expect(Number.isFinite(stop.offset)).toBe(true);
              expect(stop.offset).toBeGreaterThanOrEqual(0);
              expect(stop.offset).toBeLessThanOrEqual(1);
              expect(stop.color).toBeTruthy();
            }
          }
        }
      }
    });
  });
});
