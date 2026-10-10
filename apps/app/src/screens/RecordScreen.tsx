import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AppWindow,
  ArrowLeft,
  Cable,
  CheckCircle2,
  HelpCircle,
  Mic,
  MicOff,
  Monitor,
  Pause,
  Play,
  QrCode,
  Smartphone,
  Video,
  Volume2,
  VolumeX,
  Wifi,
} from "lucide-react";
import { formatDuration } from "@domolens/core";
import { copy } from "../copy/en";
import { Button } from "../components/ui/Button";
import { useNav } from "../store/nav";
import {
  useRecorder,
  type RecordingSource,
  type RecordingMode,
  type DeviceTarget,
  type MobileConnectionType,
} from "../store/recorder";
import { MobileSetupGuideModal } from "../components/recording/MobileSetupGuideModal";
import { MobileLiveMonitor } from "../components/recording/MobileLiveMonitor";
import { mobileStreamBridge } from "../lib/mobile-stream-bridge";

export function RecordScreen() {
  const { back } = useNav();
  const {
    state,
    countdown,
    source,
    deviceTarget,
    mobileConnectionType,
    mobileDeviceInfo,
    lastMobileTap,
    recordingMode,
    micEnabled,
    systemAudioEnabled,
    elapsedMs,
    clicks,
    setSource,
    setDeviceTarget,
    setMobileConnectionType,
    connectMobileDevice,
    simulateMobileTap,
    setRecordingMode,
    toggleMic,
    toggleSystemAudio,
    startCountdown,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
    isProcessing,
  } = useRecorder();

  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [guideInitialTab, setGuideInitialTab] = useState<"android-wifi" | "android-usb" | "ios-wifi" | "ios-usb">("ios-wifi");

  const pairingInfo = useMemo(
    () => mobileStreamBridge.generatePairingInfo(mobileConnectionType),
    [mobileConnectionType],
  );

  const deviceTargets: Array<{ id: DeviceTarget; label: string; desc: string; icon: typeof Monitor }> = [
    {
      id: "computer",
      label: "Computer (Desktop / Laptop)",
      desc: "Record entire desktop monitor or specific application window.",
      icon: Monitor,
    },
    {
      id: "mobile",
      label: "Mobile Phone (Android / iOS)",
      desc: "Record smartphone with dynamic screen size, live mirror, and tap tracking.",
      icon: Smartphone,
    },
  ];

  const mobileConnectionModes: Array<{ id: MobileConnectionType; label: string; desc: string; icon: typeof Wifi }> = [
    {
      id: "wifi",
      label: "Wi-Fi Wireless (WebRTC)",
      desc: "Scan QR code with phone camera to connect wirelessly (< 30ms latency).",
      icon: Wifi,
    },
    {
      id: "usb",
      label: "USB Cable (Direct Link)",
      desc: "Ultra-low latency (< 15ms) via USB-C or Lightning cable.",
      icon: Cable,
    },
  ];

  const sources: Array<{ id: RecordingSource; label: string; desc: string; icon: typeof Monitor }> = [
    {
      id: "screen",
      label: copy.record.sourceScreen,
      desc: copy.record.sourceScreenDesc,
      icon: Monitor,
    },
    {
      id: "window",
      label: copy.record.sourceWindow,
      desc: copy.record.sourceWindowDesc,
      icon: AppWindow,
    },
  ];

  const modes: Array<{ id: RecordingMode; label: string; desc: string; badge?: string; featured?: boolean }> = [
    {
      id: "auto-zoom-sfx-transcribe",
      label: "Auto-Zoom + SFX + Transcribe",
      desc: "Complete studio suite: automatic click/tap zoom tracking, satisfying SFX, and live speech-to-text subtitles synced to your microphone.",
      badge: "All-in-One",
      featured: true,
    },
    {
      id: "auto-zoom-sfx",
      label: "Auto-Zoom + SFX",
      desc: "Automatically zooms into your clicks and taps and adds satisfying sound effects. Best for product demos.",
      badge: "Popular",
    },
    {
      id: "sfx-transcribe",
      label: "SFX + Transcribe",
      desc: "Adds SFX and live speech-to-text subtitles synced to your video via your microphone.",
      badge: "AI",
    },
    {
      id: "auto-zoom",
      label: "Auto-Zoom Only",
      desc: "Smart zoom-tracking on every click and tap without sound effects. Clean and minimal.",
    },
    {
      id: "regular",
      label: "Regular Recording",
      desc: "Plain screen capture — no auto-zoom or sound effects. Full screen output only.",
    },
  ];

  const openSetupGuideFor = (tab: "android-wifi" | "android-usb" | "ios-wifi" | "ios-usb") => {
    setGuideInitialTab(tab);
    setIsGuideOpen(true);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 pb-safe px-safe">
      {/* 0. Screen Share Requesting Prompt (Computer Only) */}
      <AnimatePresence mode="wait">
        {state === "requesting_share" && (
          <motion.div
            key="requesting_share"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex w-full max-w-md flex-col items-center rounded-3xl border border-ink-700 bg-ink-800/90 p-8 text-center shadow-lift backdrop-blur-md"
          >
            <div className="flex size-16 items-center justify-center rounded-2xl bg-white text-black mb-4 animate-pulse">
              <Monitor className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Select Screen or Window</h2>
            <p className="mt-2 text-xs text-fg-muted leading-relaxed">
              Please choose which entire screen or application window to share. The recording and video will not begin until your screen is shared.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={cancelRecording}
              className="mt-6"
            >
              Cancel
            </Button>
          </motion.div>
        )}

        {/* 1. Countdown Mode */}
        {state === "countdown" && (
          <motion.div
            key="countdown"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="flex flex-col items-center text-center"
          >
            <div className="flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-ink-600 bg-ink-900/80 text-xs text-white">
              <span className="size-2 rounded-full bg-white animate-pulse" />
              <span>
                {deviceTarget === "mobile"
                  ? `${mobileDeviceInfo?.name || "Mobile Phone"} Stream Linked & Ready`
                  : "Screen Shared & Ready"}
              </span>
            </div>

            <motion.div
              key={countdown}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 450, damping: 25 }}
              className="flex size-36 items-center justify-center rounded-full border-4 border-white bg-ink-800 text-6xl font-extrabold text-white shadow-lift"
            >
              {countdown}
            </motion.div>
            <p className="mt-6 text-lg font-medium text-fg-muted">{copy.record.countdownReady}</p>
          </motion.div>
        )}

        {/* 2. Active Recording Mode with Floating QuickBar */}
        {(state === "recording" || state === "paused") && (
          <div className="flex flex-col items-center w-full">
            <motion.div
              key="recording"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              data-recorder-ui="true"
              className="flex w-full max-w-lg flex-col items-center rounded-3xl border border-ink-700 bg-ink-800/90 p-8 text-center shadow-lift backdrop-blur-md mb-24"
            >
              {/* Status Header */}
              <div className="flex items-center gap-2 rounded-full border border-ink-600 bg-ink-900/80 px-4 py-1.5 text-xs font-semibold">
                <span
                  className={`size-2.5 rounded-full ${
                    state === "recording" ? "bg-white animate-pulse" : "bg-neutral-400"
                  }`}
                />
                <span className="text-fg">
                  {state === "recording" ? copy.record.recordingIndicator : copy.record.pausedIndicator}
                </span>
                {deviceTarget === "mobile" && (
                  <span className="ml-1 rounded bg-white text-black px-1.5 py-0.2 text-[10px] font-bold">
                    MOBILE
                  </span>
                )}
              </div>

              {/* Time Display */}
              <div className="mt-6 text-5xl font-mono font-bold tracking-tight text-fg tabular">
                {formatDuration(elapsedMs)}
              </div>

              <p className="mt-2 text-sm text-fg-muted font-mono">
                {clicks.length === 1 ? "1 action / tap logged" : `${clicks.length} actions / taps logged`}
              </p>

              {/* Live Mobile Mirror Monitor on Computer Screen */}
              {deviceTarget === "mobile" && (
                <div className="mt-6 mb-4 flex justify-center w-full">
                  <MobileLiveMonitor
                    deviceInfo={mobileDeviceInfo}
                    lastTap={lastMobileTap}
                    isRecording={state === "recording"}
                    onSimulateTap={simulateMobileTap}
                  />
                </div>
              )}

              {/* Live Tip */}
              <div className="mt-4 rounded-xl border border-ink-700 bg-ink-900/60 p-3 text-xs leading-relaxed text-fg-faint">
                {deviceTarget === "mobile"
                  ? "Every tap on your phone or on the preview monitor is recorded with microsecond timestamps for automatic camera zoom."
                  : copy.record.clickHint}
              </div>

              {/* Action Bar */}
              <div data-recorder-ui="true" className="mt-8 flex w-full flex-wrap items-center justify-center gap-3">
                {state === "recording" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Pause className="size-4" />}
                    onClick={pauseRecording}
                  >
                    {copy.record.pauseBtn}
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Play className="size-4" />}
                    onClick={resumeRecording}
                  >
                    {copy.record.resumeBtn}
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  disabled={isProcessing}
                  icon={<CheckCircle2 className="size-4 text-ink-950" />}
                  onClick={() => void stopRecording()}
                >
                  {isProcessing ? "Preparing..." : copy.record.finishBtn}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isProcessing}
                  onClick={cancelRecording}
                >
                  {copy.record.discardBtn}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. Idle / Configuration Mode */}
        {state === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex w-full flex-col"
          >
            <div className="mb-8 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowLeft className="size-4" />}
                onClick={back}
              >
                {copy.record.back}
              </Button>
              <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
                {copy.record.title}
              </h1>
              <div className="w-16" />
            </div>

            {/* 1. Recording Mode Selector */}
            <div className="mb-6">
              <label className="mb-3 block text-sm font-semibold text-fg">Recording Mode</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {modes.map((m) => {
                  const selected = recordingMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRecordingMode(m.id)}
                      className={`relative flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                        m.featured ? "sm:col-span-2" : ""
                      } ${
                        selected
                          ? "border-white bg-white/10 shadow-sm"
                          : "border-ink-700 bg-ink-800 hover:border-ink-600 hover:bg-ink-700/60"
                      }`}
                    >
                      {m.badge && (
                        <span className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                          m.badge === "All-in-One"
                            ? "bg-white/20 text-white border border-white/30"
                            : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                        }`}>
                          {m.badge}
                        </span>
                      )}
                      <span className="text-base font-semibold text-fg">{m.label}</span>
                      <span className="mt-1 text-xs text-fg-muted leading-relaxed">{m.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Target Device Selector (Computer vs Mobile Phone) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-fg">Recording Target</label>
                <span className="text-[11px] font-mono text-fg-muted">Select where to record</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {deviceTargets.map((d) => {
                  const Icon = d.icon;
                  const selected = deviceTarget === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDeviceTarget(d.id)}
                      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-white bg-white/10 shadow-sm"
                          : "border-ink-700 bg-ink-800 hover:border-ink-600 hover:bg-ink-700/60"
                      }`}
                    >
                      <div
                        className={`mb-3 flex size-10 items-center justify-center rounded-xl ${
                          selected ? "bg-white text-black" : "bg-ink-700 text-fg-muted"
                        }`}
                      >
                        <Icon className="size-5" />
                      </div>
                      <span className="text-base font-semibold text-fg">{d.label}</span>
                      <span className="mt-1 text-xs text-fg-muted leading-relaxed">{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3A. Computer Source Selection Cards (when Computer is selected) */}
            {deviceTarget === "computer" && (
              <div className="mb-6">
                <label className="mb-3 block text-sm font-semibold text-fg">
                  {copy.record.sourceTitle}
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {sources.map((s) => {
                    const Icon = s.icon;
                    const selected = source === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSource(s.id)}
                        className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                          selected
                            ? "border-white bg-white/10 shadow-sm"
                            : "border-ink-700 bg-ink-800 hover:border-ink-600 hover:bg-ink-700/60"
                        }`}
                      >
                        <div
                          className={`mb-3 flex size-10 items-center justify-center rounded-xl ${
                            selected ? "bg-white text-black" : "bg-ink-700 text-fg-muted"
                          }`}
                        >
                          <Icon className="size-5" />
                        </div>
                        <span className="text-base font-semibold text-fg">{s.label}</span>
                        <span className="mt-1 text-xs text-fg-muted leading-relaxed">{s.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3B. Mobile Connection & Live Mirror Hub (when Mobile Phone is selected) */}
            {deviceTarget === "mobile" && (
              <div className="mb-6 space-y-4 rounded-3xl border border-neutral-700 bg-ink-800/80 p-5 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink-700 pb-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="size-5 text-white" />
                    <div>
                      <h3 className="text-sm font-bold text-white">Mobile Device Link Hub</h3>
                      <p className="text-[11px] text-fg-muted">
                        Connect Android or iOS via Wi-Fi or USB cable
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openSetupGuideFor(mobileConnectionType === "wifi" ? "ios-wifi" : "ios-usb")}
                      className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-3 py-1 text-xs font-semibold text-white transition-colors"
                    >
                      <HelpCircle className="size-3.5" />
                      <span>Setup Guide</span>
                    </button>
                  </div>
                </div>

                {/* Connection Mode (Wi-Fi vs USB) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {mobileConnectionModes.map((cm) => {
                    const Icon = cm.icon;
                    const selected = mobileConnectionType === cm.id;
                    return (
                      <button
                        key={cm.id}
                        type="button"
                        onClick={() => setMobileConnectionType(cm.id)}
                        className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                          selected
                            ? "border-white bg-white/10 shadow-sm"
                            : "border-ink-700 bg-ink-900/60 hover:border-ink-600 hover:bg-ink-700/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`p-1.5 rounded-lg ${selected ? "bg-white text-black" : "bg-ink-800 text-fg-muted"}`}>
                            <Icon className="size-4" />
                          </div>
                          <span className="text-xs font-bold text-white">{cm.label}</span>
                        </div>
                        <span className="text-[11px] text-fg-muted leading-tight">{cm.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Live Device Status & Preview Hub */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center rounded-2xl border border-neutral-700/80 bg-ink-950/70 p-4">
                  {/* Left Column: Device Info & Quick Connectors */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-white animate-pulse" />
                      <span className="text-xs font-semibold text-white">
                        {mobileDeviceInfo ? `Connected: ${mobileDeviceInfo.name}` : "Ready to Pair"}
                      </span>
                    </div>

                    <div className="rounded-xl border border-neutral-800 bg-ink-900 p-3 space-y-1.5 text-xs font-mono">
                      <div className="flex justify-between text-neutral-400">
                        <span>Resolution:</span>
                        <span className="text-white font-bold">
                          {mobileDeviceInfo ? `${mobileDeviceInfo.width} × ${mobileDeviceInfo.height}` : "1179 × 2556"}
                        </span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Aspect Ratio:</span>
                        <span className="text-white">
                          {mobileDeviceInfo?.aspectRatio || "19.5:9 (Portrait)"}
                        </span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Transport Link:</span>
                        <span className="text-white uppercase">{mobileConnectionType} Direct</span>
                      </div>
                      <div className="flex justify-between text-neutral-400">
                        <span>Latency & FPS:</span>
                        <span className="text-white">
                          {mobileDeviceInfo?.latencyMs || 22}ms • 60 FPS
                        </span>
                      </div>
                    </div>

                    {/* Quick Preset Device Switcher */}
                    <div>
                      <span className="block text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1.5">
                        Test Device Presets
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => void connectMobileDevice(mobileConnectionType, "iphone")}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-[11px] font-medium text-white transition-colors"
                        >
                          iPhone 15 Pro
                        </button>
                        <button
                          type="button"
                          onClick={() => void connectMobileDevice(mobileConnectionType, "android")}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-[11px] font-medium text-white transition-colors"
                        >
                          Galaxy S24 (Android)
                        </button>
                        <button
                          type="button"
                          onClick={() => void connectMobileDevice(mobileConnectionType, "ipad")}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-[11px] font-medium text-white transition-colors"
                        >
                          iPad Pro (Tablet)
                        </button>
                      </div>
                    </div>

                    {/* QR Code pairing URL / Host Info */}
                    {mobileConnectionType === "wifi" && (
                      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-2.5 text-[10px] font-mono text-neutral-400">
                        <div className="flex items-center gap-1.5 text-white font-semibold mb-1">
                          <QrCode className="size-3.5" />
                          <span>Wi-Fi Pairing Address:</span>
                        </div>
                        <div className="truncate text-neutral-300">{pairingInfo.pairingUrl}</div>
                        <div className="mt-1 text-fg-faint">Scan with iPhone or Android camera on same Wi-Fi.</div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Live Mobile Screen Mirror Monitor */}
                  <div className="flex flex-col items-center justify-center p-2 border border-neutral-800 rounded-2xl bg-black/40">
                    <MobileLiveMonitor
                      deviceInfo={mobileDeviceInfo}
                      lastTap={lastMobileTap}
                      isRecording={false}
                      onSimulateTap={simulateMobileTap}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. Audio Options */}
            <div className="mb-8 rounded-2xl border border-ink-700 bg-ink-800 p-4">
              <span className="mb-3 block text-sm font-semibold text-fg">
                {copy.record.audioTitle}
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`flex flex-1 items-center justify-between rounded-xl border p-3.5 transition-all ${
                    micEnabled
                      ? "border-white bg-ink-700/80 text-fg"
                      : "border-ink-700 bg-ink-900/60 text-fg-faint"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {micEnabled ? (
                      <Mic className="size-5 text-white" />
                    ) : (
                      <MicOff className="size-5 text-fg-faint" />
                    )}
                    <span className="text-sm font-medium">{copy.record.micLabel}</span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {micEnabled ? "On" : "Off"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={toggleSystemAudio}
                  className={`flex flex-1 items-center justify-between rounded-xl border p-3.5 transition-all ${
                    systemAudioEnabled
                      ? "border-white bg-ink-700/80 text-fg"
                      : "border-ink-700 bg-ink-900/60 text-fg-faint"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {systemAudioEnabled ? (
                      <Volume2 className="size-5 text-white" />
                    ) : (
                      <VolumeX className="size-5 text-fg-faint" />
                    )}
                    <span className="text-sm font-medium">
                      {deviceTarget === "mobile" ? "Mobile Sound" : copy.record.systemAudioLabel}
                    </span>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">
                    {systemAudioEnabled ? "On" : "Off"}
                  </span>
                </button>
              </div>
            </div>

            {/* 5. Start Button */}
            <div className="flex flex-col items-center gap-4">
              <Button
                variant="primary"
                size="xl"
                icon={
                  deviceTarget === "mobile" ? (
                    <Smartphone className="size-6 text-ink-950" />
                  ) : (
                    <Video className="size-6 text-ink-950" />
                  )
                }
                onClick={startCountdown}
                className="w-full sm:w-auto sm:px-16"
              >
                {deviceTarget === "mobile" ? "Start mobile recording" : copy.record.startBtn}
              </Button>

              {/* Hardware Permission Criteria Note */}
              <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                <span>
                  {deviceTarget === "mobile"
                    ? "Mobile hardware ready: Low-latency WebRTC 60 FPS, Apple AVFoundation USB, Android ADB direct"
                    : "Hardware capture ready: macOS ScreenCaptureKit, Windows Graphics Capture, Linux PipeWire"}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Device Setup Guide Modal */}
      <MobileSetupGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        initialTab={guideInitialTab}
      />
    </div>
  );
}
