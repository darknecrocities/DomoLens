import { describe, expect, it } from "vitest";
import {
  BACKGROUND_PRESETS,
  BACKGROUND_CATEGORIES,
  getBackgroundPresetsByCategory,
  isFrostedGlassBackground,
  CURSOR_PRESETS,
  VISIBLE_CURSOR_PRESETS,
  getCursorPreset,
  isValidCursorStyle,
  SHADOW_PRESETS,
  type BackgroundCategory,
} from "./looks";

describe("BACKGROUND_PRESETS specification", () => {
  it("provides at least 24 background presets", () => {
    expect(BACKGROUND_PRESETS.length).toBeGreaterThanOrEqual(24);
  });

  it("covers all 10 aesthetic categories", () => {
    const requiredCategories: BackgroundCategory[] = [
      "linear-gradient",
      "radial-gradient",
      "single-tone",
      "two-tone",
      "three-tone",
      "frosted-glass",
      "monochrome",
      "warm-beige",
      "studio-white",
      "dark-obsidian",
    ];

    for (const cat of requiredCategories) {
      const presets = getBackgroundPresetsByCategory(cat);
      expect(presets.length, `Expected presets for category: ${cat}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("preserves all 8 legacy preset IDs for backward compatibility", () => {
    const legacyIds = [
      "charcoal-gradient",
      "orange-glow",
      "midnight",
      "sunset",
      "aurora",
      "solid-dark",
      "solid-charcoal",
      "solid-gray",
    ];

    for (const id of legacyIds) {
      const found = BACKGROUND_PRESETS.find((p) => p.id === id);
      expect(found, `Missing legacy preset: ${id}`).toBeDefined();
    }
  });

  it("assigns valid CSS values across all presets", () => {
    for (const preset of BACKGROUND_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.category).toBeTruthy();
      expect(preset.value).toBeTruthy();
      expect(["solid", "gradient", "mesh", "image"]).toContain(preset.type);
      if (preset.type === "solid") {
        expect(preset.value).toMatch(/^#[0-9a-fA-F]{3,8}$|^rgba?\(/);
      } else if (preset.type === "gradient") {
        expect(preset.value.startsWith("linear-gradient") || preset.value.startsWith("radial-gradient")).toBe(true);
      }
    }
  });

  it("provides human-readable labels for all 10 categories in BACKGROUND_CATEGORIES", () => {
    expect(BACKGROUND_CATEGORIES.length).toBe(10);
    for (const cat of BACKGROUND_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
    }
  });

  it("isFrostedGlassBackground accurately identifies translucent and glass presets", () => {
    expect(isFrostedGlassBackground("linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)")).toBe(true);
    expect(isFrostedGlassBackground("rgba(255, 255, 255, 0.2)")).toBe(true);
    expect(isFrostedGlassBackground("#0f1012")).toBe(false);
    expect(isFrostedGlassBackground("linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)")).toBe(false);
    expect(isFrostedGlassBackground("")).toBe(false);
  });
});

describe("CURSOR_PRESETS specification", () => {
  it("provides 24 total cursor presets (23 distinct designs + hidden)", () => {
    expect(CURSOR_PRESETS.length).toBe(24);
  });

  it("provides exactly 23 visible cursor presets in VISIBLE_CURSOR_PRESETS", () => {
    expect(VISIBLE_CURSOR_PRESETS.length).toBe(23);
    for (const preset of VISIBLE_CURSOR_PRESETS) {
      expect(preset.id).not.toBe("hidden");
    }
  });

  it("contains all 23 signature cursor designs required by specification", () => {
    const requiredDesignIds = [
      "default",
      "mac",
      "macos-classic",
      "dot",
      "sleek-dot",
      "laser-dot",
      "ring",
      "minimal-crosshair",
      "focus-reticle",
      "sonar-pulse",
      "obsidian-glow",
      "neon-laser",
      "spotlight-glow",
      "aurora-trail",
      "gradient-beam",
      "precision-pen",
      "highlighter",
      "tactile-pointer",
      "cyber-arrow",
      "terminal-caret",
      "retro-pixel",
      "glass-orb",
      "smooth-chubby",
    ];

    for (const designId of requiredDesignIds) {
      const found = getCursorPreset(designId);
      expect(found, `Expected cursor preset: ${designId}`).toBeDefined();
      expect(found?.name).toBeTruthy();
      expect(found?.category).toBeTruthy();
      expect(found?.description).toBeTruthy();
      expect(found?.hotspot).toBeDefined();
      expect(found?.hotspot.length).toBe(2);
    }
  });

  it("includes hotspot coordinates for precision alignment", () => {
    const centerCrosshair = getCursorPreset("minimal-crosshair");
    expect(centerCrosshair?.hotspot).toEqual([12, 12]);

    const defaultArrow = getCursorPreset("default");
    expect(defaultArrow?.hotspot).toEqual([0, 0]);

    const dot = getCursorPreset("dot");
    expect(dot?.hotspot).toEqual([6, 6]);
  });

  it("getCursorPreset retrieves preset metadata by ID", () => {
    const mac = getCursorPreset("mac");
    expect(mac?.name).toBe("macOS Arrow");
    expect(mac?.category).toBe("system");

    const unknown = getCursorPreset("non-existent-cursor");
    expect(unknown).toBeUndefined();
  });

  it("isValidCursorStyle checks style validity at runtime", () => {
    expect(isValidCursorStyle("obsidian-glow")).toBe(true);
    expect(isValidCursorStyle("hidden")).toBe(true);
    expect(isValidCursorStyle("mac")).toBe(true);
    expect(isValidCursorStyle("non-existent-cursor")).toBe(false);
    expect(isValidCursorStyle("")).toBe(false);
  });

  it("preserves SHADOW_PRESETS", () => {
    expect(SHADOW_PRESETS.length).toBe(4);
  });
});
