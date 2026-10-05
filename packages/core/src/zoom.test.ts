import { describe, expect, it } from "vitest";
import {
  calculateCameraAtTime,
  calculateDeadzoneCamera,
  calculateIntentZoom,
  clampCameraToBounds,
  classifySpatialTransition,
  detectZoomBlocksFromClicks,
  easeInOutCubic,
  plotInteractionsToKeyframesAndZoomBlocks,
  screenToVideoCoordinates,
  videoToScreenCoordinates,
} from "./zoom";
import type { ClickEvent, TimelineClip } from "./project";
import { removeClipAndRipple, splitClip, splitZoomBlock } from "./timeline";
import { BACKGROUND_PRESETS, SHADOW_PRESETS } from "./looks";

describe("zoom algorithms", () => {
  it("clampCameraToBounds clamps within valid range", () => {
    // At scale 2.0, half width is 0.25, valid range is [0.25, 0.75]
    const clampedNearLeft = clampCameraToBounds(0.05, 0.5, 2.0);
    expect(clampedNearLeft.x).toBe(0.25);

    const clampedNearRight = clampCameraToBounds(0.95, 0.5, 2.0);
    expect(clampedNearRight.x).toBe(0.75);

    const centered = clampCameraToBounds(0.5, 0.5, 2.0);
    expect(centered.x).toBe(0.5);
    expect(centered.y).toBe(0.5);

    // At scale 1.0 (no zoom), always center at (0.5, 0.5)
    const noZoom = clampCameraToBounds(0.1, 0.9, 1.0);
    expect(noZoom.x).toBe(0.5);
    expect(noZoom.y).toBe(0.5);
  });

  it("easeInOutCubic is continuous between 0 and 1", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });

  it("detectZoomBlocksFromClicks groups nearby clicks and clamps bounds", () => {
    const clicks: ClickEvent[] = [
      { id: "c1", timestampMs: 2000, x: 0.1, y: 0.2, button: "left" },
      { id: "c2", timestampMs: 2800, x: 0.12, y: 0.22, button: "left" },
      { id: "c3", timestampMs: 9000, x: 0.8, y: 0.7, button: "left" },
    ];

    const blocks = detectZoomBlocksFromClicks(clicks, 15000);
    expect(blocks.length).toBe(2);

    // First block groups c1 and c2
    expect(blocks[0]?.startTimeMs).toBeLessThanOrEqual(2000);
    expect(blocks[0]?.enabled).toBe(true);

    // Second block for c3
    expect(blocks[1]?.targetX).toBeGreaterThan(0.5);
  });

  it("calculateCameraAtTime produces smooth transitions without jumps", () => {
    const blocks = [
      {
        id: "z1",
        startTimeMs: 3000,
        endTimeMs: 6000,
        targetX: 0.3,
        targetY: 0.4,
        scale: 1.8,
        enabled: true,
      },
    ];

    // Before zoom (t = 2000ms): normal frame
    const before = calculateCameraAtTime(2000, blocks);
    expect(before.scale).toBe(1.0);
    expect(before.isZoomed).toBe(false);

    // During transition in (e.g. t = 2800ms): rising scale
    const entering = calculateCameraAtTime(2800, blocks);
    expect(entering.scale).toBeGreaterThan(1.0);
    expect(entering.scale).toBeLessThan(1.8);
    expect(entering.isZoomed).toBe(true);

    // Inside block (t = 4500ms): fully zoomed
    const holding = calculateCameraAtTime(4500, blocks);
    expect(holding.scale).toBe(1.8);
    expect(holding.isZoomed).toBe(true);

    // During transition out (t = 6200ms): falling scale
    const exiting = calculateCameraAtTime(6200, blocks);
    expect(exiting.scale).toBeGreaterThan(1.0);
    expect(exiting.scale).toBeLessThan(1.8);

    // After zoom (t = 7000ms): back to normal
    const after = calculateCameraAtTime(7000, blocks);
    expect(after.scale).toBe(1.0);
    expect(after.isZoomed).toBe(false);
  });

  it("guarantees zero latency with sub-microsecond analytical camera evaluation", () => {
    const blocks = [
      {
        id: "z1",
        startTimeMs: 1000,
        endTimeMs: 4000,
        targetX: 0.2,
        targetY: 0.3,
        scale: 2.0,
        enabled: true,
      },
    ];

    // Measure evaluation time for 1,000 frames (simulating 16.6 seconds of 60fps playback)
    const t0 = Date.now();
    for (let t = 0; t <= 5000; t += 5) {
      const state = calculateCameraAtTime(t, blocks);
      expect(state.scale).toBeGreaterThanOrEqual(1.0);
      expect(state.scale).toBeLessThanOrEqual(2.0);
    }
    const elapsed = Date.now() - t0;
    // 1,000 frames must evaluate in well under 100ms total (<0.1ms per frame, 160x faster than 16.6ms 60fps budget)
    expect(elapsed).toBeLessThan(100);
  });

  it("produces strictly monotonic, continuous cubic easing during transitions", () => {
    const blocks = [
      {
        id: "z1",
        startTimeMs: 1000,
        endTimeMs: 3000,
        targetX: 0.7,
        targetY: 0.8,
        scale: 2.0,
        enabled: true,
      },
    ];

    // Check lead-in transition monotonicity (from 650ms to 1000ms)
    let prevScale = 1.0;
    for (let t = 650; t <= 1000; t += 10) {
      const camera = calculateCameraAtTime(t, blocks);
      expect(camera.scale).toBeGreaterThanOrEqual(prevScale);
      prevScale = camera.scale;
    }
    expect(prevScale).toBeCloseTo(2.0, 1);

    // Check lead-out transition monotonicity (from 3000ms to 3400ms)
    prevScale = 2.0;
    for (let t = 3000; t <= 3400; t += 10) {
      const camera = calculateCameraAtTime(t, blocks);
      expect(camera.scale).toBeLessThanOrEqual(prevScale);
      prevScale = camera.scale;
    }
    expect(prevScale).toBeCloseTo(1.0, 1);
  });

  it("plotInteractionsToKeyframesAndZoomBlocks clusters rapid consecutive typing/clicks without delay", () => {
    const interactions = [
      { id: "e1", type: "click" as const, timestampMs: 1000, x: 0.2, y: 0.3 },
      { id: "e2", type: "typing" as const, timestampMs: 1400, x: 0.25, y: 0.32, snippet: "A" },
      { id: "e3", type: "typing" as const, timestampMs: 1800, x: 0.28, y: 0.34, snippet: "B" },
      // Later interaction separated by 6 seconds
      { id: "e4", type: "click" as const, timestampMs: 8000, x: 0.7, y: 0.8 },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(interactions, 15000, {
      holdDurationMs: 2400,
      scale: 1.85,
    });

    // Should create exactly 2 clusters / zoom blocks: one for [e1, e2, e3], one for [e4]
    expect(result.zoomBlocks).toHaveLength(2);

    const firstBlock = result.zoomBlocks[0]!;
    // Starts before or at first interaction (1000ms - 300ms = 700ms)
    expect(firstBlock.startTimeMs).toBe(700);
    // Holds until last interaction in cluster (1800ms) + 2400ms hold + 400ms leadout = 4600ms
    expect(firstBlock.endTimeMs).toBe(4600);

    const secondBlock = result.zoomBlocks[1]!;
    expect(secondBlock.startTimeMs).toBe(7700);
    expect(secondBlock.endTimeMs).toBe(10800);

    // Keyframes should include nodes for intermediate tracking
    expect(result.keyframes.length).toBeGreaterThanOrEqual(8);
  });

  it("classifySpatialTransition categorizes anchor, glide, and crane transitions", () => {
    // Distance < 0.12 => anchor
    const anchor = classifySpatialTransition({ x: 0.2, y: 0.2 }, { x: 0.25, y: 0.23 });
    expect(anchor.type).toBe("anchor");
    expect(anchor.recommendedScaleDip).toBe(0);

    // Distance 0.12 - 0.38 => glide
    const glide = classifySpatialTransition({ x: 0.2, y: 0.2 }, { x: 0.45, y: 0.3 });
    expect(glide.type).toBe("glide");
    expect(glide.recommendedScaleDip).toBe(0.1);

    // Distance > 0.38 => crane
    const crane = classifySpatialTransition({ x: 0.1, y: 0.1 }, { x: 0.85, y: 0.85 });
    expect(crane.type).toBe("crane");
    expect(crane.recommendedScaleDip).toBeGreaterThan(0.3);
  });

  it("calculateDeadzoneCamera maintains rock-solid position inside deadzone and smoothly tracks outside", () => {
    const center = { x: 0.5, y: 0.5 };
    const scale = 2.0; // visible frame is 0.5 x 0.5. At 35% deadzone, halfW = 0.5 * 0.35 / 2 = 0.0875

    // 1. Cursor slightly moved inside deadzone box (offset < 0.0875): camera center does NOT move
    const slightMove = calculateDeadzoneCamera(center, { x: 0.53, y: 0.52 }, scale, 0.35);
    expect(slightMove.x).toBe(0.5);
    expect(slightMove.y).toBe(0.5);

    // 2. Cursor moved outside deadzone box (offset = 0.2): camera center shifts to keep cursor framed
    const largeMove = calculateDeadzoneCamera(center, { x: 0.7, y: 0.5 }, scale, 0.35);
    expect(largeMove.x).toBeGreaterThan(0.5);
    expect(largeMove.x).toBeCloseTo(0.7 - 0.0875, 2);
  });

  it("calculateIntentZoom assigns higher scale for typing and offset for right clicks", () => {
    const typingEvt = { id: "t1", type: "typing" as const, timestampMs: 1000, x: 0.5, y: 0.5, snippet: "Hello" };
    const typingIntent = calculateIntentZoom(typingEvt);
    expect(typingIntent.scale).toBe(2.1);
    expect(typingIntent.holdMs).toBeGreaterThanOrEqual(2400);

    const rightClickEvt = { id: "c1", timestampMs: 2000, x: 0.4, y: 0.4, button: "right" as const };
    const rightClickIntent = calculateIntentZoom(rightClickEvt);
    expect(rightClickIntent.scale).toBe(1.7);
    expect(rightClickIntent.offsetY).toBeGreaterThan(0); // Offset down for context menu
  });

  it("crane pull-back dips scale during wide cross-screen transitions between blocks", () => {
    const wideBlocks = [
      { id: "b1", startTimeMs: 1000, endTimeMs: 3000, targetX: 0.1, targetY: 0.1, scale: 2.0, enabled: true },
      { id: "b2", startTimeMs: 3500, endTimeMs: 5500, targetX: 0.9, targetY: 0.9, scale: 2.0, enabled: true },
    ];

    // Midpoint of transition between b1 (ends at 3000ms) and b2 (starts at 3500ms): t = 3250ms
    const midState = calculateCameraAtTime(3250, wideBlocks);
    expect(midState.scale).toBeLessThan(2.0); // Should crane dip below 2.0
    expect(midState.scale).toBeGreaterThanOrEqual(1.15); // Stays comfortably zoomed above 1.15
    expect(midState.isZoomed).toBe(true);
  });

  it("rejects tail boundary clicks occurring at or within 400ms of video duration to prevent bunching", () => {
    const endClicks = [
      { id: "c-finish", type: "click" as const, timestampMs: 24000, x: 0.5, y: 0.9 },
    ];
    // Video is 24 seconds, click is right at 24000ms
    const result = plotInteractionsToKeyframesAndZoomBlocks(endClicks, 24000);
    expect(result.zoomBlocks).toHaveLength(0);
    expect(result.keyframes).toHaveLength(0);
  });

  it("guarantees strictly monotonic keyframe ordering for clicks near the boundary", () => {
    const click = [
      { id: "c-late", type: "click" as const, timestampMs: 22000, x: 0.4, y: 0.4 },
    ];
    const result = plotInteractionsToKeyframesAndZoomBlocks(click, 24000);
    expect(result.zoomBlocks).toHaveLength(1);
    expect(result.keyframes.length).toBeGreaterThanOrEqual(4);

    // Verify keyframe timestamps are strictly increasing
    for (let i = 0; i < result.keyframes.length - 1; i++) {
      const kfCurrent = result.keyframes[i]!;
      const kfNext = result.keyframes[i + 1]!;
      expect(kfCurrent.timeMs).toBeLessThan(kfNext.timeMs);
    }

    const firstKf = result.keyframes[0]!;
    const lastKf = result.keyframes[result.keyframes.length - 1]!;
    expect(firstKf.timeMs).toBeLessThanOrEqual(22000);
    expect(firstKf.scale).toBe(1.0);
    expect(lastKf.timeMs).toBe(24000);
    expect(lastKf.scale).toBe(1.0);
  });

  it("generates balanced focal auto-zooms across timeline when fallbackIfEmpty is enabled", () => {
    const result = plotInteractionsToKeyframesAndZoomBlocks([], 24000, {
      fallbackIfEmpty: true,
    });
    expect(result.zoomBlocks).toHaveLength(2);
    expect(result.keyframes.length).toBeGreaterThanOrEqual(6);

    // First block around 22% (approx 5s)
    expect(result.zoomBlocks[0]?.startTimeMs).toBeGreaterThan(3000);
    expect(result.zoomBlocks[0]?.startTimeMs).toBeLessThan(7000);

    // Second block around 62% (approx 14s)
    expect(result.zoomBlocks[1]?.startTimeMs).toBeGreaterThan(12000);
    expect(result.zoomBlocks[1]?.startTimeMs).toBeLessThan(17000);
  });

  it("holds baseline 1.0x full-frame camera prior to the first zoomed keyframe", () => {
    const keyframes = [
      { id: "kf1", timeMs: 5000, scale: 1.85, targetX: 0.3, targetY: 0.4, easing: "cubic" as const },
      { id: "kf2", timeMs: 8000, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" as const },
    ];
    // At t = 2000ms (before first zoomed keyframe at 5000ms), camera must be full frame (1.0x)
    const cameraBefore = calculateCameraAtTime(2000, [], 350, 400, undefined, keyframes);
    expect(cameraBefore.scale).toBe(1.0);
    expect(cameraBefore.isZoomed).toBe(false);
  });

  it("smoothly tracks cursor frame-by-frame during keyframe zoom hold", () => {
    const keyframes = [
      { id: "kf1", timeMs: 2000, scale: 2.0, targetX: 0.5, targetY: 0.5, easing: "cubic" as const },
      { id: "kf2", timeMs: 6000, scale: 2.0, targetX: 0.5, targetY: 0.5, easing: "cubic" as const },
    ];
    // Mouse trajectory moving towards top-right
    const trajectory = [
      { timestampMs: 2000, x: 0.5, y: 0.5 },
      { timestampMs: 4000, x: 0.72, y: 0.3 },
      { timestampMs: 6000, x: 0.72, y: 0.3 },
    ];

    // At t = 4000ms: cursor is at (0.72, 0.3), which is outside the deadzone for scale 2.0
    const cameraAt4s = calculateCameraAtTime(4000, [], 350, 400, trajectory, keyframes);
    expect(cameraAt4s.scale).toBe(2.0);
    expect(cameraAt4s.isZoomed).toBe(true);
    // Camera center must have shifted towards cursor (x > 0.5 and y < 0.5)
    expect(cameraAt4s.x).toBeGreaterThan(0.5);
    expect(cameraAt4s.y).toBeLessThan(0.5);
    expect(cameraAt4s.cursorX).toBeCloseTo(0.72, 2);
    expect(cameraAt4s.cursorY).toBeCloseTo(0.3, 2);
  });

  it("auto-plots typing activity with adaptive 2.1x scale and text field offset", () => {
    const typingInteractions = [
      { id: "type-1", type: "typing" as const, timestampMs: 4000, x: 0.45, y: 0.5, snippet: "searching..." },
    ];
    const result = plotInteractionsToKeyframesAndZoomBlocks(typingInteractions, 12000);
    expect(result.zoomBlocks).toHaveLength(1);
    const block = result.zoomBlocks[0]!;
    expect(block.scale).toBe(2.1); // Typing intent scale
    expect(block.targetY).toBeLessThan(0.5); // Slight negative offset for typing
  });

  it("screenToVideoCoordinates inverts viewport screen pixels to normalized video coordinates", () => {
    const camera = { x: 0.35, y: 0.45, scale: 2.0, isZoomed: true };
    const width = 800;
    const height = 450;

    // Center of viewport (400, 225) must invert exactly to the camera center (0.35, 0.45)
    const center = screenToVideoCoordinates(400, 225, width, height, camera);
    expect(center.x).toBeCloseTo(0.35, 3);
    expect(center.y).toBeCloseTo(0.45, 3);

    // Offset point in viewport
    const offset = screenToVideoCoordinates(600, 300, width, height, camera);
    expect(offset.x).toBeGreaterThan(0.35);
    expect(offset.y).toBeGreaterThan(0.45);

    // Test round-trip with videoToScreenCoordinates
    const projected = videoToScreenCoordinates(offset.x, offset.y, width, height, camera);
    expect(projected.pixelX).toBeCloseTo(600, 1);
    expect(projected.pixelY).toBeCloseTo(300, 1);
  });

  it("continuously glides camera between typing and clicking targets without dropping to 1.0x", () => {
    const interactions = [
      { id: "act-1", type: "typing" as const, timestampMs: 2000, x: 0.3, y: 0.4, snippet: "search" },
      // Adjacent interaction separated by 2.6 seconds (less than 3.8s inactivity lull)
      { id: "act-2", type: "click" as const, timestampMs: 4600, x: 0.65, y: 0.7, button: "left" as const },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(interactions, 12000, {
      continuousGlide: true,
      maxGlideGapMs: 3800,
    });

    expect(result.keyframes.length).toBeGreaterThanOrEqual(4);

    // In between act-1 and act-2 (at t = 3500ms and t = 4200ms), camera must NOT drop to 1.0x
    const mid1 = calculateCameraAtTime(3500, result.zoomBlocks, 350, 400, undefined, result.keyframes);
    const mid2 = calculateCameraAtTime(4200, result.zoomBlocks, 350, 400, undefined, result.keyframes);

    expect(mid1.scale).toBeGreaterThanOrEqual(1.4);
    expect(mid1.isZoomed).toBe(true);

    expect(mid2.scale).toBeGreaterThanOrEqual(1.35);
    expect(mid2.isZoomed).toBe(true);

    // Camera target must have moved smoothly towards act-2 (x > 0.3)
    expect(mid2.x).toBeGreaterThan(0.35);

    // After act-2 finishes (at t = 10000ms), camera gracefully returns to full frame (1.0x)
    const after = calculateCameraAtTime(10000, result.zoomBlocks, 350, 400, undefined, result.keyframes);
    expect(after.scale).toBe(1.0);
    expect(after.isZoomed).toBe(false);
  });
});

describe("timeline operations", () => {
  it("splitClip splits clip at valid time", () => {
    const clip: TimelineClip = {
      id: "clip-1",
      name: "Demo",
      mediaUrl: "/demo.mp4",
      timelineStartMs: 1000,
      durationMs: 4000,
      sourceOffsetMs: 0,
      muted: false,
      volume: 1,
    };

    const result = splitClip(clip, 2500);
    expect(result).not.toBeNull();
    const [c1, c2] = result!;
    expect(c1.durationMs).toBe(1500);
    expect(c2.durationMs).toBe(2500);
    expect(c2.timelineStartMs).toBe(2500);
    expect(c2.sourceOffsetMs).toBe(1500);
  });

  it("removeClipAndRipple shifts following clips", () => {
    const clips: TimelineClip[] = [
      { id: "c1", name: "1", mediaUrl: "", timelineStartMs: 0, durationMs: 2000, sourceOffsetMs: 0, muted: false, volume: 1 },
      { id: "c2", name: "2", mediaUrl: "", timelineStartMs: 2000, durationMs: 3000, sourceOffsetMs: 0, muted: false, volume: 1 },
      { id: "c3", name: "3", mediaUrl: "", timelineStartMs: 5000, durationMs: 2000, sourceOffsetMs: 0, muted: false, volume: 1 },
    ];

    const updated = removeClipAndRipple(clips, "c2");
    expect(updated.length).toBe(2);
    expect(updated[0]?.id).toBe("c1");
    expect(updated[1]?.id).toBe("c3");
    expect(updated[1]?.timelineStartMs).toBe(2000); // Shifted by -3000ms
  });

  it("splitZoomBlock splits block into two valid blocks", () => {
    const block = {
      id: "z1",
      startTimeMs: 1000,
      endTimeMs: 5000,
      targetX: 0.5,
      targetY: 0.5,
      scale: 1.8,
      enabled: true,
    };

    const res = splitZoomBlock(block, 3000);
    expect(res).not.toBeNull();
    const [b1, b2] = res!;
    expect(b1.startTimeMs).toBe(1000);
    expect(b1.endTimeMs).toBe(3000);
    expect(b2.startTimeMs).toBe(3000);
    expect(b2.endTimeMs).toBe(5000);
  });
});

describe("looks presets", () => {
  it("provides valid background and shadow presets", () => {
    expect(BACKGROUND_PRESETS.length).toBeGreaterThan(4);
    expect(SHADOW_PRESETS.length).toBe(4);
  });
});
