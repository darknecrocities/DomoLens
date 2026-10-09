import {
  calculateActiveEffectsState,
  calculateCameraAtTime,
  evaluateTextOverlayMotion,
  getCursorPreset,
  smoothCursorTrajectory,
  CLICK_SOUND_PROFILES,
  TEXT_CARD_STYLE_DEFINITIONS,
  TYPING_SOUND_PROFILES,
  type ClickSoundPreset,
  type CursorAvatar,
  type CursorStyle,
  type ProjectData,
  type TextCardStyle,
  type TextOverlay,
  type TypingSoundPreset,
} from "@domolens/core";
import { platform } from "../platform";

export type ExportResolution = "1080p" | "720p" | "4k" | "gif";
export type ExportFormat = "mov" | "mp4" | "webm" | "gif";

export interface RenderOptions {
  project: ProjectData;
  resolution: ExportResolution;
  format?: ExportFormat;
  onProgress?: (percent: number, statusText: string) => void;
  signal?: AbortSignal;
}

export interface RenderResult {
  blob: Blob;
  data: Uint8Array;
  mimeType: string;
  filename: string;
  downloadUrl: string;
}

/**
 * Calculates output canvas width and height from resolution profile and aspect ratio.
 */
export function getOutputDimensions(
  resolution: ExportResolution,
  aspectRatio = "16:9",
): { width: number; height: number } {
  let baseWidth = 1920;
  let baseHeight = 1080;

  if (resolution === "720p") {
    baseWidth = 1280;
    baseHeight = 720;
  } else if (resolution === "4k") {
    baseWidth = 3840;
    baseHeight = 2160;
  } else if (resolution === "gif") {
    baseWidth = 960;
    baseHeight = 540;
  }

  if (aspectRatio === "9:16") {
    return { width: baseHeight, height: baseWidth };
  }
  if (aspectRatio === "1:1") {
    return { width: baseHeight, height: baseHeight };
  }
  if (aspectRatio === "4:3") {
    return { width: Math.round((baseHeight * 4) / 3), height: baseHeight };
  }

  return { width: baseWidth, height: baseHeight };
}

/**
 * Splits CSS gradient string into top-level arguments without breaking nested parentheses (e.g. rgba(r,g,b,a)).
 */
export function extractGradientArgs(bgValue: string): string[] {
  const startIdx = bgValue.indexOf("(");
  const endIdx = bgValue.lastIndexOf(")");
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return [];
  const inner = bgValue.slice(startIdx + 1, endIdx);

  const args: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < inner.length; i++) {
    const char = inner[i];
    if (char === "(") depth++;
    else if (char === ")") depth--;

    if (char === "," && depth === 0) {
      args.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    args.push(current.trim());
  }
  return args;
}

interface ParsedColorStop {
  color: string;
  offset: number | null;
}

/**
 * Parses and normalizes color stops, linearly distributing any stops with missing offsets.
 */
export function parseColorStops(stopStrings: string[]): Array<{ color: string; offset: number }> {
  const parsed: ParsedColorStop[] = stopStrings.map((str) => {
    const trimmed = str.trim();
    const stopMatch = trimmed.match(/^(.*?)(?:\s+([\d.]+)%?)?$/);
    if (stopMatch && stopMatch[1] && stopMatch[2] !== undefined) {
      const color = stopMatch[1].trim();
      const num = parseFloat(stopMatch[2]);
      const offset = trimmed.includes("%") ? num / 100 : num <= 1 ? num : num / 100;
      return { color, offset };
    }
    return { color: trimmed, offset: null };
  });

  if (parsed.length === 0) return [];
  if (parsed.length === 1) return [{ color: parsed[0]!.color, offset: 0 }];

  if (parsed[0]!.offset === null) parsed[0]!.offset = 0;
  if (parsed[parsed.length - 1]!.offset === null) parsed[parsed.length - 1]!.offset = 1;

  let lastDefined = 0;
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i]!.offset !== null) {
      const startOff = parsed[lastDefined]!.offset!;
      const endOff = parsed[i]!.offset!;
      const count = i - lastDefined;
      for (let j = 1; j < count; j++) {
        parsed[lastDefined + j]!.offset = startOff + (j / count) * (endOff - startOff);
      }
      lastDefined = i;
    }
  }

  return parsed.map((p) => ({
    color: p.color,
    offset: Math.min(1, Math.max(0, p.offset ?? 0)),
  }));
}

/**
 * Universal background parser supporting multi-stop linear gradients at arbitrary angles (W3C projection),
 * radial gradients (createRadialGradient), frosted glass backdrops, and solid colors.
 */
export function createUniversalBackgroundFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgValue: string,
): string | CanvasGradient {
  if (!bgValue || typeof bgValue !== "string" || !bgValue.trim()) {
    return "#0a0a0c";
  }

  const trimmed = bgValue.trim();

  // 1. Radial Gradient Parsing
  if (trimmed.startsWith("radial-gradient")) {
    try {
      const args = extractGradientArgs(trimmed);
      if (args.length === 0) return trimmed;

      let cx = width / 2;
      let cy = height / 2;
      let stopStrings = args;

      if (args[0] && (args[0].includes("circle") || args[0].includes("ellipse") || args[0].includes("at "))) {
        const spec = args[0];
        stopStrings = args.slice(1);

        const atMatch = spec.match(/at\s+([^,]+)/);
        if (atMatch && atMatch[1]) {
          const posParts = atMatch[1].trim().split(/\s+/);
          if (posParts[0]) {
            if (posParts[0].endsWith("%")) {
              cx = (parseFloat(posParts[0]) / 100) * width;
            } else if (posParts[0].endsWith("px")) {
              cx = parseFloat(posParts[0]);
            } else if (posParts[0] === "left") {
              cx = 0;
            } else if (posParts[0] === "right") {
              cx = width;
            } else if (posParts[0] === "center") {
              cx = width / 2;
            }
          }
          if (posParts[1]) {
            if (posParts[1].endsWith("%")) {
              cy = (parseFloat(posParts[1]) / 100) * height;
            } else if (posParts[1].endsWith("px")) {
              cy = parseFloat(posParts[1]);
            } else if (posParts[1] === "top") {
              cy = 0;
            } else if (posParts[1] === "bottom") {
              cy = height;
            } else if (posParts[1] === "center") {
              cy = height / 2;
            }
          }
        }
      }

      const maxRadius = Math.max(
        Math.hypot(cx, cy),
        Math.hypot(width - cx, cy),
        Math.hypot(cx, height - cy),
        Math.hypot(width - cx, height - cy),
      ) || 1;

      const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      const stops = parseColorStops(stopStrings);

      if (stops.length >= 2) {
        for (const stop of stops) {
          radGrad.addColorStop(stop.offset, stop.color);
        }
        return radGrad;
      }
    } catch {
      return trimmed;
    }
  }

  // 2. Linear Gradient Parsing
  if (trimmed.startsWith("linear-gradient")) {
    try {
      const args = extractGradientArgs(trimmed);
      if (args.length === 0) return trimmed;

      let angleDeg = 180;
      let stopStrings = args;

      if (args[0]) {
        const first = args[0].toLowerCase();
        const degMatch = first.match(/(-?\d+(?:\.\d+)?)deg/);
        if (degMatch && degMatch[1]) {
          angleDeg = parseFloat(degMatch[1]);
          stopStrings = args.slice(1);
        } else if (first.includes("to bottom right") || first.includes("to right bottom")) {
          angleDeg = 135;
          stopStrings = args.slice(1);
        } else if (first.includes("to bottom left") || first.includes("to left bottom")) {
          angleDeg = 225;
          stopStrings = args.slice(1);
        } else if (first.includes("to top right") || first.includes("to right top")) {
          angleDeg = 45;
          stopStrings = args.slice(1);
        } else if (first.includes("to top left") || first.includes("to left top")) {
          angleDeg = 315;
          stopStrings = args.slice(1);
        } else if (first.includes("to bottom")) {
          angleDeg = 180;
          stopStrings = args.slice(1);
        } else if (first.includes("to right")) {
          angleDeg = 90;
          stopStrings = args.slice(1);
        } else if (first.includes("to top")) {
          angleDeg = 0;
          stopStrings = args.slice(1);
        } else if (first.includes("to left")) {
          angleDeg = 270;
          stopStrings = args.slice(1);
        }
      }

      // W3C Linear Gradient endpoint calculation
      const rad = (angleDeg * Math.PI) / 180;
      const dx = Math.sin(rad);
      const dy = -Math.cos(rad);
      const length = Math.abs(width * dx) + Math.abs(height * dy);
      const halfLen = length / 2;
      const cx = width / 2;
      const cy = height / 2;
      const x0 = cx - dx * halfLen;
      const y0 = cy - dy * halfLen;
      const x1 = cx + dx * halfLen;
      const y1 = cy + dy * halfLen;

      const linGrad = ctx.createLinearGradient(x0, y0, x1, y1);
      const stops = parseColorStops(stopStrings);

      if (stops.length >= 2) {
        for (const stop of stops) {
          linGrad.addColorStop(stop.offset, stop.color);
        }
        return linGrad;
      }
    } catch {
      return trimmed;
    }
  }

  // 3. Solid Color or raw CSS string
  return trimmed;
}

