import { beforeEach, describe, expect, it } from "vitest";
import { useRecorder, extractSpeechIntervalsFromBlob } from "./recorder";

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

  it("does not generate dummy text overlay when typing interaction has no snippet or dummy snippet", async () => {
    useRecorder.setState({
      state: "recording",
      elapsedMs: 6000,
      clicks: [
        { id: "c-opt", timestampMs: 2000, x: 0.5, y: 0.5, button: "left" },
      ],
      interactions: [
        { id: "c-opt", type: "click", timestampMs: 2000, x: 0.5, y: 0.5, button: "left" },
        { id: "t-opt", type: "typing", timestampMs: 2000, x: 0.5, y: 0.5 },
      ],
      cursorTrajectory: [
        { timestampMs: 0, x: 0.5, y: 0.5 },
        { timestampMs: 2000, x: 0.5, y: 0.5 },
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
    const saved = globalThis.sessionStorage.getItem(`domolens_project_${summary?.id}`);
    const project = JSON.parse(saved!);

    // Must NOT create dummy text overlay
    expect(project.textOverlays.length).toBe(0);

    // AI chapters must use clean title
    expect(project.aiData.chapters[0]?.title).toBe("Typing Focus");

    globalThis.sessionStorage = originalStorage;
  });

  it("stopRecording strictly keeps full screen only when no clicks occurred during recording", async () => {
    useRecorder.setState({
      state: "recording",
      elapsedMs: 12000,
      clicks: [],
      interactions: [],
      cursorTrajectory: [
        { timestampMs: 0, x: 0.5, y: 0.5 },
        { timestampMs: 3000, x: 0.2, y: 0.2 },
        { timestampMs: 6000, x: 0.8, y: 0.8 },
        { timestampMs: 9000, x: 0.4, y: 0.4 },
        { timestampMs: 12000, x: 0.5, y: 0.5 },
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
    const saved = globalThis.sessionStorage.getItem(`domolens_project_${summary?.id}`);
    const project = JSON.parse(saved!);

    // Strictly full screen only: 0 zoom blocks and 0 keyframes!
    expect(project.zoomBlocks).toHaveLength(0);
    expect(project.keyframes).toHaveLength(0);

    globalThis.sessionStorage = originalStorage;
  });

  it("stopRecording ignores finish recording click at the end and keeps full screen", async () => {
    useRecorder.setState({
      state: "recording",
      elapsedMs: 10000,
      clicks: [
        // Finish recording click at 9500ms
        { id: "click-finish", timestampMs: 9500, x: 0.95, y: 0.05, button: "left" },
      ],
      interactions: [
        { id: "click-finish", type: "click", timestampMs: 9500, x: 0.95, y: 0.05, button: "left" },
      ],
      cursorTrajectory: [
        { timestampMs: 0, x: 0.5, y: 0.5 },
        { timestampMs: 9500, x: 0.95, y: 0.05 },
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
    const saved = globalThis.sessionStorage.getItem(`domolens_project_${summary?.id}`);
    const project = JSON.parse(saved!);

    // Finish click was filtered out, so 0 clicks remain -> strictly full screen only!
    expect(project.clicks).toHaveLength(0);
    expect(project.zoomBlocks).toHaveLength(0);
    expect(project.keyframes).toHaveLength(0);

    globalThis.sessionStorage = originalStorage;
  });

  it("deduplicates rapid duplicate clicks within 300ms at virtually the same coordinates", () => {
    useRecorder.setState({ state: "recording" });

    // Click 1: Normal click
    useRecorder.getState().recordClick(0.35, 0.45, "left");
    expect(useRecorder.getState().clicks).toHaveLength(1);

    // Click 2: Spurious duplicate 20ms later at identical location (e.g. DOM mousedown + global click)
    useRecorder.getState().recordClick(0.352, 0.451, "left");
    expect(useRecorder.getState().clicks).toHaveLength(1); // Dropped!

    // Click 3: Legitimate subsequent click elsewhere
    useRecorder.getState().recordClick(0.70, 0.20, "left");
    expect(useRecorder.getState().clicks).toHaveLength(2);
  });

  it("supports screen and window sources only without browser tab mode", () => {
    useRecorder.getState().setSource("screen");
    expect(useRecorder.getState().source).toBe("screen");

    useRecorder.getState().setSource("window");
    expect(useRecorder.getState().source).toBe("window");
  });

  it("supports auto-zoom-sfx-transcribe mode with zooms, SFX, and subtitles", async () => {
    useRecorder.getState().setRecordingMode("auto-zoom-sfx-transcribe");
    expect(useRecorder.getState().recordingMode).toBe("auto-zoom-sfx-transcribe");

    useRecorder.setState({
      state: "recording",
      elapsedMs: 6000,
      clicks: [
        { id: "c-unified", timestampMs: 2000, x: 0.4, y: 0.4, button: "left" },
      ],
      interactions: [
        { id: "c-unified", type: "click", timestampMs: 2000, x: 0.4, y: 0.4, button: "left" },
      ],
      cursorTrajectory: [
        { timestampMs: 0, x: 0.5, y: 0.5 },
        { timestampMs: 2000, x: 0.4, y: 0.4 },
      ],
    });

    // Record dynamic voice speech transcript captured from microphone
    useRecorder.getState().recordTranscript("Speaking into the mic and explaining the workflow", 1500);

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
    const saved = globalThis.sessionStorage.getItem(`domolens_project_${summary?.id}`);
    const project = JSON.parse(saved!);

    // Zoom blocks and keyframes plotted
    expect(project.zoomBlocks.length).toBeGreaterThanOrEqual(1);
    expect(project.keyframes.length).toBeGreaterThanOrEqual(1);

    // Audio SFX active
    expect(project.audioSettings.clickSoundEnabled).toBe(true);
    expect(project.audioSettings.typingSoundEnabled).toBe(true);

    // Dynamic subtitles generated from speech
    expect(project.textOverlays.length).toBeGreaterThanOrEqual(1);
    expect(project.textOverlays[0]?.text).toBe("Speaking into the mic and explaining the workflow");
    expect(project.textOverlays[0]?.cardStyle).toBe("glass");

    // MacBook terminal frame with studio styling and fit contain (no edge cutoffs)
    expect(project.looks.fit).toBe("contain");
    expect(project.looks.windowFrame).toBe("terminal");
    expect(project.looks.padding).toBe(32);
    expect(project.looks.borderRadius).toBe(16);
    expect(project.looks.shadow).toBe("lift");

    // Video starts full screen unzoomed at timeMs 0
    expect(project.keyframes[0].timeMs).toBe(0);
    expect(project.keyframes[0].scale).toBe(1.0);

    globalThis.sessionStorage = originalStorage;
  });

  it("does not generate static placeholder subtitles when recording in transcribe mode without speech", async () => {
    useRecorder.getState().setRecordingMode("auto-zoom-sfx-transcribe");
    useRecorder.setState({
      state: "recording",
      elapsedMs: 5000,
      clicks: [
        { id: "c-silent", timestampMs: 2000, x: 0.5, y: 0.5, button: "left" },
      ],
      interactions: [
        { id: "c-silent", type: "click", timestampMs: 2000, x: 0.5, y: 0.5, button: "left" },
      ],
      cursorTrajectory: [
        { timestampMs: 0, x: 0.5, y: 0.5 },
        { timestampMs: 2000, x: 0.5, y: 0.5 },
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
    const saved = globalThis.sessionStorage.getItem(`domolens_project_${summary?.id}`);
    const project = JSON.parse(saved!);

    // Static placeholder captions eradicated: 0 overlays when speech was not recorded
    expect(project.textOverlays).toHaveLength(0);

    globalThis.sessionStorage = originalStorage;
  });
});

describe("extractSpeechIntervalsFromBlob", () => {
  it("handles empty or invalid audio blobs safely without crashing", async () => {
    const emptyBlob = new Blob([], { type: "audio/webm" });
    const res = await extractSpeechIntervalsFromBlob(emptyBlob);
    expect(res).toEqual([]);
  });

  it("extracts voice activity intervals with AudioContext decodeAudioData mock", async () => {
    class MockAudioContext {
      async decodeAudioData() {
        const sampleRate = 16000;
        const totalSamples = sampleRate * 4; // 4 seconds
        const channelData = new Float32Array(totalSamples);
        // Add speech energy between 1.0s and 2.5s (16000 to 40000 samples)
        for (let i = 16000; i < 40000; i++) {
          channelData[i] = Math.sin(i * 0.1) * 0.25;
        }
        return {
          sampleRate,
          length: totalSamples,
          duration: 4,
          numberOfChannels: 1,
          getChannelData: () => channelData,
        };
      }
      async close() {}
    }

    const origAudioContext = typeof window !== "undefined" ? (window as any).AudioContext : undefined;
    if (typeof window !== "undefined") {
      (window as any).AudioContext = MockAudioContext;
    }
    (globalThis as any).AudioContext = MockAudioContext;

    try {
      const dummyBlob = new Blob([new Uint8Array(100)], { type: "audio/webm" });
      const intervals = await extractSpeechIntervalsFromBlob(dummyBlob);
      expect(intervals.length).toBeGreaterThanOrEqual(1);
      expect(intervals[0]?.startMs).toBeGreaterThanOrEqual(800);
      expect(intervals[0]?.durationMs).toBeGreaterThan(500);
    } finally {
      if (typeof window !== "undefined") {
        (window as any).AudioContext = origAudioContext;
      }
      (globalThis as any).AudioContext = origAudioContext;
    }
  });
});

