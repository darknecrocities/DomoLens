import { describe, expect, it } from "vitest";
import {
  STUDIO_MOTION_TEMPLATES,
  TYPING_SOUND_PROFILES,
  generateTemplateKeyframes,
  templatePhysicsToEasing,
  type KeyframeNode,
} from "./index";

/**
 * Recursively traverses any data structure to detect properties whose keys match "badge" (case-insensitive).
 * Returns an array of formatted property path strings where matches were found.
 */
function findBadgeProperties(obj: unknown, path = "template"): string[] {
  const matches: string[] = [];
  if (!obj || typeof obj !== "object") return matches;

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      matches.push(...findBadgeProperties(obj[i], `${path}[${i}]`));
    }
  } else {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = `${path}.${key}`;
      if (key.toLowerCase().includes("badge")) {
        matches.push(currentPath);
      }
      matches.push(...findBadgeProperties(value, currentPath));
    }
  }

  return matches;
}

describe("Studio Motion Templates & Expanded Audio Engine", () => {
  it("defines at least 10 high-craft motion video templates", () => {
    expect(STUDIO_MOTION_TEMPLATES.length).toBeGreaterThanOrEqual(10);
  });

  it("each template provides complete metadata, valid aspect ratios, and customizable fields (zero badges)", () => {
    const validAspects = ["16:9", "9:16", "1:1", "4:3"];

    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.tagline).toBeTruthy();
      expect(tpl.category).toBeTruthy();
      expect(validAspects).toContain(tpl.aspectRatio);
      expect(tpl.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);

      // Verify total absence of pill badge properties on MotionTemplate and motionSignature
      expect((tpl as any).badge).toBeUndefined();
      expect((tpl as any).badgeStyle).toBeUndefined();
      expect("badge" in tpl).toBe(false);
      expect("badgeStyle" in tpl).toBe(false);
      expect((tpl.motionSignature as any)?.badge).toBeUndefined();
      expect("badge" in (tpl.motionSignature ?? {})).toBe(false);

      // Motion choreography & layout
      expect(tpl.visualAccent).toBeDefined();
      expect(tpl.multiDeviceLayout).toBeDefined();

      // Looks styling
      expect(tpl.looks).toBeDefined();
      expect(tpl.looks.backgroundType).toBeDefined();
      expect(tpl.looks.backgroundValue).toBeDefined();
      expect(tpl.looks.borderRadius).toBeGreaterThan(0);

      // Audio settings
      expect(tpl.audioSettings).toBeDefined();
      expect(tpl.audioSettings.typingSoundPreset).toBeDefined();

      // Customizable fields (must NOT contain badge fields or badge types)
      expect(tpl.customizableFields.length).toBeGreaterThanOrEqual(2);
      for (const field of tpl.customizableFields) {
        expect(field.id).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(field.defaultValue).toBeTruthy();
        expect(field.id).not.toBe("badge");
        expect(field.type).not.toBe("badge");
        expect(["text", "color"]).toContain(field.type);
      }

      // Default text overlays (pure kinetic typography without badges)
      expect(tpl.defaultTextOverlays.length).toBeGreaterThanOrEqual(1);
      for (const overlay of tpl.defaultTextOverlays) {
        expect((overlay as any).badge).toBeUndefined();
        expect((overlay as any).badgeStyle).toBeUndefined();
      }
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

  it("enhances all 10 templates with visualAccent, multiDeviceLayout, typography, transitionTiming, and cameraPhysics without badges", () => {
    const validPhysics = ["smooth", "snappy", "spring", "linear"];
    const validVisualAccents = [
      "specular-sweep",
      "glass-sheen",
      "crt-scanlines",
      "laser-radar-sweep",
      "tactile-shockwave",
      "particle-burst",
      "ambient-pulse",
      "curved-cursor-glide",
      "kinetic-soundwave",
    ];
    const validMultiDeviceLayouts = [
      "single",
      "dual-cascade",
      "triple-deck",
      "isometric-stack",
    ];
    const validCameraTransitions = [
      "snap-zoom",
      "whip-pan",
      "speed-ramp",
      "perspective-cascade",
      "ken-burns",
      "kinetic-punch",
    ];

    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      // Total eradication of pill badge properties
      expect((tpl as any).badge).toBeUndefined();
      expect((tpl as any).badgeStyle).toBeUndefined();
      expect("badge" in tpl).toBe(false);
      expect("badgeStyle" in tpl).toBe(false);
      expect((tpl.motionSignature as any)?.badge).toBeUndefined();
      expect("badge" in (tpl.motionSignature ?? {})).toBe(false);

      // Kinetic visual accents (replaces static pill badges)
      expect(tpl.visualAccent).toBeDefined();
      expect(validVisualAccents).toContain(tpl.visualAccent);

      // Multi-device perspective layout
      expect(tpl.multiDeviceLayout).toBeDefined();
      expect(validMultiDeviceLayouts).toContain(tpl.multiDeviceLayout);

      // Typography
      expect(tpl.typography).toBeDefined();
      expect(tpl.typography?.fontFamily).toBeTruthy();
      expect(tpl.typography?.letterSpacing).toBeDefined();

      // Transition timing & high-impact transition styles
      expect(tpl.transitionTiming).toBeDefined();
      expect(tpl.transitionTiming?.cameraLeadInMs).toBeGreaterThan(0);
      expect(tpl.transitionTiming?.entranceDurationMs).toBeGreaterThan(0);
      expect(tpl.transitionTiming?.transitionStyle).toBeDefined();
      expect(validCameraTransitions).toContain(tpl.transitionTiming?.transitionStyle);

      // Camera physics
      expect(tpl.cameraPhysics).toBeDefined();
      expect(validPhysics).toContain(tpl.cameraPhysics);
      expect(tpl.looks.cameraPhysics).toBe(tpl.cameraPhysics);

      // Default text overlays: clean badgeless overlays
      expect(tpl.defaultTextOverlays[0]?.typography).toBeDefined();
      expect((tpl.defaultTextOverlays[0] as any)?.badge).toBeUndefined();
      expect((tpl.defaultTextOverlays[0] as any)?.badgeStyle).toBeUndefined();
    }
  });

  it("implements the SaaS Launch core identity (saas-launch-hero) with specular sweep and dual-cascade 3D layout", () => {
    const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "saas-launch-hero");
    expect(tpl).toBeDefined();
    expect(tpl?.aspectRatio).toBe("16:9");
    expect(tpl?.cameraPhysics).toBe("spring");
    expect(tpl?.looks.cameraPhysics).toBe("spring");
    expect((tpl as any)?.badge).toBeUndefined();
    expect((tpl as any)?.badgeStyle).toBeUndefined();
    expect((tpl?.motionSignature as any)?.badge).toBeUndefined();
    expect("badge" in (tpl?.motionSignature ?? {})).toBe(false);
    expect(tpl?.visualAccent).toBe("specular-sweep");
    expect(tpl?.multiDeviceLayout).toBe("dual-cascade");
    expect(tpl?.transitionTiming?.transitionStyle).toBe("perspective-cascade");
    expect(tpl?.typography?.fontFamily).toContain("Plus Jakarta Sans");
    expect(tpl?.typography?.fontWeight).toBe("800");
    expect(tpl?.transitionTiming?.cameraLeadInMs).toBe(280);
    expect(tpl?.transitionTiming?.entranceDurationMs).toBe(450);
    expect(tpl?.audioSettings.clickSoundPreset).toBe("bop");
    expect(tpl?.audioSettings.typingSoundPreset).toBe("creamy");
    expect((tpl?.defaultTextOverlays[0] as any)?.badge).toBeUndefined();
    expect((tpl?.defaultTextOverlays[0] as any)?.badgeStyle).toBeUndefined();
  });

  it("implements the Social Reel core identity (viral-short-tiktok) with whip-pan transition and triple-deck layout", () => {
    const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "viral-short-tiktok");
    expect(tpl).toBeDefined();
    expect(tpl?.aspectRatio).toBe("9:16");
    expect(tpl?.cameraPhysics).toBe("snappy");
    expect(tpl?.looks.cameraPhysics).toBe("snappy");
    expect((tpl as any)?.badge).toBeUndefined();
    expect((tpl as any)?.badgeStyle).toBeUndefined();
    expect((tpl?.motionSignature as any)?.badge).toBeUndefined();
    expect("badge" in (tpl?.motionSignature ?? {})).toBe(false);
    expect(tpl?.visualAccent).toBe("kinetic-soundwave");
    expect(tpl?.multiDeviceLayout).toBe("triple-deck");
    expect(tpl?.transitionTiming?.transitionStyle).toBe("whip-pan");
    expect(tpl?.typography?.fontFamily).toContain("Inter");
    expect(tpl?.typography?.fontWeight).toBe("900");
    expect(tpl?.transitionTiming?.cameraLeadInMs).toBe(150);
    expect(tpl?.transitionTiming?.entranceDurationMs).toBe(350);
    expect(tpl?.audioSettings.clickSoundPreset).toBe("bop");
    expect(tpl?.audioSettings.typingSoundPreset).toBe("creamy");
    expect((tpl?.defaultTextOverlays[0] as any)?.badge).toBeUndefined();
    expect((tpl?.defaultTextOverlays[0] as any)?.badgeStyle).toBeUndefined();
  });

  it("implements the Kinetic Developer core identity (developer-cli) with CRT scanlines and snap-zoom transition", () => {
    const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "developer-cli");
    expect(tpl).toBeDefined();
    expect(tpl?.aspectRatio).toBe("16:9");
    expect(tpl?.cameraPhysics).toBe("snappy");
    expect(tpl?.looks.cameraPhysics).toBe("snappy");
    expect((tpl as any)?.badge).toBeUndefined();
    expect((tpl as any)?.badgeStyle).toBeUndefined();
    expect((tpl?.motionSignature as any)?.badge).toBeUndefined();
    expect("badge" in (tpl?.motionSignature ?? {})).toBe(false);
    expect(tpl?.visualAccent).toBe("crt-scanlines");
    expect(tpl?.multiDeviceLayout).toBe("single");
    expect(tpl?.transitionTiming?.transitionStyle).toBe("snap-zoom");
    expect(tpl?.typography?.fontFamily).toContain("JetBrains Mono");
    expect(tpl?.typography?.fontWeight).toBe("700");
    expect(tpl?.transitionTiming?.cameraLeadInMs).toBe(200);
    expect(tpl?.transitionTiming?.entranceDurationMs).toBe(400);
    expect(tpl?.audioSettings.clickSoundPreset).toBe("tap");
    expect(tpl?.audioSettings.typingSoundPreset).toBe("thock");
    expect((tpl?.defaultTextOverlays[0] as any)?.badge).toBeUndefined();
    expect((tpl?.defaultTextOverlays[0] as any)?.badgeStyle).toBeUndefined();
  });

  it("implements the Keynote Spotlight core identity (apple-keynote-polish) with glass-sheen accent and Ken Burns push", () => {
    const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "apple-keynote-polish");
    expect(tpl).toBeDefined();
    expect(tpl?.aspectRatio).toBe("16:9");
    expect(tpl?.cameraPhysics).toBe("smooth");
    expect(tpl?.looks.cameraPhysics).toBe("smooth");
    expect((tpl as any)?.badge).toBeUndefined();
    expect((tpl as any)?.badgeStyle).toBeUndefined();
    expect((tpl?.motionSignature as any)?.badge).toBeUndefined();
    expect("badge" in (tpl?.motionSignature ?? {})).toBe(false);
    expect(tpl?.visualAccent).toBe("glass-sheen");
    expect(tpl?.multiDeviceLayout).toBe("single");
    expect(tpl?.transitionTiming?.transitionStyle).toBe("ken-burns");
    expect(tpl?.typography?.fontFamily).toContain("-apple-system");
    expect(tpl?.typography?.fontWeight).toBe("600");
    expect(tpl?.transitionTiming?.cameraLeadInMs).toBe(300);
    expect(tpl?.transitionTiming?.entranceDurationMs).toBe(500);
    expect(tpl?.audioSettings.clickSoundPreset).toBe("click");
    expect(tpl?.audioSettings.typingSoundPreset).toBe("laptop");
    expect((tpl?.defaultTextOverlays[0] as any)?.badge).toBeUndefined();
    expect((tpl?.defaultTextOverlays[0] as any)?.badgeStyle).toBeUndefined();
  });

  it("equips every studio template with a unique motionSignature choreography profile", () => {
    const signatureTypes = new Set<string>();

    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      expect(tpl.motionSignature).toBeDefined();
      expect(tpl.motionSignature?.type).toBeTruthy();
      expect(tpl.motionSignature?.label).toBeTruthy();
      expect(tpl.motionSignature?.description).toBeTruthy();
      // Ensure motionSignature has zero badge property across all 10 templates
      expect((tpl.motionSignature as any)?.badge).toBeUndefined();
      expect("badge" in (tpl.motionSignature ?? {})).toBe(false);
      signatureTypes.add(tpl.motionSignature!.type);
    }

    // Guarantees all 10 templates have distinct motion signatures
    expect(signatureTypes.size).toBe(10);
  });

  it("guarantees total badge eradication across all 10 templates, motionSignatures, customizableFields, and overlays", () => {
    // 1. Global assertion: No template object anywhere in STUDIO_MOTION_TEMPLATES contains any property matching 'badge'
    const allLeakedBadgeProps = findBadgeProperties(STUDIO_MOTION_TEMPLATES, "STUDIO_MOTION_TEMPLATES");
    expect(
      allLeakedBadgeProps,
      `No template object anywhere in STUDIO_MOTION_TEMPLATES may contain any property matching 'badge', but found: ${allLeakedBadgeProps.join(", ")}`
    ).toEqual([]);

    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      // 2. Template root level has zero badge properties
      expect((tpl as any).badge).toBeUndefined();
      expect((tpl as any).badgeStyle).toBeUndefined();
      expect("badge" in tpl).toBe(false);
      expect("badgeStyle" in tpl).toBe(false);

      // 3. motionSignature has zero badge properties
      expect((tpl.motionSignature as any)?.badge).toBeUndefined();
      expect("badge" in (tpl.motionSignature ?? {})).toBe(false);

      // 4. Per-template deep recursive property scan
      const tplBadgeProps = findBadgeProperties(tpl, tpl.id);
      expect(
        tplBadgeProps,
        `Template ${tpl.id} must not contain any property matching 'badge', but found: ${tplBadgeProps.join(", ")}`
      ).toEqual([]);

      // 5. Customizable fields contain zero badge types or badge IDs
      for (const field of tpl.customizableFields) {
        expect(field.id).not.toBe("badge");
        expect(field.id.toLowerCase()).not.toContain("badge");
        expect(field.label.toLowerCase()).not.toContain("badge");
        expect(field.type).not.toBe("badge");
        expect(["text", "color"]).toContain(field.type);
      }

      // 6. Default text overlays contain zero badge properties
      for (const overlay of tpl.defaultTextOverlays) {
        expect((overlay as any).badge).toBeUndefined();
        expect((overlay as any).badgeStyle).toBeUndefined();
        expect("badge" in overlay).toBe(false);
        expect("badgeStyle" in overlay).toBe(false);
        expect(overlay.style).not.toBe("badge");
      }
    }
  });

  it("deeply validates that no template object anywhere in STUDIO_MOTION_TEMPLATES contains any property matching 'badge'", () => {
    const leakedProps = findBadgeProperties(STUDIO_MOTION_TEMPLATES, "STUDIO_MOTION_TEMPLATES");
    expect(
      leakedProps,
      `Expected zero properties matching 'badge' across all template objects in STUDIO_MOTION_TEMPLATES, but detected: ${leakedProps.join(", ")}`
    ).toEqual([]);

    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      expect((tpl.motionSignature as any)?.badge).toBeUndefined();
      expect(Object.keys(tpl.motionSignature ?? {})).not.toContain("badge");
      expect(Object.keys(tpl)).not.toContain("badge");
      expect(Object.keys(tpl)).not.toContain("badgeStyle");
    }
  });

  it("configures high-energy CapCut & After Effects motion choreography parameters across all 10 templates", () => {
    const expectedProfiles: Record<
      string,
      {
        visualAccent: string;
        multiDeviceLayout: string;
        transitionStyle: string;
      }
    > = {
      "saas-launch-hero": {
        visualAccent: "specular-sweep",
        multiDeviceLayout: "dual-cascade",
        transitionStyle: "perspective-cascade",
      },
      "apple-keynote-polish": {
        visualAccent: "glass-sheen",
        multiDeviceLayout: "single",
        transitionStyle: "ken-burns",
      },
      "feature-drop-changelog": {
        visualAccent: "ambient-pulse",
        multiDeviceLayout: "single",
        transitionStyle: "snap-zoom",
      },
      "viral-short-tiktok": {
        visualAccent: "kinetic-soundwave",
        multiDeviceLayout: "triple-deck",
        transitionStyle: "whip-pan",
      },
      "developer-cli": {
        visualAccent: "crt-scanlines",
        multiDeviceLayout: "single",
        transitionStyle: "snap-zoom",
      },
      "micro-tutorial": {
        visualAccent: "specular-sweep",
        multiDeviceLayout: "single",
        transitionStyle: "kinetic-punch",
      },
      "product-hunt-teaser": {
        visualAccent: "particle-burst",
        multiDeviceLayout: "isometric-stack",
        transitionStyle: "speed-ramp",
      },
      "enterprise-security": {
        visualAccent: "laser-radar-sweep",
        multiDeviceLayout: "single",
        transitionStyle: "ken-burns",
      },
      "interactive-click": {
        visualAccent: "tactile-shockwave",
        multiDeviceLayout: "single",
        transitionStyle: "snap-zoom",
      },
      "dribbble-design-reel": {
        visualAccent: "curved-cursor-glide",
        multiDeviceLayout: "triple-deck",
        transitionStyle: "whip-pan",
      },
    };

    for (const [tplId, expected] of Object.entries(expectedProfiles)) {
      const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === tplId);
      expect(tpl, `Template ${tplId} must exist`).toBeDefined();
      expect(tpl?.visualAccent).toBe(expected.visualAccent);
      expect(tpl?.multiDeviceLayout).toBe(expected.multiDeviceLayout);
      expect(tpl?.transitionTiming?.transitionStyle).toBe(expected.transitionStyle);
    }
  });

  it("generateTemplateKeyframes creates strictly monotonic keyframes and zoom blocks for all 10 templates", () => {
    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      const result = generateTemplateKeyframes(tpl, 8000);

      // Keyframes must exist and have at least 3 nodes
      expect(result.keyframes.length).toBeGreaterThanOrEqual(3);
      expect(result.zoomBlocks.length).toBe(1);

      // Verify strictly monotonic timestamps and bounds
      for (let i = 0; i < result.keyframes.length; i++) {
        const kf = result.keyframes[i]!;
        expect(kf.timeMs).toBeGreaterThanOrEqual(0);
        expect(kf.timeMs).toBeLessThanOrEqual(8000);
        expect(kf.scale).toBeGreaterThanOrEqual(1.0);
        expect(kf.targetX).toBeGreaterThanOrEqual(0);
        expect(kf.targetX).toBeLessThanOrEqual(1);
        expect(kf.targetY).toBeGreaterThanOrEqual(0);
        expect(kf.targetY).toBeLessThanOrEqual(1);
        expect(["spring", "cubic", "linear"]).toContain(kf.easing);

        if (i > 0) {
          expect(kf.timeMs).toBeGreaterThan(result.keyframes[i - 1]!.timeMs);
        }
      }

      // Check zoom block validity
      const zb = result.zoomBlocks[0]!;
      expect(zb.endTimeMs).toBeGreaterThan(zb.startTimeMs);
      expect(zb.endTimeMs - zb.startTimeMs).toBeGreaterThanOrEqual(500);
      expect(zb.enabled).toBe(true);
      expect(zb.scale).toBeGreaterThanOrEqual(1.15);
    }
  });

  it("generateTemplateKeyframes reflects template camera leadIn, zoom scale, and audio presets", () => {
    const keynoteTpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "apple-keynote-polish")!;
    const keynoteRes = generateTemplateKeyframes(keynoteTpl, 10000);

    // Easing matches smooth physics -> cubic
    expect(keynoteRes.keyframes[0]?.easing).toBe("cubic");
    expect(keynoteRes.keyframes[1]?.timeMs).toBe(keynoteTpl.transitionTiming?.cameraLeadInMs);
    expect(keynoteRes.keyframes[1]?.effect).toBe("spotlight");

    const cliTpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "developer-cli")!;
    const cliRes = generateTemplateKeyframes(cliTpl, 10000);
    expect(cliRes.keyframes[1]?.sound).toBe("typing");
    expect(cliRes.keyframes[1]?.soundPreset).toBe("mechanical");
    expect(cliRes.keyframes[0]?.easing).toBe("linear");

    const saasTpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "saas-launch-hero")!;
    const saasRes = generateTemplateKeyframes(saasTpl, 10000);
    expect(saasRes.keyframes[0]?.easing).toBe("spring");
    expect(saasRes.keyframes[1]?.sound).toBe("click");
    expect(saasRes.keyframes[1]?.soundPreset).toBe("bop");
  });

  it("generateTemplateKeyframes harmonizes existing keyframes and zoom blocks to match template easing and scale", () => {
    const existingKfs: KeyframeNode[] = [
      { id: "existing-1", timeMs: 500, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "linear" },
      { id: "existing-2", timeMs: 1500, scale: 2.0, targetX: 0.3, targetY: 0.4, easing: "linear", sound: "click", soundPreset: "old" },
    ];
    const existingBlocks = [
      { id: "block-1", startTimeMs: 1000, endTimeMs: 3000, targetX: 0.3, targetY: 0.4, scale: 2.0, enabled: true },
    ];

    const keynoteTpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "apple-keynote-polish")!;
    const result = generateTemplateKeyframes(keynoteTpl, 10000, {
      existingKeyframes: existingKfs,
      existingZoomBlocks: existingBlocks,
    });

    expect(result.keyframes.length).toBe(2);
    expect(result.keyframes[0]!.easing).toBe("cubic");
    expect(result.keyframes[1]!.easing).toBe("cubic");
    expect(result.keyframes[1]!.soundPreset).toBe(keynoteTpl.audioSettings.clickSoundPreset);
    expect(result.zoomBlocks[0]!.scale).toBe(keynoteTpl.looks.autoTrackScale || 1.5);
  });

  it("templatePhysicsToEasing accurately converts physics presets to easing curves", () => {
    expect(templatePhysicsToEasing("smooth")).toBe("cubic");
    expect(templatePhysicsToEasing("linear")).toBe("linear");
    expect(templatePhysicsToEasing("snappy")).toBe("spring");
    expect(templatePhysicsToEasing("spring")).toBe("spring");
    expect(templatePhysicsToEasing(undefined)).toBe("spring");
  });

  it("generateTemplateKeyframes dynamically scales speed ramp transitions and maintains finite monotonicity across all durations", () => {
    const durations = [0, 500, 1500, 3000, 8000, 12000, Infinity, NaN];

    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      for (const dur of durations) {
        const res = generateTemplateKeyframes(tpl, dur as any);
        expect(res.keyframes.length).toBeGreaterThanOrEqual(3);
        expect(res.zoomBlocks.length).toBe(1);

        for (let i = 0; i < res.keyframes.length; i++) {
          const kf = res.keyframes[i]!;
          expect(Number.isFinite(kf.timeMs)).toBe(true);
          expect(kf.timeMs).toBeGreaterThanOrEqual(0);
          expect(Number.isFinite(kf.scale)).toBe(true);
          expect(kf.scale).toBeGreaterThanOrEqual(1.0);
          expect(Number.isFinite(kf.targetX)).toBe(true);
          expect(Number.isFinite(kf.targetY)).toBe(true);

          if (i > 0) {
            expect(kf.timeMs).toBeGreaterThan(res.keyframes[i - 1]!.timeMs);
          }
        }

        const zb = res.zoomBlocks[0]!;
        expect(Number.isFinite(zb.startTimeMs)).toBe(true);
        expect(Number.isFinite(zb.endTimeMs)).toBe(true);
        expect(zb.endTimeMs).toBeGreaterThan(zb.startTimeMs);
        expect(zb.endTimeMs - zb.startTimeMs).toBeGreaterThanOrEqual(500);
      }
    }
  });
});
