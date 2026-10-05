import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Apple,
  ArrowDown,
  ArrowRight,
  Bot,
  Check,
  Cpu,
  Download,
  FileCode2,
  Film,
  ShieldCheck,
  Laptop,
  Layers,
  MousePointer2,
  QrCode,
  Shield,
  Sliders,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Split,
  Terminal,
  Video,
  Volume2,
  Zap,
} from "lucide-react";
import { useNav } from "../store/nav";

const FLIP_WORDS = [
  "AUTOMATICALLY ZOOMED.",
  "BEAUTIFULLY FRAMED.",
  "100% OFFLINE & PRIVATE.",
  "EFFORTLESSLY RECORDED.",
  "PERFECTLY HIGHLIGHTED.",
  "STUDIO QUALITY.",
];

export function LandingView() {
  const { go } = useNav();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [sliderPos, setSliderPos] = useState(50);
  const [activeTab, setActiveTab] = useState<"mac" | "win" | "linux" | "android">("mac");
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
  // Starts B&W (grayscale 100%), blurry (14px), with polkadot overlay.
  // Clears up completely by scrollProgress = 0.25, staying 100% clear throughout Phase 2!
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

  // Live Demo Held Indicator Opacity (Fades in during Phase 2, fades out at Phase 3)
  const heldIndicatorOpacity =
    Math.max(0, Math.min(1, (scrollProgress - 0.24) / 0.08)) *
    (1 - Math.max(0, Math.min(1, (scrollProgress - 0.74) / 0.08)));

  // 1. Core Features (Creator-Friendly & Human Language)
  const features = [
    {
      title: "Follows Your Mouse Smoothly",
      desc: "The camera glides with your cursor as you move, holds focus right on the action, and gently eases back out with zero effort.",
      icon: MousePointer2,
      tag: "SMOOTH MOTION",
    },
    {
      title: "Floating QuickBar",
      desc: "A neat floating toolbar on your laptop and phone. Record, pause, transcribe, and open the editor with a single tap.",
      icon: Sliders,
      tag: "ONE TAP",
    },
    {
      title: "Smart AI Video Assistant",
      desc: "Connect your favorite AI. Automatically cut awkward silences, drop filler words, and create titles in seconds.",
      icon: Sparkles,
      tag: "AI CUTS",
    },
    {
      title: "Studio Backgrounds & Framing",
      desc: "Make your screen look gorgeous with rounded corners, blurred backgrounds, custom padding, and soft shadows.",
      icon: Layers,
      tag: "LOOKS",
    },
    {
      title: "Easy Multi-Track Timeline",
      desc: "Split clips with S, trim with T, adjust speed, and customize auto-zoom blocks with full undo and redo.",
      icon: SlidersHorizontal,
      tag: "TIMELINE",
    },
    {
      title: "100% Private On Your Device",
      desc: "Your recordings stay safe on your computer and phone. No accounts needed, no watermarks, zero cloud uploads.",
      icon: Shield,
      tag: "PRIVATE",
    },
  ];
  const duplicatedFeatures = [...features, ...features];

  // 2. Clean Branding Belt (Logo + Text only, NO frames or boxes)
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

  // 3. Workflow Steps
  const steps = [
    {
      num: "01",
      title: "Pop the Floating QuickBar",
      desc: "Press Option+Space on laptop or tap the floating overlay on Android. Choose entire display, active window, or browser tab.",
      icon: Laptop,
    },
    {
      num: "02",
      title: "Record Your Screen Naturally",
      desc: "Navigate your app, click buttons, and type text. DomoLens records clean 60 FPS video and tracks where you focus.",
      icon: Video,
    },
    {
      num: "03",
      title: "Auto-Zoom & Quick AI Polish",
      desc: "The studio editor opens instantly with zoom moments already highlighted. Trim dead pauses and style the frame.",
      icon: Sliders,
    },
    {
      num: "04",
      title: "Save in 60 FPS Video",
      desc: "Export crisp 4K, 1080p, or GIF files straight to your computer with zero waiting and zero cloud queues.",
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
            {/* Master Headline with 3D Word Flip */}
            <h1 className="text-4xl font-black uppercase tracking-tight sm:text-6xl lg:text-7xl leading-none drop-shadow-2xl">
              <span className="block text-white">Studio Screen Recordings.</span>
              <span className="relative mt-2 block h-[1.18em] overflow-hidden [perspective:1000px]">
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

            {/* Subtitle - User-friendly, highlighting 100% offline & private */}
            <p className="mx-auto mt-6 max-w-2xl text-base text-neutral-300 sm:text-lg leading-relaxed drop-shadow-md">
              The easy screen recorder that follows your clicks, highlights your actions,
              and creates stunning product videos — working 100% offline right on your computer.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#downloads"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-white px-7 py-3 font-mono text-xs font-bold uppercase text-black hover:bg-neutral-200 transition-colors shadow-2xl touch-manipulation"
              >
                <Download className="size-4" />
                <span>Download App (Mac / Win / Linux / Android)</span>
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
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded">
                        {feat.tag}
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
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 p-8">
                <div className="size-full scale-125 rounded-xl bg-neutral-800 p-6 border border-neutral-600 shadow-2xl flex flex-col justify-center items-center text-center">
                  <span className="rounded bg-white px-3 py-1 font-mono text-xs font-bold text-black uppercase">
                    1.85x Spring Auto Zoom
                  </span>
                  <h4 className="mt-3 text-xl font-bold text-white uppercase">Focuses on Every Action</h4>
                  <p className="mt-1 text-xs text-neutral-400">Readable code, smooth cursor tracking, zero manual edits.</p>
                </div>
              </div>

              {/* Raw Unzoomed Side */}
              <div
                className="absolute inset-0 overflow-hidden bg-black border-r border-white"
                style={{ width: `${sliderPos}%` }}
              >
                <div className="absolute inset-0 w-[100vw] max-w-[1024px] flex items-center justify-center p-8 bg-neutral-950/95 opacity-60">
                  <div className="size-full rounded-lg bg-neutral-900 p-6 border border-neutral-800 flex flex-col justify-center items-center text-center">
                    <span className="font-mono text-xs text-neutral-400 uppercase">1.0x Full Screen Raw</span>
                    <h4 className="mt-2 text-sm text-neutral-300">Tiny, hard-to-read text on mobile & laptop screens</h4>
                  </div>
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
                  <span className="font-mono text-xs font-bold text-white border border-neutral-700 px-2.5 py-1 rounded">
                    Stable
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/domolens_smooth_autozoom_demo.mp4"
                    download="DomoLens-Universal.dmg"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                  >
                    <Download className="size-4" />
                    <span>Download .DMG (Universal)</span>
                  </a>
                  <div className="flex items-center rounded-lg border border-neutral-800 bg-black px-4 py-2 font-mono text-xs text-neutral-300">
                    <code>brew install domolens</code>
                  </div>
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
                  <span className="font-mono text-xs font-bold text-white border border-neutral-700 px-2.5 py-1 rounded">
                    Stable
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/domolens_smooth_autozoom_demo.mp4"
                    download="DomoLens-Setup-x64.exe"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                  >
                    <Download className="size-4" />
                    <span>Download .EXE Setup</span>
                  </a>
                  <div className="flex items-center rounded-lg border border-neutral-800 bg-black px-4 py-2 font-mono text-xs text-neutral-300">
                    <code>winget install domolens</code>
                  </div>
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
                  <span className="font-mono text-xs font-bold text-white border border-neutral-700 px-2.5 py-1 rounded">
                    Stable
                  </span>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/domolens_smooth_autozoom_demo.mp4"
                    download="DomoLens.AppImage"
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                  >
                    <Download className="size-4" />
                    <span>Download .AppImage</span>
                  </a>
                  <a
                    href="/domolens_smooth_autozoom_demo.mp4"
                    download="domolens_amd64.deb"
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-5 py-2.5 font-mono text-xs font-bold text-white uppercase hover:bg-neutral-700"
                  >
                    <Download className="size-4" />
                    <span>Download .DEB</span>
                  </a>
                </div>
              </div>
            )}

            {activeTab === "android" && (
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold uppercase text-white">DomoLens Android Companion</h3>
                    <p className="text-xs text-neutral-400 mt-1">MediaProjection Screen Recorder with Floating HUD (Android 12+)</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-white border border-neutral-700 px-2.5 py-1 rounded w-fit">
                    APK Release
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div>
                    <a
                      href="/domolens_smooth_autozoom_demo.mp4"
                      download="DomoLens-Android.apk"
                      className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                    >
                      <Download className="size-4" />
                      <span>Direct .APK Download</span>
                    </a>
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
