import { beforeEach, describe, expect, it } from "vitest";
import { useEditor, type TimelineToolMode } from "../store/editor";
import { useProjects } from "../store/projects";
import type { ProjectData, ProjectSummary, TimelineClip, ZoomBlock } from "@domolens/core";

describe("Milestone 3 Adversarial Critic Stress Tests", () => {
  const mockSummary: ProjectSummary = {
    id: "proj-critic-test",
    name: "Critic Test Recording",
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
        text: "Sample Overlay",
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

  describe("1. Math & Clamping Adversarial Scenarios", () => {
    it("handles SFX drag clamping when clip duration exceeds total project duration", () => {
      const durationMs = 500;
      const clipDur = 600; // longer than timeline

      const computeNewStart = (origStart: number, deltaRatio: number) => {
        return Math.max(
          0,
          Math.min(durationMs - clipDur, Math.round(origStart + deltaRatio * durationMs)),
        );
      };

      // Math.min(500 - 600, ...) = Math.min(-100, ...), and Math.max(0, -100) = 0
      expect(computeNewStart(0, 0.5)).toBe(0);
      expect(computeNewStart(0, -0.5)).toBe(0);
    });

    it("handles zero total duration gracefully without NaN", () => {
      const durationMs = 0;
      const clipDur = 600;

      const computeNewStart = (origStart: number, deltaRatio: number) => {
        return Math.max(
          0,
          Math.min(durationMs - clipDur, Math.round(origStart + deltaRatio * durationMs)),
        );
      };

      expect(computeNewStart(0, 0)).toBe(0);
    });

    it("guarantees text overlay left handle preserves minimum 300ms under extreme forward drag", () => {
      const origStart = 1000;
      const origDur = 4000; // end time is 5000ms

      const computeLeftResize = (deltaMs: number) => {
        const newStart = Math.max(
          0,
          Math.min(origStart + origDur - 300, origStart + deltaMs),
        );
        const newDur = origStart + origDur - newStart;
        return { newStart, newDur };
      };

      // Extreme drag forward by 10,000ms
      const forwardExtreme = computeLeftResize(10000);
      expect(forwardExtreme.newStart).toBe(4700);
      expect(forwardExtreme.newDur).toBe(300);

      // Extreme drag backward by -5,000ms (clamped at 0)
      const backwardExtreme = computeLeftResize(-5000);
      expect(backwardExtreme.newStart).toBe(0);
      expect(backwardExtreme.newDur).toBe(5000);
    });

    it("guarantees text overlay right handle preserves minimum 300ms under extreme collapse", () => {
      const startTimeMs = 1000;
      const origDur = 4000;
      const durationMs = 10000;

      const computeRightResize = (deltaMs: number) => {
        return Math.max(
          300,
          Math.min(durationMs - startTimeMs, Math.round(origDur + deltaMs)),
        );
      };

      // Shrink by -10000ms
      expect(computeRightResize(-10000)).toBe(300);

      // Expand beyond timeline by +20000ms
      expect(computeRightResize(20000)).toBe(9000); // 10000 - 1000
    });
  });

  describe("2. Split & Trim Edge Boundaries", () => {
    it("handles split at exact start boundary (0ms) by no-op without corrupting state", () => {
      useEditor.setState({ currentTimeMs: 0 });
      const snap = JSON.stringify(useEditor.getState().project);
      useEditor.getState().splitAtPlayhead();

      expect(JSON.stringify(useEditor.getState().project)).toBe(snap);
      expect(useEditor.getState().history.length).toBe(0);
    });

    it("handles split at exact end boundary (10000ms) by no-op without corrupting state", () => {
      useEditor.setState({ currentTimeMs: 10000 });
      const snap = JSON.stringify(useEditor.getState().project);
      useEditor.getState().splitAtPlayhead();

      expect(JSON.stringify(useEditor.getState().project)).toBe(snap);
      expect(useEditor.getState().history.length).toBe(0);
    });

    it("handles trimLeft when remaining duration is exactly 100ms vs 99ms", () => {
      // Clip duration is 10000ms, starts at 0ms.
      // Trimming at 9900ms leaves 100ms (allowed)
      useEditor.setState({ currentTimeMs: 9900 });
      useEditor.getState().trimLeftAtPlayhead();
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(100);
      expect(useEditor.getState().project?.clips[0]?.timelineStartMs).toBe(9900);
      expect(useEditor.getState().history.length).toBe(1);

      // Revert
      useEditor.getState().undo();
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(10000);

      // Trimming at 9901ms leaves 99ms (rejected)
      useEditor.setState({ currentTimeMs: 9901 });
      useEditor.getState().trimLeftAtPlayhead();
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(10000);
      expect(useEditor.getState().history.length).toBe(0);
    });

    it("handles trimRight when remaining duration is exactly 100ms vs 99ms", () => {
      // Trimming at 100ms leaves 100ms (allowed)
      useEditor.setState({ currentTimeMs: 100 });
      useEditor.getState().trimRightAtPlayhead();
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(100);
      expect(useEditor.getState().history.length).toBe(1);

      // Revert
      useEditor.getState().undo();

      // Trimming at 99ms leaves 99ms (rejected)
      useEditor.setState({ currentTimeMs: 99 });
      useEditor.getState().trimRightAtPlayhead();
      expect(useEditor.getState().project?.clips[0]?.durationMs).toBe(10000);
      expect(useEditor.getState().history.length).toBe(0);
    });

    it("trims selected audio track cleanly without affecting coincident video clip", () => {
      useEditor.setState((s) => ({
        project: s.project
          ? {
              ...s.project,
              audioTracks: [
                {
                  id: "sfx-overlap",
                  name: "SFX Pop",
                  type: "sfx",
                  url: "sfx://pop",
                  startTimeMs: 2000,
                  durationMs: 3000,
                  volume: 0.7,
                  muted: false,
                },
              ],
            }
          : null,
        selectedAudioId: "sfx-overlap",
        currentTimeMs: 3500,
      }));

      useEditor.getState().trimLeftAtPlayhead();

      // Audio track trimmed
      const audio = useEditor.getState().project?.audioTracks?.[0];
      expect(audio?.startTimeMs).toBe(3500);
      expect(audio?.durationMs).toBe(1500);

      // Video clip intact
      const clip = useEditor.getState().project?.clips[0];
      expect(clip?.timelineStartMs).toBe(0);
      expect(clip?.durationMs).toBe(10000);
    });

    it("trims selected text overlay cleanly without affecting coincident video clip", () => {
      useEditor.setState({
        selectedTextId: "txt-1",
        currentTimeMs: 2000,
      });

      useEditor.getState().trimRightAtPlayhead();

      // Text overlay trimmed to 1000ms duration (2000 - 1000)
      const text = useEditor.getState().project?.textOverlays?.[0];
      expect(text?.startTimeMs).toBe(1000);
      expect(text?.durationMs).toBe(1000);

      // Video clip intact
      const clip = useEditor.getState().project?.clips[0];
      expect(clip?.durationMs).toBe(10000);
    });
  });

  describe("3. Stress Fuzzing & Undo/Redo Invariants", () => {
    it("survives 15 random sequential mutations and full undo unwinding to initial snapshot", () => {
      const actions = [
        () => {
          const t = Math.floor(Math.random() * 8000);
          useEditor.setState({ currentTimeMs: t });
          useEditor.getState().addSfxTrackAtCurrentTime("click");
        },
        () => {
          const clips = useEditor.getState().project?.clips || [];
          if (clips.length > 0) {
            const clip = clips[Math.floor(Math.random() * clips.length)]!;
            if (clip.durationMs > 500) {
              const t = clip.timelineStartMs + 200;
              useEditor.setState({ currentTimeMs: t, selectedClipId: clip.id });
              useEditor.getState().trimLeftAtPlayhead();
            }
          }
        },
        () => {
          const clips = useEditor.getState().project?.clips || [];
          if (clips.length > 0) {
            const clip = clips[Math.floor(Math.random() * clips.length)]!;
            if (clip.durationMs > 500) {
              const t = clip.timelineStartMs + clip.durationMs - 200;
              useEditor.setState({ currentTimeMs: t, selectedClipId: clip.id });
              useEditor.getState().trimRightAtPlayhead();
            }
          }
        },
        () => {
          const clips = useEditor.getState().project?.clips || [];
          if (clips.length > 0) {
            const clip = clips[Math.floor(Math.random() * clips.length)]!;
            if (clip.durationMs > 600) {
              const t = clip.timelineStartMs + Math.floor(clip.durationMs / 2);
              useEditor.setState({ currentTimeMs: t, selectedClipId: null });
              useEditor.getState().splitAtPlayhead();
            }
          }
        },
      ];

      const initialProjectSnapshot = JSON.stringify(useEditor.getState().project);

      // Run 15 random actions within the 20-step history buffer
      for (let i = 0; i < 15; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)]!;
        action();
      }

      // Rewind all history steps
      const historyLen = useEditor.getState().history.length;
      expect(historyLen).toBeGreaterThan(0);
      for (let i = 0; i < historyLen; i++) {
        useEditor.getState().undo();
      }

      // After full undo within buffer capacity, history is empty and initial project is 100% restored
      expect(useEditor.getState().history.length).toBe(0);
      expect(JSON.stringify(useEditor.getState().project)).toBe(initialProjectSnapshot);
    });

    it("respects 20-entry bounded history buffer when >20 mutations occur", () => {
      // Perform 35 SFX additions
      for (let i = 0; i < 35; i++) {
        useEditor.setState({ currentTimeMs: i * 100 });
        useEditor.getState().addSfxTrackAtCurrentTime("bop");
      }

      // Bounded at 20 history states
      expect(useEditor.getState().history.length).toBe(20);

      // Unwind all 20 states without crashing
      for (let i = 0; i < 20; i++) {
        useEditor.getState().undo();
      }
      expect(useEditor.getState().history.length).toBe(0);
    });
  });

  describe("4. Tool Switching Invariants", () => {
    it("allows rapid tool switches without side effects", () => {
      const tools: TimelineToolMode[] = ["select", "split", "pan", "select", "pan", "split"];
      for (const t of tools) {
        useEditor.getState().setActiveTimelineTool(t);
        expect(useEditor.getState().activeTimelineTool).toBe(t);
      }
      expect(useEditor.getState().history.length).toBe(0);
    });

    it("rejects non-standard tool strings gracefully", () => {
      // @ts-expect-error testing invalid runtime string
      useEditor.getState().setActiveTimelineTool("razor");
      expect(useEditor.getState().activeTimelineTool).toBe("select");

      // @ts-expect-error testing invalid runtime string
      useEditor.getState().setActiveTimelineTool("");
      expect(useEditor.getState().activeTimelineTool).toBe("select");

      // @ts-expect-error testing null
      useEditor.getState().setActiveTimelineTool(null);
      expect(useEditor.getState().activeTimelineTool).toBe("select");
    });
  });
});
