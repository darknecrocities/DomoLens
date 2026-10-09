import type { CameraPhysicsPreset, ClickEvent, ZoomBlock } from "./project";

export interface AutoZoomOptions {
  minScale: number;
  maxScale: number;
  defaultScale: number;
  minDurationMs: number;
  maxDurationMs: number;
  leadInMs: number;
  leadOutMs: number;
  clusterWindowMs: number;
  clusterDistance: number;
}

export const DEFAULT_ZOOM_OPTIONS: AutoZoomOptions = {
  minScale: 1.2,
  maxScale: 2.2,
  defaultScale: 1.8,
  minDurationMs: 1800,
  maxDurationMs: 4500,
  leadInMs: 750,
  leadOutMs: 450,
  clusterWindowMs: 2000,
  clusterDistance: 0.25,
};

export interface CameraState {
  /** Center X (0.0 to 1.0). Default centered at 0.5. */
  x: number;
  /** Center Y (0.0 to 1.0). Default centered at 0.5. */
  y: number;
  /** Zoom scale (1.0 is full frame). */
  scale: number;
  /** Whether the camera is currently zoomed in. */
  isZoomed: boolean;
}

/**
 * Clamps center coordinates so the zoomed viewport frames properly.
 * Guarantees that camera center strictly remains within [halfW, 1 - halfW]
 * so that video textures ALWAYS fill the frame 100% without exposing empty black voids.
 */
export function clampCameraToBounds(
  targetX: number,
  targetY: number,
  scale: number,
  _mode: "strict" | "center" = "strict",
): { x: number; y: number } {
  if (scale <= 1) return { x: 0.5, y: 0.5 };
  const halfW = 0.5 / scale;
  const halfH = 0.5 / scale;

  const minX = halfW;
  const maxX = 1 - halfW;
  const minY = halfH;
  const maxY = 1 - halfH;

  const clampedX = Math.min(Math.max(targetX, minX), maxX);
  const clampedY = Math.min(Math.max(targetY, minY), maxY);

  return { x: clampedX, y: clampedY };
}

/**
 * Generates natural steadicam breathing micro-drift for active holds.
 * Keeps the shot alive and organic (Screen Studio style) instead of mathematically frozen.
 */
export function getSteadicamBreathing(timeMs: number, scale: number): { dx: number; dy: number } {
  if (scale <= 1.05) return { dx: 0, dy: 0 };
  const t = timeMs * 0.001;
  // Multi-harmonic gentle drift (amplitude ~0.0018 normalized, frequency ~0.25Hz)
  const dx = (Math.sin(t * 1.6) * 0.0018 + Math.cos(t * 0.75) * 0.0010) / scale;
  const dy = (Math.cos(t * 1.3) * 0.0015 + Math.sin(t * 0.55) * 0.0008) / scale;
  return { dx, dy };
}

/**
 * Inverts viewport container screen coordinates to normalized video coordinates [0, 1].
 * Reverses the active CSS camera zoom scale and centering translation.
 */
export function screenToVideoCoordinates(
  pixelX: number,
  pixelY: number,
  containerWidth: number,
  containerHeight: number,
  camera: CameraState,
): { x: number; y: number } {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  const u = pixelX / containerWidth;
  const v = pixelY / containerHeight;
  const scale = Math.max(1.0, camera.scale);

  // Invert the CSS transform: scale(S) translate((0.5 - camera.x)*100%, (0.5 - camera.y)*100%)
  const videoX = camera.x + (u - 0.5) / scale;
  const videoY = camera.y + (v - 0.5) / scale;

  return {
    x: Math.min(1.0, Math.max(0.0, videoX)),
    y: Math.min(1.0, Math.max(0.0, videoY)),
  };
}

/**
 * Projects normalized video coordinates [0, 1] to viewport container screen pixel coordinates.
 */
export function videoToScreenCoordinates(
  videoX: number,
  videoY: number,
  containerWidth: number,
  containerHeight: number,
  camera: CameraState,
): { pixelX: number; pixelY: number } {
  const scale = Math.max(1.0, camera.scale);
  const u = 0.5 + (videoX - camera.x) * scale;
  const v = 0.5 + (videoY - camera.y) * scale;

  return {
    pixelX: u * containerWidth,
    pixelY: v * containerHeight,
  };
}

/** Cubic ease-in-out easing function. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Evaluates camera physics easing progress [0, 1] for a given normalized time t [0, 1].
 * Supported physics presets:
 * - 'smooth': easeInOutCubic
 * - 'snappy': 1 - Math.pow(1 - t, 4) (quartic ease-out)
 * - 'spring': damped harmonic curve 1 - Math.exp(-6 * t) * Math.cos(2.5 * Math.PI * t) with slight overshoot (~1.05) and settling at 1.0 at t=1
 * - 'linear': t
 * Boundary guard: t <= 0 returns 0, t >= 1 returns 1.
 */
export function evaluateCameraEasing(
  t: number,
  physics: CameraPhysicsPreset = "smooth",
): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;

  switch (physics) {
    case "spring":
      return 1 - Math.exp(-6 * t) * Math.cos(2.5 * Math.PI * t);
    case "snappy":
      return 1 - Math.pow(1 - t, 4);
    case "linear":
      return t;
    case "smooth":
    default:
      return easeInOutCubic(t);
  }
}

/** Alias for evaluateCameraEasing for backward compatibility. */
export const evaluateCameraPhysicsProgress = evaluateCameraEasing;

export interface SpatialTransitionClassification {
  distance: number;
  type: "anchor" | "glide" | "crane";
  recommendedScaleDip: number;
}

/**
 * Classifies the spatial transition between two points.
 * - "anchor" (distance < 0.12): user works in same UI area; keep scale rock-solid.
 * - "glide" (0.12 <= distance <= 0.38): adjacent widget; smooth continuous pan.
 * - "crane" (distance > 0.38): cross-screen jump; apply cinematic crane pull-back.
 */
export function classifySpatialTransition(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
): SpatialTransitionClassification {
  const distance = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (distance < 0.12) {
    return { distance, type: "anchor", recommendedScaleDip: 0 };
  }
  if (distance <= 0.38) {
    return { distance, type: "glide", recommendedScaleDip: 0.1 };
  }
  const dip = Math.min(0.65, 0.25 + distance * 0.45);
  return { distance, type: "crane", recommendedScaleDip: dip };
}

/**
 * Applies a 2D camera deadzone around the cursor with soft-knee spring follow.
 * When the mouse moves within the central deadzone, the camera maintains smooth steadicam damping.
 * When the cursor crosses outside, the camera follows with organic spring physics.
 */
export function calculateDeadzoneCamera(
  cameraCenter: { x: number; y: number },
  cursor: { x: number; y: number },
  scale: number,
  deadzoneRatio = 0.28,
  mode: "strict" | "center" = "strict",
): { x: number; y: number } {
  if (scale <= 1.0) return { x: 0.5, y: 0.5 };
  const visW = 1.0 / scale;
  const visH = 1.0 / scale;
  const halfDzW = (visW * deadzoneRatio) / 2;
  const halfDzH = (visH * deadzoneRatio) / 2;

  const diffX = cursor.x - cameraCenter.x;
  const diffY = cursor.y - cameraCenter.y;

  let shiftX = 0;
  if (Math.abs(diffX) > halfDzW) {
    const excess = Math.abs(diffX) - halfDzW;
    shiftX = Math.sign(diffX) * excess;
  }

  let shiftY = 0;
  if (Math.abs(diffY) > halfDzH) {
    const excess = Math.abs(diffY) - halfDzH;
    shiftY = Math.sign(diffY) * excess;
  }

  return clampCameraToBounds(cameraCenter.x + shiftX, cameraCenter.y + shiftY, scale, mode);
}

/**
 * Calculates adaptive zoom scale and hold parameters based on user interaction intent.
 * Typing zooms in smoothly centered on the input area.
 * Highlights zoom in smoothly centered on the highlighted selection.
 */
export function calculateIntentZoom(
  event: import("./project").InteractionEvent | import("./project").ClickEvent,
  options?: { typingZoomOut?: boolean; baseScale?: number },
): { scale: number; holdMs: number; offsetY: number; offsetX?: number } {
  const isTyping = "type" in event && event.type === "typing";
  if (isTyping) {
    const zoomOut = options?.typingZoomOut === true;
    return {
      scale: zoomOut ? 1.0 : (options?.baseScale ?? 1.85),
      holdMs: zoomOut ? 1600 : 2200,
      offsetY: 0,
      offsetX: 0,
    };
  }
  const isHighlight = "type" in event && event.type === "highlight";
  if (isHighlight) {
    return {
      scale: options?.baseScale ?? 1.80,
      holdMs: 2400,
      offsetY: 0,
      offsetX: 0,
    };
  }

  // Dynamic edge detection & framing:
  // If a click is near the screen boundary (e.g. browser tabs at top, dock at bottom, sidebar on left/right):
  // 1. Dynamically soften the scale (1.45x - 1.65x instead of 1.85x) to maintain visual context and prevent extreme corner pinch.
  // 2. Dynamically offset camera framing inward so the tab or edge button has clean headroom and breathing room.
  const distLeft = event.x;
  const distRight = 1 - event.x;
  const distTop = event.y;
  const distBottom = 1 - event.y;
  const minEdgeDist = Math.min(distLeft, distRight, distTop, distBottom);

  let scale = options?.baseScale ?? (event.button === "right" ? 1.7 : 1.85);
  let offsetY = 0;
  let offsetX = 0;

  if (minEdgeDist < 0.12) {
    // Dynamic edge scale: gently ease towards 1.50x at the extreme edge
    const edgeFloor = Math.min(1.50, scale);
    const edgeRatio = Math.max(0, Math.min(1, minEdgeDist / 0.12));
    scale = edgeFloor + (scale - edgeFloor) * edgeRatio;

    // Dynamic inward framing:
    // If clicking a tab near the top (e.g. y = 0.04), tilt camera center slightly down (+offsetY)
    // so the tab remains comfortably in frame without being clipped at the top boundary!
    if (distTop < 0.14) {
      offsetY = (0.14 - distTop) * 0.40;
    } else if (distBottom < 0.14) {
      offsetY = -(0.14 - distBottom) * 0.40;
    }

    if (distLeft < 0.14) {
      offsetX = (0.14 - distLeft) * 0.40;
    } else if (distRight < 0.14) {
      offsetX = -(0.14 - distRight) * 0.40;
    }
  }

  return {
    scale: Number(scale.toFixed(2)),
    holdMs: 2000,
    offsetY,
    offsetX,
  };
}


