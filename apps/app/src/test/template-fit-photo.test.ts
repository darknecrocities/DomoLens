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
    expect(q.x).toBeCloseTo(0.5 + 0.25 * (16 / 9));
  });
});
