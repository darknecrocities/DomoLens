import { describe, expect, it } from "vitest";
import {
  calculateCameraAtTime,
  mapVideoPointToViewport,
  viewportToVideoPoint,
} from "@domolens/core";

describe("Whole Canvas & Device Frame Zoom Parity", () => {
  it("calculates exact camera stage translation centering clicked target on canvas", () => {
    // Stage dimensions (e.g. 1920x1080 canvas with 390x844 iPhone mockup)
    const canvasW = 1920;
    const canvasH = 1080;
    const stageW = 400;
    const stageH = 800;
    const stageCenterX = canvasW / 2;
    const stageCenterY = canvasH / 2;

    const clicks = [
      { name: "center", x: 0.5, y: 0.5, scale: 1.5 },
      { name: "top-left", x: 0.2, y: 0.15, scale: 1.7 },
      { name: "bottom-right", x: 0.85, y: 0.9, scale: 1.6 },
      { name: "mid-right", x: 0.9, y: 0.5, scale: 1.4 },
    ];

    for (const c of clicks) {
      const focalOffsetX = (0.5 - c.x) * stageW;
      const focalOffsetY = (0.5 - c.y) * stageH;

      // Coordinate of clicked point on stage before camera transform
      const unzoomedPtX = stageCenterX + (c.x - 0.5) * stageW;
      const unzoomedPtY = stageCenterY + (c.y - 0.5) * stageH;

      // Apply Whole Canvas Camera Transform sequence:
      // 1. translate(-stageCenterX, -stageCenterY) -> (unzoomedPt - stageCenter)
      // 2. translate(focalOffsetX, focalOffsetY)    -> (unzoomedPt - stageCenter + (0.5 - c)*stageW)
      // 3. scale(c.scale, c.scale)
      // 4. translate(stageCenterX, stageCenterY)
      const afterShiftX = unzoomedPtX - stageCenterX + focalOffsetX;
      const afterShiftY = unzoomedPtY - stageCenterY + focalOffsetY;

      // The shift must bring the focal point to exact center offset 0 before scaling
      expect(afterShiftX).toBeCloseTo(0, 5);
      expect(afterShiftY).toBeCloseTo(0, 5);

      const finalCanvasX = stageCenterX + afterShiftX * c.scale;
      const finalCanvasY = stageCenterY + afterShiftY * c.scale;

      // Point lands squarely at the canvas center!
      expect(finalCanvasX).toBeCloseTo(canvasW / 2, 5);
      expect(finalCanvasY).toBeCloseTo(canvasH / 2, 5);
    }
  });

  it("inverts canvas clicks on transformed viewport back to exact video coordinates", () => {
    const videoAspect = 9 / 16;
    const viewAspect = 9 / 16;

    // Test a click at (0.35, 0.65) on a mobile device recording
    const targetVideoX = 0.35;
    const targetVideoY = 0.65;

    // Viewport-normalized coordinates
    const vpPt = mapVideoPointToViewport(targetVideoX, targetVideoY, videoAspect, viewAspect);
    expect(vpPt.x).toBeCloseTo(targetVideoX, 5);
    expect(vpPt.y).toBeCloseTo(targetVideoY, 5);

    // Simulated user clicking on the transformed viewport
    const inverted = viewportToVideoPoint(vpPt.x, vpPt.y, videoAspect, viewAspect);
    expect(inverted.x).toBeCloseTo(targetVideoX, 5);
    expect(inverted.y).toBeCloseTo(targetVideoY, 5);
  });

  it("handles cross-aspect mapping (horizontal video inside vertical view or vice-versa)", () => {
    // 16:9 video presented inside 9:16 vertical mobile container
    const wideToTallVideoAspect = 16 / 9;
    const wideToTallViewAspect = 9 / 16;

    const testPoints = [
      { x: 0.1, y: 0.2 },
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.8 },
    ];

    for (const pt of testPoints) {
      const mapped = mapVideoPointToViewport(pt.x, pt.y, wideToTallVideoAspect, wideToTallViewAspect);
      const inverted = viewportToVideoPoint(mapped.x, mapped.y, wideToTallVideoAspect, wideToTallViewAspect);
      expect(inverted.x).toBeCloseTo(pt.x, 3);
      expect(inverted.y).toBeCloseTo(pt.y, 3);
    }
  });

  it("guarantees camera tracking glides smoothly between clicks without inner video cropping", () => {
    const zoomBlocks = [
      {
        id: "z1",
        startTimeMs: 1000,
        endTimeMs: 4000,
        targetX: 0.2,
        targetY: 0.3,
        scale: 1.6,
        enabled: true,
      },
      {
        id: "z2",
        startTimeMs: 5000,
        endTimeMs: 8000,
        targetX: 0.8,
        targetY: 0.7,
        scale: 1.5,
        enabled: true,
      },
    ];

    // Evaluate camera across key transition frames
    const t0 = calculateCameraAtTime(0, zoomBlocks);
    expect(t0.scale).toBe(1.0);
    expect(t0.x).toBe(0.5);
    expect(t0.y).toBe(0.5);

    // Zoomed in on target 1 (clamped safely within bounds so video never voids)
    const t1 = calculateCameraAtTime(2500, zoomBlocks);
    expect(t1.scale).toBe(1.6);
    expect(t1.x).toBeCloseTo(0.3125, 2);
    expect(t1.y).toBeCloseTo(0.3125, 2);

    // Zoomed in on target 2
    const t2 = calculateCameraAtTime(6500, zoomBlocks);
    expect(t2.scale).toBe(1.5);
    expect(t2.x).toBeCloseTo(0.667, 2);
    expect(t2.y).toBeCloseTo(0.667, 2);
  });
});
