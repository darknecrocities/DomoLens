import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Zap } from "lucide-react";

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
  );
}
