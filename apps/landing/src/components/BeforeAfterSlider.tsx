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
          <span>// Instant Comparison</span>
        </div>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Raw Screen vs. DomoLens Focus
        </h2>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Drag the slider to see how DomoLens automatically turns flat, unreadable screen recordings into sharp studio demos.
        </p>

        {/* Interactive Split Frame */}
        <div
          onMouseMove={handleMouseMove}
          className="relative mt-12 aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 cursor-ew-resize select-none shadow-2xl"
        >
          {/* Right Layer: DomoLens (Zoomed, Framed) */}
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900 p-12">
            <div className="relative size-full scale-125 origin-center rounded-xl bg-neutral-800 p-8 border border-neutral-600 shadow-2xl flex flex-col justify-center items-center text-center">
              <span className="rounded bg-white px-3 py-1 font-mono text-xs font-bold text-black uppercase">
                1.85x Auto Zoom
              </span>
              <h4 className="mt-4 text-2xl font-bold uppercase text-white">Focus on What Matters</h4>
              <p className="mt-2 text-xs text-neutral-400">Crystal-clear code and buttons with smooth mouse following.</p>
            </div>
            <div className="absolute top-4 right-4 rounded border border-neutral-700 bg-neutral-950 px-3 py-1 font-mono text-xs font-bold text-white uppercase">
              WITH DOMOLENS
            </div>
          </div>

          {/* Left Layer: Raw Recording */}
          <div
            className="absolute inset-0 overflow-hidden bg-black border-r border-white"
            style={{ width: `${sliderPos}%` }}
          >
            <div className="absolute inset-0 w-[100vw] max-w-[1152px] flex items-center justify-center p-8 bg-neutral-950/90">
              <div className="size-full rounded-none bg-neutral-900 p-6 border border-neutral-800 flex flex-col justify-center items-center text-center opacity-60">
                <span className="font-mono text-xs text-neutral-500 uppercase">1.0x Full Screen Raw</span>
                <h4 className="mt-2 text-sm text-neutral-400 uppercase">Tiny, Unreadable Details</h4>
                <p className="mt-1 text-xs text-neutral-500">Viewers struggle to track mouse actions on mobile.</p>
              </div>
            </div>
            <div className="absolute top-4 left-4 rounded border border-neutral-800 bg-neutral-900 px-3 py-1 font-mono text-xs font-bold text-neutral-400 uppercase">
              RAW RECORDING
            </div>
          </div>

          {/* Slider Split Handle */}
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
    </motion.section>
  );
}