/**
 * Automatically detects and generates zoom blocks from click events.
 */
export function detectZoomBlocksFromClicks(
  clicks: ClickEvent[],
  videoDurationMs: number,
  userOptions?: Partial<AutoZoomOptions>,
): ZoomBlock[] {
  if (clicks.length === 0 || videoDurationMs <= 0) return [];
  const options = { ...DEFAULT_ZOOM_OPTIONS, ...userOptions };

  // Filter out finish/stop clicks and clicks too close to video end (stop artifacts)
  const validCutoff = Math.max(0, videoDurationMs - 1000);
  const isFinishOrStop = (c: ClickEvent) => {
    const id = (c.id || "").toLowerCase();
    return id.includes("stop") || id.includes("finish") || c.timestampMs > validCutoff;
  };
  const validClicks = clicks.filter((c) => c.timestampMs >= 0 && !isFinishOrStop(c));
  if (validClicks.length === 0) return [];

  // Sort clicks by time
  const sorted = [...validClicks].sort((a, b) => a.timestampMs - b.timestampMs);

  // Group nearby clicks into clusters
  interface Cluster {
    clicks: ClickEvent[];
    startTime: number;
    endTime: number;
    centerX: number;
    centerY: number;
  }

  const clusters: Cluster[] = [];
  let currentCluster: ClickEvent[] = [];

  for (const click of sorted) {
    if (click.timestampMs < 0 || click.timestampMs > videoDurationMs) continue;

    if (currentCluster.length === 0) {
      currentCluster.push(click);
    } else {
      const prev = currentCluster[currentCluster.length - 1]!;
      const timeDiff = click.timestampMs - prev.timestampMs;
      const dist = Math.hypot(click.x - prev.x, click.y - prev.y);

      if (timeDiff <= options.clusterWindowMs && dist <= options.clusterDistance) {
        currentCluster.push(click);
      } else {
        // Finalize cluster
        const first = currentCluster[0]!;
        const last = currentCluster[currentCluster.length - 1]!;
        const avgX = currentCluster.reduce((sum, c) => sum + c.x, 0) / currentCluster.length;
        const avgY = currentCluster.reduce((sum, c) => sum + c.y, 0) / currentCluster.length;

        clusters.push({
          clicks: currentCluster,
          startTime: first.timestampMs,
          endTime: last.timestampMs,
          centerX: avgX,
          centerY: avgY,
        });
        currentCluster = [click];
      }
    }
  }

  if (currentCluster.length > 0) {
    const first = currentCluster[0]!;
    const last = currentCluster[currentCluster.length - 1]!;
    const avgX = currentCluster.reduce((sum, c) => sum + c.x, 0) / currentCluster.length;
    const avgY = currentCluster.reduce((sum, c) => sum + c.y, 0) / currentCluster.length;

    clusters.push({
      clicks: currentCluster,
      startTime: first.timestampMs,
      endTime: last.timestampMs,
      centerX: avgX,
      centerY: avgY,
    });
  }

  // Convert clusters to ZoomBlocks
  const blocks: ZoomBlock[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]!;
    const id = `zoom-${i + 1}`;

    const rawStart = Math.max(0, cluster.startTime - options.leadInMs);
    const duration = Math.min(
      options.maxDurationMs,
      Math.max(options.minDurationMs, cluster.endTime - cluster.startTime + options.leadInMs + options.leadOutMs),
    );
    const rawEnd = Math.min(videoDurationMs, rawStart + duration);

    // Prevent overlap with previous block
    let actualStart = rawStart;
    if (blocks.length > 0) {
      const prevBlock = blocks[blocks.length - 1]!;
      if (actualStart < prevBlock.endTimeMs) {
        actualStart = prevBlock.endTimeMs + 50;
      }
    }

    if (actualStart + options.minDurationMs <= videoDurationMs && rawEnd > actualStart) {
      const clamped = clampCameraToBounds(cluster.centerX, cluster.centerY, options.defaultScale, "center");

      blocks.push({
        id,
        startTimeMs: actualStart,
        endTimeMs: Math.max(actualStart + options.minDurationMs, rawEnd),
        targetX: clamped.x,
        targetY: clamped.y,
        scale: options.defaultScale,
        enabled: true,
        shiftDurationMs: options.leadInMs,
        shiftAnimation: "smooth",
      });
    }
  }

  return blocks;
}

export interface CameraStateWithCursor extends CameraState {
  /** Live cursor X (0.0 to 1.0) */
  cursorX: number;
  /** Live cursor Y (0.0 to 1.0) */
  cursorY: number;
}

/**
 * Interpolates cursor coordinates at any given playback timestamp with O(log N) binary search.
 */
export function interpolateCursorAtTime(
  timeMs: number,
  trajectory?: import("./project").CursorTrajectoryPoint[],
  fallbackX = 0.5,
  fallbackY = 0.5,
): { x: number; y: number } {
  if (!trajectory || trajectory.length === 0) {
    return { x: fallbackX, y: fallbackY };
  }
  if (timeMs <= trajectory[0]!.timestampMs) {
    return { x: trajectory[0]!.x, y: trajectory[0]!.y };
  }
  const last = trajectory[trajectory.length - 1]!;
  if (timeMs >= last.timestampMs) {
    return { x: last.x, y: last.y };
  }

  let low = 0;
  let high = trajectory.length - 2;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const p1 = trajectory[mid]!;
    const p2 = trajectory[mid + 1]!;
    if (timeMs < p1.timestampMs) {
      high = mid - 1;
    } else if (timeMs > p2.timestampMs) {
      low = mid + 1;
    } else {
      const span = p2.timestampMs - p1.timestampMs;
      const alpha = span > 0 ? (timeMs - p1.timestampMs) / span : 0;
      return {
        x: p1.x + (p2.x - p1.x) * alpha,
        y: p1.y + (p2.y - p1.y) * alpha,
      };
    }
  }

  return { x: fallbackX, y: fallbackY };
}

export interface CameraOptions {
  /** Whether the camera continuously follows cursor position (OpenScreen style). Default true. */
  autoTrackCursor?: boolean;
  /** Camera zoom scale when auto-tracking cursor in continuous mode. Default 1.6. */
  autoTrackScale?: number;
  /** Cursor trajectory smoothing filter. */
  cursorSmoothing?: "none" | "smooth" | "cinematic";
  /** Optional click events used to anchor cursor smoothing precisely to targets. */
  clicks?: import("./project").ClickEvent[];
  /** Flag indicating trajectory was pre-smoothed by caller, skipping redundant smoothing per frame. */
  alreadySmoothed?: boolean;
  /** Whether adjacent zoom blocks glide continuously without dropping to 1.0x full frame. */
  continuousGlide?: boolean;
  /** Maximum time gap in milliseconds to bridge with continuous glide. */
  maxGlideGapMs?: number;
  /** Camera transition physics preset curve. */
  cameraPhysics?: CameraPhysicsPreset;
}

/**
 * Smooths raw cursor trajectory points using exponential moving average (EMA)
 * and anchors coordinates near click events to ensure clicks land precisely on target.
 */
export function smoothCursorTrajectory(
  points: import("./project").CursorTrajectoryPoint[],
  smoothing: "none" | "smooth" | "cinematic" = "smooth",
  clicks?: import("./project").ClickEvent[],
): import("./project").CursorTrajectoryPoint[] {
  if (!points || points.length <= 2 || smoothing === "none") {
    return points ? [...points] : [];
  }

  const alpha = smoothing === "cinematic" ? 0.20 : 0.40;
  const clickToleranceMs = 150;

  const smoothed: import("./project").CursorTrajectoryPoint[] = [
    { ...points[0]! },
  ];

  const sortedClicks = clicks && clicks.length > 0 ? [...clicks].sort((a, b) => a.timestampMs - b.timestampMs) : null;
  let clickIdx = 0;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i]!;
    const prev = smoothed[i - 1]!;

    let nearClick: import("./project").ClickEvent | undefined;
    if (sortedClicks) {
      while (clickIdx < sortedClicks.length && sortedClicks[clickIdx]!.timestampMs < pt.timestampMs - clickToleranceMs) {
        clickIdx++;
      }
      if (
        clickIdx < sortedClicks.length &&
        Math.abs(sortedClicks[clickIdx]!.timestampMs - pt.timestampMs) <= clickToleranceMs
      ) {
        nearClick = sortedClicks[clickIdx];
      }
    }

    if (nearClick) {
      const blend = 0.85;
      const targetX = pt.x * (1 - blend) + nearClick.x * blend;
      const targetY = pt.y * (1 - blend) + nearClick.y * blend;
      const stepX = prev.x + (targetX - prev.x) * 0.75;
      const stepY = prev.y + (targetY - prev.y) * 0.75;
      smoothed.push({
        timestampMs: pt.timestampMs,
        x: Math.min(1, Math.max(0, stepX)),
        y: Math.min(1, Math.max(0, stepY)),
      });
    } else {
      const smX = prev.x + (pt.x - prev.x) * alpha;
      const smY = prev.y + (pt.y - prev.y) * alpha;
      smoothed.push({
        timestampMs: pt.timestampMs,
        x: Math.min(1, Math.max(0, smX)),
        y: Math.min(1, Math.max(0, smY)),
      });
    }
  }

  return smoothed;
}

