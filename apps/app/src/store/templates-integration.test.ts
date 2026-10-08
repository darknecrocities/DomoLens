import { beforeEach, describe, expect, it } from "vitest";
import { useEditor } from "./editor";
import { useProjects } from "./projects";
import {
  STUDIO_MOTION_TEMPLATES,
  evaluateCameraPhysicsProgress,
  type ProjectSummary,
} from "@domolens/core";

const mockSummary: ProjectSummary = {
  id: "proj-template-test",
  name: "Template Test Project",
  source: "recording",
  createdAt: 1000,
  updatedAt: 1000,
  durationMs: 8000,
  width: 1920,
  height: 1080,
  thumbnail: null,
  media: "blob://video",
};

describe("Motion Templates Live Application & Synchronization Integration Tests", () => {
  beforeEach(async () => {
    useProjects.setState({ projects: [mockSummary] });
    await useEditor.getState().loadProject("proj-template-test");

    // Add initial base text overlay to verify preservation
    const state = useEditor.getState();
    if (state.project) {
      useEditor.setState({
        project: {
          ...state.project,
          textOverlays: [
            {
              id: "initial-text-1",
              text: "Original Text",
              startTimeMs: 0,
              durationMs: 3000,
              x: 0.5,
              y: 0.2,
              fontSize: 24,
              color: "#ffffff",
            },
          ],
        },
        history: [],
        future: [],
      });
    }
  });

  it("applies a template with customFields atomically into project looks, audio and textOverlays", () => {
    const tpl = STUDIO_MOTION_TEMPLATES.find((t) => t.id === "saas-launch-hero")!;
    expect(tpl).toBeDefined();

    useEditor.getState().applyTemplate("saas-launch-hero", {
      headline: "Custom SaaS Headline",
      badge: "EXCLUSIVE",
      accent: "#a855f7",
    });

    const state = useEditor.getState();
    expect(state.activeTemplateId).toBe("saas-launch-hero");
    expect(state.project?.looks.brandAccentColor).toBe("#a855f7");
    expect(state.project?.looks.windowFrame).toBe(tpl.looks.windowFrame);
    expect(state.project?.looks.cameraPhysics).toBe(tpl.looks.cameraPhysics);
    expect(state.project?.audioSettings?.typingSoundPreset).toBe(tpl.audioSettings.typingSoundPreset);

    // Text overlays should contain the customized headline and badge
    const templateOverlays = state.project?.textOverlays?.filter((o) => o.id.startsWith("text-tpl-"));
    expect(templateOverlays).toBeDefined();
    expect(templateOverlays!.length).toBeGreaterThan(0);
    expect(templateOverlays![0]?.text).toBe("Custom SaaS Headline");
    expect(templateOverlays![0]?.badge).toBe("EXCLUSIVE");

    // Pre-existing non-template overlays should be preserved
    expect(state.project?.textOverlays?.some((o) => o.id === "initial-text-1")).toBe(true);
  });

  it("restores exact prior state on a single undo action", () => {
    const originalAccent = useEditor.getState().project?.looks.brandAccentColor;

    useEditor.getState().applyTemplate("developer-cli", {
      headline: "Terminal Showcase",
      badge: "V1.0",
      accent: "#22c55e",
    });

    expect(useEditor.getState().project?.looks.brandAccentColor).toBe("#22c55e");
    expect(useEditor.getState().activeTemplateId).toBe("developer-cli");

    // Trigger single Undo
    useEditor.getState().undo();

    const restoredState = useEditor.getState();
    expect(restoredState.project?.looks.brandAccentColor).toBe(originalAccent);
    expect(restoredState.project?.textOverlays?.some((o) => o.id.startsWith("text-tpl-"))).toBe(false);
    expect(restoredState.project?.textOverlays?.some((o) => o.id === "initial-text-1")).toBe(true);
  });

  it("correctly sets non-16:9 vertical (9:16) aspect ratio for social reel templates", () => {
    useEditor.getState().applyTemplate("viral-short-tiktok", {
      headline: "Watch This Trick",
      badge: "VIRAL",
    });

    const state = useEditor.getState();
    expect(state.project?.looks.aspectRatio).toBe("9:16");
    expect(state.project?.looks.windowFrame).toBe("glass");
  });

  it("correctly sets 1:1 square aspect ratio for Product Hunt teaser templates", () => {
    useEditor.getState().applyTemplate("product-hunt-teaser", {
      headline: "Live on Product Hunt",
      badge: "LAUNCH",
    });

    const state = useEditor.getState();
    expect(state.project?.looks.aspectRatio).toBe("1:1");
    expect(state.project?.audioSettings?.typingSoundPreset).toBe("clicky");
  });

  it("evaluates camera physics progress curves accurately across presets", () => {
    // Smooth easeInOutCubic midpoint
    const smoothMid = evaluateCameraPhysicsProgress(0.5, "smooth");
    expect(smoothMid).toBeCloseTo(0.5, 2);

    // Snappy starts fast
    const snappyEarly = evaluateCameraPhysicsProgress(0.2, "snappy");
    expect(snappyEarly).toBeGreaterThan(0.2);

    // Linear
    const linearMid = evaluateCameraPhysicsProgress(0.5, "linear");
    expect(linearMid).toBe(0.5);

    // Endpoints always clamp [0, 1]
    expect(evaluateCameraPhysicsProgress(0, "spring")).toBe(0);
    expect(evaluateCameraPhysicsProgress(1, "spring")).toBe(1);
    expect(evaluateCameraPhysicsProgress(0, "snappy")).toBe(0);
    expect(evaluateCameraPhysicsProgress(1, "snappy")).toBe(1);
  });

  it("reflects template motion onto keyframes and zoom blocks upon application", () => {
    useEditor.getState().applyTemplate("saas-launch-hero");

    const state = useEditor.getState();
    expect(state.project?.keyframes).toBeDefined();
    expect(state.project?.keyframes?.length).toBeGreaterThanOrEqual(3);
    expect(state.project?.zoomBlocks?.length).toBeGreaterThanOrEqual(1);

    // Opening camera move reflects template physics
    const firstKf = state.project?.keyframes?.[0];
    const punchKf = state.project?.keyframes?.[1];
    expect(firstKf?.timeMs).toBe(0);
    expect(firstKf?.scale).toBe(1.0);
    expect(punchKf?.scale).toBeGreaterThan(1.0);
    expect(punchKf?.easing).toBe("spring");
    expect(punchKf?.soundPreset).toBe("bop");
  });
});
