import type {
  ClickEvent,
  CursorTrajectoryPoint,
  InteractionEvent,
  TextMotionPreset,
  TextOverlay,
} from "./project";

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

  let prevCentroid: { x: number; y: number; timeMs: number } | null = null;

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

      // Check whether cursor is actively translating across the screen:
      // When a user steers the mouse across the display, displacement between consecutive sample frames
      // is large (> 0.035 normalized distance) in rapid succession (< 400ms).
      // A translating cursor in flight represents trajectory motion, NOT a click or keyframe trigger!
      const displacement = prevCentroid
        ? Math.hypot(centroid.x - prevCentroid.x, centroid.y - prevCentroid.y)
        : 0;
      const dtSincePrev = prevCentroid ? f.timestampMs - prevCentroid.timeMs : 9999;
      const isCursorInFlight = prevCentroid !== null && dtSincePrev < 300 && displacement > 0.08;


      if (kind === "click" && !isCursorInFlight) {
        const clickId = `click-opt-${f.timestampMs}`;
        const clickEvt: ClickEvent = {
          id: clickId,
          timestampMs: f.timestampMs,
          x: centroid.x,
          y: centroid.y,
          button: "left",
        };

        // Determine if this frame is a continuous typing character keystroke:
        // Typing requires rapid successive strokes (<= 450ms) within a tiny, localized character box
        // (dy < 0.025 and dx < 0.08).
        // Clicks on tabs/buttons (which are typically separated by >= 0.10 horizontal distance
        // or >= 400ms time) are NEVER converted to typing.
        const isTypingStroke =
          Boolean(activeTypingCluster) &&
          f.timestampMs - activeTypingCluster!.endTimeMs <= 450 &&
          Math.abs(centroid.y - activeTypingCluster!.centerY) < 0.025 &&
          Math.abs(centroid.x - activeTypingCluster!.centerX) < 0.08;

        if (isTypingStroke) {
          activeTypingCluster!.endTimeMs = f.timestampMs;
          activeTypingCluster!.sampleCount++;
        } else {
          // Finalize previous typing cluster if one existed with at least 3 keystroke samples
          if (activeTypingCluster && activeTypingCluster.sampleCount >= 3) {
            const typingId = `type-opt-${activeTypingCluster.startTimeMs}`;
            const dur = Math.max(0, activeTypingCluster.endTimeMs - activeTypingCluster.startTimeMs);
            interactions.push({
              id: typingId,
              type: "typing",
              timestampMs: activeTypingCluster.startTimeMs,
              x: activeTypingCluster.centerX,
              y: activeTypingCluster.centerY,
              snippet: undefined,
              durationMs: dur,
            });
          }
          activeTypingCluster = null;

          // Deduplicate optical flutter and enforce refractory cooldown:
          // 1. Refractory period: at least 650ms for distinct positions (> 0.08 distance), 1200ms for same location
          // 2. Spatial deduplication: ignore clicks within 0.04 distance if under 1200ms
          const lastClick = clicks[clicks.length - 1];
          const timeSinceLastClick = lastClick ? f.timestampMs - lastClick.timestampMs : 99999;
          const distFromLastClick = lastClick
            ? Math.hypot(centroid.x - lastClick.x, centroid.y - lastClick.y)
            : 99999;

          const isRefractoryViolation = distFromLastClick > 0.08
            ? timeSinceLastClick < 650
            : timeSinceLastClick < 1200;
          const isDuplicateLocation = timeSinceLastClick < 1200 && distFromLastClick < 0.04;

          if (!isRefractoryViolation && !isDuplicateLocation) {
            clicks.push(clickEvt);
            interactions.push({
              id: clickId,
              type: "click",
              timestampMs: f.timestampMs,
              x: centroid.x,
              y: centroid.y,
              button: "left",
            });

            // Start candidate cluster in case rapid character typing follows in this exact spot
            activeTypingCluster = {
              startTimeMs: f.timestampMs,
              endTimeMs: f.timestampMs,
              centerX: centroid.x,
              centerY: centroid.y,
              sampleCount: 1,
            };
          }
        }
      }

      if (centroid.spread <= maxSpread) prevCentroid = {
        x: centroid.x,
        y: centroid.y,
        timeMs: f.timestampMs,
      };
    }

    prevLuma = currLuma;
  }

  // Finalize any trailing typing cluster
  if (activeTypingCluster && activeTypingCluster.sampleCount >= 3) {
    const typingId = `type-opt-${activeTypingCluster.startTimeMs}`;
    const dur = Math.max(0, activeTypingCluster.endTimeMs - activeTypingCluster.startTimeMs);
    interactions.push({
      id: typingId,
      type: "typing",
      timestampMs: activeTypingCluster.startTimeMs,
      x: activeTypingCluster.centerX,
      y: activeTypingCluster.centerY,
      snippet: undefined,
      durationMs: dur,
    });
  }

  return { interactions, clicks, cursorTrajectory: trajectory };
}

