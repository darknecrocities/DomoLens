import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Crosshair,
  GripHorizontal,
  Mic,
  MicOff,
  Pause,
  Play,
  X,
} from "lucide-react";
import { formatDuration } from "@domolens/core";
import { platform } from "../../platform";

interface HudState {
  state: "idle" | "recording" | "paused";
  elapsedMs: number;
  clicksCount: number;
  micEnabled: boolean;
}

export function GlobalHudWindow() {
  const [hudState, setHudState] = useState<HudState>({
    state: "recording",
    elapsedMs: 0,
    clicksCount: 0,
    micEnabled: true,
  });

  useEffect(() => {
    document.documentElement.classList.add("hud-window-mode");
    document.body.classList.add("hud-window-mode");
    const off = platform.onHudStateSync?.((sync) => {
      setHudState({
        state: (sync.state as any) || "recording",
        elapsedMs: sync.elapsedMs || 0,
        clicksCount: sync.clicksCount || 0,
        micEnabled: sync.micEnabled !== false,
      });
    });
    return () => {
      document.documentElement.classList.remove("hud-window-mode");
      document.body.classList.remove("hud-window-mode");
      off?.();
    };
  }, []);

  const handleStartDrag = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("button")) return;
    try {
      const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      await getCurrentWebviewWindow().startDragging();
    } catch {
      // web fallback
    }
  };

  const handleTogglePlay = () => {
    const nextAction = hudState.state === "recording" ? "pause" : "resume";
    setHudState((s) => ({
      ...s,
      state: nextAction === "pause" ? "paused" : "recording",
    }));
    void platform.sendHudCommand?.(nextAction);
  };

  const handleAddZoom = () => {
    setHudState((s) => ({ ...s, clicksCount: s.clicksCount + 1 }));
    void platform.sendHudCommand?.("add_zoom");
  };

  const handleToggleMic = () => {
    setHudState((s) => ({ ...s, micEnabled: !s.micEnabled }));
    void platform.sendHudCommand?.("toggle_mic");
  };

  const handleFinish = () => {
    void platform.sendHudCommand?.("finish");
  };

  const handleCancel = () => {
    void platform.sendHudCommand?.("cancel");
  };

  const isRecording = hudState.state === "recording";

  return (
    <div
      onMouseDown={handleStartDrag}
      className="size-full flex items-center justify-center p-1 bg-transparent select-none overflow-hidden cursor-grab active:cursor-grabbing"
    >
      <div
        data-tauri-drag-region
        onMouseDown={handleStartDrag}
        className="flex items-center gap-3 rounded-full border border-white/20 bg-neutral-950/45 backdrop-blur-2xl px-3.5 py-2 shadow-[0_20px_50px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.25)] ring-1 ring-black/50"
      >
        {/* Drag Handle */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          className="flex items-center text-neutral-400 hover:text-white transition-colors pl-1 cursor-grab active:cursor-grabbing"
          title="Drag quickbar"
        >
          <GripHorizontal className="size-4 pointer-events-none" />
        </div>

        {/* Status & Timer */}
        <div
          data-tauri-drag-region
          onMouseDown={handleStartDrag}
          className="flex items-center gap-2 pr-2.5 border-r border-white/10"
        >
          <span
            className={`size-2.5 rounded-full transition-all ${
              isRecording
                ? "bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.9)]"
                : "bg-neutral-500"
            }`}
          />
          <span className="font-mono text-sm font-bold text-white tabular tracking-wide pointer-events-none">
            {formatDuration(hudState.elapsedMs)}
          </span>
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-neutral-200 font-semibold pointer-events-none">
            {isRecording ? "REC" : "PAUSED"}
          </span>
        </div>

        {/* Log Zoom */}
        <button
          type="button"
          onClick={handleAddZoom}
          title="Click to log camera zoom at center"
          className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 px-2.5 py-1 text-xs font-mono font-medium text-neutral-200 hover:text-white transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <Crosshair className="size-3 text-neutral-300" />
          <span>{hudState.clicksCount} zooms</span>
        </button>

        {/* Mic toggle */}
        <button
          type="button"
          onClick={handleToggleMic}
          title={hudState.micEnabled ? "Microphone active" : "Microphone muted"}
          className={`flex size-7 items-center justify-center rounded-full border transition-all active:scale-95 cursor-pointer backdrop-blur-md ${
            hudState.micEnabled
              ? "border-white/20 bg-white/10 text-white hover:bg-white/20"
              : "border-white/5 bg-black/40 text-neutral-500 hover:text-neutral-300"
          }`}
        >
          {hudState.micEnabled ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
        </button>

        {/* Pause / Resume */}
        <button
          type="button"
          onClick={handleTogglePlay}
          title={isRecording ? "Pause recording" : "Resume recording"}
          className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 hover:bg-white/20 px-3 py-1 font-mono text-xs font-semibold text-white transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          {isRecording ? (
            <>
              <Pause className="size-3 text-neutral-200" />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play className="size-3 text-white" />
              <span>Resume</span>
            </>
          )}
        </button>

        {/* Finish & Edit */}
        <button
          type="button"
          onClick={handleFinish}
          title="Finish recording and open in studio editor"
          className="flex items-center gap-1.5 rounded-full border border-white bg-white px-3.5 py-1 font-mono text-xs font-bold text-black hover:bg-neutral-200 transition-all shadow-md active:scale-95 cursor-pointer"
        >
          <CheckCircle2 className="size-3.5 text-black" />
          <span>Finish & Edit</span>
        </button>

        {/* Discard */}
        <button
          type="button"
          onClick={handleCancel}
          title="Discard recording"
          className="flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/15 text-neutral-400 hover:text-white transition-all active:scale-95 cursor-pointer backdrop-blur-md"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
