import { useState } from "react";
import { motion } from "framer-motion";
import { Apple, Download, Laptop, QrCode, Smartphone, Terminal } from "lucide-react";

export function FinalCtaFooter() {
  const [activeTab, setActiveTab] = useState<"mac" | "win" | "linux" | "android">("mac");

  return (
    <motion.footer
      id="download"
      initial={{ opacity: 0, y: 50, clipPath: "inset(8% 0% 0% 0%)" }}
      whileInView={{ opacity: 1, y: 0, clipPath: "inset(0% 0% 0% 0%)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative bg-black border-t border-neutral-800"
    >
      {/* Monochrome Ticker Banner */}
      <div className="overflow-hidden border-b border-neutral-800 bg-neutral-950 py-3 text-neutral-300">
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

      {/* Direct Downloads Section */}
      <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-12 text-center">
        <div className="font-mono text-xs uppercase tracking-widest text-neutral-400">
          // Section 5: Direct Multi-Platform Downloads
        </div>
        <h2 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
          Start Recording Today.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-neutral-400">
          Free offline desktop app and mobile companion. No account or credit card required.
        </p>

        {/* Platform Selector Tabs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {[
            { id: "mac", label: "macOS", icon: Apple },
            { id: "win", label: "Windows", icon: Laptop },
            { id: "linux", label: "Linux", icon: Terminal },
            { id: "android", label: "Android", icon: Smartphone },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-xs uppercase transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-black font-bold shadow-sm"
                    : "border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected OS Details Card */}
        <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-8 text-left shadow-2xl">
          {activeTab === "mac" && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold uppercase text-white">DomoLens for macOS</h3>
                  <p className="text-xs text-neutral-400 mt-1">Universal binary for Apple Silicon (M1/M2/M3/M4) & Intel</p>
                </div>
                <span className="font-mono text-xs font-bold text-white border border-neutral-700 px-2.5 py-1 rounded">
                  Stable
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/domolens_smooth_autozoom_demo.mp4"
                  download="DomoLens-Universal.dmg"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                >
                  <Download className="size-4" />
                  <span>Download .DMG (Universal)</span>
                </a>
                <div className="flex items-center rounded-lg border border-neutral-800 bg-black px-4 py-2 font-mono text-xs text-neutral-300">
                  <code>brew install domolens</code>
                </div>
              </div>
            </div>
          )}

          {activeTab === "win" && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold uppercase text-white">DomoLens for Windows</h3>
                  <p className="text-xs text-neutral-400 mt-1">Windows 11 and Windows 10 (64-bit Architecture)</p>
                </div>
                <span className="font-mono text-xs font-bold text-white border border-neutral-700 px-2.5 py-1 rounded">
                  Stable
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/domolens_smooth_autozoom_demo.mp4"
                  download="DomoLens-Setup-x64.exe"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                >
                  <Download className="size-4" />
                  <span>Download .EXE Setup</span>
                </a>
                <div className="flex items-center rounded-lg border border-neutral-800 bg-black px-4 py-2 font-mono text-xs text-neutral-300">
                  <code>winget install domolens</code>
                </div>
              </div>
            </div>
          )}

          {activeTab === "linux" && (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold uppercase text-white">DomoLens for Linux</h3>
                  <p className="text-xs text-neutral-400 mt-1">Ubuntu, Debian, Fedora, Arch (Wayland & PipeWire Support)</p>
                </div>
                <span className="font-mono text-xs font-bold text-white border border-neutral-700 px-2.5 py-1 rounded">
                  Stable
                </span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="/domolens_smooth_autozoom_demo.mp4"
                  download="DomoLens.AppImage"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase hover:bg-neutral-200"
                >
                  <Download className="size-4" />
                  <span>Download .AppImage</span>
                </a>
                <a
                  href="/domolens_smooth_autozoom_demo.mp4"
                  download="domolens_amd64.deb"
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 px-5 py-2.5 font-mono text-xs font-bold text-white uppercase hover:bg-neutral-700"
                >
                  <Download className="size-4" />
                  <span>Download .DEB</span>
                </a>
              </div>
            </div>
          )}

          {activeTab === "android" && (
            <div className="relative min-h-[260px] flex items-center justify-center overflow-hidden rounded-lg">
              {/* Blurred Android Section */}
              <div
                aria-hidden="true"
                className="w-full select-none pointer-events-none filter blur-[6px] opacity-25"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold uppercase text-white">DomoLens Android Companion</h3>
                    <p className="text-xs text-neutral-400 mt-1">MediaProjection Screen Recorder with Floating HUD (Android 12+)</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 font-mono text-xs font-bold text-black uppercase">
                      <Download className="size-4" />
                      <span>Direct .APK Download</span>
                    </div>
                    <p className="mt-3 font-mono text-[11px] text-neutral-400">
                      Direct installation without app store accounts. Includes quickbar overlay.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-black p-3">
                    <div className="flex size-14 items-center justify-center rounded bg-white text-black shrink-0">
                      <QrCode className="size-10" />
                    </div>
                    <div className="font-mono text-[11px] text-neutral-300">
                      <span className="font-bold text-white block">Scan to Install on Mobile</span>
                      <span>Point phone camera to download APK immediately</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overlapped Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-black/40 backdrop-blur-[2px]">
                <span className="font-mono text-xs uppercase tracking-widest text-neutral-400">
                  // Android Companion
                </span>
                <h3 className="mt-2 text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                  Coming Soon
                </h3>
                <p className="mt-2 max-w-md text-xs sm:text-sm text-neutral-300">
                  The Android screen recorder and floating quickbar companion is currently in development.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-neutral-800 py-8 text-center text-xs font-mono text-neutral-500">
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
