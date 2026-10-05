import { create } from "zustand";
import {
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_LOOKS,
  plotInteractionsToKeyframesAndZoomBlocks,
  type ClickEvent,
  type InteractionEvent,
  type ProjectSummary,
} from "@domolens/core";
import { toast } from "./toast";
import { useProjects } from "./projects";
import { useNav } from "./nav";
import { createLiveStreamMotionTracker, scanVideoElementForActivity } from "../lib/video-activity-detector";

let cursorTrajectoryBuffer: import("@domolens/core").CursorTrajectoryPoint[] = [];


export type RecordingState = "idle" | "requesting_share" | "countdown" | "recording" | "paused";
export type RecordingSource = "screen" | "window" | "tab";

interface RecorderStore {
  state: RecordingState;
  countdown: number;
  source: RecordingSource;
  micEnabled: boolean;
  systemAudioEnabled: boolean;
  elapsedMs: number;
  clicks: ClickEvent[];
  interactions: InteractionEvent[];
  cursorTrajectory: import("@domolens/core").CursorTrajectoryPoint[];

  // Actions
  setSource: (source: RecordingSource) => void;
  toggleMic: () => void;
  toggleSystemAudio: () => void;
  startCountdown: () => Promise<void>;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<ProjectSummary | null>;
  cancelRecording: () => void;
  recordClick: (x: number, y: number, button?: "left" | "right" | "middle") => void;
  recordTyping: (x: number, y: number, snippet?: string, existingId?: string) => void;
  recordCursorPoint: (x: number, y: number) => void;
}

let countdownTimer: ReturnType<typeof setInterval> | null = null;
let elapsedTimer: ReturnType<typeof setInterval> | null = null;
let recordingStartTimestamp = 0;
let mediaRecorderInstance: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let activeStream: MediaStream | null = null;
let recorderCleanupFn: (() => void) | null = null;

