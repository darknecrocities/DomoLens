import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { MoveHorizontal } from "lucide-react";

export function BeforeAfterSlider() {
  const [sliderPos, setSliderPos] = useState(50);
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsInteracting(true);
    updatePosition(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) {
      setIsInteracting(true);
      updatePosition(e.touches[0].clientX);
    }
  };

  // Gentle breathing idle oscillation when not interacting
  useEffect(() => {
    if (isInteracting) return;
    let frame: number;
    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = (timestamp - start) / 1000;
      // Oscillate smoothly between 42% and 58%
      const newPos = 50 + Math.sin(progress * 1.5) * 8;
      setSliderPos(newPos);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [isInteracting]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative border-b border-white/[0.08] bg-black px-4 py-24 sm:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Raw Screen vs. DomoLens Focus
        </h2>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Drag the slider across real screen-recorded footage to compare flat unzoomed recording with DomoLens camera focus in real time.
        </p>

        {/* Interactive Split Frame with Breathing Scan and Real Video */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setIsInteracting(false)}
          onTouchMove={handleTouchMove}
          onTouchEnd={() => setIsInteracting(false)}
          className="relative mt-12 aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.12] bg-neutral-950/70 backdrop-blur-xl cursor-ew-resize select-none shadow-2xl group"
        >
          {/* Right Layer: DomoLens (Smooth 1.85x Zoom & Framing) */}
          <div className="absolute inset-0 overflow-hidden bg-black flex items-center justify-center">
            <video
              src="/domolens_smooth_autozoom_demo.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="size-full object-cover scale-[1.65] origin-center"
            />
            {/* Typographic Label (No Badges) */}
            <div className="absolute top-4 right-4 z-20 font-mono text-xs font-bold text-white uppercase tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
              <span>DomoLens 1.85x Auto-Zoom</span>
            </div>
          </div>

          {/* Left Layer: Raw Recording (Full Screen 1.0x) */}
          <div
            className="absolute inset-0 overflow-hidden bg-black border-r border-white/80 z-10"
            style={{ width: `${sliderPos}%` }}
          >
            <div className="absolute inset-0 w-[100vw] max-w-[1152px] h-full flex items-center justify-center">
              <video
                src="/domolens_smooth_autozoom_demo.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="size-full object-cover opacity-70"
              />
            </div>
            {/* Typographic Label (No Badges) */}
            <div className="absolute top-4 left-4 z-20 font-mono text-xs font-semibold text-neutral-400 uppercase tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-neutral-500" />
              <span>Raw Screen 1.0x</span>
            </div>
          </div>

          {/* Slider Split Handle with Magnetic Pulse Motion */}
          <div
            className="absolute top-0 bottom-0 w-[2px] bg-white pointer-events-none z-30 shadow-[0_0_12px_rgba(255,255,255,0.8)]"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full border border-black/40 bg-white text-black shadow-2xl">
              <motion.div
                animate={{ x: [-1.5, 1.5, -1.5] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <MoveHorizontal className="size-4" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
