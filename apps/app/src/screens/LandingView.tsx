import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Apple,
  ArrowDown,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Download,
  Eye,
  FileCode2,
  Film,
  Laptop,
  Layers,
  MousePointer2,
  Pause,
  Play,
  QrCode,
  Rocket,
  RotateCcw,
  Share2,
  Shield,
  ShieldCheck,
  Sliders,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Split,
  Terminal,
  Video,
  Volume2,
  VolumeX,
  XCircle,
  Zap,
} from "lucide-react";
import { useNav } from "../store/nav";

const FLIP_WORDS = [
  "NO MANUAL KEYFRAMES.",
  "AUTO-ZOOMS ON CLICKS.",
  "STUDIO-GRADE FRAMING.",
  "TACTILE CLICK SOUNDS.",
  "READY IN 30 SECONDS.",
  "100% OFFLINE & FREE.",
];

export function LandingView() {
  const { go } = useNav();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [sliderPos, setSliderPos] = useState(50);
  const [activeTab, setActiveTab] = useState<"mac" | "win" | "linux" | "android">("mac");
  const [activeChapter, setActiveChapter] = useState<"zoom" | "silence" | "composition" | "export">("zoom");
  const [showcasePlaying, setShowcasePlaying] = useState(true);
  const [showcaseMuted, setShowcaseMuted] = useState(true);
  const [showcaseTime, setShowcaseTime] = useState(0);
  const [showcaseDuration, setShowcaseDuration] = useState(12);
  const showcaseVideoRef = useRef<HTMLVideoElement>(null);
  const [flipIndex, setFlipIndex] = useState(0);

  // 3D Physical Cursor Tilt State
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  // Continuous non-stop flip loop
  useEffect(() => {
    const timer = setInterval(() => {
      setFlipIndex((prev) => (prev + 1) % FLIP_WORDS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Sync showcase video playback with active chapters
  useEffect(() => {
    const video = showcaseVideoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setShowcaseTime(video.currentTime);
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
        setShowcaseDuration(video.duration);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  };

  // Cursor 3D Physics Calculation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

    setIsHovered(true);
    setTilt({
      rotateX: -py * 10, // smooth 3D tilt
      rotateY: px * 10,
      glareX: (px + 0.5) * 100,
      glareY: (py + 0.5) * 100,
    });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  // Hero section multi-phase scroll track:
  // Phase 1 (0 -> 0.25): Video reveals from blurry B&W to full color while text fades out.
  // Phase 2 (0.25 -> 0.78): Video is fully revealed and STAYS IN SCREEN with no obstruction.
  // Phase 3 (0.78 -> 1.00): Video gently scales down and transitions into the next section.
  const heroScrollTrack = 1500;
  const scrollProgress = Math.min(1, Math.max(0, scrollY / heroScrollTrack));

  // Phase 1: Hero text fade-out & slide-up (0.00 -> 0.25)
  const revealProgress = Math.min(1, scrollProgress / 0.25);
  const heroTextOpacity = Math.max(0, 1 - revealProgress * 1.15);
  const heroTextTranslateY = -revealProgress * 85;
  const heroTextScale = Math.max(0.92, 1 - revealProgress * 0.08);

  // Background Demo Video Filtering:
  const grayscalePercent = Math.max(0, 100 * (1 - revealProgress));
  const blurPx = Math.max(0, 14 * (1 - revealProgress));
  const dotOpacity = Math.max(0, 0.85 * (1 - revealProgress));
  const darkVignetteOpacity = Math.max(0.1, 0.75 * (1 - revealProgress));

  // Phase 3: Exit Transition to Next Section (0.78 -> 1.00)
  const exitProgress = Math.max(0, Math.min(1, (scrollProgress - 0.78) / 0.22));
  const exitScale = 1 - exitProgress * 0.06;
  const exitDim = exitProgress * 0.45;

  // Video scale combines cursor tilt overscan + subtle scroll transition
  const videoScale = (1.05 + Math.min(0.25, scrollProgress) * 0.03) * exitScale;

  // Live Demo Held Indicator Opacity
  const heldIndicatorOpacity =
    Math.max(0, Math.min(1, (scrollProgress - 0.24) / 0.08)) *
    (1 - Math.max(0, Math.min(1, (scrollProgress - 0.74) / 0.08)));

  // 1. Core Features (Focused on Instant Practical Need)
  const features = [
    {
      title: "Follows Clicks & Typing",
      desc: "Camera glides with your cursor, holds focus tight on button clicks, and pans smoothly along code or text typing without manual keyframing.",
      icon: MousePointer2,
      tag: "AUTO MOTION",
    },
    {
      title: "Tactile Sound Effects",
      desc: "Subtle bubble bops on button clicks and mechanical keystroke sounds automatically synced to your actions to keep viewers engaged.",
      icon: Volume2,
      tag: "AUDIO DESIGN",
    },
    {
      title: "Studio Window Framing",
      desc: "Make any desktop app look like an Apple keynote: rounded corners, frosted glass backdrops, custom padding, and soft drop shadows.",
      icon: Layers,
      tag: "COMPOSITION",
    },
    {
      title: "One-Click QuickBar HUD",
      desc: "Floating shortcut toolbar for laptop and phone. Hit Option+Space to record, pause, transcribe, and open the studio with zero clutter.",
      icon: Sliders,
      tag: "ONE TAP",
    },
    {
      title: "Visual Multi-Track Timeline",
      desc: "NLE-grade timeline with dedicated track headers for Keyframes, Zoom, Video, Captions, and Audio. Trim with T, split with S, zero overlap.",
      icon: SlidersHorizontal,
      tag: "TIMELINE",
    },
    {
      title: "100% Private On Your Device",
      desc: "Everything runs locally on your computer. Zero cloud rendering queues, no subscriptions, no accounts, and zero watermarks.",
      icon: Shield,
      tag: "LOCAL-FIRST",
    },
  ];
  const duplicatedFeatures = [...features, ...features];

  // 2. Clean Branding Belt (Logo + Text only)
  const brandBeltItems = [
    { name: "Apple macOS", icon: Apple },
    { name: "Windows 11", icon: Laptop },
    { name: "Linux Wayland", icon: Terminal },
    { name: "Android 12+", icon: Smartphone },
    { name: "Tauri 2 & Rust", icon: Cpu },
    { name: "Python 3.13 GPU", icon: FileCode2 },
    { name: "FFmpeg 7.1", icon: Film },
    { name: "Whisper AI", icon: Volume2 },
    { name: "Google Gemini", icon: Sparkles },
    { name: "Anthropic Claude", icon: Bot },
    { name: "OpenAI GPT-4o", icon: Zap },
  ];
  const duplicatedBelt = [...brandBeltItems, ...brandBeltItems];

  // 3. Pain vs. Solution Cards (The 3-Hour Headache vs. The 30-Second Demo)
  const painPoints = [
    {
      title: "80+ Manual Keyframes",
      desc: "Plotting camera zoom keyframes by hand, dragging crop boxes, and tweaking easing curves for hours in Premiere or DaVinci.",
    },
    {
      title: "Tiny, Unreadable Text",
      desc: "Standard full-screen captures look tiny and blurry on mobile feeds. Viewers squint, lose context, and drop off in 3 seconds.",
    },
    {
      title: "Audio Hunting Fatigue",
      desc: "Browsing stock sound libraries for button click pops and mechanical typing SFX, then manually aligning them frame by frame.",
    },
    {
      title: "Cloud Waiting & Watermarks",
      desc: "Cloud recorder tools watermark your footage, limit export duration, and take 15 minutes to process in online queues.",
    },
  ];

  const domolensBenefits = [
    {
      title: "Automatic Interaction Detection",
      desc: "DomoLens analyzes your clicks and typing, automatically plotting silky 2-3s camera glides with zero manual keyframing.",
    },
    {
      title: "Product Showcase Camera Arc",
      desc: "Focuses tight on clicks, pulls back 20% to reveal context, tracks cursor trajectory, and eases to full screen when idle.",
    },
    {
      title: "Automatic Sound Design",
      desc: "Tactile bubble bops on button clicks and mechanical keystroke sounds placed directly onto timeline keyframes.",
    },
    {
      title: "Instant 60 FPS Local Export",
      desc: "100% offline. Exports crisp 4K or 1080p videos directly to your machine in seconds with zero cloud queues.",
    },
  ];

  // 4. Live Screen Recording Workflow Chapters
  const workflowChapters = {
    zoom: {
      id: "zoom" as const,
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
      id: "silence" as const,
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
      id: "composition" as const,
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
      id: "export" as const,
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

  // 5. Real-World Use Cases
  const useCases = [
    {
      title: "Product Hunt & Launch Day",
      subtitle: "Stop the scroll immediately",
      desc: "Hook viewers in the first 2 seconds. Silky zooms on your killer feature make your launch video look like an Apple product intro.",
      tag: "LAUNCH READY",
      icon: Rocket,
    },
    {
      title: "Twitter / X & LinkedIn Teasers",
      subtitle: "Agency quality on a founder budget",
      desc: "Post high-energy product snippets that get retweets and engagement. Studio backdrops make your UI pop in social feeds.",
      tag: "SOCIAL FEEDS",
      icon: Share2,
    },
    {
      title: "Documentation & Tutorials",
      subtitle: "Show, don't tell",
      desc: "Guide users through complex workflows. Zooms highlight the exact button to click so users never submit support tickets.",
      tag: "CUSTOMER SUCCESS",
      icon: Code2,
    },
    {
      title: "Async Sales & Loom Replacements",
      subtitle: "Close deals faster",
      desc: "Send high-polish 90-second product walkthroughs to prospects. Crisp typography and camera motion build immediate trust.",
      tag: "SALES & PITCH",
      icon: Eye,
    },
    {
      title: "Weekly Shipping Changelogs",
      subtitle: "Build in public effortlessly",
      desc: "Show off new features every week in under 2 minutes of recording. Keep your community hyped without burning out on editing.",
      tag: "BUILD IN PUBLIC",
      icon: Sparkles,
    },
    {
      title: "Investor Updates & Pitch Decks",
      subtitle: "Live working proof",
      desc: "Embed silky product demos in your updates. Proves your traction and execution with undeniable real-app fidelity.",
      tag: "INVESTOR UPDATES",
      icon: Film,
    },
  ];

  // 6. Workflow Steps
  const steps = [
    {
      num: "01",
      title: "One-Click Record",
      desc: "Hit Option+Space on desktop or tap the floating overlay on Android. Select any application window or full display.",
      icon: Laptop,
    },
    {
      num: "02",
      title: "Demo Naturally",
      desc: "Click buttons, fill forms, and type code. DomoLens records 60 FPS video while automatically tracking your focal points.",
      icon: Video,
    },
    {
      num: "03",
      title: "Automatic Studio Polish",
      desc: "Opens instantly in the editor with zooms, tactile bubble bops, typing audio, and window framing already applied.",
      icon: Sliders,
    },
    {
      num: "04",
      title: "Export & Ship",
      desc: "Export crisp 60 FPS 4K or 1080p video or lightweight GIF straight to your device in seconds with zero cloud queues.",
      icon: Film,
    },
  ];

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto bg-black text-white selection:bg-white selection:text-black scroll-smooth"
    >
      {/* ========================================================================= */}
      {/* SECTION 1: HERO & SCROLL FADE-OUT / REAL APP DEMO VIDEO FADE-IN */}
      {/* ========================================================================= */}
      <section
        id="hero"
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative min-h-[280vh] border-b border-neutral-800 bg-black"
      >
        {/* Sticky Fullscreen Cinematic Viewport */}
        <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
          {/* WHOLE SCREEN VIDEO BACKGROUND (Transforms & Tilts, NO card container) */}
          <div
            style={{
              transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${videoScale})`,
              transformStyle: "preserve-3d",
              transition: isHovered
                ? "transform 0.08s ease-out"
                : "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
            className="absolute inset-0 size-full overflow-hidden will-change-transform select-none pointer-events-none"
          >
            {/* The Demo Video — Edge-to-edge fullscreen video background */}
            <video
              src="/domolens_smooth_autozoom_demo.mp4"
              autoPlay
              loop
              muted
              playsInline
              style={{
                filter: `grayscale(${grayscalePercent}%) blur(${blurPx}px)`,
                transition: "filter 0.1s linear",
              }}
              className="size-full object-cover will-change-transform"
            />

            {/* Polkadot Halftone Pattern Overlay across entire screen */}
            <div
              className="pointer-events-none absolute inset-0 z-10 transition-opacity"
              style={{
                opacity: dotOpacity,
                backgroundImage:
                  "radial-gradient(rgba(255, 255, 255, 0.45) 1.5px, transparent 1.5px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Dark Vignette Overlay across entire screen (dissolves to reveal colorful video) */}
            <div
              className="pointer-events-none absolute inset-0 z-10 transition-opacity"
              style={{
                opacity: darkVignetteOpacity,
                background:
                  "radial-gradient(circle at center, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.85) 100%)",
              }}
            />

            {/* Exit Dim Overlay (smoothly eases in as next section approaches) */}
            <div
              className="pointer-events-none absolute inset-0 z-10 bg-black transition-opacity"
              style={{ opacity: exitDim }}
            />

            {/* Specular Glare reacting to Cursor across entire screen */}
            <div
              className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.18) 0%, transparent 60%)`,
                opacity: isHovered ? 1 : 0.25,
              }}
            />
          </div>

          {/* Foreground Hero Content (NO card, NO box, clean floating typography & controls) */}
          <div
            style={{
              opacity: heroTextOpacity,
              transform: `translateY(${heroTextTranslateY}px) scale(${heroTextScale})`,
              pointerEvents: scrollProgress > 0.28 ? "none" : "auto",
              transition: "opacity 0.05s ease-out, transform 0.05s ease-out",
            }}
            className="relative z-30 mx-auto flex max-w-5xl flex-col items-center justify-center px-4 sm:px-6 text-center will-change-transform"
          >
            {/* Direct Problem / Need Callout Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 px-4 py-1.5 text-xs font-mono text-neutral-300 uppercase tracking-widest mb-6 backdrop-blur-md shadow-lg">
              <Sparkles className="size-3.5 text-white" />
              <span>Showcase Your Product Without The Video Editing</span>
            </div>

            {/* Master Headline with 3D Word Flip */}
            <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl lg:text-7xl leading-none drop-shadow-2xl">
              <span className="block text-white">Demo Your Product.</span>
              <span className="block text-neutral-200 mt-1">Skip The Video Editing.</span>
              <span className="relative mt-3 block h-[1.18em] overflow-hidden [perspective:1000px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={flipIndex}
                    initial={{ rotateX: 90, opacity: 0, y: 35 }}
                    animate={{ rotateX: 0, opacity: 1, y: 0 }}
                    exit={{ rotateX: -90, opacity: 0, y: -35 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="block text-neutral-400 will-change-transform"
                    style={{ transformOrigin: "50% 50%" }}
                  >
                    {FLIP_WORDS[flipIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
            </h1>

            {/* Practical, Need-Driven Subtitle */}
            <p className="mx-auto mt-6 max-w-2xl text-base text-neutral-300 sm:text-lg leading-relaxed drop-shadow-md">
              You built an awesome product. Showing it off shouldn't take 3 hours in a video editor.
              DomoLens records your screen, automatically zooms into your clicks and typing,
              adds tactile sound effects, and frames your app in studio quality — ready to export in seconds.
            </p>

            {/* Quick Proof Points */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-mono text-neutral-400">
              <span className="flex items-center gap-1.5"><Check className="size-3 text-white" /> Zero editing skills needed</span>
              <span className="hidden sm:inline text-neutral-700">•</span>
              <span className="flex items-center gap-1.5"><Check className="size-3 text-white" /> No subscriptions or cloud queues</span>
              <span className="hidden sm:inline text-neutral-700">•</span>
              <span className="flex items-center gap-1.5"><Check className="size-3 text-white" /> 100% private on your device</span>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#downloads"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-white px-7 py-3 font-mono text-xs font-bold uppercase text-black hover:bg-neutral-200 transition-colors shadow-2xl touch-manipulation"
              >
                <Download className="size-4" />
                <span>Download App (Mac / Win / Linux)</span>
              </a>

              <button
                type="button"
                onClick={() => go({ name: "home" })}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-lg border border-neutral-700 bg-black/60 backdrop-blur-md px-6 py-3 font-mono text-xs font-semibold uppercase text-white hover:border-neutral-500 hover:bg-neutral-900 transition-colors touch-manipulation shadow-xl"
              >
                <span>Launch Studio Workspace</span>
                <ArrowRight className="size-4" />
              </button>
            </div>

            {/* Scroll Down Prompt Indicator */}
            <div className="mt-7 flex items-center justify-center gap-2 font-mono text-xs text-neutral-400 uppercase tracking-widest drop-shadow">
              <Sparkles className="size-3.5 text-white animate-pulse" />
              <span>Scroll down to see the live demo in action</span>
              <ArrowDown className="size-3.5 text-white animate-bounce" />
            </div>
          </div>

          {/* Floating Live Showcase Pill Indicator while stayed in screen */}
          <div
            style={{
              opacity: heldIndicatorOpacity,
              transform: `translateY(${Math.max(0, 1 - (scrollProgress - 0.25) / 0.08) * 16}px)`,
              pointerEvents: "none",
              transition: "opacity 0.15s ease-out, transform 0.15s ease-out",
            }}
            className="absolute bottom-8 z-30 flex items-center gap-2.5 rounded-full border border-neutral-700/80 bg-black/80 px-5 py-2.5 font-mono text-xs text-white backdrop-blur-md shadow-2xl"
          >
            <span className="size-2 rounded-full bg-white animate-pulse" />
            <span className="font-bold tracking-wider uppercase">Live Studio Demo</span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-300">Smart Auto-Zoom Active</span>
            <span className="text-neutral-500">•</span>
            <span className="text-neutral-400">Scroll to continue</span>
            <ArrowDown className="size-3 text-neutral-400 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* BRANDING BELT: CLEAN LOGO & TEXT ONLY (NO FRAMES, NO BOXES) */}
      {/* ========================================================================= */}
      <div id="tech-stack" className="relative z-30 border-y border-neutral-800 bg-neutral-950 py-4 overflow-hidden shadow-[0_-25px_60px_rgba(0,0,0,0.95)]">
        <div className="animate-marquee flex items-center gap-12 font-mono text-xs font-bold uppercase tracking-wider text-neutral-300">
          {duplicatedBelt.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.name}-${idx}`}
                className="flex items-center gap-2.5 shrink-0 opacity-80 hover:opacity-100 transition-opacity"
              >
                <Icon className="size-4 text-white" />
                <span className="text-white tracking-widest">{item.name}</span>
                <span className="text-neutral-700 ml-6">•</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION: PAIN VS. SOLUTION (WHY SPEND 3 HOURS IN A VIDEO EDITOR?) */}
      {/* ========================================================================= */}
      <motion.section
        initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
        whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative border-b border-neutral-800 bg-neutral-950 px-4 py-24 sm:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            // The Real Problem
          </div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Why Spend 3 Hours Keyframing?
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
            Manual video editing is tedious, exhausting, and keeps you from shipping.
            DomoLens eliminates the video editing pipeline entirely so you can showcase your product in seconds.
          </p>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* The Old Way: 3+ Hours of Editing Fatigue */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-neutral-700 before:to-neutral-900">
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-400">
                      <Clock className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base uppercase text-white tracking-wide">
                        Traditional Video Editors
                      </h3>
                      <span className="font-mono text-[11px] text-neutral-400">3+ Hours of Editing Fatigue</span>
                    </div>
                  </div>
                  <XCircle className="size-5 text-neutral-500" />
                </div>

                <div className="mt-6 space-y-4">
                  {painPoints.map((pain, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg border border-neutral-800/80 bg-black/40 p-3.5">
                      <XCircle className="size-4 text-neutral-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-mono text-xs font-bold text-neutral-200 uppercase">{pain.title}</span>
                        <span className="block text-xs text-neutral-400 mt-1 leading-relaxed">{pain.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-800 flex items-center justify-between font-mono text-xs text-neutral-500">
                <span>Result: Hours lost, tired eyes</span>
                <span className="text-neutral-400 font-semibold">Exhausting</span>
              </div>
            </div>

            {/* The DomoLens Way: 30 Seconds, Zero Fatigue */}
            <div className="rounded-2xl border border-white/40 bg-neutral-900 p-6 sm:p-8 flex flex-col justify-between shadow-[0_0_50px_rgba(255,255,255,0.08)] relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-white before:to-neutral-500">
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-neutral-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-white text-black font-bold shadow-md">
                      <Zap className="size-5 fill-black" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base uppercase text-white tracking-wide">
                        The DomoLens Way
                      </h3>
                      <span className="font-mono text-[11px] text-white">30 Seconds. Zero Video Editing.</span>
                    </div>
                  </div>
                  <CheckCircle2 className="size-5 text-white" />
                </div>

                <div className="mt-6 space-y-4">
                  {domolensBenefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-3 rounded-lg border border-neutral-700/80 bg-neutral-800/50 p-3.5">
                      <CheckCircle2 className="size-4 text-white shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-mono text-xs font-bold text-white uppercase">{benefit.title}</span>
                        <span className="block text-xs text-neutral-300 mt-1 leading-relaxed">{benefit.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-neutral-800 flex items-center justify-between font-mono text-xs text-neutral-400">
                <span>Result: Launch-ready 60 FPS video</span>
                <span className="text-white font-bold">Shipped in seconds</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ========================================================================= */}
      {/* SECTION: REAL APP SCREEN RECORDING IN ACTION */}
      {/* ========================================================================= */}
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
            Watch how DomoLens automatically follows your clicks, cleans up dead air, and frames your app in studio quality — without opening a video editor.
          </p>

          {/* Chapter Switcher Buttons */}
          <div className="mt-8 flex flex-wrap gap-2.5">
            {(Object.keys(workflowChapters) as Array<typeof activeChapter>).map((key) => {
              const chap = workflowChapters[key];
              const isSelected = activeChapter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setActiveChapter(key);
                    if (showcaseVideoRef.current) {
                      showcaseVideoRef.current.currentTime = chap.time;
                      if (!showcasePlaying) {
                        showcaseVideoRef.current.play().catch(() => {});
                        setShowcasePlaying(true);
                      }
                    }
                  }}
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
          {(() => {
            const current = workflowChapters[activeChapter];
            const formatSec = (secs: number) => {
              const s = Math.floor(secs);
              const ms = Math.floor((secs % 1) * 10);
              return `0:${s < 10 ? "0" : ""}${s}.${ms}`;
            };
            return (
              <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 sm:p-8 shadow-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Live Specs & Active Chapter Description */}
                  <div className="lg:col-span-5 space-y-6">
                    <div>
                      <h3 className="text-2xl font-bold uppercase text-white tracking-tight">
                        {current.name}
                      </h3>
                      <p className="mt-3 text-xs leading-relaxed text-neutral-300">
                        {current.desc}
                      </p>
                    </div>

                    {/* Marketing-Minded Benefit Highlights (4 Cards) */}
                    <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-800">
                      {current.benefits.map((b, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-neutral-800 bg-black/60 p-3.5 transition-colors hover:border-neutral-700"
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
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-xs">
                      <span className="text-white font-bold block mb-1.5 font-mono text-xs uppercase tracking-wider">
                        How This Helps You
                      </span>
                      <p className="leading-relaxed text-neutral-300">
                        {current.howItHelps}
                      </p>
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
                        <div className="flex items-center gap-2 font-mono text-xs text-neutral-400">
                          <span>Studio Quality</span>
                        </div>
                      </div>

                      {/* Real Video Element */}
                      <div className="relative flex-1 bg-black overflow-hidden">
                        <video
                          ref={showcaseVideoRef}
                          src="/domolens_app_live_demo.mp4"
                          autoPlay
                          loop
                          muted={showcaseMuted}
                          playsInline
                          className="size-full object-contain bg-black"
                        />
                      </div>

                      {/* Bottom Video Controls Bar */}
                      <div className="border-t border-neutral-800 bg-neutral-950/95 px-4 py-2.5 flex items-center justify-between z-20 font-mono text-xs">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (!showcaseVideoRef.current) return;
                              if (showcasePlaying) {
                                showcaseVideoRef.current.pause();
                                setShowcasePlaying(false);
                              } else {
                                showcaseVideoRef.current.play().catch(() => {});
                                setShowcasePlaying(true);
                              }
                            }}
                            className="flex size-7 items-center justify-center rounded-lg bg-neutral-800 text-white hover:bg-neutral-700 transition-colors"
                            title={showcasePlaying ? "Pause" : "Play"}
                          >
                            {showcasePlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 ml-0.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!showcaseVideoRef.current) return;
                              showcaseVideoRef.current.currentTime = 0;
                              showcaseVideoRef.current.play().catch(() => {});
                              setShowcasePlaying(true);
                              setActiveChapter("zoom");
                            }}
                            className="flex size-7 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
                            title="Restart Video"
                          >
                            <RotateCcw className="size-3.5" />
                          </button>
                          <span className="text-[11px] text-neutral-400">
                            {formatSec(showcaseTime)} / {formatSec(showcaseDuration)}
                          </span>
                        </div>

                        {/* Scrubber track */}
                        <div className="mx-4 flex-1 hidden sm:block">
                          <div
                            className="relative h-1.5 w-full rounded-full bg-neutral-800 cursor-pointer overflow-hidden"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const pos = (e.clientX - rect.left) / rect.width;
                              if (showcaseVideoRef.current && showcaseDuration > 0) {
                                showcaseVideoRef.current.currentTime = pos * showcaseDuration;
                              }
                            }}
                          >
                            <div
                              className="h-full bg-white transition-all duration-75"
                              style={{ width: `${(showcaseTime / showcaseDuration) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (!showcaseVideoRef.current) return;
                              showcaseVideoRef.current.muted = !showcaseMuted;
                              setShowcaseMuted(!showcaseMuted);
                            }}
                            className="flex size-7 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 transition-colors"
                            title={showcaseMuted ? "Unmute" : "Mute"}
                          >
                            {showcaseMuted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
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
            );
          })()}
        </div>
      </motion.section>

      {/* ========================================================================= */}
      {/* SECTION 2: CONTINUOUS FEATURE CARDS CAROUSEL (NON-STOP ANIMATION) */}
      {/* With Curtain Reveal Effect */}
      {/* ========================================================================= */}
      <motion.section
        id="features"
        initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
        whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden border-b border-neutral-800 bg-black py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-12">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            // Made For Creators
          </div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Everything You Need.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Everything runs 100% offline on your device — keeping your work completely private, instant, and reliable.
          </p>
        </div>

        {/* Non-stop infinite marquee carousel */}
        <div className="relative flex overflow-x-hidden">
          <div className="animate-marquee flex gap-5 py-2">
            {duplicatedFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={`${feat.title}-${idx}`}
                  className="flex w-80 shrink-0 flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/90 p-6 transition-colors hover:border-neutral-500"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700">
                        <Icon className="size-5" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-neutral-400">
                        /0{idx + 1}
                      </span>
                    </div>

                    <h3 className="mt-6 text-lg font-bold uppercase text-white">
                      {feat.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between font-mono text-[11px] text-neutral-300">
                    <span>100% Offline</span>
                    <Check className="size-3.5 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ========================================================================= */}
      {/* SECTION 3: PRODUCT SHOWCASE ENGINE */}
      {/* With Curtain Reveal Effect */}
      {/* ========================================================================= */}
      <motion.section
        id="product-showcase"
        initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
        whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative border-b border-neutral-800 bg-neutral-950 px-4 py-24 sm:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            // Product Showcase Engine
          </div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Perfect for Showcasing Your Product.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
            Turn everyday screen captures into studio-grade product showcases that captivate users.
            Whether launching on Product Hunt, filming video changelogs, recording interactive walkthroughs,
            or pitching investors, DomoLens frames every highlight with cinematic camera motion.
          </p>

          {/* Studio Product Showcase Video Stage */}
          <div className="mt-12 rounded-xl border border-neutral-800 bg-neutral-900 p-4 sm:p-6 shadow-2xl">
            {/* Showcase Window Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="size-3 rounded-full bg-neutral-700" />
                <span className="size-3 rounded-full bg-neutral-700" />
                <span className="size-3 rounded-full bg-neutral-700" />
                <span className="ml-2 font-bold text-white">DomoLens Studio — Product Showcase (60 FPS 4K)</span>
              </div>
              <div className="flex items-center gap-2 text-white font-mono">
                <span className="size-2 rounded-full bg-white animate-pulse" />
                <span>Showcase Engine Active</span>
              </div>
            </div>

            {/* Video Player Displaying /demo2.mp4 */}
            <div className="relative mt-6 aspect-video w-full rounded-lg border border-neutral-800 bg-black overflow-hidden shadow-2xl">
              <video
                src="/demo2.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="size-full object-contain bg-black"
              />
            </div>

            {/* Showcase Value Highlights */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-neutral-800 pt-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-neutral-800 bg-black p-2 text-white shrink-0">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h4 className="font-mono text-xs font-bold uppercase text-white">Cinematic Auto-Zoom</h4>
                  <p className="mt-1 text-xs text-neutral-400">Pans and glides to clicks and keystrokes with silky easing.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-neutral-800 bg-black p-2 text-white shrink-0">
                  <Zap className="size-4" />
                </div>
                <div>
                  <h4 className="font-mono text-xs font-bold uppercase text-white">Launch-Ready Demos</h4>
                  <p className="mt-1 text-xs text-neutral-400">Export buttery 60 FPS videos tailored for Product Hunt and YouTube.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-neutral-800 bg-black p-2 text-white shrink-0">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h4 className="font-mono text-xs font-bold uppercase text-white">100% Private & Native</h4>
                  <p className="mt-1 text-xs text-neutral-400">Zero waiting in cloud queues. Renders instantly on your machine.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ========================================================================= */}
      {/* SECTION: REAL-WORLD USE CASES (BUILT FOR ANYONE WHO SHIPS PRODUCTS) */}
      {/* ========================================================================= */}
      <motion.section
        initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
        whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative border-b border-neutral-800 bg-neutral-950 px-4 py-24 sm:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            // Where Creators Use DomoLens
          </div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Built For Anyone Who Ships Products.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
            From solo indie hackers to developer relations teams, see how creators replace hours in video editors with one-click screen recordings.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((uc, idx) => {
              const Icon = uc.icon;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 flex flex-col justify-between transition-all hover:border-neutral-500 hover:bg-neutral-900/90 shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700">
                        <Icon className="size-5" />
                      </div>
                      <span className="font-mono text-xs font-semibold text-neutral-400">
                        /0{idx + 1}
                      </span>
                    </div>

                    <h3 className="mt-5 text-base font-bold uppercase text-white">
                      {uc.title}
                    </h3>
                    <span className="block font-mono text-[11px] text-neutral-400 mt-0.5">
                      {uc.subtitle}
                    </span>
                    <p className="mt-2.5 text-xs text-neutral-400 leading-relaxed">
                      {uc.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between font-mono text-[11px] text-neutral-400">
                    <span>Zero Editing Needed</span>
                    <Check className="size-3.5 text-white" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ========================================================================= */}
      {/* SECTION 4: FOUR-STEP WORKFLOW & BEFORE/AFTER COMPARISON */}
      {/* With Curtain Reveal Effect */}
      {/* ========================================================================= */}
      <motion.section
        id="workflow"
        initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
        whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative border-b border-neutral-800 bg-black px-4 py-24 sm:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-6xl">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            // Workflow Walkthrough
          </div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Four Steps. Zero Manual Keyframes.
          </h2>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Capture your product demonstration and let DomoLens handle camera angles, cuts, and framing automatically.
          </p>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-6 transition-all hover:border-neutral-500"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-3xl font-black text-white">
                        {step.num}
                      </span>
                      <div className="flex size-9 items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700">
                        <Icon className="size-4" />
                      </div>
                    </div>
                    <h3 className="mt-6 text-base font-bold uppercase text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-neutral-800 flex items-center gap-1.5 font-mono text-[10px] text-neutral-400 uppercase">
                    <Check className="size-3 text-white" />
                    <span>Instant Execution</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Before & After Split Slider */}
          <div className="mt-16 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-4 font-mono text-xs text-neutral-400">
              <span className="uppercase font-bold text-white">Interactive Zoom Comparison</span>
              <span>Drag slider left / right</span>
            </div>

            <div
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setSliderPos(Math.min(100, Math.max(0, (x / rect.width) * 100)));
              }}
              className="relative aspect-video w-full overflow-hidden rounded-lg border border-neutral-800 bg-black cursor-ew-resize select-none"
            >
              {/* DomoLens Zoomed Side */}
              <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
                <video
                  src="/domolens_smooth_autozoom_demo.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="size-full object-cover scale-[1.65] origin-center"
                />
                <div className="absolute top-4 right-4 z-20 rounded border border-neutral-700 bg-neutral-950/90 px-3 py-1 font-mono text-xs font-bold text-white uppercase backdrop-blur-md">
                  WITH DOMOLENS (1.85x AUTO-ZOOM)
                </div>
              </div>

              {/* Raw Unzoomed Side */}
              <div
                className="absolute inset-0 overflow-hidden bg-black border-r border-white z-10"
                style={{ width: `${sliderPos}%` }}
              >
                <div className="absolute inset-0 w-[100vw] max-w-[1024px] h-full flex items-center justify-center">
                  <video
                    src="/domolens_smooth_autozoom_demo.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="size-full object-cover opacity-70"
                  />
                </div>
                <div className="absolute top-4 left-4 z-20 rounded border border-neutral-800 bg-neutral-900/90 px-3 py-1 font-mono text-xs font-bold text-neutral-400 uppercase backdrop-blur-md">
                  RAW RECORDING (1.0x FULL SCREEN)
                </div>
              </div>

              {/* Slider Handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border border-black bg-white text-black shadow-lg">
                  <Split className="size-3.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ========================================================================= */}
      {/* SECTION 5: NATIVE ARCHITECTURE COMPARISON TABLE */}
      {/* With Curtain Reveal Effect */}
      {/* ========================================================================= */}
      <motion.section
        initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
        whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative border-b border-neutral-800 bg-neutral-950 py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            // Why DomoLens
          </div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
            Full Desktop App vs. Browser Tools
          </h2>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Record any app, window, or display — with zero cloud wait times and complete offline privacy.
          </p>

          <div className="mt-12 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-neutral-800 bg-black text-neutral-400 uppercase">
                <tr>
                  <th className="p-4">Feature</th>
                  <th className="p-4 text-white">DomoLens App</th>
                  <th className="p-4 text-neutral-500">Browser Extension Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                <tr>
                  <td className="p-4 font-bold text-white">Record Any Window or App</td>
                  <td className="p-4 text-white">Any desktop app, full screen, or window</td>
                  <td className="p-4 text-neutral-500">Restricted only to web browser tabs</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Smart Zoom on Clicks</td>
                  <td className="p-4 text-white">Automatic, smooth zoom on every action</td>
                  <td className="p-4 text-neutral-500">No mouse tracking across apps</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Floating Shortcut Bar</td>
                  <td className="p-4 text-white">Handy floating toolbar on desktop & phone</td>
                  <td className="p-4 text-neutral-500">Stuck inside the browser tab</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Privacy & Offline Access</td>
                  <td className="p-4 text-white">100% Offline — saved privately on your device</td>
                  <td className="p-4 text-neutral-500">Forced cloud uploads and accounts</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Export Speed & Quality</td>
                  <td className="p-4 text-white">Crisp 4K & 1080p saved instantly with no queues</td>
                  <td className="p-4 text-neutral-500">Slow cloud processing & compression</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.section>

      {/* ========================================================================= */}
      {/* SECTION 6: DIRECT MULTI-PLATFORM DOWNLOADS & DEPLOYMENT */}
      {/* With Curtain Reveal Effect */}
      {/* ========================================================================= */}
      <motion.section
        id="downloads"
        initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
        whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
        className="relative bg-black px-4 py-24 sm:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-5xl text-center">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
            // Direct Downloads
          </div>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
            Download DomoLens.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-400">
            Free offline app for desktop and mobile. No subscriptions, no accounts, completely private.
          </p>

          {/* OS Platform Tabs */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "mac", label: "macOS", icon: Apple },
              { id: "win", label: "Windows", icon: Laptop },
              { id: "linux", label: "Linux", icon: Terminal },
              { id: "android", label: "Android", icon: Smartphone },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-xs uppercase transition-all ${
                    activeTab === tab.id
                      ? "bg-white text-black font-bold shadow-sm"
                      : "border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Download Details Card */}
          <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-left shadow-2xl">
            {activeTab === "mac" && (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase text-white">DomoLens for macOS</h3>
                    <p className="text-xs text-neutral-400 mt-1">Universal binary for Apple Silicon (M1/M2/M3/M4) & Intel</p>
                  </div>
                  <span className="font-mono text-xs text-neutral-400">
                    Latest Release
                  </span>
                </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://github.com/darknecrocities/DomoLens/releases/latest/download/DomoLens-Universal.dmg"
                  download="DomoLens-Universal.dmg"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                >
                  <Download className="size-4" />
                  <span>Download .DMG (Universal)</span>
                </a>
                <a
                  href="/DomoLens-Universal.dmg"
                  download="DomoLens-Universal.dmg"
                  className="flex items-center rounded-lg border border-neutral-800 bg-black px-4 py-2 font-mono text-xs text-neutral-300 hover:text-white"
                >
                  <span>Direct Mirror</span>
                </a>
                <a
                  href="https://github.com/darknecrocities/DomoLens/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center rounded-lg border border-neutral-800 bg-black px-4 py-2 font-mono text-xs text-neutral-300 hover:text-white"
                >
                  <span>GitHub Release</span>
                </a>
              </div>
              <div className="mt-4 rounded-lg border border-neutral-800/80 bg-neutral-950/60 p-3.5 text-xs text-neutral-400">
                <p className="font-semibold text-neutral-300">macOS Installation Note:</p>
                <p className="mt-1 leading-relaxed">
                  Open the DMG and drag DomoLens into Applications. If macOS displays an unidentified developer prompt on first launch, right-click (or Control-click) DomoLens in Applications and select <span className="text-neutral-200 font-medium">Open</span>, or run <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-200 font-mono text-[11px]">xattr -cr /Applications/DomoLens.app</code> in Terminal.
                </p>
              </div>
            </div>
          )}

          {activeTab === "win" && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold uppercase text-white">DomoLens for Windows</h3>
                  <p className="text-xs text-neutral-400 mt-1">Windows 11 and Windows 10 (64-bit Architecture)</p>
                </div>
                <span className="font-mono text-xs text-neutral-400">
                  Latest Release
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://github.com/darknecrocities/DomoLens/releases/latest/download/DomoLens-Windows-Setup.exe"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                >
                  <Download className="size-4" />
                  <span>Download Windows Installer (.EXE)</span>
                </a>
                <a
                  href="https://github.com/darknecrocities/DomoLens/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center rounded-lg border border-neutral-800 bg-black px-4 py-2 font-mono text-xs text-neutral-300 hover:text-white"
                >
                  <span>GitHub Release</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === "linux" && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold uppercase text-white">DomoLens for Linux</h3>
                  <p className="text-xs text-neutral-400 mt-1">Ubuntu, Debian, Fedora, Arch (Wayland & PipeWire Support)</p>
                </div>
                <span className="font-mono text-xs text-neutral-400">
                  Latest Release
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="https://github.com/darknecrocities/DomoLens/releases/latest/download/DomoLens-Linux.AppImage"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                >
                  <Download className="size-4" />
                  <span>Download Linux (.AppImage)</span>
                </a>
                <a
                  href="https://github.com/darknecrocities/DomoLens/releases/latest"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center rounded-lg border border-neutral-800 bg-black px-4 py-2 font-mono text-xs text-neutral-300 hover:text-white"
                >
                  <span>GitHub Release (.DEB)</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === "android" && (
              <div className="relative min-h-[260px] flex items-center justify-center overflow-hidden rounded-lg">
                {/* Blurred Android Section */}
                <div
                  aria-hidden="true"
                  className="w-full select-none pointer-events-none filter blur-[6px] opacity-25"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold uppercase text-white">DomoLens Android Companion</h3>
                      <p className="text-xs text-neutral-400 mt-1">MediaProjection Screen Recorder with Floating HUD (Android 12+)</p>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase">
                        <Download className="size-4" />
                        <span>Direct .APK Download</span>
                      </div>
                      <p className="mt-3 font-mono text-[11px] text-neutral-400">
                        Install directly without Google Play. Includes floating quickbar tile and touch tracker.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-black p-3">
                      <div className="flex size-14 items-center justify-center rounded bg-white text-black shrink-0">
                        <QrCode className="size-10" />
                      </div>
                      <div className="font-mono text-[11px] text-neutral-300">
                        <span className="font-bold text-white block">Scan to Install on Mobile</span>
                        <span>Point your phone camera to download APK immediately</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlapped Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40 backdrop-blur-[2px]">
                  <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
                    // Android Companion
                  </span>
                  <h3 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                    Coming Soon
                  </h3>
                  <p className="mt-2 max-w-md text-xs sm:text-sm text-neutral-300">
                    The Android screen recorder and floating quickbar companion is currently in development.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Callout */}
          <div className="mt-16 border-t border-neutral-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-neutral-500">
            <div className="flex items-center gap-2">
              <img src="/domolens.png" alt="DomoLens" className="size-5 object-contain" />
              <span>DomoLens Native Video Software © 2026</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Local-First</span>
              <span>•</span>
              <span>Zero Telemetry</span>
              <span>•</span>
              <span>60 FPS</span>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}
