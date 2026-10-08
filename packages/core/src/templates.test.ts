import { describe, expect, it } from "vitest";
import {
  STUDIO_MOTION_TEMPLATES,
  TYPING_SOUND_PROFILES,
  generateTemplateKeyframes,
  templatePhysicsToEasing,
  type KeyframeNode,
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

  it("enhances all 10 templates with badgeStyle, typography, transitionTiming, and cameraPhysics", () => {
    const validPhysics = ["smooth", "snappy", "spring", "linear"];

    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      // Badge style
      expect(tpl.badgeStyle).toBeDefined();
      expect(tpl.badgeStyle?.bg).toBeTruthy();
      expect(tpl.badgeStyle?.text).toBeTruthy();

      // Typography
      expect(tpl.typography).toBeDefined();
      expect(tpl.typography?.fontFamily).toBeTruthy();
      expect(tpl.typography?.letterSpacing).toBeDefined();

      // Transition timing
      expect(tpl.transitionTiming).toBeDefined();
      expect(tpl.transitionTiming?.cameraLeadInMs).toBeGreaterThan(0);
      expect(tpl.transitionTiming?.entranceDurationMs).toBeGreaterThan(0);

      // Camera physics
      expect(tpl.cameraPhysics).toBeDefined();
      expect(validPhysics).toContain(tpl.cameraPhysics);
      expect(tpl.looks.cameraPhysics).toBe(tpl.cameraPhysics);

      // Default text overlays
      expect(tpl.defaultTextOverlays[0]?.typography).toBeDefined();
      expect(tpl.defaultTextOverlays[0]?.badgeStyle).toBeDefined();
    }
  });

  it("implements the SaaS Launch core identity (saas-launch-hero) with spring physics and Jakarta typography", () => {
    const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "saas-launch-hero");
    expect(tpl).toBeDefined();
    expect(tpl?.aspectRatio).toBe("16:9");
    expect(tpl?.cameraPhysics).toBe("spring");
    expect(tpl?.looks.cameraPhysics).toBe("spring");
    expect(tpl?.badge).toBe("NEW RELEASE");
    expect(tpl?.badgeStyle).toEqual({
      bg: "rgba(99, 102, 241, 0.2)",
      text: "#818cf8",
      border: "rgba(99, 102, 241, 0.45)",
    });
    expect(tpl?.typography?.fontFamily).toContain("Plus Jakarta Sans");
    expect(tpl?.typography?.fontWeight).toBe("800");
    expect(tpl?.transitionTiming?.cameraLeadInMs).toBe(280);
    expect(tpl?.transitionTiming?.entranceDurationMs).toBe(450);
    expect(tpl?.audioSettings.clickSoundPreset).toBe("bop");
    expect(tpl?.audioSettings.typingSoundPreset).toBe("creamy");
  });

  it("implements the Social Reel core identity (viral-short-tiktok) with snappy physics and vertical 9:16 aspect", () => {
    const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "viral-short-tiktok");
    expect(tpl).toBeDefined();
    expect(tpl?.aspectRatio).toBe("9:16");
    expect(tpl?.cameraPhysics).toBe("snappy");
    expect(tpl?.looks.cameraPhysics).toBe("snappy");
    expect(tpl?.badge).toBe("MUST WATCH");
    expect(tpl?.badgeStyle).toEqual({
      bg: "rgba(250, 204, 21, 0.22)",
      text: "#facc15",
      border: "rgba(250, 204, 21, 0.6)",
    });
    expect(tpl?.typography?.fontFamily).toContain("Inter");
    expect(tpl?.typography?.fontWeight).toBe("900");
    expect(tpl?.transitionTiming?.cameraLeadInMs).toBe(150);
    expect(tpl?.transitionTiming?.entranceDurationMs).toBe(350);
    expect(tpl?.audioSettings.clickSoundPreset).toBe("bop");
    expect(tpl?.audioSettings.typingSoundPreset).toBe("creamy");
  });

  it("implements the Kinetic Developer core identity (developer-cli) with terminal framing, snappy physics, and thock audio", () => {
    const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "developer-cli");
    expect(tpl).toBeDefined();
    expect(tpl?.aspectRatio).toBe("16:9");
    expect(tpl?.cameraPhysics).toBe("snappy");
    expect(tpl?.looks.cameraPhysics).toBe("snappy");
    expect(tpl?.badge).toBe("CLI TOOL");
    expect(tpl?.badgeStyle).toEqual({
      bg: "rgba(34, 197, 94, 0.15)",
      text: "#4ade80",
      border: "rgba(34, 197, 94, 0.4)",
    });
    expect(tpl?.typography?.fontFamily).toContain("JetBrains Mono");
    expect(tpl?.typography?.fontWeight).toBe("700");
    expect(tpl?.transitionTiming?.cameraLeadInMs).toBe(200);
    expect(tpl?.transitionTiming?.entranceDurationMs).toBe(400);
    expect(tpl?.audioSettings.clickSoundPreset).toBe("tap");
    expect(tpl?.audioSettings.typingSoundPreset).toBe("thock");
  });

  it("implements the Keynote Spotlight core identity (apple-keynote-polish) with smooth physics and SF Pro typography", () => {
    const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "apple-keynote-polish");
    expect(tpl).toBeDefined();
    expect(tpl?.aspectRatio).toBe("16:9");
    expect(tpl?.cameraPhysics).toBe("smooth");
    expect(tpl?.looks.cameraPhysics).toBe("smooth");
    expect(tpl?.badge).toBe("PRO DEMO");
    expect(tpl?.badgeStyle).toEqual({
      bg: "rgba(0, 113, 227, 0.12)",
      text: "#0071e3",
      border: "rgba(0, 113, 227, 0.3)",
    });
    expect(tpl?.typography?.fontFamily).toContain("-apple-system");
    expect(tpl?.typography?.fontWeight).toBe("600");
    expect(tpl?.transitionTiming?.cameraLeadInMs).toBe(300);
    expect(tpl?.transitionTiming?.entranceDurationMs).toBe(500);
    expect(tpl?.audioSettings.clickSoundPreset).toBe("click");
    expect(tpl?.audioSettings.typingSoundPreset).toBe("laptop");
  });

  it("equips every studio template with a unique motionSignature choreography profile", () => {
    const signatureTypes = new Set<string>();

    for (const tpl of STUDIO_MOTION_TEMPLATES) {
      expect(tpl.motionSignature).toBeDefined();
      expect(tpl.motionSignature?.type).toBeTruthy();
      expect(tpl.motionSignature?.label).toBeTruthy();
      expect(tpl.motionSignature?.badge).toBeTruthy();
      expect(tpl.motionSignature?.description).toBeTruthy();
      signatureTypes.add(tpl.motionSignature!.type);
    }

    // Guarantees all 10 templates have distinct motion signatures
    expect(signatureTypes.size).toBe(10);
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
});
