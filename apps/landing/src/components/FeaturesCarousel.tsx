import { motion } from "framer-motion";
import {
  Check,
  Layers,
  MousePointer2,
  Shield,
  Sliders,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";

export function FeaturesCarousel() {
  const features = [
    {
      title: "Follows Clicks & Typing",
      desc: "Camera glides with your cursor, holds focus tight on button clicks, and pans smoothly along code or text typing without manual keyframing.",
      icon: MousePointer2,
      tag: "AUTO MOTION",
    },
    {
      title: "Tactile Sound Effects",
      desc: "Subtle bubble bops on button clicks and mechanical keystroke sounds automatically synced to your actions to keep viewers engaged.",
      icon: Volume2,
      tag: "AUDIO DESIGN",
    },
    {
      title: "Studio Window Framing",
      desc: "Make any desktop app look like an Apple keynote: rounded corners, frosted glass backdrops, custom padding, and soft drop shadows.",
      icon: Layers,
      tag: "COMPOSITION",
    },
    {
      title: "One-Click QuickBar HUD",
      desc: "Floating shortcut toolbar for laptop and phone. Hit Option+Space to record, pause, transcribe, and open the studio with zero clutter.",
      icon: Sliders,
      tag: "ONE TAP",
    },
    {
      title: "Visual Multi-Track Timeline",
      desc: "NLE-grade timeline with dedicated track headers for Keyframes, Zoom, Video, Captions, and Audio. Trim with T, split with S, zero overlap.",
      icon: SlidersHorizontal,
      tag: "TIMELINE",
    },
    {
      title: "100% Private On Your Device",
      desc: "Everything runs locally on your computer. Zero cloud rendering queues, no subscriptions, no accounts, and zero watermarks.",
      icon: Shield,
      tag: "LOCAL-FIRST",
    },
  ];

  const duplicated = [...features, ...features];

  return (
    <motion.section
      id="features"
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden border-b border-neutral-800 bg-black py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-12">
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          // Section 2: Core Capabilities
        </div>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Made For Video Creators.
        </h2>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Record, edit, auto-zoom, and export beautiful product walkthroughs without spending hours in manual video editing.
        </p>
      </div>

      {/* Non-stop infinite marquee carousel */}
      <div className="relative flex overflow-x-hidden">
        <div className="animate-marquee flex gap-5 py-2">
          {duplicated.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={`${feat.title}-${idx}`}
                className="flex w-80 shrink-0 flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900/90 p-6 transition-colors hover:border-neutral-500"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded">
                      {feat.tag}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold uppercase text-white">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center justify-between font-mono text-[11px] text-neutral-300">
                  <span>Instant & Private</span>
                  <Check className="size-3.5 text-white" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
