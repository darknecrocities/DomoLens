import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, RotateCcw, Volume2, VolumeX, Sparkles, Crosshair } from "lucide-react";

interface WorkflowBenefit {
  label: string;
  value: string;
  desc: string;
}

interface WorkflowChapter {
  id: "zoom" | "silence" | "composition" | "export";
  name: string;
  time: number;
  desc: string;
  benefits: WorkflowBenefit[];
  howItHelps: string;
}

const WORKFLOW_CHAPTERS: Record<string, WorkflowChapter> = {
  zoom: {
    id: "zoom",
    name: "Smart Auto-Zoom",
    time: 0.5,
    desc: "Automatically glides the camera directly to your clicks and typing. Your viewers instantly see what matters most without squinting at a huge screen.",
    benefits: [
      { label: "Viewer Focus", value: "Follows Every Action", desc: "Draws attention to where you click and type" },
      { label: "Effort Saved", value: "Zero Keyframes", desc: "Camera moves smoothly on its own" },
      { label: "Mobile Feeds", value: "Crystal-Clear View", desc: "No tiny, unreadable text on phone screens" },
      { label: "Time To Ship", value: "Ready In Seconds", desc: "Record once and your demo is done" },
    ],
    howItHelps: "Viewers scroll away when videos are boring or hard to follow. Auto-zoom turns everyday screen recordings into high-converting product demos that hook attention immediately.",
  },
  silence: {
    id: "silence",
    name: "Silence Remover",
    time: 3.2,
    desc: "Removes awkward pauses, hesitations, and dead air with a single click. Keeps your walkthroughs fast, energetic, and engaging.",
    benefits: [
      { label: "Video Pacing", value: "Fast & Punchy", desc: "Cuts dead air so viewers stay engaged" },
      { label: "Editing Work", value: "1-Click Cleanup", desc: "No tedious splicing or timeline slicing" },
      { label: "Engagement", value: "Higher Watch Time", desc: "Tighter demos get watched to the end" },
      { label: "Speech Flow", value: "Sounds Confident", desc: "Smooth rhythm without jarring jumps" },
    ],
    howItHelps: "Dead pauses cause viewers to click away. Removing hesitations makes your pitch sound crisp, confident, and professional without spending hours trimming audio.",
  },
  composition: {
    id: "composition",
    name: "Keynote-Style Framing",
    time: 6.0,
    desc: "Adds modern rounded corners, soft drop shadows, and clean backdrops. Gives your desktop recording the polish of an official Apple keynote.",
    benefits: [
      { label: "Presentation", value: "Studio-Grade Look", desc: "Elevates standard desktop screen shares" },
      { label: "Brand Match", value: "Custom Colors", desc: "Match your company theme and wallpapers" },
      { label: "Depth & Style", value: "Soft Shadows", desc: "Modern rounded corners that pop in feeds" },
      { label: "Social Ready", value: "Perfect Framing", desc: "Optimized for Twitter, LinkedIn & YouTube" },
    ],
    howItHelps: "First impressions decide whether customers trust your product. Studio framing gives your demo the look of a venture-backed tech company with zero design effort.",
  },
  export: {
    id: "export",
    name: "Instant Video Export",
    time: 9.6,
    desc: "Saves high-quality video directly to your computer in seconds. No waiting in cloud queues, no subscriptions, and zero watermarks.",
    benefits: [
      { label: "Turnaround", value: "Instant Download", desc: "Ready to share the second you finish" },
      { label: "Privacy", value: "100% On-Device", desc: "Your screen captures never leave your machine" },
      { label: "Pricing", value: "No Monthly Fees", desc: "Free forever with zero cloud subscriptions" },
      { label: "Branding", value: "Zero Watermarks", desc: "Unbranded, clean video ready for clients" },
    ],
    howItHelps: "Never wait 15 minutes for cloud recorders to process your files. Export immediately, upload straight to Product Hunt or clients, and get right back to building.",
  },
};

