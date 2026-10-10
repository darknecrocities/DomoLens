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
      className="relative border-b border-white/[0.08] bg-black px-4 py-24 sm:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Perfect for Showcasing Your Product.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
          Turn everyday screen captures into studio-grade product showcases that captivate users.
          Whether launching on Product Hunt, filming video changelogs, recording interactive walkthroughs,
          or pitching investors, DomoLens frames every highlight with cinematic camera motion.
        </p>

        {/* Studio Product Showcase Video Stage with 3D Perspective Entrance */}
        <motion.div
          initial={{ rotateX: 6, opacity: 0.8 }}
          whileInView={{ rotateX: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ perspective: 1200 }}
          className="relative mt-12 rounded-2xl border border-white/[0.08] bg-neutral-950/70 backdrop-blur-xl p-4 sm:p-6 shadow-2xl overflow-hidden group"
        >
          {/* Subtle Ambient Laser Scanning Beam across the container */}
          <motion.div
            className="pointer-events-none absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent z-20"
            animate={{ x: ["-100%", "1200%"] }}
            transition={{
              repeat: Infinity,
              duration: 7,
              ease: "linear",
            }}
          />

          {/* Showcase Window Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-4 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="size-3 rounded-full bg-neutral-700" />
              <span className="size-3 rounded-full bg-neutral-700" />
              <span className="size-3 rounded-full bg-neutral-700" />
              <span className="ml-2 font-bold text-white">DomoLens Studio — Product Showcase (60 FPS 4K)</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300 font-mono">
              {/* Bouncing Frequency Waveform */}
              <div className="flex items-center gap-0.5 h-3">
                {[0.4, 0.9, 0.6, 1, 0.5].map((scale, i) => (
                  <motion.span
                    key={i}
                    className="w-0.5 bg-white rounded-full"
                    animate={{ height: ["20%", `${scale * 100}%`, "20%"] }}
                    transition={{
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 0.6 + i * 0.1,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </div>
              <span className="text-white font-semibold">Engine Active</span>
            </div>
          </div>

          {/* Video Player Displaying /demo2.mp4 */}
          <div className="relative mt-6 aspect-video w-full rounded-xl border border-white/[0.08] bg-black overflow-hidden shadow-2xl">
            <video
              src="/demo2.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="size-full object-contain bg-black"
            />
          </div>

          {/* Showcase Value Highlights with Staggered Hover Motion */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/[0.08] pt-6">
            <motion.div
              whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.25)" }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-black/40 p-3.5 transition-colors"
            >
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2 text-white shrink-0">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold uppercase text-white">Cinematic Auto-Zoom</h4>
                <p className="mt-1 text-xs text-neutral-400">Pans and glides to clicks and keystrokes with silky easing.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.25)" }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-black/40 p-3.5 transition-colors"
            >
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2 text-white shrink-0">
                <Zap className="size-4" />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold uppercase text-white">Launch-Ready Demos</h4>
                <p className="mt-1 text-xs text-neutral-400">Export buttery 60 FPS videos tailored for Product Hunt and YouTube.</p>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.25)" }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-black/40 p-3.5 transition-colors"
            >
              <div className="rounded-lg border border-white/[0.08] bg-white/[0.05] p-2 text-white shrink-0">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h4 className="font-mono text-xs font-bold uppercase text-white">100% Private & Native</h4>
                <p className="mt-1 text-xs text-neutral-400">Zero waiting in cloud queues. Renders instantly on your machine.</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
}
