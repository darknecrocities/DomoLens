import { describe, expect, it } from "vitest";
import {
  BACKGROUND_CATEGORIES,
  BACKGROUND_PRESETS,
  CURSOR_PRESETS,
  VISIBLE_CURSOR_PRESETS,
  getBackgroundPresetsByCategory,
  getCursorPreset,
  isFrostedGlassBackground,
  isValidCursorStyle,
} from "./looks";
import type { CursorStyle, CursorAvatar } from "./project";

describe("presets & cursor catalog empirical stress validation", () => {
  describe("1. Background Presets catalog integrity", () => {
    it("contains exactly 32 background presets", () => {
      expect(BACKGROUND_PRESETS).toHaveLength(32);
    });

    it("has 10 unique aesthetic categories with matching presets", () => {
      expect(BACKGROUND_CATEGORIES).toHaveLength(10);
      for (const cat of BACKGROUND_CATEGORIES) {
        const matching = getBackgroundPresetsByCategory(cat.id);
        expect(matching.length).toBeGreaterThanOrEqual(1);
      }
    });

    it("every background preset has unique ID, non-empty name, and valid value", () => {
      const ids = new Set<string>();
      for (const p of BACKGROUND_PRESETS) {
        expect(ids.has(p.id)).toBe(false);
        ids.add(p.id);

        expect(typeof p.name).toBe("string");
        expect(p.name.trim().length).toBeGreaterThan(0);

        expect(p.type === "gradient" || p.type === "solid").toBe(true);
        expect(typeof p.value).toBe("string");
        expect(p.value.trim().length).toBeGreaterThan(0);

        if (p.type === "gradient") {
          expect(p.value.startsWith("linear-gradient") || p.value.startsWith("radial-gradient")).toBe(true);
        } else {
          expect(p.value.startsWith("#") || p.value.startsWith("rgb")).toBe(true);
        }
      }
    });

    it("correctly identifies frosted glass presets", () => {
      const frosted = BACKGROUND_PRESETS.filter((p) => p.category === "frosted-glass");
      expect(frosted.length).toBeGreaterThanOrEqual(3);
      for (const p of frosted) {
        expect(isFrostedGlassBackground(p.value)).toBe(true);
      }
      expect(isFrostedGlassBackground("#ffffff")).toBe(false);
      expect(isFrostedGlassBackground("")).toBe(false);
    });
  });

  describe("2. Cursor Presets catalog integrity & hotspot geometry", () => {
    it("contains exactly 24 cursor designs (23 visible + 'hidden')", () => {
      expect(CURSOR_PRESETS).toHaveLength(24);
      expect(VISIBLE_CURSOR_PRESETS).toHaveLength(23);
      expect(VISIBLE_CURSOR_PRESETS.some((c) => c.id === "hidden")).toBe(false);
    });

    it("every cursor preset has valid unique ID, category, name, and description", () => {
      const ids = new Set<string>();
      const expectedCategories = new Set([
        "system",
        "precision",
        "glow",
        "creative",
        "tech",
        "presentation",
        "utility",
      ]);

      for (const c of CURSOR_PRESETS) {
        expect(ids.has(c.id)).toBe(false);
        ids.add(c.id);

        expect(typeof c.name).toBe("string");
        expect(c.name.trim().length).toBeGreaterThan(0);

        expect(typeof c.description).toBe("string");
        expect(c.description.trim().length).toBeGreaterThan(0);

        expect(expectedCategories.has(c.category)).toBe(true);

        // Verify lookup and type-guards
        expect(isValidCursorStyle(c.id)).toBe(true);
        expect(getCursorPreset(c.id)).toEqual(c);
      }
    });

    it("every cursor preset defines a valid, non-negative finite [x, y] hotspot", () => {
      for (const c of CURSOR_PRESETS) {
        expect(Array.isArray(c.hotspot)).toBe(true);
        expect(c.hotspot).toHaveLength(2);
        const [x, y] = c.hotspot;
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        // Local cursor bounds should not exceed 32px
        expect(x).toBeLessThanOrEqual(32);
        expect(y).toBeLessThanOrEqual(32);
      }
    });

    it("rejects invalid cursor IDs cleanly without throwing", () => {
      expect(isValidCursorStyle("not-a-cursor-id")).toBe(false);
      expect(isValidCursorStyle("")).toBe(false);
      expect(getCursorPreset("not-a-cursor-id")).toBeUndefined();
    });
  });

  describe("3. Cursor Avatar configuration stress testing", () => {
    it("validates CursorAvatar data structures with text, initials, icon, and image types", () => {
      const avatars: CursorAvatar[] = [
        {
          enabled: true,
          type: "initials",
          value: "AK",
          color: "#ff7a1a",
          badgeLabel: "Arron",
        },
        {
          enabled: true,
          type: "text",
          value: "DEV",
          badgeLabel: "Engineer",
        },
        {
          enabled: true,
          type: "icon",
          value: "sparkles",
          color: "#4f46e5",
        },
        {
          enabled: false,
          type: "image",
          value: "https://example.com/avatar.png",
        },
      ];

      for (const av of avatars) {
        expect(typeof av.enabled).toBe("boolean");
        expect(["initials", "text", "icon", "image"]).toContain(av.type);
        expect(typeof av.value).toBe("string");
      }
    });
  });
});
