import { describe, expect, it } from "vitest";
import {
  calculateActiveEffectsState,
  getActiveVideoEffects,
  insertKeyframe,
  insertVideoEffect,
  removeClipAndRipple,
  removeKeyframe,
  removeVideoEffect,
  splitClip,
  splitZoomBlock,
  updateKeyframeNode,
  updateVideoEffect,
} from "./timeline";
import type { KeyframeNode, TimelineClip, VideoEffect, ZoomBlock } from "./project";

describe("timeline keyframe and effect operations", () => {
  it("inserts and sorts keyframes without duplicates", () => {
    const kfs: KeyframeNode[] = [
      { id: "kf-1", timeMs: 1000, scale: 1.5, targetX: 0.5, targetY: 0.5, easing: "cubic" },
      { id: "kf-2", timeMs: 4000, scale: 2.0, targetX: 0.6, targetY: 0.6, easing: "cubic" },
    ];

    const newKf: KeyframeNode = {
      id: "kf-3",
      timeMs: 2500,
      scale: 1.8,
      targetX: 0.4,
      targetY: 0.4,
      easing: "spring",
      effect: "spotlight",
    };

    const result = insertKeyframe(kfs, newKf);
    expect(result).toHaveLength(3);
    expect(result[1]!.id).toBe("kf-3");
    expect(result[1]!.timeMs).toBe(2500);
    expect(result[1]!.effect).toBe("spotlight");
  });

  it("removes and updates keyframes cleanly", () => {
    const kfs: KeyframeNode[] = [
      { id: "kf-1", timeMs: 1000, scale: 1.5, targetX: 0.5, targetY: 0.5, easing: "cubic" },
      { id: "kf-2", timeMs: 3000, scale: 2.0, targetX: 0.6, targetY: 0.6, easing: "cubic" },
    ];

    const afterDelete = removeKeyframe(kfs, "kf-1");
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0]!.id).toBe("kf-2");

    const afterUpdate = updateKeyframeNode(afterDelete, "kf-2", { scale: 2.5, effect: "blur" });
    expect(afterUpdate[0]!.scale).toBe(2.5);
    expect(afterUpdate[0]!.effect).toBe("blur");
  });

  it("inserts, updates, and removes video effects", () => {
    const effects: VideoEffect[] = [
      {
        id: "eff-1",
        name: "Spotlight Focus",
        type: "spotlight",
        startTimeMs: 1000,
        durationMs: 2000,
        intensity: 0.8,
        enabled: true,
      },
    ];

    const newEffect: VideoEffect = {
      id: "eff-2",
      name: "Cinematic Vignette",
      type: "vignette",
      startTimeMs: 500,
      durationMs: 3000,
      intensity: 0.6,
      enabled: true,
    };

    const inserted = insertVideoEffect(effects, newEffect);
    expect(inserted).toHaveLength(2);
    expect(inserted[0]!.id).toBe("eff-2"); // sorted by startTimeMs

    const activeAt1500 = getActiveVideoEffects(inserted, 1500);
    expect(activeAt1500).toHaveLength(2);

    const activeAt3200 = getActiveVideoEffects(inserted, 3200);
    expect(activeAt3200).toHaveLength(1);
    expect(activeAt3200[0]!.id).toBe("eff-2");

    const updated = updateVideoEffect(inserted, "eff-1", { intensity: 0.95 });
    expect(updated.find((e) => e.id === "eff-1")?.intensity).toBe(0.95);

    const removed = removeVideoEffect(updated, "eff-1");
    expect(removed).toHaveLength(1);
    expect(removed[0]!.id).toBe("eff-2");
  });

  it("computes active effects styles and parameters accurately", () => {
    const effects: VideoEffect[] = [
      {
        id: "eff-spot",
        name: "Spotlight",
        type: "spotlight",
        startTimeMs: 1000,
        durationMs: 2000,
        intensity: 0.75,
        targetX: 0.35,
        targetY: 0.45,
        enabled: true,
      },
      {
        id: "eff-vig",
        name: "Vignette",
        type: "vignette",
        startTimeMs: 500,
        durationMs: 3000,
        intensity: 0.65,
        enabled: true,
      },
      {
        id: "eff-filter",
        name: "Noir",
        type: "filter",
        preset: "noir",
        startTimeMs: 1200,
        durationMs: 1000,
        intensity: 0.8,
        enabled: true,
      },
    ];

    const state = calculateActiveEffectsState(effects, 1500);
    expect(state.spotlight).not.toBeNull();
    expect(state.spotlight?.active).toBe(true);
    expect(state.spotlight?.x).toBe(0.35);
    expect(state.vignette).toBe(0.65);
    expect(state.filterStyle).toContain("grayscale");
  });

  it("activates keyframe-attached effect within proximity envelope", () => {
    const keyframes: KeyframeNode[] = [
      {
        id: "kf-effect",
        timeMs: 2000,
        scale: 2.0,
        targetX: 0.6,
        targetY: 0.4,
        easing: "cubic",
        effect: "spotlight",
        effectIntensity: 0.9,
      },
    ];

    // At 2000ms exact match
    const stateAt2000 = calculateActiveEffectsState([], 2000, keyframes);
    expect(stateAt2000.spotlight).not.toBeNull();
    expect(stateAt2000.spotlight?.x).toBe(0.6);
    expect(stateAt2000.spotlight?.intensity).toBeCloseTo(0.9, 1);

    // At 2800ms outside 350ms window
    const stateAt2800 = calculateActiveEffectsState([], 2800, keyframes);
    expect(stateAt2800.spotlight).toBeNull();
  });

  it("splits clips and ripples timeline correctly", () => {
    const clip: TimelineClip = {
      id: "clip-1",
      name: "Screen",
      mediaUrl: "video.mp4",
      timelineStartMs: 0,
      durationMs: 10000,
      sourceOffsetMs: 0,
      muted: false,
      volume: 1,
    };

    const split = splitClip(clip, 4000);
    expect(split).not.toBeNull();
    expect(split![0].durationMs).toBe(4000);
    expect(split![1].timelineStartMs).toBe(4000);
    expect(split![1].durationMs).toBe(6000);

    const rippled = removeClipAndRipple([split![0], split![1]], split![0].id);
    expect(rippled).toHaveLength(1);
    expect(rippled[0]!.timelineStartMs).toBe(0);
  });

  it("splits zoom block correctly", () => {
    const block: ZoomBlock = {
      id: "zb-1",
      startTimeMs: 1000,
      endTimeMs: 5000,
      targetX: 0.5,
      targetY: 0.5,
      scale: 1.8,
      enabled: true,
    };

    const result = splitZoomBlock(block, 3000);
    expect(result).not.toBeNull();
    expect(result![0].endTimeMs).toBe(3000);
    expect(result![1].startTimeMs).toBe(3000);
  });
});
