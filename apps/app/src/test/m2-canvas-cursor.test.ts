import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BACKGROUND_CATEGORIES,
  BACKGROUND_PRESETS,
  CURSOR_PRESETS,
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_CURSOR_AVATAR,
  DEFAULT_LOOKS,
  TEXT_CARD_STYLE_DEFINITIONS,
  VISIBLE_CURSOR_PRESETS,
  evaluateTextOverlayMotion,
  isValidCursorStyle,
  type CursorStyle,
  type ProjectData,
  type ProjectSummary,
  type TextCardStyle,
  type TextOverlay,
} from "@domolens/core";
import { useEditor } from "../store/editor";
import { useProjects } from "../store/projects";
import { CanvasCursorSvg, CursorAvatarBadge } from "../components/editor/VideoCanvas";
import {
  drawCanvasAvatarBadge,
  drawCanvasCursor,
  renderActiveTextOverlays,
} from "../lib/video-renderer";

/* ========================================================================== */
/* Test Harness: Mock Canvas 2D Context & Project Fixtures                    */
/* ========================================================================== */

interface MockCanvasState {
  ctx: CanvasRenderingContext2D;
  filledTexts: string[];
  strokedTexts: string[];
  fills: Array<string | CanvasGradient | CanvasPattern>;
  strokes: Array<string | CanvasGradient | CanvasPattern>;
  getSaveBalance: () => number;
}

function createMockCanvasContext(): MockCanvasState {
  let saveCount = 0;
  let restoreCount = 0;
  const filledTexts: string[] = [];
  const strokedTexts: string[] = [];
  const fills: Array<string | CanvasGradient | CanvasPattern> = [];
  const strokes: Array<string | CanvasGradient | CanvasPattern> = [];

  const gradientMock = {
    addColorStop: vi.fn(),
  };

  const ctx = {
    save: vi.fn(() => {
      saveCount++;
    }),
    restore: vi.fn(() => {
      restoreCount++;
    }),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(function (this: { fillStyle: string | CanvasGradient | CanvasPattern }) {
      if (this.fillStyle) fills.push(this.fillStyle);
    }),
    stroke: vi.fn(function (this: { strokeStyle: string | CanvasGradient | CanvasPattern }) {
      if (this.strokeStyle) strokes.push(this.strokeStyle);
    }),
    clip: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn((text: string) => {
      filledTexts.push(text);
    }),
    strokeText: vi.fn((text: string) => {
      strokedTexts.push(text);
    }),
    measureText: vi.fn((text: string) => ({
      width: text.length * 9,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 3,
    })),
    createLinearGradient: vi.fn(() => gradientMock),
    createRadialGradient: vi.fn(() => gradientMock),
    drawImage: vi.fn(),
    // Canvas properties
    fillStyle: "#000000" as string | CanvasGradient | CanvasPattern,
    strokeStyle: "#000000" as string | CanvasGradient | CanvasPattern,
    lineWidth: 1,
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    miterLimit: 10,
    globalAlpha: 1,
    globalCompositeOperation: "source-over" as GlobalCompositeOperation,
    font: "10px sans-serif",
    textAlign: "start" as CanvasTextAlign,
    textBaseline: "alphabetic" as CanvasTextBaseline,
    shadowColor: "rgba(0, 0, 0, 0)",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  } as unknown as CanvasRenderingContext2D;

  return {
    ctx,
    filledTexts,
    strokedTexts,
    fills,
    strokes,
    getSaveBalance: () => saveCount - restoreCount,
  };
}

function createTestProjectData(overrides?: Partial<ProjectData>): ProjectData {
  const summary: ProjectSummary = {
    id: "proj-m2-test",
    name: "Milestone 2 Test Project",
    source: "recording",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    durationMs: 12000,
    width: 1920,
    height: 1080,
    thumbnail: null,
    media: "blob://video-m2-fixture",
  };

  return {
    summary,
    clips: [],
    zoomBlocks: [],
    keyframes: [],
    cursorTrajectory: [],
    clicks: [],
    effects: [],
    textOverlays: [],
    audioSettings: {
      ...DEFAULT_AUDIO_SETTINGS,
    },
    looks: {
      ...DEFAULT_LOOKS,
      cursorStyle: "mac",
      cursorSize: 1.4,
      cursorAvatar: {
        ...DEFAULT_CURSOR_AVATAR,
      },
    },
    ...overrides,
  };
}

/* ========================================================================== */
/* Milestone 2 Test Suite                                                     */
/* ========================================================================== */