/**
 * Calculates smooth camera position, scale, and live cursor position at any timestamp,
 * dynamically tracking the mouse during zoom-in and hold.
 */
export function calculateCameraAtTime(
  timeMs: number,
  zoomBlocks: ZoomBlock[],
  leadInMs = 1000,
  leadOutMs = 400,
  cursorTrajectory?: import("./project").CursorTrajectoryPoint[],
  keyframes?: import("./project").KeyframeNode[],
  options?: CameraOptions,
): CameraStateWithCursor {
  const isAutoTrack = Boolean(options?.autoTrackCursor);
  const effectiveTrajectory =
    options?.cursorSmoothing && options.cursorSmoothing !== "none" && cursorTrajectory && !options.alreadySmoothed
      ? smoothCursorTrajectory(cursorTrajectory, options.cursorSmoothing, options.clicks)
      : cursorTrajectory;
  const defaultCursor = interpolateCursorAtTime(timeMs, effectiveTrajectory, 0.5, 0.5);

  // If discrete keyframe nodes are provided, use high-precision keyframe interpolation
  if (keyframes && keyframes.length >= 2) {
    const sortedKf = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
    const firstKf = sortedKf[0]!;
    const lastKf = sortedKf[sortedKf.length - 1]!;

    if (timeMs <= 0) {
      return {
        x: 0.5,
        y: 0.5,
        scale: 1.0,
        isZoomed: false,
        cursorX: defaultCursor.x,
        cursorY: defaultCursor.y,
      };
    }

    if (timeMs <= firstKf.timeMs) {
      // If first keyframe has a scale > 1.05 and is not at time 0,
      // playback before firstKf should be baseline 1.0x full-screen!
      if (firstKf.scale <= 1.05 || firstKf.timeMs > 0) {
        return {
          x: 0.5,
          y: 0.5,
          scale: 1.0,
          isZoomed: false,
          cursorX: defaultCursor.x,
          cursorY: defaultCursor.y,
        };
      }
      return {
        x: firstKf.targetX,
        y: firstKf.targetY,
        scale: firstKf.scale,
        isZoomed: firstKf.scale > 1.05,
        cursorX: defaultCursor.x,
        cursorY: defaultCursor.y,
      };
    }

    if (timeMs >= lastKf.timeMs) {
      if (lastKf.scale <= 1.05) {
        return {
          x: 0.5,
          y: 0.5,
          scale: 1.0,
          isZoomed: false,
          cursorX: defaultCursor.x,
          cursorY: defaultCursor.y,
        };
      }
      // Beyond the last keyframe, smoothly lead out back to full frame (1.0x at 0.5, 0.5) over leadOutMs
      const outDuration = Math.max(250, leadOutMs);
      if (timeMs >= lastKf.timeMs + outDuration) {
        return {
          x: 0.5,
          y: 0.5,
          scale: 1.0,
          isZoomed: false,
          cursorX: defaultCursor.x,
          cursorY: defaultCursor.y,
        };
      }
      const progress = evaluateCameraEasing((timeMs - lastKf.timeMs) / outDuration, options?.cameraPhysics || "smooth");
      const scale = lastKf.scale + (1.0 - lastKf.scale) * progress;
      const target = clampCameraToBounds(lastKf.targetX, lastKf.targetY, lastKf.scale, "center");
      const finalX = target.x + (0.5 - target.x) * progress;
      const finalY = target.y + (0.5 - target.y) * progress;
      return {
        x: finalX,
        y: finalY,
        scale,
        isZoomed: scale > 1.05,
        cursorX: defaultCursor.x,
        cursorY: defaultCursor.y,
      };
    }

    for (let k = 0; k < sortedKf.length - 1; k++) {
      const k1 = sortedKf[k]!;
      const k2 = sortedKf[k + 1]!;
      if (timeMs >= k1.timeMs && timeMs <= k2.timeMs) {
        const span = k2.timeMs - k1.timeMs;
        const progress = span > 0 ? evaluateCameraEasing((timeMs - k1.timeMs) / span, options?.cameraPhysics || "smooth") : 1;
        let scale = k1.scale + (k2.scale - k1.scale) * progress;
        const baseTargetX = k1.targetX + (k2.targetX - k1.targetX) * progress;
        const baseTargetY = k1.targetY + (k2.targetY - k1.targetY) * progress;
        const cursor = interpolateCursorAtTime(timeMs, effectiveTrajectory, baseTargetX, baseTargetY);

        let finalX = baseTargetX;
        let finalY = baseTargetY;

        if (k1.scale <= 1.05 && k2.scale > 1.05) {
          // Zooming in from full frame: smoothly glide from unzoomed center (0.5, 0.5) to peak interaction target
          finalX = 0.5 + (k2.targetX - 0.5) * progress;
          finalY = 0.5 + (k2.targetY - 0.5) * progress;
        } else if (k2.scale <= 1.05 && k1.scale > 1.05) {
          // Zooming out to full frame: smoothly glide back from interaction target to unzoomed center (0.5, 0.5)
          finalX = k1.targetX + (0.5 - k1.targetX) * progress;
          finalY = k1.targetY + (0.5 - k1.targetY) * progress;
        } else if (scale > 1.05) {
          // Actively zoomed in: Camera Shift Tour or steady hold
          const shiftDist = Math.hypot(k2.targetX - k1.targetX, k2.targetY - k1.targetY);
          if (shiftDist > 0.04) {
            if (shiftDist > 0.25 && k1.scale > 1.35 && k2.scale > 1.35 && Math.abs(k1.scale - k2.scale) < 0.15) {
              // Cinematic crane dip: slight scale pullback mid-shift when holding high scale
              const craneDip = Math.min(0.20, shiftDist * 0.30) * Math.sin(progress * Math.PI);
              scale = Math.max(1.25, scale - craneDip);
            }
            finalX = baseTargetX;
            finalY = baseTargetY;
          } else {
            // Steady hold: stay anchored rock-solid on target
            // If this keyframe is from a typing interaction, keep camera firmly on the typing target regardless of where the cursor wanders
            const isTypingKf = k1.sound === "typing" || k2.sound === "typing" || k1.id.includes("type") || k2.id.includes("type");
            if (!isTypingKf && effectiveTrajectory && effectiveTrajectory.length > 0) {
              const tracked = calculateDeadzoneCamera(
                { x: baseTargetX, y: baseTargetY },
                cursor,
                scale,
                isAutoTrack ? 0.35 : 0.65,
                "center",
              );
              finalX = tracked.x;
              finalY = tracked.y;
            } else {
              finalX = baseTargetX;
              finalY = baseTargetY;
            }
          }
        } else {
          finalX = 0.5;
          finalY = 0.5;
        }

        const clamped = clampCameraToBounds(finalX, finalY, scale, "center");
        return {
          x: clamped.x,
          y: clamped.y,
          scale,
          isZoomed: scale > 1.05,
          cursorX: cursor.x,
          cursorY: cursor.y,
        };
      }
    }
  }

  const activeBlocks = zoomBlocks.filter((b) => b.enabled).sort((a, b) => a.startTimeMs - b.startTimeMs);

  if (activeBlocks.length === 0) {
    if (Boolean(options?.autoTrackCursor) && effectiveTrajectory && effectiveTrajectory.length > 0) {
      const autoScale = options?.autoTrackScale ?? 1.6;
      const target = clampCameraToBounds(defaultCursor.x, defaultCursor.y, autoScale, "center");
      return {
        x: target.x,
        y: target.y,
        scale: autoScale,
        isZoomed: true,
        cursorX: defaultCursor.x,
        cursorY: defaultCursor.y,
      };
    }
    return {
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      isZoomed: false,
      cursorX: defaultCursor.x,
      cursorY: defaultCursor.y,
    };
  }

  for (let i = 0; i < activeBlocks.length; i++) {
    const block = activeBlocks[i]!;
    const nextBlock = activeBlocks[i + 1];

    const blockLeadIn = block.shiftDurationMs ?? leadInMs;
    const transitionInStart = Math.max(0, block.startTimeMs - blockLeadIn);
    const transitionInEnd = block.startTimeMs;
    const transitionOutStart = block.endTimeMs;
    const transitionOutEnd = block.endTimeMs + leadOutMs;

    // Track moving cursor or block target
    const currentCursor = interpolateCursorAtTime(timeMs, effectiveTrajectory, block.targetX, block.targetY);

    const maxGlideGapMs = options?.maxGlideGapMs ?? 1000;
    const prevBlock = i > 0 ? activeBlocks[i - 1] : undefined;
    const glidedFromPrev = Boolean(
      prevBlock &&
        block.startTimeMs - prevBlock.endTimeMs <= maxGlideGapMs &&
        block.startTimeMs > prevBlock.endTimeMs,
    );

    // 1. Inside lead-in transition: smoothly zoom in directly on block target
    if (!glidedFromPrev && timeMs >= transitionInStart && timeMs < transitionInEnd) {
      const span = transitionInEnd - transitionInStart;
      const easingPhysics = block.shiftAnimation === "spring"
        ? "spring"
        : block.shiftAnimation === "linear"
          ? "linear"
          : (options?.cameraPhysics || "smooth");
      const progress = span > 0 ? evaluateCameraEasing((timeMs - transitionInStart) / span, easingPhysics) : 1;
      const target = clampCameraToBounds(block.targetX, block.targetY, block.scale, "center");
      const currentScale = 1.0 + (block.scale - 1.0) * progress;
      return {
        x: 0.5 + (target.x - 0.5) * progress,
        y: 0.5 + (target.y - 0.5) * progress,
        scale: currentScale,
        isZoomed: currentScale > 1.05,
        cursorX: currentCursor.x,
        cursorY: currentCursor.y,
      };
    }

    // 2. Inside active zoom hold: apply rock-solid anchor on block target
    if (timeMs >= transitionInEnd && timeMs <= transitionOutStart) {
      const target = isAutoTrack
        ? calculateDeadzoneCamera(
            { x: block.targetX, y: block.targetY },
            currentCursor,
            block.scale,
            0.35,
            "center",
          )
        : clampCameraToBounds(block.targetX, block.targetY, block.scale, "center");
      return {
        x: target.x,
        y: target.y,
        scale: block.scale,
        isZoomed: block.scale > 1.05,
        cursorX: currentCursor.x,
        cursorY: currentCursor.y,
      };
    }

    // 3. Between this block and next block: glide smoothly ONLY if options?.continuousGlide is true
    if (
      options?.continuousGlide &&
      nextBlock &&
      nextBlock.startTimeMs - transitionOutStart <= maxGlideGapMs &&
      nextBlock.startTimeMs > transitionOutStart
    ) {
      if (timeMs > transitionOutStart && timeMs <= nextBlock.startTimeMs) {
        const span = nextBlock.startTimeMs - transitionOutStart;
        const progress = span > 0 ? evaluateCameraEasing((timeMs - transitionOutStart) / span, options?.cameraPhysics || "smooth") : 1;
        const target1 = clampCameraToBounds(block.targetX, block.targetY, block.scale, "center");
        const nextCursor = interpolateCursorAtTime(timeMs, effectiveTrajectory, nextBlock.targetX, nextBlock.targetY);
        const target2 = clampCameraToBounds(nextCursor.x, nextCursor.y, nextBlock.scale, "center");

        // Spatial classification: Crane pull-back on wide cross-screen jumps
        const spatial = classifySpatialTransition(target1, target2);
        let currentScale = block.scale + (nextBlock.scale - block.scale) * progress;
        if (spatial.type === "crane") {
          const dipFactor = Math.sin(progress * Math.PI);
          currentScale = Math.max(1.18, currentScale - spatial.recommendedScaleDip * dipFactor);
        }

        return {
          x: target1.x + (target2.x - target1.x) * progress,
          y: target1.y + (target2.y - target1.y) * progress,
          scale: currentScale,
          isZoomed: currentScale > 1.05,
          cursorX: currentCursor.x,
          cursorY: currentCursor.y,
        };
      }
    }

    // 4. Return to full frame (1.0x) during lead-out
    if (timeMs > transitionOutStart && timeMs <= transitionOutEnd) {
      const span = transitionOutEnd - transitionOutStart;
      const progress = span > 0 ? evaluateCameraEasing((timeMs - transitionOutStart) / span, options?.cameraPhysics || "smooth") : 1;
      const target = clampCameraToBounds(block.targetX, block.targetY, block.scale, "center");
      const currentScale = block.scale + (1.0 - block.scale) * progress;
      return {
        x: target.x + (0.5 - target.x) * progress,
        y: target.y + (0.5 - target.y) * progress,
        scale: currentScale,
        isZoomed: currentScale > 1.05,
        cursorX: currentCursor.x,
        cursorY: currentCursor.y,
      };
    }
  }

  return {
    x: 0.5,
    y: 0.5,
    scale: 1.0,
    isZoomed: false,
    cursorX: defaultCursor.x,
    cursorY: defaultCursor.y,
  };
}

