import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cable, Smartphone, Wifi } from "lucide-react";
import { mobileStreamBridge, type MobileDeviceInfo } from "../../lib/mobile-stream-bridge";

interface MobileLiveMonitorProps {
  deviceInfo: MobileDeviceInfo | null;
  lastTap?: { x: number; y: number; timestamp: number } | null;
  isRecording?: boolean;
  onSimulateTap?: (x: number, y: number) => void;
  className?: string;
}

interface TapRipple {
  id: string;
  x: number;
  y: number;
}

export function MobileLiveMonitor({
  deviceInfo,
  lastTap,
  isRecording = false,
  onSimulateTap,
  className = "",
}: MobileLiveMonitorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ripples, setRipples] = useState<TapRipple[]>([]);
  const [hasActiveStream, setHasActiveStream] = useState<boolean>(() => {
    const s = mobileStreamBridge.getStream();
    return Boolean(s && s.getVideoTracks().length > 0);
  });

  // Bind live media stream to the video element
  useEffect(() => {
    const checkStream = () => {
      const stream = mobileStreamBridge.getStream();
      const hasTracks = Boolean(stream && stream.getVideoTracks().length > 0);
      setHasActiveStream(hasTracks);
      if (videoRef.current && stream && hasTracks) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    };
    checkStream();

    const unsubStream = mobileStreamBridge.onStreamReady((newStream) => {
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(() => {});
      }
      setHasActiveStream(Boolean(newStream && newStream.getVideoTracks().length > 0));
    });

    const unsubDev = mobileStreamBridge.onDeviceConnected(() => {
      checkStream();
    });

    const unsubDisc = mobileStreamBridge.onDeviceDisconnected(() => {
      setHasActiveStream(false);
    });

    return () => {
      unsubStream();
      unsubDev();
      unsubDisc();
    };
  }, []);

  // When lastTap changes, add a visual ripple animation
  useEffect(() => {
    if (!lastTap) return;
    const rippleId = `rip-${Date.now()}-${Math.random()}`;
    setRipples((prev) => [...prev.slice(-8), { id: rippleId, x: lastTap.x, y: lastTap.y }]);

    const timer = setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== rippleId));
    }, 700);

    return () => clearTimeout(timer);
  }, [lastTap]);

  // Handle direct click on computer monitor to forward as phone tap
  const handleMonitorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !onSimulateTap) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    onSimulateTap(x, y);
  };

  const name = deviceInfo?.name || "Mobile Device";
  const connectionType = deviceInfo?.connectionType || "wifi";
  const width = deviceInfo?.width || 1179;
  const height = deviceInfo?.height || 2556;
  const aspectRatio = deviceInfo?.aspectRatio || "19.5:9";
  const latencyMs = deviceInfo?.latencyMs || 18;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      {/* Top Device Telemetry Bar */}
      <div className="flex w-full max-w-xs items-center justify-between pb-2 text-[11px] font-mono text-fg-muted">
        <div className="flex items-center gap-1.5 truncate">
          <span className={`size-2 rounded-full ${hasActiveStream ? "bg-white animate-pulse" : "bg-neutral-500 animate-ping"}`} />
          <span className="font-semibold text-white truncate max-w-[130px]">
            {deviceInfo ? name : "Standby"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="flex items-center gap-1 rounded bg-ink-800 px-1.5 py-0.5 border border-ink-700 text-fg-faint text-[10px]">
            {connectionType === "wifi" ? <Wifi className="size-3" /> : <Cable className="size-3" />}
            {connectionType.toUpperCase()}
          </span>
          <span className="text-white text-[10px]">{latencyMs}ms</span>
          <span className="text-neutral-400 text-[10px]">60 FPS</span>
        </div>
      </div>

      {/* Phone Mockup Frame */}
      <div
        className="relative flex flex-col items-center rounded-[36px] border-[3px] border-neutral-700 bg-black p-2 shadow-2xl transition-transform duration-200 hover:scale-[1.01]"
        style={{
          width: "230px",
          maxWidth: "100%",
        }}
      >
        {/* Dynamic Island / Camera Notch */}
        <div className="absolute top-3.5 z-20 flex items-center justify-center">
          <div className="h-3.5 w-20 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-end px-2">
            <span className="size-1.5 rounded-full bg-neutral-800" />
          </div>
        </div>

        {/* Live Stream Screen Container */}
        <div
          ref={containerRef}
          onClick={handleMonitorClick}
          className="relative w-full overflow-hidden rounded-[28px] bg-ink-950 cursor-pointer border border-neutral-800"
          style={{
            aspectRatio: aspectRatio === "4:3" ? "4 / 3" : "9 / 19.5",
          }}
          title="Live Phone Screen — Click anywhere to simulate touch interaction"
        >
          {/* Radar Standby Screen when awaiting active stream */}
          {!hasActiveStream && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center bg-black/95">
              <div className="relative flex size-16 items-center justify-center mb-2.5">
                <div className="absolute inset-0 rounded-full border border-white/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border border-white/30" />
                <Smartphone className="size-7 text-white" />
              </div>
              <span className="text-xs font-bold font-mono text-white tracking-wider">RADAR ACTIVE</span>
              <span className="mt-1 text-[10px] text-neutral-400 max-w-[130px] leading-tight font-sans">
                Scan QR code on left with your phone camera
              </span>
            </div>
          )}

          {/* Hardware Stream Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="size-full object-cover pointer-events-none"
          />

          {/* Live Tap Pulse Ripples */}
          <AnimatePresence>
            {ripples.map((rip) => (
              <motion.div
                key={rip.id}
                initial={{ scale: 0.2, opacity: 0.9 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="pointer-events-none absolute size-10 -ml-5 -mt-5 rounded-full border-2 border-white bg-white/20 shadow-md"
                style={{
                  left: `${rip.x * 100}%`,
                  top: `${rip.y * 100}%`,
                }}
              />
            ))}
          </AnimatePresence>

          {/* Live Recording Watermark Banner */}
          {isRecording && (
            <div className="pointer-events-none absolute top-8 left-0 right-0 flex justify-center z-20">
              <span className="flex items-center gap-1 rounded-full bg-black/85 px-2.5 py-0.5 text-[9px] font-mono font-bold text-white border border-white/20 backdrop-blur-md">
                <span className="size-1.5 rounded-full bg-white animate-pulse" />
                REC LIVE
              </span>
            </div>
          )}

          {/* Bottom Home Indicator Bar */}
          <div className="pointer-events-none absolute bottom-1.5 left-0 right-0 flex justify-center z-20">
            <div className="h-1 w-20 rounded-full bg-white/50" />
          </div>
        </div>
      </div>

      {/* Screen Specs Footer */}
      <div className="mt-2 text-center text-[10px] font-mono text-neutral-400">
        {deviceInfo ? `${width} × ${height} • ${aspectRatio} • Click to test tap` : "Awaiting Mobile Connection"}
      </div>
    </div>
  );
}
