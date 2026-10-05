import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, Check, Download, Sparkles } from "lucide-react";

const FLIP_WORDS = [
  "NO MANUAL KEYFRAMES.",
  "AUTO-ZOOMS ON CLICKS.",
  "STUDIO-GRADE FRAMING.",
  "TACTILE CLICK SOUNDS.",
  "READY IN 30 SECONDS.",
  "100% OFFLINE & FREE.",
];

export function HeroSection() {
  const [device, setDevice] = useState<"mac" | "windows" | "linux" | "android">("mac");
  const [scrollY, setScrollY] = useState(0);
  const [flipIndex, setFlipIndex] = useState(0);

  // 3D Physical Cursor Tilt State
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) setDevice("android");
    else if (/win/.test(ua)) setDevice("windows");
    else if (/linux/.test(ua)) setDevice("linux");
    else setDevice("mac");
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Non-stop continuous flip animation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setFlipIndex((prev) => (prev + 1) % FLIP_WORDS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const downloadLabels: Record<string, string> = {
    mac: "Download for macOS (Universal)",
    windows: "Download for Windows (64-bit)",
    linux: "Download for Linux (.AppImage)",
    android: "Download Android (.apk)",
  };

  // Cursor 3D Physics Calculation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5

    setIsHovered(true);
    setTilt({
      rotateX: -py * 20, // tilt around X axis (up/down)
      rotateY: px * 20,  // tilt around Y axis (left/right)
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

  return (
    <section
      id="hero"
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative min-h-[280vh] border-b border-neutral-800 bg-black"
    >
      {/* Sticky Fullscreen Cinematic Viewport Stage */}
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

          {/* Dark Vignette Overlay across entire screen */}
          <div
            className="pointer-events-none absolute inset-0 z-10 transition-opacity"
            style={{
              opacity: darkVignetteOpacity,
              background:
                "radial-gradient(circle at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.85) 100%)",
            }}
          />

          {/* Exit Dim Overlay (smoothly eases in as next section approaches) */}
          <div
            className="pointer-events-none absolute inset-0 z-10 bg-black transition-opacity"
            style={{ opacity: exitDim }}
          />

          {/* Specular Glare Reflection reacting to Cursor 3D Physics */}
          <div
            className="pointer-events-none absolute inset-0 z-20 mix-blend-overlay transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.18) 0%, transparent 60%)`,
              opacity: isHovered ? 1 : 0.25,
            }}
          />
        </div>

        {/* Foreground Hero Text Section (NO card wrapper, clean open floating typography) */}
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
              href="#download"
              className="inline-flex min-h-[46px] items-center gap-2 rounded-lg bg-white px-7 py-3 font-mono text-xs font-bold uppercase text-black hover:bg-neutral-200 transition-colors shadow-2xl"
            >
              <Download className="size-4" />
              <span>{downloadLabels[device]}</span>
            </a>

            <a
              href="#features"
              className="inline-flex min-h-[46px] items-center gap-2 rounded-lg border border-neutral-700 bg-black/60 backdrop-blur-md px-6 py-3 font-mono text-xs font-semibold uppercase text-white hover:border-neutral-500 hover:bg-neutral-900 transition-colors shadow-xl"
            >
              <span>Explore Features</span>
              <ArrowDown className="size-4 text-neutral-400" />
            </a>
          </div>

          {/* Scroll Down Prompt Indicator */}
          <div className="mt-8 flex items-center justify-center gap-2 font-mono text-xs text-neutral-400 uppercase tracking-widest drop-shadow">
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
  );
}
