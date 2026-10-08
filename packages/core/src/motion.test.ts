import { describe, expect, it } from "vitest";
import {
  analyzeFrameDifference,
  calculateOpticalCentroid,
  classifyFrameActivity,
  detectActivityEventsFromFrames,
  detectOpticalCursorCandidate,
  extractLuminanceBuffer,
} from "./motion";

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
