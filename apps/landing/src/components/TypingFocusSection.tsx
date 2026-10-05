import { motion } from "framer-motion";
import { Sparkles, Zap, ShieldCheck } from "lucide-react";

export function TypingFocusSection() {
  return (
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
  );
}