/**
 * Backward compatibility alias for createUniversalBackgroundFill.
 */
export const createBackgroundFill = createUniversalBackgroundFill;

/**
 * Draws all 23 distinct cursor vector designs in Canvas 2D export.
 */
export function drawCanvasCursor(
  ctx: CanvasRenderingContext2D,
  style: CursorStyle,
  _effectsState?: { glow?: boolean },
): void {
  switch (style) {
    case "hidden":
      return;
    case "default":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 17); ctx.lineTo(4.5, 13);
      ctx.lineTo(8.5, 21.5); ctx.lineTo(11.5, 20); ctx.lineTo(7.5, 12);
      ctx.lineTo(13.5, 12); ctx.closePath();
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = "#000000"; ctx.lineWidth = 1.5; ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
      break;

    case "mac":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.moveTo(1, 1); ctx.lineTo(1, 18.5);
      ctx.quadraticCurveTo(3.5, 16, 5.5, 14.5);
      ctx.lineTo(9.2, 22.8);
      ctx.quadraticCurveTo(10.7, 22.1, 12.2, 21.4);
      ctx.lineTo(8.6, 13.4); ctx.lineTo(14.8, 13.4);
      ctx.quadraticCurveTo(7.5, 7, 1, 1);
      ctx.closePath();
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = "#171717"; ctx.lineWidth = 1.2; ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
      break;

    case "macos-classic":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
      ctx.shadowBlur = 3; ctx.shadowOffsetY = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.lineTo(4, 12); ctx.lineTo(7, 19);
      ctx.lineTo(9, 18); ctx.lineTo(6, 11); ctx.lineTo(11, 11); ctx.closePath();
      ctx.fillStyle = "#000000"; ctx.fill();

      ctx.beginPath();
      ctx.moveTo(1, 1); ctx.lineTo(1, 14.5); ctx.lineTo(4, 11.5); ctx.lineTo(7, 18);
      ctx.lineTo(8, 17.5); ctx.lineTo(5.2, 10.5); ctx.lineTo(9.5, 10.5); ctx.closePath();
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.restore();
      break;

    case "dot":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)"; ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.arc(6, 6, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.4)"; ctx.lineWidth = 1; ctx.stroke();
      ctx.restore();
      break;

    case "sleek-dot":
      ctx.save();
      ctx.beginPath(); ctx.arc(10, 10, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(99, 102, 241, 0.2)"; ctx.fill();
      ctx.strokeStyle = "rgba(99, 102, 241, 0.5)"; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.shadowColor = "rgba(99, 102, 241, 0.6)"; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(10, 10, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = "#6366f1"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      break;

    case "laser-dot":
      ctx.save();
      ctx.shadowColor = "rgba(239, 68, 68, 0.9)"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(8, 8, 7, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(239, 68, 68, 0.35)"; ctx.fill();
      ctx.beginPath(); ctx.arc(8, 8, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444"; ctx.fill();
      ctx.beginPath(); ctx.arc(8, 8, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.restore();
      break;

    case "ring":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)"; ctx.shadowBlur = 4;
      ctx.beginPath(); ctx.arc(12, 12, 9.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)"; ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(12, 12, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.restore();
      break;

    case "minimal-crosshair":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.6)"; ctx.shadowBlur = 3;
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(12, 2); ctx.lineTo(12, 8);
      ctx.moveTo(12, 16); ctx.lineTo(12, 22);
      ctx.moveTo(2, 12); ctx.lineTo(8, 12);
      ctx.moveTo(16, 12); ctx.lineTo(22, 12);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(12, 12, 1, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.restore();
      break;

    case "focus-reticle":
      ctx.save();
      ctx.shadowColor = "rgba(56, 189, 248, 0.5)"; ctx.shadowBlur = 5;
      ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1.5;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(4, 8); ctx.lineTo(4, 4); ctx.lineTo(8, 4);
      ctx.moveTo(16, 4); ctx.lineTo(20, 4); ctx.lineTo(20, 8);
      ctx.moveTo(4, 16); ctx.lineTo(4, 20); ctx.lineTo(8, 20);
      ctx.moveTo(16, 20); ctx.lineTo(20, 20); ctx.lineTo(20, 16);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8"; ctx.fill();
      ctx.restore();
      break;

    case "sonar-pulse":
      ctx.save();
      ctx.shadowColor = "rgba(16, 185, 129, 0.6)"; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.arc(12, 12, 9.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; ctx.fill();
      ctx.strokeStyle = "rgba(16, 185, 129, 0.6)"; ctx.lineWidth = 1;
      if (typeof ctx.setLineDash === "function") {
        ctx.setLineDash([3, 2]); ctx.stroke(); ctx.setLineDash([]);
      } else {
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(12, 12, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)"; ctx.fill();
      ctx.strokeStyle = "#10b981"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(12, 0); ctx.lineTo(12, 3); ctx.moveTo(12, 21); ctx.lineTo(12, 24);
      ctx.moveTo(0, 12); ctx.lineTo(3, 12); ctx.moveTo(21, 12); ctx.lineTo(24, 12);
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(12, 12, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#34d399"; ctx.fill();
      ctx.restore();
      break;

    case "obsidian-glow":
      ctx.save();
      ctx.shadowColor = "rgba(168, 85, 247, 0.85)"; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 18); ctx.lineTo(5, 13.5); ctx.lineTo(9, 22);
      ctx.lineTo(12, 20.5); ctx.lineTo(8, 12.5); ctx.lineTo(14.5, 12.5); ctx.closePath();
      ctx.fillStyle = "#09090b"; ctx.fill();
      ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
      ctx.restore();
      break;

    case "neon-laser":
      ctx.save();
      ctx.shadowColor = "rgba(6, 182, 212, 0.85)"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(8, 22); ctx.lineTo(12, 14); ctx.closePath();
      ctx.fillStyle = "#06b6d4"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(12, 14); ctx.lineTo(20, 12); ctx.closePath();
      ctx.fillStyle = "#ec4899"; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(2, 2); ctx.lineTo(8, 22); ctx.lineTo(12, 14); ctx.lineTo(20, 12); ctx.closePath();
      ctx.moveTo(2, 2); ctx.lineTo(12, 14);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.lineJoin = "round"; ctx.stroke();
      ctx.restore();
      break;

    case "spotlight-glow":
      ctx.save();
      try {
        const spotGrad = ctx.createRadialGradient(16, 16, 0, 16, 16, 14);
        spotGrad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
        spotGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.2)");
        spotGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
        ctx.fillStyle = spotGrad;
      } catch {
        ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
      }
      ctx.beginPath(); ctx.arc(16, 16, 14, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = "rgba(245, 158, 11, 0.7)"; ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(16, 16, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.restore();
      break;

    case "aurora-trail":
      ctx.save();
      ctx.shadowColor = "rgba(45, 212, 191, 0.8)"; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.moveTo(10, 16); ctx.quadraticCurveTo(14, 18, 19, 21);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.7)"; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(13, 13); ctx.quadraticCurveTo(17, 14, 22, 16);
      ctx.strokeStyle = "rgba(45, 212, 191, 0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
      try {
        const grad = ctx.createLinearGradient(2, 2, 17, 18);
        grad.addColorStop(0, "#2dd4bf"); grad.addColorStop(1, "#a855f7");
        ctx.fillStyle = grad;
      } catch {
        ctx.fillStyle = "#2dd4bf";
      }
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(5, 18); ctx.lineTo(10, 13); ctx.lineTo(17, 11); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.2; ctx.lineJoin = "round"; ctx.stroke();
      ctx.restore();
      break;

    case "gradient-beam":
      ctx.save();
      ctx.shadowColor = "rgba(236, 72, 153, 0.6)"; ctx.shadowBlur = 6;
      try {
        const grad = ctx.createLinearGradient(2, 2, 16, 22);
        grad.addColorStop(0, "#ff7a1a"); grad.addColorStop(0.5, "#ec4899"); grad.addColorStop(1, "#6366f1");
        ctx.fillStyle = grad;
      } catch {
        ctx.fillStyle = "#ec4899";
      }
      ctx.beginPath();
      ctx.moveTo(2, 2); ctx.lineTo(2, 19); ctx.lineTo(6.8, 14.5); ctx.lineTo(11, 22.5);
      ctx.lineTo(13.8, 21); ctx.lineTo(9.8, 13.2); ctx.lineTo(16.5, 13.2); ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
      ctx.restore();
      break;

    case "precision-pen":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)"; ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(2, 2); ctx.lineTo(9, 5); ctx.lineTo(16, 13); ctx.lineTo(13, 16); ctx.lineTo(5, 9); ctx.closePath();
      ctx.fillStyle = "#e2e8f0"; ctx.fill();
      ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.2; ctx.lineJoin = "round"; ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(13, 16); ctx.lineTo(16, 13); ctx.lineTo(20, 17); ctx.lineTo(17, 20); ctx.closePath();
      ctx.fillStyle = "#eab308"; ctx.fill(); ctx.stroke();

      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(8, 8); ctx.stroke();
      ctx.beginPath(); ctx.arc(8, 8, 1.5, 0, Math.PI * 2); ctx.fillStyle = "#0f172a"; ctx.fill();
      ctx.restore();
      break;

    case "highlighter":
      ctx.save();
      ctx.shadowColor = "rgba(250, 204, 21, 0.6)"; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(6, 1); ctx.lineTo(9, 6); ctx.lineTo(4, 8); ctx.closePath();
      ctx.fillStyle = "#fde047"; ctx.fill();
      ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1; ctx.lineJoin = "round"; ctx.stroke();

      ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(9, 6); ctx.lineTo(12, 10); ctx.lineTo(7, 12); ctx.closePath();
      ctx.fillStyle = "#334155"; ctx.fill();
      ctx.strokeStyle = "#0f172a"; ctx.stroke();

      ctx.beginPath(); ctx.moveTo(7, 12); ctx.lineTo(12, 10); ctx.lineTo(19, 19); ctx.lineTo(14, 21); ctx.closePath();
      ctx.fillStyle = "#facc15"; ctx.fill(); ctx.stroke();
      ctx.restore();
      break;

    case "tactile-pointer":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)"; ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(7, 2); ctx.bezierCurveTo(8.2, 2, 9, 2.8, 9, 4);
      ctx.lineTo(9, 11); ctx.bezierCurveTo(9.5, 10.5, 10.5, 10.2, 11.2, 10.2);
      ctx.bezierCurveTo(12.2, 10.2, 12.8, 11, 13, 12);
      ctx.bezierCurveTo(13.5, 11.2, 14.5, 11.2, 15.2, 11.8);
      ctx.bezierCurveTo(16, 12.5, 16, 13.5, 16, 14.5);
      ctx.bezierCurveTo(16, 17.5, 14, 21, 11, 22); ctx.lineTo(5, 22);
      ctx.bezierCurveTo(3.5, 21, 2, 18.5, 2, 16); ctx.lineTo(2, 13);
      ctx.bezierCurveTo(2, 11.5, 3.5, 11, 4.5, 12.5); ctx.lineTo(5.5, 14);
      ctx.lineTo(5.5, 4); ctx.bezierCurveTo(5.5, 2.8, 6, 2, 7, 2); ctx.closePath();
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = "#1e2024"; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();

      ctx.beginPath(); ctx.moveTo(9, 8); ctx.lineTo(13, 8);
      ctx.strokeStyle = "#cbd5e1"; ctx.lineWidth = 1; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
      break;

    case "cyber-arrow":
      ctx.save();
      ctx.shadowColor = "rgba(16, 185, 129, 0.7)"; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(2, 2); ctx.lineTo(20, 11); ctx.lineTo(13, 13); ctx.lineTo(11, 20); ctx.closePath();
      ctx.fillStyle = "#1e293b"; ctx.fill();
      ctx.strokeStyle = "#34d399"; ctx.lineWidth = 1.2; ctx.lineJoin = "round"; ctx.stroke();

      ctx.beginPath(); ctx.moveTo(6, 5); ctx.lineTo(14, 10); ctx.lineTo(10, 11); ctx.lineTo(9, 14); ctx.closePath();
      ctx.fillStyle = "#10b981"; ctx.fill();
      ctx.restore();
      break;

    case "terminal-caret":
      ctx.save();
      ctx.shadowColor = "rgba(34, 197, 94, 0.8)"; ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(2, 5); ctx.lineTo(8, 10); ctx.lineTo(2, 15);
      ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
      ctx.fillStyle = "#4ade80"; ctx.fillRect(11, 6, 7, 10);
      ctx.restore();
      break;

    case "retro-pixel":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)"; ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 18); ctx.lineTo(4, 18); ctx.lineTo(4, 14);
      ctx.lineTo(7, 14); ctx.lineTo(7, 18); ctx.lineTo(10, 18); ctx.lineTo(10, 12);
      ctx.lineTo(13, 12); ctx.lineTo(13, 8); ctx.lineTo(9, 8); ctx.lineTo(9, 4);
      ctx.lineTo(4, 4); ctx.lineTo(4, 0); ctx.closePath();
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = "#000000"; ctx.lineWidth = 1.5; ctx.lineJoin = "miter"; ctx.stroke();
      ctx.restore();
      break;

    case "glass-orb":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)"; ctx.shadowBlur = 5;
      try {
        const orbGrad = ctx.createRadialGradient(9, 9, 1, 12, 12, 10);
        orbGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
        orbGrad.addColorStop(1, "rgba(15, 23, 42, 0.7)");
        ctx.fillStyle = orbGrad;
      } catch {
        ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      }
      ctx.beginPath(); ctx.arc(12, 12, 9.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.55)"; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.save();
      ctx.translate(9, 8.5); ctx.rotate((-30 * Math.PI) / 180);
      ctx.beginPath();
      if (typeof ctx.ellipse === "function") {
        ctx.ellipse(0, 0, 3, 1.8, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
      }
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)"; ctx.fill();
      ctx.restore();

      ctx.beginPath(); ctx.arc(12, 12, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "#38bdf8"; ctx.fill();
      ctx.restore();
      break;

    case "smooth-chubby":
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)"; ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.moveTo(4, 4); ctx.bezierCurveTo(4, 3, 5.5, 3, 6, 4);
      ctx.lineTo(17, 14); ctx.bezierCurveTo(18, 15, 17.5, 16.5, 16, 16.5);
      ctx.lineTo(11.5, 16.5); ctx.lineTo(8.5, 21.5);
      ctx.bezierCurveTo(7.8, 22.5, 6.5, 22, 6, 21);
      ctx.lineTo(4, 5); ctx.closePath();
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 1.8;
      ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
      break;

    default:
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.moveTo(1, 1); ctx.lineTo(1, 18.5);
      ctx.quadraticCurveTo(3.5, 16, 5.5, 14.5);
      ctx.lineTo(9.2, 22.8);
      ctx.quadraticCurveTo(10.7, 22.1, 12.2, 21.4);
      ctx.lineTo(8.6, 13.4); ctx.lineTo(14.8, 13.4);
      ctx.quadraticCurveTo(7.5, 7, 1, 1);
      ctx.closePath();
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = "#171717"; ctx.lineWidth = 1.2; ctx.lineJoin = "round";
      ctx.stroke();
      ctx.restore();
      break;
  }
}