/* ========================================================================== */
/* Kinetic Text Motion Evaluator Engine & Analytical Easing Primitives         */
/* ========================================================================== */

export interface EvaluatedTextMotion {
  opacity: number;
  scale: number;
  translateX: number;
  translateY: number;
  blur: number;
}

/**
 * Damped harmonic spring curve with ~11.7% overshoot.
 * Closed-form analytical equation: f(t) = 1 - exp(-6t) * cos(2.5 * PI * t)
 * Properties:
 * - f(0) = 0
 * - Peak overshoot: t ≈ 0.35, f(t) ≈ 1.117
 * - Settle: f(1) = 1.0
 */
export function springDamped(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.exp(-6 * t) * Math.cos(2.5 * Math.PI * t);
}

/**
 * Standard cubic ease-out curve: f(t) = 1 - (1 - t)^3.
 * Properties: f(0) = 0, f(0.5) = 0.875, f(1) = 1.
 */
export function cubicEaseOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const inv = 1 - t;
  return 1 - inv * inv * inv;
}

/**
 * Aggressive quartic ease-out curve: f(t) = 1 - (1 - t)^4.
 * High initial velocity for snappy whip-pan motions.
 */
export function quarticEaseOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const inv = 1 - t;
  return 1 - inv * inv * inv * inv;
}

/**
 * Hermite smoothstep curve: f(t) = t^2 * (3 - 2t).
 * Zero first-derivatives at both t = 0 and t = 1.
 */
export function smoothstep(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return t * t * (3 - 2 * t);
}

/**
 * Quadratic blur ramp function: blur = maxBlur * (1 - p)^2.
 */
export function gaussianBlurRamp(progress: number, maxBlur = 18): number {
  const p = Math.max(0, Math.min(1, progress));
  return maxBlur * (1 - p) * (1 - p);
}

/**
 * Resolves the active motion preset for a text overlay, checking direct preset first,
 * then falling back to typography animation settings or defaulting to "smooth-fade".
 */
export function resolveOverlayMotionPreset(overlay: TextOverlay): TextMotionPreset {
  if (overlay.motionPreset) {
    return overlay.motionPreset;
  }
  const anim = overlay.typography?.animation;
  if (anim === "elastic-pop" || anim === "whip-slide" || anim === "blur-reveal") {
    return anim;
  }
  if (anim === "fade-up") {
    return "fluid-slide";
  }
  return "smooth-fade";
}

/**
 * Mathematical text overlay motion evaluator engine.
 * Computes instantaneous (opacity, scale, translateX, translateY, blur) at any millisecond timestamp.
 * Guarantees mathematical parity between canvas preview and offline video export.
 */
