import React, { useRef, useState, useCallback } from "react";
import {
  RotateCcw,
  Sparkles,
  Layers,
  Compass,
  Eye,
  Activity,
  Maximize2,
} from "lucide-react";
import type { TiltMotionMode } from "@domolens/core";
import { useEditor } from "../../store/editor";

interface TiltPreset {
  id: string;
  label: string;
  pitch: number; // rotateX
  yaw: number;   // rotateY
  roll: number;  // rotateZ
  desc: string;
}

const TILT_PRESETS: TiltPreset[] = [
  { id: "flat", label: "Flat Front", pitch: 0, yaw: 0, roll: 0, desc: "0° standard presentation" },
  { id: "iso-left", label: "Iso Left", pitch: 10, yaw: -14, roll: 0, desc: "OpenScreen / Hero left" },
  { id: "iso-right", label: "Iso Right", pitch: 10, yaw: 14, roll: 0, desc: "OpenScreen / Hero right" },
  { id: "showcase", label: "Showcase", pitch: 8, yaw: -10, roll: 2, desc: "Angle dynamic hero" },
  { id: "hero", label: "Floating Hero", pitch: 12, yaw: -18, roll: -3, desc: "High dramatic impact" },
  { id: "top-down", label: "Top-Down", pitch: 16, yaw: 0, roll: 0, desc: "Desk view overhead" },
];

const MOTION_MODES: Array<{ id: TiltMotionMode; label: string; desc: string; icon: React.ReactNode }> = [
  { id: "none", label: "Static", desc: "Fixed 3D orientation", icon: <Compass className="size-3.5" /> },
  { id: "hover", label: "Float", desc: "Harmonic organic breathing", icon: <Sparkles className="size-3.5" /> },
  { id: "reactive", label: "Reactive", desc: "Leans into clicks & typing", icon: <Activity className="size-3.5" /> },
  { id: "sweep", label: "Sweep", desc: "Cinematic intro reveal", icon: <Maximize2 className="size-3.5" /> },
];

