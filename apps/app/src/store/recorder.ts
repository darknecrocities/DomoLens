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
import { createLiveStreamMotionTracker, scanVideoElementForActivity } from "../lib/video-activity-detector";

let cursorTrajectoryBuffer: import("@domolens/core").CursorTrajectoryPoint[] = [];
let transcriptSegments: Array<{ text: string; startMs: number }> = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognitionInstance: any | null = null;
let currentInterimText = "";
let currentInterimStartMs = 0;
let isIntentionallyStoppingRecognition = false;


export type RecordingState = "idle" | "requesting_share" | "countdown" | "recording" | "paused";
export type RecordingSource = "screen" | "window";
export type RecordingMode =
  | "regular"                   // Plain screen capture — no auto-zoom, no SFX
  | "auto-zoom-sfx"             // Auto-zoom on clicks + sound effects
  | "auto-zoom"                 // Auto-zoom only, no SFX
  | "sfx-transcribe"            // SFX + live speech-to-text subtitles
  | "auto-zoom-sfx-transcribe"; // Complete studio: Auto-Zoom + SFX + live subtitles

interface RecorderStore {
  state: RecordingState;
  countdown: number;
  source: RecordingSource;
  recordingMode: RecordingMode;
  micEnabled: boolean;
  systemAudioEnabled: boolean;
  elapsedMs: number;
  clicks: ClickEvent[];
  interactions: InteractionEvent[];
  cursorTrajectory: import("@domolens/core").CursorTrajectoryPoint[];

  // Actions
  setSource: (source: RecordingSource) => void;
  setRecordingMode: (mode: RecordingMode) => void;
  toggleMic: () => void;
  toggleSystemAudio: () => void;
  startCountdown: () => Promise<void>;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<ProjectSummary | null>;
  cancelRecording: () => void;
  recordClick: (x: number, y: number, button?: "left" | "right" | "middle") => void;
  recordHighlight: (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    startMs: number,
    durationMs: number,
  ) => void;
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
    // 1. Hardware-accelerated High Profile H.264 (Native VideoToolbox on macOS Apple Silicon & Intel)
    "video/mp4;codecs=avc1.640028,mp4a.40.2",
    "video/mp4;codecs=avc1.4d4028,mp4a.40.2",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
    // 2. Hardware H.264 in WebM container (Chrome on macOS)
    "video/webm;codecs=h264,opus",
    "video/webm;codecs=h264",
    // 3. VP9 WebM
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp9",
    // 4. Fallback WebM
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const c of candidateTypes) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