/**
 * Draws the 9 vector avatar icons on Canvas 2D export.
 */
export function drawCanvasAvatarIcon(
  ctx: CanvasRenderingContext2D,
  icon: string,
  cx: number,
  cy: number,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(0.65, 0.65);
  ctx.translate(-10, -10);

  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (icon === "star") {
    ctx.beginPath();
    ctx.moveTo(10, 3); ctx.lineTo(12, 8); ctx.lineTo(17, 8);
    ctx.lineTo(13, 11.5); ctx.lineTo(14.5, 16.5); ctx.lineTo(10, 13.5);
    ctx.lineTo(5.5, 16.5); ctx.lineTo(7, 11.5); ctx.lineTo(3, 8);
    ctx.lineTo(8, 8); ctx.closePath();
    ctx.fill();
  } else if (icon === "zap") {
    ctx.beginPath();
    ctx.moveTo(11, 3); ctx.lineTo(5, 11); ctx.lineTo(10, 11);
    ctx.lineTo(9, 17); ctx.lineTo(15, 9); ctx.lineTo(10, 9); ctx.closePath();
    ctx.fill();
  } else if (icon === "flame") {
    ctx.beginPath();
    ctx.moveTo(10, 3); ctx.bezierCurveTo(10, 3, 14, 7, 14, 11);
    ctx.bezierCurveTo(14, 14, 12, 16, 10, 16);
    ctx.bezierCurveTo(8, 16, 6, 14, 6, 11);
    ctx.bezierCurveTo(6, 8, 8, 5, 10, 3); ctx.closePath();
    ctx.fill();
  } else if (icon === "shield") {
    ctx.beginPath();
    ctx.moveTo(10, 4); ctx.lineTo(15, 6); ctx.lineTo(15, 11);
    ctx.bezierCurveTo(15, 14, 10, 16.5, 10, 16.5);
    ctx.bezierCurveTo(10, 16.5, 5, 14, 5, 11);
    ctx.lineTo(5, 6); ctx.closePath();
    ctx.fill();
  } else if (icon === "crown") {
    ctx.beginPath();
    ctx.moveTo(5, 15); ctx.lineTo(15, 15); ctx.lineTo(16, 8);
    ctx.lineTo(12.5, 11); ctx.lineTo(10, 6); ctx.lineTo(7.5, 11);
    ctx.lineTo(4, 8); ctx.closePath();
    ctx.fill();
  } else if (icon === "check") {
    ctx.beginPath();
    ctx.moveTo(6, 10); ctx.lineTo(9, 13); ctx.lineTo(15, 6);
    ctx.stroke();
  } else if (icon === "heart") {
    ctx.beginPath();
    ctx.moveTo(10, 15); ctx.bezierCurveTo(10, 15, 5, 11.5, 5, 8);
    ctx.bezierCurveTo(5, 6, 6.5, 5, 8, 5);
    ctx.bezierCurveTo(9.2, 5, 10, 6, 10, 6);
    ctx.bezierCurveTo(10, 6, 10.8, 5, 12, 5);
    ctx.bezierCurveTo(13.5, 5, 15, 6, 15, 8);
    ctx.bezierCurveTo(15, 11.5, 10, 15, 10, 15); ctx.closePath();
    ctx.fill();
  } else if (icon === "user") {
    ctx.beginPath(); ctx.arc(10, 7, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(6, 15); ctx.bezierCurveTo(6, 12.5, 8, 11.5, 10, 11.5);
    ctx.bezierCurveTo(12, 11.5, 14, 12.5, 14, 15);
    ctx.stroke();
  } else {
    // sparkles default
    ctx.beginPath();
    ctx.moveTo(10, 4); ctx.quadraticCurveTo(10, 10, 4, 10);
    ctx.quadraticCurveTo(10, 10, 10, 16); ctx.quadraticCurveTo(10, 10, 16, 10);
    ctx.quadraticCurveTo(10, 10, 10, 4); ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Draws the Presenter Avatar Badge attached to cursor in Canvas 2D export.
 */
export function drawCanvasAvatarBadge(
  ctx: CanvasRenderingContext2D,
  avatar: CursorAvatar,
  hx: number,
  hy: number,
): void {
  if (!avatar.enabled) return;
  const bx = hx > 8 ? hx + 12 : hx + 16;
  const by = hy > 8 ? hy + 12 : hy + 16;
  const color = avatar.color || "#6366f1";

  ctx.save();
  // Pill background if badgeLabel is set
  if (avatar.badgeLabel) {
    ctx.font = "600 10px sans-serif";
    const textW = ctx.measureText(avatar.badgeLabel).width;
    const pillW = 20 + textW + 12;
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(bx - 1, by - 1, pillW, 22, 11);
    } else {
      ctx.rect(bx - 1, by - 1, pillW, 22);
    }
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#f8fafc";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(avatar.badgeLabel, bx + 22, by + 10);
  }

  // Avatar disc
  ctx.beginPath();
  ctx.arc(bx + 10, by + 10, 10, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Content inside disc
  if (avatar.type === "icon") {
    drawCanvasAvatarIcon(ctx, avatar.value || "sparkles", bx + 10, by + 10);
  } else {
    const text = (avatar.value || "DL").slice(0, 3).toUpperCase();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, bx + 10, by + 10);
  }
  ctx.restore();
}

/**
 * Draws active kinetic text overlays frame-by-frame with dynamic motion curves,
 * card styling tokens, and unboxed kickers for 100% export parity.
 */
export function renderActiveTextOverlays(
  ctx: CanvasRenderingContext2D,
  textOverlays: TextOverlay[],
  tMs: number,
  winX: number,
  winY: number,
  winW: number,
  winH: number,
  baseScale: number,
  brandAccentColor?: string,
): void {
  if (!textOverlays || textOverlays.length === 0) return;

  for (const overlay of textOverlays) {
    const motion = evaluateTextOverlayMotion(overlay, tMs);
    if (motion.opacity <= 0.001) {
      continue;
    }

    const cardStyleKey: TextCardStyle = overlay.cardStyle || "glass";
    const cardDef = TEXT_CARD_STYLE_DEFINITIONS[cardStyleKey] || TEXT_CARD_STYLE_DEFINITIONS.glass;
    const kickerText = overlay.kicker || overlay.badge;
    const isTerminal = cardStyleKey === "terminal";
    const isMinimal = cardStyleKey === "minimal";

    const posX = winX + (overlay.x ?? 0.5) * winW + motion.translateX * baseScale;
    const posY = winY + (overlay.y ?? 0.85) * winH + motion.translateY * baseScale;
    const fontSize = Math.max(14, (overlay.fontSize || 22) * baseScale);
    const fontFamily = overlay.typography?.fontFamily || cardDef.fontFamily || "sans-serif";
    const fontWeight = overlay.typography?.fontWeight || "700";

    ctx.save();
    ctx.translate(posX, posY);
    ctx.scale(motion.scale, motion.scale);
    ctx.globalAlpha = Math.max(0, Math.min(1, motion.opacity));

    if (motion.blur > 0.08 && "filter" in ctx) {
      try {
        ctx.filter = `blur(${motion.blur * baseScale}px)`;
      } catch {
        // Safe fallback for environments where filter assignment throws
      }
    }

    // 1. Measure Kicker (if present)
    let kickerFontSize = 0;
    let kickerWidth = 0;
    let kickerHeight = 0;
    let kickerFormatted = "";
    if (kickerText) {
      kickerFontSize = Math.max(10, Math.round(fontSize * 0.48));
      ctx.font = `800 ${kickerFontSize}px ${fontFamily}`;
      kickerFormatted = kickerText.toUpperCase();
      kickerWidth = ctx.measureText(kickerFormatted).width;
      kickerHeight = kickerFontSize;
    }

    // 2. Measure Headline Text
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    const headlineWidth = ctx.measureText(overlay.text).width;
    const headlineHeight = fontSize;

    // 3. Calculate Card Dimensions
    const gapBetween = kickerText ? 6 * baseScale : 0;
    const contentW = Math.max(headlineWidth, kickerWidth);
    const contentH = kickerHeight + gapBetween + headlineHeight;

    const padX = isMinimal ? 6 * baseScale : 18 * baseScale;
    const padY = isMinimal ? 4 * baseScale : 10 * baseScale;
    const cardW = contentW + padX * 2;
    const cardH = contentH + padY * 2;
    const cardX = -cardW / 2;
    const cardY = -cardH / 2;
    const cardRadius = isTerminal ? 8 * baseScale : 14 * baseScale;

    // 4. Draw Card Background & Shadow (unless minimal without custom bgColor)
    if (!isMinimal || overlay.bgColor) {
      // Configure shadow
      if (cardStyleKey === "glass") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.38)";
        ctx.shadowBlur = 24 * baseScale;
        ctx.shadowOffsetY = 8 * baseScale;
      } else if (cardStyleKey === "gradient") {
        ctx.shadowColor = "rgba(99, 102, 241, 0.4)";
        ctx.shadowBlur = 22 * baseScale;
        ctx.shadowOffsetY = 6 * baseScale;
      } else if (cardStyleKey === "solid") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx.shadowBlur = 16 * baseScale;
        ctx.shadowOffsetY = 8 * baseScale;
      } else if (cardStyleKey === "terminal") {
        ctx.shadowColor = "rgba(74, 222, 128, 0.25)";
        ctx.shadowBlur = 15 * baseScale;
        ctx.shadowOffsetY = 0;
      }

      // Fill background
      if (overlay.bgColor) {
        ctx.fillStyle = overlay.bgColor;
      } else if (cardStyleKey === "gradient") {
        const grad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
        grad.addColorStop(0, "rgba(99, 102, 241, 0.88)");
        grad.addColorStop(1, "rgba(168, 85, 247, 0.88)");
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = cardDef.defaultBgColor;
      }

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(cardX, cardY, cardW, cardH, cardRadius);
      } else {
        ctx.rect(cardX, cardY, cardW, cardH);
      }
      ctx.fill();

      // Border stroke
      if (cardDef.borderStyle && cardDef.borderStyle !== "none") {
        let strokeColor = "rgba(255, 255, 255, 0.18)";
        if (cardStyleKey === "gradient") strokeColor = "rgba(255, 255, 255, 0.25)";
        else if (cardStyleKey === "solid") strokeColor = "rgba(255, 255, 255, 0.10)";
        else if (cardStyleKey === "terminal") strokeColor = "rgba(74, 222, 128, 0.40)";

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1 * baseScale;
        ctx.stroke();
      }

      // Clear shadow before drawing text
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    // 5. Compute Vertical Placement
    let curY = cardY + padY;

    // Draw Unboxed Kicker
    if (kickerText && kickerFormatted) {
      const kickerY = curY + kickerHeight / 2;
      ctx.font = `800 ${kickerFontSize}px ${fontFamily}`;
      ctx.fillStyle = brandAccentColor || (isTerminal ? "#4ade80" : "#a5b4fc");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(kickerFormatted, 0, kickerY);
      curY += kickerHeight + gapBetween;
    }

    // Draw Headline Text
    const headlineY = curY + headlineHeight / 2;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = overlay.color || cardDef.defaultColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (isMinimal) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
      ctx.shadowBlur = 10 * baseScale;
      ctx.shadowOffsetY = 2 * baseScale;
    }

    ctx.fillText(overlay.text, 0, headlineY);

    ctx.restore();
  }
}

