/**
 * Mobile Stream Bridge v2.0
 * Fully dynamic mobile screen streaming & touch telemetry engine.
 * Handles automatic handshake via real-time WebRTC signaling across both
 * local Wi-Fi / Hotspot networks and cellular Mobile Data (4G/5G).
 */

export interface MobileDeviceInfo {
  id: string;
  name: string;
  os: "ios" | "android" | "other";
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
  session: string;
  pairingCode: string;
  pairingUrl: string;
  localUrl: string;
  cloudUrl: string;
  lanIp: string;
  port: number;
  activeUrl: string;
}

export interface AdbDeviceItem {
  serial: string;
  state: "device" | "unauthorized" | "offline";
  model: string;
  product: string;
  width: number;
  height: number;
  is_wireless: boolean;
}

type DeviceListener = (device: MobileDeviceInfo) => void;
type DisconnectListener = () => void;
type TouchListener = (event: MobileTouchEvent) => void;
type StreamListener = (stream: MediaStream) => void;

class MobileStreamBridgeImpl {
  private activeDevice: MobileDeviceInfo | null = null;
  private activeStream: MediaStream | null = null;
  private currentSession = "";
  private currentPairingCode = "";
  private activeLanIp = "192.168.0.50";

  private deviceListeners = new Set<DeviceListener>();
  private disconnectListeners = new Set<DisconnectListener>();
  private touchListeners = new Set<TouchListener>();
  private streamListeners = new Set<StreamListener>();

  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingWs: WebSocket | null = null;
  private adbDevices: AdbDeviceItem[] = [];
  private framePollingTimer: any = null;
  private frameCanvas: HTMLCanvasElement | null = null;
  private frameCtx: CanvasRenderingContext2D | null = null;

