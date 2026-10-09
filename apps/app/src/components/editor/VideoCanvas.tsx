import { useEffect, useMemo, useRef, useState } from "react";
import {
  Film,
  FolderOpen,
  Sparkles,
  Video,
  Wand2,
  Star,
  Zap,
  Flame,
  Shield,
  Crown,
  Check,
  Heart,
  User,
} from "lucide-react";
import {
  calculateActiveEffectsState,
  calculateCameraAtTime,
  evaluate3DTiltAtTime,
  evaluateTextOverlayMotion,
  getCursorPreset,
  screenToVideoCoordinates,
  smoothCursorTrajectory,
  mapVideoPointToViewport,
  ensureCursorTrajectory,
  TEXT_CARD_STYLE_DEFINITIONS,
  type CursorAvatar,
  type CursorStyle,
  type ProjectData,
  type TextCardStyle,
} from "@domolens/core";
import { sfx } from "../../lib/sound-effects";
import { platform } from "../../platform";
import { useEditor } from "../../store/editor";
import { useNav } from "../../store/nav";
import { useProjects } from "../../store/projects";

export function CanvasCursorSvg({ cursorStyle }: { cursorStyle: CursorStyle }) {
  switch (cursorStyle) {
    case "hidden":
      return null;
    case "default":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <path
            d="M0 0 L0 17 L4.5 13 L8.5 21.5 L11.5 20 L7.5 12 L13.5 12 Z"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "mac":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <path
            d="M1 1 L1 18.5 Q3.5 16 5.5 14.5 L9.2 22.8 Q10.7 22.1 12.2 21.4 L8.6 13.4 L14.8 13.4 Q7.5 7 1 1 Z"
            fill="#ffffff"
            stroke="#171717"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "macos-classic":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-sm">
          <path d="M0 0 L0 16 L4 12 L7 19 L9 18 L6 11 L11 11 Z" fill="#000000" />
          <path d="M1 1 L1 14.5 L4 11.5 L7 18 L8 17.5 L5.2 10.5 L9.5 10.5 Z" fill="#ffffff" />
        </svg>
      );
    case "dot":
      return (
        <svg viewBox="0 0 12 12" className="size-3 drop-shadow-sm">
          <circle cx="6" cy="6" r="4.5" fill="#ffffff" stroke="rgba(0, 0, 0, 0.4)" strokeWidth="1" />
        </svg>
      );
    case "sleek-dot":
      return (
        <svg viewBox="0 0 20 20" className="size-5 drop-shadow-md">
          <circle cx="10" cy="10" r="8" fill="rgba(99, 102, 241, 0.2)" stroke="rgba(99, 102, 241, 0.5)" strokeWidth="1.5" />
          <circle cx="10" cy="10" r="3.5" fill="#ffffff" stroke="#6366f1" strokeWidth="1.5" />
        </svg>
      );
    case "laser-dot":
      return (
        <svg viewBox="0 0 16 16" className="size-4 filter drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]">
          <circle cx="8" cy="8" r="7" fill="rgba(239, 68, 68, 0.35)" />
          <circle cx="8" cy="8" r="4.5" fill="#ef4444" />
          <circle cx="8" cy="8" r="2" fill="#ffffff" />
        </svg>
      );
    case "ring":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <circle cx="12" cy="12" r="9.5" fill="rgba(255, 255, 255, 0.12)" stroke="#ffffff" strokeWidth="2" />
          <circle cx="12" cy="12" r="1.5" fill="#ffffff" />
        </svg>
      );
    case "minimal-crosshair":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <path d="M12 2 L12 8 M12 16 L12 22 M2 12 L8 12 M16 12 L22 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="12" r="1" fill="#ffffff" />
        </svg>
      );
    case "focus-reticle":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <path d="M4 8 L4 4 L8 4 M16 4 L20 4 L20 8 M4 16 L4 20 L8 20 M16 20 L20 20 L20 16" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="12" cy="12" r="2" fill="#38bdf8" />
        </svg>
      );
    case "sonar-pulse":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <circle cx="12" cy="12" r="9.5" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1" strokeDasharray="3 2" fill="rgba(16, 185, 129, 0.1)" />
          <circle cx="12" cy="12" r="4.5" stroke="#10b981" strokeWidth="1.2" fill="rgba(16, 185, 129, 0.2)" />
          <path d="M12 0 L12 3 M12 21 L12 24 M0 12 L3 12 M21 12 L24 12" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2" fill="#34d399" />
        </svg>
      );
    case "obsidian-glow":
      return (
        <svg viewBox="0 0 24 24" className="size-6 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.85)]">
          <path
            d="M0 0 L0 18 L5 13.5 L9 22 L12 20.5 L8 12.5 L14.5 12.5 Z"
            fill="#09090b"
            stroke="#c084fc"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "neon-laser":
      return (
        <svg viewBox="0 0 24 24" className="size-6 filter drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
          <path d="M2 2 L8 22 L12 14 Z" fill="#06b6d4" />
          <path d="M2 2 L12 14 L20 12 Z" fill="#ec4899" />
          <path d="M2 2 L8 22 L12 14 L20 12 Z M2 2 L12 14" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case "spotlight-glow":
      return (
        <svg viewBox="0 0 32 32" className="size-8">
          <defs>
            <radialGradient id="canvasSpotlightGlowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="url(#canvasSpotlightGlowGrad)" />
          <circle cx="16" cy="16" r="3.5" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.5" />
        </svg>
      );
    case "aurora-trail":
      return (
        <svg viewBox="0 0 24 24" className="size-6 filter drop-shadow-[0_0_8px_rgba(45,212,191,0.7)]">
          <defs>
            <linearGradient id="canvasAuroraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <path d="M10 16 Q14 18 19 21" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" fill="none" />
          <path d="M13 13 Q17 14 22 16" stroke="#2dd4bf" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" fill="none" />
          <path d="M2 2 L5 18 L10 13 L17 11 Z" fill="url(#canvasAuroraGrad)" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      );
    case "gradient-beam":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <defs>
            <linearGradient id="canvasGradientBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff7a1a" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <path
            d="M2 2 L2 19 L6.8 14.5 L11 22.5 L13.8 21 L9.8 13.2 L16.5 13.2 Z"
            fill="url(#canvasGradientBeamGrad)"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "precision-pen":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <path d="M2 2 L9 5 L16 13 L13 16 L5 9 Z" fill="#e2e8f0" stroke="#0f172a" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M13 16 L16 13 L20 17 L17 20 Z" fill="#eab308" stroke="#0f172a" strokeWidth="1.2" strokeLinejoin="round" />
          <line x1="2" y1="2" x2="8" y2="8" stroke="#0f172a" strokeWidth="1.2" />
          <circle cx="8" cy="8" r="1.5" fill="#0f172a" />
        </svg>
      );
    case "highlighter":
      return (
        <svg viewBox="0 0 24 24" className="size-6 filter drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]">
          <path d="M2 2 L6 1 L9 6 L4 8 Z" fill="#fde047" stroke="#ca8a04" strokeWidth="1" strokeLinejoin="round" />
          <path d="M4 8 L9 6 L12 10 L7 12 Z" fill="#334155" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
          <path d="M7 12 L12 10 L19 19 L14 21 Z" fill="#facc15" stroke="#0f172a" strokeWidth="1" strokeLinejoin="round" />
        </svg>
      );
    case "tactile-pointer":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <path
            d="M7 2 C8.2 2 9 2.8 9 4 L9 11 C9.5 10.5 10.5 10.2 11.2 10.2 C12.2 10.2 12.8 11 13 12 C13.5 11.2 14.5 11.2 15.2 11.8 C16 12.5 16 13.5 16 14.5 C16 17.5 14 21 11 22 L5 22 C3.5 21 2 18.5 2 16 L2 13 C2 11.5 3.5 11 4.5 12.5 L5.5 14 L5.5 4 C5.5 2.8 6 2 7 2 Z"
            fill="#ffffff"
            stroke="#1e2024"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M9 8 L13 8" stroke="#cbd5e1" strokeWidth="1" strokeLinecap="round" />
        </svg>
      );
    case "cyber-arrow":
      return (
        <svg viewBox="0 0 24 24" className="size-6 filter drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]">
          <path d="M2 2 L20 11 L13 13 L11 20 Z" fill="#1e293b" stroke="#34d399" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M6 5 L14 10 L10 11 L9 14 Z" fill="#10b981" />
        </svg>
      );
    case "terminal-caret":
      return (
        <svg viewBox="0 0 24 24" className="size-6 filter drop-shadow-[0_0_6px_rgba(34,197,94,0.7)]">
          <path d="M2 5 L8 10 L2 15" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <rect x="11" y="6" width="7" height="10" rx="1" fill="#4ade80" />
        </svg>
      );
    case "retro-pixel":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <path
            d="M0 0 L0 18 L4 18 L4 14 L7 14 L7 18 L10 18 L10 12 L13 12 L13 8 L9 8 L9 4 L4 4 L4 0 Z"
            fill="#ffffff"
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinejoin="miter"
          />
        </svg>
      );
    case "glass-orb":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <circle cx="12" cy="12" r="9.5" fill="rgba(15, 23, 42, 0.6)" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="1.5" />
          <ellipse cx="9" cy="8.5" rx="3" ry="1.8" transform="rotate(-30 9 8.5)" fill="rgba(255, 255, 255, 0.85)" />
          <circle cx="12" cy="12" r="1.5" fill="#38bdf8" />
        </svg>
      );
    case "smooth-chubby":
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <path
            d="M4 4 C4 3 5.5 3 6 4 L17 14 C18 15 17.5 16.5 16 16.5 L11.5 16.5 L8.5 21.5 C7.8 22.5 6.5 22 6 21 L4 5 Z"
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth="1.8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="size-6 drop-shadow-md">
          <path
            d="M1 1 L1 18.5 Q3.5 16 5.5 14.5 L9.2 22.8 Q10.7 22.1 12.2 21.4 L8.6 13.4 L14.8 13.4 Q7.5 7 1 1 Z"
            fill="#ffffff"
            stroke="#171717"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export function CursorAvatarBadge({
  avatar,
  hx,
  hy,
}: {
  avatar?: CursorAvatar;
  hx: number;
  hy: number;
}) {
  if (!avatar?.enabled) return null;
  const bx = hx > 8 ? hx + 12 : hx + 16;
  const by = hy > 8 ? hy + 12 : hy + 16;
  const color = avatar.color || "#6366f1";

  return (
    <div
      className="absolute pointer-events-none flex items-center select-none"
      style={{
        left: `${bx}px`,
        top: `${by}px`,
      }}
    >
      <div
        className={`flex items-center rounded-full shadow-md ${
          avatar.badgeLabel
            ? "border border-white/20 bg-slate-900/90 pl-0 pr-2 py-0.5 gap-1.5 backdrop-blur-sm"
            : ""
        }`}
      >
        <div
          className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white text-[9px] font-bold text-white shadow-sm overflow-hidden"
          style={{ backgroundColor: color }}
        >
          {avatar.type === "initials" && (avatar.value || "DL").slice(0, 3).toUpperCase()}
          {avatar.type === "text" && (avatar.value || "Host")}
          {avatar.type === "icon" && (
            avatar.value === "star" ? <Star className="size-2.5" /> :
            avatar.value === "zap" ? <Zap className="size-2.5" /> :
            avatar.value === "flame" ? <Flame className="size-2.5" /> :
            avatar.value === "shield" ? <Shield className="size-2.5" /> :
            avatar.value === "crown" ? <Crown className="size-2.5" /> :
            avatar.value === "check" ? <Check className="size-2.5" /> :
            avatar.value === "heart" ? <Heart className="size-2.5" /> :
            avatar.value === "user" ? <User className="size-2.5" /> :
            <Sparkles className="size-2.5" />
          )}
          {avatar.type === "image" && (
            avatar.value ? (
              <img src={avatar.value} alt="Avatar" className="size-full object-cover" />
            ) : (
              <User className="size-2.5" />
            )
          )}
        </div>
        {avatar.badgeLabel && (
          <span className="text-[9px] font-semibold text-slate-100 whitespace-nowrap tracking-wide leading-none">
            {avatar.badgeLabel}
          </span>
        )}
      </div>
    </div>
  );
}

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
      ensureCursorTrajectory(project.cursorTrajectory, clicks),
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
  const cursorOverlayRef = useRef<HTMLDivElement>(null);
  const glareOverlayRef = useRef<HTMLDivElement>(null);
  const looksRef = useRef(looks);
  looksRef.current = looks;
  const interactionsRef = useRef(project.interactions);
  interactionsRef.current = project.interactions;
  const keyframesRef = useRef(project.keyframes);
  keyframesRef.current = project.keyframes;
  // Refs for aspect ratios accessible inside rAF closure without stale closure issues
  const videoAspectRef = useRef<number | null>(null);
  const viewAspectRef = useRef<number | null>(null);

  const camera = useMemo(() => computeCamera(currentTimeMs), [computeCamera, currentTimeMs]);
  const tilt3D = useMemo(
    () => evaluate3DTiltAtTime(currentTimeMs, looks, project.interactions, project.keyframes),
    [currentTimeMs, looks, project.interactions, project.keyframes],
  );

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

  // Synchronize video voice/audio with clip settings (unmute video so recorded voice actually plays!)
  const primaryClip = project.clips?.[0];
  const isClipMuted = primaryClip?.muted ?? false;
  const clipVolume = primaryClip?.volume ?? 1;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isClipMuted;
    video.volume = Math.max(0, Math.min(1, clipVolume));
  }, [isClipMuted, clipVolume]);

  // When playback starts, immediately seed the zoom layer transform via DOM so
  // there is no single-frame blank between React removing the inline style and
  // the first rAF frame writing the correct value.
  useEffect(() => {
    if (!isPlaying) return;
    const layer = zoomLayerRef.current;
    if (!layer) return;
    const cam = computeCameraRef.current(currentTimeMs);
    const mapped = mapVideoPointToViewport(cam.x, cam.y, videoAspectRef.current, viewAspectRef.current);
    layer.style.transform = `scale(${cam.scale}) translate3d(${(0.5 - mapped.x) * 100}%, ${(0.5 - mapped.y) * 100}%, 0)`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

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
        // Apply viewport aspect-ratio correction to prevent camera shaking when
        // video aspect ≠ viewport aspect (the React render path uses camView, so rAF must too)
        const vAspect = videoAspectRef.current;
        const vpAspect = viewAspectRef.current;
        const mapped = mapVideoPointToViewport(cam.x, cam.y, vAspect, vpAspect);
        layer.style.transform = `scale(${cam.scale}) translate3d(${(0.5 - mapped.x) * 100}%, ${(0.5 - mapped.y) * 100}%, 0)`;

        // Drive cursor overlay at 60fps via direct DOM — avoids React 12Hz throttle lag
        const cursorEl = cursorOverlayRef.current;
        if (cursorEl) {
          const cMapped = mapVideoPointToViewport(cam.cursorX, cam.cursorY, vAspect, vpAspect);
          cursorEl.style.left = `${cMapped.x * 100}%`;
          cursorEl.style.top = `${cMapped.y * 100}%`;
        }

        // Drive 3D frame tilt & kinetic motion at 60fps via direct DOM
        const vp = viewportRef.current;
        const lk = looksRef.current;
        if (vp && (lk.tiltAnimation !== "none" || lk.tiltX || lk.tiltY || lk.tiltZ || lk.tiltAngle)) {
          const t3D = evaluate3DTiltAtTime(frameMs, lk, interactionsRef.current, keyframesRef.current);
          vp.style.transform = `perspective(${t3D.perspective}px) rotateX(${t3D.rotateX}deg) rotateY(${t3D.rotateY}deg) rotateZ(${t3D.rotateZ}deg)`;
          if (glareOverlayRef.current && lk.tiltGlare) {
            glareOverlayRef.current.style.background = `radial-gradient(circle at ${t3D.glareX}% ${t3D.glareY}%, rgba(255, 255, 255, 0.16) 0%, transparent 65%)`;
          }
        }
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
    if (looks.aspectRatio && looks.aspectRatio !== "auto") {
      if (looks.aspectRatio === "9:16") return "9 / 16";
      if (looks.aspectRatio === "1:1") return "1 / 1";
      if (looks.aspectRatio === "4:3") return "4 / 3";
      if (looks.aspectRatio === "16:9") return "16 / 9";
    }
    return naturalAspectRatio || (summary.width && summary.height ? `${summary.width} / ${summary.height}` : "16 / 9");
  }, [looks.aspectRatio, naturalAspectRatio, summary.width, summary.height]);

  const parseAspect = (v: string | null | undefined): number | null => {
    if (!v) return null;
    const [a, b] = v.split("/").map((n) => parseFloat(n.trim()));
    return a && b ? a / b : null;
  };
  const videoAspectNum = parseAspect(naturalAspectRatio) ?? (summary.width && summary.height ? summary.width / summary.height : null);
  const viewAspectNum = parseAspect(viewportAspectRatio);
  // Keep refs up-to-date so rAF loop always has fresh aspect ratios (no stale closure)
  videoAspectRef.current = videoAspectNum;
  viewAspectRef.current = viewAspectNum;
  const mapPt = (x: number, y: number) => mapVideoPointToViewport(x, y, videoAspectNum, viewAspectNum);
  const camView = mapPt(camera.x, camera.y);
  const cursorView = mapPt(camera.cursorX, camera.cursorY);

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
        padding: looks.padding === 0 ? "0px" : `clamp(4px, 2vw, ${looks.padding}px)`,
        perspective: "1200px",
      }}
    >
      {/* Ambient Video Blur Glow (Apple Keynote Style) */}
      {looks.ambientBackdropBlur && (resolvedMediaSrc || thumbnailSrc) && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 blur-3xl scale-110 select-none">
          {resolvedMediaSrc ? (
            <video
              ref={(el) => {
                if (el) {
                  el.muted = true;
                  el.volume = 0;
                }
              }}
              src={resolvedMediaSrc}
              muted
              playsInline
              aria-hidden="true"
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
        className="relative flex flex-col max-h-full max-w-full overflow-hidden bg-ink-950 cursor-crosshair group select-none transition-transform duration-300"
        style={{
          aspectRatio: viewportAspectRatio,
          borderRadius: `${looks.borderRadius}px`,
          boxShadow: looks.padding === 0 ? "none" : (shadowStyles[looks.shadow] || shadowStyles.lift),
          transform: `perspective(${tilt3D.perspective}px) rotateX(${tilt3D.rotateX}deg) rotateY(${tilt3D.rotateY}deg) rotateZ(${tilt3D.rotateZ}deg)`,
          transformStyle: "preserve-3d",
        }}
        title="Click anywhere to shift camera focal center"
      >
        {/* Specular Glass Glare Sheen Overlay */}
        {looks.tiltGlare && (
          <div
            ref={glareOverlayRef}
            className="pointer-events-none absolute inset-0 z-30 transition-opacity duration-150"
            style={{
              background: `radial-gradient(circle at ${tilt3D.glareX}% ${tilt3D.glareY}%, rgba(255, 255, 255, 0.16) 0%, transparent 65%)`,
            }}
          />
        )}
        {/* User photo placeholder overlay */}
        {looks.photoOverlay?.src && (
          <img
            src={looks.photoOverlay.src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute z-40 object-cover border-2 border-white/90 shadow-xl"
            style={{
              left: `${looks.photoOverlay.x * 100}%`,
              top: `${looks.photoOverlay.y * 100}%`,
              width: `${looks.photoOverlay.size * 100}%`,
              aspectRatio: "1 / 1",
              transform: "translate(-50%, -50%)",
              borderRadius:
                looks.photoOverlay.shape === "circle" ? "9999px" : looks.photoOverlay.shape === "rounded" ? "22%" : "0",
            }}
          />
        )}

        {/* Modular Window Mockup Shell Bar */}
        {looks.windowFrame && looks.windowFrame !== "none" && (
          <>
            {/* macOS Window */}
            {looks.windowFrame === "macos" && (
              <div className="relative w-full shrink-0 h-7 z-30 flex items-center justify-between px-3 bg-[#1e1e20]/90 backdrop-blur-md border-b border-white/10 select-none pointer-events-none">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="size-2.5 rounded-full bg-[#ff5f56] border border-black/20" />
                  <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-black/20" />
                  <span className="size-2.5 rounded-full bg-[#27c93f] border border-black/20" />
                </div>
                <div className="w-12 shrink-0" />
              </div>
            )}

            {/* Windows Terminal */}
            {looks.windowFrame === "windows" && (
              <div className="relative w-full shrink-0 h-8 z-30 flex items-center justify-between px-2 bg-[#1f1f1f] border-b border-white/10 select-none pointer-events-none">
                <div className="flex items-center gap-1.5 h-full pt-1">
                  <div className="flex items-center gap-2 bg-[#2d2d2d] text-white px-2.5 py-1 rounded-t text-[11px] font-mono border-t-2 border-sky-400 shadow-sm">
                    <span className="text-sky-400 font-bold text-xs select-none">&gt;_</span>
                    <span className="text-neutral-400 text-[10px] ml-1">✕</span>
                  </div>
                  <span className="text-neutral-400 text-xs px-1 select-none">+</span>
                </div>
                <div className="flex items-center text-neutral-400">
                  <div className="w-7 h-6 flex items-center justify-center">
                    <span className="w-2.5 h-[1.5px] bg-neutral-300" />
                  </div>
                  <div className="w-7 h-6 flex items-center justify-center">
                    <span className="size-2.5 border-[1.5px] border-neutral-300 rounded-[1px]" />
                  </div>
                  <div className="w-7 h-6 flex items-center justify-center">
                    <span className="text-xs font-light text-neutral-300 leading-none">✕</span>
                  </div>
                </div>
              </div>
            )}

            {/* macOS Terminal */}
            {looks.windowFrame === "terminal" && (
              <div className="relative w-full shrink-0 h-7 z-30 flex items-center justify-between px-3 bg-[#18181a] border-b border-white/10 select-none pointer-events-none">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="size-2.5 rounded-full bg-[#ff5f56] border border-black/20" />
                  <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-black/20" />
                  <span className="size-2.5 rounded-full bg-[#27c93f] border border-black/20" />
                </div>
                <div className="w-12 shrink-0" />
              </div>
            )}

            {/* Google Chrome */}
            {looks.windowFrame === "chrome" && (
              <div className="relative w-full shrink-0 z-30 bg-[#202124] border-b border-white/10 select-none pointer-events-none">
                <div className="h-6 flex items-center px-2 pt-1 gap-1">
                  <div className="flex items-center gap-1.5 bg-[#292a2d] text-white px-2.5 py-0.5 rounded-t-md text-[10px] border-t border-x border-white/10 shadow-sm w-20">
                    <svg className="size-2.5 text-neutral-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span className="text-neutral-400 text-[8px] ml-auto">✕</span>
                  </div>
                  <span className="text-neutral-400 text-[10px] px-1">+</span>
                </div>
                <div className="h-6 flex items-center px-2 pb-1 gap-2">
                  <div className="flex items-center gap-1 text-neutral-400 text-[10px]">
                    <span>←</span>
                    <span>→</span>
                    <span>↻</span>
                  </div>
                  <div className="flex-1 flex items-center gap-1 bg-[#18181a] rounded-full px-2.5 py-0.5 text-[9.5px] border border-white/10 font-sans max-w-xs h-4">
                    <span className="text-neutral-400 text-[8px]">🔒</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] pr-1">
                    <span>☆</span>
                    <span>⋮</span>
                  </div>
                </div>
              </div>
            )}

            {/* Apple Safari */}
            {looks.windowFrame === "safari" && (
              <div className="relative w-full shrink-0 h-7 z-30 flex items-center justify-between px-3 bg-[#242426]/95 backdrop-blur-md border-b border-white/10 select-none pointer-events-none">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="size-2.5 rounded-full bg-[#ff5f56] border border-black/20" />
                    <span className="size-2.5 rounded-full bg-[#ffbd2e] border border-black/20" />
                    <span className="size-2.5 rounded-full bg-[#27c93f] border border-black/20" />
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-400 text-[10px] font-semibold pl-1">
                    <span>‹</span>
                    <span>›</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md bg-white/10 px-2.5 py-0.5 text-[10px] font-sans text-neutral-200 border border-white/10 max-w-xs flex-1 mx-3 h-4">
                  <span className="text-neutral-400 text-[9px]">🔒</span>
                  <span className="text-neutral-400 text-[9px] ml-auto">↻</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-400 text-xs">
                  <span>⎋</span>
                  <span>⊞</span>
                </div>
              </div>
            )}

            {/* Frosted Glass */}
            {looks.windowFrame === "glass" && (
              <div className="relative w-full shrink-0 h-7 z-30 flex items-center justify-between px-3 bg-white/5 backdrop-blur-xl border-b border-white/10 select-none pointer-events-none">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="size-2 rounded-full bg-white/40" />
                  <span className="size-2 rounded-full bg-white/25" />
                  <span className="size-2 rounded-full bg-white/20" />
                </div>
                <div className="w-10 shrink-0" />
              </div>
            )}
          </>
        )}

        {/* Dynamic Zooming Video Container: zero latency with hardware accelerated 3D transform */}
        <div
          ref={zoomLayerRef}
          className={`relative ${looks.windowFrame && looks.windowFrame !== "none" ? "flex-1 min-h-0 w-full" : "size-full"} origin-center will-change-transform overflow-hidden`}
          style={{
            // When playing, rAF is the SOLE owner of this transform (60fps via direct DOM write).
            // Setting undefined here prevents React re-renders (throttled to ~12fps via setCurrentTime)
            // from overwriting the rAF value with a stale frame → eliminates camera shake/flicker.
            transform: isPlaying
              ? undefined
              : `scale(${camera.scale}) translate3d(${(0.5 - camView.x) * 100}%, ${(0.5 - camView.y) * 100}%, 0)`,
            transition: isPlaying ? "none" : "transform 0.1s ease-out",
          }}
        >
          {resolvedMediaSrc ? (
            <video
              ref={videoRef}
              src={resolvedMediaSrc}
              poster={thumbnailSrc || undefined}
              playsInline
              preload="auto"
              style={{
                filter: effectsState.filterStyle || undefined,
                imageRendering: "auto",
                WebkitBackfaceVisibility: "hidden",
                backfaceVisibility: "hidden",
                transform: "translateZ(0)",
              }}
              className={`size-full pointer-events-none ${looks.fit === "cover" ? "object-cover" : "object-contain"}`}
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
              className={`size-full pointer-events-none ${looks.fit === "cover" ? "object-cover" : "object-contain"}`}
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
          {looks.showCursor && looks.cursorStyle !== "hidden" && (() => {
            const preset = getCursorPreset(looks.cursorStyle) || getCursorPreset("mac")!;
            const [hx, hy] = preset.hotspot;
            const cursorScale = looks.cursorSize || 1.4;

            return (
              <div
                ref={cursorOverlayRef}
                className="pointer-events-none absolute will-change-transform z-30"
                style={{
                  left: `${cursorView.x * 100}%`,
                  top: `${cursorView.y * 100}%`,
                  transform: `translate3d(-${hx * cursorScale}px, -${hy * cursorScale}px, 0) scale(${cursorScale})`,
                  transformOrigin: "0 0",
                }}
              >
                <CanvasCursorSvg cursorStyle={looks.cursorStyle} />

                {/* Presenter Avatar Badge pinned to cursor */}
                <CursorAvatarBadge avatar={looks.cursorAvatar} hx={hx} hy={hy} />

                {/* Dynamic Cursor Glow Effect */}
                {effectsState.glow && (
                  <div className="absolute -inset-3 rounded-full border border-white/60 bg-white/20 animate-pulse pointer-events-none shadow-[0_0_16px_rgba(255,255,255,0.5)]" />
                )}
              </div>
            );
          })()}

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
                  left: `${mapPt(click.x, click.y).x * 100}%`,
                  top: `${mapPt(click.x, click.y).y * 100}%`,
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

        {/* Dynamic Kinetic Text Cards on Video */}
        {project.textOverlays?.map((textOverlay) => {
          const motion = evaluateTextOverlayMotion(textOverlay, currentTimeMs);
          if (motion.opacity <= 0.001) return null;

          const cardStyleKey: TextCardStyle = textOverlay.cardStyle || "glass";
          const cardDef = TEXT_CARD_STYLE_DEFINITIONS[cardStyleKey] || TEXT_CARD_STYLE_DEFINITIONS.glass;
          const kickerText = textOverlay.kicker || textOverlay.badge;
          const isTerminal = cardStyleKey === "terminal";
          const isMinimal = cardStyleKey === "minimal";

          const cardBg = textOverlay.bgColor || cardDef.defaultBgColor;
          const textColor = textOverlay.color || cardDef.defaultColor;
          const fontFamily = textOverlay.typography?.fontFamily || cardDef.fontFamily || "inherit";

          return (
            <div
              key={textOverlay.id}
              data-testid={`text-overlay-${textOverlay.id}`}
              data-card-style={cardStyleKey}
              data-motion-preset={textOverlay.motionPreset || "smooth-fade"}
              className="absolute pointer-events-none z-20 text-center select-none flex flex-col items-center"
              style={{
                left: `${(textOverlay.x ?? 0.5) * 100}%`,
                top: `${(textOverlay.y ?? 0.85) * 100}%`,
                transform: `translate3d(calc(-50% + ${motion.translateX}px), calc(-50% + ${motion.translateY}px), 0) scale(${motion.scale})`,
                opacity: motion.opacity,
                filter: motion.blur > 0.08 ? `blur(${motion.blur}px)` : undefined,
                transformOrigin: "center center",
                willChange: "transform, opacity, filter",
                transition: isPlaying ? "none" : "transform 0.08s ease-out, opacity 0.08s ease-out",
              }}
            >
              <div
                className="flex flex-col items-center"
                style={{
                  background: cardBg,
                  border: cardDef.borderStyle,
                  boxShadow: cardDef.boxShadow,
                  backdropFilter: cardDef.backdropBlurPx > 0 ? `blur(${cardDef.backdropBlurPx}px)` : undefined,
                  WebkitBackdropFilter: cardDef.backdropBlurPx > 0 ? `blur(${cardDef.backdropBlurPx}px)` : undefined,
                  padding: isMinimal ? "3px 6px" : "6px 14px",
                  borderRadius: isTerminal ? "6px" : "10px",
                  fontFamily,
                  maxWidth: "85vw",
                }}
              >
                {/* Unboxed Kinetic Kicker (Zero Pill Badges) */}
                {kickerText && (
                  <div
                    data-testid={`text-kicker-${textOverlay.id}`}
                    className="text-[10px] font-bold tracking-wider leading-none select-none mb-1 opacity-90"
                    style={{
                      color: looks.brandAccentColor || (isTerminal ? "#4ade80" : "#a5b4fc"),
                      letterSpacing: textOverlay.typography?.letterSpacing || "0.08em",
                      textTransform: textOverlay.typography?.kickerTransform || "uppercase",
                      fontFamily,
                    }}
                  >
                    {kickerText}
                  </div>
                )}

                {/* Headline Typography */}
                <div
                  data-testid={`text-headline-${textOverlay.id}`}
                  className="font-bold leading-tight select-none tracking-tight whitespace-pre-wrap"
                  style={{
                    fontSize: `${textOverlay.fontSize || 14}px`,
                    color: textColor,
                    fontWeight: textOverlay.typography?.fontWeight || "700",
                    letterSpacing: textOverlay.typography?.letterSpacing || "-0.015em",
                    textShadow: isMinimal ? "0 2px 12px rgba(0, 0, 0, 0.75)" : undefined,
                  }}
                >
                  {textOverlay.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