/**
 * Renders the edited project with full zooms, studio window framing,
 * backdrops, padding, effects, audio SFX, and text overlays into an exported video.
 */
export async function renderProjectVideo(options: RenderOptions): Promise<RenderResult> {
  const { project, resolution, format, onProgress, signal } = options;
  const targetFormat: ExportFormat = format || (resolution === "gif" ? "gif" : "mp4");
  const looks = project.looks;
  const durationMs = Math.max(1000, project.summary.durationMs || 10000);

  const { width, height } = getOutputDimensions(resolution, looks.aspectRatio);

  onProgress?.(3, "Initializing render canvas...");

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create 2D canvas context for rendering");
  }

  // Pre-smooth cursor trajectory once for fast O(1) rendering
  const smoothedTrajectory = smoothCursorTrajectory(
    project.cursorTrajectory || [],
    looks.cursorSmoothing || "smooth",
    project.clicks,
  );

  // Setup video element
  const rawMedia = project.summary.media;
  const isSampleOrEmpty = !rawMedia || rawMedia.startsWith("sample://") || rawMedia.startsWith("mock://");
  let mediaSrc = isSampleOrEmpty
    ? "/domolens_smooth_autozoom_demo.mp4"
    : platform.mediaUrl(rawMedia);

  if (platform.readMediaBlob && rawMedia && !isSampleOrEmpty && !rawMedia.startsWith("blob:") && !rawMedia.startsWith("data:")) {
    try {
      const blobUrl = await platform.readMediaBlob(rawMedia);
      if (blobUrl) {
        mediaSrc = blobUrl;
      }
    } catch {
      // Keep platform.mediaUrl fallback
    }
  }

  const video = document.createElement("video");
  video.src = mediaSrc;
  if (
    mediaSrc.startsWith("http://") ||
    mediaSrc.startsWith("https://")
  ) {
    if (!mediaSrc.includes("localhost") && !mediaSrc.includes("127.0.0.1")) {
      video.crossOrigin = "anonymous";
    }
  }
  video.playsInline = true;
  video.muted = true;
  video.preload = "auto";

  let videoLoaded = false;
  try {
    await new Promise<void>((resolve) => {
      const onLoaded = () => {
        cleanup();
        videoLoaded = true;
        resolve();
      };
      const onError = () => {
        cleanup();
        resolve(); // Continue even if demo video fails, fallback to styled graphic rendering
      };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", onLoaded);
        video.removeEventListener("canplay", onLoaded);
        video.removeEventListener("error", onError);
      };

      video.addEventListener("loadedmetadata", onLoaded, { once: true });
      video.addEventListener("canplay", onLoaded, { once: true });
      video.addEventListener("error", onError, { once: true });

      video.load();
      setTimeout(onLoaded, 2500); // Timeout fallback
    });
  } catch {
    videoLoaded = false;
  }

  if (signal?.aborted) {
    throw new Error("Export cancelled by user");
  }

  onProgress?.(10, "Setting up audio mix & recorder...");

  // Web Audio Context for audio effects mixing
  let audioCtx: AudioContext | null = null;
  let audioDest: MediaStreamAudioDestinationNode | null = null;

  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      if (audioCtx.state === "suspended") {
        void audioCtx.resume();
      }
      audioDest = audioCtx.createMediaStreamDestination();
      // Pump continuous silent audio frames so CoreMedia/WebKit audio clocks never stall
      try {
        if (typeof audioCtx.createConstantSource === "function") {
          const silence = audioCtx.createConstantSource();
          silence.offset.value = 0;
          silence.connect(audioDest);
          silence.start();
        } else {
          const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
          const bufferSource = audioCtx.createBufferSource();
          bufferSource.buffer = buffer;
          bufferSource.loop = true;
          bufferSource.connect(audioDest);
          bufferSource.start();
        }
      } catch (silenceErr) {
        console.warn("Silent carrier audio init:", silenceErr);
      }
    }
  } catch {
    audioCtx = null;
  }

  // Setup MediaStream & MediaRecorder
  const captureStreamFn =
    canvas.captureStream ||
    (canvas as unknown as { webkitCaptureStream?: (fps: number) => MediaStream }).webkitCaptureStream;
  const canvasStream = captureStreamFn ? captureStreamFn.call(canvas, 30) : null;
  if (!canvasStream) {
    throw new Error("canvas.captureStream is not supported in this environment");
  }

  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  if (audioDest) {
    const audioTracks = audioDest.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      tracks.push(audioTracks[0]!);
    }
  }

  const combinedStream = new MediaStream(tracks);

  const preferredMimeTypes =
    targetFormat === "webm"
      ? [
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
          "video/mp4;codecs=avc1",
          "video/mp4",
        ]
      : [
          "video/mp4;codecs=avc1",
          "video/mp4",
          "video/quicktime",
          "video/webm;codecs=vp9,opus",
          "video/webm;codecs=vp8,opus",
          "video/webm",
        ];

  let selectedMimeType = "";
  if (typeof MediaRecorder !== "undefined") {
    for (const mime of preferredMimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        break;
      }
    }
  }

  const chunks: Blob[] = [];
  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond: resolution === "4k" ? 18_000_000 : resolution === "1080p" ? 9_000_000 : 4_500_000,
  };
  if (selectedMimeType) {
    recorderOptions.mimeType = selectedMimeType;
  }

  const recorder = new MediaRecorder(combinedStream, recorderOptions);

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  // Shadow styles lookup
  const baseScale = width / 1920;
  const paddingPx = (looks.padding || 0) * baseScale;
  const radiusPx = (looks.borderRadius || 0) * baseScale;

  // Window rect inside canvas: adapt to video's native aspect ratio when available
  const availW = Math.max(100, width - 2 * paddingPx);
  const availH = Math.max(100, height - 2 * paddingPx);
  let winW = availW;
  let winH = availH;
  let winX = paddingPx;
  let winY = paddingPx;

  const rawWidth = video.videoWidth || project.summary.width || 0;
  const rawHeight = video.videoHeight || project.summary.height || 0;
  if (rawWidth > 0 && rawHeight > 0 && (!looks.aspectRatio || looks.aspectRatio === "16:9")) {
    const videoAspect = rawWidth / rawHeight;
    const availAspect = availW / availH;
    if (availAspect > videoAspect) {
      winH = availH;
      winW = Math.round(availH * videoAspect);
      winX = Math.round((width - winW) / 2);
      winY = paddingPx;
    } else {
      winW = availW;
      winH = Math.round(availW / videoAspect);
      winX = paddingPx;
      winY = Math.round((height - winH) / 2);
    }
  }

  recorder.start(250);

  // Play source video if available
  try {
    video.currentTime = 0;
    await video.play().catch(() => {});
  } catch {
    // Ignore video play error
  }

  const fps = 30;
  const frameIntervalMs = 1000 / fps;
  const totalFrames = Math.ceil(durationMs / frameIntervalMs);
  let currentFrame = 0;

  return new Promise<RenderResult>((resolve, reject) => {
    let animId: number;
    let cancelled = false;

    const onAbort = () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      try {
        video.pause();
        recorder.stop();
        if (audioCtx) void audioCtx.close();
      } catch {
        // Ignore
      }
      reject(new Error("Export cancelled by user"));
    };

    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }

    const renderFrame = (tMs: number) => {
      if (cancelled) return;

      // 1. Draw Background
      // Ensure frosted glass has an opaque obsidian substrate first to eliminate transparency leakage
      ctx.fillStyle = "#08090c";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = createUniversalBackgroundFill(ctx, width, height, looks.backgroundValue);
      ctx.fillRect(0, 0, width, height);

      // 2. Draw Outer Window Drop Shadow
      if (looks.shadow && looks.shadow !== "none") {
        ctx.save();
        ctx.shadowColor =
          looks.shadow === "glow"
            ? "rgba(255, 255, 255, 0.35)"
            : "rgba(0, 0, 0, 0.75)";
        ctx.shadowBlur = looks.shadow === "lift" ? 40 * baseScale : 24 * baseScale;
        ctx.shadowOffsetY = looks.shadow === "lift" ? 20 * baseScale : 10 * baseScale;
        ctx.fillStyle = "#000000";
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(winX, winY, winW, winH, radiusPx);
          ctx.fill();
        } else {
          ctx.fillRect(winX, winY, winW, winH);
        }
        ctx.restore();
      }

      // 3. Compute camera state at timestamp tMs
      const rawCamera = calculateCameraAtTime(
        tMs,
        project.zoomBlocks,
        500,
        400,
        smoothedTrajectory,
        project.keyframes,
        {
          autoTrackCursor: Boolean(looks.autoTrackCursor),
          autoTrackScale: looks.autoTrackScale || 1.6,
          cursorSmoothing: looks.cursorSmoothing || "smooth",
          cameraPhysics: looks.cameraPhysics,
          clicks: project.clicks,
          alreadySmoothed: true,
        },
      );
      const camera = rawCamera;

      // Compute active visual effects at timestamp tMs
      const effectsState = calculateActiveEffectsState(
        project.effects || [],
        tMs,
        project.keyframes,
        { x: camera.x, y: camera.y },
      );

      // 4. Clip inner video window
      ctx.save();
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(winX, winY, winW, winH, radiusPx);
        ctx.clip();
      } else {
        ctx.beginPath();
        ctx.rect(winX, winY, winW, winH);
        ctx.clip();
      }

      // 5. Apply camera transform (scale and target centering)
      ctx.save();
      ctx.translate(winX + winW / 2, winY + winH / 2);
      ctx.scale(camera.scale, camera.scale);
      ctx.translate((0.5 - camera.x) * winW, (0.5 - camera.y) * winH);

      // 6. Draw video source or high-fidelity mockup
      if (videoLoaded && video.readyState >= 2) {
        if (effectsState.filterStyle) {
          ctx.filter = effectsState.filterStyle;
        }
        const vW = video.videoWidth || winW;
        const vH = video.videoHeight || winH;
        const vAspect = vW / vH;
        const winAspect = winW / winH;
        let sx = 0, sy = 0, sw = vW, sh = vH;
        if (vAspect > winAspect) {
          // Source video is wider than viewport window: crop horizontal edges
          sw = vH * winAspect;
          sx = (vW - sw) / 2;
        } else {
          // Source video is taller than viewport window: crop vertical edges
          sh = vW / winAspect;
          sy = (vH - sh) / 2;
        }
        ctx.drawImage(video, sx, sy, sw, sh, -winW / 2, -winH / 2, winW, winH);
        ctx.filter = "none";
      } else {
        // High quality fallback presentation canvas
        ctx.fillStyle = "#111216";
        ctx.fillRect(-winW / 2, -winH / 2, winW, winH);

        // Simulated app window bar
        ctx.fillStyle = "#1e2029";
        ctx.fillRect(-winW / 2, -winH / 2, winW, 44 * baseScale);

        // Window controls (strictly monochromatic)
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.arc(-winW / 2 + 24 * baseScale, -winH / 2 + 22 * baseScale, 6 * baseScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.arc(-winW / 2 + 42 * baseScale, -winH / 2 + 22 * baseScale, 6 * baseScale, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.beginPath();
        ctx.arc(-winW / 2 + 60 * baseScale, -winH / 2 + 22 * baseScale, 6 * baseScale, 0, Math.PI * 2);
        ctx.fill();

        // Project Title
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${16 * baseScale}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(project.summary.name, 0, -winH / 2 + 28 * baseScale);
      }

      // 7. Draw Click Ripple indicator if active
      if (looks.showClickRipples && project.clicks) {
        const activeClick = project.clicks.find(
          (c) => tMs >= c.timestampMs && tMs <= c.timestampMs + 320,
        );
        if (activeClick) {
          const elapsed = tMs - activeClick.timestampMs;
          const rippleProgress = Math.min(1, Math.max(0, elapsed / 320));
          const rippleRadius = (20 + rippleProgress * 55) * baseScale;
          const alpha = 1 - rippleProgress;

          const cx = activeClick.x * winW - winW / 2;
          const cy = activeClick.y * winH - winH / 2;

          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.lineWidth = 3 * baseScale;
          ctx.beginPath();
          ctx.arc(cx, cy, rippleRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 7b. Draw Mouse Cursor Pointer and Cursor Glow if enabled
      if (looks.showCursor && looks.cursorStyle !== "hidden") {
        const curX = camera.cursorX * winW - winW / 2;
        const curY = camera.cursorY * winH - winH / 2;
        const cursorScale = (looks.cursorSize || 1.4) * baseScale;
        const preset = getCursorPreset(looks.cursorStyle) || getCursorPreset("mac")!;
        const [hx, hy] = preset.hotspot;

        // Dynamic Cursor Glow Effect
        if (effectsState.glow) {
          ctx.save();
          const glowRadius = 32 * cursorScale;
          try {
            const glowGrad = ctx.createRadialGradient(curX, curY, 0, curX, curY, glowRadius);
            glowGrad.addColorStop(0, "rgba(255, 255, 255, 0.5)");
            glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = glowGrad;
          } catch {
            ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          }
          ctx.beginPath();
          ctx.arc(curX, curY, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(curX, curY);
        ctx.scale(cursorScale, cursorScale);
        ctx.translate(-hx, -hy);

        drawCanvasCursor(ctx, looks.cursorStyle, effectsState);

        if (looks.cursorAvatar?.enabled) {
          drawCanvasAvatarBadge(ctx, looks.cursorAvatar, hx, hy);
        }

        ctx.restore();
      }

      ctx.restore(); // Restore camera transform

      // 7c. Draw Dynamic Spotlight Overlay (window space)
      if (effectsState.spotlight && effectsState.spotlight.active) {
        ctx.save();
        const spotX = winX + effectsState.spotlight.x * winW;
        const spotY = winY + effectsState.spotlight.y * winH;
        const spotRadius = Math.max(20, effectsState.spotlight.radius * baseScale);
        const spotIntensity = Math.min(1, Math.max(0, effectsState.spotlight.intensity));

        const spotGrad = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, spotRadius);
        spotGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        spotGrad.addColorStop(0.45, "rgba(0, 0, 0, 0)");
        spotGrad.addColorStop(1, `rgba(0, 0, 0, ${(spotIntensity * 0.75).toFixed(3)})`);

        ctx.fillStyle = spotGrad;
        ctx.fillRect(winX, winY, winW, winH);
        ctx.restore();
      }

      // 7d. Draw Dynamic Vignette Overlay (window space)
      if (effectsState.vignette > 0) {
        ctx.save();
        const vIntensity = Math.min(1, Math.max(0, effectsState.vignette));
        const cx = winX + winW / 2;
        const cy = winY + winH / 2;
        const innerR = Math.min(winW, winH) * 0.35;
        const outerR = Math.hypot(winW / 2, winH / 2);

        const vigGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        vigGrad.addColorStop(0, "rgba(0, 0, 0, 0)");
        vigGrad.addColorStop(1, `rgba(0, 0, 0, ${(Math.min(0.95, vIntensity * 0.9)).toFixed(3)})`);

        ctx.fillStyle = vigGrad;
        ctx.fillRect(winX, winY, winW, winH);
        ctx.restore();
      }

      // 8. Draw Active Text Overlays (Captions)
      if (project.textOverlays && project.textOverlays.length > 0) {
        renderActiveTextOverlays(
          ctx,
          project.textOverlays,
          tMs,
          winX,
          winY,
          winW,
          winH,
          baseScale,
          looks.brandAccentColor,
        );
      }

      ctx.restore(); // Restore window clipping

      // 9. Draw Window Mockup Shell Header
      if (looks.windowFrame && looks.windowFrame !== "none") {
        ctx.save();
        const headerH = 26 * baseScale;
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(winX, winY, winW, headerH, [radiusPx, radiusPx, 0, 0]);
          ctx.fill();
        } else {
          ctx.fillRect(winX, winY, winW, headerH);
        }

        // Traffic Light Dots
        if (looks.windowFrame === "macos" || looks.windowFrame === "safari" || looks.windowFrame === "terminal") {
          const dotR = 4 * baseScale;
          const startDotX = winX + 12 * baseScale;
          const dotY = winY + headerH / 2;
          const gap = 13 * baseScale;

          // Red
          ctx.fillStyle = "#ff5f56";
          ctx.beginPath();
          ctx.arc(startDotX, dotY, dotR, 0, Math.PI * 2);
          ctx.fill();

          // Yellow
          ctx.fillStyle = "#ffbd2e";
          ctx.beginPath();
          ctx.arc(startDotX + gap, dotY, dotR, 0, Math.PI * 2);
          ctx.fill();

          // Green
          ctx.fillStyle = "#27c93f";
          ctx.beginPath();
          ctx.arc(startDotX + gap * 2, dotY, dotR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Safari Omnibar
        if (looks.windowFrame === "safari") {
          const omniW = Math.min(260 * baseScale, winW * 0.45);
          const omniH = 16 * baseScale;
          const omniX = winX + (winW - omniW) / 2;
          const omniY = winY + (headerH - omniH) / 2;
          ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
          if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(omniX, omniY, omniW, omniH, 4 * baseScale);
            ctx.fill();
          } else {
            ctx.fillRect(omniX, omniY, omniW, omniH);
          }
          ctx.font = `500 ${10 * baseScale}px monospace`;
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
          ctx.textAlign = "center";
          ctx.fillText(looks.mockupUrl || "app.domolens.dev", omniX + omniW / 2, omniY + 11 * baseScale);
        }

        ctx.restore();
      }

      // Synthesize audio events in time window (lastProcessedAudioMs, tMs]
      const winStart = lastProcessedAudioMs;
      const winEnd = tMs;
      lastProcessedAudioMs = tMs;

      if (audioCtx && audioDest) {
        const audioSettings = project.audioSettings;
        const clickEnabled = audioSettings?.clickSoundEnabled !== false;
        const typingEnabled = audioSettings?.typingSoundEnabled !== false;

        // 1. Procedural click sounds from recorded clicks
        if (clickEnabled && project.clicks) {
          for (const c of project.clicks) {
            if (c.timestampMs > winStart && c.timestampMs <= winEnd) {
              playSyntheticBop(
                audioCtx,
                audioDest,
                audioSettings?.clickSoundVolume || 0.7,
                audioSettings?.clickSoundPreset || "bop",
              );
            }
          }
        }

        // 2. Procedural typing keystrokes from recorded typing interactions
        if (typingEnabled && project.interactions) {
          for (const i of project.interactions) {
            if (i.type === "typing" && i.timestampMs > winStart && i.timestampMs <= winEnd) {
              playSyntheticKeystroke(
                audioCtx,
                audioDest,
                audioSettings?.typingSoundPreset || "mechanical",
                audioSettings?.typingSoundVolume || 0.6,
              );
            }
          }
        }

        // 3. Keyframe-attached sound cues
        if (project.keyframes && project.keyframes.length > 0) {
          for (const kf of project.keyframes) {
            if (kf.sound && kf.timeMs > winStart && kf.timeMs <= winEnd) {
              if (kf.sound === "click" && clickEnabled) {
                playSyntheticBop(
                  audioCtx,
                  audioDest,
                  kf.soundVolume || audioSettings?.clickSoundVolume || 0.7,
                  (kf.soundPreset as any) || audioSettings?.clickSoundPreset || "bop",
                );
              } else if (kf.sound === "typing" && typingEnabled) {
                playSyntheticKeystroke(
                  audioCtx,
                  audioDest,
                  (kf.soundPreset as any) || audioSettings?.typingSoundPreset || "mechanical",
                  kf.soundVolume || audioSettings?.typingSoundVolume || 0.6,
                );
              }
            }
          }
        }
      }

      currentFrame++;
      const percent = Math.min(98, Math.round((currentFrame / totalFrames) * 90) + 8);
      onProgress?.(percent, `Rendering video frames (${currentFrame}/${totalFrames})...`);

      const playbackRate = effectsState.playbackRate > 0 ? effectsState.playbackRate : 1.0;
      const stepMs = frameIntervalMs * playbackRate;

      if (tMs + stepMs < durationMs && !cancelled) {
        // If HTML5 video is driving, seek or tick next frame
        if (videoLoaded && video.duration > 0) {
          video.currentTime = Math.min(video.duration, (tMs + stepMs) / 1000);
        }
        animId = requestAnimationFrame(() => renderFrame(tMs + stepMs));
      } else {
        // Finish recording
        finishRender();
      }
    };

    const finishRender = () => {
      onProgress?.(99, "Packaging download...");
      try {
        video.pause();

        recorder.onstop = async () => {
          if (audioCtx) void audioCtx.close();
          const mime = selectedMimeType || recorder.mimeType || "video/mp4";
          const blob = new Blob(chunks, { type: mime });

          if (blob.size === 0 || chunks.length === 0) {
            reject(new Error("Video render output is empty (0 bytes). MediaRecorder could not capture stream frames."));
            return;
          }

          const isMp4 = mime.includes("mp4");
          const isMov = targetFormat === "mov";
          const ext = resolution === "gif" ? "gif" : isMov ? "mov" : isMp4 ? "mp4" : "webm";
          const safeName = project.summary.name.replace(/\s+/g, "_");
          const filename = `${safeName}_${resolution}.${ext}`;
          const downloadUrl = URL.createObjectURL(blob);
          const arrayBuffer = await blob.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);

          resolve({
            blob,
            data,
            mimeType: mime,
            filename,
            downloadUrl,
          });
        };

        if (recorder.state === "recording") {
          recorder.stop();
        } else {
          recorder.onstop?.(new Event("stop"));
        }
      } catch (err) {
        reject(err);
      }
    };

    // Begin render loop at time 0 with audio processing window
    let lastProcessedAudioMs = -1;
    renderFrame(0);
  });
}

/**
 * Procedural web audio bop effect generator connected to render audio stream.
 */
function playSyntheticBop(
  ctx: AudioContext,
  dest: MediaStreamAudioDestinationNode,
  volume: number,
  preset: ClickSoundPreset = "bop",
) {
  if (preset === "none" || volume <= 0) return;
  try {
    const profile = CLICK_SOUND_PROFILES[preset] || CLICK_SOUND_PROFILES.bop;
    const now = ctx.currentTime;
    const pitchJitter = 1 + (Math.random() - 0.5) * 0.08;
    const startF = profile.startFreq * pitchJitter;
    const endF = profile.endFreq * pitchJitter;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endF), now + profile.durationSec);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(profile.filterCutoff || 1000, now);
    filter.Q.setValueAtTime(profile.qFactor || 2.0, now);

    const gain = ctx.createGain();
    const peakGain = Math.min(1.0, Math.max(0.01, volume * 0.8));
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.durationSec);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + profile.durationSec);
  } catch {
    // Ignore audio synthesis errors
  }
}

