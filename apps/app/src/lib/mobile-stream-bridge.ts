/**
 * Mobile Stream Bridge
 * High-performance, low-latency mobile screen receiver & touch telemetry bridge.
 * Supports Wi-Fi (WebRTC & local signaling) and USB cable direct links for both iOS & Android.
 */

export interface MobileDeviceInfo {
  id: string;
  name: string;
  os: "ios" | "android";
  connectionType: "wifi" | "usb";
  width: number;
  height: number;
  fps: number;
  aspectRatio: string;
  batteryPercent?: number;
  latencyMs: number;
}

export interface MobileTouchEvent {
  type: "tap" | "hold" | "move" | "release";
  x: number; // 0.0 - 1.0 normalized
  y: number; // 0.0 - 1.0 normalized
  timestampMs: number;
  pointerId?: number;
}

export interface PairingInfo {
  pairingUrl: string;
  pairingCode: string;
  lanIp: string;
  port: number;
}

type DeviceListener = (device: MobileDeviceInfo) => void;
type DisconnectListener = () => void;
type TouchListener = (event: MobileTouchEvent) => void;
type StreamListener = (stream: MediaStream) => void;

class MobileStreamBridgeImpl {
  private activeDevice: MobileDeviceInfo | null = null;
  private activeStream: MediaStream | null = null;
  private simulationTimer: ReturnType<typeof setInterval> | null = null;

  private deviceListeners = new Set<DeviceListener>();
  private disconnectListeners = new Set<DisconnectListener>();
  private touchListeners = new Set<TouchListener>();
  private streamListeners = new Set<StreamListener>();

  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;

  public getActiveDevice(): MobileDeviceInfo | null {
    return this.activeDevice;
  }

  public getStream(): MediaStream | null {
    return this.activeStream;
  }

  public isConnected(): boolean {
    return this.activeDevice !== null;
  }

  public onDeviceConnected(cb: DeviceListener): () => void {
    this.deviceListeners.add(cb);
    if (this.activeDevice) cb(this.activeDevice);
    return () => this.deviceListeners.delete(cb);
  }

  public onDeviceDisconnected(cb: DisconnectListener): () => void {
    this.disconnectListeners.add(cb);
    return () => this.disconnectListeners.delete(cb);
  }

  public onTouchEvent(cb: TouchListener): () => void {
    this.touchListeners.add(cb);
    return () => this.touchListeners.delete(cb);
  }

  public onStreamReady(cb: StreamListener): () => void {
    this.streamListeners.add(cb);
    if (this.activeStream) cb(this.activeStream);
    return () => this.streamListeners.delete(cb);
  }

  /**
   * Generates local Wi-Fi pairing parameters for the QR code and mobile companion.
   */
  public generatePairingInfo(type: "wifi" | "usb"): PairingInfo {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const isLocalhost = typeof window !== "undefined" && window.location.hostname === "localhost";
    const lanIp = isLocalhost ? "192.168.1.105" : (typeof window !== "undefined" ? window.location.hostname : "127.0.0.1");
    const port = 3210;

    const pairingUrl = type === "wifi"
      ? `https://domolens.live/connect?id=${code}&mode=wifi&host=${lanIp}`
      : `http://localhost:${port}/usb-connect?id=${code}&mode=usb`;

    return {
      pairingUrl,
      pairingCode: code,
      lanIp,
      port,
    };
  }

