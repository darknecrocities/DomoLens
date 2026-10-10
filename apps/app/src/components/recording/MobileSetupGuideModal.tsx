import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cable,
  CheckCircle2,
  Globe,
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
  initialTab?: "cellular-hotspot" | "android-wifi" | "android-usb" | "ios-wifi" | "ios-usb";
}

type GuideTab = "cellular-hotspot" | "android-wifi" | "android-usb" | "ios-wifi" | "ios-usb" | "troubleshooting";

export function MobileSetupGuideModal({ isOpen, onClose, initialTab = "android-wifi" }: MobileSetupGuideModalProps) {
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
                <p className="text-xs text-fg-muted">Connect Android or iOS via Wi-Fi, Mobile Data, or USB cable</p>
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

          {/* Navigation Tabs (Android First) */}
          <div className="flex border-b border-ink-800 px-6 bg-ink-950/60 overflow-x-auto gap-1 py-1.5 scrollbar-none">
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
              <span>Android (Wi-Fi)</span>
            </button>
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
              <span>Android (USB Cable)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("cellular-hotspot")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "cellular-hotspot"
                  ? "bg-white text-black shadow-sm"
                  : "text-fg-muted hover:text-white hover:bg-ink-800"
              }`}
            >
              <Globe className="size-3.5" />
              <span>Cellular / Hotspot</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ios-wifi")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === "ios-wifi"
                  ? "bg-white text-black shadow-sm"
                  : "text-fg-muted hover:text-white hover:bg-ink-800"
              }`}
            >
              <Wifi className="size-3.5" />
              <span>iOS (Wi-Fi)</span>
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
              <span>Low Latency Tips</span>
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* 0. Mobile Data & Cellular Hotspot */}
            {activeTab === "cellular-hotspot" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink-800 bg-ink-800/40 p-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Cellular 4G/5G &amp; Personal Hotspot</span>
                  <p className="mt-1 text-sm font-medium text-white">
                    Connect your iPhone or Android phone when running on mobile carrier cellular data or away from home Wi-Fi.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">1</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Method A: Direct Cloud WebRTC (Mobile Data 4G/5G)</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        On the DomoLens recording screen, select <strong>"Mobile Data (4G/5G Cellular)"</strong>. Point your phone camera at the QR code. Open the link in Safari or Chrome, and tap <strong>"Share Screen"</strong>. Your stream will flow across cellular WAN to your laptop.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">2</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Method B: Phone Personal Hotspot (Recommended)</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        On your phone, enable <strong>Personal Hotspot</strong> (iPhone: Settings → Personal Hotspot → Allow Others to Join; Android: Settings → Hotspot &amp; Tethering). Connect your laptop to your phone's hotspot Wi-Fi. Scan the <strong>"Wi-Fi / Personal Hotspot"</strong> QR code. This gives you direct &lt; 15ms latency without consuming cellular video data!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 1. iOS Wi-Fi */}
            {activeTab === "ios-wifi" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink-800 bg-ink-800/40 p-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Prerequisites</span>
                  <p className="mt-1 text-sm font-medium text-white">
                    iPhone or iPad on iOS 15+ connected to the same Wi-Fi network as this computer (5 GHz Wi-Fi recommended).
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">1</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Scan the On-Screen QR Code</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Open the native <strong>Camera app</strong> on your iPhone and point it at the QR code shown on the DomoLens recording screen. Tap the yellow banner that appears to open Safari.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">2</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Tap "Start Screen Broadcast"</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        On the DomoLens Mobile Companion page in Safari, tap the large <strong>"Start Screen Broadcast"</strong> button.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">3</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Confirm iOS System Broadcast</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        In the iOS system dialog, verify <strong>"DomoLens Broadcast"</strong> is highlighted and tap <strong>"Start Broadcast"</strong>. After the 3-second countdown, switch to any app you wish to demo!
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">4</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Automatic Live Mirror & Taps</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Your phone screen will now appear live in DomoLens at 60 FPS. Every tap is logged with millisecond accuracy for smart auto-zoom.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. iOS USB Cable */}
            {activeTab === "ios-usb" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink-800 bg-ink-800/40 p-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Zero-Latency Hardware Feed</span>
                  <p className="mt-1 text-sm font-medium text-white">
                    Direct hardware connection via Lightning or USB-C cable. No Wi-Fi required. Latency is under 15ms at native 60 FPS.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">1</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Connect Cable</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Plug your iPhone or iPad directly into your computer using a genuine Apple or high-speed USB-C / Lightning cable.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">2</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Trust Computer</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Unlock your iPhone. If you see the prompt <strong>"Trust This Computer?"</strong>, tap <strong>Trust</strong> and enter your device passcode.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">3</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Instant Hardware Link Ready</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        DomoLens automatically interfaces with the native Apple AVFoundation capture pipeline. The status badge will turn to <strong>Ready • Connected</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Android Wi-Fi */}
            {activeTab === "android-wifi" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink-800 bg-ink-800/40 p-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Wireless Screen Casting</span>
                  <p className="mt-1 text-sm font-medium text-white">
                    Works on Samsung, Google Pixel, OnePlus, Xiaomi, and all modern Android devices running Android 10+.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">1</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Connect to Same Wi-Fi</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Verify your Android device is on the same local Wi-Fi network or mobile hotspot as your computer.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">2</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Scan QR Code with Camera</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Open your Android camera or Google Lens to scan the QR code on screen. Tap to open the URL in Chrome. <em>(Note: If opened from Facebook Messenger, tap the 3 dots [⋮] in the top right and choose <strong>"Open in Chrome"</strong>).</em>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">3</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Grant Screen Cast Permission</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Tap <strong>"Share Screen"</strong>. On the Android permission pop-up, choose <strong>"Entire screen"</strong> and tap <strong>"Start now"</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Android USB Cable */}
            {activeTab === "android-usb" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-ink-800 bg-ink-800/40 p-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">Direct USB Debugging Link</span>
                  <p className="mt-1 text-sm font-medium text-white">
                    Ultra-fast 60 FPS connection with sub-10ms response time via USB cable.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">1</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Enable Developer Options</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        On your phone, go to <strong>Settings → About Phone</strong>. Find <strong>"Build Number"</strong> and tap it <strong>7 times</strong> until you see "You are now a developer!".
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">2</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Turn On USB Debugging</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Go back to <strong>Settings → System → Developer Options</strong> (or search "Developer Options" in Settings). Scroll down and toggle <strong>USB Debugging</strong> to ON.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-3.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-black text-xs font-bold">3</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Plug In & Allow Prompt</h4>
                      <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                        Connect your phone via USB-C. Unlock your screen. When the pop-up asks <strong>"Allow USB debugging?"</strong>, check <em>"Always allow from this computer"</em> and tap <strong>Allow</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Low Latency & Troubleshooting Tips */}
            {activeTab === "troubleshooting" && (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-4">
                  <Zap className="size-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Use 5 GHz Wi-Fi or USB Cable</h4>
                    <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                      2.4 GHz Wi-Fi networks suffer from interference and high packet jitter. Switching to 5 GHz or using a USB-C cable reduces latency from 120ms down to 15-25ms.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-4">
                  <CheckCircle2 className="size-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Turn Off Low Power Mode</h4>
                    <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                      Low Power Mode on both iOS and Android throttles background hardware video encoders to 30 FPS. Disable Low Power Mode for silky smooth 60 FPS screen capture.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl border border-ink-800 bg-ink-950/40 p-4">
                  <Info className="size-5 text-white shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Automatic Screen Aspect Ratio Recognition</h4>
                    <p className="mt-1 text-xs text-fg-muted leading-relaxed">
                      DomoLens automatically detects your mobile screen resolution (e.g. 1179x2556 on iPhone 15 Pro, 1080x2400 on Galaxy S24) and adapts the video editor canvas without black letterboxing.
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