export interface PlotInteractionsOptions {
  holdDurationMs?: number;
  scale?: number;
  minBlockDurationMs?: number;
  fallbackIfEmpty?: boolean;
  continuousGlide?: boolean;
  maxGlideGapMs?: number;
  leadInMs?: number;
  leadOutMs?: number;
  inactivityResetMs?: number;
  cursorTrajectory?: import("./project").CursorTrajectoryPoint[];
  autoFillGaps?: boolean;
  maxGapMs?: number;
  maxClusterDistance?: number;
  minRestMs?: number;
  enableRevealDip?: boolean;
  typingZoomOut?: boolean;
  centerTyping?: boolean;
  initialEstablishingMs?: number;
  shiftAnimation?: import("./project").ShiftAnimationStyle;
  cameraPhysics?: import("./project").CameraPhysicsPreset;
}

/**
 * Calculates a centered focal target for typing interactions.
 * In search bars, form inputs, or URL bars, users type horizontally across the input.
 * Centering horizontally (x = 0.50) prevents the camera from anchoring on the far left or right edge,
 * which pushes the input and any autocomplete dropdowns off-screen.
 * For top inputs (y <= 0.45), slightly offsetting down (y ~ 0.38) keeps the input in the upper third
 * and frames the dropdown / autocomplete results right in the center of the recording.
 */
export function calculateTypingTarget(evt: { x: number; y: number }, forceCenter = false): { x: number; y: number } {
  if (forceCenter) {
    const targetX = evt.x >= 0.15 && evt.x <= 0.85 ? 0.50 : evt.x;
    const targetY = evt.y <= 0.45 ? Math.min(0.44, Math.max(0.36, evt.y + 0.10)) : evt.y;
    return { x: targetX, y: targetY };
  }
  // Focus directly on exactly where the user is typing so the camera shifts to their input position
  return { x: evt.x, y: evt.y };
}

/**
 * Bridges long inactive gaps (> 4200ms) between detected interactions
 * with intermediate focal transition nodes, preventing multi-second dead zones
 * and ensuring continuous camera framing and shifting across reading/navigation sequences.
 */
export function fillInteractionGaps(
  interactions: import("./project").InteractionEvent[],
  videoDurationMs: number,
  trajectory?: import("./project").CursorTrajectoryPoint[],
  maxGapMs = 4200,
): import("./project").InteractionEvent[] {
  if (videoDurationMs < 4000) return interactions ? [...interactions] : [];
  const events = interactions ? [...interactions] : [];
  const sorted = events.sort((a, b) => a.timestampMs - b.timestampMs);
  const result: import("./project").InteractionEvent[] = [];

  const getFocalPointAt = (t: number, index: number) => {
    if (trajectory && trajectory.length > 0) {
      const p = interpolateCursorAtTime(t, trajectory, 0.5, 0.45);
      if (Math.abs(p.x - 0.5) > 0.02 || Math.abs(p.y - 0.5) > 0.02) {
        return { x: p.x, y: p.y };
      }
    }
    const readingPattern = [
      { x: 0.46, y: 0.38 },
      { x: 0.54, y: 0.46 },
      { x: 0.40, y: 0.52 },
      { x: 0.58, y: 0.42 },
      { x: 0.48, y: 0.60 },
    ];
    return readingPattern[index % readingPattern.length]!;
  };

  let nodeIndex = 0;

  // 1. Check gap before first interaction
  const firstTime = sorted[0]?.timestampMs ?? videoDurationMs;
  if (firstTime > maxGapMs) {
    const step = 3200;
    for (let t = 2000; t < firstTime - 1200; t += step) {
      const pt = getFocalPointAt(t, nodeIndex++);
      result.push({
        id: `act-gap-pre-${t}`,
        type: "click",
        timestampMs: t,
        x: pt.x,
        y: pt.y,
        button: "left",
      });
    }
  }

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    result.push(cur);

    const next = sorted[i + 1];
    const curEnd = cur.timestampMs + (cur.durationMs ?? 0);
    const nextStart = next ? next.timestampMs : Math.max(0, videoDurationMs - 500);
    const gap = nextStart - curEnd;

    if (gap > maxGapMs) {
      const segments = Math.max(2, Math.ceil(gap / 3200));
      const step = Math.round(gap / segments);
      for (let t = curEnd + step; t < nextStart - 1000; t += step) {
        const pt = getFocalPointAt(t, nodeIndex++);
        result.push({
          id: `act-gap-${t}`,
          type: "click",
          timestampMs: t,
          x: pt.x,
          y: pt.y,
          button: "left",
        });
      }
    }
  }

  return result.sort((a, b) => a.timestampMs - b.timestampMs);
}

/**
 * Strict invariant enforcer: ensures that no two ZoomBlocks overlap or visually collide on the timeline.
 * If two blocks overlap or have less than minGapMs between them, they are merged into one continuous block.
 */
export function enforceNonOverlappingZoomBlocks(
  blocks: ZoomBlock[],
  _minGapMs = 0,
): ZoomBlock[] {
  if (!blocks || blocks.length <= 1) return blocks || [];
  const sorted = [...blocks].sort((a, b) => a.startTimeMs - b.startTimeMs);
  const result: ZoomBlock[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = { ...sorted[i]! };
    if (result.length === 0) {
      result.push(cur);
      continue;
    }
    const prev = result[result.length - 1]!;
    // Only merge if cur strictly overlaps with prev in time
    if (cur.startTimeMs < prev.endTimeMs) {
      prev.endTimeMs = Math.max(prev.endTimeMs, cur.endTimeMs);
      prev.scale = Math.max(prev.scale, cur.scale);
      prev.enabled = prev.enabled || cur.enabled;
    } else {
      result.push(cur);
    }
  }

  return result.filter((b) => b.endTimeMs - b.startTimeMs >= 350);
}

/**
 * Translates recorded click and typing interactions into iterative auto-zooms
 * that start 0.5s before the actual click/typing, track the mouse/cursor smoothly,
 * and return to full-frame after 1.0s of user inactivity.
 * Clusters rapid consecutive actions and automatically attaches typing and click sounds to keyframes.
 * Enforces strictly monotonic keyframe timestamps and protects against edge boundary collapses.
 */
