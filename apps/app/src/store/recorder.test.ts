import { beforeEach, describe, expect, it } from "vitest";
import { useRecorder } from "./recorder";

describe("useRecorder store", () => {
  beforeEach(() => {
    useRecorder.setState({
      state: "idle",
      countdown: 3,
      source: "screen",
      micEnabled: true,
      systemAudioEnabled: true,
      elapsedMs: 0,
      clicks: [],
      interactions: [],
      cursorTrajectory: [],
    });
  });

  it("updates recording source", () => {
    useRecorder.getState().setSource("window");
    expect(useRecorder.getState().source).toBe("window");
  });

  it("toggles audio sources", () => {
    useRecorder.getState().toggleMic();
    expect(useRecorder.getState().micEnabled).toBe(false);

    useRecorder.getState().toggleSystemAudio();
    expect(useRecorder.getState().systemAudioEnabled).toBe(false);
  });

  it("records clicks during active recording", () => {
    useRecorder.setState({ state: "recording" });
    useRecorder.getState().recordClick(0.4, 0.6, "left");

    const clicks = useRecorder.getState().clicks;
    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.x).toBe(0.4);
    expect(clicks[0]?.y).toBe(0.6);
    expect(clicks[0]?.button).toBe("left");
  });

  it("ignores clicks when not in recording state", () => {
    useRecorder.setState({ state: "idle" });
    useRecorder.getState().recordClick(0.4, 0.6);
    expect(useRecorder.getState().clicks).toHaveLength(0);
  });

  it("records typing activity and updates snippet during active recording", () => {
    useRecorder.setState({ state: "recording" });
    useRecorder.getState().recordTyping(0.5, 0.4, "hello", "type-session-1");

    let interactions = useRecorder.getState().interactions;
    expect(interactions).toHaveLength(1);
    expect(interactions[0]?.type).toBe("typing");
    expect(interactions[0]?.snippet).toBe("hello");

    // Consecutive keystroke in same session updates snippet
    useRecorder.getState().recordTyping(0.5, 0.4, "hello world", "type-session-1");
    interactions = useRecorder.getState().interactions;
    expect(interactions).toHaveLength(1);
    expect(interactions[0]?.snippet).toBe("hello world");

    // Cursor trajectory sampled
    expect(useRecorder.getState().cursorTrajectory.length).toBeGreaterThanOrEqual(2);
  });

  it("stopRecording auto-plots zooms, text overlays, chapters, and sfx from recorded user activity", async () => {
    useRecorder.setState({
      state: "recording",
      elapsedMs: 8000,
      clicks: [
        { id: "c1", timestampMs: 1500, x: 0.3, y: 0.3, button: "left" },
      ],
      interactions: [
        { id: "c1", type: "click", timestampMs: 1500, x: 0.3, y: 0.3, button: "left" },
        { id: "t1", type: "typing", timestampMs: 4000, x: 0.6, y: 0.5, snippet: "query" },
      ],
      cursorTrajectory: [
        { timestampMs: 0, x: 0.5, y: 0.5 },
        { timestampMs: 1500, x: 0.3, y: 0.3 },
        { timestampMs: 4000, x: 0.6, y: 0.5 },
      ],
    });

    const storageMap = new Map<string, string>();
    const originalStorage = globalThis.sessionStorage;
    globalThis.sessionStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
      length: 0,
      key: () => null,
    };

    const summary = await useRecorder.getState().stopRecording();
    expect(summary).not.toBeNull();
    expect(summary?.source).toBe("recording");

    // Check project data saved in sessionStorage
    const saved = globalThis.sessionStorage.getItem(`domolens_project_${summary?.id}`);
    expect(saved).not.toBeNull();
    const project = JSON.parse(saved!);

    // Auto-plotted zoom blocks and keyframes
    expect(project.zoomBlocks.length).toBeGreaterThanOrEqual(1);
    expect(project.keyframes.length).toBeGreaterThanOrEqual(4);

    // Auto-plotted text overlay from typing
    expect(project.textOverlays.length).toBe(1);
    expect(project.textOverlays[0]?.text).toBe("query");

    // Auto-plotted audio settings
    expect(project.audioSettings.clickSoundEnabled).toBe(true);
    expect(project.audioSettings.typingSoundEnabled).toBe(true);
    expect(project.audioSettings.musicDuckingEnabled).toBe(true);

    // Auto-plotted AI chapters
    expect(project.aiData.chapters.length).toBeGreaterThanOrEqual(1);

    globalThis.sessionStorage = originalStorage;
  });
});
