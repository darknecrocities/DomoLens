import {
  analyzeFrameDifference,
  calculateOpticalCentroid,
  classifyFrameActivity,
  detectActivityEventsFromFrames,
  extractLuminanceBuffer,
  type ClickEvent,
  type CursorTrajectoryPoint,
  type InteractionEvent,
  type OpticalAnalysisOptions,
} from "@domolens/core";

export interface OpticalStreamTrackerOptions {
  sampleIntervalMs?: number;
  width?: number;
  height?: number;
  differenceThreshold?: number;
  minEnergyThreshold?: number;
  maxSpreadThreshold?: number;
}

/**
 * Attaches a background frame-differencing analyzer to a live MediaStream.
 * Samples video frames at ~120ms intervals on an offscreen 160x90 canvas to extract
 * real optical centroids of user typing, mouse movement, and button clicks on any
 * shared window or desktop screen (including third-party apps outside the browser DOM).
 */
export function createLiveStreamMotionTracker(
  stream: MediaStream,
  callbacks: {
    onPoint?: (point: { x: number; y: number; timestampMs: number }) => void;
    onInteraction?: (interaction: InteractionEvent) => void;
  },
  options: OpticalStreamTrackerOptions = {},
): () => void {
  if (typeof document === "undefined" || !stream || stream.getVideoTracks().length === 0) {
    return () => {};
  }

  const sampleIntervalMs = options.sampleIntervalMs ?? 120;
  const width = options.width ?? 160;
  const height = options.height ?? 90;
  const threshold = options.differenceThreshold ?? 16;
  const minEnergy = options.minEnergyThreshold ?? 70;
  const maxSpread = options.maxSpreadThreshold ?? 0.12;

  const video = document.createElement("video");
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.srcObject = stream;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let timer: ReturnType<typeof setInterval> | null = null;
  let prevLuma: Uint8ClampedArray | null = null;
  let isRunning = true;
  let lastTypingTime = 0;
  let activeTypingId: string | null = null;

  const startTracking = () => {
    if (!isRunning || timer) return;

    timer = setInterval(() => {
      if (!ctx || video.readyState < 2) return;

      try {
        ctx.drawImage(video, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, width, height);
        const currLuma = extractLuminanceBuffer(imageData.data, width, height);

        if (!prevLuma) {
          prevLuma = currLuma;
          return;
        }

        const diff = analyzeFrameDifference(prevLuma, currLuma, width, height, threshold);
        prevLuma = currLuma;

        if (diff.motionEnergy >= minEnergy) {
          const centroid = calculateOpticalCentroid(diff.diffMap, width, height);
          const now = Date.now();

          // Report moving cursor / activity point
          if (callbacks.onPoint) {
            callbacks.onPoint({
              x: centroid.x,
              y: centroid.y,
              timestampMs: now,
            });
          }

          const kind = classifyFrameActivity(diff.motionEnergy, centroid.spread, minEnergy, maxSpread);

          if (callbacks.onInteraction && kind === "click") {
            const isTypingSequence = now - lastTypingTime < 1800;
            lastTypingTime = now;

            if (isTypingSequence && activeTypingId) {
              callbacks.onInteraction({
                id: activeTypingId,
                type: "typing",
                timestampMs: now,
                x: centroid.x,
                y: centroid.y,
                snippet: "Form Input",
              });
            } else {
              activeTypingId = `type-opt-${now}`;
              callbacks.onInteraction({
                id: `click-opt-${now}`,
                type: "click",
                timestampMs: now,
                x: centroid.x,
                y: centroid.y,
                button: "left",
              });
            }
          }
        }
      } catch {
        // Ignore canvas read errors during track transitions
      }
    }, sampleIntervalMs);
  };

  video.onloadeddata = () => {
    void video.play().then(startTracking).catch(() => {});
  };

  return () => {
    isRunning = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    video.srcObject = null;
    video.remove();
    canvas.remove();
  };
}

/**
 * Scans a loaded HTML5 video element across timestamps to detect real optical
 * activity events (clicks, typing, and pointer trajectory).
 */
export async function scanVideoElementForActivity(
  video: HTMLVideoElement,
  options: OpticalAnalysisOptions & {
    sampleStepMs?: number;
    maxDurationMs?: number;
    canvasWidth?: number;
    canvasHeight?: number;
  } = {},
): Promise<{
  interactions: InteractionEvent[];
  clicks: ClickEvent[];
  cursorTrajectory: CursorTrajectoryPoint[];
}> {
  if (typeof document === "undefined" || !video) {
    return { interactions: [], clicks: [], cursorTrajectory: [] };
  }

  const durationSec = video.duration;
  if (!durationSec || isNaN(durationSec) || durationSec <= 0) {
    return { interactions: [], clicks: [], cursorTrajectory: [] };
  }

  const maxDurationMs = options.maxDurationMs ?? Math.round(durationSec * 1000);
  const sampleStepMs = options.sampleStepMs ?? 160;
  const canvasWidth = options.canvasWidth ?? 160;
  const canvasHeight = options.canvasHeight ?? 90;

  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return { interactions: [], clicks: [], cursorTrajectory: [] };
  }

  const frames: Array<{
    timestampMs: number;
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }> = [];

  const originalTime = video.currentTime;
  const totalSamples = Math.min(100, Math.floor(maxDurationMs / sampleStepMs));

  try {
    for (let i = 0; i < totalSamples; i++) {
      const timeMs = i * sampleStepMs;
      const targetSec = timeMs / 1000;

      await new Promise<void>((resolve) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };
        video.addEventListener("seeked", onSeeked, { once: true });
        video.currentTime = targetSec;
      });

      ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
      const img = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      frames.push({
        timestampMs: timeMs,
        data: img.data,
        width: canvasWidth,
        height: canvasHeight,
      });
    }
  } finally {
    video.currentTime = originalTime;
    canvas.remove();
  }

  return detectActivityEventsFromFrames(frames, canvasWidth, canvasHeight, options);
}
