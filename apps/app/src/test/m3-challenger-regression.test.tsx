import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import {
  STUDIO_MOTION_TEMPLATES,
  type AudioTrack,
  type ProjectData,
  type ProjectSummary,
  type TextOverlay,
  type TimelineClip,
} from "@domolens/core";
import { Timeline } from "../components/editor/Timeline";
import { useEditor, type TimelineToolMode } from "../store/editor";
import { useProjects } from "../store/projects";

/* ========================================================================== */
/* Test Harness: Mock Data Generators                                        */
/* ========================================================================== */

function createMockSummary(overrides: Partial<ProjectSummary> = {}): ProjectSummary {
  return {
    id: "proj-legacy-test",
    name: "Legacy Compatibility Test",
    source: "recording",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    durationMs: 12000,
    width: 1920,
    height: 1080,
    thumbnail: null,
    media: "blob://video",
    ...overrides,
  };
}

function createInitialClip(overrides: Partial<TimelineClip> = {}): TimelineClip {
  return {
    id: "clip-main",
    name: "Main Clip",
    mediaUrl: "blob://video",
    timelineStartMs: 0,
    durationMs: 12000,
    sourceOffsetMs: 0,
    muted: false,
    volume: 1.0,
    ...overrides,
  };
}

function createMockProject(overrides: Partial<ProjectData> = {}): ProjectData {
  return {
    summary: createMockSummary(),
    clicks: [],
    interactions: [],
    cursorTrajectory: [],
    zoomBlocks: [
      {
        id: "zb-1",
        startTimeMs: 2000,
        endTimeMs: 6000,
        targetX: 0.5,
        targetY: 0.5,
        scale: 1.85,
        enabled: true,
      },
    ],
    keyframes: [],
    effects: [],
    textOverlays: [
      {
        id: "txt-legacy-1",
        text: "Legacy Caption Overlay",
        startTimeMs: 1000,
        durationMs: 4000,
        x: 0.5,
        y: 0.8,
        fontSize: 32,
        color: "#ffffff",
      },
    ],
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
    ...overrides,
  };
}

