import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cable,
  CheckCircle2,
  Info,
  Smartphone,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import { Button } from "../ui/Button";

interface MobileSetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "android-usb" | "android-wifi" | "ios-usb" | "troubleshooting";
}

type GuideTab = "android-usb" | "android-wifi" | "ios-usb" | "troubleshooting";

export function MobileSetupGuideModal({ isOpen, onClose, initialTab = "android-usb" }: MobileSetupGuideModalProps) {
  const [activeTab, setActiveTab] = useState<GuideTab>(initialTab);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative z-10 flex flex-col w-full max-w-2xl max-h-[85vh] rounded-3xl border border-ink-700 bg-ink-900 text-fg shadow-lift overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ink-800 px-6 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-white text-black">
                <Smartphone className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Mobile Device Setup Guide</h3>
                <p className="text-xs text-fg-muted">Connect Android or iOS via USB Debugging or Wireless Debugging</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-fg-muted hover:bg-ink-800 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-ink-800 px-6 bg-ink-950/60 overflow-x-auto gap-1 py-1.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab("android-usb")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "android-usb"
                  ? "bg-white text-black shadow-sm"
                  : "text-fg-muted hover:text-white hover:bg-ink-800"
              }`}
            >
              <Cable className="size-3.5" />
              <span>Android (USB Debugging)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("android-wifi")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "android-wifi"
                  ? "bg-white text-black shadow-sm"
                  : "text-fg-muted hover:text-white hover:bg-ink-800"
              }`}
            >
              <Wifi className="size-3.5" />
              <span>Android (Wireless ADB)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ios-usb")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "ios-usb"
                  ? "bg-white text-black shadow-sm"
                  : "text-fg-muted hover:text-white hover:bg-ink-800"
              }`}
            >
              <Cable className="size-3.5" />
              <span>iOS (USB Cable)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("troubleshooting")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "troubleshooting"
                  ? "bg-white text-black shadow-sm"
                  : "text-fg-muted hover:text-white hover:bg-ink-800"
              }`}
            >
              <Zap className="size-3.5" />
              <span>Troubleshooting &amp; Tips</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* 1. Android USB Cable */}
            {activeTab === "android-usb" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink-800 bg-ink-800/40 p-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Direct USB Cable Link (Native ADB)</span>
                  <p className="mt-1 text-sm font-medium text-white">
                    Ultra-fast 60 FPS connection with sub-10ms response time via USB-C cable for Samsung, Pixel, OnePlus, Xiaomi, and all Android devices.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">1</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Enable Developer Options</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        On your phone, go to <strong>Settings → About Phone</strong>. Find <strong>"Build Number"</strong> (on Xiaomi: "MIUI/HyperOS version") and tap it <strong>7 times</strong> until you see <em>"You are now a developer!"</em>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">2</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Turn On USB Debugging</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Go to <strong>Settings → Developer Options</strong> (usually inside System or Additional Settings). Scroll down and toggle <strong>USB Debugging</strong> to ON.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">3</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Change USB Mode to File Transfer / MTP</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Plug your phone into your laptop. Pull down the phone's notification shade, tap <strong>"Charging this device via USB"</strong>, and select <strong>"File Transfer"</strong> (or "Transferring files / MTP"). Some phones disable ADB while in "Charge only" mode.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">4</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Accept Computer Authorization Prompt</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Keep your phone screen unlocked. A prompt will appear saying <strong>"Allow USB debugging?"</strong>. Check <em>"Always allow from this computer"</em> and tap <strong>Allow</strong>. Then click <strong>"Scan Devices"</strong> in DomoLens!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Android Wireless ADB */}
            {activeTab === "android-wifi" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink-800 bg-ink-800/40 p-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Wireless Debugging (Wi-Fi ADB)</span>
                  <p className="mt-1 text-sm font-medium text-white">
                    Connect wirelessly with zero cables on any Android 11+ device on the same local Wi-Fi network.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">1</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Connect to Same Wi-Fi</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Ensure both your Android device and this computer are connected to the same Wi-Fi network (or connect your laptop to your phone's Wi-Fi hotspot).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">2</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Turn On Wireless Debugging</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        In phone <strong>Settings → Developer Options</strong>, scroll down to <strong>Wireless Debugging</strong> and toggle it ON.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">3</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Get IP, Port &amp; Pairing Code</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Tap on the text <strong>"Wireless Debugging"</strong>, then tap <strong>"Pair device with pairing code"</strong>. Note the displayed IP address, port, and 6-digit Wi-Fi pairing code.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">4</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Connect in DomoLens</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Enter the IP address:port and 6-digit pairing code into the DomoLens Wireless Debugging panel and click <strong>"Connect Wireless Phone"</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. iOS USB Cable */}
            {activeTab === "ios-usb" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink-800 bg-ink-800/40 p-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Zero-Latency Hardware Feed</span>
                  <p className="mt-1 text-sm font-medium text-white">
                    Direct hardware connection via Lightning or USB-C cable for iPhone and iPad.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">1</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Connect Cable</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Plug your iPhone or iPad directly into your computer using a USB-C or Lightning cable.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">2</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Trust Computer</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Unlock your iPhone. When prompted with <strong>"Trust This Computer?"</strong>, tap <strong>Trust</strong> and enter your passcode.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">3</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Instant Hardware Link Ready</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        DomoLens automatically interfaces with the native Apple AVFoundation capture pipeline for sub-10ms latency.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Troubleshooting & Tips */}
            {activeTab === "troubleshooting" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-4">
                  <Zap className="size-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">USB Cable Checklist</h4>
                    <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                      Many cheap cables are "charge-only" without data lines. Use a high-speed data-capable USB-C cable. If your device isn't detected, try another USB port on your computer.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-4">
                  <CheckCircle2 className="size-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Revoke USB Debugging Authorizations</h4>
                    <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                      If your phone status is stuck on "unauthorized", go to <strong>Settings → Developer Options → Revoke USB debugging authorizations</strong>. Unplug the cable, plug it back in, and tap "Always allow".
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-4">
                  <Info className="size-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Dynamic Screen Aspect Ratio Recognition</h4>
                    <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                      DomoLens automatically detects your physical phone screen resolution (e.g. 1080×2400 on Galaxy S24, 1179×2556 on iPhone 15 Pro) and adjusts canvas size and auto-zoom keyframes dynamically.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="flex items-center justify-between border-t border-ink-800 px-6 py-4 bg-ink-950/80">
            <div className="flex items-center gap-1.5 text-xs text-fg-muted">
              <span className="size-2 rounded-full bg-white animate-pulse" />
              <span>DomoLens Mobile Bridge v2.0 Ready</span>
            </div>
            <Button variant="primary" size="sm" onClick={onClose}>
              Got It
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
