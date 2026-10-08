import { beforeEach, describe, expect, it } from "vitest";
import { useEditor } from "./editor";
import { useProjects } from "./projects";
import { calculateCameraAtTime, clampCameraToBounds, type ProjectSummary } from "@domolens/core";

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
    // Zoom block starts 1.0s before mid-click (2500ms - 1000ms = 1500ms)
    expect(state.project?.zoomBlocks[0]?.startTimeMs).toBe(1500);

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
    useEditor.setState((s) => ({
      durationMs: 10000,
      project: s.project ? {
        ...s.project,
        clicks: [{ id: "c1", timestampMs: 2500, x: 0.4, y: 0.5, button: "left" }],
        interactions: [{ id: "c1", type: "click", timestampMs: 2500, x: 0.4, y: 0.5, button: "left" }],
      } : null,
    }));
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

  it("plotInteractions strictly keeps full screen only (no zooms) when no clicks exist during recording", async () => {
    await useEditor.getState().loadProject("proj-test");
    // Set 41-second duration with no raw clicks
    useEditor.setState((s) => ({
      durationMs: 41000,
      project: s.project ? {
        ...s.project,
        clicks: [],
        interactions: [],
        zoomBlocks: [],
        keyframes: [],
      } : null,
    }));

    useEditor.getState().plotInteractions();
    const state = useEditor.getState();
    // Strictly NO zoom in when there are no clicks: full screen only!
    expect(state.project?.zoomBlocks.length).toBe(0);
    expect(state.project?.keyframes?.length).toBe(0);
  });

  it("plotInteractions strictly respects user clicks without generating unsolicited filler zooms", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      durationMs: 41000,
      project: s.project ? {
        ...s.project,
        clicks: [
          { id: "c-1", timestampMs: 9000, x: 0.38, y: 0.42, button: "left" },
          { id: "c-2", timestampMs: 25000, x: 0.62, y: 0.52, button: "left" },
        ],
        interactions: [
          { id: "c-1", type: "click", timestampMs: 9000, x: 0.38, y: 0.42, button: "left" },
          { id: "c-2", type: "click", timestampMs: 25000, x: 0.62, y: 0.52, button: "left" },
        ],
      } : null,
    }));

    useEditor.getState().plotInteractions();
    const state = useEditor.getState();
    // Strictly 2 zoom blocks for the 2 user clicks
    expect(state.project?.zoomBlocks.length).toBe(2);
  });

  it("DEFAULT_LOOKS hides cursor overlay by default to preserve native recording", async () => {
    await useEditor.getState().loadProject("proj-test");
    const looks = useEditor.getState().project?.looks;
    expect(looks?.cursorStyle).toBe("hidden");
    expect(looks?.showCursor).toBe(false);
  });

  it("autoZoom and autoAfx trigger automatic camera zoom and synchronized audio effects", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      project: s.project ? {
        ...s.project,
        clicks: [{ id: "c1", timestampMs: 2000, x: 0.4, y: 0.5, button: "left" }],
        interactions: [{ id: "c1", type: "click", timestampMs: 2000, x: 0.4, y: 0.5, button: "left" }],
        keyframes: [{ id: "kf1", timeMs: 2000, scale: 1.85, targetX: 0.4, targetY: 0.5, easing: "cubic" as const }],
      } : null,
    }));

    // Test autoZoom
    useEditor.getState().autoZoom();
    expect(useEditor.getState().project?.zoomBlocks.length).toBeGreaterThanOrEqual(1);

    // Test autoAfx
    useEditor.getState().autoAfx();
    const project = useEditor.getState().project;
    expect(project?.audioSettings?.clickSoundEnabled).toBe(true);
    expect(project?.audioSettings?.typingSoundEnabled).toBe(true);
    expect(project?.audioSettings?.musicDuckingEnabled).toBe(true);
    expect(project?.keyframes?.some((kf) => kf.sound === "click")).toBe(true);
  });

  it("autoZoom plots zoom strictly for the user click without generating fake filler zooms", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      durationMs: 22000,
      project: s.project ? {
        ...s.project,
        clicks: [{ id: "c-action", timestampMs: 8000, x: 0.5, y: 0.5, button: "left" }],
        interactions: [{ id: "c-action", type: "click", timestampMs: 8000, x: 0.5, y: 0.5, button: "left" }],
        zoomBlocks: [],
        keyframes: [],
      } : null,
    }));

    useEditor.getState().autoZoom();
    const zoomBlocks = useEditor.getState().project?.zoomBlocks ?? [];
    expect(zoomBlocks.length).toBe(1);
    expect(zoomBlocks[0]?.targetX).toBe(0.5);
    expect(zoomBlocks[0]?.targetY).toBe(0.5);
  });

  it("autoZoom strictly does NOT zoom into finish/stop click at the end of recording", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      durationMs: 22000,
      project: s.project ? {
        ...s.project,
        clicks: [{ id: "c-stop", timestampMs: 21500, x: 0.9, y: 0.9, button: "left" }],
        interactions: [{ id: "c-stop", type: "click", timestampMs: 21500, x: 0.9, y: 0.9, button: "left" }],
        zoomBlocks: [],
        keyframes: [],
      } : null,
    }));

    useEditor.getState().autoZoom();
    const zoomBlocks = useEditor.getState().project?.zoomBlocks ?? [];
    expect(zoomBlocks.length).toBe(0);
    const keyframes = useEditor.getState().project?.keyframes ?? [];
    expect(keyframes.length).toBe(0);
  });

  it("shiftCameraTarget inside an active zoom block updates block and all its keyframes to the clicked element coordinates", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      currentTimeMs: 2000,
      project: s.project
        ? {
            ...s.project,
            zoomBlocks: [
              {
                id: "b1",
                startTimeMs: 1000,
                endTimeMs: 4000,
                targetX: 0.5,
                targetY: 0.5,
                scale: 1.85,
                enabled: true,
              },
            ],
            keyframes: [
              { id: "kf-in", timeMs: 1000, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
              { id: "kf-peak", timeMs: 1800, scale: 1.85, targetX: 0.5, targetY: 0.5, easing: "spring" },
              { id: "kf-out", timeMs: 4000, scale: 1.0, targetX: 0.5, targetY: 0.5, easing: "cubic" },
            ],
          }
        : null,
    }));

    useEditor.getState().shiftCameraTarget(0.85, 0.65);
    const proj = useEditor.getState().project;
    const block = proj?.zoomBlocks.find((b) => b.id === "b1");
    const expectedTarget = clampCameraToBounds(0.85, 0.65, 1.85, "center");
    expect(block?.targetX).toBeCloseTo(expectedTarget.x, 2);
    expect(block?.targetY).toBeCloseTo(expectedTarget.y, 2);

    const blockKfs = proj?.keyframes?.filter((k) => k.timeMs >= 1000 && k.timeMs <= 4000) ?? [];
    expect(blockKfs.length).toBeGreaterThanOrEqual(3);
    
    // Zoomed keyframes must lock directly on the new focal coordinates
    const zoomedKfs = blockKfs.filter((k) => k.scale > 1.05);
    expect(zoomedKfs.length).toBeGreaterThanOrEqual(1);
    for (const kf of zoomedKfs) {
      expect(kf.targetX).toBeCloseTo(expectedTarget.x, 2);
      expect(kf.targetY).toBeCloseTo(expectedTarget.y, 2);
    }

    // Full frame lead-in and lead-out keyframes must remain dead center (0.5, 0.5) to prevent jumping
    const fullFrameKfs = blockKfs.filter((k) => k.scale <= 1.05);
    expect(fullFrameKfs.length).toBeGreaterThanOrEqual(2);
    for (const kf of fullFrameKfs) {
      expect(kf.targetX).toBeCloseTo(0.5, 2);
      expect(kf.targetY).toBeCloseTo(0.5, 2);
    }
  });

  it("plotInteractions glides between consecutive clicks across browser tabs without bouncing to full frame", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      durationMs: 12000,
      project: s.project ? {
        ...s.project,
        clicks: [
          { id: "tab-1", timestampMs: 2000, x: 0.20, y: 0.15, button: "left" },
          { id: "tab-2", timestampMs: 2800, x: 0.70, y: 0.15, button: "left" },
        ],
        interactions: [
          { id: "tab-1", type: "click", timestampMs: 2000, x: 0.20, y: 0.15, button: "left" },
          { id: "tab-2", type: "click", timestampMs: 2800, x: 0.70, y: 0.15, button: "left" },
        ],
      } : null,
    }));

    useEditor.getState().plotInteractions();
    const state = useEditor.getState();
    expect(state.project?.zoomBlocks.length).toBe(1);

    // Verify connecting glide / tracking keyframe exists
    const glideKf = state.project?.keyframes?.find((k) => k.id.includes("tab-2"));
    expect(glideKf).toBeDefined();
    expect(glideKf?.easing).toBe("cubic");

    // Zero reveal dip keyframes
    const revealKfs = state.project?.keyframes?.filter((k) => k.id.includes("kf-reveal"));
    expect(revealKfs?.length).toBe(0);
  });

  it("zooms out to full screen after 1s of no clicks", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      durationMs: 12000,
      project: s.project ? {
        ...s.project,
        clicks: [
          { id: "a", timestampMs: 2000, x: 0.2, y: 0.2, button: "left" },
          { id: "b", timestampMs: 6000, x: 0.7, y: 0.6, button: "left" },
        ],
        interactions: [
          { id: "a", type: "click", timestampMs: 2000, x: 0.2, y: 0.2, button: "left" },
          { id: "b", type: "click", timestampMs: 6000, x: 0.7, y: 0.6, button: "left" },
        ],
      } : null,
    }));
    useEditor.getState().plotInteractions();
    const st = useEditor.getState();
    expect(st.project?.zoomBlocks.length).toBe(2);
    expect(st.project?.keyframes?.some((k) => k.scale === 1.0 && k.timeMs > 2000 && k.timeMs < 6000)).toBe(true);
  });

  it("shiftCameraTarget outside active zoom block creates clean hold without reveal dips", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      currentTimeMs: 5000,
      durationMs: 15000,
      project: s.project ? {
        ...s.project,
        zoomBlocks: [],
        keyframes: [],
      } : null,
    }));

    useEditor.getState().shiftCameraTarget(0.70, 0.30);
    const proj = useEditor.getState().project;
    expect(proj?.zoomBlocks.length).toBe(1);

    // All zoomed keyframes in the new block maintain active scale (no reveal dip down to 1.44x)
    const zoomedKfs = proj?.keyframes?.filter((k) => k.scale > 1.05) ?? [];
    expect(zoomedKfs.length).toBeGreaterThanOrEqual(2);
    for (const kf of zoomedKfs) {
      expect(kf.scale).toBeCloseTo(1.85, 2);
    }

    const revealKf = proj?.keyframes?.find((k) => k.id.includes("kf-reveal"));
    expect(revealKf).toBeUndefined();
  });

  it("plotInteractions plots zooms for every single click when clicks has entries missing from interactions", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      durationMs: 15000,
      project: s.project ? {
        ...s.project,
        clicks: [
          { id: "click-tab-1", timestampMs: 2000, x: 0.25, y: 0.10, button: "left" },
          { id: "click-tab-2", timestampMs: 3800, x: 0.45, y: 0.10, button: "left" },
        ],
        // interactions only has a typing event at 7000ms
        interactions: [
          { id: "typing-1", type: "typing", timestampMs: 7000, x: 0.50, y: 0.50, snippet: "search" },
        ],
      } : null,
    }));

    useEditor.getState().plotInteractions();
    const state = useEditor.getState();

    // Verify keyframes include targetX/Y for both tab-1 and tab-2
    const kfTab1 = state.project?.keyframes?.find((k) => Math.abs(k.targetX - 0.25) < 0.05);
    const kfTab2 = state.project?.keyframes?.find((k) => Math.abs(k.targetX - 0.45) < 0.05);
    expect(kfTab1).toBeDefined();
    expect(kfTab2).toBeDefined();

    // Sound effects included
    expect(kfTab1?.sound).toBe("click");
  });

  it("plotInteractions leaves video in full screen 1.0x between separate clicks without gluing into one giant video-length zoom block", async () => {
    await useEditor.getState().loadProject("proj-test");
    useEditor.setState((s) => ({
      durationMs: 15000,
      project: s.project ? {
        ...s.project,
        clicks: [
          { id: "click-1", timestampMs: 2000, x: 0.30, y: 0.40, button: "left" },
          { id: "click-2", timestampMs: 9000, x: 0.70, y: 0.60, button: "left" },
        ],
        interactions: [
          { id: "click-1", type: "click", timestampMs: 2000, x: 0.30, y: 0.40, button: "left" },
          { id: "click-2", type: "click", timestampMs: 9000, x: 0.70, y: 0.60, button: "left" },
        ],
      } : null,
    }));

    useEditor.getState().plotInteractions({
      inactivityResetMs: 1000,
      holdDurationMs: 1000,
    });
    const state = useEditor.getState();

    // Must be exactly 2 distinct zoom blocks, separated by a full screen gap
    expect(state.project?.zoomBlocks).toHaveLength(2);
    const b1 = state.project!.zoomBlocks[0]!;
    const b2 = state.project!.zoomBlocks[1]!;

    // Block 1 ends well before Block 2 starts (separated by several seconds of full screen)
    expect(b1.endTimeMs).toBeLessThan(4000);
    expect(b2.startTimeMs).toBeGreaterThan(7500);

    // Playback between blocks (e.g. at t = 5500ms) MUST be 1.0x full screen
    const midCam = calculateCameraAtTime(5500, state.project!.zoomBlocks, 1000, 400, undefined, state.project!.keyframes);
    expect(midCam.scale).toBe(1.0);
    expect(midCam.x).toBe(0.5);
    expect(midCam.y).toBe(0.5);
    expect(midCam.isZoomed).toBe(false);
  });

  it("applies a pre-made motion template and updates looks, aspect ratio, audio and text overlays", async () => {
    await useEditor.getState().loadProject("proj-test");

    expect(useEditor.getState().isTemplateModalOpen).toBe(false);
    useEditor.getState().setTemplateModalOpen(true);
    expect(useEditor.getState().isTemplateModalOpen).toBe(true);

    useEditor.getState().applyTemplate("saas-launch-hero");
    const proj = useEditor.getState().project;

    expect(useEditor.getState().isTemplateModalOpen).toBe(false);
    expect(useEditor.getState().activeTemplateId).toBe("saas-launch-hero");
    expect(proj?.looks.windowFrame).toBe("macos");
    expect(proj?.looks.tiltAngle).toBe(6.5);
    expect(proj?.looks.brandAccentColor).toBe("#6366f1");
    expect(proj?.audioSettings?.typingSoundPreset).toBe("creamy");

    // Text overlay created from template
    const tplOverlay = proj?.textOverlays?.find((o) => o.badge === "NEW RELEASE");
    expect(tplOverlay).toBeDefined();
    expect(tplOverlay?.text).toContain("DomoLens");

    // Undo reverts back to prior looks
    useEditor.getState().undo();
    expect(useEditor.getState().project?.looks.tiltAngle).toBe(0);
  });

  it("supports auditioning expanded mechanical keyboard presets without errors", () => {
    expect(() => {
      useEditor.getState().playTypingSoundPreview("thock", 0.7);
      useEditor.getState().playTypingSoundPreview("creamy", 0.7);
      useEditor.getState().playTypingSoundPreview("thack", 0.7);
      useEditor.getState().playTypingSoundPreview("clicky", 0.7);
      useEditor.getState().playTypingSoundPreview("thick", 0.7);
    }).not.toThrow();
  });
});

