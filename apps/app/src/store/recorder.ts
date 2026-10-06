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
import { platform } from "../platform";
import { createLiveStreamMotionTracker } from "../lib/video-activity-detector";

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
let audioContextInstance: AudioContext | null = null;
let micStreamInstance: MediaStream | null = null;
let recorderCleanupFn: (() => void) | null = null;

let activeRecordingMime = "";

function getBestSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidateTypes = [
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidateTypes) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

const displaySurfaceMap: Record<RecordingSource, "monitor" | "window" | "browser"> = {
  screen: "monitor",
  window: "window",
  tab: "browser",
};

/** Captures an offscreen video frame as a base64 thumbnail. */
async function captureVideoThumbnail(
  videoUrl: string,
  targetWidth = 480,
  targetHeight = 270,
): Promise<string | null> {
  if (typeof document === "undefined" || !videoUrl) return null;
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    video.src = videoUrl;

    const timeout = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 3500);

    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      video.removeAttribute("src");
      video.load();
    };

    const onMetadata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 0) / 2);
    };

    const onSeeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch {
        // ignore
      }
      cleanup();
      resolve(null);
    };

    const onError = () => {
      cleanup();
      resolve(null);
    };

    video.addEventListener("loadedmetadata", onMetadata, { once: true });
    video.addEventListener("seeked", onSeeked, { once: true });
    video.addEventListener("error", onError, { once: true });
    video.load();
  });
}

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

    // 1. Prompt for screen sharing with tailored source constraints (screen, window, tab)
    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
      set({ state: "requesting_share" });
      try {
        const targetSurface = displaySurfaceMap[get().source] || "monitor";
        let stream: MediaStream;

        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              displaySurface: targetSurface,
              frameRate: { ideal: 60, max: 60 },
              width: { ideal: 1920, max: 3840 },
              height: { ideal: 1080, max: 2160 },
            } as MediaTrackConstraints,
            audio: get().systemAudioEnabled,
            preferCurrentTab: false,
            selfBrowserSurface: "exclude",
            systemAudio: get().systemAudioEnabled ? "include" : "exclude",
            surfaceSwitching: "include",
            monitorTypeSurfaces: "include",
          } as DisplayMediaStreamOptions);
        } catch {
          // Fallback to relaxed constraints for environments without advanced displaySurface options
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: get().systemAudioEnabled,
          });
        }

        activeStream = stream;

        // If mic requested, capture and mix cleanly via Web Audio API
        if (get().micEnabled && navigator.mediaDevices?.getUserMedia) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
            micStreamInstance = micStream;

            const systemAudioTracks = stream.getAudioTracks();
            const micAudioTracks = micStream.getAudioTracks();

            if (systemAudioTracks.length > 0 && micAudioTracks.length > 0) {
              try {
                const AudioCtx =
                  window.AudioContext ||
                  (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                if (AudioCtx) {
                  audioContextInstance = new AudioCtx();
                  const dest = audioContextInstance.createMediaStreamDestination();

                  const sysSrc = audioContextInstance.createMediaStreamSource(new MediaStream([systemAudioTracks[0]!]));
                  sysSrc.connect(dest);

                  const micSrc = audioContextInstance.createMediaStreamSource(new MediaStream([micAudioTracks[0]!]));
                  micSrc.connect(dest);

                  const mixedTrack = dest.stream.getAudioTracks()[0];
                  if (mixedTrack) {
                    systemAudioTracks.forEach((t) => stream.removeTrack(t));
                    stream.addTrack(mixedTrack);
                  }
                }
              } catch (audioErr) {
                console.warn("Audio mixing fallback:", audioErr);
                micAudioTracks.forEach((track) => stream.addTrack(track));
              }
            } else if (micAudioTracks.length > 0) {
              micAudioTracks.forEach((track) => stream.addTrack(track));
            }
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
        const mimeType = getBestSupportedMimeType();
        activeRecordingMime = mimeType;

        const recorder = mimeType
          ? new MediaRecorder(activeStream, { mimeType })
          : new MediaRecorder(activeStream);
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

    // Attach native OS-level global mouse & typing listeners for full screen capture outside the app
    void platform.startGlobalInputCapture?.();
    const offClick = platform.onGlobalClick?.((payload) => {
      if (get().state !== "recording") return;
      lastX = payload.norm_x;
      lastY = payload.norm_y;
      get().recordClick(payload.norm_x, payload.norm_y, (payload.button as "left" | "right" | "middle") || "left");
    });
    const offMove = platform.onGlobalMouseMove?.((payload) => {
      if (get().state !== "recording") return;
      lastX = payload.norm_x;
      lastY = payload.norm_y;
      get().recordCursorPoint(payload.norm_x, payload.norm_y);
    });
    const offTyping = platform.onGlobalTyping?.((payload) => {
      if (get().state !== "recording") return;
      get().recordTyping(payload.norm_x, payload.norm_y);
    });

    // Attach live optical stream tracker to capture smooth cursor movement across the shared display
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
        });
      } catch (err) {
        console.warn("Motion tracker start error:", err);
      }
    }

    // Enable floating HUD mode (always on top) while recording
    void platform.setAlwaysOnTop?.(true);

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
      void platform.stopGlobalInputCapture?.();
      offClick?.();
      offMove?.();
      offTyping?.();
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

    if (audioContextInstance) {
      try {
        void audioContextInstance.close();
      } catch {
        // ignore
      }
      audioContextInstance = null;
    }

    if (micStreamInstance) {
      micStreamInstance.getTracks().forEach((t) => t.stop());
      micStreamInstance = null;
    }

    // Dynamically query actual resolution from active display stream track
    const videoTrack = activeStream?.getVideoTracks()[0];
    const trackSettings = videoTrack?.getSettings();
    const recordedWidth = trackSettings?.width || 1920;
    const recordedHeight = trackSettings?.height || 1080;

    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      activeStream = null;
    }

    const duration = Math.max(1000, get().elapsedMs);
    // Filter out clicks that happened within the last 500ms of recording (stop artifacts)
    const cutoffTime = Math.max(0, duration - 500);
    const rawClicks = get().clicks.filter((c) => c.timestampMs <= cutoffTime);
    const rawInteractions = get().interactions.filter((i) => i.timestampMs <= cutoffTime);
    void platform.setAlwaysOnTop?.(false);
    set({ state: "idle" });

    // Strictly preserve real user clicks without synthetic filler
    const finalClicks = rawClicks;
    const finalInteractions = rawInteractions;
    const finalTrajectory = get().cursorTrajectory;

    const id = `rec-${Date.now()}`;
    const name = `Recording ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    const now = Date.now();

    // Create a video Blob URL and persist to disk in desktop app
    let mediaUrl = "";
    const chosenBlobType = activeRecordingMime || "video/mp4";
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: chosenBlobType });
      mediaUrl = URL.createObjectURL(blob);

      // In native desktop app, save video directly to local disk
      if (platform.isApp && platform.saveRecordingFile) {
        try {
          const buffer = await blob.arrayBuffer();
          const bytes = Array.from(new Uint8Array(buffer));
          const ext = chosenBlobType.includes("webm") ? "webm" : "mp4";
          const diskPath = await platform.saveRecordingFile(id, bytes, ext);
          if (diskPath) {
            mediaUrl = diskPath;
          }
        } catch (saveErr) {
          console.warn("Could not save recording file to disk:", saveErr);
        }
      }
    }

    // Capture real video frame thumbnail from the recorded video
    let thumbnail: string | null = null;
    if (mediaUrl) {
      try {
        thumbnail = await captureVideoThumbnail(platform.mediaUrl(mediaUrl), 480, 270);
      } catch {
        thumbnail = null;
      }
    }

    // Plot zooms ONLY if interactions actually occurred. Otherwise keep empty by default!
    const { keyframes, zoomBlocks } =
      finalInteractions.length > 0
        ? plotInteractionsToKeyframesAndZoomBlocks(
            finalInteractions,
            duration,
            {
              holdDurationMs: 1000,
              leadInMs: 500,
              fallbackIfEmpty: false,
              continuousGlide: true,
              maxGlideGapMs: 3500,
              autoFillGaps: false,
              cursorTrajectory: finalTrajectory,
            },
          )
        : { keyframes: [], zoomBlocks: [] };

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

    const summary: ProjectSummary = {
      id,
      name,
      source: "recording",
      createdAt: now,
      updatedAt: now,
      durationMs: duration,
      width: recordedWidth,
      height: recordedHeight,
      thumbnail,
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

    // Register project in projects store and on platform with duplicate removal
    const projectsStore = useProjects.getState();
    useProjects.setState({
      projects: [summary, ...projectsStore.projects.filter((p) => p.id !== summary.id && p.name !== summary.name)],
    });
    await platform.saveProject?.(summary);

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
    if (audioContextInstance) {
      try {
        void audioContextInstance.close();
      } catch {
        // ignore
      }
      audioContextInstance = null;
    }
    if (micStreamInstance) {
      micStreamInstance.getTracks().forEach((t) => t.stop());
      micStreamInstance = null;
    }
    if (activeStream) {
      activeStream.getTracks().forEach((t) => t.stop());
      activeStream = null;
    }
    mediaRecorderInstance = null;
    recordedChunks = [];
    cursorTrajectoryBuffer = [];
    void platform.setAlwaysOnTop?.(false);
    set({ state: "idle", elapsedMs: 0, clicks: [], interactions: [], cursorTrajectory: [] });
    useNav.getState().go({ name: "home" });
  },
}));
