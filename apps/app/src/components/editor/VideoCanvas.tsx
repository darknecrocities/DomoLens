import { useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Film, Sparkles } from "lucide-react";
import { calculateCameraAtTime, type ProjectData } from "@domolens/core";
import { platform } from "../../platform";
import { useEditor } from "../../store/editor";

interface VideoCanvasProps {
  project: ProjectData;
  currentTimeMs: number;
}

export function VideoCanvas({ project, currentTimeMs }: VideoCanvasProps) {
  const { summary, zoomBlocks, looks, clicks, keyframes } = project;
  const isPlaying = useEditor((s) => s.isPlaying);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Calculate live camera frame with real-time mouse cursor tracking and keyframes
  const camera = useMemo(() => {
    return calculateCameraAtTime(
      currentTimeMs,
      zoomBlocks,
      350,
      400,
      project.cursorTrajectory,
      keyframes,
    );
  }, [currentTimeMs, zoomBlocks, project.cursorTrajectory, keyframes]);

  // Sync HTML5 video play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync HTML5 video playback currentTime
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const targetSec = currentTimeMs / 1000;
    // Only seek when drift exceeds 75ms to avoid audio/video stutter during smooth playback
    if (Math.abs(video.currentTime - targetSec) > 0.075) {
      video.currentTime = targetSec;
    }
  }, [currentTimeMs]);

  // Check if a click ripple should trigger right now (within 350ms of a click)
  const activeRipple = useMemo(() => {
    if (!looks.showClickRipples) return null;
    return clicks.find(
      (c) => Math.abs(currentTimeMs - c.timestampMs) <= 350,
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
      {/* Video Viewport with Framing */}
      <div
        className="relative aspect-video max-h-full max-w-full overflow-hidden bg-ink-950 transition-all duration-200"
        style={{
          borderRadius: `${looks.borderRadius}px`,
          boxShadow: shadowStyles[looks.shadow] || shadowStyles.lift,
        }}
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
              className="size-full object-contain pointer-events-none"
            />
          ) : thumbnailSrc ? (
            <img
              src={thumbnailSrc}
              alt=""
              className="size-full object-contain pointer-events-none"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center bg-ink-900 text-fg-muted">
              <Film className="size-16 stroke-1 opacity-40" />
              <span className="mt-2 text-sm text-fg-faint">Video preview</span>
            </div>
          )}

          {/* Click Ripple Indicator */}
          {activeRipple && (
            <motion.div
              key={activeRipple.id}
              initial={{ scale: 0.2, opacity: 0.9 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="pointer-events-none absolute size-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-white/20 shadow-sm z-20"
              style={{
                left: `${activeRipple.x * 100}%`,
                top: `${activeRipple.y * 100}%`,
              }}
            />
          )}

          {/* Real-Time Tracked Mouse Cursor Pointer */}
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 z-30"
            style={{
              left: `${camera.cursorX * 100}%`,
              top: `${camera.cursorY * 100}%`,
            }}
          >
            {looks.cursorStyle === "dot" ? (
              <div className="size-3.5 rounded-full bg-white shadow-sm" />
            ) : looks.cursorStyle === "ring" ? (
              <div className="size-6 rounded-full border-2 border-white shadow-sm" />
            ) : (
              /* Mac / Studio Cursor Pointer */
              <svg
                className="size-5.5 fill-white stroke-ink-950 stroke-[1.5] drop-shadow-md"
                viewBox="0 0 24 24"
              >
                <path d="M4.5 3.5l14 7-6.5 1.5-2.5 6.5-5-15z" />
              </svg>
            )}

            {/* Glowing Focus Reticle when camera is actively tracking during zoom */}
            {camera.isZoomed && (
              <div className="absolute -inset-3 rounded-full border border-white/50 animate-ping pointer-events-none" />
            )}
          </div>
        </div>

        {/* Live Zoom & Mouse Tracking Badge Overlay */}
        {camera.isZoomed && (
          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-ink-950/90 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-neutral-700 shadow-md">
            <Sparkles className="size-3.5" />
            <span>{camera.scale.toFixed(1)}x Zoom</span>
            <span className="size-1 rounded-full bg-white/60" />
            <span className="text-[11px] font-mono text-fg-muted font-normal">
              Tracking Mouse ({Math.round(camera.cursorX * 100)}%, {Math.round(camera.cursorY * 100)}%)
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