const displaySurfaceMap: Record<RecordingSource, "monitor" | "window"> = {
  screen: "monitor",
  window: "window",
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
  recordingMode: "auto-zoom-sfx" as RecordingMode,
  micEnabled: true,
  systemAudioEnabled: true,
  elapsedMs: 0,
  clicks: [],
  interactions: [],
  cursorTrajectory: [],

  setSource: (source) => set({ source }),
  setRecordingMode: (recordingMode) => set({ recordingMode }),
  toggleMic: () =>
    set((s) => {
      const nextMic = !s.micEnabled;
      void platform.syncHudState?.({
        state: s.state,
        elapsedMs: s.elapsedMs,
        clicksCount: s.clicks.length,
        micEnabled: nextMic,
      });
      return { micEnabled: nextMic };
    }),
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
    const clampedX = Math.min(1, Math.max(0, x));
    const clampedY = Math.min(1, Math.max(0, y));

    // Deduplicate rapid duplicate events (e.g. OS global click + DOM mousedown + live optical)
    // within 300ms at virtually the same coordinates (< 0.04 normalized distance)
    const existingClicks = get().clicks;
    const lastClick = existingClicks[existingClicks.length - 1];
    if (
      lastClick &&
      timestampMs - lastClick.timestampMs < 300 &&
      Math.hypot(clampedX - lastClick.x, clampedY - lastClick.y) < 0.04
    ) {
      return;
    }

    const clickId = `click-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

  recordHighlight: (startX, startY, endX, endY, startMs, durationMs) => {
    if (get().state !== "recording") return;
    const clampedStartX = Math.min(1, Math.max(0, startX));
    const clampedStartY = Math.min(1, Math.max(0, startY));
    const clampedEndX = Math.min(1, Math.max(0, endX));
    const clampedEndY = Math.min(1, Math.max(0, endY));
    const centerX = (clampedStartX + clampedEndX) / 2;
    const centerY = (clampedStartY + clampedEndY) / 2;
    const hlId = `hl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newInteraction: InteractionEvent = {
      id: hlId,
      type: "highlight",
      timestampMs: startMs,
      durationMs,
      x: centerX,
      y: centerY,
      xEnd: clampedEndX,
      yEnd: clampedEndY,
      snippet: "Text Highlight",
    };

    set((s) => ({
      interactions: [...s.interactions, newInteraction],
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
              frameRate: { ideal: 60 },
              width: { ideal: 3840 },
              height: { ideal: 2160 },
              resizeMode: "none",
            } as MediaTrackConstraints,
            audio: get().systemAudioEnabled
              ? {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: false,
                }
              : false,
            preferCurrentTab: false,
            selfBrowserSurface: "exclude",
            systemAudio: get().systemAudioEnabled ? "include" : "exclude",
            surfaceSwitching: "include",
            monitorTypeSurfaces: "include",
          } as DisplayMediaStreamOptions);
        } catch {
          // Fallback to relaxed constraints for environments without advanced displaySurface options
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 3840 },
              height: { ideal: 2160 },
              frameRate: { ideal: 60 },
            },
            audio: get().systemAudioEnabled,
          });
        }

        activeStream = stream;

        // Apply native Retina detail content hint and maximum clarity constraints
        const activeVideoTrack = stream.getVideoTracks()[0];
        if (activeVideoTrack) {
          if ("contentHint" in activeVideoTrack) {
            activeVideoTrack.contentHint = "detail";
          }
          try {
            await activeVideoTrack.applyConstraints({
              width: { ideal: 3840 },
              height: { ideal: 2160 },
              frameRate: { ideal: 60 },
              resizeMode: "none",
            } as any);
          } catch {
            // Keep native track settings if custom constraint rejected
          }
        }

        // If mic requested, capture clean studio voice via Web Audio API with echo cancellation
        if (get().micEnabled && navigator.mediaDevices?.getUserMedia) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false, // Critical: disable AGC to prevent mic pumping room reverb & speaker bleed
                channelCount: 1,
                sampleRate: 48000,
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

                  // Voice mic gets clean 100% gain
                  const micSrc = audioContextInstance.createMediaStreamSource(new MediaStream([micAudioTracks[0]!]));
                  const micGain = audioContextInstance.createGain();
                  micGain.gain.value = 1.0;
                  micSrc.connect(micGain);
                  micGain.connect(dest);

                  // System audio gets 60% gain so desktop alerts don't drown out or echo the voice
                  const sysSrc = audioContextInstance.createMediaStreamSource(new MediaStream([systemAudioTracks[0]!]));
                  const sysGain = audioContextInstance.createGain();
                  sysGain.gain.value = 0.6;
                  sysSrc.connect(sysGain);
                  sysGain.connect(dest);

                  const mixedTrack = dest.stream.getAudioTracks()[0];
                  if (mixedTrack) {
                    systemAudioTracks.forEach((t) => stream.removeTrack(t));
                    stream.addTrack(mixedTrack);
                  }
                }
              } catch (audioErr) {
                console.warn("Audio mixing fallback:", audioErr);
                systemAudioTracks.forEach((t) => stream.removeTrack(t));
                micAudioTracks.forEach((track) => stream.addTrack(track));
              }
            } else if (micAudioTracks.length > 0) {
              systemAudioTracks.forEach((t) => stream.removeTrack(t));
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
      const elapsed = Date.now() - recordingStartTimestamp;
      set({ elapsedMs: elapsed });
      void platform.syncHudState?.({
        state: get().state,
        elapsedMs: elapsed,
        clicksCount: get().clicks.length,
        micEnabled: get().micEnabled,
      });
    }, 200);

    // If activeStream exists, begin MediaRecorder with 30Mbps crystal-clear resolution
    if (activeStream) {
      try {
        const mimeType = getBestSupportedMimeType();
        activeRecordingMime = mimeType;

        let recorder: MediaRecorder;
        const targetBps = 40_000_000; // 40 Mbps cinema-grade bitrate for Mac Retina clarity
        try {
          recorder = new MediaRecorder(activeStream, {
            mimeType: mimeType || undefined,
            videoBitsPerSecond: targetBps,
            audioBitsPerSecond: 256_000,
          });
        } catch {
          try {
            recorder = new MediaRecorder(activeStream, {
              mimeType: mimeType || undefined,
              videoBitsPerSecond: 25_000_000,
              audioBitsPerSecond: 192_000,
            });
          } catch {
            recorder = mimeType
              ? new MediaRecorder(activeStream, { mimeType })
              : new MediaRecorder(activeStream);
          }
        }
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

    // Start live speech-to-text transcription when in transcribe modes
    transcriptSegments = [];
    currentInterimText = "";
    currentInterimStartMs = 0;
    isIntentionallyStoppingRecognition = false;

    const shouldTranscribe =
      get().recordingMode === "sfx-transcribe" ||
      get().recordingMode === "auto-zoom-sfx-transcribe";

    if (shouldTranscribe) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI: (new () => any) | undefined =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        toast.info("Auto-captions will be generated for your actions upon completing the recording.");
      } else {
        const initRecognition = () => {
          if (isIntentionallyStoppingRecognition || get().state !== "recording") return;
          try {
            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
              toast.success("🎤 Live speech transcription active");
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onresult = (event: any) => {
              const nowMs = Math.max(0, Date.now() - recordingStartTimestamp);
              for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (!result) continue;
                const transcript: string = result[0]?.transcript?.trim() ?? "";
                if (!transcript) continue;

                if (result.isFinal) {
                  currentInterimText = "";
                  const words = transcript.split(/\s+/);
                  for (let w = 0; w < words.length; w += 8) {
                    const chunk = words.slice(w, w + 8).join(" ");
                    if (chunk) {
                      const start = currentInterimStartMs > 0 ? currentInterimStartMs : nowMs;
                      transcriptSegments.push({ text: chunk, startMs: start });
                      console.debug("[transcribe final]", start, chunk);
                    }
                  }
                  currentInterimStartMs = 0;
                } else {
                  if (!currentInterimStartMs) {
                    currentInterimStartMs = nowMs;
                  }
                  currentInterimText = transcript;
                }
              }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onerror = (e: any) => {
              if (e.error === "not-allowed") {
                toast.warning("Microphone access not permitted for speech recognition.");
                isIntentionallyStoppingRecognition = true;
              } else {
                console.debug("[transcribe notification]", e.error);
              }
            };

            recognition.onend = () => {
              // Flush pending interim speech so short or final phrases are immediately captured
              if (currentInterimText && currentInterimText.trim().length > 0) {
                const words = currentInterimText.trim().split(/\s+/);
                for (let w = 0; w < words.length; w += 8) {
                  const chunk = words.slice(w, w + 8).join(" ");
                  if (chunk && !transcriptSegments.some((s) => s.text === chunk)) {
                    transcriptSegments.push({
                      text: chunk,
                      startMs: currentInterimStartMs || Math.max(0, Date.now() - recordingStartTimestamp - 1200),
                    });
                  }
                }
                currentInterimText = "";
                currentInterimStartMs = 0;
              }

              // Restart cleanly if recording is ongoing and stop wasn't requested
              if (!isIntentionallyStoppingRecognition && get().state === "recording") {
                setTimeout(() => {
                  if (!isIntentionallyStoppingRecognition && get().state === "recording") {
                    initRecognition();
                  }
                }, 150);
              }
            };

            recognition.start();
            recognitionInstance = recognition;
          } catch (recErr) {
            console.warn("SpeechRecognition start error:", recErr);
          }
        };

        initRecognition();
      }
    }

    // Set up global listeners to record clicks, typing, and moving mouse trajectory
    let lastX = 0.5;
    let lastY = 0.5;
    let lastTypingTime = 0;
    let lastCursorSampleTime = 0;

    // Attach native OS-level global mouse & typing listeners for full screen capture outside the app
    void platform.startGlobalInputCapture?.();
    if (platform.isApp && platform.checkAccessibilityPermission) {
      void platform.checkAccessibilityPermission().then((trusted) => {
        if (!trusted) {
          void platform.requestAccessibilityPermission?.();
          toast.warning(
            "Enable Accessibility for DomoLens in macOS System Settings -> Privacy & Security -> Accessibility to record clicks in external apps!",
          );
        }
      });
    }
    let globalDragStart: { x: number; y: number; timeMs: number } | null = null;
    const offClick = platform.onGlobalClick?.((payload) => {
      if (get().state !== "recording") return;
      lastX = payload.norm_x;
      lastY = payload.norm_y;
      const nowRel = Math.max(0, Date.now() - recordingStartTimestamp);
      globalDragStart = { x: payload.norm_x, y: payload.norm_y, timeMs: nowRel };
      get().recordClick(payload.norm_x, payload.norm_y, (payload.button as "left" | "right" | "middle") || "left");
    });
    const offMouseUp = platform.onGlobalMouseUp?.((payload) => {
      if (get().state !== "recording") return;
      lastX = payload.norm_x;
      lastY = payload.norm_y;
      if (globalDragStart) {
        const nowRel = Math.max(0, Date.now() - recordingStartTimestamp);
        const dist = Math.hypot(payload.norm_x - globalDragStart.x, payload.norm_y - globalDragStart.y);
        const dur = Math.max(0, nowRel - globalDragStart.timeMs);
        if (dist >= 0.05 && dur >= 200) {
          get().recordHighlight(globalDragStart.x, globalDragStart.y, payload.norm_x, payload.norm_y, globalDragStart.timeMs, dur);
        }
        globalDragStart = null;
      }
    });
    const offMove = platform.onGlobalMouseMove?.((payload) => {
      if (get().state !== "recording") return;
      lastX = payload.norm_x;
      lastY = payload.norm_y;
      get().recordCursorPoint(payload.norm_x, payload.norm_y);
    });
    let activeGlobalTypingId: string | null = null;
    let lastGlobalTypingTime = 0;

    const offTyping = platform.onGlobalTyping?.((payload) => {
      if (get().state !== "recording") return;
      const now = Date.now();
      const isNewSession = now - lastGlobalTypingTime > 1600 || !activeGlobalTypingId;
      lastGlobalTypingTime = now;
      if (isNewSession) {
        activeGlobalTypingId = `type-${now}-${Math.random().toString(36).slice(2, 7)}`;
        get().recordTyping(payload.norm_x, payload.norm_y, "Input", activeGlobalTypingId);
      } else {
        get().recordTyping(payload.norm_x, payload.norm_y, undefined, activeGlobalTypingId ?? undefined);
      }
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
          onInteraction: (act) => {
            if (get().state !== "recording") return;
            lastX = act.x;
            lastY = act.y;
            if (act.type === "typing") {
              get().recordTyping(act.x, act.y, act.snippet, act.id);
            }
          },
        });
      } catch (err) {
        console.warn("Motion tracker start error:", err);
      }
    }

    // Enable floating HUD mode and display native OS floating quickaction HUD bar
    void platform.setAlwaysOnTop?.(true);
    void platform.showRecordingHud?.();
    void platform.syncHudState?.({
      state: "recording",
      elapsedMs: 0,
      clicksCount: 0,
      micEnabled: get().micEnabled,
    });

    const offHud = platform.onHudCommand?.((action) => {
      if (action === "finish" || action === "stop") {
        void get().stopRecording();
      } else if (action === "pause") {
        get().pauseRecording();
      } else if (action === "resume") {
        get().resumeRecording();
      } else if (action === "cancel") {
        get().cancelRecording();
      } else if (action === "add_zoom") {
        get().recordClick(0.5, 0.5, "left");
      } else if (action === "toggle_mic") {
        get().toggleMic();
      }
    });

    // Map DOM pointer coordinates into the captured surface's normalized space.
    // - monitor: use screen-relative coordinates (screenX / screen.width)
    // - browser tab (this tab): use viewport-relative coordinates
    // - window / other: DOM events do not correspond to the captured pixels, so ignore
    const captureSurface = (() => {
      try {
        const settings = activeStream?.getVideoTracks()[0]?.getSettings() as
          | (MediaTrackSettings & { displaySurface?: string })
          | undefined;
        return settings?.displaySurface ?? "monitor";
      } catch {
        return "monitor";
      }
    })();
    const mapPointer = (clientX: number, clientY: number, screenX: number, screenY: number) => {
      const sw = window.screen.width || window.innerWidth || 1920;
      const sh = window.screen.height || window.innerHeight || 1080;
      const ww = window.innerWidth || 1920;
      const wh = window.innerHeight || 1080;

      if (captureSurface === "monitor") {
        if (typeof screenX === "number" && typeof screenY === "number" && screenX > 0 && screenY > 0) {
          return {
            x: Math.min(1, Math.max(0, screenX / sw)),
            y: Math.min(1, Math.max(0, screenY / sh)),
          };
        }
        return {
          x: Math.min(1, Math.max(0, clientX / ww)),
          y: Math.min(1, Math.max(0, clientY / wh)),
        };
      }

      if (captureSurface === "browser" || captureSurface === "window") {
        return {
          x: Math.min(1, Math.max(0, clientX / ww)),
          y: Math.min(1, Math.max(0, clientY / wh)),
        };
      }

      if (clientX >= 0 && clientY >= 0 && clientX <= ww && clientY <= wh) {
        return {
          x: Math.min(1, Math.max(0, clientX / ww)),
          y: Math.min(1, Math.max(0, clientY / wh)),
        };
      }
      return {
        x: Math.min(1, Math.max(0, (screenX || clientX) / sw)),
        y: Math.min(1, Math.max(0, (screenY || clientY) / sh)),
      };
    };

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      if (get().state !== "recording") return;
      const src = "clientX" in e ? e : e.touches[0];
      if (!src) return;
      const mapped = mapPointer(src.clientX, src.clientY, src.screenX, src.screenY);
      if (!mapped) return;
      lastX = mapped.x;
      lastY = mapped.y;
      const now = Date.now();
      if (now - lastCursorSampleTime >= 25) {
        lastCursorSampleTime = now;
        get().recordCursorPoint(lastX, lastY);
      }
    };

    let inAppDragStart: { x: number; y: number; timeMs: number } | null = null;
    const handleMouseDown = (e: MouseEvent) => {
      if (get().state !== "recording") return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest("[data-recorder-ui]")) {
        return;
      }

      const mapped = mapPointer(e.clientX, e.clientY, e.screenX, e.screenY);
      if (!mapped) return;
      const { x, y } = mapped;
      lastX = x;
      lastY = y;
      const nowRel = Math.max(0, Date.now() - recordingStartTimestamp);
      inAppDragStart = { x, y, timeMs: nowRel };
      get().recordClick(x, y, e.button === 2 ? "right" : "left");
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (get().state !== "recording") return;
      const mapped = mapPointer(e.clientX, e.clientY, e.screenX, e.screenY);
      if (!mapped) return;
      const { x, y } = mapped;
      lastX = x;
      lastY = y;
      if (inAppDragStart) {
        const nowRel = Math.max(0, Date.now() - recordingStartTimestamp);
        const dist = Math.hypot(x - inAppDragStart.x, y - inAppDragStart.y);
        const dur = Math.max(0, nowRel - inAppDragStart.timeMs);
        if (dist >= 0.05 && dur >= 200) {
          get().recordHighlight(inAppDragStart.x, inAppDragStart.y, x, y, inAppDragStart.timeMs, dur);
        }
        inAppDragStart = null;
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
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
      void platform.stopGlobalInputCapture?.();
      offHud?.();
      offClick?.();
      offMouseUp?.();
      offMove?.();
      offTyping?.();
      if (stopMotionTracker) {
        stopMotionTracker();
        stopMotionTracker = null;
      }
      // Stop speech recognition if active
      if (recognitionInstance) {
        try { recognitionInstance.stop(); } catch { /* ignore */ }
        recognitionInstance = null;
      }
    };

    // Store cleanup for stop / cancel
    recorderCleanupFn = cleanupListeners;

    window.addEventListener("mousemove", handlePointerMove, { passive: true });
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
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
    void platform.syncHudState?.({
      state: "paused",
      elapsedMs: get().elapsedMs,
      clicksCount: get().clicks.length,
      micEnabled: get().micEnabled,
    });
  },

  resumeRecording: () => {
    if (get().state !== "paused") return;
    if (mediaRecorderInstance && mediaRecorderInstance.state === "paused") {
      mediaRecorderInstance.resume();
    }
    elapsedTimer = setInterval(() => {
      const elapsed = Date.now() - recordingStartTimestamp;
      set({ elapsedMs: elapsed });
      void platform.syncHudState?.({
        state: "recording",
        elapsedMs: elapsed,
        clicksCount: get().clicks.length,
        micEnabled: get().micEnabled,
      });
    }, 200);
    set({ state: "recording" });
    void platform.syncHudState?.({
      state: "recording",
      elapsedMs: get().elapsedMs,
      clicksCount: get().clicks.length,
      micEnabled: get().micEnabled,
    });
  },

  stopRecording: async () => {
    if (elapsedTimer) clearInterval(elapsedTimer);
    elapsedTimer = null;

    if (recorderCleanupFn) {
      recorderCleanupFn();
      recorderCleanupFn = null;
    }

    // Stop live speech-to-text recognition cleanly and flush any buffered speech immediately
    isIntentionallyStoppingRecognition = true;
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch {}
      recognitionInstance = null;
    }

    if (currentInterimText && currentInterimText.trim().length > 0) {
      const words = currentInterimText.trim().split(/\s+/);
      for (let w = 0; w < words.length; w += 8) {
        const chunk = words.slice(w, w + 8).join(" ");
        if (chunk && !transcriptSegments.some((s) => s.text === chunk)) {
          transcriptSegments.push({
            text: chunk,
            startMs: currentInterimStartMs || Math.max(0, get().elapsedMs - 1200),
          });
        }
      }
      currentInterimText = "";
      currentInterimStartMs = 0;
    }

    if (mediaRecorderInstance && mediaRecorderInstance.state !== "inactive") {
      try {
        await new Promise<void>((resolve) => {
          if (!mediaRecorderInstance) return resolve();
          mediaRecorderInstance.onstop = () => resolve();
          mediaRecorderInstance.stop();
          // Timeout fallback in case onstop doesn't fire
          setTimeout(resolve, 300);
        });
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
    // Filter out clicks that happened when the user finished the recording (stop/finish clicks or within trailing window)
    // to strictly prevent accidental zoom frames on the finish action!
    const finishCutoffTime = Math.max(0, duration - 1000);
    const isFinishOrStopClick = (c: { timestampMs: number; id?: string }) => {
      const id = (c.id || "").toLowerCase();
      if (id.includes("stop") || id.includes("finish")) return true;
      if (c.timestampMs > finishCutoffTime) return true;
      return false;
    };
    const rawClicks = get().clicks.filter((c) => !isFinishOrStopClick(c));
    const rawInteractions = get().interactions.filter((i) => !isFinishOrStopClick(i));
    void platform.setAlwaysOnTop?.(false);
    void platform.hideRecordingHud?.();
    set({ state: "idle" });

    // Strictly preserve real user clicks without synthetic filler
    let finalClicks = rawClicks;
    let finalInteractions = rawInteractions;
    let finalTrajectory = get().cursorTrajectory;

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
            platform.registerBlobUrl?.(diskPath, mediaUrl);
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

    // Only run optical scan for trajectory reconstruction if NO clicks were captured AND trajectory is completely empty
    const shouldRunOpticalScan =
      Boolean(mediaUrl) &&
      typeof document !== "undefined" &&
      finalClicks.length === 0 &&
      finalTrajectory.length < 8;

    if (shouldRunOpticalScan) {
      try {
        const scanVideo = document.createElement("video");
        scanVideo.muted = true;
        scanVideo.preload = "auto";
        scanVideo.src = platform.mediaUrl(mediaUrl);
        await new Promise<void>((resolve) => {
          scanVideo.onloadedmetadata = () => resolve();
          scanVideo.onerror = () => resolve();
          setTimeout(resolve, 1200);
        });
        if (scanVideo.duration > 0) {
          const scanned = await scanVideoElementForActivity(scanVideo, {
            sampleStepMs: 250,
            maxDurationMs: duration,
          });

          if (scanned.cursorTrajectory.length > 0 && finalTrajectory.length < 8) {
            finalTrajectory = scanned.cursorTrajectory;
          }
        }
      } catch (scanErr) {
        console.warn("Post-recording optical scan error:", scanErr);
      }
    }

    // Strict Clean Up: Eliminate duplicate clicks or micro-flutter closer than 350ms
    const sortedRawClicks = [...finalClicks].sort((a, b) => a.timestampMs - b.timestampMs);
    const cleanedClicks: ClickEvent[] = [];
    for (const c of sortedRawClicks) {
      const prev = cleanedClicks[cleanedClicks.length - 1];
      if (prev && c.timestampMs - prev.timestampMs < 350 && Math.hypot(c.x - prev.x, c.y - prev.y) < 0.05) {
        continue;
      }
      cleanedClicks.push(c);
    }
    finalClicks = cleanedClicks;

    // Ensure every single click is represented in interactions for camera zooming!
    const clickEventsAsInteractions: InteractionEvent[] = finalClicks.map((c) => ({
      id: c.id,
      type: "click" as const,
      timestampMs: c.timestampMs,
      x: c.x,
      y: c.y,
      button: c.button,
    }));
    const mergedForPlotting: InteractionEvent[] = [...finalInteractions];
    for (const c of clickEventsAsInteractions) {
      const exists = mergedForPlotting.some(
        (e) => Math.abs(e.timestampMs - c.timestampMs) < 300 && (e.id === c.id || Math.hypot(e.x - c.x, e.y - c.y) < 0.05),
      );
      if (!exists) {
        mergedForPlotting.push(c);
      }
    }
    mergedForPlotting.sort((a, b) => a.timestampMs - b.timestampMs);
    finalInteractions = mergedForPlotting;

    // STRICT INVARIANT:
    // If no user clicks or interactions occurred during recording (excluding stop/finish action),
    // strictly DO NOT apply zoom in! The video remains in full screen (1.0x) only!
    // Also skip zoom plotting for "regular" mode — no auto-zoom at all.
    const mode = get().recordingMode;
    const shouldPlotZoom = mode !== "regular";
    const hasUserInteractions = (finalClicks.length > 0 || finalInteractions.length > 0) && shouldPlotZoom;
    const { keyframes, zoomBlocks } =
      hasUserInteractions
        ? plotInteractionsToKeyframesAndZoomBlocks(
            finalInteractions,
            duration,
            {
              holdDurationMs: 1000,
              inactivityResetMs: 1000,
              maxGlideGapMs: 1000,
              leadInMs: 1000,
              leadOutMs: 400,
              scale: 1.85,
              fallbackIfEmpty: false,
              continuousGlide: true,
              centerTyping: true,
              autoFillGaps: false,
              minRestMs: 400,
              enableRevealDip: false,
              cursorTrajectory: finalTrajectory,
              typingZoomOut: false,
              initialEstablishingMs: 1400,
            },
          )
        : { keyframes: [], zoomBlocks: [] };

    // Auto-plot text callouts from typing interactions ONLY if genuine text was typed
    const textOverlays: import("@domolens/core").TextOverlay[] = finalInteractions
      .filter(
        (i) =>
          i.type === "typing" &&
          i.snippet &&
          i.snippet.trim().length > 0 &&
          i.snippet !== "Text Input" &&
          i.snippet !== "Activity Target" &&
          i.snippet !== "Input",
      )
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

    // Merge speech-to-text transcript segments (from sfx-transcribe mode)
    if (transcriptSegments.length > 0) {
      transcriptSegments.forEach((seg, idx) => {
        textOverlays.push({
          id: `transcript-${idx + 1}`,
          text: seg.text,
          startTimeMs: seg.startMs,
          durationMs: 3200,
          x: 0.5,
          y: 0.88,
          fontSize: 18,
          color: "#ffffff",
          bgColor: "rgba(0, 0, 0, 0.72)",
          motionPreset: "blur-reveal",
        } as import("@domolens/core").TextOverlay);
      });
      transcriptSegments = [];
    } else if (mode === "sfx-transcribe" || mode === "auto-zoom-sfx-transcribe") {
      // Fallback: If Web Speech API was unavailable or returned 0 segments in current environment,
      // generate smart action captions synced to each interaction block
      // so the user ALWAYS gets timed subtitles in transcribe mode!
      const captionTargets = zoomBlocks.length > 0
        ? zoomBlocks
        : finalInteractions.map((i, idx) => ({
            id: `block-${idx}`,
            startTimeMs: i.timestampMs,
            endTimeMs: i.timestampMs + 2500,
            targetX: i.x,
            targetY: i.y,
            scale: 1.85,
            enabled: true,
          }));

      captionTargets.forEach((block, idx) => {
        const match =
          finalInteractions.find(
            (i) => Math.abs(i.timestampMs - block.startTimeMs) <= 1500 && i.type === "typing",
          ) ||
          finalInteractions.find(
            (i) => Math.abs(i.timestampMs - block.startTimeMs) <= 1500,
          );
        const captionText = match?.type === "typing"
          ? match?.snippet
            ? `Enter text: "${match.snippet.slice(0, 36)}"`
            : "Typing and entering values into form"
          : match?.button === "right"
          ? "Right click to inspect context options"
          : idx === 0
          ? "Click to open application showcase navigation"
          : idx === 1
          ? "Navigate and inspect settings panel options"
          : `Step ${idx + 1}: Click and focus target element`;

        textOverlays.push({
          id: `caption-${idx + 1}`,
          text: captionText,
          startTimeMs: block.startTimeMs,
          durationMs: Math.min(3500, Math.max(2000, block.endTimeMs - block.startTimeMs)),
          x: 0.5,
          y: 0.88,
          fontSize: 18,
          color: "#ffffff",
          bgColor: "rgba(0, 0, 0, 0.72)",
          motionPreset: "blur-reveal",
        } as import("@domolens/core").TextOverlay);
      });
    }

    // Auto-plot chapters for the AI director / video outline
    const chapters = zoomBlocks.map((b, idx) => {
      const match =
        finalInteractions.find(
          (i) => Math.abs(i.timestampMs - b.startTimeMs) <= 1200 && i.type === "typing",
        ) ||
        finalInteractions.find(
          (i) => Math.abs(i.timestampMs - b.startTimeMs) <= 1200,
        );
      const isTyping = match?.type === "typing";
      return {
        timeMs: b.startTimeMs,
        title: isTyping
          ? match?.snippet && match.snippet.trim().length > 0
            ? `Typing: ${match.snippet.slice(0, 20)}`
            : "Typing Focus"
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
      looks: {
        ...DEFAULT_LOOKS,
        windowFrame: "terminal" as const,
        fit: "contain" as const,
        padding: 32,
        borderRadius: 16,
        shadow: "lift" as const,
      },
      audioSettings: {
        ...DEFAULT_AUDIO_SETTINGS,
        // SFX only active when mode includes SFX (not regular or auto-zoom-only)
        clickSoundEnabled:
          mode === "auto-zoom-sfx" ||
          mode === "sfx-transcribe" ||
          mode === "auto-zoom-sfx-transcribe",
        typingSoundEnabled:
          mode === "auto-zoom-sfx" ||
          mode === "sfx-transcribe" ||
          mode === "auto-zoom-sfx-transcribe",
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

    // Save full project data permanently on disk and storage across app restarts
    await platform.saveFullProject?.(projectData);
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(`domolens_full_project_${id}`, JSON.stringify(projectData));
      } catch {}
    }
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
    isIntentionallyStoppingRecognition = true;
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch {}
      recognitionInstance = null;
    }
    currentInterimText = "";
    currentInterimStartMs = 0;
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
    void platform.hideRecordingHud?.();
    set({ state: "idle", elapsedMs: 0, clicks: [], interactions: [], cursorTrajectory: [] });
    useNav.getState().go({ name: "home" });
  },
}));
