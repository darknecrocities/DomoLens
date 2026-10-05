import { describe, expect, it } from "vitest";
import {
  cleanProjectName,
  fileExtension,
  formatDuration,
  formatWhen,
  isSupportedVideo,
  projectNameFromFile,
} from "./format";
import { DEFAULT_PROJECT_NAME, MAX_PROJECT_NAME_LENGTH } from "./project";

describe("file types", () => {
  it("reads extensions from names and paths", () => {
    expect(fileExtension("demo.MP4")).toBe("mp4");
    expect(fileExtension("/Users/me/Movies/a.b.mov")).toBe("mov");
    expect(fileExtension("C:\\clips\\take.webm")).toBe("webm");
    expect(fileExtension(".hidden")).toBe("");
    expect(fileExtension("noext")).toBe("");
  });

  it("accepts only supported videos", () => {
    expect(isSupportedVideo("a.mp4")).toBe(true);
    expect(isSupportedVideo("a.MKV")).toBe(true);
    expect(isSupportedVideo("a.png")).toBe(false);
    expect(isSupportedVideo("a.mp4.exe")).toBe(false);
  });
});

describe("project names", () => {
  it("tidies spaces and control characters", () => {
    expect(cleanProjectName("  My\t demo \n")).toBe("My demo");
    expect(cleanProjectName("a\u0000b")).toBe("ab");
  });

  it("falls back when empty", () => {
    expect(cleanProjectName("   ")).toBe(DEFAULT_PROJECT_NAME);
  });

  it("limits length", () => {
    expect(Array.from(cleanProjectName("x".repeat(500))).length).toBe(MAX_PROJECT_NAME_LENGTH);
  });

  it("builds a name from a file", () => {
    expect(projectNameFromFile("/tmp/my-demo_final.mp4")).toBe("my demo final");
    expect(projectNameFromFile(".mp4")).toBe(".mp4");
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(42_000)).toBe("0:42");
    expect(formatDuration(725_000)).toBe("12:05");
    expect(formatDuration(3_723_000)).toBe("1:02:03");
  });

  it("handles unknown values", () => {
    expect(formatDuration(null)).toBe("--:--");
    expect(formatDuration(Number.NaN)).toBe("--:--");
  });
});

describe("formatWhen", () => {
  const now = new Date(2026, 9, 3, 15, 0, 0).getTime();

  it("uses friendly words", () => {
    expect(formatWhen(now - 10_000, now)).toBe("Just now");
    expect(formatWhen(now - 5 * 60_000, now)).toBe("5 min ago");
    expect(formatWhen(now - 3 * 3_600_000, now)).toBe("3 hours ago");
    expect(formatWhen(new Date(2026, 9, 2, 20, 0).getTime(), now)).toBe("Yesterday");
    expect(formatWhen(new Date(2026, 8, 30, 12, 0).getTime(), now)).toBe("3 days ago");
    expect(formatWhen(new Date(2026, 6, 14).getTime(), now)).toBe("Jul 14");
    expect(formatWhen(new Date(2025, 0, 2).getTime(), now)).toBe("Jan 2, 2025");
  });
});
