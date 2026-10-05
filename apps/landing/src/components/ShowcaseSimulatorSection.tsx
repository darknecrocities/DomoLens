import { useState } from "react";
import { motion } from "framer-motion";
import { Rocket, Sparkles } from "lucide-react";

export function ShowcaseSimulatorSection() {
  const [showcaseMode, setShowcaseMode] = useState<"saas" | "code" | "mobile" | "changelog">("saas");

  const showcasePresets = {
    saas: {
      name: "SaaS Web Application",
      tag: "16:9 Landscape • 1.85x Zoom",
      aspect: "16:9",
      scale: "1.85x",
      sound: "Bubble Bop (0.75x Vol)",
      backdrop: "Frosted Glass Blur",
      desc: "Draws immediate viewer focus to primary call-to-actions, pricing tables, and interactive dashboards. Zooms in tight on button clicks, then automatically pulls back 20% to reveal context.",
      tip: "Ideal for Product Hunt launches, landing page hero videos, and marketing demos.",
    },
    code: {
      name: "Developer CLI & Code Walkthrough",
      tag: "16:9 Monospace • 2.0x Focus",
      aspect: "16:9",
      scale: "2.0x",
      sound: "Mechanical Keyboard SFX",
      backdrop: "Deep OLED Black",
      desc: "Pans smoothly along terminal command execution and code lines as you type. Automatically glides with cursor trajectory so viewers can read exact syntax without eye strain.",
      tip: "Perfect for open source release videos, API documentation, and technical Twitter/X threads.",
    },
    mobile: {
      name: "Mobile App Workflow",
      tag: "9:16 Vertical • Touch Focus",
      aspect: "9:16",
      scale: "1.65x",
      sound: "Modern Click",
      backdrop: "Adaptive Ambient Glow",
      desc: "Frames mobile screen recordings in a sleek device bezel with tactile touch ripple rings. Glides with thumb gestures and swipe navigation for social feeds.",
      tip: "Optimized for Instagram Reels, TikTok, YouTube Shorts, and App Store previews.",
    },
    changelog: {
      name: "Weekly Feature Drop & Changelog",
      tag: "16:9 Fast-Paced • 1.5x Glide",
      aspect: "16:9",
      scale: "1.5x",
      sound: "Subtle Pop",
      backdrop: "Subtle Studio Padding",
      desc: "Fast, punchy 60-second product changelog. Automatically pauses on new UI features, adds clean lower-third chapter labels, and eases out smoothly.",
      tip: "Great for Friday shipping updates, investor emails, and customer onboarding tutorials.",
    },
  };

  const current = showcasePresets[showcaseMode];

  return (
    <motion.section
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative border-b border-neutral-800 bg-black px-4 py-24 sm:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          // Instant Presets
        </div>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          Pick How You Want To Show It.
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400 leading-relaxed">
          Different products require different camera work. Select any mode below to see how DomoLens automatically customizes zoom scale, audio design, and aspect framing.
        </p>

        {/* Preset Buttons */}
        <div className="mt-8 flex flex-wrap gap-2.5">
          {[
            { id: "saas", label: "SaaS Web App" },
            { id: "code", label: "Developer CLI & Code" },
            { id: "mobile", label: "Mobile App Workflow" },
            { id: "changelog", label: "Weekly Changelog" },
          ].map((p) => {
            const isSelected = showcaseMode === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setShowcaseMode(p.id as typeof showcaseMode)}
                className={`rounded-xl px-4 py-2.5 font-mono text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
                  isSelected
                    ? "bg-white text-black font-bold shadow-lg scale-105"
                    : "border border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:border-neutral-600 hover:text-white"
                }`}
              >
                <Sparkles className={`size-3.5 ${isSelected ? "text-black" : "text-neutral-500"}`} />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Mode Stage */}
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-6 sm:p-8 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Specs & Description */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <div className="inline-block font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-400 border border-neutral-700 px-2.5 py-1 rounded-md mb-2">
                  {current.tag}
                </div>
                <h3 className="text-2xl font-bold uppercase text-white tracking-tight">
                  {current.name}
                </h3>
                <p className="mt-3 text-xs leading-relaxed text-neutral-300">
                  {current.desc}
                </p>
              </div>

              {/* Technical Parameter Pills */}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-neutral-800">
                <div className="rounded-lg border border-neutral-800 bg-black/50 p-3">
                  <span className="block font-mono text-[10px] text-neutral-500 uppercase">Camera Zoom</span>
                  <span className="block font-mono text-sm font-bold text-white mt-0.5">{current.scale}</span>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-black/50 p-3">
                  <span className="block font-mono text-[10px] text-neutral-500 uppercase">Aspect Ratio</span>
                  <span className="block font-mono text-sm font-bold text-white mt-0.5">{current.aspect}</span>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-black/50 p-3">
                  <span className="block font-mono text-[10px] text-neutral-500 uppercase">Audio Design</span>
                  <span className="block font-mono text-xs font-semibold text-neutral-200 mt-0.5 truncate">{current.sound}</span>
                </div>
                <div className="rounded-lg border border-neutral-800 bg-black/50 p-3">
                  <span className="block font-mono text-[10px] text-neutral-500 uppercase">Backdrop Style</span>
                  <span className="block font-mono text-xs font-semibold text-neutral-200 mt-0.5 truncate">{current.backdrop}</span>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3.5 text-xs text-neutral-400 font-mono flex items-start gap-2.5">
                <Rocket className="size-4 text-white shrink-0 mt-0.5" />
                <span>{current.tip}</span>
              </div>
            </div>

            {/* Right Live Simulation Window Preview */}
            <div className="lg:col-span-7">
              <div className="relative aspect-video w-full rounded-xl border border-neutral-700 bg-black overflow-hidden shadow-2xl flex flex-col justify-between p-4 sm:p-6">
                {/* Inner Titlebar */}
                <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="size-2.5 rounded-full bg-neutral-700" />
                    <span className="ml-2 font-mono text-xs text-neutral-400">{current.name}</span>
                  </div>
                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 font-mono text-[10px] text-neutral-300">
                    {current.aspect}
                  </span>
                </div>

                {/* Mockup Canvas Visual */}
                <div className="my-auto flex flex-col items-center justify-center text-center py-6">
                  <div className="size-14 rounded-2xl border border-neutral-700 bg-neutral-800/90 flex items-center justify-center shadow-lg animate-pulse">
                    <Sparkles className="size-6 text-white" />
                  </div>
                  <h4 className="mt-4 text-lg font-bold uppercase text-white tracking-tight">
                    {current.name} Mode Active
                  </h4>
                  <span className="mt-1 font-mono text-xs text-neutral-400">
                    Automatically glides and focuses with {current.scale} zoom
                  </span>
                </div>

                {/* Bottom Status Bar */}
                <div className="flex items-center justify-between border-t border-neutral-800/80 pt-3 font-mono text-[10px] text-neutral-400">
                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-white animate-ping" />
                    <span>Auto-Tracking Active</span>
                  </div>
                  <span>Sound: {current.sound}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
