import { motion } from "framer-motion";
import {
  Apple,
  Bot,
  Cpu,
  FileCode2,
  Film,
  Laptop,
  Smartphone,
  Sparkles,
  Terminal,
  Volume2,
  Zap,
} from "lucide-react";

export function WorksEverywhere() {
  const brandBeltItems = [
    { name: "Apple macOS", icon: Apple },
    { name: "Windows 11", icon: Laptop },
    { name: "Linux Wayland", icon: Terminal },
    { name: "Android 12+", icon: Smartphone },
    { name: "Tauri 2 & Rust", icon: Cpu },
    { name: "Python 3.13 GPU", icon: FileCode2 },
    { name: "FFmpeg 7.1", icon: Film },
    { name: "Whisper AI", icon: Volume2 },
    { name: "Google Gemini", icon: Sparkles },
    { name: "Anthropic Claude", icon: Bot },
    { name: "OpenAI GPT-4o", icon: Zap },
  ];
  const duplicatedBelt = [...brandBeltItems, ...brandBeltItems];

  const platforms = [
    {
      name: "macOS",
      desc: "Crystal-clear recording for Mac. Optimized for Apple Silicon (M1–M4) and Intel.",
      icon: Apple,
      badge: "READY",
    },
    {
      name: "Windows",
      desc: "Smooth screen recording for Windows 10 and 11 with instant local saving.",
      icon: Laptop,
      badge: "READY",
    },
    {
      name: "Linux",
      desc: "Full screen capture for modern Linux. Ready as an easy AppImage or package.",
      icon: Terminal,
      badge: "READY",
    },
    {
      name: "Android",
      desc: "Record your phone screen with a handy floating shortcut and touch tracking.",
      icon: Smartphone,
      badge: "READY",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative border-b border-neutral-800 bg-neutral-950 py-24"
    >
      {/* Brand Belt Marquee: Logo and Text Only (No Frames, No Boxes) */}
      <div className="border-y border-neutral-800 bg-black py-4 mb-16 overflow-hidden">
        <div className="animate-marquee flex items-center gap-12 font-mono text-xs font-bold uppercase tracking-wider text-neutral-300">
          {duplicatedBelt.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={`${item.name}-${idx}`}
                className="flex items-center gap-2.5 shrink-0 opacity-80 hover:opacity-100 transition-opacity"
              >
                <Icon className="size-4 text-white" />
                <span className="text-white tracking-widest">{item.name}</span>
                <span className="text-neutral-700 ml-6">•</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-12">
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          // Works On All Your Devices
        </div>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white sm:text-5xl">
          One Project. Every Device.
        </h2>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          Record on your phone, edit on your computer. Your recordings stay completely private and offline.
        </p>

        {/* Platform Cards */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.name}
                className="flex flex-col justify-between rounded-xl border border-neutral-800 bg-neutral-900 p-6 hover:border-neutral-500 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-neutral-800 text-white border border-neutral-700">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-[10px] font-bold text-white border border-neutral-700 px-2 py-0.5 rounded">
                      {p.badge}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold uppercase text-white">{p.name}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400">{p.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Native Software vs Browser Extension Comparison Table */}
        <div className="mt-16">
          <h3 className="text-xl font-bold uppercase text-white mb-6">
            Native Software vs. Web Extensions
          </h3>
          <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900">
            <table className="w-full text-left font-mono text-xs">
              <thead className="border-b border-neutral-800 bg-black text-neutral-400 uppercase">
                <tr>
                  <th className="p-4">Capability</th>
                  <th className="p-4 text-white">DomoLens Native Software</th>
                  <th className="p-4 text-neutral-500">Browser Extension Tools</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300">
                <tr>
                  <td className="p-4 font-bold text-white">System-Wide Screen Capture</td>
                  <td className="p-4 text-white">60 FPS Hardware Acceleration (ScreenCaptureKit, WinGC)</td>
                  <td className="p-4 text-neutral-500">30 FPS Tab Sandbox Lag</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Continuous Mouse Trajectory</td>
                  <td className="p-4 text-white">40ms Sub-Pixel Pointer Interpolation</td>
                  <td className="p-4 text-neutral-500">Blocked by Browser Sandbox</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Floating QuickBar HUD</td>
                  <td className="p-4 text-white">Pinnable Desktop & Android Floating Pill</td>
                  <td className="p-4 text-neutral-500">Confined to Active Browser Tab</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Data Privacy & Security</td>
                  <td className="p-4 text-white">100% Local Drive Only (Zero Cloud Uploads)</td>
                  <td className="p-4 text-neutral-500">Requires Cloud Account & Remote Servers</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Export Quality</td>
                  <td className="p-4 text-white">Lossless 4K / 1080p 60 FPS Local FFmpeg</td>
                  <td className="p-4 text-neutral-500">Compressed WebM with Queue Limits</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
