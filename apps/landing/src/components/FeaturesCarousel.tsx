import { motion } from "framer-motion";
import {
  Check,
  Layers,
  MousePointer2,
  Shield,
  Sliders,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

export function FeaturesCarousel() {
  const features = [
    {
      title: "Follows Your Mouse Smoothly",
      desc: "The camera smoothly follows your mouse wherever you move. When you click, it zooms in effortlessly and glides with your motion.",
      icon: MousePointer2,
      tag: "SMOOTH MOTION",
    },
    {
      title: "Floating QuickBar HUD",
      desc: "Convenient glassmorphism toolbar for laptop and Android. Start, pause, resume, transcribe, and jump to editor with a single tap.",
      icon: Sliders,
      tag: "ZERO CLUTTER",
    },
    {
      title: "Bring Your Own AI Director",
      desc: "Connect Gemini, Claude, or OpenAI. Cut awkward silences, generate chapter titles, and re-frame key moments on command.",
      icon: Sparkles,
      tag: "BYO-AI",
    },
    {
      title: "Studio Composition & Framing",
      desc: "Apply 16:9, 9:16, or 1:1 ratios, soft blurred backdrops, adjustable window padding, curved corners, and deep shadows.",
      icon: Layers,
      tag: "COMPOSITION",
    },
    {
      title: "Visual Multi-Track Timeline",
      desc: "Split clips, trim footage, add text and background music, and inspect automatic zoom keyframes directly on the visual timeline.",
      icon: SlidersHorizontal,
      tag: "TIMELINE",
    },
    {
      title: "100% Private On Your Device",
      desc: "Everything stays strictly on your computer or phone. Your recordings and microphone audio are never uploaded to any cloud server.",
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
