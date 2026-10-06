import { useState } from "react";
import { motion } from "framer-motion";
import { Split } from "lucide-react";

export function BeforeAfterSlider() {
  const [sliderPos, setSliderPos] = useState(50);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative border-b border-neutral-800 bg-black px-4 py-24 sm:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-neutral-400">
          <span>// Instant Video Comparison</span>
        </div>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Raw Screen vs. DomoLens Focus
        </h2>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Drag the slider across real screen-recorded footage to compare flat unzoomed recording with DomoLens camera focus in real time.
        </p>

        {/* Interactive Split Frame with Real Video */}
        <div
          onMouseMove={handleMouseMove}
          className="relative mt-12 aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 cursor-ew-resize select-none shadow-2xl"
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
            <div className="absolute top-4 right-4 z-20 rounded border border-neutral-700 bg-neutral-950/90 px-3 py-1 font-mono text-xs font-bold text-white uppercase backdrop-blur-md">
              WITH DOMOLENS (1.85x AUTO-ZOOM)
            </div>
          </div>

          {/* Left Layer: Raw Recording (Full Screen 1.0x) */}
          <div
            className="absolute inset-0 overflow-hidden bg-black border-r border-white z-10"
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
            <div className="absolute top-4 left-4 z-20 rounded border border-neutral-800 bg-neutral-900/90 px-3 py-1 font-mono text-xs font-bold text-neutral-400 uppercase backdrop-blur-md">
              RAW RECORDING (1.0x FULL SCREEN)
            </div>
          </div>

          {/* Slider Split Handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-30"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-full border border-black bg-white text-black shadow-lg">
              <Split className="size-3.5" />
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
