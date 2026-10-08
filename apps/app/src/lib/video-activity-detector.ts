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

  const sampleIntervalMs = options.sampleIntervalMs ?? 60;
  const width = options.width ?? 160;
  const height = options.height ?? 90;
  const threshold = options.differenceThreshold ?? 12;
  const minEnergy = options.minEnergyThreshold ?? 20;
  const maxSpread = options.maxSpreadThreshold ?? 0.16;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return () => {};

  let isRunning = true;
  let prevLuma: Uint8ClampedArray | null = null;
  let prevCentroid: { x: number; y: number; timeMs: number } | null = null;
  let dwellStartTime = 0;
  let isMoving = false;
  let activeTypingBurst: {
    id: string;
    startTime: number;
    lastTime: number;
    x: number;
    y: number;
    count: number;
  } | null = null;

  const handleFrameLuma = (currLuma: Uint8ClampedArray, timestampMs: number) => {
    if (!prevLuma) {
      prevLuma = currLuma;
      return;
    }

    const diff = analyzeFrameDifference(prevLuma, currLuma, width, height, threshold);
    prevLuma = currLuma;

    if (diff.motionEnergy >= minEnergy) {
      const centroid = calculateOpticalCentroid(diff.diffMap, width, height);

      // Report moving cursor / activity point only for localized motion.
      if (callbacks.onPoint && centroid.spread <= maxSpread) {
        callbacks.onPoint({
          x: centroid.x,
          y: centroid.y,
          timestampMs,
        });
      }

      // Track cursor velocity: only fast, long translations count as "in flight".
      const displacement = prevCentroid
        ? Math.hypot(centroid.x - prevCentroid.x, centroid.y - prevCentroid.y)
        : 0;
      const dt = prevCentroid ? timestampMs - prevCentroid.timeMs : 9999;
      isMoving = displacement > 0.08 && dt < 300;
      dwellStartTime = isMoving ? timestampMs : dwellStartTime;

      const kind = classifyFrameActivity(diff.motionEnergy, centroid.spread, minEnergy, maxSpread);

      if (centroid.spread <= maxSpread) {
        prevCentroid = { x: centroid.x, y: centroid.y, timeMs: timestampMs };
      }

      if (callbacks.onInteraction && kind === "click" && !isMoving) {
        const isLocalized = centroid.spread <= maxSpread * 1.35;

        if (isLocalized) {
          // Check if this is rapid typing keystrokes in the exact same small spot (dx < 0.08, dy < 0.03, dt <= 450ms)
          const isTypingKeystroke =
            Boolean(activeTypingBurst) &&
            timestampMs - activeTypingBurst!.lastTime <= 450 &&
            Math.abs(centroid.y - activeTypingBurst!.y) <= 0.03 &&
            Math.abs(centroid.x - activeTypingBurst!.x) <= 0.08;

          if (isTypingKeystroke) {
            activeTypingBurst!.lastTime = timestampMs;
            activeTypingBurst!.count++;
            if (activeTypingBurst!.count >= 3) {
              callbacks.onInteraction({
                id: activeTypingBurst!.id,
                type: "typing",
                timestampMs: activeTypingBurst!.startTime,
                x: activeTypingBurst!.x,
                y: activeTypingBurst!.y,
                snippet: undefined,
                durationMs: activeTypingBurst!.lastTime - activeTypingBurst!.startTime,
              });
            }
          } else {
            activeTypingBurst = null;
          }
        } else {
          activeTypingBurst = null;
        }
      }
    }
  };

  const videoTrack = stream.getVideoTracks()[0];
  let cleanupTrackProcessor: (() => void) | null = null;
  let useFallback = true;

  // 1. Primary engine: WebCodecs MediaStreamTrackProcessor (unaffected by background tab throttling in Chrome)
  const globalAny = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : {};
  if (videoTrack && typeof globalAny.MediaStreamTrackProcessor !== "undefined") {
    try {
      const ProcessorClass = globalAny.MediaStreamTrackProcessor as new (init: { track: MediaStreamTrack }) => {
        readable: ReadableStream<{ close: () => void }>;
      };
      const processor = new ProcessorClass({ track: videoTrack });
      const reader = processor.readable.getReader();
      useFallback = false;

      let lastSampleMs = 0;

      const readLoop = async () => {
        while (isRunning) {
          try {
            const { value: frame, done } = await reader.read();
            if (done || !frame) break;
            if (!isRunning) {
              frame.close();
              break;
            }
            const now = Date.now();
            if (now - lastSampleMs >= sampleIntervalMs) {
              lastSampleMs = now;
              ctx.drawImage(frame as unknown as CanvasImageSource, 0, 0, width, height);
              const img = ctx.getImageData(0, 0, width, height);
              handleFrameLuma(extractLuminanceBuffer(img.data, width, height), now);
            }
            frame.close();
          } catch {
            break;
          }
        }
      };

      void readLoop();

      cleanupTrackProcessor = () => {
        void reader.cancel().catch(() => {});
      };
    } catch {
      useFallback = true;
    }
  }

  // 2. Fallback engine: Video element with unthrottled Web Worker ticker
  let videoEl: HTMLVideoElement | null = null;
  let worker: Worker | null = null;
  let fallbackTimer: ReturnType<typeof setInterval> | null = null;

  if (useFallback) {
    videoEl = document.createElement("video");
    videoEl.muted = true;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.style.cssText =
      "position:fixed;bottom:0;right:0;width:4px;height:4px;opacity:0.05;pointer-events:none;z-index:999999;";
    document.body.appendChild(videoEl);
    videoEl.srcObject = stream;
    void videoEl.play().catch(() => {});

    const processVideoFrame = () => {
      if (!isRunning || !ctx || !videoEl || (videoEl.readyState < 1 && videoEl.videoWidth === 0)) return;
      try {
        ctx.drawImage(videoEl, 0, 0, width, height);
        const img = ctx.getImageData(0, 0, width, height);
        handleFrameLuma(extractLuminanceBuffer(img.data, width, height), Date.now());
      } catch {
        // ignore
      }
    };

    try {
      const blob = new Blob([
        `let t; self.onmessage = e => { if (e.data === 'start') { t = setInterval(() => self.postMessage('t'), ${sampleIntervalMs}); } else { clearInterval(t); } };`,
      ], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);
      worker.onmessage = () => processVideoFrame();
      worker.postMessage("start");
    } catch {
      fallbackTimer = setInterval(processVideoFrame, sampleIntervalMs);
    }
  }

  return () => {
    isRunning = false;
    cleanupTrackProcessor?.();
    if (worker) {
      worker.postMessage("stop");
      worker.terminate();
      worker = null;
    }
    if (fallbackTimer) {
      clearInterval(fallbackTimer);
      fallbackTimer = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
      if (videoEl.parentNode) {
        videoEl.parentNode.removeChild(videoEl);
      }
      videoEl = null;
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
  const isInvalidDuration = !durationSec || isNaN(durationSec) || !Number.isFinite(durationSec) || durationSec <= 0;
  const maxDurationMs = options.maxDurationMs ?? (isInvalidDuration ? 15000 : Math.round(durationSec * 1000));
  const sampleStepMs = options.sampleStepMs ?? 200;
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

  // Method 1: High-Speed Video Playback Extraction (decodes unindexed MediaRecorder WebM blobs in Chromium sequentially)
  let playbackSuccess = false;
  if (typeof video.play === "function") {
    try {
      video.playbackRate = 8.0;
      video.muted = true;
      video.currentTime = 0;
      await video.play();

      let lastSampleMs = -sampleStepMs;
      const targetMaxMs = maxDurationMs;

      await new Promise<void>((resolve) => {
        let isDone = false;
        const finish = () => {
          if (isDone) return;
          isDone = true;
          try {
            video.pause();
          } catch {
            // ignore
          }
          resolve();
        };

        const maxWaitMs = Math.max(3000, Math.round(targetMaxMs / 6) + 1500);
        const timeoutId = setTimeout(finish, maxWaitMs);

        const checkFrame = () => {
          if (isDone) return;
          const currentMs = Math.round(video.currentTime * 1000);
          if (video.ended || currentMs >= targetMaxMs) {
            clearTimeout(timeoutId);
            finish();
            return;
          }

          if (currentMs - lastSampleMs >= sampleStepMs) {
            lastSampleMs = currentMs;
            ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
            const img = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
            frames.push({
              timestampMs: currentMs,
              data: img.data,
              width: canvasWidth,
              height: canvasHeight,
            });
          }

          if ("requestVideoFrameCallback" in video) {
            (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: unknown) => number }).requestVideoFrameCallback(checkFrame);
          } else {
            requestAnimationFrame(checkFrame);
          }
        };

        if ("requestVideoFrameCallback" in video) {
          (video as HTMLVideoElement & { requestVideoFrameCallback: (cb: unknown) => number }).requestVideoFrameCallback(checkFrame);
        } else {
          requestAnimationFrame(checkFrame);
        }

        video.addEventListener("ended", finish, { once: true });
        video.addEventListener("error", finish, { once: true });
      });

      if (frames.length >= 2) {
        playbackSuccess = true;
      }
    } catch {
      playbackSuccess = false;
    }
  }

  // Method 2: Seek-based extraction fallback (for indexed MP4 or video files with seek tables)
  if (!playbackSuccess || frames.length < 2) {
    frames.length = 0;
    const totalSamples = Math.min(150, Math.floor(maxDurationMs / sampleStepMs));
    const originalTime = video.currentTime;

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
    }
  }

  canvas.remove();

  return detectActivityEventsFromFrames(frames, canvasWidth, canvasHeight, {
    differenceThreshold: 12,
    minEnergyThreshold: 20,
    maxSpreadThreshold: 0.16,
    ...options,
  });
}