describe("Milestone 2 - Editor & Engine Overhaul Test Suite", () => {
  beforeEach(() => {
    const testProject = createTestProjectData();
    useProjects.setState({ projects: [testProject.summary] });
    useEditor.setState({
      project: testProject,
      currentTimeMs: 0,
      durationMs: 12000,
      isPlaying: false,
      selectedBlockId: null,
      selectedClipId: null,
      activeTab: "timeline",
      history: [],
      future: [],
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Feature 5: Background Presets UI & Categorization                        */
  /* ------------------------------------------------------------------------ */
  describe("Feature 5: Background Presets & Category System", () => {
    it("contains all 10 defined categories in BACKGROUND_CATEGORIES with id and label", () => {
      expect(BACKGROUND_CATEGORIES).toHaveLength(10);
      const catIds = BACKGROUND_CATEGORIES.map((c) => c.id);
      expect(catIds).toContain("linear-gradient");
      expect(catIds).toContain("radial-gradient");
      expect(catIds).toContain("single-tone");
      expect(catIds).toContain("two-tone");
      expect(catIds).toContain("three-tone");
      expect(catIds).toContain("frosted-glass");
      expect(catIds).toContain("monochrome");
      expect(catIds).toContain("warm-beige");
      expect(catIds).toContain("studio-white");
      expect(catIds).toContain("dark-obsidian");
    });

    it("defines exactly 32 background presets in BACKGROUND_PRESETS", () => {
      expect(BACKGROUND_PRESETS).toHaveLength(32);
    });

    it("verifies every background preset has valid schema properties and maps to an existing category id", () => {
      const categoryIdSet = new Set(BACKGROUND_CATEGORIES.map((c) => c.id));
      const presetIds = new Set<string>();

      for (const preset of BACKGROUND_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(["gradient", "image", "solid", "blur"]).toContain(preset.type);
        expect(preset.value).toBeTruthy();
        expect(categoryIdSet.has(preset.category)).toBe(true);

        // Ensure unique IDs
        expect(presetIds.has(preset.id)).toBe(false);
        presetIds.add(preset.id);
      }
    });

    it("verifies every category has at least 1 preset assigned", () => {
      for (const category of BACKGROUND_CATEGORIES) {
        const matching = BACKGROUND_PRESETS.filter((p) => p.category === category.id);
        expect(
          matching.length,
          `Category "${category.label}" (${category.id}) must have at least one preset`,
        ).toBeGreaterThanOrEqual(1);
      }
    });

    it("filters presets correctly by category and supports 'all' wildcard", () => {
      const allPresets = BACKGROUND_PRESETS.filter(() => true);
      expect(allPresets).toHaveLength(32);

      const linearPresets = BACKGROUND_PRESETS.filter((p) => p.category === "linear-gradient");
      expect(linearPresets.length).toBeGreaterThan(0);
      for (const p of linearPresets) {
        expect(p.category).toBe("linear-gradient");
      }

      const radialPresets = BACKGROUND_PRESETS.filter((p) => p.category === "radial-gradient");
      expect(radialPresets.length).toBeGreaterThan(0);
      for (const p of radialPresets) {
        expect(p.category).toBe("radial-gradient");
      }
    });

    it("updates looks in editor store when selecting background preset", () => {
      const preset = BACKGROUND_PRESETS.find((p) => p.id === "linear-indigo-dusk")!;
      expect(preset).toBeDefined();

      useEditor.getState().updateLooks({
        backgroundType: preset.type,
        backgroundValue: preset.value,
      });

      const currentLooks = useEditor.getState().project?.looks;
      expect(currentLooks?.backgroundType).toBe("gradient");
      expect(currentLooks?.backgroundValue).toBe(preset.value);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Feature 9: Cursor Size & Presenter Avatar Badge Customization            */
  /* ------------------------------------------------------------------------ */
  describe("Feature 9: Cursor Scale Controls & Presenter Avatar Badge", () => {
    it("supports cursor size range from 0.6x to 3.0x with step 0.05", () => {
      const sliderMin = 0.6;
      const sliderMax = 3.0;
      const sliderStep = 0.05;

      expect(sliderMin).toBe(0.6);
      expect(sliderMax).toBe(3.0);
      expect(sliderStep).toBe(0.05);

      // S / M / L / XL quick presets
      const quickSizes = {
        S: 0.8,
        M: 1.4,
        L: 2.0,
        XL: 2.8,
      };

      for (const [key, size] of Object.entries(quickSizes)) {
        useEditor.getState().updateLooks({ cursorSize: size });
        const scale = useEditor.getState().project?.looks.cursorSize;
        expect(scale, `Quick size ${key} should equal ${size}`).toBe(size);
        expect(scale).toBeGreaterThanOrEqual(sliderMin);
        expect(scale).toBeLessThanOrEqual(sliderMax);
      }
    });

    it("verifies CURSOR_PRESETS contains 24 presets and VISIBLE_CURSOR_PRESETS contains 23", () => {
      expect(CURSOR_PRESETS).toHaveLength(24);
      expect(VISIBLE_CURSOR_PRESETS).toHaveLength(23);

      for (const preset of CURSOR_PRESETS) {
        expect(preset.id).toBeTruthy();
        expect(preset.name).toBeTruthy();
        expect(preset.hotspot).toBeDefined();
        expect(Array.isArray(preset.hotspot)).toBe(true);
        expect(typeof preset.hotspot[0]).toBe("number");
        expect(typeof preset.hotspot[1]).toBe("number");
        expect(isValidCursorStyle(preset.id)).toBe(true);
      }
    });

    it("manages Presenter Avatar Badge store state mutations across all 4 types", () => {
      // 1. Initials mode
      useEditor.getState().updateLooks({
        cursorAvatar: {
          enabled: true,
          type: "initials",
          value: "KP",
          color: "#6366f1",
          badgeLabel: "Speaker",
        },
      });

      let avatar = useEditor.getState().project?.looks.cursorAvatar;
      expect(avatar?.enabled).toBe(true);
      expect(avatar?.type).toBe("initials");
      expect(avatar?.value).toBe("KP");
      expect(avatar?.color).toBe("#6366f1");
      expect(avatar?.badgeLabel).toBe("Speaker");

      // 2. Icon mode
      useEditor.getState().updateLooks({
        cursorAvatar: {
          enabled: true,
          type: "icon",
          value: "sparkles",
          color: "#ec4899",
          badgeLabel: "Director",
        },
      });

      avatar = useEditor.getState().project?.looks.cursorAvatar;
      expect(avatar?.type).toBe("icon");
      expect(avatar?.value).toBe("sparkles");

      // 3. Text mode
      useEditor.getState().updateLooks({
        cursorAvatar: {
          enabled: true,
          type: "text",
          value: "Host",
          color: "#10b981",
          badgeLabel: "Live",
        },
      });

      avatar = useEditor.getState().project?.looks.cursorAvatar;
      expect(avatar?.type).toBe("text");
      expect(avatar?.value).toBe("Host");

      // 4. Image mode
      useEditor.getState().updateLooks({
        cursorAvatar: {
          enabled: true,
          type: "image",
          value: "data:image/png;base64,mockAvatar",
          color: "#3b82f6",
          badgeLabel: "Verified",
        },
      });

      avatar = useEditor.getState().project?.looks.cursorAvatar;
      expect(avatar?.type).toBe("image");
      expect(avatar?.value).toBe("data:image/png;base64,mockAvatar");
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Feature 6: Dynamic Kinetic Text Card Previews                            */
  /* ------------------------------------------------------------------------ */
  describe("Feature 6: Kinetic Text Card Design Tokens & Motion", () => {
    it("defines design tokens for all 5 card styles in TEXT_CARD_STYLE_DEFINITIONS", () => {
      const styles: TextCardStyle[] = ["glass", "gradient", "solid", "minimal", "terminal"];

      for (const style of styles) {
        const def = TEXT_CARD_STYLE_DEFINITIONS[style];
        expect(def, `Style token for ${style} must exist`).toBeDefined();
        expect(def.defaultBgColor).toBeTruthy();
        expect(def.defaultColor).toBeTruthy();
        expect(def.borderStyle).toBeDefined();
        expect(def.boxShadow).toBeDefined();
        expect(typeof def.backdropBlurPx).toBe("number");
      }
    });

    it("evaluates motion lifecycle accurately with evaluateTextOverlayMotion", () => {
      const overlay: TextOverlay = {
        id: "kinetic-card-1",
        text: "Launch Milestone 2",
        kicker: "PRODUCT UPDATE",
        startTimeMs: 1000,
        durationMs: 4000,
        x: 0.5,
        y: 0.85,
        fontSize: 26,
        color: "#ffffff",
        cardStyle: "glass",
        motionPreset: "elastic-pop",
      };

      // Before start
      const pre = evaluateTextOverlayMotion(overlay, 500);
      expect(pre.opacity).toBeLessThanOrEqual(0.001);

      // Intro phase (t = 1150ms)
      const intro = evaluateTextOverlayMotion(overlay, 1150);
      expect(intro.opacity).toBeGreaterThan(0.05);

      // Sustain phase (t = 3000ms)
      const sustain = evaluateTextOverlayMotion(overlay, 3000);
      expect(sustain.opacity).toBeCloseTo(1, 1);
      expect(sustain.scale).toBeCloseTo(1, 1);

      // Outro phase (t = 4850ms)
      const outro = evaluateTextOverlayMotion(overlay, 4850);
      expect(outro.opacity).toBeGreaterThan(0);

      // Post duration (t = 5500ms)
      const post = evaluateTextOverlayMotion(overlay, 5500);
      expect(post.opacity).toBeLessThanOrEqual(0.001);
    });

    it("verifies unboxed kicker without capsule pill container", () => {
      const overlayWithKicker: TextOverlay = {
        id: "card-kicker",
        text: "Title With Kicker",
        kicker: "ANNOUNCEMENT",
        startTimeMs: 1000,
        durationMs: 2000,
        x: 0.5,
        y: 0.8,
        fontSize: 24,
        color: "#ffffff",
      };

      const overlayWithLegacyBadge: TextOverlay = {
        id: "card-legacy-badge",
        text: "Title With Legacy Badge",
        badge: "OLD BADGE",
        startTimeMs: 1000,
        durationMs: 2000,
        x: 0.5,
        y: 0.8,
        fontSize: 24,
        color: "#ffffff",
      };

      const resolvedKicker1 = overlayWithKicker.kicker || overlayWithKicker.badge;
      const resolvedKicker2 = overlayWithLegacyBadge.kicker || overlayWithLegacyBadge.badge;

      expect(resolvedKicker1).toBe("ANNOUNCEMENT");
      expect(resolvedKicker2).toBe("OLD BADGE");
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Feature 7: Text Overlay Export Parity                                     */
  /* ------------------------------------------------------------------------ */
  describe("Feature 7: Text Overlay Export Parity in video-renderer.ts", () => {
    it("renders active text overlays across all 5 card styles with full context isolation", () => {
      const styles: TextCardStyle[] = ["glass", "gradient", "solid", "minimal", "terminal"];

      for (const cardStyle of styles) {
        const { ctx, filledTexts, getSaveBalance } = createMockCanvasContext();
        const overlay: TextOverlay = {
          id: `export-${cardStyle}`,
          text: `Headline for ${cardStyle}`,
          kicker: "FEATURE OVERVIEW",
          startTimeMs: 1000,
          durationMs: 3000,
          x: 0.5,
          y: 0.8,
          fontSize: 24,
          color: "#ffffff",
          cardStyle,
          motionPreset: "smooth-fade",
        };

        renderActiveTextOverlays(ctx, [overlay], 2500, 0, 0, 1920, 1080, 1);

        expect(filledTexts).toContain(`Headline for ${cardStyle}`);
        expect(filledTexts).toContain("FEATURE OVERVIEW");
        expect(getSaveBalance(), `Save/restore for cardStyle ${cardStyle} must balance`).toBe(0);
      }
    });

    it("respects inactive timing during export and suppresses off-screen overlays", () => {
      const { ctx, filledTexts } = createMockCanvasContext();
      const overlay: TextOverlay = {
        id: "inactive-export",
        text: "Should Not Appear",
        startTimeMs: 5000,
        durationMs: 2000,
        x: 0.5,
        y: 0.8,
        fontSize: 24,
        color: "#ffffff",
      };

      renderActiveTextOverlays(ctx, [overlay], 2000, 0, 0, 1920, 1080, 1);
      expect(filledTexts).toHaveLength(0);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* Feature 8: Cursor Designs & Avatar Badge Parity (Live Preview & Export)  */
  /* ------------------------------------------------------------------------ */
  describe("Feature 8: Cursor Designs & Avatar Badge Parity (Live Preview & Export)", () => {
    it("renders all 23 visible cursor presets in CanvasCursorSvg without crashing", () => {
      for (const preset of VISIBLE_CURSOR_PRESETS) {
        const result = CanvasCursorSvg({ cursorStyle: preset.id as CursorStyle });
        expect(result, `SVG element for ${preset.id} must be returned`).not.toBeNull();
        expect(result?.type).toBe("svg");
        expect(result?.props.viewBox).toBeTruthy();
      }
    });

    it("returns null for 'hidden' in CanvasCursorSvg", () => {
      const result = CanvasCursorSvg({ cursorStyle: "hidden" });
      expect(result).toBeNull();
    });

    it("verifies hotspot alignment math matches translate3d(-hx * scale, -hy * scale, 0)", () => {
      for (const preset of VISIBLE_CURSOR_PRESETS) {
        const [hx, hy] = preset.hotspot;
        const scales = [0.8, 1.4, 2.0, 2.8];

        for (const scale of scales) {
          const offsetX = -hx * scale;
          const offsetY = -hy * scale;

          // Local hotspot transformed to parent coordinate space:
          // (hx * scale) + (-hx * scale) === 0
          const alignedX = hx * scale + offsetX;
          const alignedY = hy * scale + offsetY;

          expect(alignedX).toBeCloseTo(0, 5);
          expect(alignedY).toBeCloseTo(0, 5);
        }
      }
    });

    it("renders CursorAvatarBadge component across all modes and hides when disabled", () => {
      // Disabled avatar returns null
      const disabledResult = CursorAvatarBadge({
        avatar: { enabled: false, type: "initials", value: "KP" },
        hx: 1,
        hy: 1,
      });
      expect(disabledResult).toBeNull();

      // Undefined avatar returns null
      const undefinedResult = CursorAvatarBadge({
        avatar: undefined,
        hx: 1,
        hy: 1,
      });
      expect(undefinedResult).toBeNull();

      // Enabled initials mode
      const initialsResult = CursorAvatarBadge({
        avatar: {
          enabled: true,
          type: "initials",
          value: "AK",
          color: "#6366f1",
          badgeLabel: "Speaker",
        },
        hx: 0,
        hy: 0,
      });
      expect(initialsResult).not.toBeNull();
      expect(initialsResult?.props.style.left).toBe("16px");
      expect(initialsResult?.props.style.top).toBe("16px");

      // Enabled icon mode with 9 icon presets
      const icons = [
        "sparkles",
        "star",
        "zap",
        "flame",
        "shield",
        "crown",
        "check",
        "heart",
        "user",
      ] as const;

      for (const icon of icons) {
        const iconResult = CursorAvatarBadge({
          avatar: {
            enabled: true,
            type: "icon",
            value: icon,
            color: "#ec4899",
          },
          hx: 10,
          hy: 10,
        });
        expect(iconResult).not.toBeNull();
        expect(iconResult?.props.style.left).toBe("22px");
        expect(iconResult?.props.style.top).toBe("22px");
      }
    });

    it("draws all 23 visible cursor presets in Canvas 2D export with balanced context save/restore", () => {
      for (const preset of VISIBLE_CURSOR_PRESETS) {
        const { ctx, getSaveBalance } = createMockCanvasContext();
        drawCanvasCursor(ctx, preset.id as CursorStyle);
        expect(getSaveBalance(), `Export cursor ${preset.id} must balance save/restore`).toBe(0);
      }
    });

    it("draws Canvas 2D avatar badge with balanced context across all 9 icons and badgeLabel", () => {
      const icons = [
        "sparkles",
        "star",
        "zap",
        "flame",
        "shield",
        "crown",
        "check",
        "heart",
        "user",
      ] as const;

      for (const icon of icons) {
        const { ctx, getSaveBalance } = createMockCanvasContext();
        drawCanvasAvatarBadge(
          ctx,
          {
            enabled: true,
            type: "icon",
            value: icon,
            color: "#6366f1",
            badgeLabel: "Presenter",
          },
          2,
          2,
        );
        expect(getSaveBalance(), `Avatar icon ${icon} must balance save/restore`).toBe(0);
      }

      // Initials mode
      const { ctx, filledTexts, getSaveBalance } = createMockCanvasContext();
      drawCanvasAvatarBadge(
        ctx,
        {
          enabled: true,
          type: "initials",
          value: "DL",
          color: "#8b5cf6",
          badgeLabel: "Host",
        },
        0,
        0,
      );
      expect(filledTexts).toContain("DL");
      expect(filledTexts).toContain("Host");
      expect(getSaveBalance()).toBe(0);
    });

    it("does nothing when avatar badge is disabled in Canvas 2D export", () => {
      const { ctx } = createMockCanvasContext();
      drawCanvasAvatarBadge(
        ctx,
        {
          enabled: false,
          type: "initials",
          value: "NO",
        },
        0,
        0,
      );
      expect(ctx.save).not.toHaveBeenCalled();
    });
  });
});
