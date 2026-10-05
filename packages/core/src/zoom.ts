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

/**
 * Calculates smooth camera position, scale, and live cursor position at any timestamp,
 * dynamically tracking the mouse during zoom-in and hold.
 */
export function calculateCameraAtTime(
  timeMs: number,
  zoomBlocks: ZoomBlock[],
  leadInMs = 350,
  leadOutMs = 400,
  cursorTrajectory?: import("./project").CursorTrajectoryPoint[],
  keyframes?: import("./project").KeyframeNode[],
): CameraStateWithCursor {
  const defaultCursor = interpolateCursorAtTime(timeMs, cursorTrajectory, 0.5, 0.5);

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
      if (firstKf.scale > 1.05 && cursorTrajectory && cursorTrajectory.length > 0) {
        const tracked = calculateDeadzoneCamera(
          { x: firstKf.targetX, y: firstKf.targetY },
          defaultCursor,
          firstKf.scale,
          0.30,
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
      if (lastKf.scale > 1.05 && cursorTrajectory && cursorTrajectory.length > 0) {
        const tracked = calculateDeadzoneCamera(
          { x: lastKf.targetX, y: lastKf.targetY },
          defaultCursor,
          lastKf.scale,
          0.30,
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
        const cursor = interpolateCursorAtTime(timeMs, cursorTrajectory, baseTargetX, baseTargetY);

        let finalX = baseTargetX;
        let finalY = baseTargetY;

        // When zoomed in, smoothly follow the cursor frame-by-frame with spring deadzone damping
        if (scale > 1.05 && cursorTrajectory && cursorTrajectory.length > 0) {
          const tracked = calculateDeadzoneCamera(
            { x: baseTargetX, y: baseTargetY },
            cursor,
            scale,
            0.30,
          );
          finalX = tracked.x;
          finalY = tracked.y;
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
    const currentCursor = interpolateCursorAtTime(timeMs, cursorTrajectory, block.targetX, block.targetY);

    // 1. Inside lead-in transition: smoothly zoom in while tracking the moving cursor
    if (timeMs >= transitionInStart && timeMs < transitionInEnd) {
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

    // 2. Inside active zoom hold: apply 2D deadzone camera tracking
    if (timeMs >= transitionInEnd && timeMs <= transitionOutStart) {
      const deadzoneTarget = calculateDeadzoneCamera(
        { x: block.targetX, y: block.targetY },
        currentCursor,
        block.scale,
        0.30,
      );
      return {
        x: deadzoneTarget.x,
        y: deadzoneTarget.y,
        scale: block.scale,
        isZoomed: true,
        cursorX: currentCursor.x,
        cursorY: currentCursor.y,
      };
    }

    // 3. Inside lead-out transition: smoothly glide from cursor back to full screen center or next block
    if (timeMs > transitionOutStart && timeMs <= transitionOutEnd) {
      if (nextBlock && nextBlock.startTimeMs <= transitionOutEnd + leadInMs) {
        const nextInStart = transitionOutStart;
        const nextInEnd = Math.max(transitionOutStart + 50, nextBlock.startTimeMs);
        if (timeMs <= nextInEnd) {
          const span = nextInEnd - nextInStart;
          const progress = span > 0 ? easeInOutCubic((timeMs - nextInStart) / span) : 1;
          const target1 = clampCameraToBounds(block.targetX, block.targetY, block.scale);
          const nextCursor = interpolateCursorAtTime(timeMs, cursorTrajectory, nextBlock.targetX, nextBlock.targetY);
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
}

/**
 * Translates recorded click and typing interactions into iterative 2-3 second auto-zooms
 * that track the mouse/cursor and smoothly return to full screen throughout the video.
 * Clusters rapid consecutive actions (e.g. typing or quick succession clicks) so they
 * continuously track the pointer instead of queuing up delayed jumps into the future.
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

  const leadInMs = 300;
  const leadOutMs = 400;
  const minDuration = options.minBlockDurationMs ?? 1400;
  const clusterGapMs = 2200; // actions within 2.2s are merged into a continuous zoom

  const sorted = [...validInteractions].sort((a, b) => a.timestampMs - b.timestampMs);

  // Group events into clusters
  const clusters: import("./project").InteractionEvent[][] = [];
  let currentCluster: import("./project").InteractionEvent[] = [];

  for (const event of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(event);
    } else {
      const prev = currentCluster[currentCluster.length - 1]!;
      if (event.timestampMs - prev.timestampMs <= clusterGapMs) {
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

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i]!;
    const firstEvt = cluster[0]!;
    const lastEvt = cluster[cluster.length - 1]!;

    const hasTyping = cluster.some((e) => "type" in e && e.type === "typing");
    const intent = hasTyping
      ? calculateIntentZoom({ id: firstEvt.id, type: "typing", timestampMs: firstEvt.timestampMs, x: firstEvt.x, y: firstEvt.y })
      : calculateIntentZoom(firstEvt);
    const clusterScale = options.scale ?? intent.scale;
    const clusterHoldMs = options.holdDurationMs ?? intent.holdMs;

    const rawStart = Math.max(0, firstEvt.timestampMs - leadInMs);
    let startMs = Math.max(lastBlockEndTime, rawStart);

    const rawEnd = lastEvt.timestampMs + clusterHoldMs + leadOutMs;
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

    // Timeline ZoomBlock
    zoomBlocks.push({
      id: `zoom-auto-${i + 1}`,
      startTimeMs: startMs,
      endTimeMs: endMs,
      targetX: clampedFirst.x,
      targetY: clampedFirst.y,
      scale: clusterScale,
      enabled: true,
    });

    // Strictly monotonic keyframe calculations:
    // startMs < peakTime <= trackTimes <= holdTime < endMs
    const effLeadIn = Math.min(leadInMs, Math.round(span * 0.22));
    const effLeadOut = Math.min(leadOutMs, Math.round(span * 0.22));

    // Keyframe 1: Start zoom lead-in (1.0x full frame)
    keyframes.push({
      id: `kf-start-${firstEvt.id}`,
      timeMs: startMs,
      scale: 1.0,
      targetX: 0.5,
      targetY: 0.5,
      easing: "cubic",
    });

    // Keyframe 2: Peak zoom reached
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
    });

    // Intermediate tracking keyframes for multiple actions in cluster
    for (let j = 1; j < cluster.length; j++) {
      const midEvt = cluster[j]!;
      const clampedMid = clampCameraToBounds(midEvt.x, midEvt.y, clusterScale);
      const trackMin = peakTime + 60;
      const trackMax = Math.max(trackMin, endMs - effLeadOut - 100);
      const trackTime = Math.max(trackMin, Math.min(trackMax, midEvt.timestampMs));

      keyframes.push({
        id: `kf-track-${midEvt.id}`,
        timeMs: trackTime,
        scale: clusterScale,
        targetX: clampedMid.x,
        targetY: clampedMid.y,
        easing: "spring",
      });
    }

    // Keyframe 3: End of hold before lead-out
    const idealHoldEnd = lastEvt.timestampMs + clusterHoldMs;
    const minHold = peakTime + 100;
    const maxHold = Math.max(minHold, endMs - effLeadOut);
    const holdTime = Math.max(minHold, Math.min(maxHold, idealHoldEnd));

    if (holdTime > peakTime + 80) {
      const clampedLast = clampCameraToBounds(lastEvt.x, lastEvt.y, clusterScale);
      keyframes.push({
        id: `kf-hold-${lastEvt.id}`,
        timeMs: holdTime,
        scale: clusterScale,
        targetX: clampedLast.x,
        targetY: clampedLast.y,
        easing: "cubic",
      });
    }

    // Keyframe 4: Return to full frame
    keyframes.push({
      id: `kf-out-${lastEvt.id}`,
      timeMs: endMs,
      scale: 1.0,
      targetX: 0.5,
      targetY: 0.5,
      easing: "cubic",
    });

    lastBlockEndTime = endMs + 50;
  }

  // Deduplicate and sort keyframes chronologically
  const uniqueKeyframes = keyframes
    .filter((kf, index, arr) => arr.findIndex((k) => k.id === kf.id) === index)
    .sort((a, b) => a.timeMs - b.timeMs);

  return { keyframes: uniqueKeyframes, zoomBlocks };
}


