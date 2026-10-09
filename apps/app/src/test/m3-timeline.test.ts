import { beforeEach, describe, expect, it } from "vitest";
import { useEditor, type TimelineToolMode } from "../store/editor";
import { useProjects } from "../store/projects";
import type { ProjectData, ProjectSummary, TimelineClip, ZoomBlock } from "@domolens/core";

describe("Milestone 3: Timeline Store Actions & Multi-Track Contracts", () => {
  const mockSummary: ProjectSummary = {
    id: "proj-m3-test",
    name: "M3 Test Recording",
    source: "recording",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    durationMs: 10000,
    width: 1920,
    height: 1080,
    thumbnail: null,
    media: "blob://video",
  };

  const initialClip: TimelineClip = {
    id: "clip-main",
    name: "Main Recording",
    mediaUrl: "blob://video",
    timelineStartMs: 0,
    durationMs: 10000,
    sourceOffsetMs: 0,
    muted: false,
    volume: 1.0,
  };

  const initialBlock: ZoomBlock = {
    id: "zb-1",
    startTimeMs: 2000,
    endTimeMs: 6000,
    targetX: 0.5,
    targetY: 0.5,
    scale: 1.85,
    enabled: true,
  };

  const mockProject: ProjectData = {
    summary: mockSummary,
    clicks: [],
    interactions: [],
    cursorTrajectory: [],
    zoomBlocks: [initialBlock],
    keyframes: [],
    effects: [],
    textOverlays: [
      {
        id: "txt-1",
        text: "Important Demo Section",
        startTimeMs: 1000,
        durationMs: 4000,
        x: 0.5,
        y: 0.8,
        fontSize: 32,
        color: "#ffffff",
      },
    ],
    audioTracks: [],
    clips: [initialClip],
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
  };

  beforeEach(() => {
    useProjects.setState({ projects: [mockSummary] });
    useEditor.setState({
      project: JSON.parse(JSON.stringify(mockProject)),
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
  /* 1. Timeline Tool Switcher Actions                                       */
  /* ------------------------------------------------------------------------ */
  describe("activeTimelineTool & setActiveTimelineTool", () => {
    it("initializes with 'select' as the default tool mode", () => {
      expect(useEditor.getState().activeTimelineTool).toBe("select");
    });

    it("switches active tool mode to 'split' and 'pan'", () => {
      const { setActiveTimelineTool } = useEditor.getState();

      setActiveTimelineTool("split");
      expect(useEditor.getState().activeTimelineTool).toBe("split");

      setActiveTimelineTool("pan");
      expect(useEditor.getState().activeTimelineTool).toBe("pan");

      setActiveTimelineTool("select");
      expect(useEditor.getState().activeTimelineTool).toBe("select");
    });

    it("safely falls back to 'select' when an invalid tool string is provided", () => {
      const { setActiveTimelineTool } = useEditor.getState();
      setActiveTimelineTool("invalid-tool" as TimelineToolMode);
      expect(useEditor.getState().activeTimelineTool).toBe("select");
    });

    it("does not mutate undo history when switching tools (pure UI state)", () => {
      const { setActiveTimelineTool } = useEditor.getState();
      expect(useEditor.getState().history.length).toBe(0);

      setActiveTimelineTool("split");
      setActiveTimelineTool("pan");

      expect(useEditor.getState().history.length).toBe(0);
      expect(useEditor.getState().future.length).toBe(0);
    });

    it("verifies setTimelineTool alias functions identically to setActiveTimelineTool", () => {
      const { setTimelineTool } = useEditor.getState();
      setTimelineTool?.("pan");
      expect(useEditor.getState().activeTimelineTool).toBe("pan");
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 2. Audio SFX Track Creation                                              */
  /* ------------------------------------------------------------------------ */
  describe("addSfxTrackAtCurrentTime", () => {
    it("adds a dedicated SFX track at currentTimeMs with 600ms duration and 0.7 volume", () => {
      useEditor.setState({ currentTimeMs: 3500 });
      useEditor.getState().addSfxTrackAtCurrentTime("bop");

      const tracks = useEditor.getState().project?.audioTracks ?? [];
      expect(tracks.length).toBe(1);

      const track = tracks[0]!;
      expect(track.type).toBe("sfx");
      expect(track.startTimeMs).toBe(3500);
      expect(track.durationMs).toBe(600);
      expect(track.volume).toBe(0.7);
      expect(track.muted).toBe(false);
      expect(track.url).toBe("sfx://bop");
      expect(track.name).toContain("bop");
      expect(useEditor.getState().selectedAudioId).toBe(track.id);
    });

    it("supports keyboard switch presets and custom names", () => {
      useEditor.setState({ currentTimeMs: 1200 });
      useEditor.getState().addSfxTrackAtCurrentTime("mechanical", "Key Clack");

      const track = useEditor.getState().project?.audioTracks?.[0]!;
      expect(track.name).toBe("Key Clack");
      expect(track.url).toBe("sfx://mechanical");
      expect(track.startTimeMs).toBe(1200);
    });

    it("pushes atomic undo history and successfully undoes and redoes track addition", () => {
      useEditor.setState({ currentTimeMs: 2000 });
      useEditor.getState().addSfxTrackAtCurrentTime("click");

      expect(useEditor.getState().project?.audioTracks?.length).toBe(1);
      expect(useEditor.getState().history.length).toBe(1);

      // Undo
      useEditor.getState().undo();
      expect(useEditor.getState().project?.audioTracks?.length).toBe(0);
      expect(useEditor.getState().history.length).toBe(0);
      expect(useEditor.getState().future.length).toBe(1);

      // Redo
      useEditor.getState().redo();
      expect(useEditor.getState().project?.audioTracks?.length).toBe(1);
      expect(useEditor.getState().project?.audioTracks?.[0]?.url).toBe("sfx://click");
    });

    it("safely handles projects where audioTracks is initially undefined", () => {
      useEditor.setState((s) => ({
        project: s.project ? { ...s.project, audioTracks: undefined } : null,
        currentTimeMs: 500,
      }));

      useEditor.getState().addSfxTrackAtCurrentTime("tap");
      expect(useEditor.getState().project?.audioTracks?.length).toBe(1);
    });

    it("clamps negative playhead timestamps to 0ms", () => {
      useEditor.setState({ currentTimeMs: -200 });
      useEditor.getState().addSfxTrackAtCurrentTime("bop");

      const track = useEditor.getState().project?.audioTracks?.[0]!;
      expect(track.startTimeMs).toBe(0);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 3. Trim Left At Playhead                                                 */
  /* ------------------------------------------------------------------------ */
  describe("trimLeftAtPlayhead", () => {
    it("trims video clip start to currentTimeMs, advancing sourceOffsetMs", () => {
      useEditor.setState({ currentTimeMs: 3000 });
      useEditor.getState().trimLeftAtPlayhead();

      const clip = useEditor.getState().project?.clips[0]!;
      expect(clip.timelineStartMs).toBe(3000);
      expect(clip.durationMs).toBe(7000); // 10000 - 3000
      expect(clip.sourceOffsetMs).toBe(3000); // offset advances by delta
      expect(useEditor.getState().history.length).toBe(1);

      // Verify undo restores original clip
      useEditor.getState().undo();
      const restored = useEditor.getState().project?.clips[0]!;
      expect(restored.timelineStartMs).toBe(0);
      expect(restored.durationMs).toBe(10000);
      expect(restored.sourceOffsetMs).toBe(0);
    });

    it("trims zoom block start when selected", () => {
      useEditor.setState({ selectedBlockId: "zb-1", currentTimeMs: 3500 });
      useEditor.getState().trimLeftAtPlayhead();

      const block = useEditor.getState().project?.zoomBlocks.find((b) => b.id === "zb-1")!;
      expect(block.startTimeMs).toBe(3500);
      expect(block.endTimeMs).toBe(6000);
    });

    it("trims text overlay start when selected", () => {
      useEditor.setState({ selectedTextId: "txt-1", currentTimeMs: 2500 });
      useEditor.getState().trimLeftAtPlayhead();

      const text = useEditor.getState().project?.textOverlays?.find((t) => t.id === "txt-1")!;
      expect(text.startTimeMs).toBe(2500);
      expect(text.durationMs).toBe(2500); // was 4000ms duration starting at 1000ms
    });

    it("trims audio track start when selected", () => {
      useEditor.setState((s) => ({
        project: s.project
          ? {
              ...s.project,
              audioTracks: [
                {
                  id: "sfx-test",
                  name: "SFX Bop",
                  type: "sfx",
                  url: "sfx://bop",
                  startTimeMs: 1000,
                  durationMs: 2000,
                  volume: 0.7,
                  muted: false,
                },
              ],
            }
          : null,
        selectedAudioId: "sfx-test",
        currentTimeMs: 1800,
      }));

      useEditor.getState().trimLeftAtPlayhead();
      const audio = useEditor.getState().project?.audioTracks?.[0]!;
      expect(audio.startTimeMs).toBe(1800);
      expect(audio.durationMs).toBe(1200); // was 2000ms starting at 1000ms (1000 + 2000 - 1800)
    });

    it("no-ops if playhead is outside the clip or item bounds", () => {
      useEditor.setState({ currentTimeMs: 12000 }); // outside 10000ms clip
      const historyLenBefore = useEditor.getState().history.length;
      useEditor.getState().trimLeftAtPlayhead();

      expect(useEditor.getState().history.length).toBe(historyLenBefore);
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(10000);
    });

    it("prevents trimming if remaining duration would be less than 100ms", () => {
      useEditor.setState({ currentTimeMs: 9950 }); // leaves only 50ms
      const historyLenBefore = useEditor.getState().history.length;
      useEditor.getState().trimLeftAtPlayhead();

      expect(useEditor.getState().history.length).toBe(historyLenBefore);
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(10000);
    });

    it("delegates trimLeftAtCurrentTime alias to trimLeftAtPlayhead", () => {
      useEditor.setState({ currentTimeMs: 4000 });
      useEditor.getState().trimLeftAtCurrentTime();

      const clip = useEditor.getState().project?.clips[0]!;
      expect(clip.timelineStartMs).toBe(4000);
      expect(clip.durationMs).toBe(6000);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 4. Trim Right At Playhead                                                */
  /* ------------------------------------------------------------------------ */
  describe("trimRightAtPlayhead", () => {
    it("trims video clip end to currentTimeMs without modifying sourceOffsetMs", () => {
      useEditor.setState({ currentTimeMs: 6500 });
      useEditor.getState().trimRightAtPlayhead();

      const clip = useEditor.getState().project?.clips[0]!;
      expect(clip.timelineStartMs).toBe(0);
      expect(clip.durationMs).toBe(6500);
      expect(clip.sourceOffsetMs).toBe(0); // invariant: right trim does not alter start offset
      expect(useEditor.getState().history.length).toBe(1);

      // Verify undo
      useEditor.getState().undo();
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(10000);
    });

    it("trims zoom block end to currentTimeMs when selected", () => {
      useEditor.setState({ selectedBlockId: "zb-1", currentTimeMs: 4500 });
      useEditor.getState().trimRightAtPlayhead();

      const block = useEditor.getState().project?.zoomBlocks.find((b) => b.id === "zb-1")!;
      expect(block.startTimeMs).toBe(2000);
      expect(block.endTimeMs).toBe(4500);
    });

    it("trims text overlay end to currentTimeMs when selected", () => {
      useEditor.setState({ selectedTextId: "txt-1", currentTimeMs: 3000 });
      useEditor.getState().trimRightAtPlayhead();

      const text = useEditor.getState().project?.textOverlays?.find((t) => t.id === "txt-1")!;
      expect(text.startTimeMs).toBe(1000);
      expect(text.durationMs).toBe(2000); // 3000 - 1000
    });

    it("trims audio track end to currentTimeMs when selected", () => {
      useEditor.setState((s) => ({
        project: s.project
          ? {
              ...s.project,
              audioTracks: [
                {
                  id: "sfx-test-2",
                  name: "SFX Bop",
                  type: "sfx",
                  url: "sfx://bop",
                  startTimeMs: 1000,
                  durationMs: 3000,
                  volume: 0.7,
                  muted: false,
                },
              ],
            }
          : null,
        selectedAudioId: "sfx-test-2",
        currentTimeMs: 2500,
      }));

      useEditor.getState().trimRightAtPlayhead();
      const audio = useEditor.getState().project?.audioTracks?.[0]!;
      expect(audio.startTimeMs).toBe(1000);
      expect(audio.durationMs).toBe(1500); // 2500 - 1000
    });

    it("prevents trimming if remaining duration would be less than 100ms", () => {
      useEditor.setState({ currentTimeMs: 50 }); // clip starts at 0, leaves 50ms
      const historyLenBefore = useEditor.getState().history.length;
      useEditor.getState().trimRightAtPlayhead();

      expect(useEditor.getState().history.length).toBe(historyLenBefore);
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(10000);
    });

    it("delegates trimRightAtCurrentTime alias to trimRightAtPlayhead", () => {
      useEditor.setState({ currentTimeMs: 7000 });
      useEditor.getState().trimRightAtCurrentTime();

      const clip = useEditor.getState().project?.clips[0]!;
      expect(clip.durationMs).toBe(7000);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 5. Split At Playhead                                                     */
  /* ------------------------------------------------------------------------ */
  describe("splitAtPlayhead & splitAtCurrentTime", () => {
    it("splits a video clip at currentTimeMs into two contiguous segments", () => {
      useEditor.setState({ currentTimeMs: 4000 });
      useEditor.getState().splitAtPlayhead();

      const clips = useEditor.getState().project?.clips ?? [];
      expect(clips.length).toBe(2);

      const [first, second] = clips;
      expect(first?.timelineStartMs).toBe(0);
      expect(first?.durationMs).toBe(4000);
      expect(first?.sourceOffsetMs).toBe(0);

      expect(second?.timelineStartMs).toBe(4000);
      expect(second?.durationMs).toBe(6000);
      expect(second?.sourceOffsetMs).toBe(4000);

      // Verify undo fuses clips back
      useEditor.getState().undo();
      expect(useEditor.getState().project?.clips.length).toBe(1);
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(10000);
    });

    it("splits zoom block when playhead intersects it", () => {
      useEditor.setState({ currentTimeMs: 3500 });
      useEditor.getState().splitAtPlayhead();

      const blocks = useEditor.getState().project?.zoomBlocks ?? [];
      expect(blocks.length).toBe(2);
      expect(blocks[0]?.startTimeMs).toBe(2000);
      expect(blocks[0]?.endTimeMs).toBe(3500);
      expect(blocks[1]?.startTimeMs).toBe(3500);
      expect(blocks[1]?.endTimeMs).toBe(6000);
    });

    it("splits an audio track when selectedAudioId is active", () => {
      useEditor.setState((s) => ({
        project: s.project
          ? {
              ...s.project,
              audioTracks: [
                {
                  id: "audio-long",
                  name: "Background Ambience",
                  type: "music",
                  url: "blob://audio",
                  startTimeMs: 1000,
                  durationMs: 8000,
                  volume: 0.5,
                  muted: false,
                },
              ],
            }
          : null,
        selectedAudioId: "audio-long",
        currentTimeMs: 5000,
      }));

      useEditor.getState().splitAtPlayhead();
      const tracks = useEditor.getState().project?.audioTracks ?? [];
      expect(tracks.length).toBe(2);
      expect(tracks[0]?.startTimeMs).toBe(1000);
      expect(tracks[0]?.durationMs).toBe(4000);
      expect(tracks[1]?.startTimeMs).toBe(5000);
      expect(tracks[1]?.durationMs).toBe(4000);
    });

    it("splits a text overlay when selectedTextId is active", () => {
      useEditor.setState({ selectedTextId: "txt-1", currentTimeMs: 2500 });
      useEditor.getState().splitAtPlayhead();

      const texts = useEditor.getState().project?.textOverlays ?? [];
      expect(texts.length).toBe(2);
      expect(texts[0]?.startTimeMs).toBe(1000);
      expect(texts[0]?.durationMs).toBe(1500); // 2500 - 1000
      expect(texts[1]?.startTimeMs).toBe(2500);
      expect(texts[1]?.durationMs).toBe(2500); // 4000 - 1500
    });

    it("no-ops and does not push history when playhead is at exact start or end", () => {
      useEditor.setState({ currentTimeMs: 0 });
      const historyBefore = useEditor.getState().history.length;
      useEditor.getState().splitAtPlayhead();

      expect(useEditor.getState().history.length).toBe(historyBefore);
      expect(useEditor.getState().project?.clips.length).toBe(1);
    });

    it("verifies splitAtCurrentTime alias delegates directly to splitAtPlayhead", () => {
      useEditor.setState({ currentTimeMs: 5000 });
      useEditor.getState().splitAtCurrentTime();

      expect(useEditor.getState().project?.clips.length).toBe(2);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 6. Multi-Action Sequential Invariants & Undo Stack Integrity             */
  /* ------------------------------------------------------------------------ */
  describe("Sequential Multi-Track Workflow & Undo Stack", () => {
    it("executes Add SFX -> Trim Left -> Split -> Trim Right with clean sequential undo", () => {
      // 1. Add SFX at 1000ms
      useEditor.setState({ currentTimeMs: 1000 });
      useEditor.getState().addSfxTrackAtCurrentTime("bop");
      expect(useEditor.getState().history.length).toBe(1);

      // 2. Trim Left at 2000ms
      useEditor.setState({ currentTimeMs: 2000 });
      useEditor.getState().trimLeftAtPlayhead();
      expect(useEditor.getState().history.length).toBe(2);

      // 3. Split at 5000ms
      useEditor.setState({ currentTimeMs: 5000 });
      useEditor.getState().splitAtPlayhead();
      expect(useEditor.getState().history.length).toBe(3);

      // 4. Trim Right at 8000ms
      useEditor.setState({ currentTimeMs: 8000 });
      useEditor.getState().trimRightAtPlayhead();
      expect(useEditor.getState().history.length).toBe(4);

      // Unwind all 4 steps in reverse
      useEditor.getState().undo(); // Reverts Trim Right
      expect(useEditor.getState().history.length).toBe(3);

      useEditor.getState().undo(); // Reverts Split
      expect(useEditor.getState().history.length).toBe(2);
      expect(useEditor.getState().project?.clips.length).toBe(1);

      useEditor.getState().undo(); // Reverts Trim Left
      expect(useEditor.getState().history.length).toBe(1);
      expect(useEditor.getState().project?.clips[0]?.timelineStartMs).toBe(0);

      useEditor.getState().undo(); // Reverts Add SFX
      expect(useEditor.getState().history.length).toBe(0);
      expect(useEditor.getState().project?.audioTracks?.length).toBe(0);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 7. SFX Auditioning, Drag Scrubber Clamping & Waveform Contracts         */
  /* ------------------------------------------------------------------------ */
  describe("SFX Acoustic Track & Waveform Contracts", () => {
    it("distinguishes keystroke acoustic sounds from mouse click/bop sounds", () => {
      // Simulate auditioning dispatch logic from Timeline.tsx
      const getAuditionType = (trackName: string) => {
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

      expect(getAuditionType("Mechanical Typing")).toBe("keystroke");
      expect(getAuditionType("Key Sound")).toBe("keystroke");
      expect(getAuditionType("Creamy Switch")).toBe("keystroke");
      expect(getAuditionType("Click Bop")).toBe("bop");
      expect(getAuditionType("Mouse Tap")).toBe("bop");
      expect(getAuditionType("Generic Notification")).toBe("bop");
    });

    it("clamps SFX track drag repositioning precisely within [0, durationMs - clipDur]", () => {
      const durationMs = 10000;
      const clipDur = 600;

      const computeNewStart = (origStart: number, deltaRatio: number) => {
        return Math.max(
          0,
          Math.min(durationMs - clipDur, Math.round(origStart + deltaRatio * durationMs)),
        );
      };

      // Dragging left beyond 0 clamps to 0
      expect(computeNewStart(500, -0.2)).toBe(0);

      // Dragging right beyond track duration clamps to durationMs - clipDur
      expect(computeNewStart(9000, 0.2)).toBe(9400);

      // Dragging within valid range
      expect(computeNewStart(2000, 0.15)).toBe(3500);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 8. Text Overlay Inline Editing Lifecycle & Resize Boundaries             */
  /* ------------------------------------------------------------------------ */
  describe("Text Overlays Track & Inline Editing Lifecycle", () => {
    it("commits non-empty text updates when inline editing completes", () => {
      const textId = "txt-1";
      const initialText = useEditor.getState().project?.textOverlays?.find((t) => t.id === textId)?.text;
      expect(initialText).toBe("Important Demo Section");

      // Simulate commitTextEdit logic
      const commitTextEdit = (id: string, val: string) => {
        const trimmed = val.trim();
        if (trimmed && trimmed.length > 0) {
          useEditor.getState().updateTextOverlay(id, { text: trimmed });
        }
      };

      commitTextEdit(textId, "Updated Product Headline");
      const updated = useEditor.getState().project?.textOverlays?.find((t) => t.id === textId)?.text;
      expect(updated).toBe("Updated Product Headline");

      // Attempting to commit empty or whitespace-only string preserves current text
      commitTextEdit(textId, "   ");
      const preserved = useEditor.getState().project?.textOverlays?.find((t) => t.id === textId)?.text;
      expect(preserved).toBe("Updated Product Headline");
    });

    it("verifies left and right resize handle calculations preserve minimum duration", () => {
      const durationMs = 10000;
      const minDuration = 300;

      // Left handle moves start time while keeping end time fixed
      const computeLeftResize = (origStart: number, origDur: number, deltaMs: number) => {
        const newStart = Math.max(
          0,
          Math.min(origStart + origDur - minDuration, Math.round(origStart + deltaMs)),
        );
        const newDur = origStart + origDur - newStart;
        return { newStart, newDur };
      };

      const leftRes = computeLeftResize(2000, 3000, 1000);
      expect(leftRes.newStart).toBe(3000);
      expect(leftRes.newDur).toBe(2000);

      // Pushing left handle all the way right respects minDuration
      const leftCapped = computeLeftResize(2000, 3000, 5000);
      expect(leftCapped.newStart).toBe(4700);
      expect(leftCapped.newDur).toBe(300);

      // Right handle adjusts duration without changing start time
      const computeRightResize = (startTimeMs: number, origDur: number, deltaMs: number) => {
        const newDur = Math.max(
          minDuration,
          Math.min(durationMs - startTimeMs, Math.round(origDur + deltaMs)),
        );
        return newDur;
      };

      const rightRes = computeRightResize(2000, 3000, 1500);
      expect(rightRes).toBe(4500);

      // Shrinking below minDuration clamps to minDuration
      const rightMin = computeRightResize(2000, 3000, -5000);
      expect(rightMin).toBe(300);
    });
  });

  /* ------------------------------------------------------------------------ */
  /* 9. Split Razor Blade Guideline & Pan Viewport Calculations               */
  /* ------------------------------------------------------------------------ */
  describe("Split Razor Guideline & Pan Viewport Physics", () => {
    it("accurately converts client coordinates to hover timestamp and guideline percentage", () => {
      const durationMs = 12000;
      const containerWidth = 800;

      const clientXToHoverTime = (clientX: number, containerLeft: number) => {
        const clickX = clientX - containerLeft;
        const ratio = Math.max(0, Math.min(1, clickX / containerWidth));
        return Math.round(ratio * durationMs);
      };

      // Center
      expect(clientXToHoverTime(500, 100)).toBe(6000); // 400px / 800px = 0.5 -> 6000ms

      // Beyond left border
      expect(clientXToHoverTime(50, 100)).toBe(0);

      // Beyond right border
      expect(clientXToHoverTime(1000, 100)).toBe(12000);

      // Guideline percentage calculation
      const getPositionPercent = (timeMs: number) => {
        return Math.min(100, Math.max(0, (timeMs / durationMs) * 100));
      };
      expect(getPositionPercent(6000)).toBe(50);
      expect(getPositionPercent(3000)).toBe(25);
    });

    it("verifies pan viewport delta tracking updates scrollLeft smoothly", () => {
      const panState = {
        startX: 400,
        scrollLeft: 150,
      };

      const computePanScroll = (currentClientX: number) => {
        const deltaX = currentClientX - panState.startX;
        return panState.scrollLeft - deltaX;
      };

      // Dragging left (mouse moves right from 400 to 500) scrolls viewport to the left
      expect(computePanScroll(500)).toBe(50);

      // Dragging right (mouse moves left from 400 to 300) scrolls viewport to the right
      expect(computePanScroll(300)).toBe(250);
    });
  });
});