export function plotInteractionsToKeyframesAndZoomBlocks(
  interactions: import("./project").InteractionEvent[],
  videoDurationMs: number,
  options: PlotInteractionsOptions = {},
): { keyframes: import("./project").KeyframeNode[]; zoomBlocks: ZoomBlock[] } {
  if (videoDurationMs <= 0) {
    return { keyframes: [], zoomBlocks: [] };
  }

  let events = interactions ? [...interactions] : [];

  if (options.autoFillGaps) {
    events = fillInteractionGaps(
      events,
      videoDurationMs,
      options.cursorTrajectory,
      options.maxGapMs ?? 4200,
    );
  }

  // If no interactions were provided and fallback is requested, generate 2 smart focal zooms
  if (events.length === 0 && options.fallbackIfEmpty && videoDurationMs >= 3000) {
    events = [
      {
        id: "fallback-c1",
        type: "click",
        timestampMs: Math.round(videoDurationMs * 0.22),
        x: 0.38,
        y: 0.42,
        button: "left",
      },
      {
        id: "fallback-c2",
        type: "click",
        timestampMs: Math.round(videoDurationMs * 0.62),
        x: 0.62,
        y: 0.52,
        button: "left",
      },
    ];
  }

  if (events.length === 0) {
    return { keyframes: [], zoomBlocks: [] };
  }

  // Filter out negative timestamps and interactions within 1000ms of video end or stop/finish events (finish artifacts)
  const validCutoff = Math.max(0, videoDurationMs - 1000);
  const isFinishOrStop = (e: import("./project").InteractionEvent) => {
    const id = (e.id || "").toLowerCase();
    return id.includes("stop") || id.includes("finish") || e.timestampMs > validCutoff;
  };
  const validInteractions = events.filter((e) => e.timestampMs >= 0 && !isFinishOrStop(e));

  if (validInteractions.length === 0) {
    return { keyframes: [], zoomBlocks: [] };
  }

  // Snappy lead-in: camera starts zooming smoothly before user interaction
  const leadInMs = options.leadInMs ?? 1000;
  const leadOutMs = options.leadOutMs ?? 400;
  const minDuration = options.minBlockDurationMs ?? 700;
  // Actions within 1.0s of each other stay in one zoom (camera pans between them);
  // after 1.0s inactivity the camera returns smoothly to full frame
  const clusterGapMs = options.inactivityResetMs ?? (options.continuousGlide ? 1800 : 1000);
  const maxGlideGap = options.maxGlideGapMs ?? (options.continuousGlide ? 1800 : 1000);
  const effectiveClusterGap = options.continuousGlide !== false
    ? Math.max(clusterGapMs, maxGlideGap)
    : clusterGapMs;

  const sorted = [...validInteractions].sort((a, b) => a.timestampMs - b.timestampMs);
  const maxClusterDist = options.maxClusterDistance ?? Number.POSITIVE_INFINITY;
  const minRestMs = options.minRestMs ?? 400;

  // Group events into clusters based on temporal proximity and spatial proximity
  const clusters: import("./project").InteractionEvent[][] = [];
  let currentCluster: import("./project").InteractionEvent[] = [];

  for (const event of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(event);
    } else {
      const prev = currentCluster[currentCluster.length - 1]!;
      const prevEffectiveEnd = prev.timestampMs + (prev.durationMs ?? 0);
      const timeDiff = event.timestampMs - prevEffectiveEnd;
      const spatialDist = Math.hypot(event.x - prev.x, event.y - prev.y);

      // Consecutive actions within the inactivity/glide window stay in ONE zoom session:
      // the camera pans to each new click instead of zooming out and back in.
      // Distance only splits clusters when explicitly requested via maxClusterDistance.
      if (timeDiff <= effectiveClusterGap && spatialDist <= maxClusterDist) {
        currentCluster.push(event);
      } else {
        clusters.push(currentCluster);
        currentCluster = [event];
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const keyframes: import("./project").KeyframeNode[] = [];
  const zoomBlocks: ZoomBlock[] = [];
  let lastBlockEndTime = 0;
  let previousGlidedIntoThis = false;

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]!;
    const nextCluster = clusters[i + 1];
    const firstEvt = cluster[0]!;
    const lastEvt = cluster[cluster.length - 1]!;

    const hasTyping = cluster.some((e) => "type" in e && e.type === "typing");
    const isTypingCluster = hasTyping && options.typingZoomOut === true;
    const highlightEvt = cluster.find((e) => "type" in e && e.type === "highlight");
    const intent = isTypingCluster
      ? calculateIntentZoom(
          { id: firstEvt.id, type: "typing", timestampMs: firstEvt.timestampMs, x: firstEvt.x, y: firstEvt.y },
          { typingZoomOut: true, baseScale: options.scale },
        )
      : calculateIntentZoom(firstEvt, { typingZoomOut: options.typingZoomOut, baseScale: options.scale });
    const clusterScale = isTypingCluster ? 1.0 : (options.scale ?? intent.scale);
    const clusterHoldMs = options.holdDurationMs ?? (isTypingCluster ? 1400 : highlightEvt ? 1600 : hasTyping ? 1400 : 1200);

    const minIntroHold = options.initialEstablishingMs ?? 0;
    const rawStart = i === 0 && minIntroHold > 0
      ? Math.max(minIntroHold, firstEvt.timestampMs - leadInMs)
      : Math.max(0, firstEvt.timestampMs - leadInMs);
    let startMs = rawStart;

    if (lastBlockEndTime > 0) {
      if (previousGlidedIntoThis) {
        startMs = lastBlockEndTime;
      } else {
        const earliestStart = lastBlockEndTime + minRestMs;
        if (rawStart < earliestStart) {
          startMs = earliestStart < firstEvt.timestampMs ? earliestStart : Math.max(lastBlockEndTime + 40, firstEvt.timestampMs - 200);
        }
      }
    }

    const clusterEndTime = Math.max(
      lastEvt.timestampMs,
      ...cluster.map((e) => e.timestampMs + (e.durationMs ?? 0)),
    );

    // Check if next cluster is eligible for continuous glide
    const maxGlideGap = options.maxGlideGapMs ?? (options.continuousGlide ? 1800 : 1000);
    const canGlideToNext = Boolean(
      options.continuousGlide &&
        nextCluster &&
        nextCluster[0]!.timestampMs - clusterEndTime <= maxGlideGap &&
        nextCluster[0]!.timestampMs > clusterEndTime,
    );

    const rawEnd = clusterEndTime + clusterHoldMs + leadOutMs;
    let endMs = Math.min(videoDurationMs, rawEnd);

    if (nextCluster && !canGlideToNext) {
      const nextFirstTime = nextCluster[0]!.timestampMs;
      // If not gliding into nextCluster, ensure this zoom block completes its return to 1.0x
      // before the next interaction's lead-in window
      if (endMs > nextFirstTime - 120) {
        endMs = Math.max(clusterEndTime + 200, nextFirstTime - 120);
      }
    }

    // If block is too short near video end, attempt to extend start backward to sustain the zoom
    if (endMs - startMs < minDuration) {
      const expandedStart = Math.max(lastBlockEndTime > 0 ? lastBlockEndTime + minRestMs : 0, endMs - minDuration);
      if (endMs - expandedStart >= 350) {
        startMs = expandedStart;
      }
    }

    const span = endMs - startMs;
    if (span < 240) continue;

    const typingEvt = cluster.find((e) => "type" in e && e.type === "typing");
    const focalEvt = typingEvt || highlightEvt || firstEvt;
    const typingTarget = hasTyping
      ? calculateTypingTarget(focalEvt, options.centerTyping === true)
      : null;
    const clampedFirst = isTypingCluster
      ? { x: 0.5, y: 0.5 }
      : typingTarget
        ? clampCameraToBounds(typingTarget.x, typingTarget.y, clusterScale, "center")
        : clampCameraToBounds(focalEvt.x + (intent.offsetX || 0), focalEvt.y + intent.offsetY, clusterScale, "center");

    const blockEnd = canGlideToNext
      ? Math.min(endMs, nextCluster![0]!.timestampMs)
      : endMs;

    // Timeline ZoomBlock
    zoomBlocks.push({
      id: `zoom-auto-${i + 1}`,
      startTimeMs: startMs,
      endTimeMs: blockEnd,
      targetX: clampedFirst.x,
      targetY: clampedFirst.y,
      scale: clusterScale,
      enabled: true,
      shiftDurationMs: leadInMs,
      shiftAnimation: options.shiftAnimation || (options.cameraPhysics as import("./project").ShiftAnimationStyle) || "smooth",
    });

    // Strictly monotonic keyframe calculations:
    // startMs < peakTime <= trackTimes <= holdTime < endMs
    const effLeadIn = Math.min(leadInMs, Math.max(120, firstEvt.timestampMs - startMs));
    const effLeadOut = Math.min(leadOutMs, Math.round(span * 0.22));

    // Keyframe 1: Start zoom lead-in (only if previous cluster did not already glide into this cluster)
    if (!previousGlidedIntoThis) {
      if (i === 0 && startMs > 0 && !keyframes.some((k) => k.timeMs === 0)) {
        keyframes.push({
          id: `kf-intro-full`,
          timeMs: 0,
          scale: 1.0,
          targetX: 0.5,
          targetY: 0.5,
          easing: "cubic",
        });
      }

      keyframes.push({
        id: `kf-start-${firstEvt.id}`,
        timeMs: startMs,
        scale: 1.0,
        targetX: 0.5,
        targetY: 0.5,
        easing: "cubic",
      });

      // Keyframe 2: Peak zoom reached right on user interaction
      const minPeak = startMs + Math.max(80, effLeadIn);
      const maxPeak = Math.max(minPeak, endMs - effLeadOut - 150);
      const peakTime = Math.max(minPeak, Math.min(maxPeak, firstEvt.timestampMs));

      const initialLandingTarget = (firstEvt.type === "click" && hasTyping && options.centerTyping === true)
        ? clampCameraToBounds(firstEvt.x, firstEvt.y, clusterScale, "center")
        : clampedFirst;

      keyframes.push({
        id: `kf-peak-${firstEvt.id}`,
        timeMs: peakTime,
        scale: clusterScale,
        targetX: initialLandingTarget.x,
        targetY: initialLandingTarget.y,
        easing: "spring",
        ...(firstEvt.type === "typing"
          ? { sound: "typing", soundPreset: "mechanical", soundVolume: 0.55 }
          : firstEvt.type === "highlight"
            ? { sound: "click", soundPreset: "bop", soundVolume: 0.40 }
            : { sound: "click", soundPreset: "bop", soundVolume: 0.70 }),
      });

      if (
        firstEvt.type === "click" &&
        hasTyping &&
        options.centerTyping === true &&
        (Math.abs(initialLandingTarget.x - clampedFirst.x) > 0.04 || Math.abs(initialLandingTarget.y - clampedFirst.y) > 0.04)
      ) {
        const panTime = Math.min(peakTime + 280, endMs - effLeadOut - 80);
        if (panTime > peakTime + 50) {
          keyframes.push({
            id: `kf-type-center-${firstEvt.id}`,
            timeMs: panTime,
            scale: clusterScale,
            targetX: clampedFirst.x,
            targetY: clampedFirst.y,
            easing: "cubic",
          });
        }
      }

      // Video Editor Showcase Arc: only if enabled and not explicitly turned off
      const shouldReveal =
        clusterScale > 1.05 &&
        !hasTyping &&
        (options.enableRevealDip === true || (options.enableRevealDip === undefined && clusterHoldMs >= 1800));
      if (shouldReveal) {
        const showcaseScale = Math.max(1.32, Math.round(clusterScale * 0.78 * 100) / 100);
        const revealTime = peakTime + 420;
        if (revealTime < endMs - effLeadOut - 100) {
          keyframes.push({
            id: `kf-reveal-${firstEvt.id}`,
            timeMs: revealTime,
            scale: showcaseScale,
            targetX: clampedFirst.x,
            targetY: clampedFirst.y,
            easing: "cubic",
          });
        }
      }
    }

    // If first interaction is a continuous typing session with durationMs > 800ms,
    // add at most ONE intermediate keyframe to prevent keyframe spam/lag
    if (firstEvt.type === "typing" && (firstEvt.durationMs ?? 0) > 800) {
      const typeDuration = firstEvt.durationMs!;
      const midTime = firstEvt.timestampMs + Math.round(typeDuration / 2);
      if (midTime < endMs - effLeadOut - 100) {
        keyframes.push({
          id: `kf-type-${firstEvt.id}-mid`,
          timeMs: midTime,
          scale: clusterScale,
          targetX: clampedFirst.x,
          targetY: clampedFirst.y,
          easing: "cubic",
        });
      }
    }

    // Intermediate tracking keyframes for multiple actions in cluster (decimated to prevent lag)
    let lastTrackTime = firstEvt.timestampMs;
    let lastTargetX = clampedFirst.x;
    let lastTargetY = clampedFirst.y;

    for (let j = 1; j < cluster.length; j++) {
      const midEvt = cluster[j]!;
      const isMidTyping = midEvt.type === "typing" && options.typingZoomOut === true;
      const isTypingMid = midEvt.type === "typing";
      const midTypingTarget = isTypingMid ? calculateTypingTarget(midEvt, options.centerTyping === true) : null;
      const midIntent = calculateIntentZoom(midEvt);
      const clampedMid = isMidTyping
        ? { x: 0.5, y: 0.5 }
        : midTypingTarget
          ? clampCameraToBounds(midTypingTarget.x, midTypingTarget.y, clusterScale, "center")
          : clampCameraToBounds(midEvt.x + (midIntent.offsetX || 0), midEvt.y + midIntent.offsetY, clusterScale, "center");
      const trackMin = firstEvt.timestampMs + 60;
      const trackMax = Math.max(trackMin, endMs - effLeadOut - 100);
      const trackTime = Math.max(trackMin, Math.min(trackMax, midEvt.timestampMs));

      // Shift camera directly to consecutive actions in cluster:
      // If two consecutive clicks are at virtually the same small spot (< 0.04 distance), the camera is already framed
      // on this spot. Skip generating redundant micro-keyframes to keep timeline clean.
      const prevEvt = cluster[j - 1]!;
      const distFromPrev = Math.hypot(midEvt.x - prevEvt.x, midEvt.y - prevEvt.y);
      const targetDist = Math.hypot(clampedMid.x - lastTargetX, clampedMid.y - lastTargetY);
      const gap = trackTime - lastTrackTime;

      const isBothClicks = midEvt.type === "click" && prevEvt.type === "click";
      if (gap < 160 || (isBothClicks && targetDist < 0.04 && distFromPrev < 0.04)) {
        continue;
      }

      // If there is a noticeable gap (> 450ms) and meaningful distance (> 0.06), hold camera steady on previous
      // action before smoothly gliding to the next action
      if (gap > 450 && targetDist > 0.06) {
        const panSpan = Math.min(1000, Math.max(650, Math.round(gap * 0.70)));
        const panStart = trackTime - panSpan;
        if (panStart > lastTrackTime + 80) {
          keyframes.push({
            id: `kf-hold-${prevEvt.id}-before-${midEvt.id}`,
            timeMs: panStart,
            scale: clusterScale,
            targetX: lastTargetX,
            targetY: lastTargetY,
            easing: "cubic",
          });
        }
      }

      // For significant spatial distance across tabs/elements, add a subtle crane glide
      if (targetDist > 0.35 && gap > 500) {
        const craneSpan = Math.min(1000, Math.max(450, Math.round(gap * 0.6)));
        const midPanTime = trackTime - Math.round(craneSpan / 2);
        if (midPanTime > lastTrackTime + 80) {
          keyframes.push({
            id: `kf-crane-mid-${midEvt.id}`,
            timeMs: midPanTime,
            scale: Math.max(1.35, clusterScale - 0.15),
            targetX: (lastTargetX + clampedMid.x) / 2,
            targetY: (lastTargetY + clampedMid.y) / 2,
            easing: "cubic",
          });
        }
      }

      lastTrackTime = trackTime;
      lastTargetX = clampedMid.x;
      lastTargetY = clampedMid.y;

      keyframes.push({
        id: `kf-track-${midEvt.id}`,
        timeMs: trackTime,
        scale: isMidTyping ? 1.0 : clusterScale,
        targetX: clampedMid.x,
        targetY: clampedMid.y,
        easing: "cubic",
        ...(midEvt.type === "typing"
          ? { sound: "typing", soundPreset: "mechanical", soundVolume: 0.55 }
          : { sound: "click", soundPreset: "bop", soundVolume: 0.70 }),
      });
    }

    // Highlight / Drag Trajectory Detection:
    // If the cluster has a highlight event or the cursor traversed a sustained path (> 0.08 normalized distance)
    // during the interaction, add an intentional guided camera shift keyframe along the drag vector.
    if (highlightEvt && highlightEvt.xEnd !== undefined && highlightEvt.yEnd !== undefined) {
      const shiftTime = Math.round(highlightEvt.timestampMs + (highlightEvt.durationMs ?? 600) / 2);
      const clampedShift = clampCameraToBounds(highlightEvt.xEnd, highlightEvt.yEnd, clusterScale, "center");
      if (shiftTime > firstEvt.timestampMs + 80 && shiftTime < endMs - effLeadOut - 80) {
        keyframes.push({
          id: `kf-highlight-shift-${highlightEvt.id}`,
          timeMs: shiftTime,
          scale: clusterScale,
          targetX: clampedShift.x,
          targetY: clampedShift.y,
          easing: "cubic",
        });
      }
    } else if (firstEvt.type !== "click" && options.cursorTrajectory && options.cursorTrajectory.length > 0) {
      const effectiveEnd = Math.max(clusterEndTime, firstEvt.timestampMs + 400);
      const pStart = interpolateCursorAtTime(firstEvt.timestampMs, options.cursorTrajectory, firstEvt.x, firstEvt.y);
      const pEnd = interpolateCursorAtTime(effectiveEnd, options.cursorTrajectory, lastEvt.x, lastEvt.y);
      const sweepDist = Math.hypot(pEnd.x - pStart.x, pEnd.y - pStart.y);
      if (sweepDist > 0.08) {
        const shiftTime = Math.round((firstEvt.timestampMs + effectiveEnd) / 2);
        const clampedShift = clampCameraToBounds(pEnd.x, pEnd.y, clusterScale, "center");
        if (shiftTime > firstEvt.timestampMs + 80 && shiftTime < endMs - effLeadOut - 80) {
          keyframes.push({
            id: `kf-highlight-shift-${firstEvt.id}`,
            timeMs: shiftTime,
            scale: clusterScale,
            targetX: clampedShift.x,
            targetY: clampedShift.y,
            easing: "cubic",
          });
        }
      }
    }

    // Keyframe 3: End of hold before lead-out or glide
    const idealHoldEnd = clusterEndTime + clusterHoldMs;
    const minHold = firstEvt.timestampMs + 100;
    const maxHold = Math.max(minHold, endMs - effLeadOut);
    const holdTime = Math.max(minHold, Math.min(maxHold, idealHoldEnd));
    const clampedLast = isTypingCluster
      ? { x: 0.5, y: 0.5 }
      : (hasTyping && options.centerTyping === true)
        ? clampedFirst
        : clampCameraToBounds(lastEvt.x, lastEvt.y, clusterScale, "center");
    const shouldRevealHold =
      clusterScale > 1.05 &&
      (options.enableRevealDip === true || (options.enableRevealDip === undefined && clusterHoldMs >= 1800));
    const effectiveHoldScale = shouldRevealHold
      ? Math.max(1.32, Math.round(clusterScale * 0.78 * 100) / 100)
      : clusterScale;

    if (holdTime > firstEvt.timestampMs + 80) {
      keyframes.push({
        id: `kf-hold-${lastEvt.id}`,
        timeMs: holdTime,
        scale: effectiveHoldScale,
        targetX: clampedLast.x,
        targetY: clampedLast.y,
        easing: "cubic",
      });
    }

    if (canGlideToNext) {
      // Connect seamlessly to next cluster via continuous glide
      const nextFirst = nextCluster![0]!;
      const nextHasTyping = nextCluster!.some((e) => "type" in e && e.type === "typing");
      const nextIsTyping = nextHasTyping && options.typingZoomOut === true;
      const nextIntent = nextIsTyping
        ? calculateIntentZoom(
            { id: nextFirst.id, type: "typing", timestampMs: nextFirst.timestampMs, x: nextFirst.x, y: nextFirst.y },
            { typingZoomOut: true, baseScale: options.scale },
          )
        : calculateIntentZoom(nextFirst, { typingZoomOut: options.typingZoomOut, baseScale: options.scale });
      const nextScale = nextIsTyping ? 1.0 : (options.scale ?? nextIntent.scale);
      const nextTypingTarget = nextHasTyping
        ? calculateTypingTarget(nextFirst, options.centerTyping === true)
        : null;
      const clampedNext = nextIsTyping
        ? { x: 0.5, y: 0.5 }
        : nextTypingTarget
          ? clampCameraToBounds(nextTypingTarget.x, nextTypingTarget.y, nextScale, "center")
          : clampCameraToBounds(nextFirst.x + (nextIntent.offsetX || 0), nextFirst.y + nextIntent.offsetY, nextScale, "center");

      const spatial = classifySpatialTransition(clampedLast, clampedNext);
      const glideStart = Math.min(holdTime, Math.max(holdTime - 100, nextFirst.timestampMs - leadInMs));
      const glideEnd = nextFirst.timestampMs;

      if (spatial.type === "crane" && spatial.distance > 0.35) {
        const midTime = Math.round((glideStart + glideEnd) / 2);
        const craneScale = Math.max(1.25, Math.min(clusterScale, nextScale) - 0.15);
        keyframes.push({
          id: `kf-crane-${lastEvt.id}`,
          timeMs: midTime,
          scale: craneScale,
          targetX: (clampedLast.x + clampedNext.x) / 2,
          targetY: (clampedLast.y + clampedNext.y) / 2,
          easing: "cubic",
        });
      }

      keyframes.push({
        id: `kf-glide-${nextFirst.id}`,
        timeMs: glideEnd,
        scale: nextScale,
        targetX: clampedNext.x,
        targetY: clampedNext.y,
        easing: "cubic",
        ...(nextFirst.type === "typing"
          ? { sound: "typing", soundPreset: "mechanical", soundVolume: 0.55 }
          : { sound: "click", soundPreset: "bop", soundVolume: 0.70 }),
      });

      previousGlidedIntoThis = true;
      lastBlockEndTime = glideEnd;
    } else {
      // Keyframe 4: Return to full frame
      keyframes.push({
        id: `kf-out-${lastEvt.id}`,
        timeMs: endMs,
        scale: 1.0,
        targetX: 0.5,
        targetY: 0.5,
        easing: "cubic",
      });

      previousGlidedIntoThis = false;
      lastBlockEndTime = endMs;
    }
  }

  // Strict Invariant: No two ZoomBlocks can ever overlap or stack on the timeline.
  // Blocks separated by rest periods remain distinct isolated zoom events.
  const finalZoomBlocks = enforceNonOverlappingZoomBlocks(zoomBlocks, 0);

  // Deduplicate and filter out redundant micro-keyframes too close in time
  const sortedKf = keyframes
    .filter((kf, index, arr) => arr.findIndex((k) => k.id === kf.id) === index)
    .sort((a, b) => a.timeMs - b.timeMs);

  const uniqueKeyframes: import("./project").KeyframeNode[] = [];
  for (const kf of sortedKf) {
    const prev = uniqueKeyframes[uniqueKeyframes.length - 1];
    if (prev) {
      const dt = kf.timeMs - prev.timeMs;
      // Prevent diamond stacking: enforce minimum 240ms separation between keyframe diamonds
      if (dt < 240) {
        // A return-to-full-screen keyframe (kf-out or scale <= 1.05) following a zoomed-in keyframe
        // must NEVER be dropped, otherwise the camera stays stuck zoomed in!
        if ((kf.scale <= 1.05 || kf.id.includes("kf-out")) && prev.scale > 1.05) {
          kf.timeMs = prev.timeMs + 240;
          uniqueKeyframes.push(kf);
          continue;
        }

        // A user interaction click or typing keyframe must NEVER be dropped by an intermediate synthetic hold/crane keyframe!
        const isKfUserAction = kf.id.includes("kf-track") || kf.id.includes("kf-peak") || kf.sound === "click" || kf.sound === "typing";
        const isPrevSynthetic = prev.id.includes("kf-hold") || prev.id.includes("kf-crane");
        if (isKfUserAction && isPrevSynthetic) {
          uniqueKeyframes.pop();
          uniqueKeyframes.push(kf);
          continue;
        }

        // If both are user clicks at different screen locations, keep both with clean spacing
        if (isKfUserAction && (prev.id.includes("kf-track") || prev.id.includes("kf-peak") || prev.sound === "click")) {
          const dist = Math.hypot(kf.targetX - prev.targetX, kf.targetY - prev.targetY);
          if (dist > 0.03) {
            kf.timeMs = prev.timeMs + 180;
            uniqueKeyframes.push(kf);
            continue;
          }
        }

        // Merge sound cues and effects into prev if prev lacks them
        if (kf.sound && !prev.sound) {
          prev.sound = kf.sound;
          prev.soundPreset = kf.soundPreset;
          prev.soundVolume = kf.soundVolume;
        }
        if (kf.effect && !prev.effect) {
          prev.effect = kf.effect;
        }
        if (kf.scale > prev.scale) {
          prev.scale = kf.scale;
          prev.targetX = kf.targetX;
          prev.targetY = kf.targetY;
        }
        continue;
      }
    }
    uniqueKeyframes.push(kf);
  }

  return { keyframes: uniqueKeyframes, zoomBlocks: finalZoomBlocks };
}

