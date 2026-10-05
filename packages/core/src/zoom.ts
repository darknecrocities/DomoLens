import type { ClickEvent, ZoomBlock } from "./project";

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
  leadInMs: 350,
  leadOutMs: 400,
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
 * Clamps center coordinates so the zoomed viewport does not bleed outside [0, 1].
 */
export function clampCameraToBounds(targetX: number, targetY: number, scale: number): { x: number; y: number } {
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
 * Applies a 2D camera deadzone around the cursor.
 * When the mouse cursor moves within the central deadzone box, the camera remains
 * rock-solid still (eliminating tremor). When the cursor crosses outside, the camera
 * gently follows the mouse using spring-damped tracking.
 */
export function calculateDeadzoneCamera(
  cameraCenter: { x: number; y: number },
  cursor: { x: number; y: number },
  scale: number,
  deadzoneRatio = 0.35,
): { x: number; y: number } {
  if (scale <= 1.0) return { x: 0.5, y: 0.5 };
  const visW = 1.0 / scale;
  const visH = 1.0 / scale;
  const halfDzW = (visW * deadzoneRatio) / 2;
  const halfDzH = (visH * deadzoneRatio) / 2;

  let newX = cameraCenter.x;
  let newY = cameraCenter.y;

  const diffX = cursor.x - cameraCenter.x;
  if (diffX > halfDzW) {
    newX = cursor.x - halfDzW;
  } else if (diffX < -halfDzW) {
    newX = cursor.x + halfDzW;
  }

  const diffY = cursor.y - cameraCenter.y;
  if (diffY > halfDzH) {
    newY = cursor.y - halfDzH;
  } else if (diffY < -halfDzH) {
    newY = cursor.y + halfDzH;
  }

  return clampCameraToBounds(newX, newY, scale);
}

/**
 * Calculates adaptive zoom scale and hold parameters based on user interaction intent.
 */
export function calculateIntentZoom(
  event: import("./project").InteractionEvent | import("./project").ClickEvent,
): { scale: number; holdMs: number; offsetY: number } {
  const isTyping = "type" in event && event.type === "typing";
  if (isTyping) {
    return { scale: 2.1, holdMs: 2600, offsetY: -0.015 };
  }
  const isRightClick = event.button === "right";
  if (isRightClick) {
    return { scale: 1.7, holdMs: 2200, offsetY: 0.04 };
  }
  return { scale: 1.85, holdMs: 2000, offsetY: 0 };
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

  // Sort clicks by time
  const sorted = [...clicks].sort((a, b) => a.timestampMs - b.timestampMs);

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
      const clamped = clampCameraToBounds(cluster.centerX, cluster.centerY, options.defaultScale);

      blocks.push({
        id,
        startTimeMs: actualStart,
        endTimeMs: Math.max(actualStart + options.minDurationMs, rawEnd),
        targetX: clamped.x,
        targetY: clamped.y,
        scale: options.defaultScale,
        enabled: true,
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
 * Interpolates cursor coordinates at any given playback timestamp.
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

  for (let i = 0; i < trajectory.length - 1; i++) {
    const p1 = trajectory[i]!;
    const p2 = trajectory[i + 1]!;
    if (timeMs >= p1.timestampMs && timeMs <= p2.timestampMs) {
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

  for (let i = 1; i < points.length; i++) {
    const pt = points[i]!;
    const prev = smoothed[i - 1]!;

    const nearClick = clicks?.find(
      (c) => Math.abs(c.timestampMs - pt.timestampMs) <= clickToleranceMs,
    );

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
  leadInMs = 500,
  leadOutMs = 400,
  cursorTrajectory?: import("./project").CursorTrajectoryPoint[],
  keyframes?: import("./project").KeyframeNode[],
  options?: CameraOptions,
): CameraStateWithCursor {
  const isAutoTrack = options?.autoTrackCursor !== false;
  const effectiveTrajectory =
    options?.cursorSmoothing && options.cursorSmoothing !== "none" && cursorTrajectory
      ? smoothCursorTrajectory(cursorTrajectory, options.cursorSmoothing, options.clicks)
      : cursorTrajectory;
  const defaultCursor = interpolateCursorAtTime(timeMs, effectiveTrajectory, 0.5, 0.5);

  // If discrete keyframe nodes are provided, use high-precision keyframe interpolation
  if (keyframes && keyframes.length >= 2) {
    const sortedKf = [...keyframes].sort((a, b) => a.timeMs - b.timeMs);
    const firstKf = sortedKf[0]!;
    const lastKf = sortedKf[sortedKf.length - 1]!;

    if (timeMs <= firstKf.timeMs) {
      // If first keyframe has a scale > 1.05 and is not at time 0,
      // playback before firstKf should be baseline 1.0x full-screen!
      if (firstKf.timeMs > 0 && firstKf.scale > 1.05) {
        return {
          x: 0.5,
          y: 0.5,
          scale: 1.0,
          isZoomed: false,
          cursorX: defaultCursor.x,
          cursorY: defaultCursor.y,
        };
      }
      let finalX = firstKf.targetX;
      let finalY = firstKf.targetY;
      if (firstKf.scale > 1.05 && effectiveTrajectory && effectiveTrajectory.length > 0) {
        const tracked = calculateDeadzoneCamera(
          { x: firstKf.targetX, y: firstKf.targetY },
          defaultCursor,
          firstKf.scale,
          isAutoTrack ? 0.22 : 0.30,
        );
        finalX = tracked.x;
        finalY = tracked.y;
      }
      return {
        x: finalX,
        y: finalY,
        scale: firstKf.scale,
        isZoomed: firstKf.scale > 1.05,
        cursorX: defaultCursor.x,
        cursorY: defaultCursor.y,
      };
    }

    if (timeMs >= lastKf.timeMs) {
      let finalX = lastKf.targetX;
      let finalY = lastKf.targetY;
      if (lastKf.scale > 1.05 && effectiveTrajectory && effectiveTrajectory.length > 0) {
        const tracked = calculateDeadzoneCamera(
          { x: lastKf.targetX, y: lastKf.targetY },
          defaultCursor,
          lastKf.scale,
          isAutoTrack ? 0.22 : 0.30,
        );
        finalX = tracked.x;
        finalY = tracked.y;
      }
      return {
        x: finalX,
        y: finalY,
        scale: lastKf.scale,
        isZoomed: lastKf.scale > 1.05,
        cursorX: defaultCursor.x,
        cursorY: defaultCursor.y,
      };
    }

    for (let k = 0; k < sortedKf.length - 1; k++) {
      const k1 = sortedKf[k]!;
      const k2 = sortedKf[k + 1]!;
      if (timeMs >= k1.timeMs && timeMs <= k2.timeMs) {
        const span = k2.timeMs - k1.timeMs;
        const progress = span > 0 ? easeInOutCubic((timeMs - k1.timeMs) / span) : 1;
        const scale = k1.scale + (k2.scale - k1.scale) * progress;
        const baseTargetX = k1.targetX + (k2.targetX - k1.targetX) * progress;
        const baseTargetY = k1.targetY + (k2.targetY - k1.targetY) * progress;
        const cursor = interpolateCursorAtTime(timeMs, effectiveTrajectory, baseTargetX, baseTargetY);

        let finalX = baseTargetX;
        let finalY = baseTargetY;

        // When zoomed in or transitioning, smoothly follow the cursor frame-by-frame with spring damping
        if (scale > 1.05 && effectiveTrajectory && effectiveTrajectory.length > 0) {
          const tracked = calculateDeadzoneCamera(
            { x: baseTargetX, y: baseTargetY },
            cursor,
            scale,
            isAutoTrack ? 0.22 : 0.30,
          );

          if (k1.scale <= 1.05) {
            // Zooming in from full frame: smoothly glide from 0.5 center to target cursor position
            finalX = 0.5 + (tracked.x - 0.5) * progress;
            finalY = 0.5 + (tracked.y - 0.5) * progress;
          } else if (k2.scale <= 1.05) {
            // Zooming out to full frame: smoothly glide from target cursor position to 0.5 center
            finalX = tracked.x + (0.5 - tracked.x) * progress;
            finalY = tracked.y + (0.5 - tracked.y) * progress;
          } else {
            // Actively zoomed in: responsive cursor tracking with spatial glide between keyframe points
            finalX = tracked.x;
            finalY = tracked.y;
          }
        } else if (scale > 1.0) {
          const clamped = clampCameraToBounds(baseTargetX, baseTargetY, scale);
          finalX = clamped.x;
          finalY = clamped.y;
        } else {
          finalX = 0.5;
          finalY = 0.5;
        }

        return {
          x: finalX,
          y: finalY,
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
    if (isAutoTrack && effectiveTrajectory && effectiveTrajectory.length > 0) {
      const autoScale = options?.autoTrackScale ?? 1.6;
      const target = clampCameraToBounds(defaultCursor.x, defaultCursor.y, autoScale);
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

    const transitionInStart = Math.max(0, block.startTimeMs - leadInMs);
    const transitionInEnd = block.startTimeMs;
    const transitionOutStart = block.endTimeMs;
    const transitionOutEnd = block.endTimeMs + leadOutMs;

    // Track moving cursor or block target
    const currentCursor = interpolateCursorAtTime(timeMs, effectiveTrajectory, block.targetX, block.targetY);

    const maxGlideGapMs = 4500;
    const prevBlock = i > 0 ? activeBlocks[i - 1] : undefined;
    const glidedFromPrev = Boolean(
      prevBlock &&
        block.startTimeMs - prevBlock.endTimeMs <= maxGlideGapMs &&
        block.startTimeMs > prevBlock.endTimeMs,
    );

    // 1. Inside lead-in transition: smoothly zoom in while tracking the moving cursor
    // If previous block already glided into this block, camera is already zoomed in and tracking
    if (!glidedFromPrev && timeMs >= transitionInStart && timeMs < transitionInEnd) {
      const span = transitionInEnd - transitionInStart;
      const progress = span > 0 ? easeInOutCubic((timeMs - transitionInStart) / span) : 1;
      const target = clampCameraToBounds(currentCursor.x, currentCursor.y, block.scale);
      return {
        x: 0.5 + (target.x - 0.5) * progress,
        y: 0.5 + (target.y - 0.5) * progress,
        scale: 1.0 + (block.scale - 1.0) * progress,
        isZoomed: true,
        cursorX: currentCursor.x,
        cursorY: currentCursor.y,
      };
    }

    // 2. Inside active zoom hold: apply dynamic cursor tracking
    if (timeMs >= transitionInEnd && timeMs <= transitionOutStart) {
      const target = calculateDeadzoneCamera(
        { x: block.targetX, y: block.targetY },
        currentCursor,
        block.scale,
        isAutoTrack ? 0.22 : 0.30,
      );
      return {
        x: target.x,
        y: target.y,
        scale: block.scale,
        isZoomed: true,
        cursorX: currentCursor.x,
        cursorY: currentCursor.y,
      };
    }

    // 3. Between this block and next block: glide smoothly across fields if within 4500ms
    if (
      nextBlock &&
      nextBlock.startTimeMs - transitionOutStart <= maxGlideGapMs &&
      nextBlock.startTimeMs > transitionOutStart
    ) {
      if (timeMs > transitionOutStart && timeMs <= nextBlock.startTimeMs) {
        const span = nextBlock.startTimeMs - transitionOutStart;
        const progress = span > 0 ? easeInOutCubic((timeMs - transitionOutStart) / span) : 1;
        const target1 = clampCameraToBounds(block.targetX, block.targetY, block.scale);
        const nextCursor = interpolateCursorAtTime(timeMs, effectiveTrajectory, nextBlock.targetX, nextBlock.targetY);
        const target2 = clampCameraToBounds(nextCursor.x, nextCursor.y, nextBlock.scale);

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
          isZoomed: true,
          cursorX: currentCursor.x,
          cursorY: currentCursor.y,
        };
      }
    }

    // 4. Return to full frame when true inactivity lull occurs (> 4500ms) or end of video
    if (timeMs > transitionOutStart && timeMs <= transitionOutEnd) {
      const span = transitionOutEnd - transitionOutStart;
      const progress = span > 0 ? easeInOutCubic((timeMs - transitionOutStart) / span) : 1;
      const target = clampCameraToBounds(block.targetX, block.targetY, block.scale);
      return {
        x: target.x + (0.5 - target.x) * progress,
        y: target.y + (0.5 - target.y) * progress,
        scale: block.scale + (1.0 - block.scale) * progress,
        isZoomed: true,
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

  // Filter out negative timestamps and interactions within 400ms of video end (stop recording artifacts)
  const validCutoff = Math.max(0, videoDurationMs - 400);
  const validInteractions = events.filter((e) => e.timestampMs >= 0 && e.timestampMs <= validCutoff);

  if (validInteractions.length === 0) {
    return { keyframes: [], zoomBlocks: [] };
  }

  // 0.5s lead-in: camera starts zooming into place 500ms before user interaction
  const leadInMs = options.leadInMs ?? 500;
  const leadOutMs = options.leadOutMs ?? 400;
  const minDuration = options.minBlockDurationMs ?? 1000;
  // Actions within 1.5s remain in continuous zoom; if no activity for 1s, camera shifts back to full frame
  const clusterGapMs = options.inactivityResetMs ?? 1500;

  const sorted = [...validInteractions].sort((a, b) => a.timestampMs - b.timestampMs);

  // Group events into clusters
  const clusters: import("./project").InteractionEvent[][] = [];
  let currentCluster: import("./project").InteractionEvent[] = [];

  for (const event of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(event);
    } else {
      const prev = currentCluster[currentCluster.length - 1]!;
      const prevEffectiveEnd = prev.timestampMs + (prev.durationMs ?? 0);
      if (event.timestampMs - prevEffectiveEnd <= clusterGapMs) {
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
    const intent = hasTyping
      ? calculateIntentZoom({ id: firstEvt.id, type: "typing", timestampMs: firstEvt.timestampMs, x: firstEvt.x, y: firstEvt.y })
      : calculateIntentZoom(firstEvt);
    const clusterScale = options.scale ?? intent.scale;
    const clusterHoldMs = options.holdDurationMs ?? 1000;

    const rawStart = Math.max(0, firstEvt.timestampMs - leadInMs);
    let startMs = Math.max(lastBlockEndTime, rawStart);

    const clusterEndTime = Math.max(
      lastEvt.timestampMs,
      ...cluster.map((e) => e.timestampMs + (e.durationMs ?? 0)),
    );

    const rawEnd = clusterEndTime + clusterHoldMs + leadOutMs;
    let endMs = Math.min(videoDurationMs, rawEnd);

    // If block is too short near video end, attempt to extend start backward to sustain the zoom
    if (endMs - startMs < minDuration) {
      const expandedStart = Math.max(lastBlockEndTime, endMs - minDuration);
      if (endMs - expandedStart >= 900) {
        startMs = expandedStart;
      } else {
        // Cannot fit a visible zoom block before video finishes; skip cluster
        continue;
      }
    }

    const span = endMs - startMs;
    if (span < 800) continue;

    const clampedFirst = clampCameraToBounds(firstEvt.x, firstEvt.y + intent.offsetY, clusterScale);

    // Check if next cluster is eligible for continuous glide
    const maxGlideGap = options.maxGlideGapMs ?? 3800;
    const canGlideToNext = Boolean(
      options.continuousGlide &&
        nextCluster &&
        nextCluster[0]!.timestampMs - clusterEndTime <= maxGlideGap &&
        nextCluster[0]!.timestampMs > clusterEndTime,
    );

    const blockEnd = canGlideToNext
      ? Math.max(endMs, nextCluster![0]!.timestampMs)
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
    });

    // Strictly monotonic keyframe calculations:
    // startMs < peakTime <= trackTimes <= holdTime < endMs
    const effLeadIn = Math.min(leadInMs, Math.round(span * 0.22));
    const effLeadOut = Math.min(leadOutMs, Math.round(span * 0.22));

    // Keyframe 1: Start zoom lead-in (only if previous cluster did not already glide into this cluster)
    if (!previousGlidedIntoThis) {
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

      keyframes.push({
        id: `kf-peak-${firstEvt.id}`,
        timeMs: peakTime,
        scale: clusterScale,
        targetX: clampedFirst.x,
        targetY: clampedFirst.y,
        easing: "spring",
        ...(firstEvt.type === "typing"
          ? { sound: "typing", soundPreset: "mechanical", soundVolume: 0.65 }
          : { sound: "click", soundPreset: "bop", soundVolume: 0.70 }),
      });

      // Video Editor Showcase Arc: after focusing tightly on the button click,
      // automatically zoom out a little (showcase context reveal) to show what changed on screen,
      // then smoothly track cursor movement during the hold.
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

    // If first interaction is a continuous typing session with durationMs > 600ms,
    // add intermediate tracking keyframes across the typing duration with typing sound effects
    if (firstEvt.type === "typing" && (firstEvt.durationMs ?? 0) > 600) {
      const typeDuration = firstEvt.durationMs!;
      const step = Math.max(300, Math.min(600, Math.round(typeDuration / 3)));
      for (let tOffset = step; tOffset <= typeDuration; tOffset += step) {
        const typingTime = firstEvt.timestampMs + tOffset;
        if (typingTime < endMs - effLeadOut - 100) {
          keyframes.push({
            id: `kf-type-${firstEvt.id}-${tOffset}`,
            timeMs: typingTime,
            scale: clusterScale,
            targetX: clampedFirst.x,
            targetY: clampedFirst.y,
            easing: "cubic",
            sound: "typing",
            soundPreset: "mechanical",
            soundVolume: 0.60,
          });
        }
      }
    }

    // Intermediate tracking keyframes for multiple actions in cluster
    for (let j = 1; j < cluster.length; j++) {
      const midEvt = cluster[j]!;
      const clampedMid = clampCameraToBounds(midEvt.x, midEvt.y, clusterScale);
      const trackMin = firstEvt.timestampMs + 60;
      const trackMax = Math.max(trackMin, endMs - effLeadOut - 100);
      const trackTime = Math.max(trackMin, Math.min(trackMax, midEvt.timestampMs));

      keyframes.push({
        id: `kf-track-${midEvt.id}`,
        timeMs: trackTime,
        scale: clusterScale,
        targetX: clampedMid.x,
        targetY: clampedMid.y,
        easing: "spring",
        ...(midEvt.type === "typing"
          ? { sound: "typing", soundPreset: "mechanical", soundVolume: 0.65 }
          : { sound: "click", soundPreset: "bop", soundVolume: 0.70 }),
      });
    }

    // Keyframe 3: End of hold before lead-out or glide
    const idealHoldEnd = clusterEndTime + clusterHoldMs;
    const minHold = firstEvt.timestampMs + 100;
    const maxHold = Math.max(minHold, endMs - effLeadOut);
    const holdTime = Math.max(minHold, Math.min(maxHold, idealHoldEnd));
    const clampedLast = clampCameraToBounds(lastEvt.x, lastEvt.y, clusterScale);
    const effectiveHoldScale = Math.max(1.32, Math.round(clusterScale * 0.78 * 100) / 100);

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
      const nextIntent = nextHasTyping
        ? calculateIntentZoom({ id: nextFirst.id, type: "typing", timestampMs: nextFirst.timestampMs, x: nextFirst.x, y: nextFirst.y })
        : calculateIntentZoom(nextFirst);
      const nextScale = options.scale ?? nextIntent.scale;
      const clampedNext = clampCameraToBounds(nextFirst.x, nextFirst.y + nextIntent.offsetY, nextScale);

      const spatial = classifySpatialTransition(clampedLast, clampedNext);
      const glideStart = Math.min(holdTime, Math.max(holdTime - 100, nextFirst.timestampMs - leadInMs));
      const glideEnd = nextFirst.timestampMs;

      if (spatial.type === "crane") {
        const midTime = Math.round((glideStart + glideEnd) / 2);
        const craneScale = Math.max(1.2, Math.min(clusterScale, nextScale) - spatial.recommendedScaleDip);
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
        easing: "spring",
        ...(nextFirst.type === "typing"
          ? { sound: "typing", soundPreset: "mechanical", soundVolume: 0.65 }
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
      lastBlockEndTime = endMs + 50;
    }
  }

  // Deduplicate and sort keyframes chronologically
  const uniqueKeyframes = keyframes
    .filter((kf, index, arr) => arr.findIndex((k) => k.id === kf.id) === index)
    .sort((a, b) => a.timeMs - b.timeMs);

  return { keyframes: uniqueKeyframes, zoomBlocks };
}


