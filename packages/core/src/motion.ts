import type { ClickEvent, CursorTrajectoryPoint, InteractionEvent } from "./project";

export interface OpticalMotionFrame {
  timestampMs: number;
  width: number;
  height: number;
  /** RGBA pixel buffer (length = w * h * 4) or 8-bit luminance buffer (length = w * h) */
  data: Uint8ClampedArray | number[];
}

export interface FrameDifferenceResult {
  /** Map of absolute difference values per pixel (length = width * height) */
  diffMap: Uint8ClampedArray;
  /** Total motion energy score across all active pixels */
  motionEnergy: number;
  /** Count of pixels exceeding the noise threshold */
  activePixels: number;
}

export interface OpticalCentroidResult {
  /** Normalized centroid X (0.0 to 1.0) */
  x: number;
  /** Normalized centroid Y (0.0 to 1.0) */
  y: number;
  /** Normalized spatial spread / radius (standard deviation) */
  spread: number;
  /** Motion energy score */
  motionEnergy: number;
}

export type DetectedActivityKind = "click" | "typing" | "navigation" | "idle";

export interface OpticalAnalysisOptions {
  /** Pixel difference threshold (0 to 255). Default 18. */
  differenceThreshold?: number;
  /** Minimum motion energy to classify as active interaction. Default 80. */
  minEnergyThreshold?: number;
  /** Maximum spread radius to classify as localized interaction. Default 0.12. */
  maxSpreadThreshold?: number;
  /** Typing temporal cluster window in ms. Default 2000. */
  typingWindowMs?: number;
}

/**
 * Converts an RGBA or grayscale buffer into an 8-bit luminance byte array.
 * Analytical Rec. 601 luma weights: Y = 0.299*R + 0.587*G + 0.114*B.
 */
export function extractLuminanceBuffer(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
): Uint8ClampedArray {
  const pixelCount = width * height;
  const luma = new Uint8ClampedArray(pixelCount);

  if (data.length >= pixelCount * 4) {
    // RGBA input
    for (let i = 0; i < pixelCount; i++) {
      const offset = i * 4;
      const r = data[offset]!;
      const g = data[offset + 1]!;
      const b = data[offset + 2]!;
      luma[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
  } else {
    // Grayscale input
    for (let i = 0; i < pixelCount; i++) {
      luma[i] = data[i] ?? 0;
    }
  }

  return luma;
}

/**
 * Calculates pixel-by-pixel temporal difference between two consecutive frames.
 */
export function analyzeFrameDifference(
  prevLuma: Uint8ClampedArray | number[],
  currLuma: Uint8ClampedArray | number[],
  width: number,
  height: number,
  threshold = 18,
): FrameDifferenceResult {
  const pixelCount = width * height;
  const diffMap = new Uint8ClampedArray(pixelCount);
  let motionEnergy = 0;
  let activePixels = 0;

  for (let i = 0; i < pixelCount; i++) {
    const p = prevLuma[i] ?? 0;
    const c = currLuma[i] ?? 0;
    const delta = Math.abs(c - p);

    if (delta >= threshold) {
      diffMap[i] = delta;
      motionEnergy += delta;
      activePixels++;
    }
  }

  return { diffMap, motionEnergy, activePixels };
}

/**
 * Calculates the normalized centroid (center of mass) and spatial spread of optical motion.
 */
export function calculateOpticalCentroid(
  diffMap: Uint8ClampedArray | number[],
  width: number,
  height: number,
): OpticalCentroidResult {
  if (width <= 0 || height <= 0) {
    return { x: 0.5, y: 0.5, spread: 0, motionEnergy: 0 };
  }

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const weight = diffMap[rowOffset + x] ?? 0;
      if (weight > 0) {
        totalWeight += weight;
        weightedX += x * weight;
        weightedY += y * weight;
      }
    }
  }

  if (totalWeight === 0) {
    return { x: 0.5, y: 0.5, spread: 0, motionEnergy: 0 };
  }

  const normX = weightedX / (totalWeight * width);
  const normY = weightedY / (totalWeight * height);

  // Calculate spatial standard deviation (spread)
  let varianceSum = 0;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    const dy = y / height - normY;
    for (let x = 0; x < width; x++) {
      const weight = diffMap[rowOffset + x] ?? 0;
      if (weight > 0) {
        const dx = x / width - normX;
        varianceSum += (dx * dx + dy * dy) * weight;
      }
    }
  }

  const spread = Math.sqrt(varianceSum / totalWeight);

  return {
    x: Math.min(1.0, Math.max(0.0, normX)),
    y: Math.min(1.0, Math.max(0.0, normY)),
    spread,
    motionEnergy: totalWeight,
  };
}

/**
 * Locates the optical cursor pointer centroid / tip candidate within an active region.
 */
export function detectOpticalCursorCandidate(
  _frameLuma: Uint8ClampedArray | number[],
  diffMap: Uint8ClampedArray | number[],
  width: number,
  height: number,
  prevCentroid?: { x: number; y: number },
): { x: number; y: number; confidence: number } {
  const centroid = calculateOpticalCentroid(diffMap, width, height);
  if (centroid.motionEnergy === 0) {
    return {
      x: prevCentroid ? prevCentroid.x : 0.5,
      y: prevCentroid ? prevCentroid.y : 0.5,
      confidence: 0,
    };
  }

  // If motion is tightly localized (small spread), the centroid is an excellent cursor candidate
  const isCompact = centroid.spread <= 0.08;
  const confidence = isCompact ? 0.9 : Math.max(0.2, 1.0 - centroid.spread * 4);

  return {
    x: centroid.x,
    y: centroid.y,
    confidence,
  };
}