/**
 * Converts and synchronizes an array of ZoomBlocks into continuous, monotonic KeyframeNodes.
 * Ensures the camera smoothly scales in before each zoom, holds steady across interactions,
 * and glides or returns to full frame.
 */
export function zoomBlocksToKeyframes(
  zoomBlocks: ZoomBlock[],
  videoDurationMs: number,
  options?: {
    leadInMs?: number;
    leadOutMs?: number;
    continuousGlide?: boolean;
    maxGlideGapMs?: number;
  },
): import("./project").KeyframeNode[] {
  const active = (zoomBlocks || [])
    .filter((b) => b.enabled)
    .sort((a, b) => a.startTimeMs - b.startTimeMs);

  if (active.length === 0 || videoDurationMs <= 0) return [];

  const keyframes: import("./project").KeyframeNode[] = [];
  const defaultLeadIn = options?.leadInMs ?? 750;
  const defaultLeadOut = options?.leadOutMs ?? 400;
  const maxGlideGapMs = options?.maxGlideGapMs ?? 1000;

  for (let i = 0; i < active.length; i++) {
    const b = active[i]!;
    const prev = active[i - 1];
    const next = active[i + 1];

    const blockShiftDuration = b.shiftDurationMs ?? defaultLeadIn;
    const blockEasing = b.shiftAnimation === "spring"
      ? "spring"
      : b.shiftAnimation === "linear"
        ? "linear"
        : "cubic";

    const rawStart = Math.max(0, b.startTimeMs - blockShiftDuration);
    const glidedFromPrev = Boolean(
      options?.continuousGlide &&
        prev &&
        b.startTimeMs - prev.endTimeMs <= maxGlideGapMs &&
        b.startTimeMs > prev.endTimeMs,
    );

    const startMs = glidedFromPrev ? prev!.endTimeMs : rawStart;
    const holdStartMs = b.startTimeMs;
    const holdEndMs = Math.min(videoDurationMs, b.endTimeMs);
    const endMs = Math.min(videoDurationMs, holdEndMs + defaultLeadOut);

    // Lead-in keyframe: start zooming from 1.0x (unless previous block glided into this one)
    if (!glidedFromPrev) {
      keyframes.push({
        id: `kf-start-${b.id}`,
        timeMs: startMs,
        scale: 1.0,
        targetX: 0.5,
        targetY: 0.5,
        easing: blockEasing,
      });
    }

    // Peak zoom target
    keyframes.push({
      id: `kf-peak-${b.id}`,
      timeMs: holdStartMs,
      scale: b.scale,
      targetX: b.targetX,
      targetY: b.targetY,
      easing: blockEasing === "linear" ? "linear" : blockEasing === "spring" ? "spring" : "cubic",
    });

    // Hold end
    if (holdEndMs > holdStartMs + 100) {
      keyframes.push({
        id: `kf-hold-${b.id}`,
        timeMs: holdEndMs,
        scale: b.scale,
        targetX: b.targetX,
        targetY: b.targetY,
        easing: blockEasing,
      });
    }

    const canGlideToNext = Boolean(
      options?.continuousGlide &&
        next &&
        next.startTimeMs - holdEndMs <= maxGlideGapMs &&
        next.startTimeMs > holdEndMs,
    );

    // If not gliding to next block, return to 1.0x full frame
    if (!canGlideToNext) {
      keyframes.push({
        id: `kf-out-${b.id}`,
        timeMs: endMs,
        scale: 1.0,
        targetX: 0.5,
        targetY: 0.5,
        easing: blockEasing,
      });
    }
  }

  // Deduplicate by id and sort chronologically
  const sorted = keyframes
    .filter((kf, index, arr) => arr.findIndex((k) => k.id === kf.id) === index)
    .sort((a, b) => a.timeMs - b.timeMs);
  const clean: import("./project").KeyframeNode[] = [];
  for (const kf of sorted) {
    const prev = clean[clean.length - 1];
    if (prev && kf.timeMs - prev.timeMs < 220) {
      if ((kf.scale <= 1.05 || kf.id.includes("kf-out")) && prev.scale > 1.05) {
        kf.timeMs = Math.min(videoDurationMs, prev.timeMs + 240);
        clean.push(kf);
        continue;
      }
      if (kf.sound && !prev.sound) {
        prev.sound = kf.sound;
        prev.soundPreset = kf.soundPreset;
        prev.soundVolume = kf.soundVolume;
      }
      if (kf.effect && !prev.effect) {
        prev.effect = kf.effect;
      }
      continue;
    }
    clean.push(kf);
  }
  return clean;
}

