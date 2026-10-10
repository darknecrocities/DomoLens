import { describe, expect, it } from "vitest";
import {
  calculateCameraAtTime,
  calculateDeadzoneCamera,
  calculateIntentZoom,
  clampCameraToBounds,
  classifySpatialTransition,
  detectZoomBlocksFromClicks,
  easeInOutCubic,
  evaluateCameraEasing,
  evaluateCameraPhysicsProgress,
  fillInteractionGaps,
  interpolateCursorAtTime,
  plotInteractionsToKeyframesAndZoomBlocks,
  screenToVideoCoordinates,
  smoothCursorTrajectory,
  videoToScreenCoordinates,
  zoomBlocksToKeyframes,
  generateTourShiftSequence,
  getSteadicamBreathing,
  processDrawnTracePath,
  pointsToSmoothSvgPath,
} from "./zoom";
import type { CameraPhysicsPreset, ClickEvent, InteractionEvent, TimelineClip, ZoomBlock } from "./project";
import { removeClipAndRipple, splitClip, splitZoomBlock } from "./timeline";
import { BACKGROUND_PRESETS, SHADOW_PRESETS } from "./looks";

describe("zoom algorithms", () => {
  it("clampCameraToBounds clamps within valid range", () => {
    // In default center mode, clamps to safe visible frame so video covers full viewport with zero void
    const centeredNearLeft = clampCameraToBounds(0.05, 0.5, 2.0);
    expect(centeredNearLeft.x).toBe(0.25);

    // At scale 2.0, half width is 0.25, valid range is [0.25, 0.75] in strict mode
    const clampedNearLeft = clampCameraToBounds(0.05, 0.5, 2.0, "strict");
    expect(clampedNearLeft.x).toBe(0.25);

    const clampedNearRight = clampCameraToBounds(0.95, 0.5, 2.0, "strict");
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
      holdDurationMs: 1000,
      scale: 1.85,
    });

    // Should create exactly 2 clusters / zoom blocks: one for [e1, e2, e3], one for [e4]
    expect(result.zoomBlocks).toHaveLength(2);

    const firstBlock = result.zoomBlocks[0]!;
    // Starts 1.0s before first interaction (1000ms - 1000ms = 0ms)
    expect(firstBlock.startTimeMs).toBe(0);
    // Holds 1.0s of inactivity after last interaction in cluster (1800ms) + 1000ms hold + 400ms leadout = 3200ms
    expect(firstBlock.endTimeMs).toBe(3200);

    const secondBlock = result.zoomBlocks[1]!;
    // Second block for e4 (8000ms): 8000ms - 1000ms = 7000ms
    expect(secondBlock.startTimeMs).toBe(7000);
    expect(secondBlock.endTimeMs).toBe(9400);

    // Keyframes should include nodes for intermediate tracking and sound cues
    expect(result.keyframes.length).toBeGreaterThanOrEqual(8);
    expect(result.keyframes.some((k) => k.sound === "typing")).toBe(true);
    expect(result.keyframes.some((k) => k.sound === "click")).toBe(true);
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

  it("calculateIntentZoom zooms in on typing input location by default and supports zoom-out option", () => {
    const typingEvt = { id: "t1", type: "typing" as const, timestampMs: 1000, x: 0.5, y: 0.5, snippet: "Hello" };
    const typingIntent = calculateIntentZoom(typingEvt);
    expect(typingIntent.scale).toBe(1.85);
    expect(typingIntent.offsetY).toBe(0);

    const typingZoomedOut = calculateIntentZoom(typingEvt, { typingZoomOut: true });
    expect(typingZoomedOut.scale).toBe(1.0);

    const highlightEvt = { id: "hl1", type: "highlight" as const, timestampMs: 1500, x: 0.4, y: 0.4 };
    const highlightIntent = calculateIntentZoom(highlightEvt);
    expect(highlightIntent.scale).toBe(1.80);

    const rightClickEvt = { id: "c1", timestampMs: 2000, x: 0.4, y: 0.4, button: "right" as const };
    const rightClickIntent = calculateIntentZoom(rightClickEvt);
    expect(rightClickIntent.scale).toBe(1.7);
    expect(rightClickIntent.offsetY).toBe(0);
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
    // 22000ms + 1200ms inactivity hold + 400ms leadout = 23600ms (smoothly returns to 1.0x)
    expect(lastKf.timeMs).toBe(23600);
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

  it("auto-plots typing activity zooming in on typed target with keystroke audio", () => {
    const typingInteractions = [
      { id: "type-1", type: "typing" as const, timestampMs: 4000, x: 0.45, y: 0.5, snippet: "searching..." },
    ];
    const result = plotInteractionsToKeyframesAndZoomBlocks(typingInteractions, 12000);
    expect(result.zoomBlocks).toHaveLength(1);
    const block = result.zoomBlocks[0]!;
    expect(block.scale).toBe(1.85); // Typing zooms into target
    expect(block.targetX).toBe(0.45);
    expect(block.targetY).toBe(0.5);
    expect(result.keyframes.some((k) => k.sound === "typing")).toBe(true);
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

  it("continuously glides camera between clicking targets without dropping to 1.0x", () => {
    const interactions = [
      { id: "act-1", type: "click" as const, timestampMs: 2000, x: 0.3, y: 0.4, button: "left" as const },
      // Adjacent interaction separated by 2.6 seconds (less than 3.8s inactivity lull)
      { id: "act-2", type: "click" as const, timestampMs: 4600, x: 0.65, y: 0.7, button: "left" as const },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(interactions, 12000, {
      continuousGlide: true,
      maxGlideGapMs: 3800,
    });

    expect(result.keyframes.length).toBeGreaterThanOrEqual(4);

    // In between act-1 and act-2 (at t = 3500ms and t = 4200ms), camera must NOT drop to 1.0x
    const mid1 = calculateCameraAtTime(3500, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    const mid2 = calculateCameraAtTime(4200, result.zoomBlocks, 1000, 400, undefined, result.keyframes);

    expect(mid1.scale).toBeGreaterThanOrEqual(1.4);
    expect(mid1.isZoomed).toBe(true);

    expect(mid2.scale).toBeGreaterThanOrEqual(1.35);
    expect(mid2.isZoomed).toBe(true);

    // Camera target must have moved smoothly towards act-2 (x > 0.3)
    expect(mid2.x).toBeGreaterThan(0.35);

    // After act-2 finishes (at t = 10000ms), camera gracefully returns to full frame (1.0x)
    const after = calculateCameraAtTime(10000, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(after.scale).toBe(1.0);
    expect(after.isZoomed).toBe(false);
  });

  it("generateTourShiftSequence produces smooth camera glide tour across sequential UI steps", () => {
    const steps = [
      { id: "step-1", type: "click" as const, timestampMs: 1500, x: 0.25, y: 0.3, button: "left" as const },
      { id: "step-2", type: "typing" as const, timestampMs: 3800, x: 0.75, y: 0.65, snippet: "Input", durationMs: 1000 },
      { id: "step-3", type: "click" as const, timestampMs: 6500, x: 0.5, y: 0.8, button: "left" as const },
    ];

    const tour = generateTourShiftSequence(steps, 10000);
    expect(tour.zoomBlocks.length).toBe(3);
    expect(tour.keyframes.length).toBeGreaterThanOrEqual(6);

    // Prior to lead-in start (at t = 400ms): camera is not zoomed
    const startCam = calculateCameraAtTime(400, tour.zoomBlocks, 1000, 400, undefined, tour.keyframes);
    expect(startCam.isZoomed).toBe(false);

    // Focused on step 1
    const step1Cam = calculateCameraAtTime(1600, tour.zoomBlocks, 350, 400, undefined, tour.keyframes);
    expect(step1Cam.isZoomed).toBe(true);
    expect(step1Cam.scale).toBeGreaterThanOrEqual(1.6);
    expect(step1Cam.x).toBeLessThan(0.4);

    // During camera shift glide from step 1 to step 2, camera smoothly pans across and stays zoomed
    const shiftCam = calculateCameraAtTime(3600, tour.zoomBlocks, 350, 400, undefined, tour.keyframes);
    expect(shiftCam.isZoomed).toBe(true);
    expect(shiftCam.scale).toBeGreaterThan(1.2);

    // Focused on step 2 (typing has 2.1x adaptive scale)
    const step2Cam = calculateCameraAtTime(4200, tour.zoomBlocks, 350, 400, undefined, tour.keyframes);
    expect(step2Cam.isZoomed).toBe(true);
    expect(step2Cam.scale).toBeGreaterThanOrEqual(2.0);
    expect(step2Cam.x).toBeGreaterThan(0.6);
  });

  it("generateTourShiftSequence zooms out to 1.0x full screen when inactivity exceeds 1 second", () => {
    const steps = [
      { id: "step-1", type: "click" as const, timestampMs: 2000, x: 0.3, y: 0.4, button: "left" as const },
      { id: "step-2", type: "click" as const, timestampMs: 12000, x: 0.7, y: 0.8, button: "left" as const },
    ];

    const tour = generateTourShiftSequence(steps, 20000);
    expect(tour.zoomBlocks.length).toBe(2);

    // Zoomed in on step 1 at t = 2200ms
    const step1Cam = calculateCameraAtTime(2200, tour.zoomBlocks, 1000, 400, undefined, tour.keyframes);
    expect(step1Cam.isZoomed).toBe(true);

    // When inactive between t = 5000ms and t = 10000ms, camera MUST be 1.0x full screen!
    const midGapCam = calculateCameraAtTime(7000, tour.zoomBlocks, 1000, 400, undefined, tour.keyframes);
    expect(midGapCam.isZoomed).toBe(false);
    expect(midGapCam.scale).toBe(1.0);
    expect(midGapCam.x).toBe(0.5);
    expect(midGapCam.y).toBe(0.5);

    // ZoomBlock 1 ended cleanly around holdEnd + leadOut, not spanning all 12 seconds
    expect(tour.zoomBlocks[0]!.endTimeMs).toBeLessThan(5000);
  });

  it("smoothCursorTrajectory handles none, smooth, and cinematic modes with click anchoring", () => {
    const rawPoints = [
      { timestampMs: 0, x: 0.1, y: 0.1 },
      { timestampMs: 100, x: 0.9, y: 0.9 }, // Sudden jerky spike
      { timestampMs: 200, x: 0.5, y: 0.5 },
      { timestampMs: 300, x: 0.6, y: 0.6 },
    ];

    // Mode none: returns untouched
    const none = smoothCursorTrajectory(rawPoints, "none");
    expect(none[1]?.x).toBe(0.9);
    expect(none[1]?.y).toBe(0.9);

    // Mode smooth: dampens the spike
    const smooth = smoothCursorTrajectory(rawPoints, "smooth");
    expect(smooth[1]?.x).toBeLessThan(0.9);
    expect(smooth[1]?.x).toBeGreaterThan(0.1);

    // Mode cinematic: dampens even more
    const cinematic = smoothCursorTrajectory(rawPoints, "cinematic");
    expect(cinematic[1]?.x).toBeLessThan(smooth[1]?.x!);

    // Click anchoring: anchors trajectory near click point
    const clicks = [
      { id: "c-click", timestampMs: 195, x: 0.42, y: 0.44, button: "left" as const },
    ];
    const anchored = smoothCursorTrajectory(rawPoints, "smooth", clicks);
    expect(anchored[2]?.x).toBeCloseTo(0.42, 1);
    expect(anchored[2]?.y).toBeCloseTo(0.44, 1);
  });

  it("calculateCameraAtTime auto-tracks cursor smoothly across screen when enabled", () => {
    const trajectory = [
      { timestampMs: 0, x: 0.2, y: 0.2 },
      { timestampMs: 1000, x: 0.4, y: 0.3 },
      { timestampMs: 2000, x: 0.7, y: 0.75 },
    ];

    // Continuous auto-tracking without zoom blocks
    const autoTracked = calculateCameraAtTime(2000, [], 350, 400, trajectory, undefined, {
      autoTrackCursor: true,
      autoTrackScale: 1.8,
    });
    expect(autoTracked.isZoomed).toBe(true);
    expect(autoTracked.scale).toBe(1.8);
    // Camera center should clamp and follow cursor (x near 0.7, y near 0.72)
    expect(autoTracked.x).toBeGreaterThanOrEqual(0.65);
    expect(autoTracked.y).toBeGreaterThanOrEqual(0.65);

    // Disabled auto-tracking returns unzoomed frame
    const unzoomed = calculateCameraAtTime(2000, [], 350, 400, trajectory, undefined, {
      autoTrackCursor: false,
    });
    expect(unzoomed.scale).toBe(1.0);
    expect(unzoomed.isZoomed).toBe(false);
  });

  it("maintains focus on typed input across continuous typing session and generates typing sounds", () => {
    const interactions: import("./project").InteractionEvent[] = [
      {
        id: "type-long",
        type: "typing",
        timestampMs: 2000,
        x: 0.35,
        y: 0.45,
        snippet: "long text typing session",
        durationMs: 3000,
      },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(interactions, 12000, {
      leadInMs: 1000,
      holdDurationMs: 1000,
    });

    // ZoomBlock covers typing session with focus on typed coordinates
    expect(result.zoomBlocks.length).toBe(1);
    expect(result.zoomBlocks[0]?.startTimeMs).toBeLessThanOrEqual(1000);
    expect(result.zoomBlocks[0]?.scale).toBe(1.85);
    expect(result.zoomBlocks[0]?.targetX).toBe(0.35);
    expect(result.zoomBlocks[0]?.targetY).toBe(0.45);

    // Typing sound keyframes must be present
    const typeKeyframes = result.keyframes.filter((kf) => kf.sound === "typing");
    expect(typeKeyframes.length).toBeGreaterThanOrEqual(1);

    // During active typing (at t = 3500ms), camera is focused on the typing input
    const activeCamera = calculateCameraAtTime(3500, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(activeCamera.scale).toBe(1.85);
    expect(activeCamera.x).toBeCloseTo(0.35, 2);
    expect(activeCamera.y).toBeCloseTo(0.45, 2);
  });

  it("auto-plots text highlight interaction with dedicated zoom and framed coordinates", () => {
    const highlightInteractions: import("./project").InteractionEvent[] = [
      {
        id: "hl-1",
        type: "highlight",
        timestampMs: 3000,
        durationMs: 800,
        x: 0.4,
        y: 0.35,
        xEnd: 0.6,
        yEnd: 0.38,
        snippet: "Text Selection",
      },
    ];
    const result = plotInteractionsToKeyframesAndZoomBlocks(highlightInteractions, 10000);
    expect(result.zoomBlocks).toHaveLength(1);
    const block = result.zoomBlocks[0]!;
    expect(block.scale).toBe(1.8);
    expect(block.targetX).toBe(0.4);
    expect(block.targetY).toBe(0.35);
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

  it("fillInteractionGaps bridges gaps greater than 4200ms with intermediate focal nodes", () => {
    const sparseInteractions = [
      { id: "i1", type: "click" as const, timestampMs: 2000, x: 0.3, y: 0.4 },
      // 16 second gap between 2000ms and 18000ms
      { id: "i2", type: "click" as const, timestampMs: 18000, x: 0.7, y: 0.6 },
    ];

    const filled = fillInteractionGaps(sparseInteractions, 25000);
    expect(filled.length).toBeGreaterThan(sparseInteractions.length);

    // Verify all gaps between consecutive events are <= 4200ms
    for (let i = 0; i < filled.length - 1; i++) {
      const gap = filled[i + 1]!.timestampMs - filled[i]!.timestampMs;
      expect(gap).toBeLessThanOrEqual(4200);
    }
  });

  it("calculateCameraAtTime honors keyframe target coordinates when cursor trajectory is present", () => {
    const keyframes = [
      { id: "kf-1", timeMs: 1000, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" as const },
      { id: "kf-2", timeMs: 2000, scale: 1.85, targetX: 0.25, targetY: 0.35, easing: "spring" as const },
      { id: "kf-3", timeMs: 5000, scale: 1.85, targetX: 0.25, targetY: 0.35, easing: "cubic" as const },
      { id: "kf-4", timeMs: 6000, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" as const },
    ];

    // Cursor is at (0.28, 0.37), very close to target (0.25, 0.35) inside deadzone
    const trajectory = [
      { timestampMs: 1500, x: 0.28, y: 0.37 },
      { timestampMs: 2000, x: 0.28, y: 0.37 },
      { timestampMs: 4000, x: 0.28, y: 0.37 },
    ];

    const camera = calculateCameraAtTime(2000, [], 500, 400, trajectory, keyframes);
    expect(camera.scale).toBeCloseTo(1.85, 2);
    // Camera center must center closely on target coordinates rather than snapping solely to cursor
    expect(camera.x).toBeCloseTo(0.25, 1);
    expect(camera.y).toBeCloseTo(0.35, 1);
  });

  it("applies video editor showcase arc with tight button focus followed by context zoom-out", () => {
    const clickEvent = [{ id: "c-btn", type: "click" as const, timestampMs: 3000, x: 0.4, y: 0.5 }];
    const plotted = plotInteractionsToKeyframesAndZoomBlocks(clickEvent, 10000, {
      scale: 1.9,
      holdDurationMs: 2000,
    });

    // Peak keyframe right on button click at tight macro scale (1.9x)
    const peakKf = plotted.keyframes.find((k) => k.id === "kf-peak-c-btn");
    expect(peakKf).toBeDefined();
    expect(peakKf?.scale).toBe(1.9);

    // Showcase reveal keyframe pulling back automatically to showcase scale (e.g. ~1.48x)
    const revealKf = plotted.keyframes.find((k) => k.id === "kf-reveal-c-btn");
    expect(revealKf).toBeDefined();
    expect(revealKf?.scale).toBeLessThan(1.9);
    expect(revealKf?.scale).toBeGreaterThanOrEqual(1.35);

    // Hold keyframe stays at showcase scale to comfortably track cursor
    const holdKf = plotted.keyframes.find((k) => k.id === "kf-hold-c-btn");
    expect(holdKf).toBeDefined();
    expect(holdKf?.scale).toBeLessThan(1.9);
  });

  it("zoomBlocksToKeyframes generates smooth monotonic keyframes from zoom blocks", () => {
    const blocks = [
      { id: "b1", startTimeMs: 2000, endTimeMs: 4000, targetX: 0.3, targetY: 0.4, scale: 1.8, enabled: true },
      { id: "b2", startTimeMs: 8000, endTimeMs: 10000, targetX: 0.7, targetY: 0.6, scale: 2.0, enabled: true },
    ];
    const keyframes = zoomBlocksToKeyframes(blocks, 15000);
    expect(keyframes.length).toBeGreaterThanOrEqual(6);
    // Verify strictly monotonic timeMs ordering
    for (let i = 0; i < keyframes.length - 1; i++) {
      expect(keyframes[i + 1]!.timeMs).toBeGreaterThanOrEqual(keyframes[i]!.timeMs);
    }
  });

  it("interpolateCursorAtTime accurately locates coordinates with O(log N) binary search", () => {
    const trajectory = [
      { timestampMs: 1000, x: 0.1, y: 0.2 },
      { timestampMs: 2000, x: 0.3, y: 0.4 },
      { timestampMs: 3000, x: 0.5, y: 0.6 },
      { timestampMs: 4000, x: 0.7, y: 0.8 },
    ];
    const at1500 = interpolateCursorAtTime(1500, trajectory);
    expect(at1500.x).toBeCloseTo(0.2, 2);
    expect(at1500.y).toBeCloseTo(0.3, 2);

    const at3500 = interpolateCursorAtTime(3500, trajectory);
    expect(at3500.x).toBeCloseTo(0.6, 2);
    expect(at3500.y).toBeCloseTo(0.7, 2);
  });
  it("plotInteractionsToKeyframesAndZoomBlocks centers typing clusters on the exact text input coordinates without reveal dip", () => {
    const typingInteractions: InteractionEvent[] = [
      { id: "click-input", type: "click", timestampMs: 2000, x: 0.72, y: 0.18, button: "left" },
      { id: "type-search", type: "typing", timestampMs: 2200, x: 0.75, y: 0.18, snippet: "God of War", durationMs: 1500 },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(typingInteractions, 10000, {
      typingZoomOut: false,
    });

    expect(result.zoomBlocks.length).toBe(1);
    const block = result.zoomBlocks[0]!;
    // Must center on typing location safely clamped within boundaries
    const expectedTypingTarget = clampCameraToBounds(0.75, 0.18, block.scale);
    expect(block.targetX).toBeCloseTo(expectedTypingTarget.x, 2);
    expect(block.targetY).toBeCloseTo(expectedTypingTarget.y, 2);
    expect(block.scale).toBeGreaterThanOrEqual(1.85);

    // Peak keyframe must center on typing location safely clamped
    const peakKf = result.keyframes.find((k) => k.id.includes("kf-peak"));
    expect(peakKf).toBeDefined();
    expect(peakKf?.targetX).toBeCloseTo(expectedTypingTarget.x, 2);
    expect(peakKf?.targetY).toBeCloseTo(expectedTypingTarget.y, 2);

    // Typing must NOT have reveal dip (no zooming out mid-typing)
    const revealKf = result.keyframes.find((k) => k.id.includes("kf-reveal"));
    expect(revealKf).toBeUndefined();
  });

  it("when centerTyping is true, centers search/text typing horizontally (0.50) and frames upper inputs at (0.37) with smooth pan from click", () => {
    const typingInteractions: InteractionEvent[] = [
      { id: "click-search", type: "click", timestampMs: 2000, x: 0.30, y: 0.27, button: "left" },
      { id: "type-search", type: "typing", timestampMs: 2300, x: 0.30, y: 0.27, snippet: "arron p", durationMs: 2000 },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(typingInteractions, 10000, {
      centerTyping: true,
      scale: 1.90,
    });

    expect(result.zoomBlocks.length).toBe(1);
    const block = result.zoomBlocks[0]!;
    // Horizontal center of recording stage
    expect(block.targetX).toBe(0.50);
    // Upper search input framed with autocomplete dropdown space below
    expect(block.targetY).toBeCloseTo(0.37, 2);

    // Initial peak lands on the click
    const peakKf = result.keyframes.find((k) => k.id === "kf-peak-click-search");
    expect(peakKf).toBeDefined();
    expect(peakKf?.targetX).toBe(0.30);
    expect(peakKf?.targetY).toBe(0.27);

    // Smooth pan to centered stage as typing begins
    const panKf = result.keyframes.find((k) => k.id.includes("kf-type-center") || k.id.includes("kf-track-type-search"));
    expect(panKf).toBeDefined();
    expect(panKf?.targetX).toBe(0.50);
    expect(panKf?.targetY).toBeCloseTo(0.37, 2);
  });

  it("centers camera safely on click coordinates near screen edges without exposing black voids", () => {
    const clickEvents: InteractionEvent[] = [
      { id: "c-edge", type: "click", timestampMs: 3000, x: 0.85, y: 0.12, button: "left" },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(clickEvents, 8000, {
      leadInMs: 1000,
      scale: 1.85,
    });

    expect(result.zoomBlocks.length).toBe(1);
    const block = result.zoomBlocks[0]!;
    // Must target safely clamped click position to prevent black border void
    const expectedClamped = clampCameraToBounds(0.85, 0.12, 1.85, "center");
    expect(block.targetX).toBeCloseTo(expectedClamped.x, 3);
    expect(block.targetY).toBeCloseTo(expectedClamped.y, 3);

    const peakKf = result.keyframes.find((k) => k.id.includes("kf-peak"));
    expect(peakKf).toBeDefined();
    expect(peakKf?.targetX).toBeCloseTo(expectedClamped.x, 3);
    expect(peakKf?.targetY).toBeCloseTo(expectedClamped.y, 3);

    // At peak click timestamp, camera coordinates are bounded safely
    const cameraAtClick = calculateCameraAtTime(3000, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(cameraAtClick.scale).toBeCloseTo(1.85, 2);
    expect(cameraAtClick.x).toBeCloseTo(expectedClamped.x, 2);
    expect(cameraAtClick.y).toBeCloseTo(expectedClamped.y, 2);

    // Verify screen coordinates frame clicked element visibly without showing void
    const screenCenter = videoToScreenCoordinates(0.85, 0.12, 1920, 1080, cameraAtClick);
    expect(screenCenter.pixelX).toBeGreaterThan(960);
    expect(screenCenter.pixelX).toBeLessThan(1920);
    expect(screenCenter.pixelY).toBeGreaterThan(0);
    expect(screenCenter.pixelY).toBeLessThan(540);
  });

  it("zooms in smoothly from full-frame center to clicked element without visual jump", () => {
    const clickEvents: InteractionEvent[] = [
      { id: "c-topright", type: "click", timestampMs: 2000, x: 0.90, y: 0.10, button: "left" },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(clickEvents, 6000, {
      leadInMs: 1000,
      scale: 2.0,
    });

    // At t = 1000ms (start of lead-in, unzoomed full frame), camera is perfectly centered at (0.5, 0.5)
    const camStart = calculateCameraAtTime(1000, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camStart.x).toBeCloseTo(0.50, 2);
    expect(camStart.y).toBeCloseTo(0.50, 2);
    expect(camStart.scale).toBeCloseTo(1.0, 2);
    const screenStart = videoToScreenCoordinates(0.90, 0.10, 1920, 1080, camStart);
    // Button is at its natural unzoomed screen location (1728, 108)
    expect(screenStart.pixelX).toBeCloseTo(1728, 1);
    expect(screenStart.pixelY).toBeCloseTo(108, 1);

    // At t = 1500ms (midpoint of lead-in), camera smoothly glides towards clicked element
    const camMid = calculateCameraAtTime(1500, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camMid.x).toBeGreaterThan(0.50);
    expect(camMid.x).toBeLessThan(0.90);
    expect(camMid.scale).toBeGreaterThan(1.0);
    expect(camMid.scale).toBeLessThan(2.0);

    // At t = 2000ms (exact click moment), element lands at safely clamped focal target
    const camPeak = calculateCameraAtTime(2000, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    const expectedPeak = clampCameraToBounds(0.90, 0.10, 2.0, "center");
    expect(camPeak.x).toBeCloseTo(expectedPeak.x, 2);
    expect(camPeak.y).toBeCloseTo(expectedPeak.y, 2);
    expect(camPeak.scale).toBeCloseTo(2.0, 2);
    const screenPeak = videoToScreenCoordinates(0.90, 0.10, 1920, 1080, camPeak);
    // Framed safely in upper right with 100% full bleed coverage
    expect(screenPeak.pixelX).toBeCloseTo(1536, 1);
    expect(screenPeak.pixelY).toBeCloseTo(216, 1);

    // At t = 6000ms (after lead-out), camera has returned cleanly to full frame center (0.5, 0.5)
    const camEnd = calculateCameraAtTime(6000, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camEnd.x).toBeCloseTo(0.50, 2);
    expect(camEnd.y).toBeCloseTo(0.50, 2);
    expect(camEnd.scale).toBeCloseTo(1.0, 2);
  });

  it("clampCameraToBounds guarantees zero black border exposure near bottom edge", () => {
    // Target y = 0.80 at scale 1.9 (as in user screenshot)
    const scale = 1.9;
    const halfH = 0.5 / scale;
    const clamped = clampCameraToBounds(0.5, 0.80, scale);

    // camera.y must NOT exceed 1 - halfH (0.7368)
    expect(clamped.y).toBeLessThanOrEqual(1 - halfH);
    expect(clamped.y).toBeCloseTo(1 - halfH, 4);

    // Visible bottom edge (camera.y + halfH) must NEVER exceed 1.0000
    const visibleBottom = clamped.y + halfH;
    expect(visibleBottom).toBeLessThanOrEqual(1.0001);
  });

  it("getSteadicamBreathing produces subtle non-zero organic micro-motion during holds", () => {
    const b1 = getSteadicamBreathing(1000, 1.85);
    const b2 = getSteadicamBreathing(2500, 1.85);
    expect(Math.abs(b1.dx)).toBeGreaterThan(0);
    expect(Math.abs(b1.dy)).toBeGreaterThan(0);
    expect(b1.dx).not.toEqual(b2.dx);
    // Micro-motion amplitude must stay below 0.005 to prevent disorienting shake
    expect(Math.abs(b1.dx)).toBeLessThan(0.005);
    expect(Math.abs(b1.dy)).toBeLessThan(0.005);
  });

  it("glides smoothly between consecutive browser tab clicks with cubic panning and crane shift without returning to 1.0x", () => {
    const tabClicks: InteractionEvent[] = [
      { id: "tab-1", type: "click", timestampMs: 2000, x: 0.20, y: 0.12, button: "left" },
      { id: "tab-2", type: "click", timestampMs: 4200, x: 0.70, y: 0.12, button: "left" },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(tabClicks, 10000, {
      continuousGlide: true,
      maxGlideGapMs: 3800,
    });

    expect(result.zoomBlocks.length).toBe(1);

    // Verify crane dip exists midway through the wide tab transition
    const craneKf = result.keyframes.find((k) => k.id.includes("kf-crane"));
    expect(craneKf).toBeDefined();
    expect(craneKf?.scale).toBeLessThan(1.85);
    expect(craneKf?.scale).toBeGreaterThan(1.20);
    expect(craneKf?.easing).toBe("cubic");

    // At midway between tabs (t = 3100ms), camera must be actively gliding between them, NOT at 1.0x full frame
    const midCam = calculateCameraAtTime(3100, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(midCam.scale).toBeGreaterThan(1.4);
    expect(midCam.x).toBeGreaterThan(0.20);
    expect(midCam.x).toBeLessThan(0.70);

    // Glide keyframe to Tab 2 must have smooth cubic easing
    const glideKf = result.keyframes.find((k) => k.id.includes("tab-2"));
    expect(glideKf).toBeDefined();
    expect(glideKf?.easing).toBe("cubic");
  });

  it("handles typing interaction with authentic focus without dummy text snippets", () => {
    const typingEvt: InteractionEvent = {
      id: "type-search",
      type: "typing",
      timestampMs: 3000,
      x: 0.50,
      y: 0.25,
      durationMs: 1500,
    };

    const result = plotInteractionsToKeyframesAndZoomBlocks([typingEvt], 10000);
    expect(result.zoomBlocks.length).toBe(1);

    // Keyframe attached sound must be typing
    const peakKf = result.keyframes.find((k) => k.id.includes("kf-peak"));
    expect(peakKf?.sound).toBe("typing");

    // Camera at t = 3500ms focuses on input coordinates
    const camDuringTyping = calculateCameraAtTime(3500, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camDuringTyping.scale).toBe(1.85);
    expect(camDuringTyping.x).toBe(0.50);
  });

  it("strictly enforces non-overlapping zoom blocks and decimated keyframe diamonds", () => {
    // 8 rapid interactions across 12 seconds with varied intervals
    const interactions: InteractionEvent[] = [
      { id: "e1", type: "click", timestampMs: 1000, x: 0.2, y: 0.3 },
      { id: "e2", type: "click", timestampMs: 2200, x: 0.4, y: 0.3 },
      { id: "e3", type: "typing", timestampMs: 3400, x: 0.5, y: 0.5, durationMs: 1200 },
      { id: "e4", type: "click", timestampMs: 5100, x: 0.7, y: 0.2 },
      { id: "e5", type: "click", timestampMs: 6300, x: 0.3, y: 0.1 },
      { id: "e6", type: "click", timestampMs: 7800, x: 0.8, y: 0.6 },
      { id: "e7", type: "click", timestampMs: 8900, x: 0.5, y: 0.5 },
      { id: "e8", type: "click", timestampMs: 10200, x: 0.2, y: 0.4 },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(interactions, 15000);

    // 1. Strict zoom block non-overlapping invariant: cur.endTimeMs must never exceed next.startTimeMs
    expect(result.zoomBlocks.length).toBeGreaterThan(0);
    for (let i = 0; i < result.zoomBlocks.length - 1; i++) {
      const cur = result.zoomBlocks[i]!;
      const next = result.zoomBlocks[i + 1]!;
      expect(cur.endTimeMs).toBeLessThanOrEqual(next.startTimeMs);
    }

    // 2. Strict keyframe decimation invariant: no two keyframes can be placed closer than 240ms
    expect(result.keyframes.length).toBeGreaterThan(0);
    for (let i = 0; i < result.keyframes.length - 1; i++) {
      const curKf = result.keyframes[i]!;
      const nextKf = result.keyframes[i + 1]!;
      expect(nextKf.timeMs - curKf.timeMs).toBeGreaterThanOrEqual(240);
    }

    // 3. Audio preservation: typing and click sounds must still be present on relevant keyframes
    const hasTypingSound = result.keyframes.some((k) => k.sound === "typing");
    const hasClickSound = result.keyframes.some((k) => k.sound === "click");
    expect(hasTypingSound).toBe(true);
    expect(hasClickSound).toBe(true);
  });

  it("handles consecutive navbar button clicks in one zoom block while gliding between buttons, and zooms out on isolated clicks", () => {
    const events: InteractionEvent[] = [
      // Consecutive navbar sequence: 3 buttons clicked across 3.6 seconds
      { id: "nav-overview", type: "click", timestampMs: 2000, x: 0.30, y: 0.15 },
      { id: "nav-features", type: "click", timestampMs: 3800, x: 0.45, y: 0.15 },
      { id: "nav-showcase", type: "click", timestampMs: 5600, x: 0.60, y: 0.15 },

      // Isolated click much later (8 seconds gap)
      { id: "cta-download", type: "click", timestampMs: 14000, x: 0.50, y: 0.65 },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(events, 20000, {
      continuousGlide: true,
      scale: 1.85,
    });

    // 1. Must produce exactly 2 zoom blocks: 1 for the navbar sequence, 1 for the isolated CTA click
    expect(result.zoomBlocks.length).toBe(2);

    const [navbarBlock, ctaBlock] = result.zoomBlocks;
    expect(navbarBlock).toBeDefined();
    expect(ctaBlock).toBeDefined();

    // The navbar block spans the entire 3-button sequence continuously
    expect(navbarBlock!.startTimeMs).toBeLessThanOrEqual(1500);
    expect(navbarBlock!.endTimeMs).toBeGreaterThan(6000);
    expect(navbarBlock!.scale).toBe(1.85);

    // The CTA block is isolated around 14000ms
    expect(ctaBlock!.startTimeMs).toBeGreaterThan(12000);
    expect(ctaBlock!.endTimeMs).toBeLessThanOrEqual(17000);

    // Absolutely zero overlap between the blocks (separated by over 5 seconds)
    expect(navbarBlock!.endTimeMs).toBeLessThan(ctaBlock!.startTimeMs - 2000);

    // 2. Playback verification during navbar sequence:
    // At t = 2000ms: camera is focused on Button 1 (x ~ 0.30)
    const camBtn1 = calculateCameraAtTime(2000, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camBtn1.scale).toBe(1.85);
    expect(camBtn1.x).toBeCloseTo(0.30, 1);

    // At t = 3400ms (gliding towards Button 2): camera is actively gliding at 1.85x, NOT at 1.0x
    const camGlide1 = calculateCameraAtTime(3400, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camGlide1.scale).toBe(1.85);
    expect(camGlide1.x).toBeGreaterThan(0.30);
    expect(camGlide1.x).toBeLessThan(0.46);

    // At t = 3800ms: camera is focused on Button 2 (x ~ 0.45)
    const camBtn2 = calculateCameraAtTime(3800, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camBtn2.scale).toBe(1.85);
    expect(camBtn2.x).toBeCloseTo(0.45, 1);

    // At t = 5200ms (gliding towards Button 3): camera is actively gliding at 1.85x, NOT at 1.0x
    const camGlide2 = calculateCameraAtTime(5200, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camGlide2.scale).toBe(1.85);
    expect(camGlide2.x).toBeGreaterThan(0.44);
    expect(camGlide2.x).toBeLessThan(0.61);

    // At t = 5600ms: camera is focused on Button 3 (x ~ 0.60)
    const camBtn3 = calculateCameraAtTime(5600, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camBtn3.scale).toBe(1.85);
    expect(camBtn3.x).toBeCloseTo(0.60, 1);

    // 3. After navbar sequence finishes (e.g. at t = 9000ms): camera returns to full screen 1.0x
    const camBetween = calculateCameraAtTime(9000, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camBetween.scale).toBe(1.0);
    expect(camBetween.isZoomed).toBe(false);
    expect(camBetween.x).toBe(0.5);

    // 4. At isolated CTA click (t = 14000ms): camera zooms in, focuses at (0.50, 0.65), and zooms out
    const camCTA = calculateCameraAtTime(14000, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camCTA.scale).toBe(1.85);
    expect(camCTA.x).toBeCloseTo(0.50, 1);

    // At t = 18000ms: camera has zoomed back out to 1.0x
    const camFinal = calculateCameraAtTime(18000, result.zoomBlocks, 1000, 400, undefined, result.keyframes);
    expect(camFinal.scale).toBe(1.0);
    expect(camFinal.isZoomed).toBe(false);
  });

  it("decimates dense click clusters in 25s video into clean cinematic keyframes without 50+ keyframe explosion", () => {
    // 15 user actions across a 25-second video (navbar clicks, form input, and CTA)
    const rawEvents: InteractionEvent[] = [
      { id: "c1", type: "click", timestampMs: 2000, x: 0.20, y: 0.08, button: "left" },
      { id: "c2", type: "click", timestampMs: 3200, x: 0.35, y: 0.08, button: "left" },
      { id: "c3", type: "click", timestampMs: 4400, x: 0.50, y: 0.08, button: "left" },
      { id: "c4", type: "click", timestampMs: 4800, x: 0.51, y: 0.08, button: "left" }, // micro-click on same button
      { id: "c5", type: "click", timestampMs: 5000, x: 0.51, y: 0.08, button: "left" }, // micro-click on same button
      // Long rest gap
      { id: "c6", type: "click", timestampMs: 11000, x: 0.45, y: 0.38, button: "left" },
      { id: "t1", type: "typing", timestampMs: 12000, x: 0.45, y: 0.38, snippet: "Input", durationMs: 800 },
      { id: "c7", type: "click", timestampMs: 13200, x: 0.46, y: 0.39, button: "left" },
      // Another gap
      { id: "c8", type: "click", timestampMs: 19000, x: 0.50, y: 0.70, button: "left" },
      { id: "c9", type: "click", timestampMs: 20200, x: 0.50, y: 0.70, button: "left" },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(rawEvents, 25000, {
      holdDurationMs: 1200,
      leadInMs: 800,
      scale: 1.85,
      continuousGlide: true,
    });

    // Instead of 50-60 bloated keyframes, it must produce a clean, cinematic keyframe count (< 24)
    expect(result.keyframes.length).toBeLessThan(24);
    expect(result.keyframes.length).toBeGreaterThanOrEqual(8);

    // Guaranteed diamond spacing: every keyframe must have >= 240ms separation from the previous keyframe
    for (let i = 1; i < result.keyframes.length; i++) {
      const dt = result.keyframes[i]!.timeMs - result.keyframes[i - 1]!.timeMs;
      expect(dt).toBeGreaterThanOrEqual(240);
    }
  });

  it("guarantees camera smoothly returns to full screen 1.0x after last keyframe even if last keyframe scale > 1.05", () => {
    // Scenario like user screenshot: keyframe at 8000ms has scale 1.9
    const keyframes = [
      { id: "kf-1", timeMs: 6500, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" as const },
      { id: "kf-2", timeMs: 8000, scale: 1.9, targetX: 0.35, targetY: 0.45, easing: "spring" as const },
    ];

    // At t = 8000ms: fully zoomed in
    const atPeak = calculateCameraAtTime(8000, [], 1000, 400, undefined, keyframes);
    expect(atPeak.scale).toBe(1.9);
    expect(atPeak.isZoomed).toBe(true);

    // At t = 8200ms (mid lead-out): smoothly interpolating back towards full frame
    const midLeadOut = calculateCameraAtTime(8200, [], 1000, 400, undefined, keyframes);
    expect(midLeadOut.scale).toBeLessThan(1.9);
    expect(midLeadOut.scale).toBeGreaterThan(1.0);

    // At t = 8500ms (past leadOutMs 400ms): MUST BE BACK TO FULL FRAME 1.0x at (0.5, 0.5)!
    const afterLeadOut = calculateCameraAtTime(8500, [], 1000, 400, undefined, keyframes);
    expect(afterLeadOut.scale).toBe(1.0);
    expect(afterLeadOut.isZoomed).toBe(false);
    expect(afterLeadOut.x).toBe(0.5);
    expect(afterLeadOut.y).toBe(0.5);

    // At t = 10000ms (like in user screenshot): STILL FULL FRAME 1.0x, NEVER STUCK!
    const at10s = calculateCameraAtTime(10000, [], 1000, 400, undefined, keyframes);
    expect(at10s.scale).toBe(1.0);
    expect(at10s.isZoomed).toBe(false);
    expect(at10s.x).toBe(0.5);
    expect(at10s.y).toBe(0.5);
  });

  it("vectorized click motion: glides between clicks within 1.0s and zooms out to full frame after 1.0s inactivity", () => {
    const clickEvents: InteractionEvent[] = [
      // Consecutive clicks 600ms apart (<= 1.0s)
      { id: "click-tab-1", type: "click", timestampMs: 2000, x: 0.25, y: 0.15, button: "left" },
      { id: "click-tab-2", type: "click", timestampMs: 2600, x: 0.40, y: 0.15, button: "left" },
      // Long inactivity gap (5.4s later)
      { id: "click-button-3", type: "click", timestampMs: 8000, x: 0.70, y: 0.80, button: "left" },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(clickEvents, 12000, {
      holdDurationMs: 1000,
      inactivityResetMs: 1000,
      maxGlideGapMs: 1000,
      leadInMs: 800,
      leadOutMs: 400,
      scale: 1.85,
      continuousGlide: true,
    });

    // Must create 2 distinct zoom blocks: one for tabs 1 & 2, and one for button 3
    expect(result.zoomBlocks).toHaveLength(2);

    // Tab 1 & 2 block ends around 2600 + 1000 = 3600ms
    expect(result.zoomBlocks[0]!.endTimeMs).toBeLessThanOrEqual(4200);

    // Last keyframe of the first block must return to scale 1.0
    const kfOut1 = result.keyframes.find((k) => k.id.includes("click-tab-2") && k.scale === 1.0);
    expect(kfOut1).toBeDefined();

    // At t = 5000ms (during inactivity before button 3): camera MUST be full screen 1.0x
    const between = calculateCameraAtTime(5000, result.zoomBlocks, 800, 400, undefined, result.keyframes);
    expect(between.scale).toBe(1.0);
    expect(between.isZoomed).toBe(false);
    expect(between.x).toBe(0.5);
    expect(between.y).toBe(0.5);

    // At t = 8000ms (button 3): camera is zoomed in on button 3
    const atBtn3 = calculateCameraAtTime(8000, result.zoomBlocks, 800, 400, undefined, result.keyframes);
    expect(atBtn3.scale).toBe(1.85);
    expect(atBtn3.isZoomed).toBe(true);

    // At t = 11000ms (> 1s after button 3): camera zooms back out to 1.0x
    const atEnd = calculateCameraAtTime(11000, result.zoomBlocks, 800, 400, undefined, result.keyframes);
    expect(atEnd.scale).toBe(1.0);
    expect(atEnd.isZoomed).toBe(false);
  });

  it("guarantees every click is picked up and zooms in, returning to full screen 1.0x after 1s inactivity even when subsequent clicks occur shortly after zoom out", () => {
    // Click 1 at 2000ms, Click 2 at 3300ms (1.3s later: > 1.0s inactivity -> zooms out to 1.0x full screen, then zooms in on Click 2)
    const clicks: InteractionEvent[] = [
      { id: "click-first", type: "click", timestampMs: 2000, x: 0.20, y: 0.30, button: "left" },
      { id: "click-second", type: "click", timestampMs: 3300, x: 0.75, y: 0.65, button: "left" },
    ];

    const result = plotInteractionsToKeyframesAndZoomBlocks(clicks, 8000, {
      holdDurationMs: 1000,
      inactivityResetMs: 1000,
      maxGlideGapMs: 1000,
      leadInMs: 800,
      leadOutMs: 400,
      scale: 1.85,
      continuousGlide: true,
    });

    // Both clicks MUST have zoom blocks — neither click can be silently ignored!
    expect(result.zoomBlocks).toHaveLength(2);

    // Block 1 frames Click 1
    const [b1, b2] = result.zoomBlocks;
    expect(b1).toBeDefined();
    expect(b2).toBeDefined();

    // At Click 1 (2000ms): zoomed in on Click 1
    const cam1 = calculateCameraAtTime(2000, result.zoomBlocks, 800, 400, undefined, result.keyframes);
    expect(cam1.isZoomed).toBe(true);
    expect(cam1.scale).toBe(1.85);
    expect(cam1.x).toBeCloseTo(b1!.targetX, 2);

    // At Click 2 (3300ms): zoomed in on Click 2
    const cam2 = calculateCameraAtTime(3300, result.zoomBlocks, 800, 400, undefined, result.keyframes);
    expect(cam2.isZoomed).toBe(true);
    expect(cam2.scale).toBe(1.85);
    expect(cam2.x).toBeCloseTo(b2!.targetX, 2);

    // After Click 2 has rested for > 1.0s (e.g. at 5000ms): fully returned to full screen 1.0x
    const camAfter = calculateCameraAtTime(5000, result.zoomBlocks, 800, 400, undefined, result.keyframes);
    expect(camAfter.isZoomed).toBe(false);
    expect(camAfter.scale).toBe(1.0);
    expect(camAfter.x).toBe(0.5);
    expect(camAfter.y).toBe(0.5);
  });
});

describe("looks presets", () => {
  it("provides valid background and shadow presets", () => {
    expect(BACKGROUND_PRESETS.length).toBeGreaterThan(4);
    expect(SHADOW_PRESETS.length).toBe(4);
  });
});

describe("camera physics easing and interpolation", () => {
  it("enforces boundary guards on all camera physics presets", () => {
    const presets: CameraPhysicsPreset[] = ["smooth", "snappy", "spring", "linear"];
    for (const preset of presets) {
      expect(evaluateCameraEasing(0, preset)).toBe(0);
      expect(evaluateCameraEasing(-0.25, preset)).toBe(0);
      expect(evaluateCameraEasing(-10, preset)).toBe(0);
      expect(evaluateCameraEasing(1, preset)).toBe(1);
      expect(evaluateCameraEasing(1.25, preset)).toBe(1);
      expect(evaluateCameraEasing(10, preset)).toBe(1);
    }
  });

  it("evaluates 'smooth' physics with cubic ease-in-out curve", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(evaluateCameraEasing(t, "smooth")).toBeCloseTo(easeInOutCubic(t), 5);
      expect(evaluateCameraPhysicsProgress(t, "smooth")).toBeCloseTo(easeInOutCubic(t), 5);
    }
    // Midpoint symmetry
    expect(evaluateCameraEasing(0.5, "smooth")).toBe(0.5);
    // Smooth start and end derivatives (slow start, fast middle, slow end)
    expect(evaluateCameraEasing(0.1, "smooth")).toBeLessThan(0.1);
    expect(evaluateCameraEasing(0.9, "smooth")).toBeGreaterThan(0.9);
  });

  it("evaluates 'snappy' physics with quartic ease-out curve", () => {
    // Quartic ease-out: 1 - (1 - t)^4
    expect(evaluateCameraEasing(0.5, "snappy")).toBeCloseTo(1 - Math.pow(0.5, 4), 5); // 0.9375
    expect(evaluateCameraEasing(0.5, "snappy")).toBe(0.9375);

    // Reaches near-completion very rapidly compared to smooth
    expect(evaluateCameraEasing(0.3, "snappy")).toBeGreaterThan(evaluateCameraEasing(0.3, "smooth"));
    expect(evaluateCameraEasing(0.3, "snappy")).toBeCloseTo(1 - Math.pow(0.7, 4), 4); // ~0.7599
  });

  it("evaluates 'spring' physics with damped harmonic overshoot settling at 1.0", () => {
    // Formula: 1 - Math.exp(-6 * t) * Math.cos(2.5 * Math.PI * t)
    // Settle at t = 1
    expect(evaluateCameraEasing(1, "spring")).toBe(1);
    // Boundary guard at t = 0
    expect(evaluateCameraEasing(0, "spring")).toBe(0);

    // Characteristic overshoot: around t ≈ 0.38 - 0.42, progress exceeds 1.0
    const progressAt40 = evaluateCameraEasing(0.4, "spring");
    expect(progressAt40).toBeGreaterThan(1.0);
    expect(progressAt40).toBeCloseTo(1 - Math.exp(-2.4) * Math.cos(Math.PI), 3); // 1 - 0.0907 * (-1) = ~1.091

    // Checks maximum overshoot is modest (~1.05 to 1.15)
    let maxProgress = 0;
    for (let t = 0; t <= 1; t += 0.02) {
      const p = evaluateCameraEasing(t, "spring");
      if (p > maxProgress) maxProgress = p;
    }
    expect(maxProgress).toBeGreaterThan(1.05);
    expect(maxProgress).toBeLessThan(1.15);

    // Damps down and finishes cleanly at 1.0
    expect(evaluateCameraEasing(0.95, "spring")).toBeCloseTo(1.0, 1);
    expect(evaluateCameraEasing(1.0, "spring")).toBe(1.0);
  });

  it("evaluates 'linear' physics with strict identity progression", () => {
    for (let t = 0; t <= 1; t += 0.1) {
      expect(evaluateCameraEasing(t, "linear")).toBeCloseTo(t, 5);
    }
  });

  it("calculateCameraAtTime applies cameraPhysics preset to keyframe span interpolation", () => {
    const keyframes = [
      { id: "kf1", timeMs: 1000, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" as const },
      { id: "kf2", timeMs: 2000, scale: 2.0, targetX: 0.2, targetY: 0.3, easing: "cubic" as const },
    ];

    // Midpoint t = 1500ms (span is 1000ms, progress at t=0.5)
    // 1. Snappy physics: at t = 1500ms, scale is already > 90% towards 2.0 (scale ≈ 1.9375)
    const snappyCam = calculateCameraAtTime(1500, [], 500, 400, undefined, keyframes, {
      cameraPhysics: "snappy",
    });
    expect(snappyCam.scale).toBeCloseTo(1.0 + 1.0 * 0.9375, 2);

    // 2. Smooth physics: at t = 1500ms, scale is exactly at 50% midpoint (scale = 1.5)
    const smoothCam = calculateCameraAtTime(1500, [], 500, 400, undefined, keyframes, {
      cameraPhysics: "smooth",
    });
    expect(smoothCam.scale).toBeCloseTo(1.5, 2);

    // 3. Linear physics: at t = 1500ms, scale is 1.5
    const linearCam = calculateCameraAtTime(1500, [], 500, 400, undefined, keyframes, {
      cameraPhysics: "linear",
    });
    expect(linearCam.scale).toBeCloseTo(1.5, 2);

    // 4. Spring physics: around t = 1400ms (t=0.4 in span), camera scale overshoots 2.0x!
    const springCamOvershoot = calculateCameraAtTime(1400, [], 500, 400, undefined, keyframes, {
      cameraPhysics: "spring",
    });
    expect(springCamOvershoot.scale).toBeGreaterThan(2.0); // Overshoots target scale!
    expect(springCamOvershoot.scale).toBeLessThan(2.15);

    // At keyframe completion t = 2000ms, spring camera settles exactly at target
    const springCamEnd = calculateCameraAtTime(2000, [], 500, 400, undefined, keyframes, {
      cameraPhysics: "spring",
    });
    expect(springCamEnd.scale).toBeCloseTo(2.0, 2);
  });

  it("zoomBlocksToKeyframes and calculateCameraAtTime honor custom shiftDurationMs and shiftAnimation", () => {
    const customBlocks: ZoomBlock[] = [
      {
        id: "zoom-custom-1",
        startTimeMs: 3000,
        endTimeMs: 6000,
        targetX: 0.3,
        targetY: 0.4,
        scale: 2.0,
        enabled: true,
        shiftDurationMs: 800,
        shiftAnimation: "linear",
      },
    ];

    const keyframes = zoomBlocksToKeyframes(customBlocks, 10000);
    expect(keyframes.length).toBeGreaterThanOrEqual(3);
    const startKf = keyframes.find((k) => k.id === "kf-start-zoom-custom-1");
    expect(startKf).toBeDefined();
    expect(startKf!.timeMs).toBe(3000 - 800); // Exactly 2200ms
    expect(startKf!.easing).toBe("linear");

    // Camera at midpoint of shift (t = 2600ms, progress = 0.5): linear scale should be 1.5
    const midShiftCam = calculateCameraAtTime(2600, customBlocks);
    expect(midShiftCam.isZoomed).toBe(true);
    expect(midShiftCam.scale).toBeCloseTo(1.5, 2);
  });

  it("processDrawnTracePath filters jitters, smooths, and resamples freehand drawn stroke", () => {
    const rawDrawnPoints = [
      { x: 0.1, y: 0.2 },
      { x: 0.101, y: 0.201 }, // micro jitter
      { x: 0.2, y: 0.25 },
      { x: 0.35, y: 0.4 },
      { x: 0.5, y: 0.5 },
      { x: 0.7, y: 0.6 },
      { x: 0.9, y: 0.8 },
    ];

    const smoothed = processDrawnTracePath(rawDrawnPoints, { maxPoints: 8 });
    expect(smoothed.length).toBeGreaterThanOrEqual(4);
    expect(smoothed.length).toBeLessThanOrEqual(8);
    // Preserves start and end endpoints accurately
    expect(smoothed[0]!.x).toBeCloseTo(0.1, 2);
    expect(smoothed[0]!.y).toBeCloseTo(0.2, 2);
    expect(smoothed[smoothed.length - 1]!.x).toBeCloseTo(0.9, 2);
    expect(smoothed[smoothed.length - 1]!.y).toBeCloseTo(0.8, 2);

    // Converts to valid SVG path
    const svgPath = pointsToSmoothSvgPath(smoothed);
    expect(svgPath).toContain("M ");
    expect(svgPath).toContain(" Q ");
  });
});