/**
 * Procedural web audio keystroke sound synthesis connected to render audio stream.
 */
function playSyntheticKeystroke(
  ctx: AudioContext,
  dest: MediaStreamAudioDestinationNode,
  preset: TypingSoundPreset,
  volume: number,
) {
  if (preset === "none") return;
  try {
    const profile =
      (preset in TYPING_SOUND_PROFILES ? TYPING_SOUND_PROFILES[preset as keyof typeof TYPING_SOUND_PROFILES] : null) ||
      TYPING_SOUND_PROFILES.creamy ||
      TYPING_SOUND_PROFILES.mechanical;
    const now = ctx.currentTime;
    const jitter = 1 + (Math.random() - 0.5) * 0.12;

    // Contact noise
    const noiseDuration = profile.clickLeafSnap ? 0.02 : 0.012;
    const bufferSize = Math.floor(ctx.sampleRate * noiseDuration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = profile.resonanceFilter === "bandpass" ? "bandpass" : "highpass";
    noiseFilter.frequency.setValueAtTime(profile.noiseCutoff * jitter, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(Math.min(1.0, (profile.noiseGain ?? 0.3) * volume), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0005, now + noiseDuration);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);
    whiteNoise.start(now);

    // Body resonance
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(profile.thockFreq * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(profile.thockFreq * 0.45, now + profile.durationSec);

    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(Math.min(1.0, volume * 0.5), now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + profile.durationSec);

    osc.connect(bodyGain);
    bodyGain.connect(dest);
    osc.start(now);
    osc.stop(now + profile.durationSec);
  } catch {
    // Ignore audio synthesis errors
  }
}

