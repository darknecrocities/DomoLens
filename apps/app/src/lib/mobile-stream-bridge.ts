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
  connectionType: "wifi" | "usb" | "cloud";
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

  public getActiveDevice(): MobileDeviceInfo | null {
    return this.activeDevice;
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
  public generatePairingInfo(channel: "wifi" | "cloud" | "usb" = "wifi"): PairingInfo {
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
    const cloudUrl = `https://vdo.ninja/?push=domolens_${this.currentSession}&screenshare=1&autostart=1`;
    const usbUrl = `http://localhost:${port === 3210 ? 1420 : port}/remote.html?session=${this.currentSession}&mode=usb`;

    let activeUrl = localUrl;
    if (channel === "cloud") {
      activeUrl = cloudUrl;
    } else if (channel === "usb") {
      activeUrl = usbUrl;
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
    type: "wifi" | "usb" | "cloud" = "wifi",
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
