import { beforeEach, describe, expect, it } from "vitest";
import { useEditor } from "./editor";
import { useProjects } from "./projects";
import type { ProjectSummary } from "@domolens/core";

describe("useEditor store", () => {
  const mockSummary: ProjectSummary = {
    id: "proj-test",
    name: "Test Recording",
    source: "recording",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    durationMs: 8000,
    width: 1920,
    height: 1080,
    thumbnail: null,
    media: "blob://video",
  };

  beforeEach(() => {
    useProjects.setState({ projects: [mockSummary] });
    useEditor.setState({
      project: null,
      currentTimeMs: 0,
      durationMs: 0,
      isPlaying: false,
      selectedBlockId: null,
      selectedClipId: null,
      activeTab: "timeline",
      history: [],
      future: [],
    });
  });

  it("loads a project into the editor", async () => {
    const ok = await useEditor.getState().loadProject("proj-test");
    expect(ok).toBe(true);

    const state = useEditor.getState();
    expect(state.project).not.toBeNull();
    expect(state.project?.summary.id).toBe("proj-test");
    expect(state.durationMs).toBe(8000);
    expect(state.project?.zoomBlocks.length).toBeGreaterThan(0);
  });

  it("scrubs current time with clamping", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.getState().setCurrentTime(2500);
    expect(useEditor.getState().currentTimeMs).toBe(2500);

    // Negative clamp
    useEditor.getState().setCurrentTime(-500);
    expect(useEditor.getState().currentTimeMs).toBe(0);

    // Overflow clamp
    useEditor.getState().setCurrentTime(99999);
    expect(useEditor.getState().currentTimeMs).toBe(8000);
  });

  it("toggles play state", () => {
    expect(useEditor.getState().isPlaying).toBe(false);
    useEditor.getState().togglePlay();
    expect(useEditor.getState().isPlaying).toBe(true);
    useEditor.getState().togglePlay();
    expect(useEditor.getState().isPlaying).toBe(false);
  });

  it("updates and toggles zoom blocks with undo support", async () => {
    await useEditor.getState().loadProject("proj-test");
    const firstBlockId = useEditor.getState().project!.zoomBlocks[0]!.id;

    useEditor.getState().updateZoomBlock(firstBlockId, { scale: 2.2 });
    expect(useEditor.getState().project!.zoomBlocks[0]!.scale).toBe(2.2);
    expect(useEditor.getState().history.length).toBe(1);

    // Test undo
    useEditor.getState().undo();
    expect(useEditor.getState().project!.zoomBlocks[0]!.scale).not.toBe(2.2);

    // Test redo
    useEditor.getState().redo();
    expect(useEditor.getState().project!.zoomBlocks[0]!.scale).toBe(2.2);
  });

  it("updates looks styling", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.getState().updateLooks({ padding: 48, borderRadius: 24 });
    expect(useEditor.getState().project!.looks.padding).toBe(48);
    expect(useEditor.getState().project!.looks.borderRadius).toBe(24);
  });

  it("plots interactions into keyframes and zoom blocks with 2-3s hold and no end bunching", async () => {
    await useEditor.getState().loadProject("proj-test");
    // Add a phantom click at the tail end (e.g. at 8000ms in an 8000ms video)
    useEditor.setState((s) => ({
      project: s.project ? {
        ...s.project,
        clicks: [
          { id: "c-mid", timestampMs: 2500, x: 0.3, y: 0.4, button: "left" },
          { id: "c-stop", timestampMs: 8000, x: 0.9, y: 0.9, button: "left" },
        ],
        interactions: [
          { id: "c-mid", type: "click", timestampMs: 2500, x: 0.3, y: 0.4, button: "left" },
          { id: "c-stop", type: "click", timestampMs: 8000, x: 0.9, y: 0.9, button: "left" },
        ],
      } : null,
    }));

    useEditor.getState().plotInteractions({ holdDurationMs: 2400, scale: 2.0 });

    const state = useEditor.getState();
    expect(state.project?.keyframes).toBeDefined();
    expect(state.project?.keyframes!.length).toBeGreaterThanOrEqual(4);
    expect(state.project?.zoomBlocks.length).toBe(1);

    // Verify keyframes are strictly ordered and not clustered at 8000ms
    const keyframes = state.project!.keyframes!;
    for (let i = 0; i < keyframes.length - 1; i++) {
      expect(keyframes[i]!.timeMs).toBeLessThan(keyframes[i + 1]!.timeMs);
    }
    // Zoom block starts around mid-click (2200ms)
    expect(state.project?.zoomBlocks[0]?.startTimeMs).toBe(2200);

    // Clear keyframes and zoom blocks
    useEditor.getState().clearKeyframes();
    expect(useEditor.getState().project?.keyframes).toHaveLength(0);

    useEditor.getState().clearZoomBlocks();
    expect(useEditor.getState().project?.zoomBlocks).toHaveLength(0);
  });

  it("adds, edits, and removes keyframes and text overlays", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.getState().setCurrentTime(1500);

    // Keyframe
    useEditor.getState().addKeyframeAtCurrentTime(2.1, 0.4, 0.6);
    expect(useEditor.getState().project?.keyframes?.some((kf) => kf.timeMs === 1500)).toBe(true);
    const addedKf = useEditor.getState().project?.keyframes?.find((kf) => kf.timeMs === 1500)!;
    useEditor.getState().updateKeyframe(addedKf.id, { scale: 2.5 });
    expect(useEditor.getState().project?.keyframes?.find((kf) => kf.id === addedKf.id)!.scale).toBe(2.5);
    useEditor.getState().deleteKeyframe(addedKf.id);
    expect(useEditor.getState().project?.keyframes?.some((kf) => kf.id === addedKf.id)).toBe(false);

    // Text Overlay
    useEditor.getState().addTextOverlay("Click the Submit button");
    expect(useEditor.getState().project?.textOverlays?.length).toBeGreaterThan(0);
    const textId = useEditor.getState().selectedTextId!;
    useEditor.getState().updateTextOverlay(textId, { text: "Updated Caption" });
    expect(useEditor.getState().project?.textOverlays?.find((t) => t.id === textId)!.text).toBe("Updated Caption");
    useEditor.getState().deleteTextOverlay(textId);
    expect(useEditor.getState().project?.textOverlays?.some((t) => t.id === textId)).toBe(false);
  });

  it("adds and manages audio tracks", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.getState().addAudioTrack("Lo-Fi Groove", "sample://music.mp3", "music");
    expect(useEditor.getState().project?.audioTracks?.some((a) => a.name === "Lo-Fi Groove")).toBe(true);
  });

  it("handles LLM AI Director messaging and action triggers", async () => {
    await useEditor.getState().loadProject("proj-test");
    await useEditor.getState().sendLlmMessage("Please auto-plot zooms on clicks");
    const msgs = useEditor.getState().llmMessages;
    expect(msgs.length).toBeGreaterThan(1);
    expect(msgs[msgs.length - 1]!.role).toBe("assistant");
    expect(msgs[msgs.length - 1]!.actions?.length).toBeGreaterThan(0);

    // Execute attached action
    useEditor.getState().executeLlmAction("plot_zooms");
    expect(useEditor.getState().project?.zoomBlocks.length).toBeGreaterThan(0);
  });
});
