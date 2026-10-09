import { describe, expect, it } from "vitest";
import {
  analyzeFrameDifference,
  calculateOpticalCentroid,
  classifyFrameActivity,
  cubicEaseOut,
  detectActivityEventsFromFrames,
  detectOpticalCursorCandidate,
  evaluateTextOverlayMotion,
  extractLuminanceBuffer,
  gaussianBlurRamp,
  quarticEaseOut,
  resolveOverlayMotionPreset,
  smoothstep,
  springDamped,
} from "./motion";
import type { TextOverlay } from "./project";

describe("optical motion analysis and cursor centroid tracking", () => {
  it("extracts luminance buffer accurately from RGBA and grayscale data", () => {
    // 2x2 RGBA test image: Red, Green, Blue, White
    const rgba = new Uint8ClampedArray([
      255, 0, 0, 255,   // Y = 0.299 * 255 = 76
      0, 255, 0, 255,   // Y = 0.587 * 255 = 150
      0, 0, 255, 255,   // Y = 0.114 * 255 = 29
      255, 255, 255, 255, // Y = 255
    ]);

    const luma = extractLuminanceBuffer(rgba, 2, 2);
    expect(luma).toHaveLength(4);
    expect(luma[0]).toBe(76);
    expect(luma[1]).toBe(150);
    expect(luma[2]).toBe(29);
    expect(luma[3]).toBe(255);
  });

  it("calculates frame difference and eliminates sub-threshold noise", () => {
    const width = 10;
    const height = 10;
    const prev = new Uint8ClampedArray(width * height).fill(100);
    const curr = new Uint8ClampedArray(width * height).fill(100);

    // Minor noise below threshold
    curr[0] = 110; // delta 10 < 18
    // Genuine localized motion above threshold
    curr[25] = 160; // delta 60 >= 18
    curr[26] = 170; // delta 70 >= 18

    const diff = analyzeFrameDifference(prev, curr, width, height, 18);
    expect(diff.diffMap[0]).toBe(0); // Noise filtered
    expect(diff.diffMap[25]).toBe(60);
    expect(diff.diffMap[26]).toBe(70);
    expect(diff.motionEnergy).toBe(130);
    expect(diff.activePixels).toBe(2);
  });

  it("calculates exact normalized centroid and spatial spread of optical activity", () => {
    const width = 100;
    const height = 100;
    const diffMap = new Uint8ClampedArray(width * height);

    // Place a motion blob centered around (75, 40)
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const idx = (40 + dy) * width + (75 + dx);
        diffMap[idx] = 100;
      }
    }

    const centroid = calculateOpticalCentroid(diffMap, width, height);
    expect(centroid.x).toBeCloseTo(0.75, 2);
    expect(centroid.y).toBeCloseTo(0.40, 2);
    expect(centroid.spread).toBeLessThan(0.05); // Tightly localized motion
    expect(centroid.motionEnergy).toBeGreaterThan(0);
  });

  it("returns neutral centroid when no motion exists", () => {
    const diffMap = new Uint8ClampedArray(100 * 100);
    const centroid = calculateOpticalCentroid(diffMap, 100, 100);
    expect(centroid.x).toBe(0.5);
    expect(centroid.y).toBe(0.5);
    expect(centroid.spread).toBe(0);
    expect(centroid.motionEnergy).toBe(0);
  });

  it("detects optical cursor candidate with high confidence for compact motion", () => {
    const width = 80;
    const height = 60;
    const diffMap = new Uint8ClampedArray(width * height);
    const frameLuma = new Uint8ClampedArray(width * height).fill(120);

    // Small 3x3 cursor shift at (20, 30) => normalized (0.25, 0.5)
    for (let y = 29; y <= 31; y++) {
      for (let x = 19; x <= 21; x++) {
        diffMap[y * width + x] = 80;
      }
    }

    const candidate = detectOpticalCursorCandidate(frameLuma, diffMap, width, height);
    expect(candidate.x).toBeCloseTo(0.25, 2);
    expect(candidate.y).toBeCloseTo(0.5, 2);
    expect(candidate.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("classifies frame activity as idle, click, or navigation", () => {
    // Low energy => idle
    expect(classifyFrameActivity(40, 0.02)).toBe("idle");

    // High energy, compact spread => click / typing action
    expect(classifyFrameActivity(300, 0.04)).toBe("click");

    // Wide screen spread => navigation
    expect(classifyFrameActivity(1000, 0.40)).toBe("navigation");
  });

  it("detects interactions and cursor trajectory across a sequence of frames", () => {
    const width = 100;
    const height = 100;

    // Frame 0: Baseline static screen
    const f0 = {
      timestampMs: 0,
      data: new Uint8ClampedArray(width * height).fill(50),
      width,
      height,
    };

    // Frame 1: Click motion at (30, 40) at t = 500ms
    const d1 = new Uint8ClampedArray(width * height).fill(50);
    for (let y = 38; y <= 42; y++) {
      for (let x = 28; x <= 32; x++) {
        d1[y * width + x] = 180;
      }
    }
    const f1 = { timestampMs: 500, data: d1, width, height };

    // Frame 2: Subsequent typing motion at (32, 40) at t = 800ms
    const d2 = new Uint8ClampedArray(width * height).fill(50);
    for (let y = 38; y <= 42; y++) {
      for (let x = 30; x <= 34; x++) {
        d2[y * width + x] = 190;
      }
    }
    const f2 = { timestampMs: 800, data: d2, width, height };

    // Frame 3: Sustained typing motion at (34, 40) at t = 1100ms
    const d3 = new Uint8ClampedArray(width * height).fill(50);
    for (let y = 38; y <= 42; y++) {
      for (let x = 32; x <= 36; x++) {
        d3[y * width + x] = 200;
      }
    }
    const f3 = { timestampMs: 1100, data: d3, width, height };

    const result = detectActivityEventsFromFrames([f0, f1, f2, f3], width, height);
    expect(result.cursorTrajectory.length).toBeGreaterThanOrEqual(2);
    expect(result.interactions.length).toBeGreaterThanOrEqual(1);

    const firstInteraction = result.interactions[0]!;
    expect(firstInteraction.x).toBeCloseTo(0.3, 1);
    expect(firstInteraction.y).toBeCloseTo(0.4, 1);
  });

  it("registers every single click across browser tabs on the same row without dropping or converting to typing", () => {
    const width = 100;
    const height = 100;

    // Frame 0: Baseline
    const f0 = {
      timestampMs: 0,
      data: new Uint8ClampedArray(width * height).fill(30),
      width,
      height,
    };

    // Frame 1: Tab 1 click at (x=20, y=5) at t=1000ms
    const d1 = new Uint8ClampedArray(width * height).fill(30);
    for (let y = 3; y <= 7; y++) {
      for (let x = 18; x <= 22; x++) {
        d1[y * width + x] = 200;
      }
    }
    const f1 = { timestampMs: 1000, data: d1, width, height };

    // Frame 2: Tab 2 click at (x=38, y=5) at t=2200ms
    const d2 = new Uint8ClampedArray(d1);
    for (let y = 3; y <= 7; y++) {
      for (let x = 36; x <= 40; x++) {
        d2[y * width + x] = 200;
      }
    }
    const f2 = { timestampMs: 2200, data: d2, width, height };

    // Frame 3: Tab 3 click at (x=55, y=5) at t=3500ms
    const d3 = new Uint8ClampedArray(d2);
    for (let y = 3; y <= 7; y++) {
      for (let x = 53; x <= 57; x++) {
        d3[y * width + x] = 200;
      }
    }
    const f3 = { timestampMs: 3500, data: d3, width, height };

    const result = detectActivityEventsFromFrames([f0, f1, f2, f3], width, height);

    // All 3 tabs must be registered as individual clicks!
    expect(result.clicks).toHaveLength(3);
    expect(result.clicks[0]?.x).toBeCloseTo(0.20, 2);
    expect(result.clicks[0]?.y).toBeCloseTo(0.05, 2);
    expect(result.clicks[1]?.x).toBeCloseTo(0.38, 2);
    expect(result.clicks[1]?.y).toBeCloseTo(0.05, 2);
    expect(result.clicks[2]?.x).toBeCloseTo(0.55, 2);
    expect(result.clicks[2]?.y).toBeCloseTo(0.05, 2);

    // No clicks misclassified into typing
    const typingInteractions = result.interactions.filter((i) => i.type === "typing");
    expect(typingInteractions).toHaveLength(0);

    const clickInteractions = result.interactions.filter((i) => i.type === "click");
    expect(clickInteractions).toHaveLength(3);
  });

  it("does not misclassify continuous mouse cursor translation across the screen as clicks", () => {
    const width = 100;
    const height = 100;

    // Frame 0: Baseline
    const f0 = {
      timestampMs: 0,
      data: new Uint8ClampedArray(width * height).fill(30),
      width,
      height,
    };

    // Frame 1: Tab 1 Click at (x=20, y=10) at t=1000ms
    const d1 = new Uint8ClampedArray(width * height).fill(30);
    for (let y = 8; y <= 12; y++) {
      for (let x = 18; x <= 22; x++) {
        d1[y * width + x] = 200;
      }
    }
    const f1 = { timestampMs: 1000, data: d1, width, height };

    // Frames 2-5: Cursor moving rapidly across the screen (dx = 12-13 per 150ms frame)
    // t=1150ms at x=35, t=1300ms at x=48, t=1450ms at x=60, t=1600ms at x=72
    const motionFrames = [35, 48, 60, 72].map((cx, idx) => {
      const d = new Uint8ClampedArray(width * height).fill(30);
      for (let y = 8; y <= 12; y++) {
        for (let x = cx - 2; x <= cx + 2; x++) {
          d[y * width + x] = 200;
        }
      }
      return { timestampMs: 1150 + idx * 150, data: d, width, height };
    });

    // Frame 6: Button Click at (x=85, y=10) at t=2400ms (settled, dt > 450ms)
    const d6 = new Uint8ClampedArray(width * height).fill(30);
    for (let y = 8; y <= 12; y++) {
      for (let x = 83; x <= 87; x++) {
        d6[y * width + x] = 200;
      }
    }
    const f6 = { timestampMs: 2400, data: d6, width, height };

    const result = detectActivityEventsFromFrames([f0, f1, ...motionFrames, f6], width, height);

    // Trajectory must capture the motion path across all frames
    expect(result.cursorTrajectory.length).toBeGreaterThanOrEqual(5);

    // Only the 2 intentional clicks (Tab 1 at t=1000 and Button at t=2400) should be registered,
    // NOT the 4 intermediate translating frames!
    expect(result.clicks).toHaveLength(2);
    expect(result.clicks[0]?.timestampMs).toBe(1000);
    expect(result.clicks[1]?.timestampMs).toBe(2400);
  });
});

describe("evaluateTextOverlayMotion & Analytical Easing Primitives", () => {
  describe("analytical easing curves", () => {
    it("springDamped exhibits genuine damped harmonic oscillation with verified overshoot", () => {
      expect(springDamped(0)).toBe(0);
      expect(springDamped(1)).toBe(1);

      // Verify peak overshoot > 1.10 around t = 0.35
      const peak = springDamped(0.35);
      expect(peak).toBeGreaterThan(1.10);

      // Verify clamped extremes
      expect(springDamped(-0.5)).toBe(0);
      expect(springDamped(1.5)).toBe(1);
    });

    it("cubicEaseOut follows analytical cubic ease curve", () => {
      expect(cubicEaseOut(0)).toBe(0);
      expect(cubicEaseOut(1)).toBe(1);
      expect(cubicEaseOut(0.5)).toBeCloseTo(0.875, 3);
    });

    it("quarticEaseOut follows high-velocity quartic curve", () => {
      expect(quarticEaseOut(0)).toBe(0);
      expect(quarticEaseOut(1)).toBe(1);
      expect(quarticEaseOut(0.5)).toBeCloseTo(0.9375, 3);
    });

    it("smoothstep follows Hermite S-curve", () => {
      expect(smoothstep(0)).toBe(0);
      expect(smoothstep(1)).toBe(1);
      expect(smoothstep(0.5)).toBeCloseTo(0.5, 3);
    });

    it("gaussianBlurRamp computes quadratic blur decay", () => {
      expect(gaussianBlurRamp(0, 18)).toBe(18);
      expect(gaussianBlurRamp(0.5, 18)).toBeCloseTo(4.5, 2);
      expect(gaussianBlurRamp(1, 18)).toBe(0);
    });
  });

  describe("resolveOverlayMotionPreset fallback logic", () => {
    it("prefers direct motionPreset on overlay", () => {
      const overlay: TextOverlay = {
        id: "1",
        text: "Test",
        startTimeMs: 1000,
        durationMs: 3000,
        x: 0.5,
        y: 0.5,
        fontSize: 24,
        color: "#fff",
        motionPreset: "whip-slide",
      };
      expect(resolveOverlayMotionPreset(overlay)).toBe("whip-slide");
    });

    it("falls back to typography.animation when motionPreset is undefined", () => {
      const overlay: TextOverlay = {
        id: "2",
        text: "Test",
        startTimeMs: 1000,
        durationMs: 3000,
        x: 0.5,
        y: 0.5,
        fontSize: 24,
        color: "#fff",
        typography: {
          fontFamily: "sans-serif",
          animation: "elastic-pop",
        },
      };
      expect(resolveOverlayMotionPreset(overlay)).toBe("elastic-pop");

      // fade-up maps to fluid-slide
      const fadeUpOverlay: TextOverlay = {
        ...overlay,
        typography: { fontFamily: "sans-serif", animation: "fade-up" },
      };
      expect(resolveOverlayMotionPreset(fadeUpOverlay)).toBe("fluid-slide");
    });

    it("defaults to smooth-fade when unspecified", () => {
      const overlay: TextOverlay = {
        id: "3",
        text: "Test",
        startTimeMs: 1000,
        durationMs: 3000,
        x: 0.5,
        y: 0.5,
        fontSize: 24,
        color: "#fff",
      };
      expect(resolveOverlayMotionPreset(overlay)).toBe("smooth-fade");
    });
  });

  describe("evaluateTextOverlayMotion lifecycle phases", () => {
    const baseOverlay: TextOverlay = {
      id: "txt-test",
      text: "Product Launch 2026",
      startTimeMs: 1000,
      durationMs: 4000,
      x: 0.5,
      y: 0.1,
      fontSize: 28,
      color: "#ffffff",
    };

    it("handles invalid or non-finite inputs gracefully", () => {
      expect(evaluateTextOverlayMotion({ ...baseOverlay, durationMs: 0 }, 1500)).toEqual({
        opacity: 0,
        scale: 1,
        translateX: 0,
        translateY: 0,
        blur: 0,
      });

      expect(evaluateTextOverlayMotion(baseOverlay, NaN)).toEqual({
        opacity: 0,
        scale: 1,
        translateX: 0,
        translateY: 0,
        blur: 0,
      });
    });

    it("preset 'none' renders instantaneous step bounds", () => {
      const noneOverlay: TextOverlay = { ...baseOverlay, motionPreset: "none" };
      // Before start
      expect(evaluateTextOverlayMotion(noneOverlay, 999).opacity).toBe(0);
      // Active
      expect(evaluateTextOverlayMotion(noneOverlay, 1000)).toEqual({
        opacity: 1,
        scale: 1,
        translateX: 0,
        translateY: 0,
        blur: 0,
      });
      expect(evaluateTextOverlayMotion(noneOverlay, 5000)).toEqual({
        opacity: 1,
        scale: 1,
        translateX: 0,
        translateY: 0,
        blur: 0,
      });
      // After end
      expect(evaluateTextOverlayMotion(noneOverlay, 5001).opacity).toBe(0);
    });

    it("preset 'elastic-pop' produces bouncing entrance with peak overshoot", () => {
      const popOverlay: TextOverlay = { ...baseOverlay, motionPreset: "elastic-pop" };

      // Pre-start: invisible at rest position
      const pre = evaluateTextOverlayMotion(popOverlay, 800);
      expect(pre.opacity).toBe(0);
      expect(pre.scale).toBe(0.5);
      expect(pre.translateY).toBe(16);

      // Mid-entrance: scale overshoots > 1.0
      // Entrance window is 450ms (from 1000 to 1450). Peak overshoot at p ≈ 0.35 => t = 1000 + 0.35 * 450 = 1157.5ms
      const mid = evaluateTextOverlayMotion(popOverlay, 1158);
      expect(mid.opacity).toBeGreaterThan(0.5);
      expect(mid.scale).toBeGreaterThan(1.05); // Spring bounce overshoot!

      // Hold phase: settled at 1.0
      const hold = evaluateTextOverlayMotion(popOverlay, 3000);
      expect(hold).toEqual({
        opacity: 1,
        scale: 1,
        translateX: 0,
        translateY: 0,
        blur: 0,
      });

      // Exit phase: contracts and fades
      const exit = evaluateTextOverlayMotion(popOverlay, 4900);
      expect(exit.opacity).toBeLessThan(1.0);
      expect(exit.scale).toBeLessThan(1.0);

      // Post-end: hidden
      const post = evaluateTextOverlayMotion(popOverlay, 5200);
      expect(post.opacity).toBe(0);
    });

    it("preset 'fluid-slide' smoothly slides upward with cubic ease-out", () => {
      const slideOverlay: TextOverlay = { ...baseOverlay, motionPreset: "fluid-slide" };

      // Pre-start
      const pre = evaluateTextOverlayMotion(slideOverlay, 500);
      expect(pre.opacity).toBe(0);
      expect(pre.translateY).toBe(32);

      // Entrance (400ms duration, from 1000 to 1400)
      const mid = evaluateTextOverlayMotion(slideOverlay, 1200);
      expect(mid.opacity).toBeCloseTo(0.875, 2);
      expect(mid.translateY).toBeLessThan(32);
      expect(mid.translateY).toBeGreaterThan(0);
      expect(mid.scale).toBe(1);

      // Hold
      const hold = evaluateTextOverlayMotion(slideOverlay, 2500);
      expect(hold.translateY).toBe(0);
      expect(hold.opacity).toBe(1);

      // Exit: slides up further as it fades
      const exit = evaluateTextOverlayMotion(slideOverlay, 4900);
      expect(exit.translateY).toBeLessThan(0);
      expect(exit.opacity).toBeLessThan(1);
    });

    it("preset 'whip-slide' applies directional horizontal snap and motion blur", () => {
      const whipOverlay: TextOverlay = { ...baseOverlay, motionPreset: "whip-slide" };

      // Pre-start: offset left with blur
      const pre = evaluateTextOverlayMotion(whipOverlay, 800);
      expect(pre.translateX).toBe(-80);
      expect(pre.blur).toBe(10);

      // Hold phase: aligned with 0 blur
      const hold = evaluateTextOverlayMotion(whipOverlay, 2500);
      expect(hold.translateX).toBe(0);
      expect(hold.blur).toBe(0);

      // Exit phase: sweeps right with velocity blur
      const exit = evaluateTextOverlayMotion(whipOverlay, 4950);
      expect(exit.translateX).toBeGreaterThan(0);
      expect(exit.blur).toBeGreaterThan(0);
    });

    it("preset 'blur-reveal' ramps down blur while scaling into focus", () => {
      const blurOverlay: TextOverlay = { ...baseOverlay, motionPreset: "blur-reveal" };

      // Pre-start: 18px blur, 0.92 scale
      const pre = evaluateTextOverlayMotion(blurOverlay, 500);
      expect(pre.blur).toBe(18);
      expect(pre.scale).toBe(0.92);

      // Entrance: de-blurring
      const mid = evaluateTextOverlayMotion(blurOverlay, 1225);
      expect(mid.blur).toBeLessThan(18);
      expect(mid.blur).toBeGreaterThan(0);
      expect(mid.scale).toBeGreaterThan(0.92);

      // Hold phase: crystal clear
      const hold = evaluateTextOverlayMotion(blurOverlay, 2500);
      expect(hold.blur).toBe(0);
      expect(hold.scale).toBe(1.0);
    });

    it("preset 'smooth-fade' applies clean smoothstep alpha transition without geometric distortion", () => {
      const fadeOverlay: TextOverlay = { ...baseOverlay, motionPreset: "smooth-fade" };

      // Entrance
      const mid = evaluateTextOverlayMotion(fadeOverlay, 1175);
      expect(mid.scale).toBe(1);
      expect(mid.translateX).toBe(0);
      expect(mid.translateY).toBe(0);
      expect(mid.blur).toBe(0);
      expect(mid.opacity).toBeCloseTo(0.5, 1);

      // Hold
      const hold = evaluateTextOverlayMotion(fadeOverlay, 2500);
      expect(hold.opacity).toBe(1);
    });

    it("safely clamps entrance and exit windows for short duration overlays to prevent collision", () => {
      const shortOverlay: TextOverlay = {
        ...baseOverlay,
        startTimeMs: 1000,
        durationMs: 300, // Very short: 300ms total
        motionPreset: "elastic-pop",
      };

      // Entrance is clamped to 300 * 0.45 = 135ms
      // Exit is clamped to 300 * 0.35 = 105ms
      // Hold window exists between 1135ms and 1195ms
      const hold = evaluateTextOverlayMotion(shortOverlay, 1150);
      expect(hold.opacity).toBe(1);
      expect(hold.scale).toBe(1);
    });
  });
});

