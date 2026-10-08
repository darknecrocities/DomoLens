import { motion } from "framer-motion";
import { Check, Film, Laptop, Sliders, Video } from "lucide-react";

export function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      title: "One-Click Record",
      desc: "Hit Option+Space on desktop or tap the floating overlay on Android. Select any window, browser tab, or full display.",
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
    <motion.section
      id="how-it-works"
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative scroll-mt-16 border-b border-white/[0.08] bg-black px-4 py-24 sm:px-6 lg:px-12"
    >
      <div id="workflow" className="sr-only" />
      <div className="mx-auto max-w-6xl">
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          // Four-Step Workflow
        </div>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Four Steps. Zero Manual Keyframes.
        </h2>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Capture your product demonstration and let DomoLens handle camera angles, cuts, and framing automatically.
        </p>

        {/* Sequential Neon Pipeline Tracer Container */}
        <div className="relative mt-14">
          {/* Connecting Laser Beam Line across Steps (Desktop Only) */}
          <div className="hidden lg:block absolute top-12 inset-x-8 h-[2px] bg-white/[0.06] overflow-hidden pointer-events-none z-0">
            <motion.div
              className="h-full w-48 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_rgba(255,255,255,0.8)]"
              animate={{ x: ["-100%", "600%"] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.12 }}
                  whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                  className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-neutral-950/70 backdrop-blur-xl p-6 transition-colors hover:border-white/20 shadow-xl group cursor-default"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <motion.span
                        className="font-mono text-3xl font-black text-white"
                        animate={{ opacity: [0.8, 1, 0.8] }}
                        transition={{ repeat: Infinity, duration: 3, delay: idx * 0.5 }}
                      >
                        {step.num}
                      </motion.span>
                      <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] text-white border border-white/[0.08] group-hover:bg-white/[0.12] transition-colors">
                        <Icon className="size-5" />
                      </div>
                    </div>
                    <h3 className="mt-6 text-base font-bold uppercase text-white tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                      {step.desc}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center gap-1.5 font-mono text-[10px] text-neutral-400 uppercase">
                    <Check className="size-3 text-white" />
                    <span>Instant Execution</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
