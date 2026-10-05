import type {
  KeyframeNode,
  TimelineClip,
  VideoEffect,
  ZoomBlock,
} from "./project";

/**
 * Splits a clip at a given timeline position. Returns two clips.
 */
export function splitClip(
  clip: TimelineClip,
  splitTimeMs: number,
): [TimelineClip, TimelineClip] | null {
  const clipEnd = clip.timelineStartMs + clip.durationMs;
  if (splitTimeMs <= clip.timelineStartMs || splitTimeMs >= clipEnd) {
    return null;
  }

  const firstDuration = splitTimeMs - clip.timelineStartMs;
  const secondDuration = clip.durationMs - firstDuration;

  const firstClip: TimelineClip = {
    ...clip,
    id: `${clip.id}-1`,
    durationMs: firstDuration,
  };

  const secondClip: TimelineClip = {
    ...clip,
    id: `${clip.id}-2`,
    timelineStartMs: splitTimeMs,
    durationMs: secondDuration,
    sourceOffsetMs: clip.sourceOffsetMs + firstDuration,
  };

  return [firstClip, secondClip];
}

/**
 * Removes a clip and shifts following clips to fill the gap.
 */
export function removeClipAndRipple(
  clips: TimelineClip[],
  clipIdToRemove: string,
): TimelineClip[] {
  const index = clips.findIndex((c) => c.id === clipIdToRemove);
  if (index === -1) return clips;

  const target = clips[index]!;
  const gapDuration = target.durationMs;

  return clips
    .filter((c) => c.id !== clipIdToRemove)
    .map((c) => {
      if (c.timelineStartMs > target.timelineStartMs) {
        return {
          ...c,
          timelineStartMs: Math.max(0, c.timelineStartMs - gapDuration),
        };
      }
      return c;
    });
}

/**
 * Calculates total duration of the timeline based on clips.
 */
export function getTimelineDurationMs(clips: TimelineClip[]): number {
  if (clips.length === 0) return 0;
  return Math.max(...clips.map((c) => c.timelineStartMs + c.durationMs));
}

/**
 * Splits a zoom block into two at a given split position.
 */
export function splitZoomBlock(
  block: ZoomBlock,
  splitTimeMs: number,
): [ZoomBlock, ZoomBlock] | null {
  if (splitTimeMs <= block.startTimeMs || splitTimeMs >= block.endTimeMs) {
    return null;
  }

  const first: ZoomBlock = {
    ...block,
    id: `${block.id}-a`,
    endTimeMs: splitTimeMs,
  };

  const second: ZoomBlock = {
    ...block,
    id: `${block.id}-b`,
    startTimeMs: splitTimeMs,
  };

  return [first, second];
}

/**
 * Inserts a keyframe into the list, replacing any existing keyframe within 50ms,
 * and sorts the result chronologically.
 */
