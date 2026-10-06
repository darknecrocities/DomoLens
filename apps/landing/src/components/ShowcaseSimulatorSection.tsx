import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Pause, Play, RotateCcw, Volume2, VolumeX, Sparkles } from "lucide-react";

interface WorkflowChapter {
  id: "zoom" | "silence" | "composition" | "export";
  name: "Auto-Zoom Focus" | "AI Silence Trim" | "Studio Composition" | "Instant GPU Export";
  time: number;
  tag: string;
  scale: string;
  desc: string;
  tip: string;
}

const WORKFLOW_CHAPTERS: Record<string, WorkflowChapter> = {
  zoom: {
    id: "zoom",
    name: "Auto-Zoom Focus",
    time: 0.5,
    tag: "16:9 • 1.85x Zoom",
    scale: "1.85x",
    desc: "Camera detects the button target, smoothly zooms in at 60 FPS, tracks the cursor trajectory, and pulls back gently to reveal context.",
    tip: "Perfect for high-impact call-to-actions, navigation clicks, and onboarding flows.",
  },
  silence: {
    id: "silence",
    name: "AI Silence Trim",
    time: 3.2,
    tag: "Timeline • Auto Cut",
    scale: "1.0x",
    desc: "One click in the AI Director analyzes the speech waveform, automatically identifies dead pauses, and trims them from the timeline.",
    tip: "Eliminates hesitation gaps without manually slicing clips in an NLE editor.",
  },
  composition: {
    id: "composition",
    name: "Studio Composition",
    time: 6.0,
    tag: "Studio • Frosted Bezel",
    scale: "Live",
    desc: "Live adjustments to corner roundness, soft drop shadows, background padding, and frosted ambient blur render in real time on canvas.",
    tip: "Gives standard desktop screen recordings the polish of an official keynote presentation.",
  },
  export: {
    id: "export",
    name: "Instant GPU Export",
    time: 9.6,
    tag: "Hardware • 60 FPS",
    scale: "1080p/4K",
    desc: "Renders directly on your local GPU via embedded FFmpeg with zero cloud upload queues, zero watermarks, and lossless clarity.",
    tip: "Ready to share on Product Hunt, YouTube, and X in seconds.",
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
      // Auto highlight corresponding chapter based on playback position
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
      className="relative border-b border-neutral-800 bg-black px-4 py-24 sm:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          // Real App In Action
        </div>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Real Screen Recording. Zero Dummy Demos.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
          Watch the actual DomoLens Studio interface track clicks, zoom the camera, tighten silences, and render high-framerate video directly on device.
        </p>

        {/* Chapter Switcher Buttons */}
        <div className="mt-8 flex flex-wrap gap-2.5">
          {(Object.keys(WORKFLOW_CHAPTERS) as Array<typeof activeChapter>).map((key) => {
            const chap = WORKFLOW_CHAPTERS[key];
            const isSelected = activeChapter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectChapter(key)}
                className={`rounded-xl px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-white text-black font-bold shadow-lg scale-105"
                    : "border border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-neutral-600 hover:text-white"
                }`}
              >
                <Sparkles className={`size-3.5 ${isSelected ? "text-black" : "text-neutral-500"}`} />
                <span>{chap.name}</span>
              </button>
            );
          })}
        </div>

        {/* Stage Container with Real Screen Recording Video */}
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Live Specs & Active Chapter Description */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <div className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-400 border border-neutral-700 px-2.5 py-1 rounded-md mb-2">
                  {current.tag}
                </div>
                <h3 className="text-2xl font-bold uppercase text-white tracking-tight">
                  {current.name}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-neutral-300">
                  {current.desc}
                </p>
              </div>

              {/* Technical Parameter Readouts */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-800">
                <div className="rounded-lg border border-neutral-800 bg-black/50 p-3">
                  <span className="block font-mono text-[10px] text-neutral-500 uppercase">Camera Zoom</span>
                  <span className="block font-mono text-sm font-bold text-white mt-0.5">{current.scale}</span>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-black/50 p-3">
                  <span className="block font-mono text-[10px] text-neutral-500 uppercase">Frame Rate</span>
                  <span className="block font-mono text-sm font-bold text-white mt-0.5">60 FPS Hardware</span>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-black/50 p-3">
                  <span className="block font-mono text-[10px] text-neutral-500 uppercase">Timestamp</span>
                  <span className="block font-mono text-xs font-semibold text-neutral-200 mt-0.5">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-black/50 p-3">
                  <span className="block font-mono text-[10px] text-neutral-500 uppercase">Processing</span>
                  <span className="block font-mono text-xs font-semibold text-neutral-200 mt-0.5">100% Local GPU</span>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 text-xs text-neutral-400 font-mono">
                <span className="text-white font-bold block mb-1">PRO TIP</span>
                <span>{current.tip}</span>
              </div>
            </div>

            {/* Right Column: Actual Screen Recording Video Player */}
            <div className="lg:col-span-7">
              <div className="relative aspect-video w-full rounded-xl border border-neutral-700 bg-black overflow-hidden shadow-2xl flex flex-col justify-between">
                {/* Titlebar with window indicators */}
                <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-4 py-2.5 z-20">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="ml-2 font-mono text-xs text-neutral-300">
                      DomoLens Studio App — Live Screen Recording
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-neutral-800 px-2 py-0.5 font-mono text-[10px] text-neutral-300">
                      1080p 60 FPS
                    </span>
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
                <div className="border-t border-neutral-800 bg-neutral-950/95 px-4 py-2.5 flex items-center justify-between z-20 font-mono text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="flex size-7 items-center justify-center rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleRestart}
                      className="flex size-7 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
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
                      className="relative h-1.5 w-full rounded-full bg-neutral-800 cursor-pointer overflow-hidden"
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
                      className="flex size-7 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
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