/**
 * Classifies frame activity kind based on motion energy, spatial spread, and temporal duration.
 */
export function classifyFrameActivity(
  motionEnergy: number,
  spread: number,
  minEnergy = 80,
  maxSpread = 0.26,
): DetectedActivityKind {
  if (motionEnergy < minEnergy) {
    return "idle";
  }
  if (spread > 0.32) {
    return "navigation";
  }
  if (spread <= maxSpread) {
    // Localized activity (button click, text link, paragraph click, or typing)
    return "click";
  }
  return "navigation";
}

/**
 * Processes a sequence of video frames to extract optical cursor trajectory
 * and synthesize interaction events (clicks and typing).
 */
export function detectActivityEventsFromFrames(
  frames: Array<{
    timestampMs: number;
    data: Uint8ClampedArray | number[];
    width?: number;
    height?: number;
  }>,
  defaultWidth = 320,
  defaultHeight = 180,
  options: OpticalAnalysisOptions = {},
): {
  interactions: InteractionEvent[];
  clicks: ClickEvent[];
  cursorTrajectory: CursorTrajectoryPoint[];
} {
  if (frames.length < 2) {
    return { interactions: [], clicks: [], cursorTrajectory: [] };
  }

  const threshold = options.differenceThreshold ?? 18;
  const minEnergy = options.minEnergyThreshold ?? 80;
  const maxSpread = options.maxSpreadThreshold ?? 0.12;
  const sorted = [...frames].sort((a, b) => a.timestampMs - b.timestampMs);

  const trajectory: CursorTrajectoryPoint[] = [];
  const interactions: InteractionEvent[] = [];
  const clicks: ClickEvent[] = [];

  let prevLuma = extractLuminanceBuffer(
    sorted[0]!.data,
    sorted[0]!.width ?? defaultWidth,
    sorted[0]!.height ?? defaultHeight,
  );

  let activeTypingCluster: {
    startTimeMs: number;
    endTimeMs: number;
    centerX: number;
    centerY: number;
    sampleCount: number;
  } | null = null;

  for (let i = 1; i < sorted.length; i++) {
    const f = sorted[i]!;
    const w = f.width ?? defaultWidth;
    const h = f.height ?? defaultHeight;
    const currLuma = extractLuminanceBuffer(f.data, w, h);

    const diff = analyzeFrameDifference(prevLuma, currLuma, w, h, threshold);
    const centroid = calculateOpticalCentroid(diff.diffMap, w, h);

    if (diff.motionEnergy >= minEnergy) {
      trajectory.push({
        timestampMs: f.timestampMs,
        x: centroid.x,
        y: centroid.y,
      });

      const kind = classifyFrameActivity(diff.motionEnergy, centroid.spread, minEnergy, maxSpread);

      if (kind === "click") {
        // Check if this is part of sustained typing or an isolated click
        if (activeTypingCluster && f.timestampMs - activeTypingCluster.endTimeMs <= 1200) {
          activeTypingCluster.endTimeMs = f.timestampMs;
          activeTypingCluster.sampleCount++;
        } else {
          // Finalize previous typing cluster if one existed
          if (activeTypingCluster && activeTypingCluster.sampleCount >= 2) {
            const typingId = `type-opt-${activeTypingCluster.startTimeMs}`;
            const dur = Math.max(0, activeTypingCluster.endTimeMs - activeTypingCluster.startTimeMs);
            interactions.push({
              id: typingId,
              type: "typing",
              timestampMs: activeTypingCluster.startTimeMs,
              x: activeTypingCluster.centerX,
              y: activeTypingCluster.centerY,
              snippet: "Activity Target",
              durationMs: dur,
            });
            activeTypingCluster = null;
          }

          // Check if distance to previous interaction is very small (text caret)
          const isNearPrevious =
            interactions.length > 0 &&
            Math.hypot(
              centroid.x - interactions[interactions.length - 1]!.x,
              centroid.y - interactions[interactions.length - 1]!.y,
            ) < 0.08 &&
            f.timestampMs - interactions[interactions.length - 1]!.timestampMs < 1800;

          if (isNearPrevious) {
            activeTypingCluster = {
              startTimeMs: f.timestampMs,
              endTimeMs: f.timestampMs,
              centerX: centroid.x,
              centerY: centroid.y,
              sampleCount: 1,
            };
          } else {
            const clickId = `click-opt-${f.timestampMs}`;
            const clickEvt: ClickEvent = {
              id: clickId,
              timestampMs: f.timestampMs,
              x: centroid.x,
              y: centroid.y,
              button: "left",
            };
            clicks.push(clickEvt);
            interactions.push({
              id: clickId,
              type: "click",
              timestampMs: f.timestampMs,
              x: centroid.x,
              y: centroid.y,
              button: "left",
            });
          }
        }
      }
    }

    prevLuma = currLuma;
  }

  // Finalize any trailing typing cluster
  if (activeTypingCluster && activeTypingCluster.sampleCount >= 2) {
    const typingId = `type-opt-${activeTypingCluster.startTimeMs}`;
    const dur = Math.max(0, activeTypingCluster.endTimeMs - activeTypingCluster.startTimeMs);
    interactions.push({
      id: typingId,
      type: "typing",
      timestampMs: activeTypingCluster.startTimeMs,
      x: activeTypingCluster.centerX,
      y: activeTypingCluster.centerY,
      snippet: "Text Input",
      durationMs: dur,
    });
  }

  return { interactions, clicks, cursorTrajectory: trajectory };
}
