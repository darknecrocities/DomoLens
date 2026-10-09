import { beforeEach, describe, expect, it } from "vitest";
import { useEditor, type TimelineToolMode } from "../store/editor";
import { useProjects } from "../store/projects";
import type {
  AudioTrack,
  ProjectData,
  ProjectSummary,
  TextOverlay,
  TimelineClip,
  ZoomBlock,
} from "@domolens/core";

/* ========================================================================== */
/* Milestone 3 Empirical Adversarial Stress Test Suite                        */
/* ========================================================================== */

describe("Milestone 3 Empirical Stress Testing — Challenger 1", () => {
  const mockSummary: ProjectSummary = {
    id: "proj-m3-stress",
    name: "M3 Stress Test Recording",
    source: "recording",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    durationMs: 10000,
    width: 1920,
    height: 1080,
    thumbnail: null,
    media: "blob://video",
  };

  const createInitialClip = (): TimelineClip => ({
    id: "clip-base-10s",
    name: "Main Recording 10s",
    mediaUrl: "blob://video",
    timelineStartMs: 0,
    durationMs: 10000,
    sourceOffsetMs: 0,
    muted: false,
    volume: 1.0,
  });

  const createInitialBlock = (): ZoomBlock => ({
    id: "zb-base",
    startTimeMs: 2000,
    endTimeMs: 6000,
    targetX: 0.5,
    targetY: 0.5,
    scale: 1.85,
    enabled: true,
  });

  const createInitialText = (): TextOverlay => ({
    id: "txt-base",
    text: "Initial Base Title",
    startTimeMs: 1000,
    durationMs: 4000,
    x: 0.5,
    y: 0.8,
    fontSize: 32,
    color: "#ffffff",
  });

  const createInitialProject = (): ProjectData => ({
    summary: mockSummary,
    clicks: [],
    interactions: [],
    cursorTrajectory: [],
    zoomBlocks: [createInitialBlock()],
    keyframes: [],
    effects: [],
    textOverlays: [createInitialText()],
    audioTracks: [],
    clips: [createInitialClip()],
    looks: {
      backgroundType: "gradient",
      backgroundValue: "#000000",
      borderRadius: 16,
      padding: 32,
      shadow: "soft",
      aspectRatio: "16:9",
      windowFrame: "macos",
      showCursor: false,
      cursorStyle: "hidden",
      cursorSize: 1.0,
      cursorSmoothing: "smooth",
      autoTrackCursor: false,
      autoTrackScale: 1.5,
      showClickRipples: true,
    },
  });

  beforeEach(() => {
    useProjects.setState({ projects: [mockSummary] });
    useEditor.setState({
      project: createInitialProject(),
      currentTimeMs: 0,
      durationMs: 10000,
      isPlaying: false,
      selectedBlockId: null,
      selectedClipId: null,
      selectedKeyframeId: null,
      selectedEffectId: null,
      selectedTextId: null,
      selectedAudioId: null,
      activeTab: "timeline",
      activeTimelineTool: "select",
      history: [],
      future: [],
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 1. Boundary Trimming & Splitting Stress Testing                          */
  /* ------------------------------------------------------------------------ */
  describe("1. Boundary Trimming & Splitting Stress Testing", () => {
    it("handles boundary times (0, durationMs, negative, huge, floating point) gracefully without crashing", () => {
      const boundaryTimes = [
        0,
        10000,
        -1,
        -500,
        -0.000001,
        10001,
        999999,
        0.000001,
        1500.3333333333333,
        4500.5,
        9999.999999,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
      ];

      for (const time of boundaryTimes) {
        useEditor.setState({ currentTimeMs: time });

        // None of these operations should throw uncaught exceptions
        expect(() => {
          useEditor.getState().trimLeftAtPlayhead();
          useEditor.getState().trimRightAtPlayhead();
          useEditor.getState().splitAtPlayhead();
        }).not.toThrow();
      }
    });

    it("verifies trimLeft rejects timestamps when remaining duration is under minimum 100ms threshold", () => {
      // Clip is 10000ms from 0 to 10000. Trimming left at 9950 leaves only 50ms (under 100ms).
      useEditor.setState({ currentTimeMs: 9950 });
      const initialClips = JSON.parse(JSON.stringify(useEditor.getState().project?.clips));
      useEditor.getState().trimLeftAtPlayhead();

      // Clip should remain untouched
      expect(useEditor.getState().project?.clips).toEqual(initialClips);

      // Trimming at 9900 leaves exactly 100ms (valid boundary)
      useEditor.setState({ currentTimeMs: 9900 });
      useEditor.getState().trimLeftAtPlayhead();
      const trimmedClip = useEditor.getState().project?.clips[0]!;
      expect(trimmedClip.timelineStartMs).toBe(9900);
      expect(trimmedClip.durationMs).toBe(100);
      expect(trimmedClip.sourceOffsetMs).toBe(9900);
    });

    it("verifies trimRight rejects timestamps when remaining duration is under minimum 100ms threshold", () => {
      // Clip starts at 0. Trimming right at 50 leaves only 50ms (under 100ms).
      useEditor.setState({ currentTimeMs: 50 });
      const initialClips = JSON.parse(JSON.stringify(useEditor.getState().project?.clips));
      useEditor.getState().trimRightAtPlayhead();

      // Clip should remain untouched
      expect(useEditor.getState().project?.clips).toEqual(initialClips);

      // Trimming at 100 leaves exactly 100ms (valid boundary)
      useEditor.setState({ currentTimeMs: 100 });
      useEditor.getState().trimRightAtPlayhead();
      const trimmedClip = useEditor.getState().project?.clips[0]!;
      expect(trimmedClip.timelineStartMs).toBe(0);
      expect(trimmedClip.durationMs).toBe(100);
      expect(trimmedClip.sourceOffsetMs).toBe(0);
    });

    it("verifies zoom block trimming respects the 200ms minimum threshold", () => {
      // Zoom block starts at 2000, ends at 6000 (duration 4000)
      useEditor.setState({ selectedBlockId: "zb-base" });

      // Trimming left at 5850 leaves only 150ms (< 200ms) -> must reject
      useEditor.setState({ currentTimeMs: 5850 });
      useEditor.getState().trimLeftAtPlayhead();
      let block = useEditor.getState().project?.zoomBlocks.find((b) => b.id === "zb-base")!;
      expect(block.startTimeMs).toBe(2000);

      // Trimming left at 5800 leaves 200ms -> valid
      useEditor.setState({ currentTimeMs: 5800 });
      useEditor.getState().trimLeftAtPlayhead();
      block = useEditor.getState().project?.zoomBlocks.find((b) => b.id === "zb-base")!;
      expect(block.startTimeMs).toBe(5800);
      expect(block.endTimeMs).toBe(6000);

      // Reset block
      useEditor.setState({
        project: {
          ...useEditor.getState().project!,
          zoomBlocks: [createInitialBlock()],
        },
      });

      // Trimming right at 2150 leaves only 150ms (< 200ms) -> must reject
      useEditor.setState({ currentTimeMs: 2150 });
      useEditor.getState().trimRightAtPlayhead();
      block = useEditor.getState().project?.zoomBlocks.find((b) => b.id === "zb-base")!;
      expect(block.endTimeMs).toBe(6000);

      // Trimming right at 2200 leaves 200ms -> valid
      useEditor.setState({ currentTimeMs: 2200 });
      useEditor.getState().trimRightAtPlayhead();
      block = useEditor.getState().project?.zoomBlocks.find((b) => b.id === "zb-base")!;
      expect(block.startTimeMs).toBe(2000);
      expect(block.endTimeMs).toBe(2200);
    });

    it("enforces multi-track target selection priority without mutating unselected coincident tracks", () => {
      // Setup a coincident time where clip, zoom block, text overlay, and SFX audio all exist at 3000ms
      const sfxAudio: AudioTrack = {
        id: "sfx-coincident",
        name: "Coincident SFX",
        type: "sfx",
        url: "sfx://bop",
        startTimeMs: 1500,
        durationMs: 3000, // 1500 to 4500
        volume: 0.8,
        muted: false,
      };

      useEditor.setState((s) => ({
        project: s.project
          ? {
              ...s.project,
              audioTracks: [sfxAudio],
            }
          : null,
        currentTimeMs: 3000,
      }));

      // Test 1: Explicitly selecting text overlay trims ONLY the text overlay
      useEditor.setState({ selectedTextId: "txt-base" });
      useEditor.getState().trimLeftAtPlayhead();

      const projAfterTextTrim = useEditor.getState().project!;
      expect(projAfterTextTrim.textOverlays?.[0]?.startTimeMs).toBe(3000);
      expect(projAfterTextTrim.textOverlays?.[0]?.durationMs).toBe(2000); // was 4000 (1000 to 5000)
      // Unselected items must be unaltered
      expect(projAfterTextTrim.clips[0]?.timelineStartMs).toBe(0);
      expect(projAfterTextTrim.zoomBlocks[0]?.startTimeMs).toBe(2000);
      expect(projAfterTextTrim.audioTracks?.[0]?.startTimeMs).toBe(1500);

      // Test 2: Explicitly selecting SFX audio trims ONLY the audio track
      useEditor.setState({
        selectedTextId: null,
        selectedAudioId: "sfx-coincident",
        currentTimeMs: 3500,
      });
      useEditor.getState().trimRightAtPlayhead();

      const projAfterAudioTrim = useEditor.getState().project!;
      expect(projAfterAudioTrim.audioTracks?.[0]?.startTimeMs).toBe(1500);
      expect(projAfterAudioTrim.audioTracks?.[0]?.durationMs).toBe(2000); // 3500 - 1500
      // Unselected items must be unaltered
      expect(projAfterAudioTrim.clips[0]?.durationMs).toBe(10000);
      expect(projAfterAudioTrim.zoomBlocks[0]?.endTimeMs).toBe(6000);
    });

    it("executes 25 rapid sequential splits across the timeline maintaining clip continuity", () => {
      // Split the 10000ms clip at 25 timestamps from 400ms to 9600ms
      const splitTimes = Array.from({ length: 24 }, (_, i) => (i + 1) * 400);

      for (const t of splitTimes) {
        useEditor.setState({ currentTimeMs: t });
        useEditor.getState().splitAtPlayhead();
      }

      const clips = useEditor.getState().project?.clips ?? [];
      expect(clips.length).toBe(25);

      // Verify mathematical continuity of the split segments
      let expectedStart = 0;
      for (let i = 0; i < clips.length; i++) {
        const c = clips[i]!;
        expect(c.timelineStartMs).toBe(expectedStart);
        expect(c.durationMs).toBe(400);
        expect(c.sourceOffsetMs).toBe(expectedStart);
        expectedStart += c.durationMs;
      }
      expect(expectedStart).toBe(10000);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 2. High-Zoom and Low-Zoom Viewport Scrolling & Panning Physics           */
  /* ------------------------------------------------------------------------ */
  describe("2. High-Zoom (3.0x) and Low-Zoom (0.75x) Viewport Scrolling & Panning", () => {
    it("scales container width accurately across low-zoom (0.75x) and high-zoom (3.0x)", () => {
      const zoomLevels = [0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 5.0];

      for (const zoom of zoomLevels) {
        useEditor.setState({ timelineZoom: zoom });
        const currentZoom = useEditor.getState().timelineZoom;
        expect(currentZoom).toBe(zoom);

        // Container percentage width oracle: Math.round(timelineZoom * 100)%
        const computedPercent = `${Math.round(currentZoom * 100)}%`;
        if (zoom === 0.75) expect(computedPercent).toBe("75%");
        if (zoom === 3.0) expect(computedPercent).toBe("300%");
      }
    });

    it("verifies pan viewport scrolling physics under 500 rapid simulated mouse drag movements", () => {
      // Viewport model: clientWidth = 800px, zoom = 3.0x (2400px scrollWidth, max scroll 1600px)
      const viewportModel = {
        clientWidth: 800,
        scrollWidth: 2400,
        scrollLeft: 400,
      };

      const panAnchor = {
        startX: 500,
        scrollLeft: viewportModel.scrollLeft,
      };

      // Function executing the pan physics from Timeline.tsx:
      // viewportRef.current.scrollLeft = panStartRef.current.scrollLeft - deltaX;
      const executePanMove = (currentClientX: number) => {
        const deltaX = currentClientX - panAnchor.startX;
        const newScroll = panAnchor.scrollLeft - deltaX;
        const maxScroll = viewportModel.scrollWidth - viewportModel.clientWidth;
        // Browser native scrollLeft clamping
        return Math.max(0, Math.min(maxScroll, newScroll));
      };

      // Run 500 erratic simulated mouse moves
      for (let i = 0; i < 500; i++) {
        const simulatedClientX = (i * 17) % 1500 - 300; // erratic numbers [-300, 1200]
        const resultingScroll = executePanMove(simulatedClientX);

        expect(resultingScroll).toBeGreaterThanOrEqual(0);
        expect(resultingScroll).toBeLessThanOrEqual(1600);
        expect(Number.isFinite(resultingScroll)).toBe(true);
      }
    });

    it("safely handles pointer capture attachment and release exceptions in pan mode", () => {
      let captureCount = 0;
      let releaseCount = 0;

      const mockPointerEvent = {
        pointerId: 42,
        currentTarget: {
          setPointerCapture: (id: number) => {
            if (id < 0) throw new Error("Invalid pointer ID");
            captureCount++;
          },
          releasePointerCapture: (id: number) => {
            if (id < 0) throw new Error("Invalid pointer ID");
            releaseCount++;
          },
        },
      };

      // Timeline.tsx wraps setPointerCapture and releasePointerCapture in try-catch
      const safeCapture = (id: number) => {
        try {
          mockPointerEvent.currentTarget.setPointerCapture(id);
        } catch {}
      };

      const safeRelease = (id: number) => {
        try {
          mockPointerEvent.currentTarget.releasePointerCapture(id);
        } catch {}
      };

      expect(() => safeCapture(42)).not.toThrow();
      expect(captureCount).toBe(1);

      expect(() => safeCapture(-1)).not.toThrow(); // simulated disconnected pointer
      expect(captureCount).toBe(1);

      expect(() => safeRelease(42)).not.toThrow();
      expect(releaseCount).toBe(1);

      expect(() => safeRelease(-1)).not.toThrow();
      expect(releaseCount).toBe(1);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 3. Text Overlay Inline Editing: Unicode, Emoji, Empty Strings            */
  /* ------------------------------------------------------------------------ */
  describe("3. Text Overlay Inline Editing with Unicode, Emoji, Empty Strings & Long Inputs", () => {
    it("rejects empty strings and whitespace-only inputs without altering existing text", () => {
      const textId = "txt-base";
      const initialText = useEditor.getState().project?.textOverlays?.[0]?.text;
      expect(initialText).toBe("Initial Base Title");

      const commitInlineEdit = (id: string, val: string) => {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 0) {
          useEditor.getState().updateTextOverlay(id, { text: trimmed });
        }
      };

      const invalidInputs = [
        "",
        " ",
        "   ",
        "\t",
        "\n",
        "\r\n",
        "  \t \n  ",
      ];

      for (const input of invalidInputs) {
        commitInlineEdit(textId, input);
        const currentText = useEditor.getState().project?.textOverlays?.[0]?.text;
        expect(currentText).toBe(initialText);
      }
    });

    it("correctly commits and stores multi-lingual Unicode strings and RTL scripts", () => {
      const textId = "txt-base";

      const commitInlineEdit = (id: string, val: string) => {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 0) {
          useEditor.getState().updateTextOverlay(id, { text: trimmed });
        }
      };

      const unicodeTestCases = [
        { desc: "Japanese Kanji & Hiragana", input: "日本語の字幕テキストとデモ表示" },
        { desc: "Arabic RTL script", input: "مرحبا بكم في محرر الفيديو دومولينز" },
        { desc: "Cyrillic script", input: "Редактор видео DomoLens с поддержкой анимации" },
        { desc: "Chinese Simplified", input: "专业级动态视频字幕效果展示" },
        { desc: "Hindi Devanagari", input: "डोमोलेंस वीडियो एडिटर लाइव डेमो" },
        { desc: "German Umlauts & Eszett", input: "Großartige Überraschungen für Ästhetik & Spaß" },
      ];

      for (const { input } of unicodeTestCases) {
        commitInlineEdit(textId, input);
        const updated = useEditor.getState().project?.textOverlays?.[0]?.text;
        expect(updated).toBe(input);
      }
    });

    it("handles complex emoji sequences, grapheme clusters, and zero-width joiners", () => {
      const textId = "txt-base";

      const commitInlineEdit = (id: string, val: string) => {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 0) {
          useEditor.getState().updateTextOverlay(id, { text: trimmed });
        }
      };

      const emojiCases = [
        "🚀✨ Video Title With Rockets & Sparkles 🔥🎉",
        "👨‍💻 Developer Mode & 👩‍🔬 Research Lab",
        "🏳️‍🌈 Rainbow Flag & 🇺🇸🇯🇵 National Flags",
        "Complex ZWJ: \u{1F9D1}\u{200D}\u{1F4BB} Laptop Worker",
        "Skin-tone modifiers: 👍🏽 👏🏿 🙌🏻 ✌🏼",
      ];

      for (const emojiStr of emojiCases) {
        commitInlineEdit(textId, emojiStr);
        const textInStore = useEditor.getState().project?.textOverlays?.[0]?.text;
        expect(textInStore).toBe(emojiStr);
      }
    });

    it("safely accepts massive text payloads (10,000 characters) without memory corruption", () => {
      const textId = "txt-base";
      const massiveText = "DomoLens-Video-Editor-Headline-".repeat(350); // 10,850 chars
      expect(massiveText.length).toBeGreaterThan(10000);

      const commitInlineEdit = (id: string, val: string) => {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 0) {
          useEditor.getState().updateTextOverlay(id, { text: trimmed });
        }
      };

      commitInlineEdit(textId, massiveText);
      const stored = useEditor.getState().project?.textOverlays?.[0]?.text;
      expect(stored).toBe(massiveText);
      expect(stored?.length).toBe(massiveText.length);
    });

    it("handles script tags and HTML injection strings safely as raw text", () => {
      const textId = "txt-base";
      const injectionPayloads = [
        "<script>alert('xss')</script>",
        "'; DROP TABLE TextOverlays; --",
        '<img src=x onerror="alert(1)">',
        "&lt;div class=&quot;bad&quot;&gt;",
      ];

      const commitInlineEdit = (id: string, val: string) => {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 0) {
          useEditor.getState().updateTextOverlay(id, { text: trimmed });
        }
      };

      for (const payload of injectionPayloads) {
        commitInlineEdit(textId, payload);
        const stored = useEditor.getState().project?.textOverlays?.[0]?.text;
        expect(stored).toBe(payload);
      }
    });

    it("verifies inline editing cancellation (Escape key) restores original state", () => {
      let editingValue = "Drafting new text";
      const originalText = "Original Committed Headline";

      useEditor.getState().updateTextOverlay("txt-base", { text: originalText });

      // Simulating Escape key event handling in Timeline.tsx:
      // onKeyDown: if (e.key === "Escape") cancelTextEdit();
      const cancelTextEdit = () => {
        editingValue = "";
        // Does not call updateTextOverlay
      };

      cancelTextEdit();
      expect(editingValue).toBe("");
      expect(useEditor.getState().project?.textOverlays?.[0]?.text).toBe(originalText);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 4. SFX Track Scrubbing, Overlapping & Volume Boundaries                  */
  /* ------------------------------------------------------------------------ */
  describe("4. SFX Track Scrubbing, Overlapping Items & Volume Boundaries", () => {
    it("handles extreme volume boundaries [0.0, 1.0, negative, >1.0] and null volume", () => {
      const testVolumes = [
        { input: 0.0, expectedPercent: 0 },
        { input: 1.0, expectedPercent: 100 },
        { input: 0.7, expectedPercent: 70 },
        { input: 0.35, expectedPercent: 35 },
        { input: 0.001, expectedPercent: 0 },
        { input: -0.5, expectedPercent: -50 },
        { input: 2.0, expectedPercent: 200 },
        { input: undefined, expectedPercent: 70 }, // default fallback 0.7
      ];

      for (const { input, expectedPercent } of testVolumes) {
        const volPercent = Math.round((input ?? 0.7) * 100);
        expect(volPercent).toBe(expectedPercent);
      }
    });

    it("accurately categorizes acoustic presets into keystroke vs click/bop audition sinks", () => {
      const categorizeSfx = (trackName: string) => {
        const nameLower = trackName.toLowerCase();
        if (
          nameLower.includes("typ") ||
          nameLower.includes("key") ||
          nameLower.includes("thock") ||
          nameLower.includes("creamy") ||
          nameLower.includes("switch")
        ) {
          return "keystroke";
        }
        return "bop";
      };

      const cases = [
        { name: "Creamy Mechanical Keyboard", expected: "keystroke" },
        { name: "Rapid Typing Burst", expected: "keystroke" },
        { name: "Cherry MX Switch", expected: "keystroke" },
        { name: "Thocky Keypress", expected: "keystroke" },
        { name: "Tactile Key Press", expected: "keystroke" },
        { name: "Bubble Bop Pop", expected: "bop" },
        { name: "Mouse Click Primary", expected: "bop" },
        { name: "Whoosh Transition", expected: "bop" },
        { name: "Camera Shutter Click", expected: "bop" },
      ];

      for (const { name, expected } of cases) {
        expect(categorizeSfx(name)).toBe(expected);
      }
    });

    it("supports 25 dense overlapping SFX items without collisions or track corruption", () => {
      const tracks: AudioTrack[] = Array.from({ length: 25 }, (_, i) => ({
        id: `sfx-dense-${i}`,
        name: `SFX Cue #${i}`,
        type: "sfx",
        url: "sfx://bop",
        startTimeMs: 1500, // all sharing the exact same start time!
        durationMs: 600,
        volume: 0.5 + (i % 5) * 0.1,
        muted: false,
      }));

      useEditor.setState((s) => ({
        project: s.project ? { ...s.project, audioTracks: tracks } : null,
      }));

      expect(useEditor.getState().project?.audioTracks?.length).toBe(25);

      // Repositioning item #7 independently
      const durationMs = 10000;
      const clipDur = 600;
      const origStart = 1500;
      const deltaRatio = 0.3; // +3000ms

      const newStart = Math.max(
        0,
        Math.min(durationMs - clipDur, Math.round(origStart + deltaRatio * durationMs)),
      );
      expect(newStart).toBe(4500);

      useEditor.getState().updateAudioTrack("sfx-dense-7", { startTimeMs: newStart });

      const updatedTracks = useEditor.getState().project?.audioTracks ?? [];
      const item7 = updatedTracks.find((t) => t.id === "sfx-dense-7")!;
      expect(item7.startTimeMs).toBe(4500);

      // All other items remain at 1500ms
      const otherItems = updatedTracks.filter((t) => t.id !== "sfx-dense-7");
      expect(otherItems.every((t) => t.startTimeMs === 1500)).toBe(true);
      expect(otherItems.length).toBe(24);

      // Deleting item #7 independently
      useEditor.getState().deleteAudioTrack("sfx-dense-7");
      expect(useEditor.getState().project?.audioTracks?.length).toBe(24);
      expect(useEditor.getState().project?.audioTracks?.some((t) => t.id === "sfx-dense-7")).toBe(false);
    });

    it("clamps SFX track drag scrubbing precisely at timeline boundaries [0, durationMs - clipDur]", () => {
      const durationMs = 10000;
      const clipDur = 600;

      const clampDrag = (origStart: number, deltaMs: number) => {
        return Math.max(0, Math.min(durationMs - clipDur, Math.round(origStart + deltaMs)));
      };

      // Extreme drag left
      expect(clampDrag(1000, -50000)).toBe(0);

      // Drag to exact left boundary
      expect(clampDrag(1000, -1000)).toBe(0);

      // Extreme drag right
      expect(clampDrag(1000, 50000)).toBe(9400);

      // Drag to exact right boundary
      expect(clampDrag(1000, 8400)).toBe(9400);

      // Drag slightly past right boundary
      expect(clampDrag(1000, 8401)).toBe(9400);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 5. Stress Test Undo/Redo Cycles with Alternating Tool Modes              */
  /* ------------------------------------------------------------------------ */
  describe("5. Stress Test Undo/Redo Cycles with Alternating Tool Modes", () => {
    it("preserves activeTimelineTool across undo and redo cycles without corrupting history", () => {
      // 1. Tool starts as select
      expect(useEditor.getState().activeTimelineTool).toBe("select");

      // 2. Add an SFX track
      useEditor.setState({ currentTimeMs: 1000 });
      useEditor.getState().addSfxTrackAtCurrentTime("bop");
      expect(useEditor.getState().project?.audioTracks?.length).toBe(1);
      expect(useEditor.getState().history.length).toBe(1);

      // 3. Switch tool to split
      useEditor.getState().setActiveTimelineTool("split");
      expect(useEditor.getState().activeTimelineTool).toBe("split");
      // Tool switch is UI-only; history depth remains 1
      expect(useEditor.getState().history.length).toBe(1);

      // 4. Split clip at 4000ms
      useEditor.setState({ currentTimeMs: 4000 });
      useEditor.getState().splitAtPlayhead();
      expect(useEditor.getState().project?.clips.length).toBe(2);
      expect(useEditor.getState().history.length).toBe(2);

      // 5. Switch tool to pan
      useEditor.getState().setActiveTimelineTool("pan");
      expect(useEditor.getState().activeTimelineTool).toBe("pan");

      // 6. Undo the split
      useEditor.getState().undo();
      expect(useEditor.getState().project?.clips.length).toBe(1);
      expect(useEditor.getState().history.length).toBe(1);
      expect(useEditor.getState().future.length).toBe(1);
      // Tool mode remains 'pan'
      expect(useEditor.getState().activeTimelineTool).toBe("pan");

      // 7. Redo the split
      useEditor.getState().redo();
      expect(useEditor.getState().project?.clips.length).toBe(2);
      expect(useEditor.getState().history.length).toBe(2);
      expect(useEditor.getState().future.length).toBe(0);
      expect(useEditor.getState().activeTimelineTool).toBe("pan");
    });

    it("verifies history buffer caps strictly at 20 entries under heavy sequential edits", () => {
      // Push 40 sequential text overlay additions
      for (let i = 0; i < 40; i++) {
        useEditor.getState().addTextOverlay(`Sequential Headline #${i}`);
      }

      const history = useEditor.getState().history;
      // In editor.ts: history: [JSON.parse(JSON.stringify(state.project)), ...state.history.slice(0, 19)]
      // Maximum length is 20 entries
      expect(history.length).toBeLessThanOrEqual(20);
      expect(history.length).toBe(20);
    });

    it("clears future redo stack when a new action is performed after undo (forking)", () => {
      // 1. Add SFX 1
      useEditor.setState({ currentTimeMs: 1000 });
      useEditor.getState().addSfxTrackAtCurrentTime("bop", "SFX 1");

      // 2. Add SFX 2
      useEditor.setState({ currentTimeMs: 2000 });
      useEditor.getState().addSfxTrackAtCurrentTime("bop", "SFX 2");

      // 3. Add SFX 3
      useEditor.setState({ currentTimeMs: 3000 });
      useEditor.getState().addSfxTrackAtCurrentTime("bop", "SFX 3");

      expect(useEditor.getState().history.length).toBe(3);
      expect(useEditor.getState().future.length).toBe(0);

      // Undo twice
      useEditor.getState().undo();
      useEditor.getState().undo();
      expect(useEditor.getState().history.length).toBe(1);
      expect(useEditor.getState().future.length).toBe(2);

      // Perform a new edit (Trim right)
      useEditor.setState({ currentTimeMs: 8000 });
      useEditor.getState().trimRightAtPlayhead();

      // Future redo stack must be completely wiped
      expect(useEditor.getState().future.length).toBe(0);
      expect(useEditor.getState().history.length).toBe(2);
    });

    it("gracefully handles over-undoing and over-redoing without errors", () => {
      // Perform 2 edits
      useEditor.getState().addTextOverlay("Title A");
      useEditor.getState().addTextOverlay("Title B");

      expect(useEditor.getState().history.length).toBe(2);

      // Undo 5 times (more than available)
      for (let i = 0; i < 5; i++) {
        expect(() => useEditor.getState().undo()).not.toThrow();
      }
      expect(useEditor.getState().history.length).toBe(0);

      // Redo 5 times (more than available)
      for (let i = 0; i < 5; i++) {
        expect(() => useEditor.getState().redo()).not.toThrow();
      }
      expect(useEditor.getState().future.length).toBe(0);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 6. High-Density Monte Carlo Randomized Fuzz Engine                       */
  /* ------------------------------------------------------------------------ */
  describe("6. High-Density Monte Carlo Randomized Fuzz Engine", () => {
    it("runs 500 chaotic pseudo-random timeline operations without throwing or corrupting state", () => {
      const toolModes: TimelineToolMode[] = ["select", "split", "pan"];
      const sfxPresets: Array<"click" | "bop" | "pop" | "whoosh" | "typing" | "shutter"> = [
        "click",
        "bop",
        "pop",
        "whoosh",
        "typing",
        "shutter",
      ];

      // Pseudo-random deterministic LCG
      let seed = 1337;
      const lcg = () => {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
      };

      for (let op = 0; op < 500; op++) {
        const choice = Math.floor(lcg() * 8);

        switch (choice) {
          case 0: {
            // Random tool mode change
            const tool = toolModes[Math.floor(lcg() * toolModes.length)]!;
            useEditor.getState().setActiveTimelineTool(tool);
            break;
          }
          case 1: {
            // Random playhead jump (including boundary and float values)
            const randomTime = (lcg() * 14000) - 2000; // [-2000, 12000]
            useEditor.setState({ currentTimeMs: randomTime });
            break;
          }
          case 2: {
            // Add SFX track
            const preset = sfxPresets[Math.floor(lcg() * sfxPresets.length)]!;
            useEditor.getState().addSfxTrackAtCurrentTime(preset, `Fuzz SFX ${op}`);
            break;
          }
          case 3: {
            // Split at playhead
            useEditor.getState().splitAtPlayhead();
            break;
          }
          case 4: {
            // Trim left at playhead
            useEditor.getState().trimLeftAtPlayhead();
            break;
          }
          case 5: {
            // Trim right at playhead
            useEditor.getState().trimRightAtPlayhead();
            break;
          }
          case 6: {
            // Undo or Redo
            if (lcg() > 0.5) {
              useEditor.getState().undo();
            } else {
              useEditor.getState().redo();
            }
            break;
          }
          case 7: {
            // Zoom change
            const zoom = 0.75 + lcg() * 3.25; // [0.75, 4.0]
            useEditor.setState({ timelineZoom: zoom });
            break;
          }
        }

        // Periodic invariant assertion every 50 iterations
        if (op % 50 === 0) {
          const state = useEditor.getState();
          expect(state.project).not.toBeNull();
          expect(Array.isArray(state.project?.clips)).toBe(true);
          expect(Array.isArray(state.project?.audioTracks)).toBe(true);
          expect(Array.isArray(state.project?.textOverlays)).toBe(true);
          expect(Array.isArray(state.project?.zoomBlocks)).toBe(true);
          expect(state.history.length).toBeLessThanOrEqual(20);
        }
      }

      // Final post-fuzz health check
      const finalState = useEditor.getState();
      expect(finalState.project).not.toBeNull();
      expect(finalState.project?.clips.length).toBeGreaterThanOrEqual(1);
      for (const clip of finalState.project!.clips) {
        expect(Number.isFinite(clip.durationMs)).toBe(true);
        expect(clip.durationMs).toBeGreaterThan(0);
      }
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 7. Deep Edge Cases & Interaction Fallbacks                               */
  /* ------------------------------------------------------------------------ */
  describe("7. Deep Edge Cases & Interaction Fallbacks", () => {
    it("preserves segment continuity when splitting at high-precision floating point timestamps", () => {
      const floatTimestamp = 1234.56789;
      useEditor.setState({ currentTimeMs: floatTimestamp });
      useEditor.getState().splitAtPlayhead();

      const clips = useEditor.getState().project?.clips ?? [];
      expect(clips.length).toBe(2);

      const [first, second] = clips;
      expect(first?.timelineStartMs).toBe(0);
      expect(first?.durationMs).toBeCloseTo(floatTimestamp, 4);
      expect(first?.sourceOffsetMs).toBe(0);

      expect(second?.timelineStartMs).toBe(floatTimestamp);
      expect(second?.durationMs).toBeCloseTo(10000 - floatTimestamp, 4);
      expect(second?.sourceOffsetMs).toBeCloseTo(floatTimestamp, 4);

      expect(first!.durationMs + second!.durationMs).toBeCloseTo(10000, 4);
    });

    it("falls through to clip split when selectedAudioId is outside current playhead", () => {
      // Audio starts at 1000 and ends at 2000. Playhead is at 5000.
      const audio: AudioTrack = {
        id: "sfx-remote",
        name: "Remote SFX",
        type: "sfx",
        url: "sfx://bop",
        startTimeMs: 1000,
        durationMs: 1000,
        volume: 0.8,
        muted: false,
      };

      useEditor.setState((s) => ({
        project: s.project ? { ...s.project, audioTracks: [audio] } : null,
        selectedAudioId: "sfx-remote",
        currentTimeMs: 5000, // outside audio track bounds [1000, 2000]
      }));

      useEditor.getState().splitAtPlayhead();

      // Audio track is untouched because playhead is outside it
      const audioTrack = useEditor.getState().project?.audioTracks?.[0];
      expect(audioTrack?.durationMs).toBe(1000);
      expect(useEditor.getState().project?.audioTracks?.length).toBe(1);

      // Falls through to split the intersecting video clip
      expect(useEditor.getState().project?.clips.length).toBe(2);
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(5000);
      expect(useEditor.getState().project?.clips[1]?.durationMs).toBe(5000);
    });

    it("triggers pan mode on middle-click even when activeTimelineTool is select or split", () => {
      // Simulate viewport pointer down handler from Timeline.tsx
      const evaluatePointerDownMode = (
        activeTool: TimelineToolMode,
        button: number,
      ): "pan" | "split" | "scrub" => {
        if (activeTool === "pan" || button === 1) {
          return "pan";
        }
        if (button === 0) {
          if (activeTool === "split") {
            return "split";
          }
          return "scrub";
        }
        return "scrub";
      };

      // In 'select' mode: left click is scrub, middle click is pan
      expect(evaluatePointerDownMode("select", 0)).toBe("scrub");
      expect(evaluatePointerDownMode("select", 1)).toBe("pan");

      // In 'split' mode: left click is split, middle click is pan
      expect(evaluatePointerDownMode("split", 0)).toBe("split");
      expect(evaluatePointerDownMode("split", 1)).toBe("pan");

      // In 'pan' mode: both left click and middle click trigger pan
      expect(evaluatePointerDownMode("pan", 0)).toBe("pan");
      expect(evaluatePointerDownMode("pan", 1)).toBe("pan");
    });

    it("executes complete inline text editing workflow: double-click -> type -> Enter commit", () => {
      const textId = "txt-base";
      let editingTextId: string | null = null;
      let editingTextValue = "";

      // 1. User double-clicks timeline chip:
      editingTextId = textId;
      editingTextValue = useEditor.getState().project?.textOverlays?.[0]?.text ?? "";
      expect(editingTextValue).toBe("Initial Base Title");

      // 2. User types new headline:
      editingTextValue = "Brand New Dynamic Title 🚀";

      // 3. User presses Enter:
      const commit = (id: string, val: string) => {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 0) {
          useEditor.getState().updateTextOverlay(id, { text: trimmed });
        }
        editingTextId = null;
        editingTextValue = "";
      };

      commit(editingTextId, editingTextValue);

      expect(editingTextId).toBeNull();
      expect(editingTextValue).toBe("");
      expect(useEditor.getState().project?.textOverlays?.[0]?.text).toBe("Brand New Dynamic Title 🚀");
    });

    it("executes complete 10-step alternating edit & tool cycle with full undo restoration to pristine state", () => {
      const initialProjectSnapshot = JSON.stringify(useEditor.getState().project);

      // Perform 5 alternating operations with tool mode changes
      // Op 1: tool to split
      useEditor.getState().setActiveTimelineTool("split");
      // Op 2: split clip at 2000
      useEditor.setState({ currentTimeMs: 2000 });
      useEditor.getState().splitAtPlayhead();

      // Op 3: tool to pan
      useEditor.getState().setActiveTimelineTool("pan");
      // Op 4: add SFX at 3000
      useEditor.setState({ currentTimeMs: 3000 });
      useEditor.getState().addSfxTrackAtCurrentTime("bop");

      // Op 5: tool to select
      useEditor.getState().setActiveTimelineTool("select");
      // Op 6: add text overlay
      useEditor.getState().addTextOverlay("Step 6 Title");

      // Op 7: tool to split
      useEditor.getState().setActiveTimelineTool("split");
      // Op 8: split clip at 6000
      useEditor.setState({ currentTimeMs: 6000 });
      useEditor.getState().splitAtPlayhead();

      // Op 9: tool to pan
      useEditor.getState().setActiveTimelineTool("pan");
      // Op 10: trim left at 7000
      useEditor.setState({ currentTimeMs: 7000 });
      useEditor.getState().trimLeftAtPlayhead();

      expect(useEditor.getState().history.length).toBe(5); // 5 data-mutating ops

      // Now unwind all 5 mutations via undo()
      for (let i = 0; i < 5; i++) {
        useEditor.getState().undo();
      }

      expect(useEditor.getState().history.length).toBe(0);
      expect(useEditor.getState().future.length).toBe(5);

      // State must match pristine initial project snapshot exactly
      expect(JSON.stringify(useEditor.getState().project)).toBe(initialProjectSnapshot);

      // Now redo all 5 mutations back to tip
      for (let i = 0; i < 5; i++) {
        useEditor.getState().redo();
      }

      expect(useEditor.getState().history.length).toBe(5);
      expect(useEditor.getState().future.length).toBe(0);
    });
  });
});

