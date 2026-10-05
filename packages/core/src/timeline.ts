import type { TimelineClip, ZoomBlock } from "./project";

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
