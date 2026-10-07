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

  const sampleIntervalMs = options.sampleIntervalMs ?? 75;
  const width = options.width ?? 160;
  const height = options.height ?? 90;
  const threshold = options.differenceThreshold ?? 12;
  const minEnergy = options.minEnergyThreshold ?? 20;
  const maxSpread = options.maxSpreadThreshold ?? 0.16;

  const video = document.createElement("video");
  video.muted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.style.cssText =
    "position:fixed;bottom:0;right:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:999999;";
  document.body.appendChild(video);
  video.srcObject = stream;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let timer: ReturnType<typeof setInterval> | null = null;
  let prevLuma: Uint8ClampedArray | null = null;
  let isRunning = true;
  let lastInteractionTime = 0;
  let activeTypingBurst: {
    id: string;
    startTime: number;
    lastTime: number;
    x: number;
    y: number;
    count: number;
  } | null = null;

  const processFrame = () => {
    if (!isRunning || !ctx || (video.readyState < 1 && video.videoWidth === 0)) return;

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

        // Report moving cursor / activity point only for localized motion.
        // Page-wide changes (scrolling, animated backgrounds, tab switches) produce a
        // centroid that has no relation to where the user is pointing.
        if (callbacks.onPoint && centroid.spread <= maxSpread) {
          callbacks.onPoint({
            x: centroid.x,
            y: centroid.y,
            timestampMs: now,
          });
        }

        const kind = classifyFrameActivity(diff.motionEnergy, centroid.spread, minEnergy, maxSpread);

        if (callbacks.onInteraction) {
          const isLocalized = centroid.spread <= maxSpread * 1.25;

          if (isLocalized) {
            if (
              activeTypingBurst &&
              now - activeTypingBurst.lastTime <= 1500 &&
              Math.hypot(centroid.x - activeTypingBurst.x, centroid.y - activeTypingBurst.y) <= 0.12
            ) {
              activeTypingBurst.lastTime = now;
              activeTypingBurst.count++;
              callbacks.onInteraction({
                id: activeTypingBurst.id,
                type: "typing",
                timestampMs: activeTypingBurst.startTime,
                x: activeTypingBurst.x,
                y: activeTypingBurst.y,
                snippet: "Text Input",
                durationMs: activeTypingBurst.lastTime - activeTypingBurst.startTime,
              });
            } else {
              if (now - lastInteractionTime >= 700) {
                lastInteractionTime = now;
                const newBurstId = `opt-type-${now}`;
                activeTypingBurst = {
                  id: newBurstId,
                  startTime: now,
                  lastTime: now,
                  x: centroid.x,
                  y: centroid.y,
                  count: 1,
                };
                if (kind === "click" && diff.motionEnergy >= minEnergy * 1.8) {
                  callbacks.onInteraction({
                    id: `opt-act-${now}`,
                    type: "click",
                    timestampMs: now,
                    x: centroid.x,
                    y: centroid.y,
                    button: "left",
                  });
                }
              }
            }
          } else {
            activeTypingBurst = null;
          }
        }
      }
    } catch {
      // Ignore canvas read errors during track transitions
    }
  };

  const startTracking = () => {
    if (!isRunning || timer) return;

    // In browsers, requestVideoFrameCallback is paused when the tab is hidden / in background.
    // An interval ensures continuous processing of the incoming MediaStream so interaction
    // coordinates and cursor trajectory continue tracking accurately even when recording another window or app.
    timer = setInterval(processFrame, sampleIntervalMs);
  };

  void video.play().then(startTracking).catch(startTracking);

  return () => {
    isRunning = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    video.srcObject = null;
    if (video.parentNode) {
      video.parentNode.removeChild(video);
    }
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
  const sampleStepMs = options.sampleStepMs ?? 250;
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
  const totalSamples = Math.min(150, Math.floor(maxDurationMs / sampleStepMs));

  try {
    for (let i = 0; i < totalSamples; i++) {
      const timeMs = i * sampleStepMs;
      const targetSec = timeMs / 1000;

      await new Promise<void>((resolve) => {
        let finished = false;
        const cleanup = () => {
          if (finished) return;
          finished = true;
          video.removeEventListener("seeked", onSeeked);
          clearTimeout(timeoutId);
          resolve();
        };
        const onSeeked = () => cleanup();
        const timeoutId = setTimeout(cleanup, 120);
        video.addEventListener("seeked", onSeeked, { once: true });
        try {
          video.currentTime = targetSec;
        } catch {
          cleanup();
        }
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
    try {
      video.currentTime = originalTime;
    } catch {
      // ignore
    }
    canvas.remove();
  }

  return detectActivityEventsFromFrames(frames, canvasWidth, canvasHeight, {
    differenceThreshold: 12,
    minEnergyThreshold: 20,
    maxSpreadThreshold: 0.16,
    ...options,
  });
}