export function ShowcaseSimulatorSection() {
  const [activeChapter, setActiveChapter] = useState<"zoom" | "silence" | "composition" | "export">("zoom");
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(12);
  const videoRef = useRef<HTMLVideoElement>(null);

  const current = WORKFLOW_CHAPTERS[activeChapter];

  const handleSelectChapter = (key: typeof activeChapter) => {
    setActiveChapter(key);
    const targetTime = WORKFLOW_CHAPTERS[key].time;
    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

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

  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play().catch(() => {});
    setIsPlaying(true);
    setActiveChapter("zoom");
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const t = video.currentTime;
      if (t >= 9.2) {
        setActiveChapter("export");
      } else if (t >= 5.8) {
        setActiveChapter("composition");
      } else if (t >= 3.0) {
        setActiveChapter("silence");
      } else {
        setActiveChapter("zoom");
      }
    };

    const handleLoadedMetadata = () => {
      if (video.duration && !isNaN(video.duration)) {
        setDuration(video.duration);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const ms = Math.floor((secs % 1) * 10);
    return `0:${s < 10 ? "0" : ""}${s}.${ms}`;
  };

  return (
    <motion.section
      id="studio-demo"
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative border-b border-white/[0.08] bg-black px-4 py-24 sm:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          // See It In Action
        </div>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Everything You Need To Showcase Your Work.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
          Watch how DomoLens automatically follows your clicks, cleans up dead air, and frames your app in studio quality — without opening a video editor.
        </p>

        {/* Chapter Switcher Buttons with Animated Layout Pill */}
        <div className="mt-8 flex flex-wrap gap-2.5">
          {(Object.keys(WORKFLOW_CHAPTERS) as Array<typeof activeChapter>).map((key) => {
            const chap = WORKFLOW_CHAPTERS[key];
            const isSelected = activeChapter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectChapter(key)}
                className={`relative rounded-xl px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2 ${
                  isSelected ? "text-black" : "text-neutral-400 hover:text-white"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-chapter-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Sparkles className={`size-3.5 ${isSelected ? "text-black" : "text-neutral-500"}`} />
                  <span>{chap.name}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Stage Container with Real Screen Recording Video */}
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-neutral-950/70 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Marketing-Minded Feature Highlights & 5 Cards */}
            <div className="lg:col-span-5 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="text-2xl font-bold uppercase text-white tracking-tight">
                    {current.name}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-neutral-300">
                    {current.desc}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Marketing-Minded Benefit Highlights (4 Cards) */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.08]">
                {current.benefits.map((b, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/[0.06] bg-black/60 p-3.5 transition-colors hover:border-white/15"
                  >
                    <span className="block font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                      {b.label}
                    </span>
                    <span className="block font-sans text-sm font-bold text-white mt-1 tracking-tight">
                      {b.value}
                    </span>
                    <span className="block text-[11px] text-neutral-400 mt-1 leading-snug">
                      {b.desc}
                    </span>
                  </div>
                ))}
              </div>

              {/* 5th Card: How This Helps You */}
              <div className="rounded-xl border border-white/[0.08] bg-black/80 p-4 text-xs">
                <span className="text-white font-bold block mb-1.5 font-mono text-xs uppercase tracking-wider">
                  How This Helps You
                </span>
                <p className="leading-relaxed text-neutral-300">
                  {current.howItHelps}
                </p>
              </div>
            </div>

            {/* Right Column: HUD Viewfinder Video Player */}
            <div className="lg:col-span-7">
              <div className="relative aspect-video w-full rounded-xl border border-white/[0.12] bg-black overflow-hidden shadow-2xl flex flex-col justify-between group">
                {/* HUD Crosshairs and Animated Corner Brackets */}
                <div className="pointer-events-none absolute inset-0 z-30 p-3">
                  <motion.div
                    className="absolute top-3 left-3 size-4 border-t-2 border-l-2 border-white/40"
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="absolute top-3 right-3 size-4 border-t-2 border-r-2 border-white/40"
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.5 }}
                  />
                  <motion.div
                    className="absolute bottom-12 left-3 size-4 border-b-2 border-l-2 border-white/40"
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 1 }}
                  />
                  <motion.div
                    className="absolute bottom-12 right-3 size-4 border-b-2 border-r-2 border-white/40"
                    animate={{ opacity: [0.4, 0.9, 0.4] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 1.5 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-20">
                    <Crosshair className="size-10 text-white" />
                  </div>
                </div>

                {/* Titlebar with window indicators */}
                <div className="flex items-center justify-between border-b border-white/[0.08] bg-black/90 px-4 py-2.5 z-20 backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="ml-2 font-mono text-xs text-neutral-300">
                      DomoLens Studio App — Live Screen Recording
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
                    <span>Studio Quality</span>
                  </div>
                </div>

                {/* Real Video Element */}
                <div className="relative flex-1 bg-black overflow-hidden">
                  <video
                    ref={videoRef}
                    src="/domolens_app_live_demo.mp4"
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className="size-full object-contain bg-black"
                  />
                </div>

                {/* Bottom Video Controls Bar */}
                <div className="border-t border-white/[0.08] bg-black/95 px-4 py-2.5 flex items-center justify-between z-20 font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex size-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.06] text-white hover:bg-white/[0.12] transition-colors"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleRestart}
                      className="flex size-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.06] text-neutral-300 hover:text-white hover:bg-white/[0.12] transition-colors"
                      title="Restart Video"
                    >
                      <RotateCcw className="size-3.5" />
                    </button>
                    <span className="text-[11px] text-neutral-400">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Scrubber track */}
                  <div className="mx-4 flex-1 hidden sm:block">
                    <div
                      className="relative h-1.5 w-full rounded-full bg-white/[0.1] cursor-pointer overflow-hidden"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = (e.clientX - rect.left) / rect.width;
                        if (videoRef.current && duration > 0) {
                          videoRef.current.currentTime = pos * duration;
                        }
                      }}
                    >
                      <div
                        className="h-full bg-white transition-all duration-75"
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="flex size-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.06] text-neutral-300 hover:text-white hover:bg-white/[0.12] transition-colors"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
                    </button>
                    <span className="text-[10px] text-neutral-400 uppercase hidden md:inline">
                      Live App Capture
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
