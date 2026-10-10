import { motion } from "framer-motion";
import {
  Check,
  Layers,
  Monitor,
  MousePointer2,
  Shield,
  Smartphone,
  Sliders,
  SlidersHorizontal,
  Volume2,
} from "lucide-react";

export function FeaturesCarousel() {
  const features = [
    {
      title: "USB & Wi-Fi Mobile Mirroring",
      desc: "Plug in via USB or pair over Wi-Fi. Stream iPhone or Android at buttery 60 FPS with live touch ripples, hardware buttons, and instant latency-free capture.",
      icon: Smartphone,
      num: "01",
    },
    {
      title: "Whole Canvas Studio Export",
      desc: "Export widescreen 16:9 videos with your mobile phone or laptop centered on a custom canvas. Complete with realistic hardware chassis, drop shadows, and vibrant backdrops.",
      icon: Monitor,
      num: "02",
    },
    {
      title: "Authentic Device Chassis",
      desc: "iPhone Pro with Dynamic Island, Android Flagship with punch-hole & nav pill, MacBook Pro notch, iPad, and modern laptop shells that adapt dynamically.",
      icon: Layers,
      num: "03",
    },
    {
      title: "Follows Clicks & Typing",
      desc: "Camera glides with your cursor, holds focus tight on button clicks, and pans smoothly along code or text typing without manual keyframing.",
      icon: MousePointer2,
      num: "04",
    },
    {
      title: "Tactile Audio & Background Music",
      desc: "Subtle bubble bops on button clicks, mechanical keystroke sounds, and custom background music tracks with automatic voice ducking.",
      icon: Volume2,
      num: "05",
    },
    {
      title: "One-Click QuickBar HUD",
      desc: "Floating shortcut toolbar for laptop and phone. Hit Option+Space to record, pause, transcribe, and open the studio with zero clutter.",
      icon: Sliders,
      num: "06",
    },
    {
      title: "Visual Multi-Track Timeline",
      desc: "NLE-grade timeline with dedicated track headers for Keyframes, Zoom, Video, Captions, and Audio. Trim with T, split with S, zero overlap.",
      icon: SlidersHorizontal,
      num: "07",
    },
    {
      title: "100% Private On Your Device",
      desc: "Everything runs locally on your computer. Zero cloud rendering queues, no subscriptions, no accounts, and zero watermarks.",
      icon: Shield,
      num: "08",
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
      className="relative scroll-mt-16 overflow-hidden border-b border-white/[0.08] bg-black py-24"
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

      {/* Non-stop infinite marquee carousel with Edge Mask & 3D Tilt Hover Physics */}
      <div className="relative flex overflow-x-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="animate-marquee flex gap-5 py-4">
          {duplicated.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={`${feat.title}-${idx}`}
                whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.25 } }}
                className="flex w-80 shrink-0 flex-col justify-between rounded-2xl border border-white/[0.08] bg-neutral-950/70 backdrop-blur-xl p-6 transition-colors hover:border-white/20 shadow-xl group cursor-default"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] text-white border border-white/[0.08] group-hover:bg-white/[0.12] transition-colors">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-neutral-400">
                      /{feat.num}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold uppercase text-white tracking-tight">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center justify-between font-mono text-[11px] text-neutral-300">
                  <span>Instant & Private</span>
                  <Check className="size-3.5 text-white" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
