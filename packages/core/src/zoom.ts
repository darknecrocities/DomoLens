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
      return {
        x: lastKf.targetX,
        y: lastKf.targetY,
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
        const targetX = k1.targetX + (k2.targetX - k1.targetX) * progress;
        const targetY = k1.targetY + (k2.targetY - k1.targetY) * progress;
        const cursor = interpolateCursorAtTime(timeMs, cursorTrajectory, targetX, targetY);
        return {
          x: targetX,
          y: targetY,
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

    // 2. Inside active zoom hold: camera actively tracks the mouse across the screen
    if (timeMs >= transitionInEnd && timeMs <= transitionOutStart) {
      const target = clampCameraToBounds(currentCursor.x, currentCursor.y, block.scale);
      return {
        x: target.x,
        y: target.y,
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
          const target1 = clampCameraToBounds(currentCursor.x, currentCursor.y, block.scale);
          const nextCursor = interpolateCursorAtTime(timeMs, cursorTrajectory, nextBlock.targetX, nextBlock.targetY);
          const target2 = clampCameraToBounds(nextCursor.x, nextCursor.y, nextBlock.scale);
          return {
            x: target1.x + (target2.x - target1.x) * progress,
            y: target1.y + (target2.y - target1.y) * progress,
            scale: block.scale + (nextBlock.scale - block.scale) * progress,
            isZoomed: true,
            cursorX: currentCursor.x,
            cursorY: currentCursor.y,
          };
        }
      }

      const span = transitionOutEnd - transitionOutStart;
      const progress = span > 0 ? easeInOutCubic((timeMs - transitionOutStart) / span) : 1;
      const target = clampCameraToBounds(currentCursor.x, currentCursor.y, block.scale);
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

/**
 * Translates recorded click and typing interactions into iterative 2-3 second auto-zooms
 * that track the mouse/cursor and smoothly return to full screen throughout the video.
 * Clusters rapid consecutive actions (e.g. typing or quick succession clicks) so they
 * continuously track the pointer instead of queuing up delayed jumps into the future.
 */
export function plotInteractionsToKeyframesAndZoomBlocks(
  interactions: import("./project").InteractionEvent[],
  videoDurationMs: number,
  options: { holdDurationMs?: number; scale?: number } = {},
): { keyframes: import("./project").KeyframeNode[]; zoomBlocks: ZoomBlock[] } {
  if (interactions.length === 0 || videoDurationMs <= 0) {
    return { keyframes: [], zoomBlocks: [] };
  }

  const holdMs = options.holdDurationMs ?? 2400; // 2.4 seconds hold (within 2-3s range)
  const scale = options.scale ?? 1.85;
  const leadInMs = 300;
  const leadOutMs = 400;
  const clusterGapMs = 2200; // actions within 2.2s are merged into a continuous zoom

  const sorted = [...interactions].sort((a, b) => a.timestampMs - b.timestampMs);

  // Group events into clusters
  const clusters: import("./project").InteractionEvent[][] = [];
  let currentCluster: import("./project").InteractionEvent[] = [];

  for (const event of sorted) {
    if (event.timestampMs < 0 || event.timestampMs > videoDurationMs) continue;

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

    const rawStart = Math.max(0, firstEvt.timestampMs - leadInMs);
    const startMs = Math.max(lastBlockEndTime, rawStart);

    const rawEnd = lastEvt.timestampMs + holdMs + leadOutMs;
    const endMs = Math.min(videoDurationMs, Math.max(startMs + leadInMs + 600, rawEnd));

    if (endMs <= startMs) continue;

    const clampedFirst = clampCameraToBounds(firstEvt.x, firstEvt.y, scale);

    // ZoomBlock for timeline
    zoomBlocks.push({
      id: `zoom-auto-${i + 1}`,
      startTimeMs: startMs,
      endTimeMs: endMs,
      targetX: clampedFirst.x,
      targetY: clampedFirst.y,
      scale,
      enabled: true,
    });

    // Keyframe 1: Start zoom lead-in (1.0x full frame)
    keyframes.push({
      id: `kf-start-${firstEvt.id}`,
      timeMs: startMs,
      scale: 1.0,
      targetX: 0.5,
      targetY: 0.5,
      easing: "cubic",
    });

    // Keyframe 2: Peak zoom reached at first interaction
    keyframes.push({
      id: `kf-peak-${firstEvt.id}`,
      timeMs: Math.min(endMs - leadOutMs, Math.max(startMs, firstEvt.timestampMs)),
      scale,
      targetX: clampedFirst.x,
      targetY: clampedFirst.y,
      easing: "spring",
    });

    // Tracking keyframes for each subsequent action in the cluster
    for (let j = 1; j < cluster.length; j++) {
      const midEvt = cluster[j]!;
      const clampedMid = clampCameraToBounds(midEvt.x, midEvt.y, scale);
      keyframes.push({
        id: `kf-track-${midEvt.id}`,
        timeMs: Math.min(endMs - leadOutMs, midEvt.timestampMs),
        scale,
        targetX: clampedMid.x,
        targetY: clampedMid.y,
        easing: "spring",
      });
    }

    // Keyframe 3: End of 2-3 second hold after last interaction
    const holdEndTime = Math.min(endMs - leadOutMs, lastEvt.timestampMs + holdMs);
    const clampedLast = clampCameraToBounds(lastEvt.x, lastEvt.y, scale);
    if (holdEndTime > firstEvt.timestampMs) {
      keyframes.push({
        id: `kf-hold-${lastEvt.id}`,
        timeMs: holdEndTime,
        scale,
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


