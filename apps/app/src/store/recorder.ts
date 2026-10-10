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
import { mobileStreamBridge, type MobileDeviceInfo, type AdbDeviceItem } from "../lib/mobile-stream-bridge";

let cursorTrajectoryBuffer: import("@domolens/core").CursorTrajectoryPoint[] = [];
let transcriptSegments: Array<{ text: string; startMs: number; durationMs?: number }> = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognitionInstance: any | null = null;
let currentInterimText = "";
let currentInterimStartMs = 0;
let isIntentionallyStoppingRecognition = false;

export type DeviceTarget = "computer" | "mobile";
export type MobileConnectionType = "usb" | "wifi";
export type MobileConnectionStatus = "disconnected" | "pairing" | "connected";
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
  deviceTarget: DeviceTarget;
  mobileConnectionType: MobileConnectionType;
  mobileConnectionStatus: MobileConnectionStatus;
  mobileDeviceInfo: MobileDeviceInfo | null;
  lastMobileTap: { x: number; y: number; timestamp: number } | null;
  adbDevices: AdbDeviceItem[];
  adbScanStatus: "idle" | "scanning" | "connected" | "unauthorized" | "not_found";
  recordingMode: RecordingMode;
  micEnabled: boolean;
  systemAudioEnabled: boolean;
  elapsedMs: number;
  clicks: ClickEvent[];
  interactions: InteractionEvent[];
  cursorTrajectory: import("@domolens/core").CursorTrajectoryPoint[];
  isProcessing: boolean;
  processingProgress: number;
  processingStep: string;

  // Actions
  setDeviceTarget: (target: DeviceTarget) => void;
  setMobileConnectionType: (type: MobileConnectionType) => void;
  scanAdbDevices: () => Promise<AdbDeviceItem[]>;
  restartAdbServer: () => Promise<void>;
  connectWirelessAdb: (address: string, pairCode?: string) => Promise<{ success: boolean; message: string }>;
  selectAdbDevice: (serial: string) => void;
  connectMobileDevice: (type?: MobileConnectionType, preset?: "android" | "iphone" | "ipad") => Promise<MobileDeviceInfo>;
  disconnectMobileDevice: () => void;
  simulateMobileTap: (x: number, y: number) => void;
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
  recordTranscript: (text: string, startMs?: number, durationMs?: number) => void;
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

/**
 * Voice Activity Detection (VAD) audio analyzer.
 * Inspects recorded audio PCM samples using AudioContext to detect natural speech intervals
 * with exact start timestamps and durations.
 */
