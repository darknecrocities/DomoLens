import { describe, expect, it } from "vitest";
import {
  STUDIO_MOTION_TEMPLATES,
  TYPING_SOUND_PROFILES,
  type MotionTemplate,
} from "./index";

describe("Studio Motion Templates & Expanded Audio Engine", () => {
  it("defines at least 10 high-craft motion video templates", () => {
    expect(STUDIO_MOTION_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("each template provides complete metadata, valid aspect ratios, and customizable fields", () => {
    const validAspects = ["16:9", "9:16", "1:1", "4:3"];

    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.tagline).toBeTruthy();
      expect(tpl.category).toBeTruthy();
      expect(validAspects).toContain(tpl.aspectRatio);
      expect(tpl.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(tpl.badge).toBeTruthy();

      // Looks styling
      expect(tpl.looks).toBeDefined();
      expect(tpl.looks.backgroundType).toBeDefined();
      expect(tpl.looks.backgroundValue).toBeDefined();
      expect(tpl.looks.borderRadius).toBeGreaterThan(0);

      // Audio settings
      expect(tpl.audioSettings).toBeDefined();
      expect(tpl.audioSettings.typingSoundPreset).toBeDefined();

      // Customizable fields
      expect(tpl.customizableFields.length).toBeGreaterThanOrEqual(2);
      for (const field of tpl.customizableFields) {
        expect(field.id).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(field.defaultValue).toBeTruthy();
      }

      // Default text overlays
      expect(tpl.defaultTextOverlays.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("expanded mechanical keyboard sound profiles include thock, creamy, thack, clicky, and thick", () => {
    const requiredPresets = ["thock", "creamy", "thack", "clicky", "thick", "mechanical", "laptop", "typewriter"] as const;

    for (const preset of requiredPresets) {
      const profile = TYPING_SOUND_PROFILES[preset];
      expect(profile).toBeDefined();
      expect(profile.name).toBeTruthy();
      expect(profile.thockFreq).toBeGreaterThan(50);
      expect(profile.noiseCutoff).toBeGreaterThan(500);
      expect(profile.durationSec).toBeGreaterThan(0.01);
      expect(profile.resonanceFilter).toBeDefined();
      expect(profile.resonanceCutoff).toBeGreaterThan(100);
    }

    // Deep Thock: heavy lowpass POM profile
    expect(TYPING_SOUND_PROFILES.thock.resonanceFilter).toBe("lowpass");
    expect(TYPING_SOUND_PROFILES.thock.thockFreq).toBeLessThan(200);

    // Creamy: dual-harmonic PE foam profile
    expect(TYPING_SOUND_PROFILES.creamy.harmonicMultiplier).toBe(2.0);

    // Tactile Clicky: click-leaf snap enabled
    expect(TYPING_SOUND_PROFILES.clicky.clickLeafSnap).toBe(true);

    // Thick: sub-bass muted profile
    expect(TYPING_SOUND_PROFILES.thick.thockFreq).toBeLessThanOrEqual(150);
  });
});
