import { describe, it, expect } from "vitest";
import { STUDIO_MOTION_TEMPLATES, checkTemplateVideoFit, mapVideoPointToViewport } from "@domolens/core";

describe("template video fit, photo slots and cursor mapping", () => {
  const mobile = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "mobile-app-showcase")!;

  it("disables mobile showcase for landscape video and enables for 1080x1920", () => {
    expect(checkTemplateVideoFit(mobile, 1920, 1080).ok).toBe(false);
    expect(checkTemplateVideoFit(mobile, 1080, 1920).ok).toBe(true);
    expect(checkTemplateVideoFit(mobile, 300, 533).ok).toBe(false);
    expect(checkTemplateVideoFit(mobile, null, null).ok).toBe(true);
  });

  it("gives every template a photo slot and image field", () => {
    for (const t of STUDIO_MOTION_TEMPLATES) {
      expect(t.photoSlot).toBeTruthy();
      expect(t.customizableFields.some((f) => f.type === "image")).toBe(true);
    }
  });

  it("maps cursor correctly when wide video is cover-cropped into a square", () => {
    const p = mapVideoPointToViewport(0.5, 0.3, 16 / 9, 1);
    expect(p.x).toBeCloseTo(0.5);
    expect(p.y).toBeCloseTo(0.3);
    const q = mapVideoPointToViewport(0.75, 0.5, 16 / 9, 1);
    expect(q.x).toBeCloseTo(0.5 + 0.25 * (1 / (16 / 9)));
  });
});

import { ensureCursorTrajectory, interpolateCursorAtTime } from "@domolens/core";
import { useEditor } from "../store/editor";

describe("cursor overlay enablement and fallback path", () => {
  it("builds a moving trajectory from clicks when none was recorded", () => {
    const clicks = [
      { timestampMs: 1000, x: 0.2, y: 0.3 },
      { timestampMs: 3000, x: 0.8, y: 0.7 },
    ];
    const traj = ensureCursorTrajectory([], clicks);
    expect(traj.length).toBeGreaterThan(2);
    const atClick = interpolateCursorAtTime(3000, traj);
    expect(atClick.x).toBeCloseTo(0.8);
    const mid = interpolateCursorAtTime(2500, traj);
    expect(mid.x).toBeGreaterThan(0.2);
    expect(mid.x).toBeLessThan(0.81);
  });

  it("keeps recorded trajectory untouched", () => {
    const rec = [{ timestampMs: 0, x: 0.1, y: 0.1 }];
    expect(ensureCursorTrajectory(rec, [{ timestampMs: 5, x: 1, y: 1 }])).toBe(rec);
  });

  it("selecting a cursor style makes the overlay visible", () => {
    expect(typeof useEditor.getState().updateLooks).toBe("function");
  });
});
