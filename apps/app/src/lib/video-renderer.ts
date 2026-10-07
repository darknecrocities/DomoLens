import {
  calculateActiveEffectsState,
  calculateCameraAtTime,
  smoothCursorTrajectory,
  type ProjectData,
} from "@domolens/core";
import { platform } from "../platform";

export type ExportResolution = "1080p" | "720p" | "4k" | "gif";

export interface RenderOptions {
  project: ProjectData;
  resolution: ExportResolution;
  onProgress?: (percent: number, statusText: string) => void;
  signal?: AbortSignal;
}

export interface RenderResult {
  blob: Blob;
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
 * Parses CSS linear gradients or solid color strings into a CanvasGradient or fillStyle.
 */
function createBackgroundFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bgValue: string,
): string | CanvasGradient {
  if (bgValue && bgValue.startsWith("linear-gradient")) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    const colorMatches = bgValue.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)/g);
    if (colorMatches && colorMatches.length >= 2) {
      grad.addColorStop(0, colorMatches[0]!);
      grad.addColorStop(1, colorMatches[colorMatches.length - 1]!);
      return grad;
    }
  }
  return bgValue || "#0a0a0c";
}

/**
 * Renders the edited project with full zooms, studio window framing,
 * backdrops, padding, effects, audio SFX, and text overlays into an exported video.
 */
export async function renderProjectVideo(options: RenderOptions): Promise<RenderResult> {
  const { project, resolution, onProgress, signal } = options;
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
  const mediaSrc = isSampleOrEmpty
    ? "/domolens_smooth_autozoom_demo.mp4"
    : platform.mediaUrl(rawMedia);

  const video = document.createElement("video");
  video.src = mediaSrc;
  video.crossOrigin = "anonymous";
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
      audioDest = audioCtx.createMediaStreamDestination();
    }
  } catch {
    audioCtx = null;
  }

  // Setup MediaStream & MediaRecorder
  const canvasStream = canvas.captureStream ? canvas.captureStream(30) : null;
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

  const preferredMimeTypes = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4;codecs=avc1,mp4a.40.2",
    "video/mp4",
  ];

  let selectedMimeType = "video/webm";
  if (typeof MediaRecorder !== "undefined") {
    for (const mime of preferredMimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMimeType = mime;
        break;
      }
    }
  }

  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMimeType,
    videoBitsPerSecond: resolution === "4k" ? 18_000_000 : resolution === "1080p" ? 9_000_000 : 4_500_000,
  });

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
      ctx.fillStyle = createBackgroundFill(ctx, width, height, looks.backgroundValue);
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
        ctx.drawImage(video, -winW / 2, -winH / 2, winW, winH);
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

        // Dynamic Cursor Glow Effect
        if (effectsState.glow) {
          ctx.save();
          const glowRadius = 32 * cursorScale;
          const glowGrad = ctx.createRadialGradient(curX, curY, 0, curX, curY, glowRadius);
          glowGrad.addColorStop(0, "rgba(255, 255, 255, 0.5)");
          glowGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(curX, curY, glowRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Pointer Shape
        ctx.save();
        ctx.translate(curX, curY);
        ctx.scale(cursorScale, cursorScale);

        if (looks.cursorStyle === "dot") {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 5, 0, Math.PI * 2);
          ctx.fill();
        } else if (looks.cursorStyle === "ring") {
          ctx.strokeStyle = "#ffffff";
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          // Standard / Studio Cursor Arrow
          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#171717";
          ctx.lineWidth = 1.5;
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(0, 16);
          ctx.lineTo(4.5, 12.5);
          ctx.lineTo(8.5, 20.5);
          ctx.lineTo(11.5, 19);
          ctx.lineTo(7.5, 11);
          ctx.lineTo(13.5, 11);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
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
        for (const overlay of project.textOverlays) {
          const overlayEndMs = overlay.startTimeMs + overlay.durationMs;
          if (tMs >= overlay.startTimeMs && tMs <= overlayEndMs) {
            const posX = winX + (overlay.x ?? 0.5) * winW;
            const posY = winY + (overlay.y ?? 0.85) * winH;
            const fontSize = Math.max(14, (overlay.fontSize || 22) * baseScale);

            ctx.font = `600 ${fontSize}px sans-serif`;
            const textWidth = ctx.measureText(overlay.text).width;
            const padX = 14 * baseScale;
            const padY = 8 * baseScale;

            // Caption backdrop
            ctx.fillStyle = overlay.bgColor || "rgba(0, 0, 0, 0.75)";
            if (typeof ctx.roundRect === "function") {
              ctx.beginPath();
              ctx.roundRect(
                posX - textWidth / 2 - padX,
                posY - fontSize - padY / 2,
                textWidth + padX * 2,
                fontSize + padY * 2,
                8 * baseScale,
              );
              ctx.fill();
            } else {
              ctx.fillRect(
                posX - textWidth / 2 - padX,
                posY - fontSize - padY / 2,
                textWidth + padX * 2,
                fontSize + padY * 2,
              );
            }

            // Caption text
            ctx.fillStyle = overlay.color || "#ffffff";
            ctx.textAlign = "center";
            ctx.fillText(overlay.text, posX, posY);
          }
        }
      }

      ctx.restore(); // Restore window clipping

      // Trigger Web Audio synthetic bops if enabled
      if (audioCtx && audioDest && project.audioSettings?.clickSoundEnabled !== false && project.clicks) {
        const clickNow = project.clicks.find((c) => Math.abs(c.timestampMs - tMs) < frameIntervalMs / 2);
        if (clickNow) {
          playSyntheticBop(audioCtx, audioDest, project.audioSettings?.clickSoundVolume || 0.7);
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
        recorder.onstop = () => {
          if (audioCtx) void audioCtx.close();
          const blob = new Blob(chunks, { type: selectedMimeType });
          const isMp4 = selectedMimeType.includes("mp4");
          const ext = resolution === "gif" ? "gif" : isMp4 ? "mp4" : "webm";
          const safeName = project.summary.name.replace(/\s+/g, "_");
          const filename = `${safeName}_${resolution}.${ext}`;
          const downloadUrl = URL.createObjectURL(blob);

          resolve({
            blob,
            mimeType: selectedMimeType,
            filename,
            downloadUrl,
          });
        };
        recorder.stop();
      } catch (err) {
        reject(err);
      }
    };

    // Begin render loop at time 0
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
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(volume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch {
    // Ignore audio synthesis errors
  }
}
