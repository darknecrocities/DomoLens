import { describe, expect, it } from "vitest";
import {
  DEFAULT_CURSOR_AVATAR,
  DEFAULT_LOOKS,
  TEXT_CARD_STYLES,
  TEXT_CARD_STYLE_DEFINITIONS,
  TEXT_MOTION_PRESETS,
  type CursorAvatar,
  type CursorStyle,
  type TextCardStyle,
  type TextMotionPreset,
  type TextOverlay,
} from "./project";

describe("project schema and models", () => {
  describe("CursorAvatar schema & defaults", () => {
    it("defines DEFAULT_CURSOR_AVATAR with safe disabled state", () => {
      expect(DEFAULT_CURSOR_AVATAR.enabled).toBe(false);
      expect(DEFAULT_CURSOR_AVATAR.type).toBe("initials");
      expect(DEFAULT_CURSOR_AVATAR.value).toBe("DL");
      expect(DEFAULT_CURSOR_AVATAR.color).toBe("#6366f1");
    });

    it("supports custom initials, icons, images, and text badges", () => {
      const initialsAvatar: CursorAvatar = {
        enabled: true,
        type: "initials",
        value: "AK",
        color: "#10b981",
        badgeLabel: "Host",
      };
      expect(initialsAvatar.enabled).toBe(true);
      expect(initialsAvatar.type).toBe("initials");

      const iconAvatar: CursorAvatar = {
        enabled: true,
        type: "icon",
        value: "sparkles",
        color: "#f59e0b",
      };
      expect(iconAvatar.type).toBe("icon");

      const imageAvatar: CursorAvatar = {
        enabled: true,
        type: "image",
        value: "https://example.com/avatar.png",
      };
      expect(imageAvatar.type).toBe("image");
    });

    it("attaches cursorAvatar to DEFAULT_LOOKS", () => {
      expect(DEFAULT_LOOKS.cursorAvatar).toEqual(DEFAULT_CURSOR_AVATAR);
      expect(DEFAULT_LOOKS.cursorStyle).toBe("hidden");
      expect(DEFAULT_LOOKS.showCursor).toBe(false);
    });
  });

  describe("TextMotionPreset definitions", () => {
    it("provides 6 motion presets in TEXT_MOTION_PRESETS", () => {
      const expected: TextMotionPreset[] = [
        "none",
        "elastic-pop",
        "fluid-slide",
        "whip-slide",
        "blur-reveal",
        "smooth-fade",
      ];
      expect(TEXT_MOTION_PRESETS).toEqual(expected);
    });

    it("allows TextOverlay to specify motionPreset and timing overrides", () => {
      const overlay: TextOverlay = {
        id: "txt-1",
        text: "Launch Announcement",
        startTimeMs: 1000,
        durationMs: 4000,
        x: 0.5,
        y: 0.15,
        fontSize: 32,
        color: "#ffffff",
        motionPreset: "elastic-pop",
        cardStyle: "glass",
        entranceDurationMs: 500,
        exitDurationMs: 300,
      };

      expect(overlay.motionPreset).toBe("elastic-pop");
      expect(overlay.cardStyle).toBe("glass");
      expect(overlay.entranceDurationMs).toBe(500);
      expect(overlay.exitDurationMs).toBe(300);
    });
  });

  describe("TextCardStyle definitions", () => {
    it("provides 5 modern card styles in TEXT_CARD_STYLES", () => {
      const expected: TextCardStyle[] = [
        "glass",
        "gradient",
        "solid",
        "minimal",
        "terminal",
      ];
      expect(TEXT_CARD_STYLES).toEqual(expected);
    });

    it("provides complete design tokens in TEXT_CARD_STYLE_DEFINITIONS for each style", () => {
      for (const style of TEXT_CARD_STYLES) {
        const def = TEXT_CARD_STYLE_DEFINITIONS[style];
        expect(def, `Missing definition for ${style}`).toBeDefined();
        expect(def.id).toBe(style);
        expect(def.name).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(def.defaultBgColor).toBeTruthy();
        expect(def.defaultColor).toBeTruthy();
        expect(def.borderStyle).toBeDefined();
        expect(def.backdropBlurPx).toBeGreaterThanOrEqual(0);
        expect(def.boxShadow).toBeDefined();
      }

      // Check specific characteristics
      expect(TEXT_CARD_STYLE_DEFINITIONS.glass.backdropBlurPx).toBe(12);
      expect(TEXT_CARD_STYLE_DEFINITIONS.terminal.fontFamily).toContain("monospace");
      expect(TEXT_CARD_STYLE_DEFINITIONS.minimal.defaultBgColor).toBe("transparent");
    });
  });
});
