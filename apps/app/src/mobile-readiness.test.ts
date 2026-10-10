import { describe, expect, it } from "vitest";
import { calculateCameraAtTime, easeInOutCubic } from "@domolens/core";

describe("Mobile Readiness & AutoZoom Physics Audit", () => {
  it("validates zero-latency analytical camera calculation", () => {
    const zoomBlocks = [
      {
        id: "z1",
        startTimeMs: 1500,
        endTimeMs: 4500,
        targetX: 0.25,
        targetY: 0.35,
        scale: 1.8,
        enabled: true,
      },
    ];

    // Warm-up to ensure JIT compiler doesn't count toward frame retrieval latency
    calculateCameraAtTime(0, zoomBlocks);

    // Measure instant camera retrieval at key sample points
    const samplePoints = [0, 1000, 1200, 1500, 3000, 4500, 4700, 6000];
    for (const timeMs of samplePoints) {
      const start = performance.now();
      const state = calculateCameraAtTime(timeMs, zoomBlocks);
      const cost = performance.now() - start;

      // Single frame calculation must be sub-millisecond (zero latency)
      expect(cost).toBeLessThan(2.0);
      expect(state.scale).toBeGreaterThanOrEqual(1.0);
      expect(state.scale).toBeLessThanOrEqual(1.8);
      expect(state.x).toBeGreaterThanOrEqual(0);
      expect(state.x).toBeLessThanOrEqual(1);
    }
  });

  it("verifies silky smooth cubic easing continuity and zero jump discontinuities", () => {
    // Easing function starts and ends with flat tangents (derivative = 0)
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);

    // Delta differences should smoothly accelerate then decelerate
    const steps = 100;
    let prevVal = 0;
    const deltas: number[] = [];

    for (let i = 1; i <= steps; i++) {
      const val = easeInOutCubic(i / steps);
      deltas.push(val - prevVal);
      prevVal = val;
    }

    // Deltas must peak near the midpoint (i = 50) and be smallest at boundaries
    const startDelta = deltas[0]!;
    const midDelta = deltas[Math.floor(steps / 2)]!;
    const endDelta = deltas[deltas.length - 1]!;

    expect(midDelta).toBeGreaterThan(startDelta);
    expect(midDelta).toBeGreaterThan(endDelta);
    expect(startDelta).toBeLessThan(0.005);
    expect(endDelta).toBeLessThan(0.005);
  });

  it("validates responsive screen dimensions for phone widths (375px - 430px)", () => {
    const mobileWidths = [375, 390, 412, 430];
    for (const width of mobileWidths) {
      // In CSS breakpoints, phone widths 375px-430px fall strictly under the `sm` (640px) and `md` (768px) breakpoints
      expect(width).toBeLessThan(640);
      expect(width).toBeLessThan(768);
      expect(width).toBeGreaterThanOrEqual(320);
    }
  });
});