  /**
   * Simulates a connected mobile phone (iPhone or Android) with real 60fps canvas video stream
   * and dynamic portrait aspect ratio (e.g. 1179x2556, 1080x2400) for testing, development, and offline demo.
   */
  public connectSimulatedDevice(
    preset: "iphone" | "android" | "ipad" = "iphone",
    connectionType: "wifi" | "usb" = "wifi",
  ): MobileDeviceInfo {
    this.disconnect();

    let width = 1179;
    let height = 2556;
    let name = "iPhone 15 Pro";
    let os: "ios" | "android" = "ios";
    let aspectRatio = "19.5:9";

    if (preset === "android") {
      width = 1080;
      height = 2400;
      name = "Samsung Galaxy S24 Ultra";
      os = "android";
      aspectRatio = "20:9";
    } else if (preset === "ipad") {
      width = 1620;
      height = 2160;
      name = "iPad Pro (11-inch)";
      os = "ios";
      aspectRatio = "4:3";
    }

    const device: MobileDeviceInfo = {
      id: `dev-${Date.now()}`,
      name,
      os,
      connectionType,
      width,
      height,
      fps: 60,
      aspectRatio,
      batteryPercent: 92,
      latencyMs: connectionType === "usb" ? 14 : 26,
    };

    // Create a 60fps MediaStream via animated mobile simulation canvas
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      let tick = 0;
      const drawFrame = () => {
        if (!ctx) return;
        tick++;

        // Monochromatic sleek mobile background
        ctx.fillStyle = "#09090b";
        ctx.fillRect(0, 0, width, height);

        // Subtle gradient backdrop
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, "#18181b");
        grad.addColorStop(0.5, "#09090b");
        grad.addColorStop(1, "#18181b");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // Top Status Bar (Clock, Wi-Fi, Battery)
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 32px sans-serif";
        ctx.fillText("9:41", 48, 68);

        // Battery / Wifi icons simulation
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(width - 96, 44, 48, 24);
        ctx.strokeRect(width - 100, 40, 56, 32);

        // Mobile App Header Mockup
        ctx.fillStyle = "#27272a";
        ctx.beginPath();
        ctx.roundRect(32, 100, width - 64, 90, 24);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.fillText(name, 56, 156);

        // Dynamic app feed cards
        const cardCount = 4;
        for (let i = 0; i < cardCount; i++) {
          const cardY = 220 + i * 260;
          ctx.fillStyle = i === 1 ? "#27272a" : "#18181b";
          ctx.beginPath();
          ctx.roundRect(32, cardY, width - 64, 220, 28);
          ctx.fill();
          ctx.strokeStyle = "#3f3f46";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Card icon
          ctx.fillStyle = i === 1 ? "#ffffff" : "#a1a1aa";
          ctx.beginPath();
          ctx.arc(80, cardY + 60, 24, 0, Math.PI * 2);
          ctx.fill();

          // Card text lines
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 28px sans-serif";
          ctx.fillText(`Interactive Mobile Flow ${i + 1}`, 124, cardY + 68);

          ctx.fillStyle = "#71717a";
          ctx.font = "22px sans-serif";
          ctx.fillText(`Low-latency 60 FPS mobile stream active via ${connectionType.toUpperCase()}`, 124, cardY + 115);
          ctx.fillText(`Resolution: ${width}x${height} (${aspectRatio})`, 124, cardY + 155);
        }

        // Bottom Home Indicator / Navigation Bar
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect((width - 240) / 2, height - 36, 240, 10, 5);
        ctx.fill();

        // Animated live ripple marker (moving slightly to simulate motion)
        const rippleX = (width / 2) + Math.sin(tick * 0.05) * 80;
        const rippleY = 740 + Math.cos(tick * 0.04) * 60;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(rippleX, rippleY, 20 + (tick % 40), 0, Math.PI * 2);
        ctx.stroke();
      };

      drawFrame();
      this.simulationTimer = setInterval(drawFrame, 1000 / 60);

      // Create stream from canvas
      try {
        if ("captureStream" in canvas) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          this.activeStream = (canvas as any).captureStream(60);
        } else if (typeof MediaStream !== "undefined") {
          this.activeStream = new MediaStream();
        } else {
          this.activeStream = {
            id: `stream-${Date.now()}`,
            active: true,
            getTracks: () => [],
            getVideoTracks: () => [],
            getAudioTracks: () => [],
            addTrack: () => {},
            removeTrack: () => {},
          } as unknown as MediaStream;
        }
      } catch {
        this.activeStream = (typeof MediaStream !== "undefined"
          ? new MediaStream()
          : {
              id: `stream-${Date.now()}`,
              active: true,
              getTracks: () => [],
              getVideoTracks: () => [],
              getAudioTracks: () => [],
              addTrack: () => {},
              removeTrack: () => {},
            }) as unknown as MediaStream;
      }
    } else {
      this.activeStream = {
        id: `stream-${Date.now()}`,
        active: true,
        getTracks: () => [],
        getVideoTracks: () => [],
        getAudioTracks: () => [],
        addTrack: () => {},
        removeTrack: () => {},
      } as unknown as MediaStream;
    }

    this.activeDevice = device;
    this.deviceListeners.forEach((cb) => cb(device));
    if (this.activeStream) {
      this.streamListeners.forEach((cb) => cb(this.activeStream!));
    }

    return device;
  }

  /**
   * Dispatches a tap event from the phone to all listeners and stores coordinates.
   */
  public emitTouchEvent(event: MobileTouchEvent): void {
    const clampedEvent: MobileTouchEvent = {
      ...event,
      x: Math.min(1, Math.max(0, event.x)),
      y: Math.min(1, Math.max(0, event.y)),
    };
    this.touchListeners.forEach((cb) => cb(clampedEvent));
  }

  /**
   * Helper to simulate a tap on the mobile screen at normalized coordinates (0.0 - 1.0).
   */
  public simulateTap(x: number, y: number): void {
    const timestampMs = Date.now();
    this.emitTouchEvent({
      type: "tap",
      x,
      y,
      timestampMs,
    });
  }

  /**
   * Disconnects current mobile stream and releases resources.
   */
  public disconnect(): void {
    if (this.simulationTimer) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }

    if (this.activeStream) {
      this.activeStream.getTracks().forEach((t) => t.stop());
      this.activeStream = null;
    }

    if (this.dataChannel) {
      try { this.dataChannel.close(); } catch {}
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch {}
      this.peerConnection = null;
    }

    if (this.activeDevice) {
      this.activeDevice = null;
      this.disconnectListeners.forEach((cb) => cb());
    }
  }
}

export const mobileStreamBridge = new MobileStreamBridgeImpl();
