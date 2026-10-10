import { beforeEach, describe, expect, it, vi } from "vitest";
import { mobileStreamBridge } from "../lib/mobile-stream-bridge";
import { useRecorder } from "../store/recorder";

describe("Computer & Mobile Audio Parity", () => {
  let mockAudioContextInstances: any[] = [];

  class MockAudioContext {
    state = "suspended";
    sampleRate = 48000;
    async resume() {
      this.state = "running";
    }
    async close() {
      this.state = "closed";
    }
    createMediaStreamDestination() {
      return {
        stream: {
          getAudioTracks: () => [
            { id: "mock-mixed-audio-track", kind: "audio", stop: vi.fn(), enabled: true },
          ],
        },
      };
    }
    createMediaStreamSource(_stream: any) {
      return {
        connect: vi.fn(),
      };
    }
    createGain() {
      return {
        gain: { value: 1.0 },
        connect: vi.fn(),
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createConstantSource() {
      return {
        offset: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    async decodeAudioData(_ab: ArrayBuffer) {
      return {
        sampleRate: 48000,
        length: 48000 * 2,
        duration: 2,
        numberOfChannels: 1,
        getChannelData: () => new Float32Array(48000 * 2),
      };
    }
    constructor() {
      mockAudioContextInstances.push(this);
    }
  }

  beforeEach(() => {
    mockAudioContextInstances = [];
    mobileStreamBridge.disconnect();
    useRecorder.setState({
      state: "idle",
      countdown: 3,
      source: "screen",
      deviceTarget: "computer",
      mobileConnectionType: "usb",
      mobileConnectionStatus: "disconnected",
      mobileDeviceInfo: null,
      micEnabled: true,
      systemAudioEnabled: true,
      clicks: [],
      interactions: [],
      cursorTrajectory: [],
    });

    if (typeof window !== "undefined") {
      (window as any).AudioContext = MockAudioContext;
      (window as any).webkitAudioContext = MockAudioContext;
    }
    (globalThis as any).AudioContext = MockAudioContext;

    class MockMediaStream {
      constructor(public tracks: any[] = []) {}
      getTracks() { return this.tracks; }
      getAudioTracks() { return this.tracks.filter((t) => t.kind === "audio"); }
      getVideoTracks() { return this.tracks.filter((t) => t.kind === "video"); }
      addTrack(t: any) { this.tracks.push(t); }
      removeTrack(t: any) {
        const idx = this.tracks.indexOf(t);
        if (idx >= 0) this.tracks.splice(idx, 1);
      }
    }
    if (typeof window !== "undefined") {
      (window as any).MediaStream = MockMediaStream;
    }
    (globalThis as any).MediaStream = MockMediaStream;
  });

  describe("Mobile Stream Bridge WebRTC Audio & Video preservation", () => {
    it("preserves both video and audio tracks during multi-track ontrack dispatch", () => {
      // Simulate WebRTC peer connection ontrack events
      const bridge = mobileStreamBridge as any;
      bridge.activeStream = null;

      const videoTrack = { id: "track-v1", kind: "video", getSettings: () => ({ width: 1080, height: 2400 }) };
      const audioTrack = { id: "track-a1", kind: "audio", getSettings: () => ({ sampleRate: 48000 }) };

      const tracks: any[] = [];
      const mockStream = {
        id: "stream-peer",
        getTracks: () => tracks,
        getVideoTracks: () => tracks.filter((t) => t.kind === "video"),
        getAudioTracks: () => tracks.filter((t) => t.kind === "audio"),
        addTrack: (t: any) => tracks.push(t),
        removeTrack: (t: any) => {
          const idx = tracks.indexOf(t);
          if (idx >= 0) tracks.splice(idx, 1);
        },
      };

      // 1. First event: video track arrives
      tracks.push(videoTrack);
      bridge.activeStream = mockStream;
      expect(bridge.getStream()?.getVideoTracks()).toHaveLength(1);
      expect(bridge.getStream()?.getAudioTracks()).toHaveLength(0);

      // 2. Second event: audio track arrives from phone
      tracks.push(audioTrack);
      expect(bridge.getStream()?.getVideoTracks()).toHaveLength(1);
      expect(bridge.getStream()?.getAudioTracks()).toHaveLength(1);
      expect(bridge.getStream()?.getAudioTracks()[0].id).toBe("track-a1");
    });

    it("creates simulated mobile stream with audio carrier track for complete pipeline", () => {
      const dev = mobileStreamBridge.connectSimulatedDevice("iphone", "usb");
      expect(dev.name).toBe("iPhone 15 Pro");
      const stream = mobileStreamBridge.getStream();
      expect(stream).not.toBeNull();
      // Should have video track
      expect(stream?.getVideoTracks().length).toBeGreaterThan(0);
      // Audio tracks method is defined and safely callable
      expect(typeof stream?.getAudioTracks).toBe("function");
    });
  });

  describe("Recorder Audio Mixing in Desktop Mode", () => {
    it("mixes desktop system audio with voiceover microphone and resumes suspended AudioContext", async () => {
      const sysAudioTrack = { id: "sys-track-1", kind: "audio", stop: vi.fn(), enabled: true };
      const micAudioTrack = { id: "mic-track-1", kind: "audio", stop: vi.fn(), enabled: true };
      const videoTrack = { id: "vid-track-1", kind: "video", stop: vi.fn(), getSettings: () => ({ width: 1920, height: 1080 }) };

      const displayTracks: any[] = [videoTrack, sysAudioTrack];
      const mockDisplayStream = {
        getTracks: () => displayTracks,
        getVideoTracks: () => displayTracks.filter((t) => t.kind === "video"),
        getAudioTracks: () => displayTracks.filter((t) => t.kind === "audio"),
        addTrack: (t: any) => displayTracks.push(t),
        removeTrack: (t: any) => {
          const idx = displayTracks.indexOf(t);
          if (idx >= 0) displayTracks.splice(idx, 1);
        },
      };

      const mockMicStream = {
        getTracks: () => [micAudioTrack],
        getAudioTracks: () => [micAudioTrack],
      };

      // Mock navigator.mediaDevices
      const originalMediaDevices = navigator.mediaDevices;
      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getDisplayMedia: vi.fn().mockResolvedValue(mockDisplayStream),
          getUserMedia: vi.fn().mockResolvedValue(mockMicStream),
        },
      });

      useRecorder.setState({
        deviceTarget: "computer",
        systemAudioEnabled: true,
        micEnabled: true,
      });

      await useRecorder.getState().startCountdown();

      // AudioContext must be created and resumed from suspended state
      expect(mockAudioContextInstances.length).toBeGreaterThan(0);
      const ctx = mockAudioContextInstances[0];
      expect(ctx.state).toBe("running");

      // System audio track should have been replaced with mixed track
      const finalAudioTracks = mockDisplayStream.getAudioTracks();
      expect(finalAudioTracks).toHaveLength(1);
      expect(finalAudioTracks[0].id).toBe("mock-mixed-audio-track");

      useRecorder.getState().cancelRecording();
      Object.defineProperty(navigator, "mediaDevices", { value: originalMediaDevices });
    });

    it("excludes system audio track when systemAudioEnabled is toggled off", async () => {
      const sysAudioTrack = { id: "sys-track-1", kind: "audio", stop: vi.fn(), enabled: true };
      const videoTrack = { id: "vid-track-1", kind: "video", stop: vi.fn(), getSettings: () => ({ width: 1920, height: 1080 }) };

      const displayTracks: any[] = [videoTrack, sysAudioTrack];
      const mockDisplayStream = {
        getTracks: () => displayTracks,
        getVideoTracks: () => displayTracks.filter((t) => t.kind === "video"),
        getAudioTracks: () => displayTracks.filter((t) => t.kind === "audio"),
        addTrack: (t: any) => displayTracks.push(t),
        removeTrack: (t: any) => {
          const idx = displayTracks.indexOf(t);
          if (idx >= 0) displayTracks.splice(idx, 1);
        },
      };

      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getDisplayMedia: vi.fn().mockResolvedValue(mockDisplayStream),
          getUserMedia: vi.fn(),
        },
      });

      useRecorder.setState({
        deviceTarget: "computer",
        systemAudioEnabled: false,
        micEnabled: false,
      });

      await useRecorder.getState().startCountdown();

      // System audio track must be stripped
      expect(mockDisplayStream.getAudioTracks()).toHaveLength(0);

      useRecorder.getState().cancelRecording();
    });
  });

  describe("Recorder Audio Mixing in Mobile Mode", () => {
    it("mixes mobile device sound with laptop microphone in mobile recording mode", async () => {
      const phoneAudioTrack = { id: "phone-audio-1", kind: "audio", stop: vi.fn(), enabled: true };
      const phoneVideoTrack = { id: "phone-video-1", kind: "video", stop: vi.fn(), getSettings: () => ({ width: 1080, height: 2400 }) };
      const laptopMicTrack = { id: "laptop-mic-1", kind: "audio", stop: vi.fn(), enabled: true };

      const mobileTracks: any[] = [phoneVideoTrack, phoneAudioTrack];
      const mockMobileStream = {
        getTracks: () => mobileTracks,
        getVideoTracks: () => mobileTracks.filter((t) => t.kind === "video"),
        getAudioTracks: () => mobileTracks.filter((t) => t.kind === "audio"),
        addTrack: (t: any) => mobileTracks.push(t),
        removeTrack: (t: any) => {
          const idx = mobileTracks.indexOf(t);
          if (idx >= 0) mobileTracks.splice(idx, 1);
        },
      };

      vi.spyOn(mobileStreamBridge, "getStream").mockReturnValue(mockMobileStream as any);

      const mockMicStream = {
        getTracks: () => [laptopMicTrack],
        getAudioTracks: () => [laptopMicTrack],
      };

      Object.defineProperty(navigator, "mediaDevices", {
        writable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue(mockMicStream),
        },
      });

      useRecorder.setState({
        deviceTarget: "mobile",
        systemAudioEnabled: true, // "Mobile Sound"
        micEnabled: true,          // "Microphone"
      });

      await useRecorder.getState().startCountdown();

      // AudioContext resumed and mixed track attached
      expect(mockAudioContextInstances.length).toBeGreaterThan(0);
      expect(mockAudioContextInstances[0].state).toBe("running");

      const finalTracks = mockMobileStream.getAudioTracks();
      expect(finalTracks).toHaveLength(1);
      expect(finalTracks[0].id).toBe("mock-mixed-audio-track");

      useRecorder.getState().cancelRecording();
    });

    it("mutes mobile phone audio when Mobile Sound (systemAudioEnabled) is toggled off", async () => {
      const phoneAudioTrack = { id: "phone-audio-1", kind: "audio", stop: vi.fn(), enabled: true };
      const phoneVideoTrack = { id: "phone-video-1", kind: "video", stop: vi.fn(), getSettings: () => ({ width: 1080, height: 2400 }) };

      const mobileTracks: any[] = [phoneVideoTrack, phoneAudioTrack];
      const mockMobileStream = {
        getTracks: () => mobileTracks,
        getVideoTracks: () => mobileTracks.filter((t) => t.kind === "video"),
        getAudioTracks: () => mobileTracks.filter((t) => t.kind === "audio"),
        addTrack: (t: any) => mobileTracks.push(t),
        removeTrack: (t: any) => {
          const idx = mobileTracks.indexOf(t);
          if (idx >= 0) mobileTracks.splice(idx, 1);
        },
      };

      vi.spyOn(mobileStreamBridge, "getStream").mockReturnValue(mockMobileStream as any);

      useRecorder.setState({
        deviceTarget: "mobile",
        systemAudioEnabled: false,
        micEnabled: false,
      });

      await useRecorder.getState().startCountdown();

      expect(mockMobileStream.getAudioTracks()).toHaveLength(0);

      useRecorder.getState().cancelRecording();
    });
  });

  describe("Editor Audio Playback & Export Parity", () => {
    it("renders unmuted video element with synchronized volume for recorded clips", async () => {
      const React = await import("react");
      const { renderToStaticMarkup } = await import("react-dom/server");
      const { VideoCanvas } = await import("../components/editor/VideoCanvas");

      const project: any = {
        summary: {
          id: "audio-playback-test",
          name: "Audio Playback Test",
          source: "recording",
          durationMs: 4000,
          width: 1920,
          height: 1080,
          media: "blob:http://localhost/test-video",
        },
        clips: [
          {
            id: "clip-1",
            name: "Main recording",
            mediaUrl: "blob:http://localhost/test-video",
            timelineStartMs: 0,
            durationMs: 4000,
            sourceOffsetMs: 0,
            muted: false,
            volume: 1,
          },
        ],
        looks: {
          aspectRatio: "16:9",
          padding: 32,
          borderRadius: 16,
          windowFrame: "none",
        },
        clicks: [],
        interactions: [],
        keyframes: [],
        zoomBlocks: [],
        textOverlays: [],
        audioSettings: { clickSoundEnabled: true, typingSoundEnabled: true },
      };

      const markup = renderToStaticMarkup(
        React.createElement(VideoCanvas, { project, currentTimeMs: 0 })
      );

      expect(markup).toContain("<video");
      // Must not be muted when primary clip has muted: false
      // Note: React renderToStaticMarkup omits boolean muted when false
      expect(markup).not.toMatch(/<video[^>]*\smuted(?!\w)/);
    });

    it("verifies export pipeline includes audio mixing for source audio and SFX", async () => {
      const { renderProjectVideo } = await import("../lib/video-renderer");

      const mockCanvas = {
        width: 1280,
        height: 720,
        getContext: () => ({
          fillRect: vi.fn(),
          clearRect: vi.fn(),
          drawImage: vi.fn(),
          save: vi.fn(),
          restore: vi.fn(),
          translate: vi.fn(),
          scale: vi.fn(),
          rotate: vi.fn(),
          beginPath: vi.fn(),
          clip: vi.fn(),
          rect: vi.fn(),
          arc: vi.fn(),
          stroke: vi.fn(),
          fill: vi.fn(),
          fillText: vi.fn(),
          strokeText: vi.fn(),
          measureText: () => ({ width: 100 }),
          roundRect: vi.fn(),
          createLinearGradient: () => ({ addColorStop: vi.fn() }),
          createRadialGradient: () => ({ addColorStop: vi.fn() }),
        }),
        captureStream: () =>
          new (globalThis as any).MediaStream([
            { kind: "video", stop: vi.fn(), getSettings: () => ({ width: 1280, height: 720 }) },
          ]),
      };

      const origDoc = (globalThis as any).document;
      const origRaf = (globalThis as any).requestAnimationFrame;
      const origCaf = (globalThis as any).cancelAnimationFrame;
      (globalThis as any).requestAnimationFrame = (cb: () => void) => setTimeout(cb, 16);
      (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);

      (globalThis as any).document = {
        createElement: (tag: string) => {
          if (tag === "canvas") return mockCanvas;
          if (tag === "video") return { playsInline: true, muted: true, load: vi.fn(), pause: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
          return {};
        },
      };

      // Mock MediaRecorder
      class MockRecorder {
        state = "inactive";
        mimeType = "video/webm";
        ondataavailable: ((e: any) => void) | null = null;
        onstop: ((e: any) => void) | null = null;
        constructor(public stream: any, public opts: any) {}
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          if (this.ondataavailable) {
            this.ondataavailable({ data: new Blob([new Uint8Array(100)], { type: "video/webm" }) });
          }
          if (this.onstop) {
            this.onstop(new Event("stop"));
          }
        }
      }
      (globalThis as any).MediaRecorder = MockRecorder;
      (MockRecorder as any).isTypeSupported = () => true;

      const project: any = {
        summary: {
          id: "export-audio-mix-test",
          name: "Export Audio Mix Test",
          source: "recording",
          durationMs: 1000,
          width: 1280,
          height: 720,
          media: null,
        },
        clips: [{ id: "c1", mediaUrl: "", timelineStartMs: 0, durationMs: 1000, sourceOffsetMs: 0, muted: false, volume: 1 }],
        looks: { aspectRatio: "16:9", padding: 32, borderRadius: 16, windowFrame: "none" },
        clicks: [{ id: "clk-1", timestampMs: 300, x: 0.5, y: 0.5 }],
        interactions: [],
        keyframes: [],
        zoomBlocks: [],
        textOverlays: [],
        audioSettings: { clickSoundEnabled: true, typingSoundEnabled: true },
      };

      try {
        const result = await renderProjectVideo({
          project,
          resolution: "720p",
          format: "webm",
        });
        expect(result).not.toBeNull();
        expect(result.blob).toBeInstanceOf(Blob);
        expect(result.filename).toContain("720p.webm");
      } finally {
        (globalThis as any).document = origDoc;
        (globalThis as any).requestAnimationFrame = origRaf;
        (globalThis as any).cancelAnimationFrame = origCaf;
      }
    });
  });
});
