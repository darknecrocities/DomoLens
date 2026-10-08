import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Zap, Crosshair } from "lucide-react";

export function PainVsGainSection() {
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

  return (
    <section className="relative overflow-hidden border-b border-white/[0.08] bg-black px-4 py-24 sm:px-6 lg:px-12">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[650px] rounded-full bg-white/[0.02] blur-[140px]" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
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
        </motion.div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch [perspective:1200px]">
          {/* The Old Way: 3+ Hours of Editing Fatigue */}
          <motion.div
            initial={{ opacity: 0, x: -40, rotateY: 6 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            whileHover={{ y: -5, transition: { duration: 0.25 } }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-white/[0.08] bg-neutral-950/70 p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-xl group hover:border-white/20 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-neutral-400">
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

              <div className="mt-6 space-y-3.5">
                {painPoints.map((pain, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + idx * 0.08, duration: 0.4 }}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3.5"
                  >
                    <XCircle className="size-4 text-neutral-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-mono text-xs font-bold text-neutral-300 uppercase">{pain.title}</span>
                      <span className="block text-xs text-neutral-400 mt-1 leading-relaxed">{pain.desc}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-neutral-400">
              <span>Result: Hours lost, tired eyes</span>
              <span className="text-neutral-400 font-semibold">Exhausting</span>
            </div>
          </motion.div>

          {/* The DomoLens Way: 30 Seconds, Zero Fatigue */}
          <motion.div
            initial={{ opacity: 0, x: 40, rotateY: -6 }}
            whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
            whileHover={{ y: -5, transition: { duration: 0.25 } }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-white/20 bg-neutral-950/90 p-6 sm:p-8 flex flex-col justify-between shadow-[0_0_50px_rgba(255,255,255,0.04)] relative overflow-hidden backdrop-blur-xl group hover:border-white/40 transition-colors"
          >
            {/* Animated subtle lens scanning beam */}
            <motion.div
              animate={{ y: ["-100%", "200%"] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: "linear" }}
              className="pointer-events-none absolute inset-x-0 h-28 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent opacity-80"
            />

            <div>
              <div className="flex items-center justify-between pb-6 border-b border-white/[0.08]">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-white text-black font-bold shadow-lg">
                    <Zap className="size-5 fill-black" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base uppercase text-white tracking-wide">
                      The DomoLens Way
                    </h3>
                    <span className="font-mono text-[11px] text-neutral-300">30 Seconds. Zero Video Editing.</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-white">
                  <Crosshair className="size-4 animate-spin text-neutral-400 [animation-duration:12s]" />
                  <CheckCircle2 className="size-5 text-white" />
                </div>
              </div>

              <div className="mt-6 space-y-3.5">
                {domolensBenefits.map((benefit, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 + idx * 0.08, duration: 0.4 }}
                    className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3.5 hover:border-white/25 transition-colors"
                  >
                    <CheckCircle2 className="size-4 text-white shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-mono text-xs font-bold text-white uppercase">{benefit.title}</span>
                      <span className="block text-xs text-neutral-300 mt-1 leading-relaxed">{benefit.desc}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono text-xs text-neutral-400">
              <span>Result: Launch-ready 60 FPS video</span>
              <span className="text-white font-bold">Shipped in seconds</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