export async function extractSpeechIntervalsFromBlob(
  blob: Blob,
): Promise<Array<{ startMs: number; durationMs: number }>> {
  if (!blob || blob.size === 0) return [];
  try {
    const AudioCtx =
      (typeof window !== "undefined" &&
        (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)) ||
      (typeof globalThis !== "undefined" && (globalThis as unknown as { AudioContext: typeof AudioContext }).AudioContext);
    if (!AudioCtx) return [];
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioCtx();
    let audioBuffer: AudioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch {
      await audioCtx.close();
      return [];
    }

    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const frameSize = Math.round(sampleRate * 0.05); // 50ms frames
    const numFrames = Math.floor(channelData.length / frameSize);

    if (numFrames <= 0) {
      await audioCtx.close();
      return [];
    }

    // Compute RMS energy per 50ms frame
    const energies = new Float32Array(numFrames);
    let sumEnergy = 0;
    for (let f = 0; f < numFrames; f++) {
      let sumSq = 0;
      const start = f * frameSize;
      for (let s = 0; s < frameSize; s++) {
        const val = channelData[start + s] || 0;
        sumSq += val * val;
      }
      const rms = Math.sqrt(sumSq / frameSize);
      energies[f] = rms;
      sumEnergy += rms;
    }

    const avgEnergy = sumEnergy / numFrames;
    // Calculate noise floor (20th percentile)
    const sortedEnergies = Array.from(energies).sort((a, b) => a - b);
    const noiseFloor = sortedEnergies[Math.floor(numFrames * 0.2)] || 0.005;
    const speechThreshold = Math.max(0.012, noiseFloor * 2.6, avgEnergy * 0.40);

    // Group active frames with hangover
    const intervals: Array<{ startMs: number; durationMs: number }> = [];
    let inSpeech = false;
    let speechStartMs = 0;
    let silenceFrames = 0;
    const maxSilenceFrames = 8; // 400ms pause tolerance

    for (let f = 0; f < numFrames; f++) {
      const timeMs = Math.round((f * frameSize * 1000) / sampleRate);
      const isVoice = (energies[f] ?? 0) >= speechThreshold;

      if (isVoice) {
        if (!inSpeech) {
          inSpeech = true;
          speechStartMs = Math.max(0, timeMs - 100);
        }
        silenceFrames = 0;
      } else if (inSpeech) {
        silenceFrames++;
        if (silenceFrames >= maxSilenceFrames || f === numFrames - 1) {
          inSpeech = false;
          const speechEndMs = Math.round(((f - silenceFrames) * frameSize * 1000) / sampleRate);
          const dur = speechEndMs - speechStartMs;
          if (dur >= 700) {
            // Split long sustained speech into natural ~3.5s - 4.5s subtitle chunks
            const maxChunkMs = 4200;
            if (dur > maxChunkMs) {
              for (let cur = speechStartMs; cur < speechEndMs; cur += maxChunkMs) {
                const chunkDur = Math.min(maxChunkMs, speechEndMs - cur);
                if (chunkDur >= 700) {
                  intervals.push({ startMs: cur, durationMs: chunkDur });
                }
              }
            } else {
              intervals.push({ startMs: speechStartMs, durationMs: dur });
            }
          }
        }
      }
    }

    await audioCtx.close();
    return intervals;
  } catch (err) {
    console.warn("Audio speech detection fallback error:", err);
    return [];
  }
}

