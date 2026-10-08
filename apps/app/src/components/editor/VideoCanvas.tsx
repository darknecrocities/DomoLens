import { useEffect, useMemo, useRef, useState } from "react";
import { Film, FolderOpen, Sparkles, Video, Wand2 } from "lucide-react";
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
import { useNav } from "../../store/nav";
import { useProjects } from "../../store/projects";

interface VideoCanvasProps {
  project: ProjectData;
  currentTimeMs?: number;
}

export function VideoCanvas({ project, currentTimeMs: propTimeMs }: VideoCanvasProps) {
  const storeTimeMs = useEditor((s) => s.currentTimeMs);
  const currentTimeMs = propTimeMs ?? storeTimeMs;
  const { summary, zoomBlocks, looks, clicks, keyframes, effects } = project;
  const isPlaying = useEditor((s) => s.isPlaying);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const prevTimeRef = useRef(currentTimeMs);
  const triggeredEventsRef = useRef<Set<string>>(new Set());
  const lastClickSfxPlaybackTimeRef = useRef<number>(-999999);
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
  const computeCamera = useMemo(() => {
    const opts = {
      autoTrackCursor: Boolean(looks.autoTrackCursor),
      autoTrackScale: looks.autoTrackScale || 1.6,
      cursorSmoothing: looks.cursorSmoothing || "smooth",
      cameraPhysics: looks.cameraPhysics,
      clicks,
      alreadySmoothed: true,
      continuousGlide: true,
      maxGlideGapMs: 1000,
    } as const;
    return (tMs: number) => {
      return calculateCameraAtTime(tMs, zoomBlocks, 1000, 400, smoothedTrajectory, keyframes, opts);
    };
  }, [
    zoomBlocks,
    smoothedTrajectory,
    keyframes,
    looks.autoTrackCursor,
    looks.autoTrackScale,
    looks.cursorSmoothing,
    looks.cameraPhysics,
    clicks,
  ]);
  const computeCameraRef = useRef(computeCamera);
  computeCameraRef.current = computeCamera;
  const zoomLayerRef = useRef<HTMLDivElement>(null);

  const camera = useMemo(() => computeCamera(currentTimeMs), [computeCamera, currentTimeMs]);

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
    let lastStoreWrite = 0;

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

      // Smooth 60fps camera without React: write transform straight to the layer
      const layer = zoomLayerRef.current;
      if (layer) {
        const cam = computeCameraRef.current(frameMs);
        layer.style.transform = `scale(${cam.scale}) translate3d(${(0.5 - cam.x) * 100}%, ${(0.5 - cam.y) * 100}%, 0)`;
      }

      // Throttle global store updates (timeline playhead, sounds) to ~12Hz
      const now = performance.now();
      if (now - lastStoreWrite >= 80) {
        lastStoreWrite = now;
        useEditor.getState().setCurrentTime(frameMs);
      }

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

  // Reset triggered events when playing starts or user seeks
  const wasPlayingRef = useRef(false);
  useEffect(() => {
    if (isPlaying && !wasPlayingRef.current) {
      triggeredEventsRef.current.clear();
      lastClickSfxPlaybackTimeRef.current = -999999;
      prevTimeRef.current = currentTimeMs;
    }
    wasPlayingRef.current = isPlaying;
  }, [isPlaying, currentTimeMs]);

  // Synchronize audio sound effects (Bop on click, typing sounds, and audio ducking) with zero latency
  useEffect(() => {
    if (!isPlaying) {
      prevTimeRef.current = currentTimeMs;
      return;
    }

    const prev = prevTimeRef.current;
    prevTimeRef.current = currentTimeMs;

    // Detect seeking, scrubbing, or looping backward
    const isSeekOrLoop = currentTimeMs < prev || Math.abs(currentTimeMs - prev) > 250;
    if (isSeekOrLoop) {
      triggeredEventsRef.current.clear();
      lastClickSfxPlaybackTimeRef.current = -999999;
    }

    const windowStart = isSeekOrLoop ? Math.max(0, currentTimeMs - 40) : prev;
    const windowEnd = currentTimeMs + 70;

    const audioSettings = project.audioSettings;
    const clickSoundEnabled = audioSettings?.clickSoundEnabled !== false;
    const typingSoundEnabled = audioSettings?.typingSoundEnabled !== false;

    // Zero-latency edge-triggered procedural click bop sound (only if keyframes don't already handle click sounds)
    const hasAnyKeyframeClicks = Boolean(keyframes?.some((k) => k.sound === "click"));
    if (clickSoundEnabled && !hasAnyKeyframeClicks) {
      for (const click of clicks) {
        if (
          !triggeredEventsRef.current.has(click.id) &&
          click.timestampMs >= windowStart &&
          click.timestampMs <= windowEnd
        ) {
          triggeredEventsRef.current.add(click.id);

          const nowAudio = performance.now();
          if (nowAudio - lastClickSfxPlaybackTimeRef.current >= 60) {
            lastClickSfxPlaybackTimeRef.current = nowAudio;
            sfx.playClickBop(audioSettings?.clickSoundPreset || "bop", audioSettings?.clickSoundVolume || 0.7);
          }
        }
      }
    }

    // Zero-latency edge-triggered typing sound bursts (only if not already attached to keyframes)
    if (typingSoundEnabled && project.interactions) {
      for (const interaction of project.interactions) {
        if (
          interaction.type === "typing" &&
          !triggeredEventsRef.current.has(interaction.id) &&
          interaction.timestampMs >= windowStart &&
          interaction.timestampMs <= windowEnd
        ) {
          triggeredEventsRef.current.add(interaction.id);
          const hasKeyframeTyping = keyframes?.some(
            (k) => k.sound === "typing" && Math.abs(k.timeMs - interaction.timestampMs) < 400,
          );
          if (!hasKeyframeTyping) {
            const keystrokesCount = Math.min(4, Math.max(2, interaction.snippet ? interaction.snippet.length : 3));
            sfx.playTypingBurst(
              keystrokesCount,
              110,
              audioSettings?.typingSoundPreset || "mechanical",
              audioSettings?.typingSoundVolume || 0.55,
            );
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
          kf.timeMs >= windowStart &&
          kf.timeMs <= windowEnd
        ) {
          triggeredEventsRef.current.add(`kf-${kf.id}`);
          if (kf.sound === "typing" && typingSoundEnabled) {
            sfx.playKeystroke(
              (kf.soundPreset as any) || audioSettings?.typingSoundPreset || "mechanical",
              kf.soundVolume || audioSettings?.typingSoundVolume || 0.55,
              false,
            );
          } else if (kf.sound === "click" && clickSoundEnabled) {
            const nowAudio = performance.now();
            if (nowAudio - lastClickSfxPlaybackTimeRef.current >= 60) {
              lastClickSfxPlaybackTimeRef.current = nowAudio;
              sfx.playClickBop(
                (kf.soundPreset as any) || audioSettings?.clickSoundPreset || "bop",
                kf.soundVolume || audioSettings?.clickSoundVolume || 0.7,
              );
            }
          }
        }
      }
    }
  }, [isPlaying, currentTimeMs, clicks, project.interactions, keyframes, project.audioSettings]);


  const rawMedia = summary.media;
  const isExplicitSample = Boolean(rawMedia && (rawMedia.startsWith("sample://") || rawMedia.startsWith("mock://")));
  const [resolvedMediaSrc, setResolvedMediaSrc] = useState<string | null>(() => {
    if (!rawMedia) return null;
    if (isExplicitSample) return "/domolens_smooth_autozoom_demo.mp4";
    return platform.mediaUrl(rawMedia);
  });

  useEffect(() => {
    if (!rawMedia) {
      setResolvedMediaSrc(null);
      return;
    }
    if (isExplicitSample) {
      setResolvedMediaSrc("/domolens_smooth_autozoom_demo.mp4");
      return;
    }
    const primaryUrl = platform.mediaUrl(rawMedia);
    setResolvedMediaSrc(primaryUrl);
  }, [rawMedia, isExplicitSample]);

  const thumbnailSrc = summary.thumbnail ? platform.mediaUrl(summary.thumbnail) : null;
  const [naturalAspectRatio, setNaturalAspectRatio] = useState<string | null>(() => {
    if (summary.width && summary.height && summary.width > 0 && summary.height > 0) {
      return `${summary.width} / ${summary.height}`;
    }
    return null;
  });

  useEffect(() => {
    if (summary.width && summary.height && summary.width > 0 && summary.height > 0) {
      setNaturalAspectRatio(`${summary.width} / ${summary.height}`);
    }
  }, [summary.width, summary.height]);

  const viewportAspectRatio = useMemo(() => {
    if (looks.aspectRatio) {
      if (looks.aspectRatio === "9:16") return "9 / 16";
      if (looks.aspectRatio === "1:1") return "1 / 1";
      if (looks.aspectRatio === "4:3") return "4 / 3";
      if (looks.aspectRatio === "16:9") return "16 / 9";
    }
    return naturalAspectRatio || (summary.width && summary.height ? `${summary.width} / ${summary.height}` : "16 / 9");
  }, [looks.aspectRatio, naturalAspectRatio, summary.width, summary.height]);

  // Shadow styling lookup
  const shadowStyles: Record<string, string> = {
    none: "none",
    soft: "0 12px 32px -16px rgb(0 0 0 / 0.7)",
    lift: "0 24px 60px -24px rgb(0 0 0 / 0.8)",
    glow: "0 10px 36px -10px rgb(255 255 255 / 0.35)",
  };

  return (
    <div
      className="relative flex size-full items-center justify-center overflow-hidden"
      style={{
        background: looks.backgroundValue,
        padding: `clamp(6px, 2.5vw, ${looks.padding}px)`,
        perspective: "1200px",
      }}
    >
      {/* Ambient Video Blur Glow (Apple Keynote Style) */}
      {looks.ambientBackdropBlur && (resolvedMediaSrc || thumbnailSrc) && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 blur-3xl scale-110 select-none">
          {resolvedMediaSrc ? (
            <video
              src={resolvedMediaSrc}
              muted
              playsInline
              className="size-full object-cover"
            />
          ) : (
            <img src={thumbnailSrc!} alt="" className="size-full object-cover" />
          )}
        </div>
      )}

      {/* Video Viewport with Framing, 3D Tilt, and Click-to-Shift */}
      <div
        ref={viewportRef}
        data-tutorial-target="canvas-player"
        onClick={handleCanvasClick}
        className="relative max-h-full max-w-full overflow-hidden bg-ink-950 cursor-crosshair group select-none transition-transform duration-300"
        style={{
          aspectRatio: viewportAspectRatio,
          borderRadius: `${looks.borderRadius}px`,
          boxShadow: shadowStyles[looks.shadow] || shadowStyles.lift,
          transform: looks.tiltAngle
            ? `rotateX(${looks.tiltAngle}deg) rotateY(${-(looks.tiltAngle * 0.45)}deg)`
            : undefined,
          transformStyle: "preserve-3d",
        }}
        title="Click anywhere to shift camera focal center"
      >
        {/* Modular Window Mockup Shell Bar */}
        {looks.windowFrame && looks.windowFrame !== "none" && (
          <div className="absolute top-0 inset-x-0 h-7 z-30 flex items-center px-3 bg-black/40 backdrop-blur-md border-b border-white/10 select-none pointer-events-none">
            {/* Traffic Light Dots */}
            {(looks.windowFrame === "macos" ||
              looks.windowFrame === "safari" ||
              looks.windowFrame === "terminal") && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="size-2.5 rounded-full bg-[#ff5f56] border border-black/20" />
                <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-black/20" />
                <span className="size-2.5 rounded-full bg-[#27c93f] border border-black/20" />
              </div>
            )}

            {/* Safari Omnibar */}
            {looks.windowFrame === "safari" && (
              <div className="mx-auto flex items-center gap-1.5 rounded bg-white/10 px-3 py-0.5 text-[10px] font-mono text-white/80 border border-white/10 max-w-xs truncate">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                <span>{looks.mockupUrl || "app.domolens.dev"}</span>
              </div>
            )}

            {/* Terminal Title */}
            {looks.windowFrame === "terminal" && (
              <div className="mx-auto text-[10px] font-mono text-neutral-400">
                {looks.mockupUrl || "terminal — zsh — 80x24"}
              </div>
            )}

            {/* Chrome Tab Bar */}
            {looks.windowFrame === "chrome" && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 rounded-t-md bg-neutral-800/90 px-2.5 py-0.5 text-[10px] font-medium text-white border-t border-x border-white/10">
                  <span className="size-2 rounded-full bg-indigo-400" />
                  <span className="max-w-[120px] truncate">{looks.mockupUrl || "DomoLens Studio"}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Zooming Video Container: zero latency with hardware accelerated 3D transform */}
        <div
          ref={zoomLayerRef}
          className="relative size-full origin-center will-change-transform"
          style={{
            transform: `scale(${camera.scale}) translate3d(${(0.5 - camera.x) * 100}%, ${(0.5 - camera.y) * 100}%, 0)`,
            transition: isPlaying ? "none" : "transform 0.1s ease-out",
          }}
        >
          {resolvedMediaSrc ? (
            <video
              ref={videoRef}
              src={resolvedMediaSrc}
              poster={thumbnailSrc || undefined}
              playsInline
              muted
              preload="auto"
              style={{ filter: effectsState.filterStyle || undefined }}
              className="size-full object-cover pointer-events-none"
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) {
                  setNaturalAspectRatio(`${v.videoWidth} / ${v.videoHeight}`);
                }
                if (!isPlaying && v.currentTime === 0) {
                  v.currentTime = 0.001;
                }
              }}
              onError={async () => {
                if (rawMedia && platform.readMediaBlob && !rawMedia.startsWith("blob:") && !rawMedia.startsWith("data:")) {
                  try {
                    const fallbackBlob = await platform.readMediaBlob(rawMedia);
                    if (fallbackBlob && fallbackBlob !== resolvedMediaSrc) {
                      setResolvedMediaSrc(fallbackBlob);
                    }
                  } catch (err) {
                    console.warn("Media blob fallback error:", err);
                  }
                }
              }}
            />
          ) : thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt=""
              style={{ filter: effectsState.filterStyle || undefined }}
              className="size-full object-cover pointer-events-none"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center bg-ink-950 p-6 text-center text-fg-muted">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white mb-3 shadow-inner">
                <Film className="size-7 stroke-1" />
              </div>
              <h3 className="text-sm font-bold text-white">Studio Canvas Ready</h3>
              <p className="mt-1 max-w-sm text-xs text-neutral-400 leading-relaxed">
                Import an existing video clip or record your screen to edit with auto-zoom and cursor tracking.
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newProj = await useProjects.getState().pickAndImport();
                    if (newProj) {
                      void useEditor.getState().loadProject(newProj.id);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 font-mono text-xs font-bold uppercase text-black hover:bg-neutral-200 active:scale-95 transition-all shadow-md"
                >
                  <FolderOpen className="size-3.5" />
                  Import Video
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    useNav.getState().go({ name: "record" });
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3.5 py-1.5 font-mono text-xs font-semibold uppercase text-white hover:bg-white/20 active:scale-95 transition-all"
                >
                  <Video className="size-3.5" />
                  Record Screen
                </button>
              </div>
            </div>
          )}

          {/* Tracked Mouse Cursor Pointer Overlay (Clean, no harsh pressing/ping effects) */}
          {looks.showCursor && looks.cursorStyle !== "hidden" && (
            <div
              className="pointer-events-none absolute will-change-transform z-30"
              style={{
                left: `${camera.cursorX * 100}%`,
                top: `${camera.cursorY * 100}%`,
                transform: `translate3d(-50%, -50%, 0) scale(${looks.cursorSize || 1.4})`,
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

              {/* Dynamic Cursor Glow Effect */}
              {effectsState.glow && (
                <div className="absolute -inset-3 rounded-full border border-white/60 bg-white/20 animate-pulse pointer-events-none shadow-[0_0_16px_rgba(255,255,255,0.5)]" />
              )}
            </div>
          )}

          {/* Tactile Click Ripples Plotted Live on Screen */}
          {(looks.showClickRipples !== false) && clicks && clicks.map((click) => {
            const elapsed = currentTimeMs - click.timestampMs;
            if (elapsed < -60 || elapsed > 450) return null;
            const progress = Math.min(1, Math.max(0, (elapsed + 60) / 510));
            const ringScale = 0.3 + progress * 2.2;
            const ringOpacity = Math.max(0, 1 - progress);
            return (
              <div
                key={`ripple-${click.id}`}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-25"
                style={{
                  left: `${click.x * 100}%`,
                  top: `${click.y * 100}%`,
                }}
              >
                {/* Expanding tactile ripple ring */}
                <div
                  className="size-11 rounded-full border-2 border-white shadow-[0_0_14px_rgba(255,255,255,0.85)]"
                  style={{
                    transform: `scale(${ringScale})`,
                    opacity: ringOpacity,
                  }}
                />
                {/* Center contact dot */}
                <div
                  className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)]"
                  style={{
                    opacity: Math.max(0, 1 - progress * 1.6),
                  }}
                />
              </div>
            );
          })}
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

        {/* Tactile Click-to-Shift Focal Target Reticle (Clean and subtle) */}
        {clickShiftMarker && (
          <div
            key={clickShiftMarker.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-40 transition-opacity duration-300"
            style={{
              left: `${clickShiftMarker.x}px`,
              top: `${clickShiftMarker.y}px`,
            }}
          >
            <div className="size-6 rounded-full border border-white/80 bg-white/20 shadow-md" />
          </div>
        )}

        {/* Live Zoom & Focus Badge Overlay */}
        {camera.isZoomed && (
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-ink-950/90 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-neutral-700 shadow-md z-30">
            <Sparkles className="size-3.5" />
            <span>{camera.scale.toFixed(1)}x Zoom</span>
            <span className="size-1 rounded-full bg-white/60" />
            <span className="text-[11px] font-mono text-fg-muted font-normal">
              {looks.autoTrackCursor ? "Dynamic Reframe" : "Anchored Focus"}
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
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-black backdrop-blur-md shadow-md z-30">
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
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 text-center transition-all select-none flex flex-col items-center gap-1"
              style={{
                left: `${textOverlay.x * 100}%`,
                top: `${textOverlay.y * 100}%`,
              }}
            >
              {textOverlay.badge && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-md"
                  style={{
                    backgroundColor: looks.brandAccentColor || "#6366f1",
                  }}
                >
                  {textOverlay.badge}
                </span>
              )}
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