describe("Milestone 3 Challenger: Regression & Backward Compatibility Suite", () => {
  beforeEach(() => {
    const summary = createMockSummary();
    useProjects.setState({ projects: [summary] });
    useEditor.setState({
      project: createMockProject(),
      currentTimeMs: 0,
      durationMs: 12000,
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

  /* ======================================================================== */
  /* Dimension 1: Legacy Project Backward Compatibility                      */
  /* ======================================================================== */
  describe("Dimension 1: Legacy Project Backward Compatibility", () => {
    it("1.1 renders Timeline without error for projects where audioTracks is undefined", () => {
      const legacyProject = createMockProject();
      delete (legacyProject as any).audioTracks;

      useEditor.setState({
        project: legacyProject,
        currentTimeMs: 1500,
        durationMs: 12000,
      });

      const markup = renderToStaticMarkup(<Timeline project={legacyProject} />);
      expect(markup).toBeDefined();
      expect(markup).toContain("SFX Track");
      expect(markup).toContain("Double-click or click + SFX to add sound effect");
      expect(markup).not.toContain("Music"); // No music lane since no audio tracks exist
    });

    it("1.2 renders Timeline without error for projects where audioTracks is an empty array", () => {
      const project = createMockProject({ audioTracks: [] });

      useEditor.setState({
        project,
        currentTimeMs: 0,
        durationMs: 12000,
      });

      const markup = renderToStaticMarkup(<Timeline project={project} />);
      expect(markup).toBeDefined();
      expect(markup).toContain("SFX Track");
      expect(markup).toContain("Double-click or click + SFX to add sound effect");
    });

    it("1.3 handles legacy single-track audio (music) properly without rendering it in SFX lane", () => {
      const legacyMusicTrack: AudioTrack = {
        id: "legacy-bg-music",
        name: "Background Ambient",
        url: "blob://audio-music",
        startTimeMs: 500,
        durationMs: 8000,
        volume: 0.6,
        type: "music",
        muted: false,
      };

      const legacyProject = createMockProject({
        audioTracks: [legacyMusicTrack],
      });

      useEditor.setState({
        project: legacyProject,
        currentTimeMs: 2000,
        durationMs: 12000,
      });

      const markup = renderToStaticMarkup(<Timeline project={legacyProject} />);
      expect(markup).toBeDefined();
      expect(markup).toContain("Double-click or click + SFX to add sound effect");
      expect(markup).toContain("Background Ambient");
      expect(markup).toContain("Music");
    });

    it("1.4 handles legacy audio track where 'type' is undefined (defaults to music lane)", () => {
      const legacyUntypedTrack: AudioTrack = {
        id: "legacy-untyped",
        name: "Old Voiceover Track",
        url: "blob://audio-voice",
        startTimeMs: 1000,
        durationMs: 6000,
        volume: 0.8,
      } as any;

      const legacyProject = createMockProject({
        audioTracks: [legacyUntypedTrack],
      });

      useEditor.setState({
        project: legacyProject,
        currentTimeMs: 1000,
        durationMs: 12000,
      });

      const markup = renderToStaticMarkup(<Timeline project={legacyProject} />);
      expect(markup).toBeDefined();
      expect(markup).toContain("Old Voiceover Track");
      expect(markup).toContain("Music");
      expect(markup).toContain("Double-click or click + SFX to add sound effect");
    });

    it("1.5 adding SFX track to a project with undefined audioTracks initializes audioTracks array cleanly", () => {
      const legacyProject = createMockProject();
      delete (legacyProject as any).audioTracks;

      useEditor.setState({
        project: legacyProject,
        currentTimeMs: 2500,
      });

      const { addSfxTrackAtCurrentTime } = useEditor.getState();
      addSfxTrackAtCurrentTime("pop", "Pop Effect");

      const updatedProject = useEditor.getState().project!;
      expect(updatedProject.audioTracks).toBeDefined();
      expect(updatedProject.audioTracks?.length).toBe(1);
      const firstTrack = updatedProject.audioTracks?.[0];
      expect(firstTrack).toBeDefined();
      expect(firstTrack?.name).toBe("Pop Effect");
      expect(firstTrack?.type).toBe("sfx");
      expect(firstTrack?.startTimeMs).toBe(2500);
      expect(firstTrack?.durationMs).toBe(600);
    });

    it("1.6 adding SFX track to a project with legacy music track results in non-interfering multi-track audio", () => {
      const legacyMusic: AudioTrack = {
        id: "bg-music-1",
        name: "Background Melody",
        url: "blob://music",
        startTimeMs: 0,
        durationMs: 10000,
        volume: 0.5,
        type: "music",
        muted: false,
      };

      const projectWithMusic = createMockProject({
        audioTracks: [legacyMusic],
      });

      useEditor.setState({
        project: projectWithMusic,
        currentTimeMs: 3000,
      });

      useEditor.getState().addSfxTrackAtCurrentTime("bop", "Click Bop SFX");

      const updated = useEditor.getState().project!;
      expect(updated.audioTracks?.length).toBe(2);
      const sfx = updated.audioTracks?.find((t) => t.type === "sfx");
      const music = updated.audioTracks?.find((t) => t.type === "music");

      expect(sfx).toBeDefined();
      expect(sfx?.name).toBe("Click Bop SFX");
      expect(sfx?.startTimeMs).toBe(3000);

      expect(music).toBeDefined();
      expect(music?.id).toBe("bg-music-1");
      expect(music?.durationMs).toBe(10000);
      expect(music?.startTimeMs).toBe(0);

      const markup = renderToStaticMarkup(<Timeline project={updated} />);
      expect(markup).toContain("Click Bop SFX");
      expect(markup).toContain("Background Melody");
    });

    it("1.7 deleting SFX track leaves legacy music track intact and vice versa", () => {
      const legacyMusic: AudioTrack = {
        id: "bg-music-1",
        name: "Background Melody",
        url: "blob://music",
        startTimeMs: 0,
        durationMs: 10000,
        volume: 0.5,
        type: "music",
        muted: false,
      };

      const sfxTrack: AudioTrack = {
        id: "sfx-track-1",
        name: "Typing Sound",
        url: "blob://typing",
        startTimeMs: 2000,
        durationMs: 600,
        volume: 0.7,
        type: "sfx",
        muted: false,
      };

      useEditor.setState({
        project: createMockProject({
          audioTracks: [legacyMusic, sfxTrack],
        }),
      });

      useEditor.getState().deleteAudioTrack("sfx-track-1");
      let currentTracks = useEditor.getState().project!.audioTracks;
      expect(currentTracks?.length).toBe(1);
      expect(currentTracks?.[0]?.id).toBe("bg-music-1");

      useEditor.setState({
        project: createMockProject({
          audioTracks: [legacyMusic, sfxTrack],
        }),
      });
      useEditor.getState().deleteAudioTrack("bg-music-1");
      currentTracks = useEditor.getState().project!.audioTracks;
      expect(currentTracks?.length).toBe(1);
      expect(currentTracks?.[0]?.id).toBe("sfx-track-1");
    });

    it("1.8 handles legacy text overlays without motionPreset or cardStyle gracefully", () => {
      const legacyText: TextOverlay = {
        id: "txt-legacy-simple",
        text: "Simple Raw Title",
        startTimeMs: 500,
        durationMs: 3000,
        x: 0.5,
        y: 0.5,
        fontSize: 28,
        color: "#ffffff",
      };

      const project = createMockProject({
        textOverlays: [legacyText],
      });

      useEditor.setState({ project, currentTimeMs: 1000 });
      const markup = renderToStaticMarkup(<Timeline project={project} />);
      expect(markup).toBeDefined();
      expect(markup).toContain("Simple Raw Title");
    });

    it("1.9 handles projects where textOverlays is undefined gracefully", () => {
      const project = createMockProject();
      delete (project as any).textOverlays;

      useEditor.setState({ project, currentTimeMs: 0 });
      const markup = renderToStaticMarkup(<Timeline project={project} />);
      expect(markup).toBeDefined();
      expect(markup).toContain("Double-click or click + Text to add text overlay");
    });

    it("1.10 handles zero-duration project (0 clips) without divide-by-zero crashes", () => {
      const emptyProject = createMockProject({
        clips: [],
        zoomBlocks: [],
        textOverlays: [],
        audioTracks: [],
      });

      useEditor.setState({
        project: emptyProject,
        durationMs: 0,
        currentTimeMs: 0,
      });

      const markup = renderToStaticMarkup(<Timeline project={emptyProject} />);
      expect(markup).toBeDefined();
      expect(markup).toContain("Double-click or click + SFX to add sound effect");
    });
  });

  /* ======================================================================== */
  /* Dimension 2: Action Aliases & Signature Integrity                       */
  /* ======================================================================== */
  describe("Dimension 2: Action Aliases & Signature Integrity", () => {
    it("2.1 verifies setTimelineTool is a functional alias for setActiveTimelineTool", () => {
      const state = useEditor.getState();
      expect(state.activeTimelineTool).toBe("select");

      state.setTimelineTool("split");
      expect(useEditor.getState().activeTimelineTool).toBe("split");

      state.setTimelineTool("pan");
      expect(useEditor.getState().activeTimelineTool).toBe("pan");

      state.setTimelineTool("select");
      expect(useEditor.getState().activeTimelineTool).toBe("select");
    });

    it("2.2 safely falls back to 'select' when an invalid tool mode is supplied", () => {
      const { setTimelineTool, setActiveTimelineTool } = useEditor.getState();

      setTimelineTool("trim" as TimelineToolMode);
      expect(useEditor.getState().activeTimelineTool).toBe("select");

      setActiveTimelineTool("unknown-mode" as TimelineToolMode);
      expect(useEditor.getState().activeTimelineTool).toBe("select");

      setTimelineTool("" as TimelineToolMode);
      expect(useEditor.getState().activeTimelineTool).toBe("select");
    });

    it("2.3 verifies splitAtCurrentTime alias delegates directly to splitAtPlayhead on clips", () => {
      useEditor.setState({
        currentTimeMs: 5000,
        selectedClipId: null,
      });

      useEditor.getState().splitAtCurrentTime();

      const clips = useEditor.getState().project!.clips;
      expect(clips.length).toBe(2);
      expect(clips[0]?.timelineStartMs).toBe(0);
      expect(clips[0]?.durationMs).toBe(5000);
      expect(clips[1]?.timelineStartMs).toBe(5000);
      expect(clips[1]?.durationMs).toBe(7000);
    });

    it("2.4 verifies splitAtCurrentTime splits selected audio track when selectedAudioId is active", () => {
      const audio: AudioTrack = {
        id: "aud-split-test",
        name: "Voiceover 1",
        url: "blob://aud",
        startTimeMs: 1000,
        durationMs: 8000,
        volume: 0.8,
        type: "music",
        muted: false,
      };

      useEditor.setState({
        project: createMockProject({ audioTracks: [audio] }),
        selectedAudioId: "aud-split-test",
        currentTimeMs: 4000,
      });

      useEditor.getState().splitAtCurrentTime();

      const audios = useEditor.getState().project!.audioTracks ?? [];
      expect(audios.length).toBe(2);
      expect(audios[0]?.id).toBe("aud-split-test");
      expect(audios[0]?.startTimeMs).toBe(1000);
      expect(audios[0]?.durationMs).toBe(3000); // 4000 - 1000

      expect(audios[1]?.startTimeMs).toBe(4000);
      expect(audios[1]?.durationMs).toBe(5000); // 8000 - 3000
    });

    it("2.5 verifies splitAtCurrentTime splits selected text overlay when selectedTextId is active", () => {
      const text: TextOverlay = {
        id: "txt-split-test",
        text: "Long Caption to Split",
        startTimeMs: 2000,
        durationMs: 6000,
        x: 0.5,
        y: 0.5,
        fontSize: 30,
        color: "#fff",
      };

      useEditor.setState({
        project: createMockProject({ textOverlays: [text] }),
        selectedTextId: "txt-split-test",
        currentTimeMs: 5000,
      });

      useEditor.getState().splitAtCurrentTime();

      const texts = useEditor.getState().project!.textOverlays ?? [];
      expect(texts.length).toBe(2);
      expect(texts[0]?.id).toBe("txt-split-test");
      expect(texts[0]?.startTimeMs).toBe(2000);
      expect(texts[0]?.durationMs).toBe(3000);

      expect(texts[1]?.startTimeMs).toBe(5000);
      expect(texts[1]?.durationMs).toBe(3000);
    });

    it("2.6 verifies splitAtCurrentTime does not split when playhead is outside item range", () => {
      useEditor.setState({
        currentTimeMs: 15000, // beyond 12000ms duration
        selectedClipId: null,
      });

      useEditor.getState().splitAtCurrentTime();
      expect(useEditor.getState().project!.clips.length).toBe(1);
    });

    it("2.7 verifies trimLeftAtCurrentTime alias delegates directly to trimLeftAtPlayhead on clips", () => {
      useEditor.setState({
        currentTimeMs: 3000,
        selectedClipId: null,
      });

      useEditor.getState().trimLeftAtCurrentTime();

      const clip = useEditor.getState().project!.clips[0];
      expect(clip).toBeDefined();
      expect(clip?.timelineStartMs).toBe(3000);
      expect(clip?.durationMs).toBe(9000);
      expect(clip?.sourceOffsetMs).toBe(3000);
    });

    it("2.8 verifies trimLeftAtCurrentTime trims selected audio track", () => {
      const audio: AudioTrack = {
        id: "aud-trim-test",
        name: "Test Audio",
        url: "blob://aud",
        startTimeMs: 1000,
        durationMs: 5000,
        volume: 0.7,
        type: "sfx",
        muted: false,
      };

      useEditor.setState({
        project: createMockProject({ audioTracks: [audio] }),
        selectedAudioId: "aud-trim-test",
        currentTimeMs: 2500,
      });

      useEditor.getState().trimLeftAtCurrentTime();

      const updatedAudio = useEditor.getState().project!.audioTracks?.[0];
      expect(updatedAudio).toBeDefined();
      expect(updatedAudio?.startTimeMs).toBe(2500);
      expect(updatedAudio?.durationMs).toBe(3500); // 5000 - 1500
    });

    it("2.9 verifies trimLeftAtCurrentTime enforces minimum duration threshold (100ms)", () => {
      useEditor.setState({
        currentTimeMs: 11950, // leaves only 50ms < 100ms
        selectedClipId: null,
      });

      useEditor.getState().trimLeftAtCurrentTime();

      const clip = useEditor.getState().project!.clips[0];
      expect(clip).toBeDefined();
      expect(clip?.timelineStartMs).toBe(0);
      expect(clip?.durationMs).toBe(12000);
    });

    it("2.10 verifies trimRightAtCurrentTime alias delegates directly to trimRightAtPlayhead on clips", () => {
      useEditor.setState({
        currentTimeMs: 7000,
        selectedClipId: null,
      });

      useEditor.getState().trimRightAtCurrentTime();

      const clip = useEditor.getState().project!.clips[0];
      expect(clip).toBeDefined();
      expect(clip?.timelineStartMs).toBe(0);
      expect(clip?.durationMs).toBe(7000);
    });

    it("2.11 verifies trimRightAtCurrentTime trims selected text overlay", () => {
      const text: TextOverlay = {
        id: "txt-trim-r",
        text: "Right Trim Overlay",
        startTimeMs: 1000,
        durationMs: 8000,
        x: 0.5,
        y: 0.5,
        fontSize: 24,
        color: "#fff",
      };

      useEditor.setState({
        project: createMockProject({ textOverlays: [text] }),
        selectedTextId: "txt-trim-r",
        currentTimeMs: 5000,
      });

      useEditor.getState().trimRightAtCurrentTime();

      const updatedText = useEditor.getState().project!.textOverlays?.[0];
      expect(updatedText).toBeDefined();
      expect(updatedText?.startTimeMs).toBe(1000);
      expect(updatedText?.durationMs).toBe(4000); // 5000 - 1000
    });

    it("2.12 verifies trimRightAtCurrentTime enforces minimum duration threshold (100ms)", () => {
      useEditor.setState({
        currentTimeMs: 50, // 50ms - 0ms = 50ms < 100ms
        selectedClipId: null,
      });

      useEditor.getState().trimRightAtCurrentTime();

      const clip = useEditor.getState().project!.clips[0];
      expect(clip).toBeDefined();
      expect(clip?.durationMs).toBe(12000); // Untouched
    });
  });

  /* ======================================================================== */
  /* Dimension 3: All 10 Motion Templates Regression Testing                  */
  /* ======================================================================== */
  describe("Dimension 3: All 10 Motion Templates Regression Testing", () => {
    STUDIO_MOTION_TEMPLATES.forEach((template, index) => {
      it(`3.${index + 1} verifies template '${template.id}' (${template.name}) applies and edits seamlessly without regression`, () => {
        useEditor.setState({
          project: createMockProject(),
          currentTimeMs: 2000,
          durationMs: 12000,
        });

        useEditor.getState().applyTemplate(template.id);
        const project = useEditor.getState().project!;

        expect(project.looks.aspectRatio).toBe(template.aspectRatio);
        expect(project.looks.windowFrame).toBe(template.looks.windowFrame);
        expect(project.looks.backgroundType).toBe(template.looks.backgroundType);

        if (project.textOverlays) {
          project.textOverlays.forEach((overlay) => {
            expect((overlay as any).badge).toBeUndefined();
          });
        }

        const markup = renderToStaticMarkup(<Timeline project={project} />);
        expect(markup).toBeDefined();

        useEditor.getState().addSfxTrackAtCurrentTime("bop", `SFX ${template.id}`);
        const withSfx = useEditor.getState().project!;
        expect(withSfx.audioTracks?.length).toBeGreaterThanOrEqual(1);
        const sfxTrack = withSfx.audioTracks?.find((t) => t.name === `SFX ${template.id}`);
        expect(sfxTrack).toBeDefined();
        expect(sfxTrack?.type).toBe("sfx");

        useEditor.setState({ currentTimeMs: 4000, selectedClipId: null });
        useEditor.getState().splitAtCurrentTime();
        expect(useEditor.getState().project!.clips.length).toBe(2);

        useEditor.setState({ currentTimeMs: 5000, selectedClipId: null });
        useEditor.getState().trimLeftAtCurrentTime();
        const activeClip = useEditor.getState().project!.clips[1];
        expect(activeClip).toBeDefined();
        expect(activeClip?.timelineStartMs).toBe(5000);
      });
    });
  });

  /* ======================================================================== */
  /* Dimension 4: Undo / Redo Roundtrip across Multi-Track Operations         */
  /* ======================================================================== */
  describe("Dimension 4: Undo / Redo Roundtrip across Multi-Track Operations", () => {
    it("4.1 executes multi-step multi-track editing pipeline and roundtrips 100% via undo and redo", () => {
      const initialProject = createMockProject();
      useEditor.setState({
        project: JSON.parse(JSON.stringify(initialProject)),
        currentTimeMs: 0,
        history: [],
        future: [],
      });

      const snapshot0 = JSON.parse(JSON.stringify(useEditor.getState().project));

      // Step 1: Add SFX track at 1500ms
      useEditor.setState({ currentTimeMs: 1500 });
      useEditor.getState().addSfxTrackAtCurrentTime("click", "Click SFX");
      expect(useEditor.getState().project!.audioTracks?.length).toBe(1);

      // Step 2: Split clip at 4000ms
      useEditor.setState({ currentTimeMs: 4000, selectedClipId: null });
      useEditor.getState().splitAtCurrentTime();
      expect(useEditor.getState().project!.clips.length).toBe(2);

      // Step 3: Trim left of second clip at 5000ms
      useEditor.setState({ currentTimeMs: 5000, selectedClipId: null });
      useEditor.getState().trimLeftAtCurrentTime();
      expect(useEditor.getState().project!.clips[1]?.timelineStartMs).toBe(5000);

      // Step 4: Trim right of second clip at 9000ms
      useEditor.setState({ currentTimeMs: 9000, selectedClipId: null });
      useEditor.getState().trimRightAtCurrentTime();
      expect(useEditor.getState().project!.clips[1]?.durationMs).toBe(4000);

      // Step 5: Add text overlay
      useEditor.setState({ currentTimeMs: 6000 });
      useEditor.getState().addTextOverlay("Roundtrip Test Overlay");
      expect(useEditor.getState().project!.textOverlays?.length).toBe(2);

      const modifiedSnapshot = JSON.parse(JSON.stringify(useEditor.getState().project));

      // UNDO ALL 5 STEPS
      useEditor.getState().undo(); // Undo Step 5 (text)
      expect(useEditor.getState().project!.textOverlays?.length).toBe(1);

      useEditor.getState().undo(); // Undo Step 4 (trim right)
      expect(useEditor.getState().project!.clips[1]?.durationMs).toBe(7000);

      useEditor.getState().undo(); // Undo Step 3 (trim left)
      expect(useEditor.getState().project!.clips[1]?.timelineStartMs).toBe(4000);

      useEditor.getState().undo(); // Undo Step 2 (split)
      expect(useEditor.getState().project!.clips.length).toBe(1);

      useEditor.getState().undo(); // Undo Step 1 (add SFX)
      expect(useEditor.getState().project!.audioTracks?.length).toBe(0);

      expect(useEditor.getState().project).toEqual(snapshot0);

      // REDO ALL 5 STEPS
      useEditor.getState().redo(); // Redo Step 1
      expect(useEditor.getState().project!.audioTracks?.length).toBe(1);

      useEditor.getState().redo(); // Redo Step 2
      expect(useEditor.getState().project!.clips.length).toBe(2);

      useEditor.getState().redo(); // Redo Step 3
      expect(useEditor.getState().project!.clips[1]?.timelineStartMs).toBe(5000);

      useEditor.getState().redo(); // Redo Step 4
      expect(useEditor.getState().project!.clips[1]?.durationMs).toBe(4000);

      useEditor.getState().redo(); // Redo Step 5
      expect(useEditor.getState().project!.textOverlays?.length).toBe(2);

      expect(useEditor.getState().project).toEqual(modifiedSnapshot);
    });
  });

  /* ======================================================================== */
  /* Dimension 5: Monte Carlo Fuzz Stress Generator                           */
  /* ======================================================================== */
  describe("Dimension 5: Monte Carlo Fuzz Stress Generator", () => {
    it("5.1 executes 300 randomized tool transitions, trims, splits, and track edits without state corruption or NaN values", () => {
      const project = createMockProject();
      useEditor.setState({
        project,
        currentTimeMs: 0,
        durationMs: 20000,
        history: [],
        future: [],
      });

      const toolModes: readonly TimelineToolMode[] = ["select", "split", "pan"] as const;
      const sfxPresets: readonly string[] = ["bop", "click", "pop", "whoosh", "typing", "mechanical"] as const;

      for (let iteration = 0; iteration < 300; iteration++) {
        const state = useEditor.getState();
        const randTime = Math.floor(Math.random() * 20000);
        state.setCurrentTime(randTime);

        const op = Math.floor(Math.random() * 7);

        switch (op) {
          case 0: {
            const toolIndex = Math.floor(Math.random() * toolModes.length);
            const tool = toolModes[toolIndex] ?? "select";
            state.setTimelineTool(tool);
            break;
          }
          case 1: {
            const presetIndex = Math.floor(Math.random() * sfxPresets.length);
            const preset = sfxPresets[presetIndex] ?? "bop";
            state.addSfxTrackAtCurrentTime(preset, `Fuzz SFX ${iteration}`);
            break;
          }
          case 2: {
            state.splitAtCurrentTime();
            break;
          }
          case 3: {
            state.trimLeftAtCurrentTime();
            break;
          }
          case 4: {
            state.trimRightAtCurrentTime();
            break;
          }
          case 5: {
            state.addTextOverlay(`Fuzz Text ${iteration}`);
            break;
          }
          case 6: {
            if (iteration % 3 === 0) {
              state.undo();
            } else if (iteration % 5 === 0) {
              state.redo();
            }
            break;
          }
        }

        const curr = useEditor.getState().project;
        if (curr) {
          curr.clips.forEach((c) => {
            expect(Number.isFinite(c.timelineStartMs)).toBe(true);
            expect(Number.isFinite(c.durationMs)).toBe(true);
            expect(Number.isFinite(c.sourceOffsetMs)).toBe(true);
            expect(c.durationMs).toBeGreaterThan(0);
            expect(c.timelineStartMs).toBeGreaterThanOrEqual(0);
          });

          if (curr.audioTracks) {
            curr.audioTracks.forEach((a) => {
              expect(Number.isFinite(a.startTimeMs)).toBe(true);
              expect(Number.isFinite(a.durationMs)).toBe(true);
              expect(a.startTimeMs).toBeGreaterThanOrEqual(0);
              expect(a.durationMs).toBeGreaterThan(0);
            });
          }

          if (curr.textOverlays) {
            curr.textOverlays.forEach((t) => {
              expect(Number.isFinite(t.startTimeMs)).toBe(true);
              expect(Number.isFinite(t.durationMs)).toBe(true);
              expect(t.startTimeMs).toBeGreaterThanOrEqual(0);
              expect(t.durationMs).toBeGreaterThan(0);
            });
          }
        }
      }
    });
  });
});
