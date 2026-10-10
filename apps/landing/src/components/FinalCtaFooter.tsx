import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Apple, Check, Download, Laptop, QrCode, Smartphone, Terminal, ExternalLink } from "lucide-react";

export function FinalCtaFooter() {
  const [activeTab, setActiveTab] = useState<"mac" | "win" | "linux" | "android">("mac");

  return (
    <motion.footer
      id="download"
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative scroll-mt-16 bg-black border-t border-white/[0.08] overflow-hidden"
    >
      <div id="downloads" className="sr-only" />
      {/* Ambient Atmospheric Radial Glow */}
      <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-white/[0.03] blur-[140px] -z-0" />

      {/* Monochrome Ticker Banner with Edge Mask */}
      <div className="overflow-hidden border-b border-white/[0.08] bg-black py-3 text-neutral-300 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
        <div className="animate-marquee flex gap-8 font-mono text-xs font-bold uppercase tracking-widest">
          <span>NO SUBSCRIPTIONS</span>
          <span>•</span>
          <span>NO WATERMARKS</span>
          <span>•</span>
          <span>NO CLOUD UPLOADS</span>
          <span>•</span>
          <span>100% PRIVATE</span>
          <span>•</span>
          <span>MAC • WINDOWS • LINUX • ANDROID</span>
          <span>•</span>
          <span>NO SUBSCRIPTIONS</span>
          <span>•</span>
          <span>NO WATERMARKS</span>
          <span>•</span>
          <span>NO CLOUD UPLOADS</span>
          <span>•</span>
          <span>100% PRIVATE</span>
          <span>•</span>
          <span>MAC • WINDOWS • LINUX • ANDROID</span>
          <span>•</span>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-12 text-center relative z-10">
        <h2 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
          Start Recording Today.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-400">
          Free offline desktop app and mobile companion. No account or credit card required.
        </p>

        {/* Platform Selector Tabs with Spring Layout Pill */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {[
            { id: "mac", label: "macOS", icon: Apple },
            { id: "win", label: "Windows", icon: Laptop },
            { id: "linux", label: "Linux", icon: Terminal },
            { id: "android", label: "Android", icon: Smartphone },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2.5 font-mono text-xs uppercase transition-colors ${
                  isSelected ? "text-black font-bold" : "text-neutral-400 hover:text-white"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="active-platform-pill"
                    className="absolute inset-0 rounded-xl bg-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon className="size-4" />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected OS Details Card with AnimatePresence */}
        <div className="mt-8 rounded-2xl border border-white/[0.08] bg-neutral-950/70 backdrop-blur-xl p-8 text-left shadow-2xl">
          <AnimatePresence mode="wait">
            {activeTab === "mac" && (
              <motion.div
                key="mac"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase text-white tracking-tight">DomoLens for macOS</h3>
                    <p className="text-xs text-neutral-400 mt-1">Universal binary for Apple Silicon (M1/M2/M3/M4) & Intel</p>
                  </div>
                  <div className="font-mono text-xs text-neutral-400">
                    Latest Release
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://github.com/darknecrocities/DomoLens/releases/latest/download/DomoLens-Universal.dmg"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200 transition-colors shadow-lg"
                  >
                    <Download className="size-4" />
                    <span>Download .DMG (Universal)</span>
                  </motion.a>
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://github.com/darknecrocities/DomoLens/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 font-mono text-xs text-neutral-300 hover:text-white hover:bg-white/[0.1] transition-colors"
                  >
                    <span>GitHub Release</span>
                    <ExternalLink className="size-3 text-neutral-400" />
                  </motion.a>
                </div>
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/60 p-3.5 text-xs text-neutral-400">
                  <p className="font-semibold text-neutral-300">macOS Installation Note:</p>
                  <p className="mt-1 leading-relaxed">
                    Open the DMG and drag DomoLens into Applications. If macOS displays an unidentified developer prompt on first launch, right-click (or Control-click) DomoLens in Applications and select <span className="text-neutral-200 font-medium">Open</span>, or run <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-neutral-200 font-mono text-[11px]">xattr -cr /Applications/DomoLens.app</code> in Terminal.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "win" && (
              <motion.div
                key="win"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase text-white tracking-tight">DomoLens for Windows</h3>
                    <p className="text-xs text-neutral-400 mt-1">Windows 11 and Windows 10 (64-bit Architecture)</p>
                  </div>
                  <div className="font-mono text-xs text-neutral-400">
                    Latest Release
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://github.com/darknecrocities/DomoLens/releases/latest/download/DomoLens-Windows-Setup.exe"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200 transition-colors shadow-lg"
                  >
                    <Download className="size-4" />
                    <span>Download Windows Installer (.EXE)</span>
                  </motion.a>
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://github.com/darknecrocities/DomoLens/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 font-mono text-xs text-neutral-300 hover:text-white hover:bg-white/[0.1] transition-colors"
                  >
                    <span>All GitHub Releases</span>
                    <ExternalLink className="size-3 text-neutral-400" />
                  </motion.a>
                </div>
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/60 p-3.5 text-xs text-neutral-400">
                  <p className="font-semibold text-neutral-300">Windows Installation & AI Note:</p>
                  <p className="mt-1 leading-relaxed">
                    If Windows Defender SmartScreen appears ("Windows protected your PC"), click <span className="text-neutral-200 font-medium">"More info"</span> and then <span className="text-neutral-200 font-medium">"Run anyway"</span>. For local Ollama AI assistance, run <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-neutral-200 font-mono text-[11px]">npm run ollama:start:win</code> or install via <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-neutral-200 font-mono text-[11px]">winget install Ollama.Ollama</code>.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === "linux" && (
              <motion.div
                key="linux"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold uppercase text-white tracking-tight">DomoLens for Linux</h3>
                    <p className="text-xs text-neutral-400 mt-1">Ubuntu, Debian, Fedora, Arch (Wayland & PipeWire Support)</p>
                  </div>
                  <div className="font-mono text-xs text-neutral-400">
                    Latest Release
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://github.com/darknecrocities/DomoLens/releases/latest/download/DomoLens-Linux.AppImage"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200 transition-colors shadow-lg"
                  >
                    <Download className="size-4" />
                    <span>Download .AppImage</span>
                  </motion.a>
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://github.com/darknecrocities/DomoLens/releases/latest/download/DomoLens-Linux.deb"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.05] px-5 py-2.5 font-mono text-xs font-bold text-neutral-200 uppercase hover:bg-white/[0.1] hover:text-white transition-colors"
                  >
                    <Download className="size-4" />
                    <span>Download .DEB (Debian/Ubuntu)</span>
                  </motion.a>
                  <motion.a
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    href="https://github.com/darknecrocities/DomoLens/releases/latest"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.05] px-4 py-2 font-mono text-xs text-neutral-400 hover:text-white transition-colors"
                  >
                    <span>All Releases</span>
                    <ExternalLink className="size-3 text-neutral-400" />
                  </motion.a>
                </div>
              </motion.div>
            )}

            {activeTab === "android" && (
              <motion.div
                key="android"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold uppercase text-white tracking-tight">DomoLens Android & Mobile Companion</h3>
                    <p className="text-xs text-neutral-400 mt-1">USB & Wi-Fi Screen Mirroring with Touch Tracking & Floating QuickBar HUD</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Live Available
                    </span>
                    <span className="font-mono text-xs text-neutral-400">
                      v1.0 Companion
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Option 1: Direct USB Mode (Recommended) */}
                  <div className="rounded-xl border border-white/20 bg-white/[0.04] p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold uppercase text-white flex items-center gap-2">
                          <Smartphone className="size-4 text-emerald-400" />
                          USB Plug & Play
                        </span>
                        <span className="font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/20 text-white border border-white/30">
                          Recommended
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
                        Plug your phone directly into your Mac or PC via USB cable. DomoLens detects your phone with buttery 60 FPS, ultra-low latency, and live touch tracking with zero app setup needed on your phone!
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-2 font-mono text-[11px] text-emerald-400">
                      <Check className="size-3.5" />
                      <span>Zero setup • 60 FPS lossless • Auto-detect</span>
                    </div>
                  </div>

                  {/* Option 2: Wi-Fi Wireless Companion APK */}
                  <div className="rounded-xl border border-white/[0.08] bg-black/60 p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold uppercase text-white flex items-center gap-2">
                          <Download className="size-4 text-neutral-300" />
                          Wireless Wi-Fi APK
                        </span>
                        <span className="font-mono text-[9px] uppercase text-neutral-400">
                          Android 12+
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                        Install the lightweight Android companion APK for wireless recording across your local network with a draggable floating HUD shortcut.
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        href="https://github.com/darknecrocities/DomoLens/releases/latest/download/DomoLens-Android-Companion.apk"
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200 transition-colors shadow-lg"
                      >
                        <Download className="size-3.5" />
                        <span>Download APK</span>
                      </motion.a>
                      <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
                        <QrCode className="size-4 text-neutral-300" />
                        <span>Scan QR on device</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/[0.08] py-8 text-center text-xs font-mono text-neutral-500">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/domolens.png" alt="DomoLens" className="size-5 object-contain rounded" />
            <span className="text-white font-bold">DomoLens</span>
            <span>— The camera knows where to look.</span>
          </div>
          <div className="flex items-center gap-3">
            <span>macOS</span>
            <span>•</span>
            <span>Windows</span>
            <span>•</span>
            <span>Linux</span>
            <span>•</span>
            <span>Android</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