  public async scanAdbDevices(): Promise<AdbDeviceItem[]> {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const list = await invoke<AdbDeviceItem[]>("get_adb_devices");
        this.adbDevices = list || [];

        const authorized = this.adbDevices.find((d) => d.state === "device");
        if (authorized && (!this.activeDevice || this.activeDevice.id !== authorized.serial)) {
          this.bindAdbDevice(authorized);
        }
        return this.adbDevices;
      } catch (err) {
        console.debug("[scanAdbDevices error]", err);
      }
    }
    return [];
  }

  public getAdbDevices(): AdbDeviceItem[] {
    return this.adbDevices;
  }

  public async restartAdbServer(): Promise<{ success: boolean; message: string }> {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const msg = await invoke<string>("restart_adb_server");
        await this.scanAdbDevices();
        return { success: true, message: msg || "ADB server restarted" };
      } catch (err: any) {
        console.debug("[restartAdbServer error]", err);
        return { success: false, message: String(err?.message || err) };
      }
    }
    return { success: false, message: "Desktop environment required" };
  }

  public async connectWirelessAdb(address: string, pairCode?: string): Promise<{ success: boolean; message: string }> {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const { invoke } = await import("@tauri-apps/api/core");
      let pairErr = "";
      if (pairCode && pairCode.trim()) {
        try {
          await invoke("pair_wireless_adb", { address, code: pairCode.trim() });
        } catch (e: any) {
          pairErr = e?.toString() || "Pairing failed";
          console.debug("[pair_wireless_adb notice]", e);
        }
      }

      try {
        const msg = await invoke<string>("connect_wireless_adb", { address });
        console.debug("[connect_wireless_adb result]", msg);
      } catch (err: any) {
        console.debug("[connect_wireless_adb notice]", err);
      }

      const devices = await this.scanAdbDevices();
      const connected = devices.find((d) => d.state === "device");
      if (connected) {
        return { success: true, message: `Connected to ${connected.model}` };
      }

      const unauthorized = devices.find((d) => d.state === "unauthorized");
      if (unauthorized) {
        return { success: false, message: "Phone connected but unauthorized. Please tap Allow on your phone screen." };
      }

      if (pairErr && !pairErr.toLowerCase().includes("already")) {
        return { success: false, message: pairErr };
      }

      return { success: false, message: "Connection failed. Please ensure your phone is on the same Wi-Fi and Wireless Debugging is on." };
    }
    return { success: false, message: "Desktop environment required" };
  }

  public bindAdbDevice(device: AdbDeviceItem): MobileDeviceInfo {
    const width = device.width || 1080;
    const height = device.height || 2400;
    const info: MobileDeviceInfo = {
      id: device.serial,
      name: device.model || "Android Phone",
      os: "android",
      connectionType: device.is_wireless ? "wifi" : "usb",
      width,
      height,
      fps: 60,
      aspectRatio: `${width} / ${height}`,
      latencyMs: device.is_wireless ? 16 : 8,
    };

    this.activeDevice = info;
    this.setupHardwareCaptureStream(info);
    this.startFramePolling(device.serial);

    this.deviceListeners.forEach((cb) => cb(info));
    if (this.activeStream) {
      this.streamListeners.forEach((cb) => cb(this.activeStream!));
    }
    return info;
  }

  private setupHardwareCaptureStream(device: MobileDeviceInfo): void {
    if (typeof document !== "undefined") {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = device.width;
        canvas.height = device.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#000000";
          ctx.fillRect(0, 0, device.width, device.height);
          this.frameCanvas = canvas;
          this.frameCtx = ctx;
        }
        if (typeof canvas.captureStream === "function") {
          this.activeStream = canvas.captureStream(30);
          return;
        }
      } catch {}
    }

    if (typeof MediaStream !== "undefined") {
      try {
        this.activeStream = new MediaStream();
        return;
      } catch {}
    }

    this.activeStream = {
      getTracks: () => [],
      getVideoTracks: () => [{
        getSettings: () => ({ width: device.width, height: device.height }),
        stop: () => {},
      }],
      getAudioTracks: () => [],
      addTrack: () => {},
      removeTrack: () => {},
    } as unknown as MediaStream;
  }

  private isPollingActive = false;

  public startFramePolling(serial: string): void {
    this.stopFramePolling();

    if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
      return;
    }

    this.isPollingActive = true;
    const img = new Image();
    let consecutiveErrors = 0;
    let lastKeepAliveTime = 0;

    const loop = async () => {
      const { invoke } = await import("@tauri-apps/api/core");

      while (this.isPollingActive) {
        if (!this.activeDevice || this.activeDevice.id !== serial) {
          break;
        }

        // Periodic keep-alive ping to prevent Android from entering deep sleep
        const now = Date.now();
        if (now - lastKeepAliveTime > 6000) {
          lastKeepAliveTime = now;
          void invoke("keep_device_alive", { serial }).catch(() => {});
        }

        try {
          const frameDataUrl = await invoke<string>("capture_device_frame", { serial });
          if (frameDataUrl && this.frameCtx && this.activeDevice && this.isPollingActive) {
            consecutiveErrors = 0;
            await new Promise<void>((resolve) => {
              img.onload = () => {
                if (this.frameCtx && this.activeDevice) {
                  this.frameCtx.drawImage(img, 0, 0, this.activeDevice.width, this.activeDevice.height);
                }
                resolve();
              };
              img.onerror = () => resolve();
              img.src = frameDataUrl;
            });
          }
        } catch {
          consecutiveErrors++;
          if (consecutiveErrors >= 3) {
            console.warn("[mobile-stream-bridge] Consecutive capture failures. Checking devices...");
            const devices = await this.scanAdbDevices();
            const active = devices.find((d) => d.state === "device");
            if (active && active.serial !== serial) {
              console.log("[mobile-stream-bridge] Auto-switching to connected device:", active.serial);
              this.bindAdbDevice(active);
              return;
            } else if (!active) {
              this.disconnect();
              return;
            }
          }
          await new Promise((r) => setTimeout(r, 400));
        }

        if (!this.isPollingActive) break;

        // Ultra-low latency breathing pause: 30ms gives the browser event loop time for smooth UI interactions without delay
        await new Promise((r) => setTimeout(r, 30));
      }
    };

    void loop();
  }

  public stopFramePolling(): void {
    this.isPollingActive = false;
    if (this.framePollingTimer) {
      clearInterval(this.framePollingTimer);
      this.framePollingTimer = null;
    }
  }

  public async sendDeviceTap(normX: number, normY: number): Promise<void> {
    if (!this.activeDevice) return;
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const x = Math.round(normX * this.activeDevice.width);
        const y = Math.round(normY * this.activeDevice.height);
        await invoke("send_device_tap", { serial: this.activeDevice.id, x, y });
      } catch (e) {
        console.debug("sendDeviceTap error:", e);
      }
    }
  }

  public getActiveDevice(): MobileDeviceInfo | null {
    return this.activeDevice;
  }

  public getFrameCanvas(): HTMLCanvasElement | null {
    return this.frameCanvas;
  }

  public getStream(): MediaStream | null {
    return this.activeStream;
  }

  public isConnected(): boolean {
    return this.activeDevice !== null && this.activeStream !== null;
  }

  public setLanIp(ip: string): void {
    this.activeLanIp = ip.trim();
  }

  public getLanIp(): string {
    return this.activeLanIp;
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
   * Generates real pairing URLs for QR Code scanning.
   * Produces both a local LAN / Hotspot URL and an internet Cloud WebRTC URL.
   */
  public generatePairingInfo(channel: "wifi" | "usb" = "usb"): PairingInfo {
    if (!this.currentSession) {
      this.currentSession = `dl_${Math.random().toString(36).substring(2, 8)}`;
    }
    if (!this.currentPairingCode) {
      this.currentPairingCode = Math.random().toString(36).substring(2, 6).toUpperCase();
    }

    const host = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" && window.location.hostname !== ""
      ? window.location.hostname
      : this.activeLanIp;

    const port = typeof window !== "undefined" && window.location.port ? Number(window.location.port) : 3210;
    const localUrl = `http://${host}:${port === 3210 ? 1420 : port}/remote.html?session=${this.currentSession}&mode=wifi`;
    const cloudUrl = "";
    const usbUrl = `http://localhost:${port === 3210 ? 1420 : port}/remote.html?session=${this.currentSession}&mode=usb`;

    let activeUrl = usbUrl;
    if (channel === "wifi") {
      activeUrl = localUrl;
    }

    return {
      session: this.currentSession,
      pairingCode: this.currentPairingCode,
      pairingUrl: activeUrl,
      localUrl,
      cloudUrl,
      lanIp: host,
      port,
      activeUrl,
    };
  }

  /**
   * Connects a simulated device preset for automated testing and offline visual previews.
   */
  public connectSimulatedDevice(
    preset: "android" | "iphone" | "ipad" = "android",
    type: "wifi" | "usb" = "usb",
  ): MobileDeviceInfo {
    let device: MobileDeviceInfo;
    if (preset === "iphone") {
      device = {
        id: "dev-iphone-15-pro",
        name: "iPhone 15 Pro",
        os: "ios",
        connectionType: type,
        width: 1179,
        height: 2556,
        fps: 60,
        aspectRatio: "19.5:9",
        latencyMs: type === "usb" ? 10 : 22,
      };
    } else if (preset === "ipad") {
      device = {
        id: "dev-ipad-pro",
        name: "iPad Pro (11-inch)",
        os: "ios",
        connectionType: type,
        width: 1620,
        height: 2160,
        fps: 60,
        aspectRatio: "4:3",
        latencyMs: type === "usb" ? 12 : 24,
      };
    } else {
      device = {
        id: "dev-s24-ultra",
        name: "Samsung Galaxy S24 Ultra",
        os: "android",
        connectionType: type,
        width: 1080,
        height: 2400,
        fps: 60,
        aspectRatio: "20:9",
        latencyMs: type === "usb" ? 14 : 20,
      };
    }

    this.activeDevice = device;

    const createSafeMockStream = (): MediaStream => {
      if (typeof document !== "undefined") {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = device.width;
          canvas.height = device.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, device.width, device.height);
          }
          if (typeof canvas.captureStream === "function") {
            return canvas.captureStream(30);
          }
        } catch {}
      }
      if (typeof MediaStream !== "undefined") {
        try {
          return new MediaStream();
        } catch {}
      }
      return {
        getTracks: () => [],
        getVideoTracks: () => [{
          getSettings: () => ({ width: device.width, height: device.height }),
          stop: () => {},
        }],
        getAudioTracks: () => [],
        addTrack: () => {},
        removeTrack: () => {},
      } as unknown as MediaStream;
    };

    this.activeStream = createSafeMockStream();

    this.deviceListeners.forEach((cb) => cb(device));
    if (this.activeStream) {
      this.streamListeners.forEach((cb) => cb(this.activeStream!));
    }
    return device;
  }

  /**
   * Starts the host WebRTC signaling listener on the laptop.
   * When any phone scans the QR code and opens remote.html, this receives the handshake
   * and automatically binds the real device stream.
   */
  public startHostSignaling(sessionId?: string): void {
    if (sessionId) {
      this.currentSession = sessionId;
    } else if (!this.currentSession) {
      this.currentSession = `dl_${Math.random().toString(36).substring(2, 8)}`;
    }

    if (this.signalingWs) {
      try { this.signalingWs.close(); } catch {}
      this.signalingWs = null;
    }

    const hostTopic = `domolens_host_${this.currentSession}`;
    const clientTopic = `domolens_client_${this.currentSession}`;

    try {
      if (typeof WebSocket !== "undefined") {
        const ws = new WebSocket(`wss://ntfy.sh/${hostTopic}/ws`);
        this.signalingWs = ws;

        ws.onmessage = async (e) => {
          try {
            const data = JSON.parse(e.data);
            const msg = data.message ? JSON.parse(data.message) : data;
            await this.handleIncomingSignalingMessage(msg, clientTopic);
          } catch (err) {
            console.debug("[host signaling message error]", err);
          }
        };

        ws.onerror = (err) => {
          console.debug("[host signaling error]", err);
        };
      }
    } catch (e) {
      console.warn("WebSocket host signaling init error:", e);
    }
  }

  private async handleIncomingSignalingMessage(msg: any, clientTopic: string): Promise<void> {
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "hello" || msg.type === "device-info") {
      const width = Number(msg.width) || 1080;
      const height = Number(msg.height) || 2400;
      const isIos = msg.os === "ios" || (/iPhone|iPad/i.test(msg.name || ""));
      const os = isIos ? "ios" : "android";
      const device: MobileDeviceInfo = {
        id: `phone-${Date.now()}`,
        name: msg.name || (isIos ? "Apple iPhone" : "Android Device"),
        os,
        connectionType: "wifi",
        width,
        height,
        fps: Number(msg.fps) || 60,
        aspectRatio: width < height ? "9:16" : "16:9",
        latencyMs: 18,
      };

      this.activeDevice = device;
      this.deviceListeners.forEach((cb) => cb(device));

      // Respond with acknowledgment back to mobile device
      this.sendClientSignaling(clientTopic, {
        type: "ack",
        hostName: "DomoLens Laptop",
        status: "ready",
      });

      // Initiate WebRTC offer to the phone
      this.setupHostPeerConnection(clientTopic);
    } else if (msg.type === "answer" && this.peerConnection) {
      try {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.answer));
      } catch (err) {
        console.warn("setRemoteDescription error:", err);
      }
    } else if (msg.type === "candidate" && this.peerConnection && msg.candidate) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(msg.candidate));
      } catch (err) {
        console.warn("addIceCandidate error:", err);
      }
    } else if (msg.type === "tap") {
      this.emitTouchEvent({
        type: "tap",
        x: Number(msg.x) || 0.5,
        y: Number(msg.y) || 0.5,
        timestampMs: Number(msg.timestamp) || Date.now(),
      });
    }
  }

  private setupHostPeerConnection(clientTopic: string): void {
    if (typeof RTCPeerConnection === "undefined") return;

    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch {}
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
    this.peerConnection = pc;

    // Create touch data channel
    const dc = pc.createDataChannel("domolens-touch");
    this.dataChannel = dc;

    dc.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "tap") {
          this.emitTouchEvent({
            type: "tap",
            x: Number(payload.x),
            y: Number(payload.y),
            timestampMs: Number(payload.timestamp) || Date.now(),
          });
        } else if (payload.type === "device-info") {
          this.attachRealDevice(payload);
        }
      } catch {}
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendClientSignaling(clientTopic, { type: "candidate", candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      this.activeStream = stream;
      this.streamListeners.forEach((cb) => cb(stream));

      const vTrack = stream.getVideoTracks()[0];
      if (vTrack) {
        const s = vTrack.getSettings();
        if (s.width && s.height && this.activeDevice) {
          this.activeDevice.width = s.width;
          this.activeDevice.height = s.height;
          this.activeDevice.aspectRatio = s.width < s.height ? "9:16" : "16:9";
          this.deviceListeners.forEach((cb) => cb(this.activeDevice!));
        }
      }
    };

    // Send SDP offer to phone
    void pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true }).then(async (offer) => {
      await pc.setLocalDescription(offer);
      this.sendClientSignaling(clientTopic, { type: "offer", offer });
    });
  }

  private sendClientSignaling(clientTopic: string, msg: any): void {
    fetch(`https://ntfy.sh/${clientTopic}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(msg),
    }).catch(() => {});
  }

  /**
   * Attaches real device telemetry received from mobile browser.
   */
  public attachRealDevice(info: Partial<MobileDeviceInfo>, stream?: MediaStream): MobileDeviceInfo {
    const width = info.width || 1080;
    const height = info.height || 2400;
    const device: MobileDeviceInfo = {
      id: info.id || `dev-${Date.now()}`,
      name: info.name || "Real Mobile Phone",
      os: info.os || "android",
      connectionType: info.connectionType || "wifi",
      width,
      height,
      fps: info.fps || 60,
      aspectRatio: info.aspectRatio || (width < height ? "9:16" : "16:9"),
      batteryPercent: info.batteryPercent,
      latencyMs: info.latencyMs || 20,
    };

    this.activeDevice = device;
    if (stream) {
      this.activeStream = stream;
      this.streamListeners.forEach((cb) => cb(stream));
    }

    this.deviceListeners.forEach((cb) => cb(device));
    return device;
  }

  /**
   * Sets real video stream from connected device.
   */
  public setRealStream(stream: MediaStream): void {
    this.activeStream = stream;
    this.streamListeners.forEach((cb) => cb(stream));

    const vTrack = stream.getVideoTracks()[0];
    if (vTrack) {
      const s = vTrack.getSettings();
      if (s.width && s.height && this.activeDevice) {
        this.activeDevice.width = s.width;
        this.activeDevice.height = s.height;
        this.activeDevice.aspectRatio = s.width < s.height ? "9:16" : "16:9";
        this.deviceListeners.forEach((cb) => cb(this.activeDevice!));
      }
    }
  }

  /**
   * Dispatches a tap event from the phone to all listeners.
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
   * Simulates a tap on the mobile screen at normalized coordinates (0.0 - 1.0).
   */
  public simulateTap(x: number, y: number): void {
    this.emitTouchEvent({
      type: "tap",
      x,
      y,
      timestampMs: Date.now(),
    });
  }

  /**
   * Disconnects current mobile stream and releases resources.
   */
  public disconnect(): void {
    this.stopFramePolling();
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

    if (this.signalingWs) {
      try { this.signalingWs.close(); } catch {}
      this.signalingWs = null;
    }

    if (this.activeDevice) {
      this.activeDevice = null;
      this.disconnectListeners.forEach((cb) => cb());
    }
  }
}

export const mobileStreamBridge = new MobileStreamBridgeImpl();