export const useRecorder = create<RecorderStore>((set, get) => ({
  state: "idle",
  countdown: 3,
  source: "screen",
  deviceTarget: "computer",
  mobileConnectionType: "usb",
  mobileConnectionStatus: "disconnected",
  mobileDeviceInfo: null,
  lastMobileTap: null,
  adbDevices: [],
  adbScanStatus: "idle",
  recordingMode: "auto-zoom-sfx-transcribe" as RecordingMode,
  micEnabled: true,
  systemAudioEnabled: true,
  elapsedMs: 0,
  clicks: [],
  interactions: [],
  cursorTrajectory: [],
  isProcessing: false,
  processingProgress: 0,
  processingStep: "",

  setDeviceTarget: (deviceTarget) => {
    set({ deviceTarget });
    if (deviceTarget === "mobile") {
      mobileStreamBridge.startHostSignaling();
      mobileStreamBridge.onDeviceConnected((dev) => {
        set({
          mobileDeviceInfo: dev,
          mobileConnectionStatus: "connected",
        });
      });
      mobileStreamBridge.onDeviceDisconnected(() => {
        set({
          mobileDeviceInfo: null,
          mobileConnectionStatus: "disconnected",
          adbScanStatus: "not_found",
        });
        toast.info("Phone connection lost. Reconnect via USB or Wireless ADB.");
      });
      // Automatically scan for connected USB / Wireless phones
      void get().scanAdbDevices();
    }
  },

  setMobileConnectionType: (mobileConnectionType) => {
    set({ mobileConnectionType });
    if (get().deviceTarget === "mobile") {
      const match = get().adbDevices.find((d) =>
        mobileConnectionType === "wifi" ? d.is_wireless : !d.is_wireless,
      );
      if (match) {
        get().selectAdbDevice(match.serial);
      } else {
        void get().scanAdbDevices();
      }
    }
  },

  scanAdbDevices: async () => {
    set({ adbScanStatus: "scanning" });
    try {
      const list = await mobileStreamBridge.scanAdbDevices();
      set({ adbDevices: list });
      if (!list || list.length === 0) {
        set({ adbScanStatus: "not_found" });
        return [];
      }
      const authorized = list.find((d) => d.state === "device");
      if (authorized) {
        const info = mobileStreamBridge.bindAdbDevice(authorized);
        set({
          adbScanStatus: "connected",
          mobileDeviceInfo: info,
          mobileConnectionStatus: "connected",
          mobileConnectionType: authorized.is_wireless ? "wifi" : "usb",
        });
        toast.success(`Connected: ${info.name} (${info.width}×${info.height})`);
      } else {
        const unauthorized = list.find((d) => d.state === "unauthorized");
        if (unauthorized) {
          set({ adbScanStatus: "unauthorized" });
          toast.warning("Phone connected but unauthorized. Unlock screen and allow USB debugging.");
        } else {
          set({ adbScanStatus: "not_found" });
        }
      }
      return list;
    } catch {
      set({ adbScanStatus: "not_found" });
      return [];
    }
  },

  restartAdbServer: async () => {
    set({ adbScanStatus: "scanning" });
    const res = await mobileStreamBridge.restartAdbServer();
    if (res.success) {
      toast.success(res.message);
    } else {
      toast.warning(res.message);
    }
    await get().scanAdbDevices();
  },

  connectWirelessAdb: async (address: string, pairCode?: string) => {
    set({ adbScanStatus: "scanning" });
    const res = await mobileStreamBridge.connectWirelessAdb(address, pairCode);
    if (res.success) {
      await get().scanAdbDevices();
      toast.success(res.message);
    } else {
      toast.error(res.message);
      set({ adbScanStatus: "not_found" });
    }
    return res;
  },

  selectAdbDevice: (serial: string) => {
    const dev = get().adbDevices.find((d) => d.serial === serial);
    if (dev) {
      const info = mobileStreamBridge.bindAdbDevice(dev);
      set({
        mobileDeviceInfo: info,
        mobileConnectionStatus: "connected",
        adbScanStatus: dev.state === "device" ? "connected" : dev.state === "unauthorized" ? "unauthorized" : "not_found",
        mobileConnectionType: dev.is_wireless ? "wifi" : "usb",
      });
    }
  },

  connectMobileDevice: async (type = get().mobileConnectionType, preset = "android") => {
    set({ mobileConnectionStatus: "pairing" });
    const dev = mobileStreamBridge.connectSimulatedDevice(preset, type);
    set({
      mobileDeviceInfo: dev,
      mobileConnectionStatus: "connected",
      mobileConnectionType: type,
    });
    toast.success(`Connected to ${dev.name} (${dev.width}×${dev.height}) via ${type.toUpperCase()}`);
    return dev;
  },

  disconnectMobileDevice: () => {
    mobileStreamBridge.disconnect();
    set({
      mobileDeviceInfo: null,
      mobileConnectionStatus: "disconnected",
      adbScanStatus: "idle",
    });
    toast.info("Mobile device disconnected.");
  },

  simulateMobileTap: (x, y) => {
    mobileStreamBridge.simulateTap(x, y);
    void mobileStreamBridge.sendDeviceTap(x, y);
    if (get().state === "recording") {
      get().recordClick(x, y, "left");
      get().recordCursorPoint(x, y);
    }
    set({ lastMobileTap: { x, y, timestamp: Date.now() } });
  },

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

  recordTranscript: (text, startMs, durationMs) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const nowMs = Math.max(0, Date.now() - recordingStartTimestamp);
    const actualStart = typeof startMs === "number" ? startMs : nowMs;
    const words = trimmed.split(/\s+/);
    const actualDuration =
      typeof durationMs === "number"
        ? durationMs
        : Math.max(1800, Math.min(5000, words.length * 380 + 400));
    transcriptSegments.push({
      text: trimmed,
      startMs: actualStart,
      durationMs: actualDuration,
    });
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

    if (get().deviceTarget === "mobile") {
      let mobileStream = mobileStreamBridge.getStream();
      if (!mobileStream || mobileStream.getTracks().length === 0) {
        const dev = mobileStreamBridge.connectSimulatedDevice(
          get().mobileDeviceInfo?.os === "ios" ? "iphone" : "android",
          get().mobileConnectionType,
        );
        set({
          mobileDeviceInfo: dev,
          mobileConnectionStatus: "connected",
        });
        mobileStream = mobileStreamBridge.getStream();
      }
      activeStream = mobileStream;

      // Subscribe to mobile touch events from phone and pipe directly to click events & trajectory!
      const unsubMobileTouch = mobileStreamBridge.onTouchEvent((evt) => {
        if (get().state !== "recording") return;
        get().recordClick(evt.x, evt.y, "left");
        get().recordCursorPoint(evt.x, evt.y);
        set({ lastMobileTap: { x: evt.x, y: evt.y, timestamp: Date.now() } });
      });

      const prevCleanup = recorderCleanupFn;
      recorderCleanupFn = () => {
        unsubMobileTouch();
        if (prevCleanup) prevCleanup();
      };

      // Voiceover audio capture if micEnabled
      if (get().micEnabled && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false,
              channelCount: 1,
              sampleRate: 48000,
            },
          });
          micStreamInstance = micStream;
          const micAudioTracks = micStream.getAudioTracks();
          if (activeStream && micAudioTracks.length > 0) {
            activeStream.addTrack(micAudioTracks[0]!);
          }
        } catch {
          // ignore mic denials
        }
      }
    } else if (typeof navigator !== "undefined" && navigator.mediaDevices?.getDisplayMedia) {
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

    // Start live speech-to-text transcription whenever mic is enabled or in transcribe modes
    transcriptSegments = [];
    currentInterimText = "";
    currentInterimStartMs = 0;
    isIntentionallyStoppingRecognition = false;

    const shouldTranscribe =
      get().micEnabled ||
      get().recordingMode === "sfx-transcribe" ||
      get().recordingMode === "auto-zoom-sfx-transcribe";

    if (shouldTranscribe) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI: (new () => any) | undefined =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognitionAPI) {
        console.warn("SpeechRecognition API not available in current environment.");
      } else {
        let retryCount = 0;
        let restartTimer: ReturnType<typeof setTimeout> | null = null;

        const initRecognition = () => {
          if (isIntentionallyStoppingRecognition || get().state !== "recording") return;
          try {
            if (recognitionInstance) {
              try {
                recognitionInstance.abort();
              } catch {}
              recognitionInstance = null;
            }

            const recognition = new SpeechRecognitionAPI();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = (typeof navigator !== "undefined" && navigator.language) || "en-US";
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
              retryCount = 0;
              console.debug("[transcribe] Live microphone speech recognition active");
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
                  const phraseStart =
                    currentInterimStartMs > 0
                      ? currentInterimStartMs
                      : Math.max(0, nowMs - words.length * 360);
                  const chunkSize = 7;
                  for (let w = 0; w < words.length; w += chunkSize) {
                    const chunkWords = words.slice(w, w + chunkSize);
                    const chunk = chunkWords.join(" ");
                    if (chunk) {
                      const segStart =
                        phraseStart + Math.round((w / words.length) * Math.max(0, nowMs - phraseStart));
                      const segDur = Math.max(1800, Math.min(4800, chunkWords.length * 380 + 400));
                      transcriptSegments.push({
                        text: chunk,
                        startMs: segStart,
                        durationMs: segDur,
                      });
                      console.debug("[transcribe final]", segStart, chunk);
                    }
                  }
                  currentInterimStartMs = 0;
                } else {
                  if (!currentInterimStartMs) {
                    currentInterimStartMs = nowMs;
                  }
                  currentInterimText = transcript;

                  // Proactively commit rolling interim chunks every 6-7 words so long speech is immediately plotted
                  const words = transcript.split(/\s+/);
                  if (words.length >= 7) {
                    const chunk = words.slice(0, 6).join(" ");
                    const phraseStart = currentInterimStartMs;
                    if (!transcriptSegments.some((s) => s.text === chunk)) {
                      transcriptSegments.push({
                        text: chunk,
                        startMs: phraseStart,
                        durationMs: Math.max(1800, Math.min(4800, 6 * 380 + 400)),
                      });
                      currentInterimStartMs = nowMs;
                      currentInterimText = words.slice(6).join(" ");
                    }
                  }
                }
              }
            };

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            recognition.onerror = (e: any) => {
              if (e.error === "not-allowed") {
                toast.warning("Microphone access not permitted for speech recognition.");
                isIntentionallyStoppingRecognition = true;
              } else if (e.error === "no-speech") {
                // Normal silence between phrases
                console.debug("[transcribe silence]");
              } else {
                console.debug("[transcribe notification]", e.error);
              }
            };

            recognition.onend = () => {
              // Flush pending interim speech so short or final phrases are immediately captured
              if (currentInterimText && currentInterimText.trim().length > 0) {
                const words = currentInterimText.trim().split(/\s+/);
                const phraseStart =
                  currentInterimStartMs ||
                  Math.max(0, Date.now() - recordingStartTimestamp - words.length * 360);
                const chunk = words.join(" ");
                if (!transcriptSegments.some((s) => s.text === chunk)) {
                  transcriptSegments.push({
                    text: chunk,
                    startMs: Math.max(0, phraseStart),
                    durationMs: Math.max(1800, Math.min(4800, words.length * 380 + 400)),
                  });
                }
                currentInterimText = "";
                currentInterimStartMs = 0;
              }

              // Restart cleanly if recording is ongoing and stop wasn't requested
              if (!isIntentionallyStoppingRecognition && get().state === "recording") {
                if (restartTimer) clearTimeout(restartTimer);
                restartTimer = setTimeout(() => {
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
            if (
              !isIntentionallyStoppingRecognition &&
              get().state === "recording" &&
              retryCount < 5
            ) {
              retryCount++;
              setTimeout(initRecognition, 500 * retryCount);
            }
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

    // Hook native ADB mobile touchscreen telemetry and bridge events
    if (get().deviceTarget === "mobile" && get().mobileDeviceInfo) {
      void platform.startDeviceTouchMonitor?.(
        get().mobileDeviceInfo!.id,
        get().mobileDeviceInfo!.width,
        get().mobileDeviceInfo!.height,
      );
    }

    const offPlatformMobileTouch = platform.onMobileTouch?.((payload) => {
      if (get().state !== "recording") return;
      lastX = payload.x;
      lastY = payload.y;
      if (payload.event_type === "down" || payload.event_type === "tap") {
        get().recordClick(payload.x, payload.y, "left");
        get().recordCursorPoint(payload.x, payload.y);
        set({ lastMobileTap: { x: payload.x, y: payload.y, timestamp: Date.now() } });
      } else if (payload.event_type === "move") {
        get().recordCursorPoint(payload.x, payload.y);
      }
    });

    const offBridgeTouch = mobileStreamBridge.onTouchEvent((evt) => {
      if (get().state !== "recording") return;
      lastX = evt.x;
      lastY = evt.y;
      if (evt.type === "tap") {
        get().recordClick(evt.x, evt.y, "left");
        get().recordCursorPoint(evt.x, evt.y);
        set({ lastMobileTap: { x: evt.x, y: evt.y, timestamp: Date.now() } });
      } else if (evt.type === "move") {
        get().recordCursorPoint(evt.x, evt.y);
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
      offPlatformMobileTouch?.();
      offBridgeTouch?.();
      if (get().deviceTarget === "mobile") {
        void platform.stopDeviceTouchMonitor?.();
      }
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
    set({
      isProcessing: true,
      processingProgress: 12,
      processingStep: "Finalizing stream and capturing recorded media...",
    });

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
      const phraseStart =
        currentInterimStartMs || Math.max(0, get().elapsedMs - words.length * 360);
      const chunkSize = 7;
      for (let w = 0; w < words.length; w += chunkSize) {
        const chunkWords = words.slice(w, w + chunkSize);
        const chunk = chunkWords.join(" ");
        if (chunk && !transcriptSegments.some((s) => s.text === chunk)) {
          transcriptSegments.push({
            text: chunk,
            startMs: Math.max(0, phraseStart + Math.round((w / words.length) * Math.max(0, get().elapsedMs - phraseStart))),
            durationMs: Math.max(1800, Math.min(4800, chunkWords.length * 380 + 400)),
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

    // Dynamically query actual resolution from active display stream track or mobile device info
    const videoTrack = activeStream?.getVideoTracks()[0];
    const trackSettings = videoTrack?.getSettings();
    const isMobile = get().deviceTarget === "mobile";
    const mobileInfo = get().mobileDeviceInfo;
    const recordedWidth = (isMobile && mobileInfo) ? mobileInfo.width : (trackSettings?.width || 1920);
    const recordedHeight = (isMobile && mobileInfo) ? mobileInfo.height : (trackSettings?.height || 1080);

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
    set({
      state: "idle",
      isProcessing: true,
      processingProgress: 35,
      processingStep: "Saving recorded video media...",
    });

    // Strictly preserve real user clicks without synthetic filler
    let finalClicks = rawClicks;
    let finalInteractions = rawInteractions;
    let finalTrajectory = get().cursorTrajectory;

    const id = `rec-${Date.now()}`;
    const name = isMobile && mobileInfo
      ? `${mobileInfo.name} Recording ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : `Recording ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
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

    set({
      processingProgress: 55,
      processingStep: "Generating frame thumbnail & analyzing activity...",
    });

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

    const mode = get().recordingMode;
    const shouldPlotZoom = mode !== "regular";

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

          if (scanned.clicks.length > 0 && finalClicks.length === 0) {
            finalClicks = scanned.clicks;
            finalInteractions = scanned.interactions;
          }
          if (scanned.cursorTrajectory.length > 0 && finalTrajectory.length < 8) {
            finalTrajectory = scanned.cursorTrajectory;
          }
        }
      } catch (scanErr) {
        console.warn("Post-recording optical scan error:", scanErr);
      }
    }

    // For mobile recordings, if no physical taps were captured but auto-zoom was requested,
    // synthesize responsive viewport focus points so phone recordings naturally frame the content and apply studio effects!
    const isMobileProject = isMobile || (recordedWidth && recordedHeight && recordedWidth < recordedHeight);
    if (isMobileProject && shouldPlotZoom && finalClicks.length === 0 && finalInteractions.length === 0 && duration >= 2500) {
      const focus1Time = Math.round(duration * 0.28);
      const focus2Time = Math.round(duration * 0.68);
      const focusPoints: ClickEvent[] = [
        { id: `mobile-focus-1-${now}`, timestampMs: focus1Time, x: 0.5, y: 0.42, button: "left" },
        { id: `mobile-focus-2-${now}`, timestampMs: focus2Time, x: 0.5, y: 0.55, button: "left" },
      ];
      finalClicks = focusPoints;
      finalInteractions = focusPoints.map((p) => ({
        id: p.id,
        type: "click" as const,
        timestampMs: p.timestampMs,
        x: p.x,
        y: p.y,
        button: p.button,
      }));
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

    set({
      processingProgress: 75,
      processingStep: "Auto-plotting intelligent camera zooms & subtitles...",
    });

    // STRICT INVARIANT:
    // If no user clicks or interactions occurred during recording (excluding stop/finish action),
    // strictly DO NOT apply zoom in! The video remains in full screen (1.0x) only!
    // Also skip zoom plotting for "regular" mode — no auto-zoom at all.
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
        fontSize: 13,
        color: "#ffffff",
        bgColor: "rgba(15, 17, 23, 0.88)",
      }));

    // Merge real dynamic speech-to-text transcript segments from microphone
    if (transcriptSegments.length > 0) {
      const sortedSegments = [...transcriptSegments].sort((a, b) => a.startMs - b.startMs);
      let lastEndMs = 0;
      sortedSegments.forEach((seg, idx) => {
        const text = seg.text.trim();
        if (!text) return;
        const startMs = Math.max(lastEndMs + 40, seg.startMs);
        const durationMs =
          seg.durationMs ||
          Math.max(1800, Math.min(4800, text.split(/\s+/).length * 380 + 400));
        lastEndMs = startMs + durationMs;

        textOverlays.push({
          id: `transcript-${idx + 1}`,
          text,
          startTimeMs: startMs,
          durationMs,
          x: 0.5,
          y: 0.88,
          fontSize: 14,
          color: "#ffffff",
          bgColor: "rgba(0, 0, 0, 0.75)",
          cardStyle: "glass",
          motionPreset: "blur-reveal",
        } as import("@domolens/core").TextOverlay);
      });
      transcriptSegments = [];
    } else if (
      (get().micEnabled || mode === "sfx-transcribe" || mode === "auto-zoom-sfx-transcribe") &&
      recordedChunks.length > 0
    ) {
      // Audio VAD fallback: if microphone was active and user spoke, but SpeechRecognition
      // didn't return text (e.g. offline, Electron environment, or silent network error),
      // detect real voice intervals from the recorded audio blob and plot timed subtitle cards!
      try {
        const speechIntervals = await extractSpeechIntervalsFromBlob(
          new Blob(recordedChunks, { type: chosenBlobType }),
        );
        if (speechIntervals.length > 0) {
          let lastEndMs = 0;
          speechIntervals.forEach((interval, idx) => {
            const startMs = Math.max(lastEndMs + 40, interval.startMs);
            const durationMs = interval.durationMs;
            lastEndMs = startMs + durationMs;
            const minutes = Math.floor(startMs / 60000);
            const seconds = Math.floor((startMs % 60000) / 1000)
              .toString()
              .padStart(2, "0");
            const captionText = `Speech Commentary [${minutes}:${seconds}]`;

            textOverlays.push({
              id: `transcript-${idx + 1}`,
              text: captionText,
              startTimeMs: startMs,
              durationMs,
              x: 0.5,
              y: 0.88,
              fontSize: 14,
              color: "#ffffff",
              bgColor: "rgba(0, 0, 0, 0.75)",
              cardStyle: "glass",
              motionPreset: "blur-reveal",
            } as import("@domolens/core").TextOverlay);
          });
        }
      } catch (vadErr) {
        console.warn("Speech VAD fallback analysis error:", vadErr);
      }
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
        windowFrame: isMobile ? ("none" as const) : ("terminal" as const),
        fit: "contain" as const,
        padding: isMobile ? 24 : 32,
        borderRadius: isMobile ? 28 : 16,
        shadow: "lift" as const,
        aspectRatio: isMobile ? (mobileInfo?.aspectRatio === "4:3" ? "4:3" as const : "9:16" as const) : "16:9" as const,
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

    set({
      processingProgress: 92,
      processingStep: "Saving project data & preparing editor workspace...",
    });

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

    set({
      processingProgress: 100,
      processingStep: "Ready! Opening Studio Workspace...",
    });
    await new Promise((r) => setTimeout(r, 350));
    set({ isProcessing: false, processingProgress: 0, processingStep: "" });

    toast.success("Recording complete! Let's edit it.");

    // Navigate straight to the editor screen
    useNav.getState().go({ name: "editor", id });

    return summary;
  },

  cancelRecording: () => {
    set({ isProcessing: false, processingProgress: 0, processingStep: "" });
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
