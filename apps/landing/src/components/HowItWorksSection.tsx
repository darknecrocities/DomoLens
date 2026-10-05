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
      className="relative border-b border-neutral-800 bg-neutral-950 px-4 py-24 sm:px-6 lg:px-12"
    >
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
      </div>
    </motion.section>
  );
}
