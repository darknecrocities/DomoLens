import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
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
  RefreshCw,
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
    adbDevices,
    adbScanStatus,
    recordingMode,
    micEnabled,
    systemAudioEnabled,
    elapsedMs,
    clicks,
    setSource,
    setDeviceTarget,
    setMobileConnectionType,
    scanAdbDevices,
    restartAdbServer,
    connectWirelessAdb,
    selectAdbDevice,
    connectMobileDevice,
    disconnectMobileDevice,
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
  const [guideInitialTab, setGuideInitialTab] = useState<"android-usb" | "android-wifi" | "ios-usb">("android-usb");
  const [wirelessAddress, setWirelessAddress] = useState("");
  const [wirelessPairCode, setWirelessPairCode] = useState("");
  const [isConnectingWireless, setIsConnectingWireless] = useState(false);

  const detectedWirelessDevice = adbDevices.find((d) => d.is_wireless && d.state === "device");
  const detectedUsbDevice = adbDevices.find((d) => !d.is_wireless && d.state === "device");

  // Automatically scan for connected devices when mobile target is selected
  useEffect(() => {
    if (deviceTarget === "mobile") {
      void scanAdbDevices();
    }
  }, [deviceTarget, scanAdbDevices]);

  // Pre-fill wireless address if an active Wi-Fi device is detected and field is empty
  useEffect(() => {
    if (detectedWirelessDevice && !wirelessAddress && detectedWirelessDevice.serial.includes(":")) {
      setWirelessAddress(detectedWirelessDevice.serial);
    }
  }, [detectedWirelessDevice, wirelessAddress]);

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

  const mobileConnectionModes: Array<{ id: MobileConnectionType; label: string; desc: string; icon: typeof Cable }> = [
    {
      id: "usb",
      label: "USB Debugging (Direct Cable)",
      desc: "Ultra-fast direct connection via USB-C or Lightning cable with native ADB.",
      icon: Cable,
    },
    {
      id: "wifi",
      label: "Wireless Debugging (Wi-Fi ADB)",
      desc: "Zero-wire Android 11+ pairing & ADB over local Wi-Fi port.",
      icon: Wifi,
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

  const openSetupGuideFor = (tab: "android-usb" | "android-wifi" | "ios-usb") => {
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
                        Connect ANY physical Android or iOS device via USB Cable or Wireless ADB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openSetupGuideFor(mobileConnectionType === "usb" ? "android-usb" : "android-wifi")}
                      className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-3 py-1 text-xs font-semibold text-white transition-colors"
                    >
                      <HelpCircle className="size-3.5" />
                      <span>Setup Guide</span>
                    </button>
                  </div>
                </div>

                {/* Connection Channel Selector (USB Debugging vs Wireless Debugging) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {mobileConnectionModes.map((cm) => {
                    const Icon = cm.icon;
                    const selected = mobileConnectionType === cm.id;
                    return (
                      <button
                        key={cm.id}
                        type="button"
                        onClick={() => setMobileConnectionType(cm.id)}
                        className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all ${
                          selected
                            ? "border-white bg-white/10 shadow-sm"
                            : "border-ink-700 bg-ink-900/60 hover:border-ink-600 hover:bg-ink-700/40"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`p-1.5 rounded-lg ${selected ? "bg-white text-black" : "bg-ink-800 text-fg-muted"}`}>
                            <Icon className="size-3.5" />
                          </div>
                          <span className="text-xs font-bold text-white leading-tight">{cm.label}</span>
                        </div>
                        <span className="text-[10px] text-fg-muted leading-tight">{cm.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Main Hub: Hardware Link Controls & Live Mirror Monitor */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start rounded-2xl border border-neutral-700/80 bg-ink-950/70 p-4">
                  {/* Left Column: USB or Wireless Debugging Controls */}
                  <div className="flex flex-col space-y-3 w-full">
                    {mobileConnectionType === "usb" ? (
                      /* USB Debugging Panel */
                      <div className="flex flex-col p-4 rounded-2xl bg-black border border-neutral-800 space-y-3 w-full">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                          <div className="flex items-center gap-2 text-white font-bold text-sm">
                            <Cable className="size-4" />
                            <span>USB Debugging Link</span>
                          </div>
                          <button
                            type="button"
                            disabled={adbScanStatus === "scanning"}
                            onClick={() => void scanAdbDevices()}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className={`size-3 ${adbScanStatus === "scanning" ? "animate-spin" : ""}`} />
                            <span>{adbScanStatus === "scanning" ? "Scanning..." : "Scan Devices"}</span>
                          </button>
                        </div>

                        {/* Detected Wi-Fi Phone Banner (when phone is on Wi-Fi instead of USB cable) */}
                        {detectedWirelessDevice && (!mobileDeviceInfo || mobileDeviceInfo.connectionType !== "usb") && (
                          <div className="rounded-xl border border-neutral-700 bg-neutral-900/90 p-3 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Wifi className="size-3.5 text-white" />
                                <span className="font-bold text-white text-xs">
                                  Wi-Fi Device Available: {detectedWirelessDevice.model || detectedWirelessDevice.serial}
                                </span>
                              </div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white text-black">
                                Ready
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-300 leading-relaxed">
                              Your phone is already connected to this laptop over Wireless ADB. You can mirror it right now without needing a USB cable.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setMobileConnectionType("wifi");
                                selectAdbDevice(detectedWirelessDevice.serial);
                              }}
                              className="w-full py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm"
                            >
                              Switch to Wireless Mode ({detectedWirelessDevice.model || "Connected Phone"})
                            </button>
                          </div>
                        )}

                        {/* Status / Device Detection View */}
                        {adbScanStatus === "unauthorized" ? (
                          <div className="rounded-xl border border-neutral-700 bg-neutral-900 p-3 text-xs space-y-2">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="size-4 text-white shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <span className="font-bold text-white">Action Required on Your Phone</span>
                                <p className="text-[11px] text-neutral-300 leading-relaxed">
                                  Your phone was detected, but USB debugging is <strong>unauthorized</strong>. Unlock your phone screen now, check <em>"Always allow from this computer"</em>, and tap <strong>Allow</strong>.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void scanAdbDevices()}
                              className="w-full py-1.5 rounded-lg border border-neutral-700 bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors"
                            >
                              I Allowed It • Check Authorization
                            </button>
                          </div>
                        ) : mobileDeviceInfo && mobileDeviceInfo.connectionType === "usb" ? (
                          <div className="rounded-xl border border-neutral-700 bg-neutral-900/90 p-3 text-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 truncate">
                                <span className="size-2 rounded-full bg-white animate-pulse" />
                                <span className="font-bold text-white truncate text-sm">
                                  {mobileDeviceInfo.name}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white text-black">
                                USB • Connected
                              </span>
                            </div>

                            {adbDevices.length > 1 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-[11px] font-mono border-t border-neutral-800">
                                <span className="text-neutral-500 text-[10px] shrink-0">SWITCH:</span>
                                {adbDevices.map((d) => (
                                  <button
                                    key={d.serial}
                                    type="button"
                                    onClick={() => selectAdbDevice(d.serial)}
                                    className={`px-2 py-0.5 rounded border text-[10px] transition-colors shrink-0 ${
                                      mobileDeviceInfo?.id === d.serial
                                        ? "border-white bg-white text-black font-bold"
                                        : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-500"
                                    }`}
                                  >
                                    {d.model || d.serial}
                                  </button>
                                ))}
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-neutral-300 pt-1 border-t border-neutral-800">
                              <div>
                                <span className="text-neutral-500 block text-[10px]">DEVICE ID</span>
                                <span className="truncate block font-semibold text-white">{mobileDeviceInfo.id}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">RESOLUTION</span>
                                <span className="font-semibold text-white">{mobileDeviceInfo.width} × {mobileDeviceInfo.height}</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">REFRESH RATE</span>
                                <span className="font-semibold text-white">{mobileDeviceInfo.fps} FPS</span>
                              </div>
                              <div>
                                <span className="text-neutral-500 block text-[10px]">EST. LATENCY</span>
                                <span className="font-semibold text-white">&lt; {mobileDeviceInfo.latencyMs} ms</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-neutral-800">
                              <button
                                type="button"
                                onClick={() => void scanAdbDevices()}
                                className="flex-1 py-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors"
                              >
                                Re-scan
                              </button>
                              <button
                                type="button"
                                onClick={disconnectMobileDevice}
                                className="py-1 px-3 rounded-lg border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white font-medium text-xs transition-colors"
                              >
                                Disconnect
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* No USB Device Detected Checklist */
                          <div className="space-y-3">
                            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-2">
                              <div className="text-[11px] font-semibold text-white flex items-center justify-between">
                                <span>No phone detected on USB cable</span>
                                <span className="text-[10px] text-neutral-400 font-mono">Checklist</span>
                              </div>
                              <div className="space-y-1.5 text-[11px] text-neutral-300">
                                <div className="flex items-start gap-2">
                                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-white text-black text-[9px] font-bold">1</span>
                                  <span>Unlock phone and connect USB cable to this laptop.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-white text-black text-[9px] font-bold">2</span>
                                  <span>Ensure <strong>USB Debugging</strong> is toggled ON (Developer Options).</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-white text-black text-[9px] font-bold">3</span>
                                  <span>Swipe down notification bar &rarr; change USB mode to <strong>"File Transfer / MTP"</strong>.</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-white text-black text-[9px] font-bold">4</span>
                                  <span>Look for <strong>"Allow USB debugging?"</strong> prompt on phone & tap <strong>Allow</strong>.</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => void scanAdbDevices()}
                              className="w-full py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm"
                            >
                              Scan for Connected Phone
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={adbScanStatus === "scanning"}
                          onClick={() => void restartAdbServer()}
                          className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-[11px] text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`size-3 ${adbScanStatus === "scanning" ? "animate-spin" : ""}`} />
                          <span>Restart ADB Server (Fix Stuck USB / Unresponsive)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openSetupGuideFor("android-usb")}
                          className="text-[11px] text-neutral-400 hover:text-white underline text-left pt-1"
                        >
                          Step-by-step Android & iOS USB setup guide &rarr;
                        </button>
                      </div>
                    ) : (
                      /* Wireless Debugging (Wi-Fi ADB) Panel */
                      <div className="flex flex-col p-4 rounded-2xl bg-black border border-neutral-800 space-y-3 w-full">
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                          <div className="flex items-center gap-2 text-white font-bold text-sm">
                            <Wifi className="size-4" />
                            <span>Wireless Debugging (Wi-Fi ADB)</span>
                          </div>
                          {mobileDeviceInfo && mobileDeviceInfo.connectionType === "wifi" && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white text-black">
                              Connected
                            </span>
                          )}
                        </div>

                        {mobileDeviceInfo && mobileDeviceInfo.connectionType === "wifi" ? (
                          <div className="rounded-xl border border-neutral-700 bg-neutral-900/90 p-3 text-xs space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white text-sm">{mobileDeviceInfo.name}</span>
                              <span className="text-[10px] font-mono text-neutral-400">{mobileDeviceInfo.width} × {mobileDeviceInfo.height}</span>
                            </div>
                            <div className="flex items-center gap-2 pt-1 border-t border-neutral-800">
                              <button
                                type="button"
                                onClick={() => void scanAdbDevices()}
                                className="flex-1 py-1 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white font-medium text-xs transition-colors"
                              >
                                Re-scan
                              </button>
                              <button
                                type="button"
                                onClick={disconnectMobileDevice}
                                className="py-1 px-3 rounded-lg border border-neutral-700 hover:border-neutral-500 text-neutral-400 hover:text-white font-medium text-xs transition-colors"
                              >
                                Disconnect
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* Discovered Wi-Fi Phone 1-Click Card */}
                            {detectedWirelessDevice && (
                              <div className="rounded-xl border border-neutral-700 bg-neutral-900/90 p-3 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-white animate-pulse" />
                                    <span className="font-bold text-white text-sm">
                                      {detectedWirelessDevice.model || detectedWirelessDevice.serial}
                                    </span>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-white text-black">
                                    Wi-Fi Device Ready
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-300 leading-relaxed">
                                  Phone is already connected over Wi-Fi (<span className="font-mono text-white">{detectedWirelessDevice.serial}</span>).
                                </p>
                                <button
                                  type="button"
                                  onClick={() => selectAdbDevice(detectedWirelessDevice.serial)}
                                  className="w-full py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm"
                                >
                                  Link &amp; Mirror Screen ({detectedWirelessDevice.model || "Phone"})
                                </button>
                              </div>
                            )}

                            {/* Detected USB Phone Banner (if phone is plugged into USB while on wireless tab) */}
                            {detectedUsbDevice && (!mobileDeviceInfo || mobileDeviceInfo.connectionType !== "wifi") && (
                              <div className="rounded-xl border border-neutral-700 bg-neutral-900/90 p-3 text-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Cable className="size-3.5 text-white" />
                                    <span className="font-bold text-white text-xs">
                                      USB Device Available: {detectedUsbDevice.model || detectedUsbDevice.serial}
                                    </span>
                                  </div>
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white text-black">
                                    Plugged In
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-300 leading-relaxed">
                                  A phone was detected on your USB cable. You can switch to USB mode for ultra-low latency direct mirror.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMobileConnectionType("usb");
                                    selectAdbDevice(detectedUsbDevice.serial);
                                  }}
                                  className="w-full py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors shadow-sm"
                                >
                                  Switch to USB Mode ({detectedUsbDevice.model || "Connected Phone"})
                                </button>
                              </div>
                            )}

                            <div className="space-y-2">
                              <div>
                                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                                  IP Address &amp; Port (e.g. 192.168.1.50:5555)
                                </label>
                                <input
                                  type="text"
                                  value={wirelessAddress}
                                  onChange={(e) => setWirelessAddress(e.target.value)}
                                  placeholder="192.168.0.x:5555"
                                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-white focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                                  Pairing Code (Optional for Android 11+ Pairing)
                                </label>
                                <input
                                  type="text"
                                  value={wirelessPairCode}
                                  onChange={(e) => setWirelessPairCode(e.target.value)}
                                  placeholder="6-digit pairing code"
                                  className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs font-mono text-white placeholder-neutral-600 focus:border-white focus:outline-none"
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={!wirelessAddress.trim() || isConnectingWireless}
                              onClick={async () => {
                                if (!wirelessAddress.trim()) return;
                                setIsConnectingWireless(true);
                                await connectWirelessAdb(wirelessAddress.trim(), wirelessPairCode.trim());
                                setIsConnectingWireless(false);
                              }}
                              className="w-full py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors disabled:opacity-50 shadow-sm"
                            >
                              {isConnectingWireless ? "Connecting to Phone..." : "Connect Wireless Phone"}
                            </button>

                            <button
                              type="button"
                              disabled={adbScanStatus === "scanning"}
                              onClick={() => void restartAdbServer()}
                              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 hover:bg-neutral-800 text-[11px] text-neutral-400 hover:text-white transition-colors disabled:opacity-50"
                            >
                              <RefreshCw className={`size-3 ${adbScanStatus === "scanning" ? "animate-spin" : ""}`} />
                              <span>Restart ADB Server &amp; Rescan</span>
                            </button>

                            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 space-y-1.5 text-[11px] text-neutral-300">
                              <span className="font-semibold text-white block">How to find Wireless ADB details:</span>
                              <p className="text-neutral-400 leading-relaxed">
                                Go to Phone <strong>Settings → Developer Options → Wireless Debugging</strong>. Toggle it ON. Tap <strong>"Pair device with pairing code"</strong> to see your Wi-Fi IP, port, and code.
                              </p>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => openSetupGuideFor("android-wifi")}
                          className="text-[11px] text-neutral-400 hover:text-white underline text-left pt-1"
                        >
                          Detailed Wireless Debugging guide &rarr;
                        </button>
                      </div>
                    )}

                    {/* Virtual Test Preview Drawer (For testing and offline visual preview) */}
                    <details className="group w-full rounded-2xl border border-neutral-800 bg-neutral-950/60 p-3 text-xs">
                      <summary className="cursor-pointer font-mono text-[11px] text-neutral-400 select-none flex items-center justify-between">
                        <span>Virtual Preview Devices (Testing without physical phone)</span>
                        <span className="text-[10px] text-neutral-500 group-open:rotate-180 transition-transform">▼</span>
                      </summary>
                      <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-neutral-900">
                        <button
                          type="button"
                          onClick={() => void connectMobileDevice(mobileConnectionType, "android")}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-[11px] font-medium text-white transition-colors"
                        >
                          Galaxy S24 (Android)
                        </button>
                        <button
                          type="button"
                          onClick={() => void connectMobileDevice(mobileConnectionType, "iphone")}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-[11px] font-medium text-white transition-colors"
                        >
                          iPhone 15 Pro
                        </button>
                        <button
                          type="button"
                          onClick={() => void connectMobileDevice(mobileConnectionType, "ipad")}
                          className="rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 text-[11px] font-medium text-white transition-colors"
                        >
                          iPad Pro
                        </button>
                      </div>
                    </details>
                  </div>

                  {/* Right Column: Live Mobile Screen Mirror Monitor */}
                  <div className="flex flex-col items-center justify-center p-3 border border-neutral-800 rounded-2xl bg-black/50">
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