export interface TourShiftOptions {
  stepHoldMs?: number;
  scale?: number;
  shiftDurationMs?: number;
}

/**
 * Generates a cinematic walkthrough / tour sequence across focal elements.
 * Rather than zooming out to 1.0x between steps, the camera smoothly glides and shifts
 * between each UI element with an organic crane dip and synchronized audio effects.
 */
export function generateTourShiftSequence(
  events: import("./project").InteractionEvent[],
  videoDurationMs: number,
  options?: TourShiftOptions,
): { keyframes: import("./project").KeyframeNode[]; zoomBlocks: ZoomBlock[] } {
  if (!events || events.length === 0 || videoDurationMs <= 0) {
    return { keyframes: [], zoomBlocks: [] };
  }

  const sorted = [...events].sort((a, b) => a.timestampMs - b.timestampMs);
  const keyframes: import("./project").KeyframeNode[] = [];
  const zoomBlocks: ZoomBlock[] = [];

  const defaultScale = options?.scale ?? 1.85;
  const holdMs = options?.stepHoldMs ?? 1000;
  const leadInMs = 1000;
  const leadOutMs = 400;

  // Initial lead-in zoom from 1.0x full frame into first element
  const first = sorted[0]!;
  const firstStartMs = Math.max(0, first.timestampMs - leadInMs);

  keyframes.push({
    id: `tour-kf-start`,
    timeMs: firstStartMs,
    scale: 1.0,
    targetX: 0.5,
    targetY: 0.5,
    easing: "cubic",
  });

  let prevHoldEndMs = firstStartMs;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const next = sorted[i + 1];
    const isTyping = cur.type === "typing";
    const curScale = isTyping ? 2.1 : defaultScale;
    const clampedCur = clampCameraToBounds(cur.x, cur.y, curScale, "center");

    // Peak focal arrival on element
    const arriveMs = Math.max(prevHoldEndMs, cur.timestampMs);
    keyframes.push({
      id: `tour-arrive-${cur.id}`,
      timeMs: arriveMs,
      scale: curScale,
      targetX: clampedCur.x,
      targetY: clampedCur.y,
      easing: "spring",
      ...(isTyping
        ? { sound: "typing", soundPreset: "mechanical", soundVolume: 0.65 }
        : { sound: "click", soundPreset: "bop", soundVolume: 0.70 }),
    });

    // Hold steady on element
    const elementDuration = cur.durationMs ?? 0;
    const holdEndMs = Math.min(
      videoDurationMs - leadOutMs,
      arriveMs + Math.max(holdMs, elementDuration),
    );

    keyframes.push({
      id: `tour-hold-${cur.id}`,
      timeMs: holdEndMs,
      scale: curScale,
      targetX: clampedCur.x,
      targetY: clampedCur.y,
      easing: "cubic",
    });

    // Camera shift to next element if available
    if (next) {
      const nextTime = next.timestampMs;
      const gap = nextTime - holdEndMs;
      const nextScale = next.type === "typing" ? 2.1 : defaultScale;
      const clampedNext = clampCameraToBounds(next.x, next.y, nextScale, "center");
      const shiftDist = Math.hypot(clampedNext.x - clampedCur.x, clampedNext.y - clampedCur.y);

      if (gap <= 1000) {
        // Snappy direct glide between nearby events
        const shiftSpan = Math.max(400, Math.min(900, Math.max(400, gap)));
        const shiftMid = holdEndMs + Math.round(shiftSpan / 2);

        if (shiftDist > 0.20) {
          // Crane dip midway through camera glide
          const craneScale = Math.max(1.25, Math.min(curScale, nextScale) - 0.25);
          keyframes.push({
            id: `tour-crane-${cur.id}`,
            timeMs: shiftMid,
            scale: craneScale,
            targetX: (clampedCur.x + clampedNext.x) / 2,
            targetY: (clampedCur.y + clampedNext.y) / 2,
            easing: "cubic",
          });
        }
        prevHoldEndMs = holdEndMs + shiftSpan;
      } else {
        // Gap > 1000ms: user is inactive! Zoom out smoothly to 1.0x full frame
        const outEndMs = Math.min(nextTime - 800, holdEndMs + leadOutMs);
        keyframes.push({
          id: `tour-out-${cur.id}`,
          timeMs: outEndMs,
          scale: 1.0,
          targetX: 0.5,
          targetY: 0.5,
          easing: "cubic",
        });

        // Lead-in into next element starts smoothly before nextTime
        const inStartMs = Math.max(outEndMs, nextTime - leadInMs);
        keyframes.push({
          id: `tour-in-${next.id}`,
          timeMs: inStartMs,
          scale: 1.0,
          targetX: 0.5,
          targetY: 0.5,
          easing: "cubic",
        });

        prevHoldEndMs = inStartMs;
      }
    } else {
      // Final return to full frame
      const endMs = Math.min(videoDurationMs, holdEndMs + leadOutMs);
      keyframes.push({
        id: `tour-kf-out`,
        timeMs: endMs,
        scale: 1.0,
        targetX: 0.5,
        targetY: 0.5,
        easing: "cubic",
      });
      prevHoldEndMs = endMs;
    }

    // ZoomBlock bounds: glide into next if nearby, otherwise end cleanly after hold + leadOut
    const blockEnd =
      next && next.timestampMs - holdEndMs <= 1000
        ? next.timestampMs
        : Math.min(videoDurationMs, holdEndMs + leadOutMs);

    zoomBlocks.push({
      id: `tour-block-${i + 1}`,
      startTimeMs: arriveMs,
      endTimeMs: blockEnd,
      targetX: clampedCur.x,
      targetY: clampedCur.y,
      scale: curScale,
      enabled: true,
    });
  }

  const uniqueKeyframes = keyframes
    .filter((kf, index, arr) => arr.findIndex((k) => k.id === kf.id) === index)
    .sort((a, b) => a.timeMs - b.timeMs);

  return { keyframes: uniqueKeyframes, zoomBlocks };
}



