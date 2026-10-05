import { useState, useEffect } from "react";
import {
  Crosshair,
  Laptop,
  Mic,
  MicOff,
  Pause,
  Play,
  Sliders,
  Smartphone,
  Volume2,
  Zap,
} from "lucide-react";

interface FloatingQuickBarProps {
  onOpenEditor?: () => void;
  className?: string;
  defaultMode?: "laptop" | "android";
}

export function FloatingQuickBar({
  onOpenEditor,
  className = "",
  defaultMode = "laptop",
}: FloatingQuickBarProps) {
  const [deviceMode, setDeviceMode] = useState<"laptop" | "android">(defaultMode);
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "paused">("recording");
  const [seconds, setSeconds] = useState(14);
  const [zoomCount, setZoomCount] = useState(6);
  const [isTranscribing, setIsTranscribing] = useState(true);
  const [micActive, setMicActive] = useState(true);

  // Simulated live elapsed timer
  useEffect(() => {
    if (recordingState !== "recording") return;
    const interval = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [recordingState]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleTogglePlay = () => {
    if (recordingState === "recording") {
      setRecordingState("paused");
    } else {
      setRecordingState("recording");
    }
  };

  const handleAddZoom = () => {
    setZoomCount((z) => z + 1);
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${className}`}>
      {/* Quick Action Device Mode Switcher */}
      <div className="mb-3 flex items-center justify-between px-2">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-neutral-300">
          <span className="size-2 rounded-full bg-white animate-pulse" />
          <span className="font-bold text-white tracking-widest flex items-center gap-1">
            <Zap className="size-3 text-white" />
            QUICK ACTION HUD
          </span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-400">Desktop & Mobile</span>
        </div>

        <div className="flex items-center rounded-lg border border-neutral-800 bg-neutral-900 p-0.5">
          <button
            type="button"
            onClick={() => setDeviceMode("laptop")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono uppercase transition-all ${
              deviceMode === "laptop"
                ? "bg-white text-black font-bold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Laptop className="size-3.5" />
            <span>Laptop HUD</span>
          </button>
          <button
            type="button"
            onClick={() => setDeviceMode("android")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-mono uppercase transition-all ${
              deviceMode === "android"
                ? "bg-white text-black font-bold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Smartphone className="size-3.5" />
            <span>Android HUD</span>
          </button>
        </div>
      </div>

      {/* Floating Glassmorphism QuickBar Pill */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-700/80 bg-neutral-900/90 p-3 sm:p-4 backdrop-blur-2xl shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Brand + Status Indicator */}
          <div className="flex items-center gap-3">
            <img
              src="/domolens.png"
              alt="DomoLens"
              className="size-7 object-contain rounded border border-neutral-700"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-tight text-white uppercase">
                  DomoLens
                </span>
                <span
                  className={`rounded px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase tracking-wider ${
                    recordingState === "recording"
                      ? "bg-white text-black"
                      : recordingState === "paused"
                      ? "bg-neutral-700 text-white"
                      : "bg-neutral-800 text-neutral-400"
                  }`}
                >
                  {recordingState === "recording"
                    ? "Recording"
                    : recordingState === "paused"
                    ? "Paused"
                    : "Idle"}
                </span>
              </div>
              <p className="font-mono text-[10px] text-neutral-400">
                {deviceMode === "laptop" ? "macOS / Windows / Linux" : "Android 12+ MediaProjection"}
              </p>
            </div>
          </div>

          {/* Time & Zooms Tracker */}
          <div className="flex items-center gap-4 border-x border-neutral-800 px-4">
            <div className="text-center">
              <span className="font-mono text-lg font-black text-white tabular">
                {formatTime(seconds)}
              </span>
              <span className="block font-mono text-[9px] text-neutral-400 uppercase">
                Duration
              </span>
            </div>

            <button
              type="button"
              onClick={handleAddZoom}
              title="Click to simulate auto-zoom trigger"
              className="group flex flex-col items-center rounded-lg border border-neutral-800 bg-neutral-950/80 px-2.5 py-1 hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center gap-1 font-mono text-xs font-bold text-white">
                <Crosshair className="size-3 text-neutral-300 group-hover:rotate-45 transition-transform" />
                <span>{zoomCount} zooms</span>
              </div>
              <span className="font-mono text-[9px] text-neutral-500 uppercase">
                + Click To Log
              </span>
            </button>
          </div>

          {/* Controls: Play/Pause, Stop, Transcribe, Open Editor */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mic toggle */}
            <button
              type="button"
              onClick={() => setMicActive(!micActive)}
              className={`flex size-8 items-center justify-center rounded-lg border transition-all ${
                micActive
                  ? "border-neutral-600 bg-neutral-800 text-white"
                  : "border-neutral-800 bg-neutral-950 text-neutral-500"
              }`}
              title="Toggle Microphone"
            >
              {micActive ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
            </button>

            {/* Pause / Resume */}
            <button
              type="button"
              onClick={handleTogglePlay}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 font-mono text-xs font-semibold text-white hover:bg-neutral-700 transition-all"
            >
              {recordingState === "recording" ? (
                <>
                  <Pause className="size-3.5 text-neutral-300" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5 text-white" />
                  <span>Resume</span>
                </>
              )}
            </button>

            {/* Transcribe (Whisper AI) Toggle */}
            <button
              type="button"
              onClick={() => setIsTranscribing(!isTranscribing)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition-all ${
                isTranscribing
                  ? "border-white bg-white text-black font-bold shadow-sm"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
              }`}
            >
              <Volume2 className="size-3.5" />
              <span>Transcribe</span>
              {isTranscribing && (
                <span className="size-1.5 rounded-full bg-black animate-ping" />
              )}
            </button>

            {/* Open Editor */}
            <button
              type="button"
              onClick={onOpenEditor}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 font-mono text-xs font-bold text-white hover:border-white hover:bg-neutral-900 transition-all"
            >
              <Sliders className="size-3.5 text-white" />
              <span>Open Editor</span>
            </button>
          </div>
        </div>

        {/* Live Audio Equalizer / Whisper Waveform Simulation */}
        {isTranscribing && (
          <div className="mt-3 flex items-center justify-between border-t border-neutral-800/80 pt-2.5 font-mono text-[10px] text-neutral-400">
            <div className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-white animate-pulse" />
              <span>Whisper AI Speech Engine: Listening & Generating Word-by-Word Timestamps...</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2 w-0.5 bg-neutral-400 animate-pulse" />
              <span className="h-3 w-0.5 bg-white animate-pulse" />
              <span className="h-4 w-0.5 bg-white animate-pulse" />
              <span className="h-2.5 w-0.5 bg-neutral-400 animate-pulse" />
              <span className="h-1.5 w-0.5 bg-neutral-500" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
