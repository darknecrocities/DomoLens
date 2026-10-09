import { describe, expect, it } from "vitest";
import {
  evaluateTextOverlayMotion,
  gaussianBlurRamp,
  resolveOverlayMotionPreset,
  springDamped,
  cubicEaseOut,
  quarticEaseOut,
  smoothstep,
} from "./motion";
import type { TextMotionPreset, TextOverlay } from "./project";

describe("evaluateTextOverlayMotion empirical stress & generator test harness", () => {
  const samplePresets: TextMotionPreset[] = [
    "none",
    "elastic-pop",
    "fluid-slide",
    "whip-slide",
    "blur-reveal",
    "smooth-fade",
  ];

  const createBaseOverlay = (preset: TextMotionPreset = "smooth-fade"): TextOverlay => ({
    id: "stress-overlay",
    text: "Stress Testing Motion",
    startTimeMs: 1000,
    durationMs: 5000,
    x: 0.5,
    y: 0.5,
    fontSize: 24,
    color: "#ffffff",
    motionPreset: preset,
  });

  describe("1. Extreme & boundary timestamps", () => {
    it("handles negative timestamps gracefully without throwing or returning NaN", () => {
      const negativeTimes = [-1, -100, -1000, -1_000_000, -0];
      for (const preset of samplePresets) {
        const overlay = createBaseOverlay(preset);
        for (const t of negativeTimes) {
          const res = evaluateTextOverlayMotion(overlay, t);
          expect(Number.isFinite(res.opacity)).toBe(true);
          expect(Number.isFinite(res.scale)).toBe(true);
          expect(Number.isFinite(res.translateX)).toBe(true);
          expect(Number.isFinite(res.translateY)).toBe(true);
          expect(Number.isFinite(res.blur)).toBe(true);
          expect(res.opacity).toBe(0); // Before start => invisible
        }
      }
    });

    it("handles non-finite timestamps (NaN, Infinity, -Infinity)", () => {
      for (const preset of samplePresets) {
        const overlay = createBaseOverlay(preset);
        for (const badTime of [NaN, Infinity, -Infinity]) {
          const res = evaluateTextOverlayMotion(overlay, badTime);
          expect(res).toEqual({
            opacity: 0,
            scale: 1,
            translateX: 0,
            translateY: 0,
            blur: 0,
          });
        }
      }
    });

    it("handles huge timestamps (1,000,000ms to 10^12 ms)", () => {
      const hugeTimes = [1_000_000, 5_000_000, 100_000_000, Number.MAX_SAFE_INTEGER];
      for (const preset of samplePresets) {
        const overlay = createBaseOverlay(preset);
        for (const t of hugeTimes) {
          const res = evaluateTextOverlayMotion(overlay, t);
          expect(res).toEqual({
            opacity: 0,
            scale: 1,
            translateX: 0,
            translateY: 0,
            blur: 0,
          });
        }
      }
    });

    it("handles high timestamps when overlay is scheduled far in the future", () => {
      const futureOverlay: TextOverlay = {
        ...createBaseOverlay("elastic-pop"),
        startTimeMs: 1_000_000,
        durationMs: 50_000,
      };

      // Before start
      const pre = evaluateTextOverlayMotion(futureOverlay, 999_999);
      expect(pre.opacity).toBe(0);

      // Mid entrance (1,000,000 + 450 * 0.35 ≈ 1,000,158ms)
      const mid = evaluateTextOverlayMotion(futureOverlay, 1_000_158);
      expect(mid.opacity).toBeGreaterThan(0.5);
      expect(mid.scale).toBeGreaterThan(1.05);

      // Hold phase
      const hold = evaluateTextOverlayMotion(futureOverlay, 1_025_000);
      expect(hold.opacity).toBe(1);
      expect(hold.scale).toBe(1);

      // Post end
      const post = evaluateTextOverlayMotion(futureOverlay, 1_050_001);
      expect(post.opacity).toBe(0);
    });

    it("handles sub-millisecond precision timestamps", () => {
      const overlay = createBaseOverlay("fluid-slide");
      const res = evaluateTextOverlayMotion(overlay, 1000.123456789);
      expect(Number.isFinite(res.opacity)).toBe(true);
      expect(res.opacity).toBeGreaterThan(0);
      expect(res.opacity).toBeLessThan(1);
    });
  });

  describe("2. Extreme & invalid durationMs", () => {
    it("safely handles durationMs = 0", () => {
      const overlay: TextOverlay = {
        ...createBaseOverlay("elastic-pop"),
        durationMs: 0,
      };
      const times = [0, 500, 1000, 1500, 2000];
      for (const t of times) {
        const res = evaluateTextOverlayMotion(overlay, t);
        expect(res).toEqual({
          opacity: 0,
          scale: 1,
          translateX: 0,
          translateY: 0,
          blur: 0,
        });
      }
    });

    it("safely handles negative durations", () => {
      const overlay: TextOverlay = {
        ...createBaseOverlay("blur-reveal"),
        durationMs: -500,
      };
      expect(evaluateTextOverlayMotion(overlay, 1000)).toEqual({
        opacity: 0,
        scale: 1,
        translateX: 0,
        translateY: 0,
        blur: 0,
      });
    });

    it("safely handles non-finite durations (NaN, Infinity, -Infinity)", () => {
      for (const badDur of [NaN, Infinity, -Infinity]) {
        const overlay: TextOverlay = {
          ...createBaseOverlay("whip-slide"),
          durationMs: badDur,
        };
        expect(evaluateTextOverlayMotion(overlay, 1000)).toEqual({
          opacity: 0,
          scale: 1,
          translateX: 0,
          translateY: 0,
          blur: 0,
        });
      }
    });

    it("handles ultra-short durations (< 100ms)", () => {
      const shortDurations = [1, 5, 10, 25, 50, 75, 99];
      for (const dur of shortDurations) {
        for (const preset of samplePresets) {
          const overlay: TextOverlay = {
            ...createBaseOverlay(preset),
            startTimeMs: 1000,
            durationMs: dur,
          };

          // Pre-start
          const pre = evaluateTextOverlayMotion(overlay, 999);
          expect(pre.opacity).toBe(0);

          // Post-end
          const post = evaluateTextOverlayMotion(overlay, 1000 + dur + 1);
          expect(post.opacity).toBe(0);

          // Mid-lifecycle: sample at fractions
          for (let frac = 0; frac <= 1; frac += 0.1) {
            const t = 1000 + dur * frac;
            const res = evaluateTextOverlayMotion(overlay, t);
            expect(Number.isFinite(res.opacity)).toBe(true);
            expect(Number.isFinite(res.scale)).toBe(true);
            expect(Number.isFinite(res.translateX)).toBe(true);
            expect(Number.isFinite(res.translateY)).toBe(true);
            expect(Number.isFinite(res.blur)).toBe(true);
            expect(res.opacity).toBeGreaterThanOrEqual(0);
            expect(res.opacity).toBeLessThanOrEqual(1.0001);
          }
        }
      }
    });
  });

  describe("3. Extreme entranceDurationMs & exitDurationMs", () => {
    it("handles zero entranceDurationMs and exitDurationMs (instant snap in/out)", () => {
      const overlay: TextOverlay = {
        ...createBaseOverlay("elastic-pop"),
        startTimeMs: 1000,
        durationMs: 2000,
        entranceDurationMs: 0,
        exitDurationMs: 0,
      };

      // Before start
      expect(evaluateTextOverlayMotion(overlay, 999).opacity).toBe(0);
      // Immediately inside active window => hold phase
      const active = evaluateTextOverlayMotion(overlay, 1001);
      expect(active.opacity).toBe(1);
      expect(active.scale).toBe(1);
      // At exact end
      expect(evaluateTextOverlayMotion(overlay, 3000).opacity).toBe(1);
      // After end
      expect(evaluateTextOverlayMotion(overlay, 3001).opacity).toBe(0);
    });

    it("handles huge entranceDurationMs and exitDurationMs through proportional clamping", () => {
      const overlay: TextOverlay = {
        ...createBaseOverlay("elastic-pop"),
        startTimeMs: 1000,
        durationMs: 1000,
        entranceDurationMs: 50_000,
        exitDurationMs: 50_000,
      };

      // din should clamp to 1000 * 0.45 = 450ms
      // dout should clamp to 1000 * 0.35 = 350ms
      // Hold window must exist between 1450ms and 1650ms
      const hold = evaluateTextOverlayMotion(overlay, 1500);
      expect(hold.opacity).toBe(1);
      expect(hold.scale).toBe(1);

      // Exit window is 1650ms to 2000ms
      const exit = evaluateTextOverlayMotion(overlay, 1800);
      expect(exit.opacity).toBeLessThan(1);
      expect(exit.opacity).toBeGreaterThan(0);
    });

    it("evaluates behavior when entranceDurationMs or exitDurationMs are negative or NaN", () => {
      // Test negative entranceDurationMs
      const negInOverlay: TextOverlay = {
        ...createBaseOverlay("elastic-pop"),
        startTimeMs: 1000,
        durationMs: 2000,
        entranceDurationMs: -100,
      };
      // din becomes Math.min(-100, 900) = -100 => din <= 0 => entrance phase skipped cleanly
      const res = evaluateTextOverlayMotion(negInOverlay, 1050);
      expect(Number.isFinite(res.opacity)).toBe(true);

      // Test NaN entranceDurationMs
      const nanInOverlay: TextOverlay = {
        ...createBaseOverlay("elastic-pop"),
        startTimeMs: 1000,
        durationMs: 2000,
        entranceDurationMs: NaN,
      };
      const nanRes = evaluateTextOverlayMotion(nanInOverlay, 1050);
      expect(Number.isFinite(nanRes.opacity)).toBe(true);
    });
  });

  describe("4. Rapid transitions & continuity across lifecycle", () => {
    it("produces continuous transforms across all presets without sudden NaN spikes", () => {
      for (const preset of samplePresets) {
        const overlay: TextOverlay = {
          ...createBaseOverlay(preset),
          startTimeMs: 1000,
          durationMs: 2000,
        };

        // Step by 5ms across entire lifecycle (from 800ms to 3200ms)
        let prevOpacity = 0;
        for (let t = 800; t <= 3200; t += 5) {
          const evaluated = evaluateTextOverlayMotion(overlay, t);

          expect(Number.isFinite(evaluated.opacity)).toBe(true);
          expect(Number.isFinite(evaluated.scale)).toBe(true);
          expect(Number.isFinite(evaluated.translateX)).toBe(true);
          expect(Number.isFinite(evaluated.translateY)).toBe(true);
          expect(Number.isFinite(evaluated.blur)).toBe(true);

          expect(evaluated.opacity).toBeGreaterThanOrEqual(0);
          expect(evaluated.opacity).toBeLessThanOrEqual(1.0001);
          expect(evaluated.scale).toBeGreaterThan(0);
          expect(evaluated.blur).toBeGreaterThanOrEqual(0);

          prevOpacity = evaluated.opacity;
        }
      }
    });
  });

  describe("5. High-density randomized Monte Carlo fuzz generator", () => {
    it("evaluates 1,000 randomized overlay configurations and 50,000 timestamps without crashing", () => {
      let seed = 42;
      function pseudoRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
      }

      const presets: TextMotionPreset[] = [
        "none",
        "elastic-pop",
        "fluid-slide",
        "whip-slide",
        "blur-reveal",
        "smooth-fade",
      ];

      let totalEvaluations = 0;

      for (let i = 0; i < 500; i++) {
        const startTimeMs = (pseudoRandom() - 0.2) * 10000; // -2000ms to 8000ms
        const durationMs = pseudoRandom() * 10000; // 0ms to 10000ms
        const preset = presets[Math.floor(pseudoRandom() * presets.length)]!;
        const entranceDurationMs = pseudoRandom() > 0.2 ? pseudoRandom() * 2000 : undefined;
        const exitDurationMs = pseudoRandom() > 0.2 ? pseudoRandom() * 2000 : undefined;

        const overlay: TextOverlay = {
          id: `fuzz-${i}`,
          text: `Fuzz Text ${i}`,
          startTimeMs,
          durationMs,
          x: pseudoRandom(),
          y: pseudoRandom(),
          fontSize: 12 + Math.floor(pseudoRandom() * 48),
          color: "#ffffff",
          motionPreset: preset,
          entranceDurationMs,
          exitDurationMs,
        };

        // Test 50 random timestamps per overlay
        for (let j = 0; j < 50; j++) {
          const t = startTimeMs - 1000 + pseudoRandom() * (durationMs + 2000);
          const result = evaluateTextOverlayMotion(overlay, t);
          totalEvaluations++;

          expect(Number.isFinite(result.opacity)).toBe(true);
          expect(Number.isFinite(result.scale)).toBe(true);
          expect(Number.isFinite(result.translateX)).toBe(true);
          expect(Number.isFinite(result.translateY)).toBe(true);
          expect(Number.isFinite(result.blur)).toBe(true);

          expect(result.opacity).toBeGreaterThanOrEqual(0);
          expect(result.opacity).toBeLessThanOrEqual(1.0001);
          expect(result.blur).toBeGreaterThanOrEqual(0);
        }
      }

      expect(totalEvaluations).toBe(25000);
    });
  });

  describe("6. Mathematical easing primitives stress testing", () => {
    it("springDamped stays strictly bounded between 0 and 1.2 across all t", () => {
      for (let t = -1; t <= 2; t += 0.01) {
        const v = springDamped(t);
        expect(Number.isFinite(v)).toBe(true);
        if (t <= 0) expect(v).toBe(0);
        else if (t >= 1) expect(v).toBe(1);
        else {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(1.2);
        }
      }
    });

    it("cubicEaseOut is strictly monotonic and bounded in [0, 1]", () => {
      let prev = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        const v = cubicEaseOut(t);
        expect(v).toBeGreaterThanOrEqual(prev);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        prev = v;
      }
    });

    it("quarticEaseOut is strictly monotonic and bounded in [0, 1]", () => {
      let prev = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        const v = quarticEaseOut(t);
        expect(v).toBeGreaterThanOrEqual(prev);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        prev = v;
      }
    });

    it("smoothstep is strictly monotonic with zero derivatives at endpoints", () => {
      let prev = 0;
      for (let t = 0; t <= 1; t += 0.01) {
        const v = smoothstep(t);
        expect(v).toBeGreaterThanOrEqual(prev);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        prev = v;
      }
    });

    it("gaussianBlurRamp ramps down from maxBlur to 0 monotonically", () => {
      let prev = 18;
      for (let p = 0; p <= 1; p += 0.05) {
        const blur = gaussianBlurRamp(p, 18);
        expect(blur).toBeLessThanOrEqual(prev + 1e-9);
        expect(blur).toBeGreaterThanOrEqual(0);
        prev = blur;
      }
    });
  });
});
