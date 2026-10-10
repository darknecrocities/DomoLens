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
      mobileConnectionType: "usb",
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

  it("ensures mobile recordings in editor have clean phone frame (windowFrame none, radius 28, aspect 9:16)", async () => {
    const { useEditor } = await import("../store/editor");
    const { useProjects } = await import("../store/projects");
    const mobileSummary: import("@domolens/core").ProjectSummary = {
      id: "proj-mobile-test",
      name: "Samsung Galaxy A55 Recording",
      source: "recording",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      durationMs: 12000,
      width: 1080,
      height: 2340,
      thumbnail: null,
      media: null,
    };

    useProjects.setState({ projects: [mobileSummary] });
    await useEditor.getState().loadProject("proj-mobile-test");
    const proj = useEditor.getState().project;
    expect(proj).not.toBeNull();
    expect(proj?.looks.windowFrame).toBe("android");
    expect(proj?.looks.borderRadius).toBe(28);
    expect(proj?.looks.padding).toBe(24);
    expect(proj?.looks.aspectRatio).toBe("9:16");
  });

  it("self-heals legacy mobile recordings that had terminal window frame or empty zoom blocks", async () => {
    const { useEditor } = await import("../store/editor");
    const { platform } = await import("../platform");
    const legacyMobileProject: import("@domolens/core").ProjectData = {
      summary: {
        id: "legacy-mobile-proj",
        name: "Legacy Samsung A55 Recording",
        source: "recording",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        durationMs: 14000,
        width: 1080,
        height: 2340,
        thumbnail: null,
        media: null,
      },
      clicks: [],
      interactions: [],
      cursorTrajectory: [],
      zoomBlocks: [],
      keyframes: [],
      textOverlays: [],
      audioTracks: [],
      clips: [],
      looks: {
        ...useEditor.getState().project?.looks!,
        windowFrame: "terminal" as any,
        borderRadius: 16,
        padding: 32,
        aspectRatio: "16:9",
      },
      audioSettings: {
        clickSoundEnabled: true,
        clickSoundVolume: 1,
        clickSoundPreset: "click",
        typingSoundEnabled: true,
        typingSoundVolume: 1,
        typingSoundPreset: "creamy",
        musicDuckingEnabled: true,
        duckingAmount: 0.3,
      },
    };

    await platform.saveFullProject?.(legacyMobileProject as any);
    await useEditor.getState().loadProject("legacy-mobile-proj");

    const healed = useEditor.getState().project;
    expect(healed).not.toBeNull();
    // macOS terminal frame replaced with authentic mobile phone chassis frame
    expect(healed?.looks.windowFrame).toBe("android");
    expect(healed?.looks.borderRadius).toBe(28);
    expect(healed?.looks.padding).toBe(24);
    expect(healed?.looks.aspectRatio).toBe("9:16");

    // Zero zooms self-healed into active zoom blocks & keyframes
    expect(healed?.zoomBlocks.length).toBeGreaterThanOrEqual(1);
    expect(healed?.keyframes?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it("supports full suite of device chassis mockups (iPhone, Android, MacBook, Laptop, iPad, iMac)", async () => {
    const { useEditor } = await import("../store/editor");
    const deviceStyles: import("@domolens/core").WindowFrameStyle[] = [
      "iphone",
      "android",
      "macbook",
      "laptop",
      "ipad",
      "imac",
    ];

    for (const style of deviceStyles) {
      useEditor.getState().updateLooks({ windowFrame: style });
      expect(useEditor.getState().project?.looks.windowFrame).toBe(style);
    }
  });

  it("self-heals desktop frames like iMac, Safari, or Windows on mobile recordings while preserving intentional frameless mode", async () => {
    const { useEditor } = await import("../store/editor");
    const { platform } = await import("../platform");

    // Case A: Mobile recording with desktop "imac" frame auto-heals to "android"
    const mobileWithImac = {
      summary: {
        id: "mobile-imac-proj",
        name: "Samsung A55 Recording",
        source: "recording",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        durationMs: 8000,
        width: 1080,
        height: 2340,
        thumbnail: null,
        media: null,
      },
      clicks: [],
      interactions: [],
      cursorTrajectory: [],
      zoomBlocks: [{ id: "zb1", startTimeMs: 0, endTimeMs: 4000, targetX: 0.5, targetY: 0.5, scale: 1.5, enabled: true }],
      keyframes: [{ id: "kf1", timeMs: 0, targetX: 0.5, targetY: 0.5, scale: 1.5 }],
      textOverlays: [],
      audioTracks: [],
      clips: [],
      looks: {
        ...useEditor.getState().project?.looks!,
        windowFrame: "imac" as any,
        borderRadius: 12,
        padding: 32,
        aspectRatio: "9:16",
      },
      audioSettings: {
        clickSoundEnabled: true,
        clickSoundVolume: 1,
        clickSoundPreset: "click",
        typingSoundEnabled: true,
        typingSoundVolume: 1,
        typingSoundPreset: "creamy",
        musicDuckingEnabled: true,
        duckingAmount: 0.3,
      },
    };

    await platform.saveFullProject?.(mobileWithImac as any);
    await useEditor.getState().loadProject("mobile-imac-proj");
    const healed = useEditor.getState().project;
    expect(healed?.looks.windowFrame).toBe("android");
    expect(healed?.looks.borderRadius).toBe(28);

    // Case B: Explicit frameless mode (windowFrame: "none", padding: 0) is preserved
    const mobileFrameless = {
      ...mobileWithImac,
      summary: {
        ...mobileWithImac.summary,
        id: "mobile-frameless-proj",
      },
      looks: {
        ...mobileWithImac.looks,
        windowFrame: "none" as any,
        padding: 0,
        borderRadius: 0,
      },
    };

    await platform.saveFullProject?.(mobileFrameless as any);
    await useEditor.getState().loadProject("mobile-frameless-proj");
    const preservedFrameless = useEditor.getState().project;
    expect(preservedFrameless?.looks.windowFrame).toBe("none");
    expect(preservedFrameless?.looks.padding).toBe(0);
  });
});

