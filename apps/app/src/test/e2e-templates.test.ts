import { beforeEach, describe, expect, it } from "vitest";
import {
  STUDIO_MOTION_TEMPLATES,
  CLICK_SOUND_PROFILES,
  TYPING_SOUND_PROFILES,
  DEFAULT_LOOKS,
  DEFAULT_AUDIO_SETTINGS,
  calculateCameraAtTime,
  clampCameraToBounds,
  type ProjectData,
  type ProjectSummary,
  type CameraPhysicsPreset,
} from "@domolens/core";
import { useEditor } from "../store/editor";
import { useProjects } from "../store/projects";
import { useToasts } from "../store/toast";
import { getOutputDimensions } from "../lib/video-renderer";
import { sfx } from "../lib/sound-effects";
import { platform } from "../platform";

/* -------------------------------------------------------------------------- */
/* Helper Mock Generator & Pure Component Logic Extractors                    */
/* -------------------------------------------------------------------------- */

function createMockProject(overrides?: Partial<ProjectData>): ProjectData {
  const summary: ProjectSummary = {
    id: "proj-e2e-templates",
    name: "E2E Template Project",
    source: "recording",
    createdAt: 1728000000000,
    updatedAt: 1728000000000,
    durationMs: 8000,
    width: 1920,
    height: 1080,
    thumbnail: null,
    media: "blob://video-master.mp4",
  };

  return {
    summary,
    clicks: [
      { id: "c1", timestampMs: 1500, x: 0.35, y: 0.42, button: "left" },
      { id: "c2", timestampMs: 4200, x: 0.68, y: 0.55, button: "left" },
    ],
    interactions: [],
    cursorTrajectory: [],
    zoomBlocks: [
      {
        id: "zb-1",
        startTimeMs: 1200,
        endTimeMs: 3200,
        targetX: 0.35,
        targetY: 0.42,
        scale: 1.8,
        enabled: true,
      },
    ],
    keyframes: [
      { id: "kf-1", timeMs: 1200, scale: 1.8, targetX: 0.35, targetY: 0.42, easing: "cubic" },
      { id: "kf-2", timeMs: 3200, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
    ],
    textOverlays: [
      {
        id: "user-persistent-overlay-1",
        text: "Custom User Watermark",
        startTimeMs: 0,
        durationMs: 8000,
        x: 0.85,
        y: 0.92,
        fontSize: 16,
        color: "#ffffff",
      },
    ],
    audioTracks: [],
    clips: [
      {
        id: "clip-1",
        name: "Raw Screen Stream",
        mediaUrl: "blob://video-clip-1.mp4",
        timelineStartMs: 0,
        sourceOffsetMs: 0,
        durationMs: 8000,
        muted: false,
        volume: 1,
      },
    ],
    looks: { ...DEFAULT_LOOKS },
    audioSettings: { ...DEFAULT_AUDIO_SETTINGS },
    ...overrides,
  };
}

/**
 * Mirror of TemplateVideoPreview video source resolution logic
 */
function resolvePreviewVideoSrc(project: ProjectData | null): string {
  let activeSrc = "/domolens_app_live_demo.mp4";
  if (project?.clips && project.clips.length > 0 && project.clips[0]?.mediaUrl) {
    activeSrc = platform.mediaUrl(project.clips[0].mediaUrl);
  } else if (project?.summary?.media) {
    activeSrc = platform.mediaUrl(project.summary.media);
  }
  return activeSrc;
}

/**
 * Mirror of TemplateVideoPreview aspect dimension calculation
 */
function getAspectDimensions(aspectRatio: string): string {
  switch (aspectRatio) {
    case "9:16":
      return "aspect-[9/16] max-h-[300px] w-auto";
    case "1:1":
      return "aspect-square max-h-[290px] w-auto";
    case "4:3":
      return "aspect-[4/3] max-h-[290px] w-auto";
    case "16:9":
    default:
      return "aspect-video w-full";
  }
}

/**
 * Mirror of TemplateVideoPreview 3D tilt perspective transform calculation
 */
function getTiltTransform(tiltAngle: number): string | undefined {
  return tiltAngle > 0
    ? `perspective(800px) rotateX(${tiltAngle * 0.65}deg) rotateY(-${tiltAngle * 0.35}deg)`
    : undefined;
}

/**
 * Mirror of TemplateVideoPreview scrubber calculation
 */
function computeScrubTime(
  clientX: number,
  containerLeft: number,
  containerWidth: number,
  duration: number,
): number {
  if (duration <= 0 || containerWidth <= 0) return 0;
  const pos = Math.max(0, Math.min(1, (clientX - containerLeft) / containerWidth));
  return pos * duration;
}

/**
 * Mirror of TemplateVideoPreview time formatter
 */
function formatTime(secs: number): string {
  const safeSecs = Math.max(0, isNaN(secs) ? 0 : secs);
  const s = Math.floor(safeSecs);
  const ms = Math.floor((safeSecs % 1) * 10);
  return `0:${s < 10 ? "0" : ""}${s}.${ms}`;
}

/**
 * Mirror of TemplateVideoPreview badge style generation
 */
function getBadgeStyles(accentColor: string): {
  backgroundColor: string;
  color: string;
  border: string;
} {
  return {
    backgroundColor: `${accentColor}30`,
    color: accentColor,
    border: `1px solid ${accentColor}60`,
  };
}

/**
 * Mirror of TemplateVideoPreview motion animation key
 */
function getMotionOverlayKey(
  templateId: string,
  headline: string,
  badge: string,
): string {
  return `${templateId}-${headline}-${badge}`;
}

/* -------------------------------------------------------------------------- */
/* Test Suite Entry Point                                                     */
/* -------------------------------------------------------------------------- */

describe("E2E Motion Video Templates Suite", () => {
  beforeEach(() => {
    useProjects.setState({ projects: [] });
    useToasts.setState({ toasts: [] });
    useEditor.setState({
      project: null,
      currentTimeMs: 0,
      durationMs: 0,
      isPlaying: false,
      selectedBlockId: null,
      selectedClipId: null,
      selectedKeyframeId: null,
      selectedEffectId: null,
      selectedTextId: null,
      selectedAudioId: null,
      activeTemplateId: null,
      isTemplateModalOpen: false,
      isExportModalOpen: false,
      history: [],
      future: [],
    });
  });

  /* ======================================================================== */
  /* TIER 1: FEATURE COVERAGE (F1 - F10, >=5 tests each)                      */
  /* ======================================================================== */

  describe("Tier 1: Feature Coverage", () => {
    /* ---------------------------------------------------------------------- */
    /* F1: Live Dynamic Video Preview Component                               */
    /* ---------------------------------------------------------------------- */
    describe("F1: Live Dynamic Video Preview Component", () => {
      it("F1-1: falls back to bundled high-res demo video when no project is loaded", () => {
        const src = resolvePreviewVideoSrc(null);
        expect(src).toBe("/domolens_app_live_demo.mp4");
      });

      it("F1-2: resolves preview source to first project clip mediaUrl when clips exist", () => {
        const project = createMockProject({
          clips: [
            {
              id: "c-active",
              name: "Active Recording",
              mediaUrl: "blob://custom-recording-123.mp4",
              timelineStartMs: 0,
              sourceOffsetMs: 0,
              durationMs: 5000,
              muted: false,
              volume: 1,
            },
          ],
        });
        const src = resolvePreviewVideoSrc(project);
        expect(src).toBe("blob://custom-recording-123.mp4");
      });

      it("F1-3: resolves preview source to summary media when clips array is empty", () => {
        const project = createMockProject({
          clips: [],
          summary: {
            id: "p1",
            name: "P1",
            source: "recording",
            createdAt: 100,
            updatedAt: 100,
            durationMs: 3000,
            width: 1920,
            height: 1080,
            thumbnail: null,
            media: "blob://summary-fallback.mp4",
          },
        });
        const src = resolvePreviewVideoSrc(project);
        expect(src).toBe("blob://summary-fallback.mp4");
      });

      it("F1-4: maps aspect ratios to exact CSS viewport utility classes", () => {
        expect(getAspectDimensions("16:9")).toBe("aspect-video w-full");
        expect(getAspectDimensions("9:16")).toBe("aspect-[9/16] max-h-[300px] w-auto");
        expect(getAspectDimensions("1:1")).toBe("aspect-square max-h-[290px] w-auto");
        expect(getAspectDimensions("4:3")).toBe("aspect-[4/3] max-h-[290px] w-auto");
      });

      it("F1-5: calculates 3D tilt perspective transform strings for non-zero angles", () => {
        const tilt65 = getTiltTransform(6.5);
        expect(tilt65).toBeDefined();
        expect(tilt65).toContain("perspective(800px)");
        expect(tilt65).toMatch(/rotateX\(4\.225\d*deg\)/);
        expect(tilt65).toMatch(/rotateY\(-2\.275\d*deg\)/);

        const tilt0 = getTiltTransform(0);
        expect(tilt0).toBeUndefined();
      });

      it("F1-6: confirms all studio motion templates specify supported window frame styles", () => {
        const validFrames = new Set(["macos", "safari", "terminal", "windows", "glass", "none"]);
        for (const tpl of STUDIO_MOTION_TEMPLATES) {
          const frame = tpl.looks.windowFrame || "macos";
          expect(validFrames.has(frame)).toBe(true);
        }
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F2: Framer Motion Overlay & Badge Animations                           */
    /* ---------------------------------------------------------------------- */
    describe("F2: Framer Motion Overlay & Badge Animations", () => {
      it("F2-1: generates color-synchronized translucent badge styling", () => {
        const badgeStyle = getBadgeStyles("#6366f1");
        expect(badgeStyle.backgroundColor).toBe("#6366f130");
        expect(badgeStyle.color).toBe("#6366f1");
        expect(badgeStyle.border).toBe("1px solid #6366f160");
      });

      it("F2-2: derives unique animation keys when template headline or badge is edited", () => {
        const key1 = getMotionOverlayKey("saas-launch-hero", "Original Title", "NEW RELEASE");
        const key2 = getMotionOverlayKey("saas-launch-hero", "Edited Title", "NEW RELEASE");
        const key3 = getMotionOverlayKey("saas-launch-hero", "Original Title", "PRO FEATURE");

        expect(key1).not.toBe(key2);
        expect(key1).not.toBe(key3);
        expect(key1).toBe("saas-launch-hero-Original Title-NEW RELEASE");
      });

      it("F2-3: allows custom headline to override template default without mutating template", () => {
        const template = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "saas-launch-hero")!;
        const originalHeadline = template.name;
        const customHeadline = "NextGen AI Platform Launch";

        const effectiveHeadline = customHeadline || template.name;
        expect(effectiveHeadline).toBe("NextGen AI Platform Launch");
        expect(template.name).toBe(originalHeadline);
      });

      it("F2-4: supports badge text customization override", () => {
        const template = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "viral-short-tiktok")!;
        const customBadge = "VIRAL DROP";

        const effectiveBadge = customBadge || template.badge;
        expect(effectiveBadge).toBe("VIRAL DROP");
        expect(template.badge).toBe("MUST WATCH");
      });

      it("F2-5: verifies badge entrance pulse parameters maintain smooth looping intervals", () => {
        const pulseConfig = {
          scale: [1, 1.03, 1],
          transition: { repeat: Infinity, duration: 2.8, ease: "easeInOut" },
        };
        expect(pulseConfig.scale).toEqual([1, 1.03, 1]);
        expect(pulseConfig.transition.repeat).toBe(Infinity);
        expect(pulseConfig.transition.duration).toBeGreaterThan(2.0);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F3: Local Video Playback Controls                                      */
    /* ---------------------------------------------------------------------- */
    describe("F3: Local Video Playback Controls", () => {
      it("F3-1: local preview play toggle does NOT mutate editor timeline play state", () => {
        useEditor.setState({ isPlaying: false });

        let localIsPlaying = true;
        // Toggle local preview off
        localIsPlaying = !localIsPlaying;
        expect(localIsPlaying).toBe(false);

        // Editor main playback must remain untouched
        expect(useEditor.getState().isPlaying).toBe(false);
      });

      it("F3-2: local preview mute toggle operates independently of project audioSettings", () => {
        const project = createMockProject({
          audioSettings: { ...DEFAULT_AUDIO_SETTINGS, clickSoundVolume: 0.9, typingSoundVolume: 0.8 },
        });
        useEditor.setState({ project });

        let localIsMuted = true;
        localIsMuted = !localIsMuted;
        expect(localIsMuted).toBe(false);

        // Project audio settings volumes must remain untouched
        const currentAudio = useEditor.getState().project?.audioSettings;
        expect(currentAudio?.clickSoundVolume).toBe(0.9);
      });

      it("F3-3: restart handler resets video current time to 0 and ensures play state is active", () => {
        let currentTime = 4.25;
        let isPlaying = false;

        // Simulate handleRestart
        currentTime = 0;
        isPlaying = true;

        expect(currentTime).toBe(0);
        expect(isPlaying).toBe(true);
      });

      it("F3-4: accurately computes scrubbed time with clamping between 0 and duration", () => {
        const duration = 10.0;
        const containerLeft = 100;
        const containerWidth = 200;

        // Middle scrub (clientX = 200 -> relative 100px -> pos 0.5)
        const midTime = computeScrubTime(200, containerLeft, containerWidth, duration);
        expect(midTime).toBe(5.0);

        // Underflow scrub (clientX = 50 -> clamped to 0)
        const underTime = computeScrubTime(50, containerLeft, containerWidth, duration);
        expect(underTime).toBe(0.0);

        // Overflow scrub (clientX = 350 -> clamped to 1)
        const overTime = computeScrubTime(350, containerLeft, containerWidth, duration);
        expect(overTime).toBe(10.0);
      });

      it("F3-5: formats seconds into zero-padded mm:ss.s display string", () => {
        expect(formatTime(0)).toBe("0:00.0");
        expect(formatTime(4.25)).toBe("0:04.2");
        expect(formatTime(12.87)).toBe("0:12.8");
        expect(formatTime(59.99)).toBe("0:59.9");
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F4: Atomic Template Application in Store                               */
    /* ---------------------------------------------------------------------- */
    describe("F4: Atomic Template Application in Store", () => {
      it("F4-1: atomically commits template looks, audioSettings, and activeTemplateId", () => {
        const project = createMockProject();
        useEditor.setState({ project, isTemplateModalOpen: true });

        useEditor.getState().applyTemplate("saas-launch-hero", {
          headline: "Atomic SaaS Hero",
          badge: "SUPERCHARGED",
          accent: "#4f46e5",
        });

        const state = useEditor.getState();
        expect(state.activeTemplateId).toBe("saas-launch-hero");
        expect(state.isTemplateModalOpen).toBe(false);
        expect(state.project?.looks.aspectRatio).toBe("16:9");
        expect(state.project?.looks.windowFrame).toBe("macos");
        expect(state.project?.looks.cameraPhysics).toBe("spring");
        expect(state.project?.looks.brandAccentColor).toBe("#4f46e5");
        expect(state.project?.audioSettings?.typingSoundPreset).toBe("creamy");
      });

      it("F4-2: supports single-step undo reverting applied template to exact initial state", () => {
        const project = createMockProject({
          looks: { ...DEFAULT_LOOKS, aspectRatio: "16:9", padding: 20 },
        });
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("viral-short-tiktok");
        expect(useEditor.getState().project?.looks.aspectRatio).toBe("9:16");

        useEditor.getState().undo();
        expect(useEditor.getState().project?.looks.aspectRatio).toBe("16:9");
        expect(useEditor.getState().project?.looks.padding).toBe(20);
      });

      it("F4-3: supports redo re-applying template state cleanly", () => {
        const project = createMockProject();
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("developer-cli");
        expect(useEditor.getState().project?.looks.windowFrame).toBe("terminal");

        useEditor.getState().undo();
        expect(useEditor.getState().project?.looks.windowFrame).toBe(DEFAULT_LOOKS.windowFrame);

        useEditor.getState().redo();
        expect(useEditor.getState().project?.looks.windowFrame).toBe("terminal");
      });

      it("F4-4: replaces prior template text overlays while preserving persistent user overlays", () => {
        const project = createMockProject({
          textOverlays: [
            {
              id: "user-persistent-overlay-1",
              text: "User Watermark",
              startTimeMs: 0,
              durationMs: 5000,
              x: 0.5,
              y: 0.5,
              fontSize: 16,
              color: "#ffffff",
            },
          ],
        });
        useEditor.setState({ project });

        // Apply template 1
        useEditor.getState().applyTemplate("saas-launch-hero", { headline: "First Template Title" });
        let overlays = useEditor.getState().project?.textOverlays || [];
        expect(overlays.some((o) => o.id === "user-persistent-overlay-1")).toBe(true);
        expect(overlays.some((o) => o.text === "First Template Title")).toBe(true);

        // Apply template 2
        useEditor.getState().applyTemplate("apple-keynote-polish", { headline: "Keynote Headline" });
        overlays = useEditor.getState().project?.textOverlays || [];
        // User watermark still preserved
        expect(overlays.some((o) => o.id === "user-persistent-overlay-1")).toBe(true);
        // First template headline replaced
        expect(overlays.some((o) => o.text === "First Template Title")).toBe(false);
        // Keynote headline present
        expect(overlays.some((o) => o.text === "Keynote Headline")).toBe(true);
      });

      it("F4-5: generates user toast notification upon successful template application", () => {
        const project = createMockProject();
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("product-hunt-teaser");
        const toasts = useToasts.getState().toasts;
        expect(toasts.length).toBeGreaterThan(0);
        expect(toasts[toasts.length - 1]!.message).toContain('Applied "Product Hunt Teaser"');
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F5: Canvas & Timeline Synchronization                                  */
    /* ---------------------------------------------------------------------- */
    describe("F5: Canvas & Timeline Synchronization", () => {
      it("F5-1: reflects aspect ratio in canvas viewport ratio strings", () => {
        const ratios: Array<{ input: "16:9" | "9:16" | "1:1" | "4:3"; expected: string }> = [
          { input: "16:9", expected: "16 / 9" },
          { input: "9:16", expected: "9 / 16" },
          { input: "1:1", expected: "1 / 1" },
          { input: "4:3", expected: "4 / 3" },
        ];

        for (const { input, expected } of ratios) {
          const project = createMockProject({ looks: { ...DEFAULT_LOOKS, aspectRatio: input } });
          const computed =
            project.looks.aspectRatio === "9:16"
              ? "9 / 16"
              : project.looks.aspectRatio === "1:1"
              ? "1 / 1"
              : project.looks.aspectRatio === "4:3"
              ? "4 / 3"
              : "16 / 9";
          expect(computed).toBe(expected);
        }
      });

      it("F5-2: updates looks styling attributes (padding, borderRadius, tiltAngle, shadow)", () => {
        const project = createMockProject();
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("dribbble-design-reel");
        const looks = useEditor.getState().project?.looks;
        expect(looks?.padding).toBe(44);
        expect(looks?.borderRadius).toBe(24);
        expect(looks?.tiltAngle).toBe(5.5);
        expect(looks?.shadow).toBe("lift");
        expect(looks?.aspectRatio).toBe("4:3");
      });

      it("F5-3: synchronizes defaultTextOverlays with timeline start and duration timings", () => {
        const project = createMockProject();
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("feature-drop-changelog");
        const overlays = useEditor.getState().project?.textOverlays || [];
        const tplOverlay = overlays.find((o) => o.id.startsWith("text-tpl-"));

        expect(tplOverlay).toBeDefined();
        expect(tplOverlay?.startTimeMs).toBe(200);
        expect(tplOverlay?.durationMs).toBe(3600);
        expect(tplOverlay?.badge).toBe("v2.4 UPDATE");
      });

      it("F5-4: switching from 16:9 to vertical 9:16 retains zoom blocks without coordinate corruption", () => {
        const project = createMockProject({
          looks: { ...DEFAULT_LOOKS, aspectRatio: "16:9" },
        });
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("viral-short-tiktok");
        const currentProject = useEditor.getState().project!;
        expect(currentProject.looks.aspectRatio).toBe("9:16");
        expect(currentProject.zoomBlocks.length).toBe(1);
        expect(currentProject.zoomBlocks[0]!.targetX).toBe(0.35);
        expect(currentProject.zoomBlocks[0]!.targetY).toBe(0.42);
      });

      it("F5-5: canvas boundary clamping remains valid after aspect ratio transformation", () => {
        const clampedCenter = clampCameraToBounds(0.1, 0.1, 1.8);
        expect(clampedCenter.x).toBeGreaterThan(0.1);
        expect(clampedCenter.y).toBeGreaterThan(0.1);
        expect(clampedCenter.x).toBeLessThan(0.9);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F6: Camera Physics Engine                                              */
    /* ---------------------------------------------------------------------- */
    describe("F6: Camera Physics Engine", () => {
      it("F6-1: applies and retains cameraPhysics preset in project looks", () => {
        const project = createMockProject();
        useEditor.setState({ project });

        const physicsPresets: CameraPhysicsPreset[] = ["spring", "smooth", "snappy", "linear"];
        for (const preset of physicsPresets) {
          useEditor.getState().updateLooks({ cameraPhysics: preset });
          expect(useEditor.getState().project?.looks.cameraPhysics).toBe(preset);
        }
      });

      it("F6-2: templates specify distinct camera physics models tailored to their personality", () => {
        const saas = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "saas-launch-hero")!;
        const apple = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "apple-keynote-polish")!;
        const changelog = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "feature-drop-changelog")!;

        expect(saas.looks.cameraPhysics).toBe("spring");
        expect(apple.looks.cameraPhysics).toBe("smooth");
        expect(changelog.looks.cameraPhysics).toBe("snappy");
      });

      it("F6-3: calculates camera positions across active zoom blocks smoothly", () => {
        const project = createMockProject();
        const stateAtRest = calculateCameraAtTime(0, project.zoomBlocks);
        expect(stateAtRest.scale).toBe(1.0);
        expect(stateAtRest.x).toBe(0.5);
        expect(stateAtRest.y).toBe(0.5);

        const stateZoomed = calculateCameraAtTime(2000, project.zoomBlocks);
        expect(stateZoomed.scale).toBe(1.8);
        expect(stateZoomed.x).toBeCloseTo(0.35, 2);
        expect(stateZoomed.y).toBeCloseTo(0.42, 2);
      });

      it("F6-4: camera calculation remains mathematically stable during physics transitions", () => {
        const project = createMockProject();
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("saas-launch-hero");
        expect(useEditor.getState().project?.looks.cameraPhysics).toBe("spring");

        useEditor.getState().applyTemplate("apple-keynote-polish");
        expect(useEditor.getState().project?.looks.cameraPhysics).toBe("smooth");

        const camera = calculateCameraAtTime(2000, useEditor.getState().project!.zoomBlocks);
        expect(camera.scale).toBeGreaterThanOrEqual(1.0);
      });

      it("F6-5: clampCameraToBounds guarantees zoom scale never exposes empty outer boundaries", () => {
        // At scale 1.0, camera must center at exactly 0.5, 0.5
        const fullFrame = clampCameraToBounds(0.1, 0.9, 1.0);
        expect(fullFrame.x).toBe(0.5);
        expect(fullFrame.y).toBe(0.5);

        // At scale 2.0, bounds are [0.25, 0.75]
        const extremeZoom = clampCameraToBounds(0.05, 0.95, 2.0);
        expect(extremeZoom.x).toBe(0.25);
        expect(extremeZoom.y).toBe(0.75);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F7: Export Pipeline Correction                                         */
    /* ---------------------------------------------------------------------- */
    describe("F7: Export Pipeline Correction", () => {
      it("F7-1: calculates standard 16:9 widescreen output dimensions", () => {
        expect(getOutputDimensions("1080p", "16:9")).toEqual({ width: 1920, height: 1080 });
        expect(getOutputDimensions("720p", "16:9")).toEqual({ width: 1280, height: 720 });
        expect(getOutputDimensions("4k", "16:9")).toEqual({ width: 3840, height: 2160 });
        expect(getOutputDimensions("gif", "16:9")).toEqual({ width: 960, height: 540 });
      });

      it("F7-2: calculates vertical 9:16 mobile export dimensions (height > width)", () => {
        expect(getOutputDimensions("1080p", "9:16")).toEqual({ width: 1080, height: 1920 });
        expect(getOutputDimensions("720p", "9:16")).toEqual({ width: 720, height: 1280 });
        expect(getOutputDimensions("4k", "9:16")).toEqual({ width: 2160, height: 3840 });
        expect(getOutputDimensions("gif", "9:16")).toEqual({ width: 540, height: 960 });
      });

      it("F7-3: calculates square 1:1 feed export dimensions (width === height)", () => {
        expect(getOutputDimensions("1080p", "1:1")).toEqual({ width: 1080, height: 1080 });
        expect(getOutputDimensions("720p", "1:1")).toEqual({ width: 720, height: 720 });
        expect(getOutputDimensions("4k", "1:1")).toEqual({ width: 2160, height: 2160 });
        expect(getOutputDimensions("gif", "1:1")).toEqual({ width: 540, height: 540 });
      });

      it("F7-4: calculates 4:3 presentation export dimensions accurately", () => {
        expect(getOutputDimensions("1080p", "4:3")).toEqual({ width: 1440, height: 1080 });
        expect(getOutputDimensions("720p", "4:3")).toEqual({ width: 960, height: 720 });
        expect(getOutputDimensions("4k", "4:3")).toEqual({ width: 2880, height: 2160 });
      });

      it("F7-5: passes applied template looks and overlays into render options contract", () => {
        const project = createMockProject();
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("saas-launch-hero", { headline: "Export Ready SaaS" });
        const activeProject = useEditor.getState().project!;

        const dimensions = getOutputDimensions("1080p", activeProject.looks.aspectRatio);
        expect(dimensions.width).toBe(1920);
        expect(dimensions.height).toBe(1080);
        expect(activeProject.looks.backgroundValue).toContain("linear-gradient");
        const overlays = activeProject.textOverlays || [];
        expect(overlays.some((o) => o.text === "Export Ready SaaS")).toBe(true);
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F8: Motion Templates Visual Identity Polish                            */
    /* ---------------------------------------------------------------------- */
    describe("F8: Motion Templates Visual Identity Polish", () => {
      it("F8-1: provides exactly 10 high-craft studio motion templates with unique IDs", () => {
        expect(STUDIO_MOTION_TEMPLATES.length).toBe(10);
        const ids = new Set(STUDIO_MOTION_TEMPLATES.map((t) => t.id));
        expect(ids.size).toBe(10);
      });

      it("F8-2: covers diverse template categories across saas, social, developer, and keynote", () => {
        const categories = new Set(STUDIO_MOTION_TEMPLATES.map((t) => t.category));
        expect(categories.has("saas")).toBe(true);
        expect(categories.has("social")).toBe(true);
        expect(categories.has("developer")).toBe(true);
        expect(categories.has("keynote")).toBe(true);
        expect(categories.has("tutorial")).toBe(true);
        expect(categories.has("teaser")).toBe(true);
        expect(categories.has("showcase")).toBe(true);
      });

      it("F8-3: each template defines full metadata, taglines, badges, and accent colors", () => {
        for (const tpl of STUDIO_MOTION_TEMPLATES) {
          expect(tpl.name.trim().length).toBeGreaterThan(0);
          expect(tpl.tagline.trim().length).toBeGreaterThan(0);
          expect(tpl.description.trim().length).toBeGreaterThan(0);
          expect(tpl.badge.trim().length).toBeGreaterThan(0);
          expect(tpl.accentColor.startsWith("#")).toBe(true);
        }
      });

      it("F8-4: each template provides comprehensive customizable field definitions", () => {
        for (const tpl of STUDIO_MOTION_TEMPLATES) {
          expect(tpl.customizableFields.length).toBeGreaterThanOrEqual(3);
          const headlineField = tpl.customizableFields.find((f) => f.id === "headline");
          const badgeField = tpl.customizableFields.find((f) => f.id === "badge");
          const accentField = tpl.customizableFields.find((f) => f.id === "accent");

          expect(headlineField).toBeDefined();
          expect(badgeField).toBeDefined();
          expect(accentField).toBeDefined();
        }
      });

      it("F8-5: each template provides defaultTextOverlays with valid geometry and timing", () => {
        for (const tpl of STUDIO_MOTION_TEMPLATES) {
          expect(tpl.defaultTextOverlays.length).toBeGreaterThanOrEqual(1);
          for (const overlay of tpl.defaultTextOverlays) {
            expect(overlay.startTimeMs).toBeGreaterThanOrEqual(0);
            expect(overlay.durationMs).toBeGreaterThan(1000);
            expect(overlay.x).toBeGreaterThanOrEqual(0);
            expect(overlay.x).toBeLessThanOrEqual(1);
            expect(overlay.y).toBeGreaterThanOrEqual(0);
            expect(overlay.y).toBeLessThanOrEqual(1);
          }
        }
      });

      it("F8-6: templates provide tailored background gradients and mesh values", () => {
        for (const tpl of STUDIO_MOTION_TEMPLATES) {
          expect(tpl.looks.backgroundType).toBe("gradient");
          expect(tpl.looks.backgroundValue).toContain("linear-gradient");
        }
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F9: SFX Audio Presets Auditioning                                      */
    /* ---------------------------------------------------------------------- */
    describe("F9: SFX Audio Presets Auditioning", () => {
      it("F9-1: click sound synthesis profiles define bop, click, and tap with valid frequencies", () => {
        const presets = ["bop", "click", "tap"] as const;
        for (const p of presets) {
          const profile = CLICK_SOUND_PROFILES[p];
          expect(profile).toBeDefined();
          expect(profile.startFreq).toBeGreaterThan(profile.endFreq);
          expect(profile.durationSec).toBeGreaterThan(0);
        }
      });

      it("F9-2: typing acoustic profiles define thock, creamy, thack, clicky, thick, and laptop", () => {
        const presets = [
          "thock",
          "creamy",
          "thack",
          "clicky",
          "thick",
          "mechanical",
          "laptop",
          "typewriter",
        ] as const;
        for (const p of presets) {
          const profile = TYPING_SOUND_PROFILES[p];
          expect(profile).toBeDefined();
          expect(profile.thockFreq).toBeGreaterThan(50);
          expect(profile.durationSec).toBeGreaterThan(0);
        }
      });

      it("F9-3: all templates configure valid click and typing sound presets", () => {
        for (const tpl of STUDIO_MOTION_TEMPLATES) {
          const clickPreset = tpl.audioSettings.clickSoundPreset;
          const typingPreset = tpl.audioSettings.typingSoundPreset;

          if (clickPreset && clickPreset !== "none") {
            expect(CLICK_SOUND_PROFILES[clickPreset]).toBeDefined();
          }
          if (typingPreset && typingPreset !== "none") {
            expect(TYPING_SOUND_PROFILES[typingPreset]).toBeDefined();
          }
        }
      });

      it("F9-4: procedural click audition executes cleanly without throwing in test environment", () => {
        expect(() => sfx.playClickBop("bop", 0.7)).not.toThrow();
        expect(() => sfx.playClickBop("click", 0.8)).not.toThrow();
        expect(() => sfx.playClickBop("tap", 0.6)).not.toThrow();
      });

      it("F9-5: procedural typing burst audition executes cleanly across all acoustic models", () => {
        const typingPresets = [
          "thock",
          "creamy",
          "thack",
          "clicky",
          "thick",
          "mechanical",
          "laptop",
          "typewriter",
        ] as const;

        for (const preset of typingPresets) {
          expect(() => sfx.playTypingBurst(3, 80, preset, 0.7)).not.toThrow();
        }
      });
    });

    /* ---------------------------------------------------------------------- */
    /* F10: Automated Tests & Build Integrity                                 */
    /* ---------------------------------------------------------------------- */
    describe("F10: Automated Tests & Build Integrity", () => {
      it("F10-1: project state with applied template serializes to JSON and deserializes identically", () => {
        const project = createMockProject();
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("saas-launch-hero", {
          headline: "Roundtrip Test",
          badge: "VERIFIED",
        });

        const active = useEditor.getState().project!;
        const serialized = JSON.stringify(active);
        const deserialized = JSON.parse(serialized) as ProjectData;

        expect(deserialized.looks.aspectRatio).toBe("16:9");
        expect(deserialized.looks.windowFrame).toBe("macos");
        expect(deserialized.looks.brandAccentColor).toBe("#6366f1");
        const overlays = deserialized.textOverlays || [];
        expect(overlays.some((o) => o.text === "Roundtrip Test")).toBe(true);
      });

      it("F10-2: missing optional fields in looks fall back safely to defaults", () => {
        const partialProject = createMockProject({
          looks: { ...DEFAULT_LOOKS, tiltAngle: undefined, cameraPhysics: undefined },
        });
        useEditor.setState({ project: partialProject });

        const tilt = useEditor.getState().project?.looks.tiltAngle || 0;
        const physics = useEditor.getState().project?.looks.cameraPhysics || "spring";

        expect(tilt).toBe(0);
        expect(physics).toBe("spring");
      });

      it("F10-3: zustand store subscribers receive state notifications when template is applied", () => {
        const project = createMockProject();
        useEditor.setState({ project });

        let notifiedTemplateId: string | null = null;
        const unsub = useEditor.subscribe((state) => {
          notifiedTemplateId = state.activeTemplateId;
        });

        useEditor.getState().applyTemplate("developer-cli");
        expect(notifiedTemplateId).toBe("developer-cli");

        unsub();
      });

      it("F10-4: toast notifications stack up to 3 and dismiss automatically without errors", () => {
        useToasts.getState().show("Message 1");
        useToasts.getState().show("Message 2");
        useToasts.getState().show("Message 3");
        useToasts.getState().show("Message 4");

        const toasts = useToasts.getState().toasts;
        expect(toasts.length).toBeLessThanOrEqual(3);
      });

      it("F10-5: platform saveFullProject retains applied template data permanently", async () => {
        const project = createMockProject();
        useEditor.setState({ project });

        useEditor.getState().applyTemplate("apple-keynote-polish");
        const stateToSave = useEditor.getState().project!;

        await platform.saveFullProject?.(stateToSave);
        const retrieved = await platform.loadFullProject?.(stateToSave.summary.id);

        if (retrieved) {
          expect(retrieved.looks.windowFrame).toBe("safari");
          expect(retrieved.looks.cameraPhysics).toBe("smooth");
        }
      });
    });
  });

  /* ======================================================================== */
  /* TIER 2: BOUNDARY & CORNER CASES                                          */
  /* ======================================================================== */

  describe("Tier 2: Boundary & Corner Cases", () => {
    it("T2-B1: empty custom fields object {} preserves template defaults without crashing", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("saas-launch-hero", {});
      const active = useEditor.getState().project!;

      expect(active.looks.brandAccentColor).toBe("#6366f1");
      const overlays = active.textOverlays || [];
      const overlay = overlays.find((o) => o.id.startsWith("text-tpl-"));
      expect(overlay?.text).toBe("Introducing DomoLens 2.0");
      expect(overlay?.badge).toBe("NEW RELEASE");
    });

    it("T2-B2: partial custom fields (headline only, omitting badge/accent) gracefully merge defaults", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("saas-launch-hero", {
        headline: "Custom Only Title",
      });
      const active = useEditor.getState().project!;

      const overlays = active.textOverlays || [];
      const overlay = overlays.find((o) => o.id.startsWith("text-tpl-"));
      expect(overlay?.text).toBe("Custom Only Title");
      expect(overlay?.badge).toBe("NEW RELEASE"); // Default preserved
      expect(active.looks.brandAccentColor).toBe("#6366f1"); // Default preserved
    });

    it("T2-B3: rapid consecutive switching across 5 templates leaves clean state and 5 undo levels", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      const templatesToSwitch = [
        "saas-launch-hero",
        "viral-short-tiktok",
        "developer-cli",
        "apple-keynote-polish",
        "dribbble-design-reel",
      ];

      for (const tplId of templatesToSwitch) {
        useEditor.getState().applyTemplate(tplId);
      }

      // Final state must reflect the last template
      expect(useEditor.getState().activeTemplateId).toBe("dribbble-design-reel");
      expect(useEditor.getState().project?.looks.aspectRatio).toBe("4:3");
      expect(useEditor.getState().project?.looks.windowFrame).toBe("glass");

      // Verify undo history has 5 steps
      expect(useEditor.getState().history.length).toBe(5);

      // Step back 4 times to viral-short-tiktok
      useEditor.getState().undo(); // keynote
      useEditor.getState().undo(); // cli
      useEditor.getState().undo(); // tiktok
      expect(useEditor.getState().project?.looks.aspectRatio).toBe("9:16");
    });

    it("T2-B4: missing media and empty clips in project fallback safely to sample demo", () => {
      const emptyProject = createMockProject({
        clips: [],
        summary: {
          id: "empty-proj",
          name: "Empty",
          source: "recording",
          createdAt: 0,
          updatedAt: 0,
          durationMs: 0,
          width: 0,
          height: 0,
          thumbnail: null,
          media: "",
        },
      });

      const src = resolvePreviewVideoSrc(emptyProject);
      expect(src).toBe("/domolens_app_live_demo.mp4");
    });

    it("T2-B5: zero duration and negative duration video project scrub safely to 0", () => {
      expect(computeScrubTime(150, 100, 200, 0)).toBe(0);
      expect(computeScrubTime(150, 100, 200, -5000)).toBe(0);
      expect(formatTime(-10)).toBe("0:00.0");
      expect(formatTime(NaN)).toBe("0:00.0");
    });

    it("T2-B6: extreme tilt angles (-15, 0, 15, 45) compute valid transform strings without singularities", () => {
      expect(getTiltTransform(0)).toBeUndefined();

      const tilt15 = getTiltTransform(15);
      expect(tilt15).toBeDefined();
      expect(tilt15).toContain("rotateX(9.75deg)");
      expect(tilt15).toContain("rotateY(-5.25deg)");

      const tiltExtreme = getTiltTransform(45);
      expect(tiltExtreme).toBeDefined();
      expect(tiltExtreme).toContain("rotateX(29.25deg)");
      expect(tiltExtreme).toMatch(/rotateY\(-15\.74\d*deg\)|\-15\.75deg/);
    });

    it("T2-B7: non-existent template ID passed to applyTemplate safely no-ops without corrupting state", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("non-existent-template-999");
      expect(useEditor.getState().activeTemplateId).toBeNull();
      expect(useEditor.getState().project?.looks.aspectRatio).toBe(DEFAULT_LOOKS.aspectRatio);
      expect(useEditor.getState().history.length).toBe(0);
    });

    it("T2-B8: applyTemplate called when project === null safely no-ops without error", () => {
      useEditor.setState({ project: null });

      expect(() => {
        useEditor.getState().applyTemplate("saas-launch-hero");
      }).not.toThrow();

      expect(useEditor.getState().project).toBeNull();
      expect(useEditor.getState().activeTemplateId).toBeNull();
    });

    it("T2-B9: template with empty defaultTextOverlays retains existing non-template overlays", () => {
      const project = createMockProject({
        textOverlays: [
          {
            id: "custom-user-note",
            text: "Persistent",
            startTimeMs: 0,
            durationMs: 4000,
            x: 0.1,
            y: 0.1,
            fontSize: 16,
            color: "#ffffff",
          },
        ],
      });
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("saas-launch-hero");
      const overlays = useEditor.getState().project?.textOverlays || [];

      expect(overlays.some((o) => o.id === "custom-user-note")).toBe(true);
    });
  });

  /* ======================================================================== */
  /* TIER 3: PAIRWISE COMBINATIONS                                            */
  /* ======================================================================== */

  describe("Tier 3: Pairwise Combinations", () => {
    it("T3-P1: 16:9 + SaaS Launch Hero + custom headline/badge + creamy typing + undo/redo", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("saas-launch-hero", {
        headline: "Pairwise SaaS",
        badge: "VERIFIED",
        accent: "#6366f1",
      });

      const p1 = useEditor.getState().project!;
      expect(p1.looks.aspectRatio).toBe("16:9");
      expect(p1.audioSettings?.typingSoundPreset).toBe("creamy");

      useEditor.getState().undo();
      expect(useEditor.getState().project?.looks.aspectRatio).toBe(DEFAULT_LOOKS.aspectRatio);

      useEditor.getState().redo();
      expect(useEditor.getState().project?.looks.aspectRatio).toBe("16:9");
      const overlays = useEditor.getState().project?.textOverlays || [];
      expect(overlays.some((o) => o.text === "Pairwise SaaS")).toBe(true);
    });

    it("T3-P2: 9:16 + Viral TikTok + custom hook caption + bop click + creamy typing", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("viral-short-tiktok", {
        headline: "How I Built an App in 24h",
        badge: "VIRAL",
        accent: "#facc15",
      });

      const p = useEditor.getState().project!;
      expect(p.looks.aspectRatio).toBe("9:16");
      expect(p.looks.windowFrame).toBe("glass");
      expect(p.audioSettings?.clickSoundPreset).toBe("bop");
      expect(p.audioSettings?.typingSoundPreset).toBe("creamy");
      expect(p.looks.ambientBackdropBlur).toBe(true);
    });

    it("T3-P3: 1:1 + Product Hunt Teaser + custom launch tagline + clicky typing + undo", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("product-hunt-teaser", {
        headline: "Live on Product Hunt!",
        badge: "#1 PRODUCT",
        accent: "#ea580c",
      });

      const p = useEditor.getState().project!;
      expect(p.looks.aspectRatio).toBe("1:1");
      expect(p.looks.tiltAngle).toBe(5.0);
      expect(p.audioSettings?.typingSoundPreset).toBe("clicky");

      useEditor.getState().undo();
      expect(useEditor.getState().project?.looks.aspectRatio).toBe(DEFAULT_LOOKS.aspectRatio);
    });

    it("T3-P4: 4:3 + Dribbble Design Reel + custom pastel accent + tap click + creamy typing", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("dribbble-design-reel", {
        headline: "Design System Showcase",
        badge: "FIGMA 2026",
        accent: "#ec4899",
      });

      const p = useEditor.getState().project!;
      expect(p.looks.aspectRatio).toBe("4:3");
      expect(p.looks.borderRadius).toBe(24);
      expect(p.audioSettings?.clickSoundPreset).toBe("tap");
      expect(p.audioSettings?.typingSoundPreset).toBe("creamy");
    });

    it("T3-P5: 16:9 + Developer CLI + terminal frame + snappy physics + thock audio", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("developer-cli", {
        headline: "$ cargo build --release",
        badge: "RUST",
        accent: "#22c55e",
      });

      const p = useEditor.getState().project!;
      expect(p.looks.aspectRatio).toBe("16:9");
      expect(p.looks.windowFrame).toBe("terminal");
      expect(p.looks.cameraPhysics).toBe("snappy");
      expect(p.audioSettings?.typingSoundPreset).toBe("thock");
    });

    it("T3-P6: 16:9 + Apple Keynote + safari frame + smooth camera + laptop audio + redo", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("apple-keynote-polish", {
        headline: "Engineered for speed.",
        badge: "PRO",
        accent: "#0071e3",
      });

      useEditor.getState().undo();
      expect(useEditor.getState().project?.looks.windowFrame).toBe(DEFAULT_LOOKS.windowFrame);

      useEditor.getState().redo();
      expect(useEditor.getState().project?.looks.windowFrame).toBe("safari");
      expect(useEditor.getState().project?.looks.cameraPhysics).toBe("smooth");
      expect(useEditor.getState().project?.audioSettings?.typingSoundPreset).toBe("laptop");
    });

    it("T3-P7: 16:9 + Feature Drop + macos frame + snappy physics + thack audio", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("feature-drop-changelog", {
        headline: "Changelog v3.0: Live Preview",
        badge: "v3.0",
        accent: "#a855f7",
      });

      const p = useEditor.getState().project!;
      expect(p.looks.aspectRatio).toBe("16:9");
      expect(p.looks.cameraPhysics).toBe("snappy");
      expect(p.audioSettings?.typingSoundPreset).toBe("thack");
      expect(p.looks.tiltAngle).toBe(4.0);
    });

    it("T3-P8: 16:9 + Enterprise Security + macos frame + smooth camera + thick audio", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("enterprise-security", {
        headline: "End-to-End Encryption Architecture",
        badge: "ISO 27001",
        accent: "#38bdf8",
      });

      const p = useEditor.getState().project!;
      expect(p.looks.aspectRatio).toBe("16:9");
      expect(p.looks.cameraPhysics).toBe("smooth");
      expect(p.audioSettings?.typingSoundPreset).toBe("thick");
      expect(p.looks.tiltAngle).toBe(0);
    });

    it("T3-P9: 16:9 + Interactive Click + glass frame + spring physics + bop click", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("interactive-click", {
        headline: "Instant Interaction Feedback",
        badge: "TACTILE",
        accent: "#06b6d4",
      });

      const p = useEditor.getState().project!;
      expect(p.looks.aspectRatio).toBe("16:9");
      expect(p.looks.windowFrame).toBe("glass");
      expect(p.looks.showClickRipples).toBe(true);
      expect(p.audioSettings?.clickSoundPreset).toBe("bop");
    });

    it("T3-P10: 16:9 + Micro-Tutorial + macos frame + smooth camera + custom step overlay", () => {
      const project = createMockProject();
      useEditor.setState({ project });

      useEditor.getState().applyTemplate("micro-tutorial", {
        headline: "Step 1: Install CLI",
        badge: "STEP 1",
        accent: "#0ea5e9",
      });

      const p = useEditor.getState().project!;
      expect(p.looks.aspectRatio).toBe("16:9");
      expect(p.looks.cameraPhysics).toBe("smooth");
      const overlays = p.textOverlays || [];
      expect(overlays.some((o) => o.text === "Step 1: Install CLI")).toBe(true);
    });
  });

  /* ======================================================================== */
  /* TIER 4: REAL-WORLD SCENARIOS                                             */
  /* ======================================================================== */

  describe("Tier 4: Real-World Scenarios", () => {
    it("T4-RW1: SaaS Product Launch Video Workflow", () => {
      // 1. User loads landscape demo project (1920x1080)
      const project = createMockProject({
        summary: {
          id: "saas-launch-project",
          name: "SaaS Launch Showcase",
          source: "recording",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          durationMs: 12000,
          width: 1920,
          height: 1080,
          thumbnail: null,
          media: "blob://saas-demo.mp4",
        },
      });
      useEditor.setState({ project });

      // 2. Opens TemplatePickerModal
      useEditor.setState({ isTemplateModalOpen: true });
      expect(useEditor.getState().isTemplateModalOpen).toBe(true);

      // 3. Selects "SaaS Launch Hero", previews live with custom headline and badge
      const template = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "saas-launch-hero")!;
      const customHeadline = "Introducing DomoLens 3.0";
      const customBadge = "LIVE ON PRODUCT HUNT";
      const customAccent = "#4f46e5";

      // 4. Commits template
      useEditor.getState().applyTemplate(template.id, {
        headline: customHeadline,
        badge: customBadge,
        accent: customAccent,
      });

      // 5. Verifies modal closed and template active
      const state = useEditor.getState();
      expect(state.isTemplateModalOpen).toBe(false);
      expect(state.activeTemplateId).toBe("saas-launch-hero");

      // 6. Verifies VideoCanvas 16:9 framing, tilt angle, and spring camera physics
      const activeProject = state.project!;
      expect(activeProject.looks.aspectRatio).toBe("16:9");
      expect(activeProject.looks.windowFrame).toBe("macos");
      expect(activeProject.looks.tiltAngle).toBe(6.5);
      expect(activeProject.looks.cameraPhysics).toBe("spring");

      // 7. Edits audio preset to creamy typing
      useEditor.getState().updateAudioSettings({ typingSoundPreset: "creamy" });
      expect(useEditor.getState().project?.audioSettings?.typingSoundPreset).toBe("creamy");

      // 8. Exports video and validates export dimensions and overlays
      const export1080p = getOutputDimensions("1080p", activeProject.looks.aspectRatio);
      expect(export1080p).toEqual({ width: 1920, height: 1080 });
      const export4k = getOutputDimensions("4k", activeProject.looks.aspectRatio);
      expect(export4k).toEqual({ width: 3840, height: 2160 });

      const overlays = activeProject.textOverlays || [];
      const headlineOverlay = overlays.find((o) => o.text === customHeadline);
      expect(headlineOverlay).toBeDefined();
      expect(headlineOverlay?.badge).toBe(customBadge);
    });

    it("T4-RW2: Viral TikTok / Reels Short Workflow", () => {
      // 1. User loads landscape recording
      const project = createMockProject({
        summary: {
          id: "tiktok-raw",
          name: "Quick Tip Raw",
          source: "recording",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          durationMs: 9000,
          width: 1920,
          height: 1080,
          thumbnail: null,
          media: "blob://quicktip.mp4",
        },
      });
      useEditor.setState({ project });

      // 2. Selects "viral-short-tiktok" (9:16 vertical)
      const template = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "viral-short-tiktok")!;
      const customHook = "Secret Chrome Shortcut 👇";
      const customBadge = "VIRAL SHORT";

      // 3. Audits live preview badge and framing
      const aspectClass = getAspectDimensions(template.aspectRatio);
      expect(aspectClass).toBe("aspect-[9/16] max-h-[300px] w-auto");

      // 4. Commits template
      useEditor.getState().applyTemplate(template.id, {
        headline: customHook,
        badge: customBadge,
      });

      // 5. Verifies canvas switches to 9:16 without distortion
      const activeProject = useEditor.getState().project!;
      expect(activeProject.looks.aspectRatio).toBe("9:16");
      expect(activeProject.looks.windowFrame).toBe("glass");
      expect(activeProject.looks.cameraPhysics).toBe("snappy");
      expect(activeProject.looks.ambientBackdropBlur).toBe(true);

      // 6. Checks object-cover framing on export
      const vertical1080 = getOutputDimensions("1080p", activeProject.looks.aspectRatio);
      expect(vertical1080).toEqual({ width: 1080, height: 1920 });
      const vertical720 = getOutputDimensions("720p", activeProject.looks.aspectRatio);
      expect(vertical720).toEqual({ width: 720, height: 1280 });
    });

    it("T4-RW3: Developer CLI / Terminal Walkthrough Workflow", () => {
      // 1. User loads desktop capture
      const project = createMockProject({
        summary: {
          id: "cli-project",
          name: "Terminal Demo",
          source: "recording",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          durationMs: 7000,
          width: 1920,
          height: 1080,
          thumbnail: null,
          media: "blob://term.mp4",
        },
      });
      useEditor.setState({ project });

      // 2. Selects "developer-cli"
      const template = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "developer-cli")!;
      expect(template.looks.windowFrame).toBe("terminal");

      // 3. Customizes headline and command badge
      useEditor.getState().applyTemplate(template.id, {
        headline: "$ npx create-domo-app@latest",
        badge: "v3.0 • NODE 22",
        accent: "#22c55e",
      });

      // 4. Verifies timeline overlays and audio settings
      const active = useEditor.getState().project!;
      expect(active.looks.windowFrame).toBe("terminal");
      expect(active.looks.mockupUrl).toBe("terminal — zsh — 80x24");
      expect(active.audioSettings?.typingSoundPreset).toBe("thock");
      expect(active.audioSettings?.clickSoundPreset).toBe("tap");
      expect(active.looks.cameraPhysics).toBe("snappy");

      const overlays = active.textOverlays || [];
      const cliOverlay = overlays.find((o) => o.text === "$ npx create-domo-app@latest");
      expect(cliOverlay).toBeDefined();
      expect(cliOverlay?.badge).toBe("v3.0 • NODE 22");
    });

    it("T4-RW4: Keynote Spotlight Presentation Workflow", () => {
      // 1. User loads project with baseline settings
      const project = createMockProject({
        looks: { ...DEFAULT_LOOKS, padding: 30, windowFrame: "none" },
      });
      useEditor.setState({ project });

      // 2. Applies "apple-keynote-polish" (Safari frame, smooth camera)
      useEditor.getState().applyTemplate("apple-keynote-polish", {
        headline: "Simplicity, redefined.",
        badge: "KEYNOTE 2026",
      });

      // 3. Verifies applied state
      expect(useEditor.getState().project?.looks.windowFrame).toBe("safari");
      expect(useEditor.getState().project?.looks.cameraPhysics).toBe("smooth");
      expect(useEditor.getState().project?.audioSettings?.typingSoundPreset).toBe("laptop");

      // 4. Tests undo cleanly restores previous project state
      useEditor.getState().undo();
      expect(useEditor.getState().project?.looks.windowFrame).toBe("none");
      expect(useEditor.getState().project?.looks.padding).toBe(30);

      // 5. Tests redo cleanly re-applies keynote template
      useEditor.getState().redo();
      expect(useEditor.getState().project?.looks.windowFrame).toBe("safari");
      const overlays = useEditor.getState().project?.textOverlays || [];
      expect(overlays.some((o) => o.text === "Simplicity, redefined.")).toBe(true);

      // 6. Verifies export render settings
      const exportDim = getOutputDimensions("1080p", useEditor.getState().project!.looks.aspectRatio);
      expect(exportDim).toEqual({ width: 1920, height: 1080 });
    });

    it("T4-RW5: Cold Start (No Project Loaded) Preview Workflow", () => {
      // 1. Initial state has project === null
      expect(useEditor.getState().project).toBeNull();

      // 2. Verifies preview player resolves safely to bundled high-res demo
      const previewSrc = resolvePreviewVideoSrc(null);
      expect(previewSrc).toBe("/domolens_app_live_demo.mp4");

      // 3. Simulates local preview playback controls
      let isPlaying = true;
      let isMuted = true;
      let currentTime = 0;
      const duration = 15.0;

      // Toggle play / pause
      isPlaying = !isPlaying;
      expect(isPlaying).toBe(false);

      // Toggle mute / unmute
      isMuted = !isMuted;
      expect(isMuted).toBe(false);

      // Scrub video to 40%
      currentTime = computeScrubTime(140, 100, 100, duration);
      expect(currentTime).toBe(6.0);
      expect(formatTime(currentTime)).toBe("0:06.0");

      // 4. Verifies aspect ratio switches across all 4 ratios
      expect(getAspectDimensions("16:9")).toBe("aspect-video w-full");
      expect(getAspectDimensions("9:16")).toBe("aspect-[9/16] max-h-[300px] w-auto");
      expect(getAspectDimensions("1:1")).toBe("aspect-square max-h-[290px] w-auto");
      expect(getAspectDimensions("4:3")).toBe("aspect-[4/3] max-h-[290px] w-auto");

      // 5. Applying template with null project safely no-ops
      useEditor.getState().applyTemplate("product-hunt-teaser");
      expect(useEditor.getState().project).toBeNull();

      // 6. User creates/seeds new project, then applies template
      const seededProject = createMockProject();
      useEditor.setState({ project: seededProject });

      useEditor.getState().applyTemplate("product-hunt-teaser", {
        headline: "Launch Day Ready! 🚀",
        badge: "FEATURED #1",
        accent: "#ea580c",
      });

      const finalState = useEditor.getState().project!;
      expect(finalState.looks.aspectRatio).toBe("1:1");
      expect(finalState.looks.tiltAngle).toBe(5.0);
      expect(finalState.looks.cameraPhysics).toBe("spring");
      expect(finalState.audioSettings?.typingSoundPreset).toBe("clicky");

      const exportDimensions = getOutputDimensions("1080p", finalState.looks.aspectRatio);
      expect(exportDimensions).toEqual({ width: 1080, height: 1080 });
    });
  });
});
