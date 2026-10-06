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

  it("loads a project into the editor with empty defaults for new recordings", async () => {
    const ok = await useEditor.getState().loadProject("proj-test");
    expect(ok).toBe(true);

    const state = useEditor.getState();
    expect(state.project).not.toBeNull();
    expect(state.project?.summary.id).toBe("proj-test");
    expect(state.durationMs).toBe(8000);
    expect(state.project?.zoomBlocks.length).toBe(0);
    expect(state.project?.keyframes?.length ?? 0).toBe(0);
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
    await useEditor.getState().loadProject("demo-saas");
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
    // Zoom block starts 0.5s before mid-click (2500ms - 500ms = 2000ms)
    expect(state.project?.zoomBlocks[0]?.startTimeMs).toBe(2000);

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

  it("shifts camera target dynamically on interactive canvas click", async () => {
    await useEditor.getState().loadProject("demo-saas");

    // Case 1: When playhead is inside an active zoom block
    const activeBlock = useEditor.getState().project!.zoomBlocks[0]!;
    useEditor.getState().setCurrentTime(activeBlock.startTimeMs + 200);

    // Shift camera target to (0.2, 0.8)
    useEditor.getState().shiftCameraTarget(0.2, 0.8);

    const updatedBlock = useEditor.getState().project!.zoomBlocks.find((b) => b.id === activeBlock.id)!;
    expect(updatedBlock.targetX).toBeLessThan(0.35);
    expect(updatedBlock.targetY).toBeGreaterThan(0.65);

    // Case 2: When an explicit keyframe is selected
    const kf = useEditor.getState().project!.keyframes![0]!;
    useEditor.getState().selectKeyframe(kf.id);
    useEditor.getState().shiftCameraTarget(0.7, 0.3);

    const updatedKf = useEditor.getState().project!.keyframes!.find((k) => k.id === kf.id)!;
    expect(updatedKf.targetX).toBeGreaterThan(0.6);
    expect(updatedKf.targetY).toBeLessThan(0.4);

    // Case 3: When clicking at an empty timestamp outside any zoom block (e.g. at 6800ms)
    useEditor.getState().selectKeyframe(null);
    useEditor.getState().setCurrentTime(6800);
    const initialBlocksCount = useEditor.getState().project!.zoomBlocks.length;
    useEditor.getState().shiftCameraTarget(0.35, 0.45);

    const stateAfterEmptyClick = useEditor.getState();
    expect(stateAfterEmptyClick.project!.zoomBlocks.length).toBe(initialBlocksCount + 1);

    // Verify newly created keyframes include lead-in, peak, hold, and lead-out
    const newPeakKf = stateAfterEmptyClick.project!.keyframes!.find((k) => k.timeMs === 6800);
    expect(newPeakKf).toBeDefined();
    expect(newPeakKf?.targetX).toBeCloseTo(0.35, 2);
    expect(newPeakKf?.targetY).toBeCloseTo(0.45, 2);
    expect(newPeakKf?.scale).toBeGreaterThan(1.5);
    expect(newPeakKf?.sound).toBe("click");

    // Verify click and interaction were recorded
    expect(stateAfterEmptyClick.project!.clicks.some((c) => c.timestampMs === 6800)).toBe(true);
    expect(stateAfterEmptyClick.project!.interactions?.some((i) => i.timestampMs === 6800)).toBe(true);
  });

  it("detects real activity from video frame sequence and updates project", async () => {
    await useEditor.getState().loadProject("proj-test");

    const w = 40;
    const h = 40;
    const f0 = { timestampMs: 0, data: new Uint8ClampedArray(w * h).fill(30), width: w, height: h };
    const d1 = new Uint8ClampedArray(w * h).fill(30);
    // Draw motion energy around center
    d1[20 * w + 20] = 200;
    d1[20 * w + 21] = 200;
    const f1 = { timestampMs: 600, data: d1, width: w, height: h };

    useEditor.getState().detectActivityFromFrames([f0, f1], { minEnergyThreshold: 50 });

    const state = useEditor.getState();
    expect(state.project?.interactions?.length).toBeGreaterThan(0);
    expect(state.project?.zoomBlocks.length).toBeGreaterThan(0);
    expect(state.project?.keyframes?.length).toBeGreaterThan(0);
  });

  it("adds, updates, and deletes keyframes with effects", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.getState().setCurrentTime(3500);

    // Add keyframe at current time with attached effect
    useEditor.getState().addKeyframeAtCurrentTime(2.2, 0.4, 0.6, "spotlight", 0.85);
    const kfs = useEditor.getState().project?.keyframes || [];
    const added = kfs.find((k) => Math.abs(k.timeMs - 3500) < 50);
    expect(added).toBeDefined();
    expect(added?.scale).toBe(2.2);
    expect(added?.effect).toBe("spotlight");

    // Update keyframe
    useEditor.getState().updateKeyframe(added!.id, { scale: 2.6, effect: "blur" });
    const updated = useEditor.getState().project?.keyframes?.find((k) => k.id === added!.id);
    expect(updated?.scale).toBe(2.6);
    expect(updated?.effect).toBe("blur");

    // Delete keyframe directly
    useEditor.getState().deleteKeyframe(added!.id);
    expect(useEditor.getState().project?.keyframes?.find((k) => k.id === added!.id)).toBeUndefined();
  });

  it("adds, updates, and deletes video effects with deleteSelected", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.getState().setCurrentTime(2000);

    // Add spotlight effect
    useEditor.getState().addEffectAtCurrentTime("spotlight", "cinematic");
    const effects = useEditor.getState().project?.effects || [];
    expect(effects.length).toBe(1);
    expect(effects[0]!.type).toBe("spotlight");

    // Update effect
    const effId = effects[0]!.id;
    useEditor.getState().updateEffect(effId, { intensity: 0.9 });
    expect(useEditor.getState().project?.effects?.[0]?.intensity).toBe(0.9);

    // Select and delete via deleteSelected
    useEditor.getState().selectEffect(effId);
    expect(useEditor.getState().selectedEffectId).toBe(effId);

    useEditor.getState().deleteSelected();
    expect(useEditor.getState().project?.effects?.length).toBe(0);
    expect(useEditor.getState().selectedEffectId).toBeNull();
  });

  it("plotInteractions generates comprehensive multi-zoom coverage across long videos when no raw clicks exist", async () => {
    await useEditor.getState().loadProject("proj-test");
    // Set 41-second duration with old 2 dummy clicks
    useEditor.setState((s) => ({
      durationMs: 41000,
      project: s.project ? {
        ...s.project,
        clicks: [
          { id: "c-auto-1", timestampMs: 9000, x: 0.38, y: 0.42, button: "left" },
          { id: "c-auto-2", timestampMs: 25000, x: 0.62, y: 0.52, button: "left" },
        ],
        interactions: [
          { id: "c-auto-1", type: "click", timestampMs: 9000, x: 0.38, y: 0.42, button: "left" },
          { id: "c-auto-2", type: "click", timestampMs: 25000, x: 0.62, y: 0.52, button: "left" },
        ],
      } : null,
    }));

    useEditor.getState().plotInteractions();
    const state = useEditor.getState();
    // Must generate many zooms across the 41-second recording, far more than 2
    expect(state.project?.zoomBlocks.length).toBeGreaterThanOrEqual(6);
    expect(state.project?.keyframes?.length).toBeGreaterThanOrEqual(15);
  });

  it("DEFAULT_LOOKS hides cursor overlay by default to preserve native recording", async () => {
    await useEditor.getState().loadProject("proj-test");
    const looks = useEditor.getState().project?.looks;
    expect(looks?.cursorStyle).toBe("hidden");
    expect(looks?.showCursor).toBe(false);
  });
});
