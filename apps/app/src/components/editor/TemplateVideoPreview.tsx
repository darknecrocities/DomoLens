import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Terminal,
  Wand2,
  Flame,
  MousePointer,
  CheckCircle2,
} from "lucide-react";
import type { MotionTemplate, MotionSignatureType } from "@domolens/core";
import { useEditor } from "../../store/editor";
import { platform } from "../../platform";

interface TemplateVideoPreviewProps {
  template: MotionTemplate;
  customFields: Record<string, string>;
}

export function TemplateVideoPreview({ template, customFields }: TemplateVideoPreviewProps) {
  const project = useEditor((s) => s.project);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isChoreographyActive, setIsChoreographyActive] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoSrc, setVideoSrc] = useState<string>("/domolens_app_live_demo.mp4");

  // Determine active video source: project clip -> fallback to bundled high-res sample video
  useEffect(() => {
    let activeSrc = "/domolens_app_live_demo.mp4";
    if (project?.clips && project.clips.length > 0 && project.clips[0]?.mediaUrl) {
      activeSrc = platform.mediaUrl(project.clips[0].mediaUrl);
    } else if (project?.summary?.media) {
      activeSrc = platform.mediaUrl(project.summary.media);
    }
    setVideoSrc(activeSrc);
  }, [project]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };
    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("ended", handleEnded);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("ended", handleEnded);
    };
  }, [videoSrc]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
  };

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * duration;
  };

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const ms = Math.floor((secs % 1) * 10);
    return `0:${s < 10 ? "0" : ""}${s}.${ms}`;
  };

  const accentColor = customFields["accent"] || template.accentColor || "#6366f1";
  const badgeText = customFields["badge"] || template.badge || "FEATURED";
  const headlineText = customFields["headline"] || template.name;
  const tiltAngle = template.looks.tiltAngle || 0;
  const windowFrame = template.looks.windowFrame || "macos";
  const motionSig = template.motionSignature;

  // Calibrate stage dimensions with plenty of breathing room so background mesh & tilt shine
  const getAspectDimensions = () => {
    switch (template.aspectRatio) {
      case "9:16":
        return "aspect-[9/16] h-[185px] w-auto max-w-[110px]";
      case "1:1":
        return "aspect-square h-[175px] w-auto max-w-[175px]";
      case "4:3":
        return "aspect-[4/3] h-[170px] w-auto max-w-[230px]";
      case "16:9":
      default:
        return "aspect-video w-[88%] max-w-[340px]";
    }
  };

  // Determine motion signature type fallback
  const getMotionType = (): MotionSignatureType => {
    if (motionSig?.type) return motionSig.type;
    switch (template.id) {
      case "saas-launch-hero":
        return "3d-gyro-float";
      case "apple-keynote-polish":
        return "cinematic-push";
      case "feature-drop-changelog":
        return "rhythmic-punch";
      case "viral-short-tiktok":
        return "kinetic-phone";
      case "developer-cli":
        return "cli-scanlines";
      case "micro-tutorial":
        return "step-focus";
      case "product-hunt-teaser":
        return "isometric-upvote";
      case "enterprise-security":
        return "radar-scan";
      case "interactive-click":
        return "click-ripples";
      case "dribbble-design-reel":
      default:
        return "curved-cursor";
    }
  };

  const activeMotionType = getMotionType();

  // Signature Motion Animation Choreography Profiles for Container
  const getStageMotionProps = (): { animate: any; transition?: any } => {
    if (!isChoreographyActive) {
      return {
        animate: {
          rotateX: tiltAngle > 0 ? tiltAngle * 0.65 : 0,
          rotateY: tiltAngle > 0 ? -tiltAngle * 0.35 : 0,
          rotateZ: 0,
          scale: 1,
          x: 0,
          y: 0,
        },
        transition: { duration: 0.4 },
      };
    }

    switch (activeMotionType) {
      case "3d-gyro-float":
        return {
          animate: {
            rotateX: [tiltAngle * 0.65, tiltAngle * 0.85, tiltAngle * 0.5, tiltAngle * 0.65],
            rotateY: [-tiltAngle * 0.35, -tiltAngle * 0.15, -tiltAngle * 0.45, -tiltAngle * 0.35],
            y: [0, -6, 0],
            scale: [1, 1.015, 1],
          },
          transition: { repeat: Infinity, duration: 6, ease: "easeInOut" },
        };

      case "cinematic-push":
        return {
          animate: {
            scale: [1.0, 1.055, 1.0],
            y: [0, -3, 0],
            rotateX: [0, 0.5, 0],
          },
          transition: { repeat: Infinity, duration: 7.5, ease: "easeInOut" },
        };

      case "rhythmic-punch":
        return {
          animate: {
            scale: [1.0, 1.0, 1.15, 1.15, 1.0],
            x: [0, 0, -8, -8, 0],
            y: [0, 0, -5, -5, 0],
            rotateX: [tiltAngle * 0.6, tiltAngle * 0.6, tiltAngle * 0.8, tiltAngle * 0.8, tiltAngle * 0.6],
          },
          transition: {
            repeat: Infinity,
            duration: 5.5,
            times: [0, 0.45, 0.52, 0.88, 0.95],
            ease: "easeInOut",
          },
        };

      case "kinetic-phone":
        return {
          animate: {
            rotateZ: [-1.4, 1.4, -1.4],
            rotateY: [-3, 3, -3],
            y: [0, -5, 0],
          },
          transition: { repeat: Infinity, duration: 4.2, ease: "easeInOut" },
        };

      case "cli-scanlines":
        return {
          animate: {
            x: [0, -0.4, 0.4, 0],
            y: [0, -0.3, 0.3, 0],
            rotateX: [tiltAngle * 0.6, tiltAngle * 0.65, tiltAngle * 0.55, tiltAngle * 0.6],
          },
          transition: { repeat: Infinity, duration: 3.5, ease: "easeInOut" },
        };

      case "isometric-upvote":
        return {
          animate: {
            rotateX: [10, 12, 10],
            rotateY: [-8, -6, -8],
            rotateZ: [1, 2, 1],
            y: [0, -5, 0],
            scale: [1, 1.02, 1],
          },
          transition: { repeat: Infinity, duration: 4.8, ease: "easeInOut" },
        };

      case "step-focus":
        return {
          animate: {
            scale: [1.0, 1.03, 1.0],
            y: [0, -2, 0],
          },
          transition: { repeat: Infinity, duration: 6, ease: "easeInOut" },
        };

      case "radar-scan":
        return {
          animate: {
            rotateX: 0,
            rotateY: 0,
            scale: [1.0, 1.01, 1.0],
          },
          transition: { repeat: Infinity, duration: 5, ease: "easeInOut" },
        };

      case "click-ripples":
        return {
          animate: {
            rotateX: [tiltAngle * 0.6, tiltAngle * 0.7, tiltAngle * 0.6],
            rotateY: [-tiltAngle * 0.3, -tiltAngle * 0.4, -tiltAngle * 0.3],
            scale: [1.0, 1.018, 1.0],
          },
          transition: { repeat: Infinity, duration: 4, ease: "easeInOut" },
        };

      case "curved-cursor":
      default:
        return {
          animate: {
            y: [0, -4, 0],
            rotateX: [tiltAngle * 0.6, tiltAngle * 0.7, tiltAngle * 0.6],
            rotateY: [-tiltAngle * 0.3, -tiltAngle * 0.2, -tiltAngle * 0.3],
          },
          transition: { repeat: Infinity, duration: 5.5, ease: "easeInOut" },
        };
    }
  };

  return (
    <div className="relative flex flex-col rounded-xl border border-white/10 bg-neutral-950/80 shadow-2xl overflow-hidden group shrink-0 w-full">
      {/* Stage Backdrop matching template's backgroundValue or gradient */}
      <div
        className="relative w-full h-[240px] shrink-0 flex items-center justify-center p-2.5 overflow-hidden transition-all duration-500"
        style={{
          background:
            template.looks.backgroundValue ||
            "linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)",
        }}
      >
        {/* Ambient atmospheric backdrop glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-45 blur-3xl transition-colors duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accentColor} 0%, transparent 65%)`,
          }}
        />

        {/* Cyberpunk Grid Overlay for Developer CLI & Enterprise templates */}
        {(activeMotionType === "cli-scanlines" || activeMotionType === "radar-scan") && isChoreographyActive && (
          <div
            className="pointer-events-none absolute inset-0 opacity-15"
            style={{
              backgroundImage: `linear-gradient(${accentColor}20 1px, transparent 1px), linear-gradient(90deg, ${accentColor}20 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
            }}
          />
        )}

        {/* Top Badges & Motion Signature Info Bar */}
        <div className="absolute top-2 inset-x-2.5 flex items-center justify-between z-30 pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-full bg-black/75 backdrop-blur-md px-2.5 py-0.5 border border-white/15 shadow-lg">
            <Sparkles className="size-3 text-amber-400 shrink-0" />
            <span className="text-[10px] font-mono text-neutral-200 uppercase font-semibold truncate max-w-[150px]">
              {template.name}
            </span>
            {motionSig && (
              <span
                className="hidden sm:inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[8px] font-mono font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${accentColor}30`,
                  color: accentColor,
                  border: `1px solid ${accentColor}50`,
                }}
              >
                <span>✦</span>
                <span>{motionSig.badge}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {tiltAngle > 0 && (
              <span className="rounded-full bg-indigo-500/25 text-indigo-300 px-1.5 py-0.5 text-[9px] font-mono font-bold border border-indigo-500/30">
                {tiltAngle}° 3D
              </span>
            )}
            <span className="rounded-full bg-black/65 text-neutral-200 px-1.5 py-0.5 text-[9px] font-mono font-bold border border-white/10">
              {template.aspectRatio}
            </span>
          </div>
        </div>

        {/* 3D Tilted / Animated Video Stage Container */}
        <motion.div
          {...getStageMotionProps()}
          className={`relative ${getAspectDimensions()} shrink-0 rounded-lg overflow-hidden border border-white/15 bg-black shadow-2xl transition-all duration-300 z-10 flex flex-col justify-between`}
          style={{
            perspective: 900,
            boxShadow: `0 22px 50px -10px rgba(0,0,0,0.85), 0 0 35px ${accentColor}25`,
          }}
        >
          {/* Window Frame Bar */}
          {windowFrame !== "none" && (
            <div className="flex items-center justify-between px-2 py-1 bg-black/90 backdrop-blur-md border-b border-white/10 z-20 shrink-0">
              {windowFrame === "macos" && (
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500/90" />
                  <span className="size-2 rounded-full bg-amber-500/90" />
                  <span className="size-2 rounded-full bg-emerald-500/90" />
                  <span className="ml-1 text-[8px] font-mono text-neutral-400 truncate max-w-[120px]">
                    {template.looks.mockupUrl || "DomoLens Studio"}
                  </span>
                </div>
              )}
              {windowFrame === "safari" && (
                <div className="flex items-center gap-1.5 w-full">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-neutral-600" />
                    <span className="size-1.5 rounded-full bg-neutral-600" />
                  </div>
                  <div className="mx-auto rounded bg-neutral-900 px-2.5 py-0.5 text-[8px] font-mono text-neutral-400 border border-white/5 truncate max-w-[130px]">
                    {template.looks.mockupUrl || "domolens.app/pro"}
                  </div>
                </div>
              )}
              {windowFrame === "terminal" && (
                <div className="flex items-center gap-1.5">
                  <Terminal className="size-2.5 text-emerald-400" />
                  <span className="text-[8px] font-mono text-neutral-300">
                    {template.looks.mockupUrl || "bash — 80x24"}
                  </span>
                </div>
              )}
              {windowFrame === "windows" && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[8px] font-mono text-neutral-400 truncate max-w-[130px]">
                    {template.looks.mockupUrl || "DomoLens Studio"}
                  </span>
                  <div className="flex items-center gap-1 text-[7px] text-neutral-400">
                    <span>—</span>
                    <span>□</span>
                    <span>✕</span>
                  </div>
                </div>
              )}
              {windowFrame === "glass" && (
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-white/40" />
                  <span className="text-[8px] font-mono text-neutral-300">
                    {template.aspectRatio === "9:16" ? "Mobile Story View" : "Glass View"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Real Video Element & Signature Motion Overlays */}
          <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onError={() => setVideoSrc("/domolens_app_live_demo.mp4")}
              className="size-full object-cover"
            />

            {/* --- SPECULAR LIGHT SWEEP (SaaS Launch Hero) --- */}
            {activeMotionType === "3d-gyro-float" && isChoreographyActive && (
              <motion.div
                animate={{ x: ["-120%", "220%"] }}
                transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut", repeatDelay: 1.2 }}
                className="pointer-events-none absolute inset-0 w-1/2 -skew-x-12 z-20"
                style={{
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
                }}
              />
            )}

            {/* --- CRT PHOSPHOR SCANLINES & BLINKING PROMPT (Developer CLI) --- */}
            {activeMotionType === "cli-scanlines" && isChoreographyActive && (
              <>
                <div
                  className="pointer-events-none absolute inset-0 z-20 opacity-30"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)",
                  }}
                />
                <div className="pointer-events-none absolute top-2 left-2 z-25 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 border border-emerald-500/30">
                  <span className="text-[8px] font-mono text-emerald-400 font-bold">$ npm run build</span>
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="inline-block size-1.5 bg-emerald-400"
                  />
                </div>
              </>
            )}

            {/* --- RADAR LASER SCAN LINE (Enterprise Security) --- */}
            {activeMotionType === "radar-scan" && isChoreographyActive && (
              <motion.div
                animate={{ top: ["-10%", "110%"] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: "linear" }}
                className="pointer-events-none absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee] z-20"
              />
            )}

            {/* --- ISOMETRIC UPVOTE PARTICLES (Product Hunt Teaser) --- */}
            {activeMotionType === "isometric-upvote" && isChoreographyActive && (
              <div className="pointer-events-none absolute top-2 right-2 z-25 flex items-center gap-1 rounded-full bg-orange-600/90 text-white px-2 py-0.5 text-[8px] font-bold shadow-lg border border-orange-400/50">
                <span>▲</span>
                <span>482</span>
                <motion.span
                  animate={{ y: [0, -12], opacity: [1, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
                  className="text-amber-200 text-[8px] font-mono absolute -top-1 right-1"
                >
                  +1
                </motion.span>
              </div>
            )}

            {/* --- TACTILE CLICK RIPPLE SHOCKWAVES (Interactive Click) --- */}
            {activeMotionType === "click-ripples" && isChoreographyActive && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [0.3, 2.4], opacity: [0.9, 0] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut" }}
                  className="size-16 rounded-full border-2 border-cyan-400/80 shadow-[0_0_15px_#06b6d4]"
                />
                <motion.div
                  animate={{ scale: [0.1, 1.6], opacity: [0.8, 0] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeOut", delay: 0.15 }}
                  className="size-10 rounded-full border border-white/90"
                />
              </div>
            )}

            {/* --- CURVED CURSOR FLOW SIMULATION (Dribbble Design Reel) --- */}
            {activeMotionType === "curved-cursor" && isChoreographyActive && (
              <motion.div
                animate={{
                  x: [-60, 20, 60, -20, -60],
                  y: [20, -30, 10, 40, 20],
                }}
                transition={{ repeat: Infinity, duration: 5.2, ease: "easeInOut" }}
                className="pointer-events-none absolute z-25 flex items-center gap-1"
              >
                <MousePointer className="size-3.5 text-pink-400 fill-pink-500 drop-shadow-md" />
                <span className="rounded bg-pink-900/80 px-1 py-0.2 text-[7px] text-pink-200 border border-pink-500/40 font-mono">
                  design
                </span>
              </motion.div>
            )}

            {/* --- STEP FOCUS CALLOUT (Micro-Tutorial) --- */}
            {activeMotionType === "step-focus" && isChoreographyActive && (
              <div className="pointer-events-none absolute top-2 left-2 z-25 flex items-center gap-1 rounded-full bg-sky-600/90 text-white px-2 py-0.5 text-[8px] font-bold shadow-md">
                <CheckCircle2 className="size-2.5" />
                <span>STEP 1 OF 3</span>
              </div>
            )}

            {/* --- VIRAL FLAME REACTION (TikTok Short) --- */}
            {activeMotionType === "kinetic-phone" && isChoreographyActive && (
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="pointer-events-none absolute top-2 right-2 z-25 flex items-center gap-0.5 rounded-full bg-yellow-500 text-black px-1.5 py-0.5 text-[8px] font-black shadow-lg"
              >
                <Flame className="size-2.5 fill-black" />
                <span>VIRAL</span>
              </motion.div>
            )}

            {/* Dynamic Animated Overlay Headlines on Top of Video */}
            <div className="pointer-events-none absolute inset-0 p-2.5 flex flex-col justify-end z-25 bg-gradient-to-t from-black/85 via-transparent to-transparent">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${template.id}-${headlineText}-${badgeText}`}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.96 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-0.5"
                >
                  {/* Badge Pill with gentle pulse */}
                  <motion.span
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                    className="inline-block rounded-full px-1.5 py-0.2 text-[8px] font-mono font-bold tracking-wider uppercase shadow-md"
                    style={{
                      backgroundColor: `${accentColor}30`,
                      color: accentColor,
                      border: `1px solid ${accentColor}60`,
                    }}
                  >
                    {badgeText}
                  </motion.span>

                  {/* Headline overlay */}
                  <h4 className="text-xs font-bold text-white tracking-tight leading-snug drop-shadow-md truncate">
                    {headlineText}
                  </h4>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Video Preview Control Bar */}
      <div className="flex items-center justify-between border-t border-white/10 bg-neutral-900/95 px-3 py-1.5 z-20 shrink-0">
        <div className="flex items-center gap-1.5">
          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex size-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            title={isPlaying ? "Pause Preview" : "Play Preview"}
          >
            {isPlaying ? <Pause className="size-2.5" /> : <Play className="size-2.5 ml-0.5" />}
          </button>

          {/* Restart Button */}
          <button
            type="button"
            onClick={handleRestart}
            className="flex size-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            title="Restart Video"
          >
            <RotateCcw className="size-2.5" />
          </button>

          {/* Counter */}
          <span className="font-mono text-[9px] text-neutral-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Scrubber Bar */}
        <div className="mx-2 flex-1">
          <div
            onClick={handleScrub}
            className="relative h-1.5 w-full rounded-full bg-white/15 cursor-pointer overflow-hidden group/scrub"
          >
            <div
              className="h-full bg-white transition-all duration-75 group-hover/scrub:bg-indigo-400"
              style={{
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
              }}
            />
          </div>
        </div>

        {/* Motion Choreography Switch & Audio Controls */}
        <div className="flex items-center gap-1.5">
          {/* Choreography Toggle */}
          <button
            type="button"
            onClick={() => setIsChoreographyActive(!isChoreographyActive)}
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[9px] font-mono font-medium transition-all cursor-pointer ${
              isChoreographyActive
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_8px_rgba(99,102,241,0.25)]"
                : "bg-white/5 text-neutral-400 border border-white/10 hover:text-white"
            }`}
            title="Toggle signature motion choreography loop"
          >
            <Wand2 className="size-2.5 text-amber-400" />
            <span>{isChoreographyActive ? "Motion: On" : "Clean"}</span>
          </button>

          {/* Audio Mute / Unmute */}
          <button
            type="button"
            onClick={toggleMute}
            className="flex size-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            title={isMuted ? "Unmute Preview Audio" : "Mute Preview Audio"}
          >
            {isMuted ? <VolumeX className="size-2.5" /> : <Volume2 className="size-2.5 text-amber-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}