export function insertKeyframe(
  keyframes: KeyframeNode[],
  newKf: KeyframeNode,
): KeyframeNode[] {
  const filtered = keyframes.filter(
    (kf) => Math.abs(kf.timeMs - newKf.timeMs) > 50 && kf.id !== newKf.id,
  );
  return [...filtered, newKf].sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Removes a keyframe by its ID.
 */
export function removeKeyframe(
  keyframes: KeyframeNode[],
  idToRemove: string,
): KeyframeNode[] {
  return keyframes.filter((kf) => kf.id !== idToRemove);
}

/**
 * Updates a keyframe by its ID.
 */
export function updateKeyframeNode(
  keyframes: KeyframeNode[],
  id: string,
  updates: Partial<KeyframeNode>,
): KeyframeNode[] {
  return keyframes.map((kf) => (kf.id === id ? { ...kf, ...updates } : kf));
}

/**
 * Inserts a video effect into the list, sorted chronologically by start time.
 */
export function insertVideoEffect(
  effects: VideoEffect[],
  newEffect: VideoEffect,
): VideoEffect[] {
  return [...effects.filter((e) => e.id !== newEffect.id), newEffect].sort(
    (a, b) => a.startTimeMs - b.startTimeMs,
  );
}

/**
 * Removes a video effect by its ID.
 */
export function removeVideoEffect(
  effects: VideoEffect[],
  idToRemove: string,
): VideoEffect[] {
  return effects.filter((e) => e.id !== idToRemove);
}

/**
 * Updates a video effect by its ID.
 */
export function updateVideoEffect(
  effects: VideoEffect[],
  id: string,
  updates: Partial<VideoEffect>,
): VideoEffect[] {
  return effects.map((e) => (e.id === id ? { ...e, ...updates } : e));
}

/**
 * Returns all active and enabled video effects at the given timeline timestamp.
 */
export function getActiveVideoEffects(
  effects: VideoEffect[] | undefined,
  currentTimeMs: number,
): VideoEffect[] {
  if (!effects || effects.length === 0) return [];
  return effects.filter(
    (e) =>
      e.enabled &&
      currentTimeMs >= e.startTimeMs &&
      currentTimeMs <= e.startTimeMs + e.durationMs,
  );
}

export interface ActiveEffectsState {
  filterStyle: string;
  spotlight: {
    active: boolean;
    x: number;
    y: number;
    radius: number;
    intensity: number;
  } | null;
  vignette: number;
  blur: number;
  glow: boolean;
  playbackRate: number;
}

/**
 * Computes CSS styles and active visual parameters from active video effects
 * and keyframe-attached effects.
 */
export function calculateActiveEffectsState(
  effects: VideoEffect[] | undefined,
  currentTimeMs: number,
  keyframes?: KeyframeNode[],
  defaultTarget?: { x: number; y: number },
): ActiveEffectsState {
  const active = getActiveVideoEffects(effects, currentTimeMs);
  const filterParts: string[] = [];
  let spotlight: ActiveEffectsState["spotlight"] = null;
  let vignette = 0;
  let blur = 0;
  let glow = false;
  let playbackRate = 1.0;

  for (const eff of active) {
    const intensity = Math.max(0, Math.min(1, eff.intensity));
    if (eff.type === "spotlight") {
      spotlight = {
        active: true,
        x: eff.targetX ?? defaultTarget?.x ?? 0.5,
        y: eff.targetY ?? defaultTarget?.y ?? 0.5,
        radius: eff.radius ?? (120 + (1 - intensity) * 80),
        intensity,
      };
    } else if (eff.type === "vignette") {
      vignette = Math.max(vignette, intensity);
    } else if (eff.type === "blur") {
      blur = Math.max(blur, intensity * 8);
    } else if (eff.type === "glow") {
      glow = true;
    } else if (eff.type === "speed") {
      playbackRate = eff.intensity > 0 ? eff.intensity : 1.0;
    } else if (eff.type === "filter") {
      if (eff.preset === "noir") {
        filterParts.push(
          `grayscale(${Math.round(intensity * 100)}%) contrast(${1 + intensity * 0.4})`,
        );
      } else if (eff.preset === "cyberpunk") {
        filterParts.push(
          `hue-rotate(${Math.round(intensity * 160)}deg) saturate(${1 + intensity * 0.8})`,
        );
      } else if (eff.preset === "warm") {
        filterParts.push(
          `sepia(${Math.round(intensity * 40)}%) saturate(${1 + intensity * 0.2})`,
        );
      } else {
        // cinematic
        filterParts.push(
          `contrast(${1 + intensity * 0.25}) saturate(${1 + intensity * 0.2})`,
        );
      }
    }
  }

  // Check nearby keyframe for attached effect
  if (keyframes) {
    const nearbyKf = keyframes.find(
      (k) => k.effect && Math.abs(k.timeMs - currentTimeMs) <= 350,
    );
    if (nearbyKf && nearbyKf.effect) {
      const envelope = 1 - Math.abs(nearbyKf.timeMs - currentTimeMs) / 350;
      const kfIntensity = (nearbyKf.effectIntensity ?? 0.8) * envelope;
      if (nearbyKf.effect === "spotlight" && !spotlight) {
        spotlight = {
          active: true,
          x: nearbyKf.targetX,
          y: nearbyKf.targetY,
          radius: 130,
          intensity: kfIntensity,
        };
      } else if (nearbyKf.effect === "vignette") {
        vignette = Math.max(vignette, kfIntensity);
      } else if (nearbyKf.effect === "blur") {
        blur = Math.max(blur, kfIntensity * 6);
      } else if (nearbyKf.effect === "glow") {
        glow = true;
      }
    }
  }

  if (blur > 0) {
    filterParts.push(`blur(${blur.toFixed(1)}px)`);
  }

  return {
    filterStyle: filterParts.join(" "),
    spotlight,
    vignette,
    blur,
    glow,
    playbackRate,
  };
}
