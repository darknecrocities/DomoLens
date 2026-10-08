import { motion } from "framer-motion";
import {
  AppleLogo,
  WindowsLogo,
  LinuxLogo,
  AndroidLogo,
  TauriLogo,
  RustLogo,
  PythonLogo,
  FFmpegLogo,
  OpenAILogo,
  ClaudeLogo,
  GeminiLogo,
  GitHubLogo,
  ProductHuntLogo,
  YouTubeLogo,
  XLogo,
  ReactLogo,
  TypeScriptLogo,
  WhisperLogo,
} from "./BrandLogos";

export function WorksEverywhere() {
  const brandBeltItems = [
    { name: "Apple macOS", icon: AppleLogo },
    { name: "Windows 11", icon: WindowsLogo },
    { name: "Linux Wayland", icon: LinuxLogo },
    { name: "Android", icon: AndroidLogo },
    { name: "Tauri 2", icon: TauriLogo },
    { name: "Rust", icon: RustLogo },
    { name: "Python", icon: PythonLogo },
    { name: "FFmpeg", icon: FFmpegLogo },
    { name: "OpenAI", icon: OpenAILogo },
    { name: "Anthropic Claude", icon: ClaudeLogo },
    { name: "Google Gemini", icon: GeminiLogo },
    { name: "Whisper AI", icon: WhisperLogo },
    { name: "Product Hunt", icon: ProductHuntLogo },
    { name: "GitHub", icon: GitHubLogo },
    { name: "YouTube", icon: YouTubeLogo },
    { name: "X", icon: XLogo },
    { name: "React", icon: ReactLogo },
    { name: "TypeScript", icon: TypeScriptLogo },
  ];
  const duplicatedBelt = [...brandBeltItems, ...brandBeltItems];

  const platforms = [
    {
      name: "macOS",
      desc: "Crystal-clear recording for Mac. Optimized for Apple Silicon (M1–M4) and Intel.",
      icon: AppleLogo,
      platformId: "01",
    },
    {
      name: "Windows",
      desc: "Smooth screen recording for Windows 10 and 11 with instant local saving.",
      icon: WindowsLogo,
      platformId: "02",
    },
    {
      name: "Linux",
      desc: "Full screen capture for modern Linux. Ready as an easy AppImage or package.",
      icon: LinuxLogo,
      platformId: "03",
    },
    {
      name: "Android",
      desc: "Record your phone screen with a handy floating shortcut and touch tracking.",
      icon: AndroidLogo,
      platformId: "04",
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative border-b border-white/[0.08] bg-black py-24"
    >
      {/* Brand Belt Marquee: Real Brand Logos Only with Subtle Edge Fade */}
      <div className="border-y border-white/[0.08] bg-black py-4 mb-16 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
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

        {/* Platform Cards with Sinusoidal Floating Levitation Motion */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {platforms.map((p, idx) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.name}
                animate={{
                  y: [-4, 4, -4],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 4.5,
                  delay: idx * 0.5,
                  ease: "easeInOut",
                }}
                whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
                className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-neutral-950/70 backdrop-blur-xl p-6 hover:border-white/20 transition-colors shadow-xl group cursor-default"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] text-white border border-white/[0.08] group-hover:bg-white/[0.12] transition-colors">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-xs font-semibold text-neutral-400">
                      /{p.platformId}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold uppercase text-white tracking-tight">{p.name}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-400">{p.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Native Software vs Browser Extension Comparison Table */}
        <div className="mt-16">
          <h3 className="text-xl font-bold uppercase text-white mb-6 tracking-tight">
            Native Software vs. Web Extensions
          </h3>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-neutral-950/70 backdrop-blur-xl shadow-2xl">
            {/* Ambient Laser Beam Scanner across comparison table */}
            <motion.div
              className="pointer-events-none absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent z-10"
              animate={{ y: ["-100%", "500%"] }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            />

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs relative z-20">
                <thead className="border-b border-white/[0.08] bg-black/80 text-neutral-400 uppercase">
                  <tr>
                    <th className="p-4">Capability</th>
                    <th className="p-4 text-white">DomoLens Native Software</th>
                    <th className="p-4 text-neutral-400">Browser Extension Tools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06] text-neutral-300">
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-white">System-Wide Screen Capture</td>
                    <td className="p-4 text-white">60 FPS Hardware Acceleration (ScreenCaptureKit, WinGC)</td>
                    <td className="p-4 text-neutral-400">30 FPS Tab Sandbox Lag</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-white">Continuous Mouse Trajectory</td>
                    <td className="p-4 text-white">40ms Sub-Pixel Pointer Interpolation</td>
                    <td className="p-4 text-neutral-400">Blocked by Browser Sandbox</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-white">Floating QuickBar HUD</td>
                    <td className="p-4 text-white">Pinnable Desktop & Android Floating Pill</td>
                    <td className="p-4 text-neutral-400">Confined to Active Browser Tab</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-white">Data Privacy & Security</td>
                    <td className="p-4 text-white">100% Local Drive Only (Zero Cloud Uploads)</td>
                    <td className="p-4 text-neutral-400">Requires Cloud Account & Remote Servers</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-bold text-white">Export Quality</td>
                    <td className="p-4 text-white">Lossless 4K / 1080p 60 FPS Local FFmpeg</td>
                    <td className="p-4 text-neutral-400">Compressed WebM with Queue Limits</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