export function TiltController() {
  const project = useEditor((s) => s.project);
  const updateLooks = useEditor((s) => s.updateLooks);
  const plotRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const looks = project?.looks;
  const currentPitch = looks?.tiltX ?? looks?.tiltAngle ?? 0;
  const currentYaw = looks?.tiltY ?? (looks?.tiltAngle ? -(looks.tiltAngle * 0.45) : 0);
  const currentRoll = looks?.tiltZ ?? 0;
  const currentAnimation = looks?.tiltAnimation ?? "none";
  const currentIntensity = looks?.tiltAnimationIntensity ?? 0.6;
  const currentGlare = looks?.tiltGlare ?? true;

  // Maximum rotation degrees for the 2D plot box
  const MAX_PITCH = 30;
  const MAX_YAW = 30;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateFromPointer(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const updateFromPointer = useCallback((clientX: number, clientY: number) => {
    const box = plotRef.current;
    if (!box) return;

    const rect = box.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Normalized offset from center (-1 to 1)
    const normX = Math.max(-1, Math.min(1, (clientX - centerX) / (rect.width / 2)));
    const normY = Math.max(-1, Math.min(1, (clientY - centerY) / (rect.height / 2)));

    // X maps to Yaw (tiltY), Y maps to Pitch (tiltX)
    const yaw = parseFloat((normX * MAX_YAW).toFixed(1));
    const pitch = parseFloat((normY * MAX_PITCH).toFixed(1));

    updateLooks({
      tiltX: pitch,
      tiltY: yaw,
      tiltAngle: pitch, // sync legacy angle
    });
  }, [updateLooks]);

  const handleReset = () => {
    updateLooks({
      tiltX: 0,
      tiltY: 0,
      tiltZ: 0,
      tiltAngle: 0,
      tiltPerspective: 1200,
    });
  };

  const applyPreset = (p: TiltPreset) => {
    updateLooks({
      tiltX: p.pitch,
      tiltY: p.yaw,
      tiltZ: p.roll,
      tiltAngle: p.pitch,
    });
  };

  // Calculate puck pixel position percentage within plot box (0% to 100%)
  const puckLeftPercent = Math.max(0, Math.min(100, (currentYaw / MAX_YAW) * 50 + 50));
  const puckTopPercent = Math.max(0, Math.min(100, (currentPitch / MAX_PITCH) * 50 + 50));

  const hasNonZeroTilt = currentPitch !== 0 || currentYaw !== 0 || currentRoll !== 0;

  return (
    <div className="space-y-3 select-none">
      {/* Title & Reset Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Layers className="size-3.5 text-neutral-300" />
          <span className="text-xs font-semibold text-white">3D Frame Tilt & Motion</span>
        </div>
        {hasNonZeroTilt && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-[10px] rounded-md bg-ink-800 px-1.5 py-0.5 text-neutral-400 hover:text-white hover:bg-ink-700 transition-colors"
            title="Reset tilt angles to 0°"
          >
            <RotateCcw className="size-2.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Interactive 2D Plot Box Controller */}
      <div
        ref={plotRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleReset}
        className={`relative w-full aspect-[4/3] rounded-xl border bg-ink-950 overflow-hidden cursor-crosshair transition-all touch-none ${
          isDragging
            ? "border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.08)]"
            : "border-ink-800 hover:border-ink-700"
        }`}
        title="Click and drag to tilt the video frame in 3D. Double-click to reset."
      >
        {/* Subtle coordinate grid lines */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

        {/* Origin crosshairs */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2 pointer-events-none" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/10 -translate-y-1/2 pointer-events-none" />

        {/* 10° and 20° reference angle rings */}
        <div className="absolute inset-1/4 rounded-lg border border-dashed border-white/5 pointer-events-none" />
        <div className="absolute inset-1/8 rounded-lg border border-dashed border-white/5 pointer-events-none" />

        {/* Mini 3D Perspective Wireframe Preview in Corner */}
        <div
          className="absolute top-2 right-2 pointer-events-none z-10 size-10 rounded border border-white/15 bg-white/5 flex items-center justify-center backdrop-blur-xs"
          style={{ perspective: "150px" }}
        >
          <div
            className="size-6 rounded-xs border-2 border-white/60 bg-white/10 transition-transform duration-75 shadow-sm"
            style={{
              transform: `rotateX(${currentPitch}deg) rotateY(${currentYaw}deg) rotateZ(${currentRoll}deg)`,
              transformStyle: "preserve-3d",
            }}
          />
        </div>

        {/* Axis labels */}
        <span className="absolute top-1.5 left-2 text-[9px] font-mono text-fg-faint pointer-events-none">
          +Pitch (Up)
        </span>
        <span className="absolute bottom-1.5 left-2 text-[9px] font-mono text-fg-faint pointer-events-none">
          -Pitch (Down)
        </span>
        <span className="absolute bottom-1.5 right-2 text-[9px] font-mono text-fg-faint pointer-events-none">
          +Yaw (Right)
        </span>

        {/* Draggable Gimbal Puck */}
        <div
          className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 z-20"
          style={{
            left: `${puckLeftPercent}%`,
            top: `${puckTopPercent}%`,
          }}
        >
          {/* Outer glow ring */}
          <div className="relative size-6 rounded-full border border-neutral-400 bg-white/95 shadow-lift flex items-center justify-center">
            {/* Center target dot */}
            <div className="size-1.5 rounded-full bg-neutral-900" />
          </div>

          {/* Floating live coordinate readout tooltip */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink-900/90 px-1.5 py-0.5 text-[9px] font-mono text-neutral-200 border border-white/10 shadow-sm pointer-events-none">
            {currentPitch.toFixed(0)}°, {currentYaw.toFixed(0)}°
          </div>
        </div>
      </div>

      {/* Numeric Sliders for Precision Fine-Tuning */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-fg-muted">Pitch (X)</span>
          <span className="font-mono text-white text-[11px] font-semibold">{currentPitch.toFixed(1)}°</span>
        </div>
        <input
          type="range"
          min="-30"
          max="30"
          step="0.5"
          value={currentPitch}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            updateLooks({ tiltX: val, tiltAngle: val });
          }}
          className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
        />

        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-fg-muted">Yaw (Y)</span>
          <span className="font-mono text-white text-[11px] font-semibold">{currentYaw.toFixed(1)}°</span>
        </div>
        <input
          type="range"
          min="-30"
          max="30"
          step="0.5"
          value={currentYaw}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            updateLooks({ tiltY: val });
          }}
          className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
        />

        <div className="flex items-center justify-between text-[11px] pt-1">
          <span className="text-fg-muted">Roll (Z)</span>
          <span className="font-mono text-white text-[11px] font-semibold">{currentRoll.toFixed(1)}°</span>
        </div>
        <input
          type="range"
          min="-20"
          max="20"
          step="0.5"
          value={currentRoll}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            updateLooks({ tiltZ: val });
          }}
          className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
        />
      </div>

      {/* Preset Pills */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold text-fg-muted">Perspective Presets</label>
        <div className="grid grid-cols-3 gap-1.5">
          {TILT_PRESETS.map((p) => {
            const isMatch =
              Math.abs(currentPitch - p.pitch) < 1 &&
              Math.abs(currentYaw - p.yaw) < 1 &&
              Math.abs(currentRoll - p.roll) < 1;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                className={`rounded-lg border px-2 py-1 text-left transition-all ${
                  isMatch
                    ? "border-white bg-white/15 text-white font-bold"
                    : "border-ink-800 bg-ink-900/60 text-fg-muted hover:border-ink-700 hover:text-white"
                }`}
                title={p.desc}
              >
                <div className="text-[10px] font-medium truncate">{p.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Kinetic Motion Animation Engine */}
      <div className="pt-2 border-t border-ink-800/80 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Activity className="size-3 text-neutral-300" />
            <span className="text-[11px] font-semibold text-white">Motion Animation</span>
          </div>
          <span className="text-[10px] text-fg-faint">
            {currentAnimation === "none" ? "Static" : `${currentAnimation.toUpperCase()} active`}
          </span>
        </div>

        {/* Mode Selector Segmented Grid */}
        <div className="grid grid-cols-4 gap-1">
          {MOTION_MODES.map((m) => {
            const isSelected = currentAnimation === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => updateLooks({ tiltAnimation: m.id })}
                className={`flex flex-col items-center justify-center rounded-lg border py-1.5 px-1 text-center transition-all ${
                  isSelected
                    ? "border-white bg-white/20 text-white font-semibold"
                    : "border-ink-800 bg-ink-900/50 text-neutral-400 hover:border-ink-700 hover:text-white"
                }`}
                title={m.desc}
              >
                {m.icon}
                <span className="mt-1 text-[9px]">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Motion Intensity Slider (if animation active) */}
        {currentAnimation !== "none" && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-fg-muted">Motion Intensity</span>
              <span className="font-mono text-neutral-200">{Math.round(currentIntensity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={currentIntensity}
              onChange={(e) => updateLooks({ tiltAnimationIntensity: parseFloat(e.target.value) })}
              className="w-full accent-white cursor-pointer h-1.5 bg-ink-800 rounded-lg"
            />
          </div>
        )}

        {/* Specular Glass Sheen / Glare Toggle */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            <Eye className="size-3 text-fg-muted" />
            <span className="text-[11px] text-fg-muted">Glass Specular Glare</span>
          </div>
          <button
            type="button"
            onClick={() => updateLooks({ tiltGlare: !currentGlare })}
            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              currentGlare ? "bg-white" : "bg-ink-800"
            }`}
          >
            <span
              className={`pointer-events-none inline-block size-3 rounded-full ${
                currentGlare ? "bg-black" : "bg-white"
              } shadow-lg transform ring-0 transition duration-200 ease-in-out ${
                currentGlare ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
