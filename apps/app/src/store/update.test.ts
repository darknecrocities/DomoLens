import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUpdateStore, setUpdateProvider, formatBytes } from "./update";
import { useRecorder } from "./recorder";
import { useToasts } from "./toast";

describe("useUpdateStore", () => {
  beforeEach(() => {
    useUpdateStore.getState().reset();
    useRecorder.setState({ state: "idle" });
    useToasts.setState({ toasts: [] });
    setUpdateProvider(null);
  });

  it("formats bytes accurately", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1024 * 1024 * 42.5)).toBe("42.5 MB");
    expect(formatBytes(1024 * 1024 * 1024 * 2)).toBe("2 GB");
  });

  it("handles up-to-date state correctly", async () => {
    const mockCheck = vi.fn().mockResolvedValue(null);
    const mockRelaunch = vi.fn().mockResolvedValue(undefined);

    setUpdateProvider({
      check: mockCheck,
      relaunch: mockRelaunch,
    });

    const res = await useUpdateStore.getState().checkForUpdates({ silent: true });
    expect(res).toBe(false);
    expect(useUpdateStore.getState().status).toBe("up-to-date");
    expect(useUpdateStore.getState().isChecking).toBe(false);
    expect(useUpdateStore.getState().updateInfo).toBeNull();
    expect(useUpdateStore.getState().isModalOpen).toBe(false);
  });

  it("detects available update and opens modal on non-silent check", async () => {
    const mockDownload = vi.fn().mockResolvedValue(undefined);
    setUpdateProvider({
      check: vi.fn().mockResolvedValue({
        version: "0.2.0",
        currentVersion: "0.1.9",
        date: "2026-10-08",
        body: "Major performance upgrade and new customization features",
        downloadAndInstall: mockDownload,
      }),
      relaunch: vi.fn(),
    });

    const res = await useUpdateStore.getState().checkForUpdates({ silent: false });
    expect(res).toBe(true);
    expect(useUpdateStore.getState().status).toBe("available");
    expect(useUpdateStore.getState().isModalOpen).toBe(true);
    expect(useUpdateStore.getState().updateInfo?.version).toBe("0.2.0");
    expect(useUpdateStore.getState().updateInfo?.currentVersion).toBe("0.1.9");
  });

  it("anti-spam: suppresses checks while screen recording is active", async () => {
    const mockCheck = vi.fn().mockResolvedValue(null);
    setUpdateProvider({
      check: mockCheck,
      relaunch: vi.fn(),
    });

    useRecorder.setState({ state: "recording" });
    const resRecording = await useUpdateStore.getState().checkForUpdates();
    expect(resRecording).toBe(false);
    expect(mockCheck).not.toHaveBeenCalled();

    useRecorder.setState({ state: "paused" });
    const resPaused = await useUpdateStore.getState().checkForUpdates();
    expect(resPaused).toBe(false);
    expect(mockCheck).not.toHaveBeenCalled();

    useRecorder.setState({ state: "idle" });
    const resIdle = await useUpdateStore.getState().checkForUpdates({ silent: true });
    expect(mockCheck).toHaveBeenCalledTimes(1);
    expect(resIdle).toBe(false);
  });

  it("anti-spam: background check does not open modal and respects dismiss cooldown", async () => {
    const mockDownload = vi.fn().mockResolvedValue(undefined);
    setUpdateProvider({
      check: vi.fn().mockResolvedValue({
        version: "0.2.0",
        currentVersion: "0.1.9",
        downloadAndInstall: mockDownload,
      }),
      relaunch: vi.fn(),
    });

    // 1. Silent background check
    await useUpdateStore.getState().checkForUpdates({ silent: true });
    expect(useUpdateStore.getState().status).toBe("available");
    expect(useUpdateStore.getState().isModalOpen).toBe(false); // Modal MUST stay closed!
    expect(useToasts.getState().toasts.length).toBe(1); // Non-spammy gentle toast notification

    // User dismisses this update version
    useUpdateStore.getState().dismissUpdate();
    expect(useUpdateStore.getState().dismissedVersion).toBe("0.2.0");

    // Clear toasts
    useToasts.setState({ toasts: [] });

    // 2. Subsequent background check should NOT re-toast the same dismissed version
    await useUpdateStore.getState().checkForUpdates({ silent: true });
    expect(useToasts.getState().toasts.length).toBe(0); // Zero spam!
  });

  it("tracks real-time progress bar through Started, Progress, and Finished events", async () => {
    const mockDownload = vi.fn().mockImplementation(async (onEvent) => {
      // Simulate Started event with total size of 10 MB
      onEvent({ event: "Started", data: { contentLength: 10 * 1024 * 1024 } });
      // Simulate Progress event 1 (2.5 MB = 25%)
      onEvent({ event: "Progress", data: { chunkLength: 2.5 * 1024 * 1024 } });
      // Simulate Progress event 2 (2.5 MB = 50% cumulative)
      onEvent({ event: "Progress", data: { chunkLength: 2.5 * 1024 * 1024 } });
      // Simulate Finished event
      onEvent({ event: "Finished" });
    });

    setUpdateProvider({
      check: vi.fn().mockResolvedValue({
        version: "0.2.0",
        currentVersion: "0.1.9",
        downloadAndInstall: mockDownload,
      }),
      relaunch: vi.fn(),
    });

    await useUpdateStore.getState().checkForUpdates({ silent: true });
    expect(useUpdateStore.getState().status).toBe("available");

    const downloadPromise = useUpdateStore.getState().startDownload();
    await downloadPromise;

    expect(useUpdateStore.getState().status).toBe("ready");
    expect(useUpdateStore.getState().downloadProgress).toBe(100);
    expect(useUpdateStore.getState().downloadedBytes).toBe(10 * 1024 * 1024);
    expect(useUpdateStore.getState().totalBytes).toBe(10 * 1024 * 1024);
  });

  it("handles download errors gracefully without crashing the app", async () => {
    const mockDownload = vi.fn().mockRejectedValue(new Error("Network connection lost"));

    setUpdateProvider({
      check: vi.fn().mockResolvedValue({
        version: "0.2.0",
        currentVersion: "0.1.9",
        downloadAndInstall: mockDownload,
      }),
      relaunch: vi.fn(),
    });

    await useUpdateStore.getState().checkForUpdates({ silent: true });
    const res = await useUpdateStore.getState().startDownload();

    expect(res).toBe(false);
    expect(useUpdateStore.getState().status).toBe("error");
    expect(useUpdateStore.getState().errorMessage).toContain("Network connection lost");
  });

  it("compares SemVer versions accurately across varied tag formats", async () => {
    const { compareSemVer } = await import("./update");
    expect(compareSemVer("0.1.46", "0.1.43")).toBeGreaterThan(0);
    expect(compareSemVer("v0.1.46", "0.1.46")).toBe(0);
    expect(compareSemVer("0.1.9", "0.1.46")).toBeLessThan(0);
    expect(compareSemVer("1.0.0", "0.9.9")).toBeGreaterThan(0);
    expect(compareSemVer("v0.2.0-beta", "0.1.9")).toBeGreaterThan(0);
  });

  it("resolves up-to-date status via GitHub Releases fallback when version matches", async () => {
    const { checkGitHubReleasesFallback } = await import("./update");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v0.1.46",
        name: "DomoLens v0.1.46",
        published_at: "2026-10-09T18:00:00Z",
        html_url: "https://github.com/darknecrocities/DomoLens/releases/tag/v0.1.46",
        assets: [
          { name: "DomoLens-Windows-Setup.exe", browser_download_url: "https://github.com/win.exe", size: 100 },
          { name: "DomoLens-macOS.dmg", browser_download_url: "https://github.com/mac.dmg", size: 100 },
          { name: "DomoLens-Linux.AppImage", browser_download_url: "https://github.com/linux.appimage", size: 100 },
        ],
      }),
    } as any);

    try {
      const res = await checkGitHubReleasesFallback("0.1.46");
      expect(res.isHandled).toBe(true);
      expect(res.status).toBe("up-to-date");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("detects newer version and identifies appropriate platform installer in fallback mode", async () => {
    const { checkGitHubReleasesFallback } = await import("./update");

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v0.1.46",
        name: "DomoLens v0.1.46",
        body: "Performance overhaul and bug fixes",
        published_at: "2026-10-09T18:00:00Z",
        html_url: "https://github.com/darknecrocities/DomoLens/releases/tag/v0.1.46",
        assets: [
          { name: "DomoLens-Windows-Setup.exe", browser_download_url: "https://github.com/win.exe", size: 100 },
          { name: "DomoLens-Universal.dmg", browser_download_url: "https://github.com/mac.dmg", size: 100 },
          { name: "DomoLens-Linux.AppImage", browser_download_url: "https://github.com/linux.appimage", size: 100 },
        ],
      }),
    } as any);

    try {
      // User is on older version 0.1.9
      const res = await checkGitHubReleasesFallback("0.1.9");
      expect(res.isHandled).toBe(true);
      expect(res.status).toBe("available");
      expect(res.updateInfo?.version).toBe("0.1.46");
      expect(res.updateInfo?.currentVersion).toBe("0.1.9");
      expect(res.updateInfo?.downloadUrl).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
