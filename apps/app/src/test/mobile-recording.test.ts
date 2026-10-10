import { beforeEach, describe, expect, it } from "vitest";
import { mobileStreamBridge } from "../lib/mobile-stream-bridge";
import { useRecorder } from "../store/recorder";

describe("Mobile Recording Engine & Transport", () => {
  beforeEach(() => {
    mobileStreamBridge.disconnect();
    useRecorder.setState({
      state: "idle",
      countdown: 3,
      source: "screen",
      deviceTarget: "computer",
      mobileConnectionType: "wifi",
      mobileConnectionStatus: "disconnected",
      mobileDeviceInfo: null,
      lastMobileTap: null,
      recordingMode: "auto-zoom-sfx-transcribe",
      micEnabled: true,
      systemAudioEnabled: true,
      elapsedMs: 0,
      clicks: [],
      interactions: [],
      cursorTrajectory: [],
    });
  });

  it("generates valid pairing parameters for Wi-Fi and USB", () => {
    const wifiPairing = mobileStreamBridge.generatePairingInfo("wifi");
    expect(wifiPairing.pairingCode).toMatch(/^[A-Z0-9]{4}$/);
    expect(wifiPairing.pairingUrl).toContain("mode=wifi");
    expect(wifiPairing.port).toBe(3210);

    const usbPairing = mobileStreamBridge.generatePairingInfo("usb");
    expect(usbPairing.pairingUrl).toContain("mode=usb");
  });

  it("simulates iPhone, Android, and iPad mobile devices with authentic screen metrics", () => {
    // 1. iPhone 15 Pro
    const iphone = mobileStreamBridge.connectSimulatedDevice("iphone", "wifi");
    expect(iphone.name).toBe("iPhone 15 Pro");
    expect(iphone.width).toBe(1179);
    expect(iphone.height).toBe(2556);
    expect(iphone.aspectRatio).toBe("19.5:9");
    expect(iphone.os).toBe("ios");
    expect(iphone.fps).toBe(60);
    expect(mobileStreamBridge.isConnected()).toBe(true);
    expect(mobileStreamBridge.getStream()).not.toBeNull();

    // 2. Samsung Galaxy S24 Ultra
    const galaxy = mobileStreamBridge.connectSimulatedDevice("android", "usb");
    expect(galaxy.name).toBe("Samsung Galaxy S24 Ultra");
    expect(galaxy.width).toBe(1080);
    expect(galaxy.height).toBe(2400);
    expect(galaxy.aspectRatio).toBe("20:9");
    expect(galaxy.os).toBe("android");
    expect(galaxy.latencyMs).toBeLessThanOrEqual(20);

    // 3. iPad Pro (Tablet)
    const ipad = mobileStreamBridge.connectSimulatedDevice("ipad", "wifi");
    expect(ipad.name).toBe("iPad Pro (11-inch)");
    expect(ipad.width).toBe(1620);
    expect(ipad.height).toBe(2160);
    expect(ipad.aspectRatio).toBe("4:3");
  });

  it("normalizes and dispatches mobile touch telemetry events", () => {
    const events: any[] = [];
    const unsub = mobileStreamBridge.onTouchEvent((evt) => events.push(evt));

    mobileStreamBridge.simulateTap(0.42, 0.78);
    expect(events).toHaveLength(1);
    expect(events[0]?.x).toBe(0.42);
    expect(events[0]?.y).toBe(0.78);
    expect(events[0]?.type).toBe("tap");

    // Clamps boundary touches
    mobileStreamBridge.simulateTap(-0.5, 1.5);
    expect(events).toHaveLength(2);
    expect(events[1]?.x).toBe(0);
    expect(events[1]?.y).toBe(1);

    unsub();
  });

  it("dynamically supports all 5 recording modes with mobile device recordings", async () => {
    const modes: import("../store/recorder").RecordingMode[] = [
      "auto-zoom-sfx-transcribe",
      "auto-zoom-sfx",
      "sfx-transcribe",
      "auto-zoom",
      "regular",
    ];

    const storageMap = new Map<string, string>();
    const originalStorage = globalThis.sessionStorage;
    globalThis.sessionStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => storageMap.set(key, val),
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
      length: 0,
      key: () => null,
    };

    for (const mode of modes) {
      useRecorder.setState({
        deviceTarget: "mobile",
        recordingMode: mode,
        state: "recording",
        elapsedMs: 5000,
        clicks: [
          { id: `tap-${mode}`, timestampMs: 1500, x: 0.5, y: 0.5, button: "left" },
        ],
        interactions: [
          { id: `tap-${mode}`, type: "click", timestampMs: 1500, x: 0.5, y: 0.5, button: "left" },
        ],
      });
      await useRecorder.getState().connectMobileDevice("wifi", "iphone");

      const summary = await useRecorder.getState().stopRecording();
      expect(summary).not.toBeNull();
      expect(summary?.width).toBe(1179);
      expect(summary?.height).toBe(2556);

      const saved = globalThis.sessionStorage.getItem(`domolens_project_${summary?.id}`);
      const project = JSON.parse(saved!);

      if (mode === "regular") {
        // Regular recording has 0 zoom blocks
        expect(project.zoomBlocks).toHaveLength(0);
        expect(project.audioSettings.clickSoundEnabled).toBe(false);
      } else if (mode === "auto-zoom") {
        // Auto-zoom only has zoom blocks but no click sounds
        expect(project.zoomBlocks.length).toBeGreaterThanOrEqual(1);
        expect(project.audioSettings.clickSoundEnabled).toBe(false);
      } else if (mode === "auto-zoom-sfx") {
        // Auto-zoom + SFX has zoom blocks and click sounds
        expect(project.zoomBlocks.length).toBeGreaterThanOrEqual(1);
        expect(project.audioSettings.clickSoundEnabled).toBe(true);
      } else if (mode === "auto-zoom-sfx-transcribe") {
        // All-in-one has zoom blocks and click sounds
        expect(project.zoomBlocks.length).toBeGreaterThanOrEqual(1);
        expect(project.audioSettings.clickSoundEnabled).toBe(true);
      }
    }

    globalThis.sessionStorage = originalStorage;
  });
});