export function evaluateTextOverlayMotion(
  overlay: TextOverlay,
  timeMs: number,
): EvaluatedTextMotion {
  const start = overlay.startTimeMs;
  const dur = overlay.durationMs;
  const end = start + dur;

  // 1. Boundary & invalid input safety
  if (!Number.isFinite(timeMs) || !Number.isFinite(start) || !Number.isFinite(dur) || dur <= 0) {
    return { opacity: 0, scale: 1, translateX: 0, translateY: 0, blur: 0 };
  }

  const preset = resolveOverlayMotionPreset(overlay);

  // 2. Preset "none": hard step bounds
  if (preset === "none") {
    if (timeMs >= start && timeMs <= end) {
      return { opacity: 1, scale: 1, translateX: 0, translateY: 0, blur: 0 };
    }
    return { opacity: 0, scale: 1, translateX: 0, translateY: 0, blur: 0 };
  }

  // Baseline durations per preset
  const baseInMsMap: Record<TextMotionPreset, number> = {
    none: 0,
    "elastic-pop": 450,
    "fluid-slide": 400,
    "whip-slide": 350,
    "blur-reveal": 450,
    "smooth-fade": 350,
  };

  const baseOutMsMap: Record<TextMotionPreset, number> = {
    none: 0,
    "elastic-pop": 280,
    "fluid-slide": 300,
    "whip-slide": 260,
    "blur-reveal": 320,
    "smooth-fade": 300,
  };

  const reqIn = overlay.entranceDurationMs ?? baseInMsMap[preset];
  const reqOut = overlay.exitDurationMs ?? baseOutMsMap[preset];

  // Anti-collision proportional clamping for short overlay durations
  const din = Math.min(reqIn, dur * 0.45);
  const dout = Math.min(reqOut, dur * 0.35);

  // 3. Pre-start phase (t < start)
  if (timeMs < start) {
    switch (preset) {
      case "elastic-pop":
        return { opacity: 0, scale: 0.5, translateX: 0, translateY: 16, blur: 0 };
      case "fluid-slide":
        return { opacity: 0, scale: 1, translateX: 0, translateY: 32, blur: 0 };
      case "whip-slide":
        return { opacity: 0, scale: 1, translateX: -80, translateY: 0, blur: 10 };
      case "blur-reveal":
        return { opacity: 0, scale: 0.92, translateX: 0, translateY: 0, blur: 18 };
      case "smooth-fade":
      default:
        return { opacity: 0, scale: 1, translateX: 0, translateY: 0, blur: 0 };
    }
  }

  // 4. Entrance phase (start <= t < start + din)
  if (din > 0 && timeMs < start + din) {
    const p = Math.max(0, Math.min(1, (timeMs - start) / din));

    switch (preset) {
      case "elastic-pop": {
        const s = springDamped(p);
        return {
          opacity: Math.min(1, p / 0.25),
          scale: 0.5 + 0.5 * s,
          translateX: 0,
          translateY: 16 * Math.pow(1 - p, 3),
          blur: 0,
        };
      }
      case "fluid-slide": {
        const e = cubicEaseOut(p);
        return {
          opacity: e,
          scale: 1,
          translateX: 0,
          translateY: 32 * (1 - e),
          blur: 0,
        };
      }
      case "whip-slide": {
        const w = quarticEaseOut(p);
        return {
          opacity: Math.min(1, p / 0.20),
          scale: 1,
          translateX: -80 * (1 - w),
          translateY: 0,
          blur: 10 * (1 - w),
        };
      }
      case "blur-reveal": {
        const s = smoothstep(p);
        return {
          opacity: s,
          scale: 0.92 + 0.08 * s,
          translateX: 0,
          translateY: 0,
          blur: gaussianBlurRamp(p, 18),
        };
      }
      case "smooth-fade":
      default: {
        const s = smoothstep(p);
        return {
          opacity: s,
          scale: 1,
          translateX: 0,
          translateY: 0,
          blur: 0,
        };
      }
    }
  }

  // 5. Sustain / Hold phase (start + din <= t <= end - dout)
  if (timeMs <= end - dout) {
    return {
      opacity: 1,
      scale: 1,
      translateX: 0,
      translateY: 0,
      blur: 0,
    };
  }

  // 6. Exit phase (end - dout < t <= end)
  if (dout > 0 && timeMs <= end) {
    const exitStart = end - dout;
    const q = Math.max(0, Math.min(1, (timeMs - exitStart) / dout));

    switch (preset) {
      case "elastic-pop": {
        return {
          opacity: Math.max(0, 1 - q),
          scale: 1 - 0.2 * q,
          translateX: 0,
          translateY: 8 * q,
          blur: 0,
        };
      }
      case "fluid-slide": {
        return {
          opacity: Math.max(0, 1 - q),
          scale: 1,
          translateX: 0,
          translateY: -20 * q * q,
          blur: 0,
        };
      }
      case "whip-slide": {
        return {
          opacity: Math.max(0, 1 - q),
          scale: 1,
          translateX: 80 * Math.pow(q, 3),
          translateY: 0,
          blur: 10 * q * q,
        };
      }
      case "blur-reveal": {
        return {
          opacity: Math.max(0, 1 - q),
          scale: 1 + 0.05 * q,
          translateX: 0,
          translateY: 0,
          blur: 14 * q * q,
        };
      }
      case "smooth-fade":
      default: {
        const s = smoothstep(q);
        return {
          opacity: Math.max(0, 1 - s),
          scale: 1,
          translateX: 0,
          translateY: 0,
          blur: 0,
        };
      }
    }
  }

  // 7. Post-end phase (t > end)
  return {
    opacity: 0,
    scale: 1,
    translateX: 0,
    translateY: 0,
    blur: 0,
  };
}