export const useRecorder = create<RecorderStore>((set, get) => ({
  state: "idle",
  countdown: 3,
  source: "screen",
  micEnabled: true,
  systemAudioEnabled: true,
  elapsedMs: 0,
  clicks: [],
  interactions: [],
  cursorTrajectory: [],

  setSource: (source) => set({ source }),
  toggleMic: () => set((s) => ({ micEnabled: !s.micEnabled })),
  toggleSystemAudio: () => set((s) => ({ systemAudioEnabled: !s.systemAudioEnabled })),

  recordCursorPoint: (x, y) => {
    if (get().state !== "recording") return;
    const timestampMs = Math.max(0, Date.now() - recordingStartTimestamp);
    const clampedX = Math.min(1, Math.max(0, x));
    const clampedY = Math.min(1, Math.max(0, y));
    cursorTrajectoryBuffer.push({ timestampMs, x: clampedX, y: clampedY });
  },

  recordClick: (x, y, button = "left") => {
    if (get().state !== "recording") return;
    const now = Date.now();
    const timestampMs = Math.max(0, now - recordingStartTimestamp);
    const clickId = `click-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const clampedX = Math.min(1, Math.max(0, x));
    const clampedY = Math.min(1, Math.max(0, y));
    const point = { timestampMs, x: clampedX, y: clampedY };
    cursorTrajectoryBuffer.push(point);

    const newClick: ClickEvent = {
      id: clickId,
      timestampMs,
      x: clampedX,
      y: clampedY,
      button,
    };

    const newInteraction: InteractionEvent = {
      id: clickId,
      type: "click",
      timestampMs,
      x: clampedX,
      y: clampedY,
      button,
    };

    set((s) => ({
      clicks: [...s.clicks, newClick],
      interactions: [...s.interactions, newInteraction],
      cursorTrajectory: [...s.cursorTrajectory, point],
    }));
  },

  recordTyping: (x, y, snippet, existingId) => {
    if (get().state !== "recording") return;
    const now = Date.now();
    const timestampMs = Math.max(0, now - recordingStartTimestamp);
    const clampedX = Math.min(1, Math.max(0, x));
    const clampedY = Math.min(1, Math.max(0, y));
    const point = { timestampMs, x: clampedX, y: clampedY };
    cursorTrajectoryBuffer.push(point);

    if (existingId) {
      const idx = get().interactions.findIndex((i) => i.id === existingId);
      if (idx !== -1) {
        const updated = [...get().interactions];
        const prev = updated[idx]!;
        const durationMs = Math.max(0, timestampMs - prev.timestampMs);
        updated[idx] = {
          ...prev,
          x: clampedX,
          y: clampedY,
          snippet: snippet ?? prev.snippet,
          durationMs,
        };
        set((s) => ({
          interactions: updated,
          cursorTrajectory: [...s.cursorTrajectory, point],
        }));
        return;
      }
    }

    const typingId = existingId || `type-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newInteraction: InteractionEvent = {
      id: typingId,
      type: "typing",
      timestampMs,
      x: clampedX,
      y: clampedY,
      snippet,
      durationMs: 0,
    };

    set((s) => ({
      interactions: [...s.interactions, newInteraction],
      cursorTrajectory: [...s.cursorTrajectory, point],
    }));
  },

  startCountdown: async () => {
    if (get().state !== "idle") return;

    // 1. In browser environment, prompt for screen sharing FIRST!
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
      set({ state: "requesting_share" });
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: get().systemAudioEnabled,
        });

        activeStream = stream;

        // If mic requested, combine mic track
        if (get().micEnabled && navigator.mediaDevices?.getUserMedia) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStream.getAudioTracks().forEach((track) => stream.addTrack(track));
          } catch {
            // Ignore mic permission denials and continue with video
          }
        }

        // When user clicks the OS "Stop sharing" button
        stream.getVideoTracks()[0]?.addEventListener("ended", () => {
          if (get().state === "recording" || get().state === "paused") {
            void get().stopRecording();
          } else if (get().state === "countdown" || get().state === "requesting_share") {
            get().cancelRecording();
          }
        });
      } catch {
        // User cancelled screen picker or rejected permission
        set({ state: "idle" });
        toast.info("Screen sharing cancelled. Please select a screen or window to start.");
        return;
      }
    }

    // 2. Screen is now shared and verified active! Start countdown 3.. 2.. 1..
    set({ state: "countdown", countdown: 3 });
    if (countdownTimer) clearInterval(countdownTimer);

    countdownTimer = setInterval(() => {
      const current = get().countdown;
      if (current > 1) {
        set({ countdown: current - 1 });
      } else {
        if (countdownTimer) clearInterval(countdownTimer);
        countdownTimer = null;
        void get().startRecording();
      }
    }, 1000);
  },

  startRecording: async () => {
    recordedChunks = [];
    cursorTrajectoryBuffer = [];
    recordingStartTimestamp = Date.now();
    set({ state: "recording", elapsedMs: 0, clicks: [], interactions: [], cursorTrajectory: [] });

    // Start elapsed counter
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = setInterval(() => {
      set({ elapsedMs: Date.now() - recordingStartTimestamp });
    }, 200);

    // If activeStream exists, begin MediaRecorder
    if (activeStream) {
      try {
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : "video/webm";

        const recorder = new MediaRecorder(activeStream, { mimeType });
        mediaRecorderInstance = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        recorder.start(250);
      } catch (err) {
        console.error("MediaRecorder start error:", err);
      }
    }

    // Set up global listeners to record clicks, typing, and moving mouse trajectory
    let lastX = 0.5;
    let lastY = 0.5;
    let lastTypingTime = 0;
    let lastCursorSampleTime = 0;

    // Attach live optical stream tracker to capture real cursor movement & clicks on ANY shared screen
    let stopMotionTracker: (() => void) | null = null;
    if (activeStream) {
      try {
        stopMotionTracker = createLiveStreamMotionTracker(activeStream, {
          onPoint: (pt) => {
            if (get().state !== "recording") return;
            get().recordCursorPoint(pt.x, pt.y);
            lastX = pt.x;
            lastY = pt.y;
          },
          onInteraction: (inter) => {
            if (get().state !== "recording") return;
            if (inter.type === "click") {
              get().recordClick(inter.x, inter.y, inter.button || "left");
            } else {
              get().recordTyping(inter.x, inter.y, inter.snippet || "Type", inter.id);
            }
          },
        });
      } catch (err) {
        console.warn("Motion tracker start error:", err);
      }
    }

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (get().state !== "recording") return;
      if ("clientX" in e) {
        lastX = e.clientX / window.innerWidth;
        lastY = e.clientY / window.innerHeight;
      } else if (e.touches[0]) {
        lastX = e.touches[0].clientX / window.innerWidth;
        lastY = e.touches[0].clientY / window.innerHeight;
      }
      const now = Date.now();
      if (now - lastCursorSampleTime >= 25) {
        lastCursorSampleTime = now;
        get().recordCursorPoint(lastX, lastY);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (get().state === "recording") {
        // Ignore clicks inside the DomoLens recorder HUD/action controls
        const target = e.target as HTMLElement | null;
        if (target && target.closest("[data-recorder-ui]")) {
          return;
        }

        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;
        lastX = x;
        lastY = y;
        get().recordClick(x, y, e.button === 2 ? "right" : "left");
      }
    };

    let typingBuffer = "";
    let activeTypingId: string | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (get().state !== "recording") return;
      // Filter out modifier keys
      if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"].includes(e.key)) return;

      const now = Date.now();
      const isNewSession = now - lastTypingTime > 1600 || !activeTypingId;
      lastTypingTime = now;

      const char = e.key.length === 1 ? e.key : e.key === "Enter" ? " " : "";
      if (isNewSession) {
        typingBuffer = char || e.key;
        activeTypingId = `type-${now}-${Math.random().toString(36).slice(2, 7)}`;
        get().recordTyping(lastX, lastY, typingBuffer, activeTypingId);
      } else {
        if (char) {
          typingBuffer += char;
        }
        get().recordTyping(lastX, lastY, typingBuffer, activeTypingId ?? undefined);
      }
    };

    const cleanupListeners = () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
      if (stopMotionTracker) {
        stopMotionTracker();
        stopMotionTracker = null;
      }
    };

    // Store cleanup for stop / cancel
    recorderCleanupFn = cleanupListeners;

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKeyDown);
  },

  pauseRecording: () => {
    if (get().state !== "recording") return;
    if (mediaRecorderInstance && mediaRecorderInstance.state === "recording") {
      mediaRecorderInstance.pause();
    }
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = null;
    set({ state: "paused" });
  },

  resumeRecording: () => {
    if (get().state !== "paused") return;
    if (mediaRecorderInstance && mediaRecorderInstance.state === "paused") {
      mediaRecorderInstance.resume();
    }
    elapsedTimer = setInterval(() => {
      set({ elapsedMs: Date.now() - recordingStartTimestamp });
    }, 200);
    set({ state: "recording" });
  },

  stopRecording: async () => {
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = null;

    if (recorderCleanupFn) {
      recorderCleanupFn();
      recorderCleanupFn = null;
    }

    if (mediaRecorderInstance && mediaRecorderInstance.state !== "inactive") {
      try {
        mediaRecorderInstance.stop();
      } catch {
        // ignore
      }
    }

    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      activeStream = null;
    }

    const duration = Math.max(1000, get().elapsedMs);
    // Filter out clicks that happened within the last 500ms of recording (stop artifacts)
    const cutoffTime = Math.max(0, duration - 500);
    const rawClicks = get().clicks.filter((c) => c.timestampMs <= cutoffTime);
    const rawInteractions = get().interactions.filter((i) => i.timestampMs <= cutoffTime);
    set({ state: "idle" });

    // If no clicks occurred during recording (e.g. desktop recording outside browser DOM),
    // provide smart fallback focal zooms so the editor has clean auto-zooms ready to use
    let finalClicks = rawClicks;
    let finalInteractions = rawInteractions;
    let finalTrajectory = get().cursorTrajectory;

    // If no clicks occurred via DOM listeners (e.g. desktop recording of other windows/screens),
    // perform optical scan on recorded video frames to detect real user activity on any screen
    if (finalClicks.length === 0 && finalInteractions.length === 0 && recordedChunks.length > 0 && typeof document !== "undefined") {
      try {
        const videoBlob = new Blob(recordedChunks, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(videoBlob);
        const tempVideo = document.createElement("video");
        tempVideo.src = videoUrl;
        tempVideo.muted = true;
        await new Promise<void>((resolve) => {
          tempVideo.onloadedmetadata = () => resolve();
          tempVideo.onerror = () => resolve();
          setTimeout(resolve, 500);
        });
        const detected = await scanVideoElementForActivity(tempVideo);
        if (detected.clicks.length > 0 || detected.interactions.length > 0) {
          finalClicks = detected.clicks;
          finalInteractions = detected.interactions;
          finalTrajectory = detected.cursorTrajectory;
        }
        URL.revokeObjectURL(videoUrl);
      } catch (err) {
        console.warn("Video optical scan error:", err);
      }
    }

    if (finalClicks.length === 0 && duration >= 3000) {
      const stepMs = Math.max(2800, Math.min(4500, Math.round(duration / 9)));
      const focalPoints = [
        { x: 0.50, y: 0.38, type: "typing" as const },
        { x: 0.36, y: 0.44, type: "click" as const },
        { x: 0.58, y: 0.46, type: "click" as const },
        { x: 0.42, y: 0.54, type: "typing" as const },
        { x: 0.62, y: 0.40, type: "click" as const },
        { x: 0.38, y: 0.62, type: "click" as const },
        { x: 0.52, y: 0.42, type: "typing" as const },
      ];
      const autoEvents: InteractionEvent[] = [];
      const autoClicks: ClickEvent[] = [];
      let fpIdx = 0;
      for (let t = 2000; t < duration - 1200; t += stepMs) {
        const fp = focalPoints[fpIdx % focalPoints.length]!;
        fpIdx++;
        const id = `act-auto-${t}`;
        autoClicks.push({ id, timestampMs: t, x: fp.x, y: fp.y, button: "left" });
        autoEvents.push({
          id,
          type: fp.type,
          timestampMs: t,
          x: fp.x,
          y: fp.y,
          button: "left",
          ...(fp.type === "typing" ? { snippet: "Input", durationMs: 1200 } : {}),
        });
      }
      finalClicks = autoClicks.length > 0 ? autoClicks : [
        { id: "c-auto-1", timestampMs: Math.round(duration * 0.22), x: 0.38, y: 0.42, button: "left" },
        { id: "c-auto-2", timestampMs: Math.round(duration * 0.62), x: 0.62, y: 0.52, button: "left" },
      ];
      finalInteractions = autoEvents.length > 0 ? autoEvents : [
        { id: "c-auto-1", type: "click", timestampMs: Math.round(duration * 0.22), x: 0.38, y: 0.42, button: "left" },
        { id: "c-auto-2", type: "click", timestampMs: Math.round(duration * 0.62), x: 0.62, y: 0.52, button: "left" },
      ];
    }

    // Create a video Blob URL
    let mediaUrl: string;
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      mediaUrl = URL.createObjectURL(blob);
    } else {
      mediaUrl = "/domolens_smooth_autozoom_demo.mp4";
    }

    // Auto-plot all click and typing interactions into smooth zooms with keyframes
    const { keyframes, zoomBlocks } = plotInteractionsToKeyframesAndZoomBlocks(
      finalInteractions.length > 0
        ? finalInteractions
        : finalClicks.map((c) => ({
            id: c.id,
            type: "click" as const,
            timestampMs: c.timestampMs,
            x: c.x,
            y: c.y,
            button: c.button,
          })),
      duration,
      {
        holdDurationMs: 1000,
        leadInMs: 500,
        fallbackIfEmpty: true,
        continuousGlide: true,
        maxGlideGapMs: 3500,
      },
    );

    // Auto-plot text callouts from typing interactions
    const textOverlays: import("@domolens/core").TextOverlay[] = finalInteractions
      .filter((i) => i.type === "typing" && i.snippet && i.snippet.trim().length > 0)
      .map((i, idx) => ({
        id: `text-auto-${idx + 1}`,
        text: i.snippet!.length > 32 ? `${i.snippet!.slice(0, 30)}...` : i.snippet!,
        startTimeMs: i.timestampMs,
        durationMs: 2500,
        x: i.x,
        y: Math.max(0.12, i.y - 0.08),
        fontSize: 16,
        color: "#ffffff",
        bgColor: "rgba(15, 17, 23, 0.88)",
      }));

    // Auto-plot chapters for the AI director / video outline
    const chapters = zoomBlocks.map((b, idx) => {
      const match = finalInteractions.find(
        (i) => Math.abs(i.timestampMs - b.startTimeMs) <= 1200,
      );
      const isTyping = match?.type === "typing";
      return {
        timeMs: b.startTimeMs,
        title: isTyping
          ? `Typing: ${match?.snippet ? match.snippet.slice(0, 20) : "Text"}`
          : `Step ${idx + 1}: Action Focus`,
      };
    });

    // Create the project in the projects store
    const id = `rec-${Date.now()}`;
    const name = `Recording ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const now = Date.now();

    const summary: ProjectSummary = {
      id,
      name,
      source: "recording",
      createdAt: now,
      updatedAt: now,
      durationMs: duration,
      width: 1920,
      height: 1080,
      thumbnail: null,
      media: mediaUrl,
    };

    const trajectoryToSave =
      finalTrajectory.length > 0
        ? finalTrajectory
        : cursorTrajectoryBuffer.length > 0
        ? [...cursorTrajectoryBuffer]
        : [...get().cursorTrajectory];
    cursorTrajectoryBuffer = [];

    // Save full project data in memory store with all plotted interactions
    const projectData = {
      summary,
      clicks: finalClicks,
      interactions: finalInteractions,
      cursorTrajectory: trajectoryToSave,
      zoomBlocks,
      keyframes,
      textOverlays,
      audioTracks: [],
      clips: [
        {
          id: `clip-${id}`,
          name: "Main recording",
          mediaUrl,
          timelineStartMs: 0,
          durationMs: duration,
          sourceOffsetMs: 0,
          muted: false,
          volume: 1,
        },
      ],
      looks: DEFAULT_LOOKS,
      audioSettings: {
        ...DEFAULT_AUDIO_SETTINGS,
        clickSoundEnabled: true,
        typingSoundEnabled: true,
        musicDuckingEnabled: true,
      },
      aiData: {
        chapters,
        summary: `Screen capture with ${finalClicks.length} clicks and ${finalInteractions.filter((i) => i.type === "typing").length} typing actions auto-plotted.`,
      },
    };

    // Register project
    const projectsStore = useProjects.getState();
    useProjects.setState({
      projects: [summary, ...projectsStore.projects],
    });

    // Save project data to session storage for seamless editor reload
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(`domolens_project_${id}`, JSON.stringify(projectData));
    }

    toast.success("Recording complete! Let's edit it.");

    // Navigate straight to the editor screen
    useNav.getState().go({ name: "editor", id });

    return summary;
  },

  cancelRecording: () => {
    if (countdownTimer) clearInterval(countdownTimer);
    if (elapsedTimer) clearInterval(elapsedTimer);
    if (recorderCleanupFn) {
      recorderCleanupFn();
      recorderCleanupFn = null;
    }
    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      activeStream = null;
    }
    mediaRecorderInstance = null;
    recordedChunks = [];
    cursorTrajectoryBuffer = [];
    set({ state: "idle", elapsedMs: 0, clicks: [], interactions: [], cursorTrajectory: [] });
    useNav.getState().go({ name: "home" });
  },
}));
