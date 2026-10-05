import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Sparkles, Wand2 } from "lucide-react";
import {
  calculateActiveEffectsState,
  calculateCameraAtTime,
  screenToVideoCoordinates,
  smoothCursorTrajectory,
  type ProjectData,
} from "@domolens/core";
import { sfx } from "../../lib/sound-effects";
import { platform } from "../../platform";
import { useEditor } from "../../store/editor";

interface VideoCanvasProps {
  project: ProjectData;
  currentTimeMs: number;
}

export function VideoCanvas({ project, currentTimeMs }: VideoCanvasProps) {
  const { summary, zoomBlocks, looks, clicks, keyframes, effects } = project;
  const isPlaying = useEditor((s) => s.isPlaying);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const prevTimeRef = useRef(currentTimeMs);
  const triggeredEventsRef = useRef<Set<string>>(new Set());
  const [clickShiftMarker, setClickShiftMarker] = useState<{ x: number; y: number; id: number } | null>(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = viewportRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const videoCoords = screenToVideoCoordinates(
      clickX,
      clickY,
      rect.width,
      rect.height,
      camera,
    );

    useEditor.getState().shiftCameraTarget(videoCoords.x, videoCoords.y);
    setClickShiftMarker({ x: clickX, y: clickY, id: Date.now() });
    setTimeout(() => setClickShiftMarker(null), 600);
  };

  // OpenScreen smooth trajectory computation
  const smoothedTrajectory = useMemo(() => {
    return smoothCursorTrajectory(
      project.cursorTrajectory || [],
      looks.cursorSmoothing || "smooth",
      clicks,
    );
  }, [project.cursorTrajectory, looks.cursorSmoothing, clicks]);

  // Calculate live camera frame with real-time mouse cursor auto-tracking and keyframes
  const camera = useMemo(() => {
    return calculateCameraAtTime(
      currentTimeMs,
      zoomBlocks,
      500,
      400,
      smoothedTrajectory,
      keyframes,
      {
        autoTrackCursor: looks.autoTrackCursor !== false,
        autoTrackScale: looks.autoTrackScale || 1.6,
        cursorSmoothing: looks.cursorSmoothing || "smooth",
        clicks,
      },
    );
  }, [
    currentTimeMs,
    zoomBlocks,
    smoothedTrajectory,
    keyframes,
    looks.autoTrackCursor,
    looks.autoTrackScale,
    looks.cursorSmoothing,
    clicks,
  ]);

  // Real-time video effects calculation (Spotlight, Vignette, Blur, Color Grade, Glow, Speed)
  const effectsState = useMemo(() => {
    return calculateActiveEffectsState(
      effects,
      currentTimeMs,
      keyframes,
      { x: camera.x, y: camera.y },
    );
  }, [effects, currentTimeMs, keyframes, camera.x, camera.y]);

  // Synchronize dynamic playback rate (e.g. speed ramp / slow-mo effects)
  useEffect(() => {
    const video = videoRef.current;
    if (video && typeof video.playbackRate === "number") {
      video.playbackRate = effectsState.playbackRate;
    }
  }, [effectsState.playbackRate]);

  // Master hardware-locked video clock synchronization:
  // When video is playing, video presentation frames drive currentTimeMs with ZERO latency!
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isPlaying) {
      video.pause();
      const targetSec = currentTimeMs / 1000;
      if (Math.abs(video.currentTime - targetSec) > 0.02) {
        video.currentTime = targetSec;
      }
      return;
    }

    const targetSec = currentTimeMs / 1000;
    if (Math.abs(video.currentTime - targetSec) > 0.05) {
      video.currentTime = targetSec;
    }

    let active = true;
    let rVfcId: number | null = null;
    let rafId: number | null = null;

    const onFrame = () => {
      if (!active) return;
      if (video.ended) {
        useEditor.getState().setCurrentTime(0);
        useEditor.getState().setPlaying(false);
        return;
      }

      const frameMs = Math.round(video.currentTime * 1000);
      const durationMs = useEditor.getState().durationMs;

      if (frameMs >= durationMs) {
        useEditor.getState().setCurrentTime(0);
        useEditor.getState().setPlaying(false);
        return;
      }

      useEditor.getState().setCurrentTime(frameMs);

      if ("requestVideoFrameCallback" in video) {
        rVfcId = (video as unknown as { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback(onFrame);
      } else {
        rafId = requestAnimationFrame(onFrame);
      }
    };

    video.play().then(() => {
      if (!active) return;
      if ("requestVideoFrameCallback" in video) {
        rVfcId = (video as unknown as { requestVideoFrameCallback: (cb: () => void) => number }).requestVideoFrameCallback(onFrame);
      } else {
        rafId = requestAnimationFrame(onFrame);
      }
    }).catch(() => {});

    return () => {
      active = false;
      if (rVfcId !== null && "cancelVideoFrameCallback" in video) {
        (video as unknown as { cancelVideoFrameCallback: (id: number) => void }).cancelVideoFrameCallback(rVfcId);
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isPlaying]);

  // Handle manual scrub / seek during playback or pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const targetSec = currentTimeMs / 1000;
    if (!isPlaying) {
      if (Math.abs(video.currentTime - targetSec) > 0.02) {
        video.currentTime = targetSec;
      }
    } else {
      if (Math.abs(video.currentTime - targetSec) > 0.25) {
        video.currentTime = targetSec;
      }
    }
  }, [currentTimeMs, isPlaying]);

  // Synchronize audio sound effects (Bop on click, typing sounds, and audio ducking) with zero latency
  useEffect(() => {
    if (!isPlaying) {
      prevTimeRef.current = currentTimeMs;
      return;
    }

    const prev = prevTimeRef.current;
    prevTimeRef.current = currentTimeMs;

    // Reset triggered set when looping or seeking backward
    if (currentTimeMs < prev) {
      triggeredEventsRef.current.clear();
      return;
    }

    const audioSettings = project.audioSettings;
    const clickSoundEnabled = audioSettings?.clickSoundEnabled !== false;
    const typingSoundEnabled = audioSettings?.typingSoundEnabled !== false;

    // Zero-latency edge-triggered procedural click bop sound
    if (clickSoundEnabled) {
      for (const click of clicks) {
        if (
          !triggeredEventsRef.current.has(click.id) &&
          click.timestampMs >= prev &&
          click.timestampMs <= currentTimeMs + 35
        ) {
          triggeredEventsRef.current.add(click.id);
          sfx.playClickBop(audioSettings?.clickSoundPreset || "bop", audioSettings?.clickSoundVolume || 0.7);
          if (audioSettings?.musicDuckingEnabled) {
            sfx.duckMusic(400, audioSettings.duckingAmount);
          }
        }
      }
    }

    // Zero-latency edge-triggered typing sound bursts
    if (typingSoundEnabled && project.interactions) {
      for (const interaction of project.interactions) {
        if (
          interaction.type === "typing" &&
          !triggeredEventsRef.current.has(interaction.id) &&
          interaction.timestampMs >= prev &&
          interaction.timestampMs <= currentTimeMs + 45
        ) {
          triggeredEventsRef.current.add(interaction.id);
          const keystrokesCount = Math.min(8, Math.max(3, interaction.snippet ? interaction.snippet.length : 4));
          sfx.playTypingBurst(keystrokesCount, 85, audioSettings?.typingSoundPreset || "mechanical", audioSettings?.typingSoundVolume || 0.6);
          if (audioSettings?.musicDuckingEnabled) {
            sfx.duckMusic(550, audioSettings.duckingAmount);
          }
        }
      }
    }

    // Zero-latency edge-triggered keyframe attached sound cues (typing & click bop)
    if (keyframes && keyframes.length > 0) {
      for (const kf of keyframes) {
        if (
          kf.sound &&
          !triggeredEventsRef.current.has(`kf-${kf.id}`) &&
          kf.timeMs >= prev &&
          kf.timeMs <= currentTimeMs + 45
        ) {
          triggeredEventsRef.current.add(`kf-${kf.id}`);
          if (kf.sound === "typing" && typingSoundEnabled) {
            sfx.playTypingBurst(
              5,
              85,
              (kf.soundPreset as any) || audioSettings?.typingSoundPreset || "mechanical",
              kf.soundVolume || audioSettings?.typingSoundVolume || 0.65,
            );
          } else if (kf.sound === "click" && clickSoundEnabled) {
            sfx.playClickBop(
              (kf.soundPreset as any) || audioSettings?.clickSoundPreset || "bop",
              kf.soundVolume || audioSettings?.clickSoundVolume || 0.7,
            );
          }
          if (audioSettings?.musicDuckingEnabled) {
            sfx.duckMusic(450, audioSettings.duckingAmount);
          }
        }
      }
    }
  }, [isPlaying, currentTimeMs, clicks, project.interactions, keyframes, project.audioSettings]);

  // Sync background music track
  useEffect(() => {
    const musicTrack = project.audioTracks?.find((t) => t.type === "music" && !t.muted);
    if (!musicTrack || !isPlaying) {
      sfx.pauseMusic();
      return;
    }
    sfx.playMusic(musicTrack.url, musicTrack.volume, true);
    return () => {
      sfx.pauseMusic();
    };
  }, [isPlaying, project.audioTracks]);

  // Check if a click ripple should trigger right now (within 320ms after click)
  const activeRipple = useMemo(() => {
    if (!looks.showClickRipples) return null;
    return clicks.find(
      (c) => currentTimeMs >= c.timestampMs && currentTimeMs <= c.timestampMs + 320,
    );
  }, [currentTimeMs, clicks, looks.showClickRipples]);

  const rawMedia = summary.media;
  const isSampleOrEmpty = !rawMedia || rawMedia.startsWith("sample://") || rawMedia.startsWith("mock://");
  const mediaSrc = isSampleOrEmpty
    ? "/domolens_smooth_autozoom_demo.mp4"
    : platform.mediaUrl(rawMedia);
  const thumbnailSrc = summary.thumbnail ? platform.mediaUrl(summary.thumbnail) : null;

  // Shadow styling lookup
  const shadowStyles: Record<string, string> = {
    none: "none",
    soft: "0 12px 32px -16px rgb(0 0 0 / 0.7)",
    lift: "0 24px 60px -24px rgb(0 0 0 / 0.8)",
    glow: "0 10px 36px -10px rgb(255 122 26 / 0.55)",
  };

  return (
    <div
      className="relative flex size-full items-center justify-center overflow-hidden transition-all duration-300"
      style={{
        background: looks.backgroundValue,
        padding: `${looks.padding}px`,
      }}
    >
      {/* Video Viewport with Framing and Click-to-Shift */}
      <div
        ref={viewportRef}
        onClick={handleCanvasClick}
        className="relative aspect-video max-h-full max-w-full overflow-hidden bg-ink-950 transition-all duration-200 cursor-crosshair group select-none"
        style={{
          borderRadius: `${looks.borderRadius}px`,
          boxShadow: shadowStyles[looks.shadow] || shadowStyles.lift,
        }}
        title="Click anywhere to shift camera focal center"
      >
        {/* Dynamic Zooming Video Container: zero latency with smooth cubic easing tracking mouse */}
        <div
          className="relative size-full origin-center will-change-transform"
          style={{
            transform: `scale(${camera.scale}) translate(${(0.5 - camera.x) * 100}%, ${(0.5 - camera.y) * 100}%)`,
          }}
        >
          {mediaSrc ? (
            <video
              ref={videoRef}
              src={mediaSrc}
              playsInline
              muted
              preload="auto"
              style={{ filter: effectsState.filterStyle || undefined }}
              className="size-full object-contain pointer-events-none transition-[filter] duration-150"
            />
          ) : thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt=""
              style={{ filter: effectsState.filterStyle || undefined }}
              className="size-full object-contain pointer-events-none transition-[filter] duration-150"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center bg-ink-900 text-fg-muted">
              <Film className="size-16 stroke-1 opacity-40" />
              <span className="mt-2 text-sm text-fg-faint">Video preview</span>
            </div>
          )}

          {/* Frame-accurate Zero-latency Click Ripple Indicator */}
          {activeRipple && (
            <div
              key={activeRipple.id}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-20 will-change-transform"
              style={{
                left: `${activeRipple.x * 100}%`,
                top: `${activeRipple.y * 100}%`,
              }}
            >
              {(() => {
                const elapsed = currentTimeMs - activeRipple.timestampMs;
                const progress = Math.min(1, Math.max(0, elapsed / 320));
                const scale = 0.3 + progress * 1.5;
                const opacity = 1 - progress;
                return (
                  <div
                    className="size-10 rounded-full border-2 border-white bg-white/30 shadow-sm"
                    style={{
                      transform: `scale(${scale})`,
                      opacity,
                    }}
                  />
                );
              })()}
            </div>
          )}

          {/* Real-Time Tracked Mouse Cursor Pointer: zero latency */}
          <div
            className="pointer-events-none absolute will-change-transform z-30 transition-transform duration-75"
            style={{
              left: `${camera.cursorX * 100}%`,
              top: `${camera.cursorY * 100}%`,
              transform: `translate(-50%, -50%) scale(${looks.cursorSize || 1.4})`,
            }}
          >
            {looks.cursorStyle === "dot" ? (
              <div className="size-3.5 rounded-full bg-white shadow-sm ring-1 ring-black/40" />
            ) : looks.cursorStyle === "ring" ? (
              <div className="size-6 rounded-full border-2 border-white bg-white/10 shadow-sm" />
            ) : looks.cursorStyle === "default" ? (
              <svg
                className="size-5.5 fill-white stroke-black stroke-[1.5] drop-shadow-md"
                viewBox="0 0 24 24"
              >
                <path d="M4 2l12 12-5.5 1 4.5 7-3 1.5-4.5-7L4 20V2z" />
              </svg>
            ) : (
              /* Mac / OpenScreen Studio Pointer */
              <svg
                className="size-6 fill-white stroke-neutral-900 stroke-[1.2] drop-shadow-md"
                viewBox="0 0 24 24"
              >
                <path d="M5.5 3.21a.5.5 0 0 1 .86-.29l12.43 12.06a.5.5 0 0 1-.36.85l-5.63.14-2.48 5.75a.5.5 0 0 1-.92-.04l-2.02-4.68-4.22 3.86a.5.5 0 0 1-.84-.37V3.21z" />
              </svg>
            )}

            {/* Glowing Focus Reticle when camera is actively tracking during zoom */}
            {camera.isZoomed && (
              <div className="absolute -inset-3 rounded-full border border-white/50 animate-ping pointer-events-none" />
            )}

            {/* Dynamic Cursor Glow Effect */}
            {effectsState.glow && (
              <div className="absolute -inset-4 rounded-full border border-cyan-400 bg-cyan-400/20 animate-pulse pointer-events-none shadow-[0_0_20px_rgba(34,211,238,0.7)]" />
            )}
          </div>
        </div>

        {/* Dynamic Vignette Effect Overlay */}
        {effectsState.vignette > 0 && (
          <div
            className="pointer-events-none absolute inset-0 z-20 transition-all duration-150"
            style={{
              boxShadow: `inset 0 0 ${Math.round(effectsState.vignette * 150)}px rgba(0, 0, 0, ${Math.min(0.95, effectsState.vignette * 0.9)})`,
            }}
          />
        )}

        {/* Dynamic Spotlight Effect Overlay */}
        {effectsState.spotlight && effectsState.spotlight.active && (
          <div
            className="pointer-events-none absolute inset-0 z-20 transition-all duration-150"
            style={{
              background: `radial-gradient(circle ${Math.round(effectsState.spotlight.radius)}px at ${effectsState.spotlight.x * 100}% ${effectsState.spotlight.y * 100}%, transparent 0%, transparent 45%, rgba(0, 0, 0, ${effectsState.spotlight.intensity * 0.75}) 100%)`,
            }}
          />
        )}

        {/* Tactile Click-to-Shift Focal Target Reticle */}
        {clickShiftMarker && (
          <div
            key={clickShiftMarker.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-40 animate-ping"
            style={{
              left: `${clickShiftMarker.x}px`,
              top: `${clickShiftMarker.y}px`,
            }}
          >
            <div className="size-8 rounded-full border-2 border-amber-400 bg-amber-400/25 shadow-lg" />
          </div>
        )}

        {/* Live Zoom & Mouse Tracking Badge Overlay */}
        {camera.isZoomed && (
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-ink-950/90 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-neutral-700 shadow-md z-30">
            <Sparkles className="size-3.5" />
            <span>{camera.scale.toFixed(1)}x Zoom</span>
            <span className="size-1 rounded-full bg-white/60" />
            <span className="text-[11px] font-mono text-fg-muted font-normal">
              Auto-Tracking Cursor ({Math.round(camera.cursorX * 100)}%, {Math.round(camera.cursorY * 100)}%)
            </span>
          </div>
        )}

        {/* Live Effects Active Badge Overlay */}
        {(effectsState.spotlight?.active ||
          effectsState.vignette > 0 ||
          effectsState.blur > 0 ||
          effectsState.glow ||
          effectsState.filterStyle ||
          effectsState.playbackRate !== 1.0) && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 text-[11px] font-semibold text-black backdrop-blur-md shadow-md z-30">
            <Wand2 className="size-3 text-black" />
            <span>
              {effectsState.playbackRate !== 1.0
                ? `${effectsState.playbackRate}x Speed`
                : effectsState.spotlight?.active
                ? "Spotlight Active"
                : effectsState.vignette > 0
                ? "Vignette Active"
                : "Effect Active"}
            </span>
          </div>
        )}

        {/* Dynamic Text Overlays on Video */}
        {project.textOverlays?.map((textOverlay) => {
          const isActive =
            currentTimeMs >= textOverlay.startTimeMs &&
            currentTimeMs <= textOverlay.startTimeMs + textOverlay.durationMs;
          if (!isActive) return null;

          return (
            <div
              key={textOverlay.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 text-center transition-all select-none"
              style={{
                left: `${textOverlay.x * 100}%`,
                top: `${textOverlay.y * 100}%`,
              }}
            >
              <span
                className="inline-block rounded-xl px-4 py-1.5 font-bold shadow-lg backdrop-blur-sm"
                style={{
                  fontSize: `${textOverlay.fontSize}px`,
                  color: textOverlay.color,
                  backgroundColor: textOverlay.bgColor || "rgba(15, 17, 23, 0.85)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                {textOverlay.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
