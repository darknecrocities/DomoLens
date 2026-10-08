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
} from "lucide-react";
import type { MotionTemplate } from "@domolens/core";
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

  // Calculate aspect ratio styling
  const getAspectDimensions = () => {
    switch (template.aspectRatio) {
      case "9:16":
        return "aspect-[9/16] max-h-[300px] w-auto";
      case "1:1":
        return "aspect-square max-h-[290px] w-auto";
      case "4:3":
        return "aspect-[4/3] max-h-[290px] w-auto";
      case "16:9":
      default:
        return "aspect-video w-full";
    }
  };

  return (
    <div className="relative flex flex-col rounded-xl border border-white/10 bg-neutral-950/80 shadow-2xl overflow-hidden group">
      {/* Stage Backdrop matching template's backgroundValue or gradient */}
      <div
        className="relative w-full h-[320px] flex items-center justify-center p-4 overflow-hidden transition-all duration-500"
        style={{
          background:
            template.looks.backgroundValue ||
            "linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)",
        }}
      >
        {/* Ambient atmospheric glow behind video */}
        <div
          className="pointer-events-none absolute inset-0 opacity-40 blur-3xl transition-colors duration-500"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${accentColor} 0%, transparent 70%)`,
          }}
        />

        {/* Top Badges & Info bar inside preview */}
        <div className="absolute top-2.5 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 border border-white/10 shadow-lg">
            <Sparkles className="size-3 text-amber-400" />
            <span className="text-[10px] font-mono text-neutral-200 uppercase font-semibold">
              Live Preview: {template.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {tiltAngle > 0 && (
              <span className="rounded-full bg-indigo-500/25 text-indigo-300 px-2 py-0.5 text-[9px] font-mono font-bold border border-indigo-500/30">
                {tiltAngle}° 3D
              </span>
            )}
            <span className="rounded-full bg-black/60 text-neutral-200 px-2 py-0.5 text-[9px] font-mono font-bold border border-white/10">
              {template.aspectRatio}
            </span>
          </div>
        </div>

        {/* 3D Tilted / Formatted Video Stage Container */}
        <div
          className={`relative ${getAspectDimensions()} rounded-lg overflow-hidden border border-white/15 bg-black shadow-2xl transition-all duration-300 z-10 flex flex-col justify-between`}
          style={{
            transform:
              tiltAngle > 0
                ? `perspective(800px) rotateX(${tiltAngle * 0.65}deg) rotateY(-${tiltAngle * 0.35}deg)`
                : undefined,
            boxShadow: `0 20px 50px -10px rgba(0,0,0,0.8), 0 0 30px ${accentColor}20`,
          }}
        >
          {/* Window Frame Bar */}
          {windowFrame !== "none" && (
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/85 backdrop-blur-md border-b border-white/10 z-20 shrink-0">
              {windowFrame === "macos" && (
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-rose-500/90" />
                  <span className="size-2 rounded-full bg-amber-500/90" />
                  <span className="size-2 rounded-full bg-emerald-500/90" />
                  <span className="ml-1 text-[9px] font-mono text-neutral-400">DomoLens</span>
                </div>
              )}
              {windowFrame === "safari" && (
                <div className="flex items-center gap-1.5 w-full">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-neutral-600" />
                    <span className="size-1.5 rounded-full bg-neutral-600" />
                  </div>
                  <div className="mx-auto rounded bg-neutral-900 px-3 py-0.5 text-[8px] font-mono text-neutral-400 border border-white/5 truncate max-w-[140px]">
                    app.domolens.io
                  </div>
                </div>
              )}
              {windowFrame === "terminal" && (
                <div className="flex items-center gap-1.5">
                  <Terminal className="size-2.5 text-emerald-400" />
                  <span className="text-[9px] font-mono text-neutral-300">bash — 80x24</span>
                </div>
              )}
              {windowFrame === "windows" && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[9px] font-mono text-neutral-400">DomoLens Studio</span>
                  <div className="flex items-center gap-1 text-[8px] text-neutral-400">
                    <span>—</span>
                    <span>□</span>
                    <span>✕</span>
                  </div>
                </div>
              )}
              {windowFrame === "glass" && (
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-white/40" />
                  <span className="text-[8px] font-mono text-neutral-300">Mobile View</span>
                </div>
              )}
            </div>
          )}

          {/* Real Video Element */}
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

            {/* Dynamic Animated Overlay Elements on Top of Video */}
            <div className="pointer-events-none absolute inset-0 p-3 flex flex-col justify-end z-20 bg-gradient-to-t from-black/80 via-transparent to-transparent">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${template.id}-${headlineText}-${badgeText}`}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-1"
                >
                  {/* Badge Pill with gentle pulse */}
                  <motion.span
                    animate={{ scale: [1, 1.03, 1] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
                    className="inline-block rounded-full px-2 py-0.5 text-[8px] font-mono font-bold tracking-wider uppercase shadow-md"
                    style={{
                      backgroundColor: `${accentColor}30`,
                      color: accentColor,
                      border: `1px solid ${accentColor}60`,
                    }}
                  >
                    {badgeText}
                  </motion.span>

                  {/* Headline overlay */}
                  <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug drop-shadow-md truncate">
                    {headlineText}
                  </h4>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Video Preview Control Bar */}
      <div className="flex items-center justify-between border-t border-white/10 bg-neutral-900/95 px-3 py-2 z-20">
        <div className="flex items-center gap-2">
          {/* Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            title={isPlaying ? "Pause Preview" : "Play Preview"}
          >
            {isPlaying ? <Pause className="size-3" /> : <Play className="size-3 ml-0.5" />}
          </button>

          {/* Restart Button */}
          <button
            type="button"
            onClick={handleRestart}
            className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            title="Restart Video"
          >
            <RotateCcw className="size-3" />
          </button>

          {/* Counter */}
          <span className="font-mono text-[10px] text-neutral-400">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        {/* Scrubber Bar */}
        <div className="mx-3 flex-1">
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

        {/* Audio Mute / Unmute */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMute}
            className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-neutral-300 hover:text-white hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
            title={isMuted ? "Unmute Preview Audio" : "Mute Preview Audio"}
          >
            {isMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3 text-amber-400" />}
          </button>
        </div>
      </div>
    </div>
  );
}