/**
 * Maps a normalized point in source-video space (0..1) to normalized viewport
 * space when the video is rendered with "cover" fitting (center-cropped) into a
 * viewport of a different aspect ratio. Keeps the cursor, ripples and camera
 * locked onto the actual pixels shown on screen and in export.
 *
 * Math: with object-fit:cover the video is uniformly scaled until it fills the
 * viewport in both dimensions. If videoAspect > viewAspect the video is scaled
 * to fill height and the excess width is cropped symmetrically. A point at
 * video x=0.3 appears in viewport at:
 *   x_vp = 0.5 + (x - 0.5) * (viewAspect / videoAspect)   [compressed toward center]
 * The inverse (expanding) transform was wrong — it pushed the focal point
 * AWAY from center, causing zoom to land off-target and producing camera shake.
 */
export function mapVideoPointToViewport(
  x: number,
  y: number,
  videoAspect: number | null | undefined,
  viewAspect: number | null | undefined,
): { x: number; y: number } {
  if (!videoAspect || !viewAspect || !isFinite(videoAspect) || !isFinite(viewAspect)) {
    return { x, y };
  }
  if (videoAspect > viewAspect) {
    // Video wider than viewport → sides cropped → compress x toward center
    return { x: 0.5 + (x - 0.5) * (viewAspect / videoAspect), y };
  }
  if (videoAspect < viewAspect) {
    // Video taller than viewport → top/bottom cropped → compress y toward center
    return { x, y: 0.5 + (y - 0.5) * (videoAspect / viewAspect) };
  }
  return { x, y };
}

/**
 * Returns the recorded cursor trajectory, or, when none was captured (imported
 * clips), a fallback path that glides the cursor between the recorded clicks so
 * the overlay cursor still moves instead of sitting frozen at the center.
 */
export function ensureCursorTrajectory(
  trajectory: import("./project").CursorTrajectoryPoint[] | undefined,
  clicks: Array<{ timestampMs: number; x: number; y: number }> | undefined,
): import("./project").CursorTrajectoryPoint[] {
  if (trajectory && trajectory.length > 0) return trajectory;
  if (!clicks || clicks.length === 0) return trajectory ?? [];
  const sorted = [...clicks].sort((a, b) => a.timestampMs - b.timestampMs);
  const pts: import("./project").CursorTrajectoryPoint[] = [];
  const first = sorted[0]!;
  if (first.timestampMs > 0) pts.push({ timestampMs: 0, x: 0.5, y: 0.5 });
  for (const c of sorted) {
    pts.push({ timestampMs: c.timestampMs, x: c.x, y: c.y });
  }
  return pts;
}
