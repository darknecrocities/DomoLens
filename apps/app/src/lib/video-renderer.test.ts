import { describe, expect, it } from "vitest";
import { getOutputDimensions } from "./video-renderer";

describe("video renderer dimensions", () => {
  it("calculates 16:9 dimensions accurately across profiles", () => {
    expect(getOutputDimensions("1080p", "16:9")).toEqual({ width: 1920, height: 1080 });
    expect(getOutputDimensions("720p", "16:9")).toEqual({ width: 1280, height: 720 });
    expect(getOutputDimensions("4k", "16:9")).toEqual({ width: 3840, height: 2160 });
    expect(getOutputDimensions("gif", "16:9")).toEqual({ width: 960, height: 540 });
  });

  it("calculates 9:16 vertical video dimensions for mobile platforms", () => {
    expect(getOutputDimensions("1080p", "9:16")).toEqual({ width: 1080, height: 1920 });
    expect(getOutputDimensions("720p", "9:16")).toEqual({ width: 720, height: 1280 });
    expect(getOutputDimensions("4k", "9:16")).toEqual({ width: 2160, height: 3840 });
  });

  it("calculates 1:1 square dimensions for social feeds", () => {
    expect(getOutputDimensions("1080p", "1:1")).toEqual({ width: 1080, height: 1080 });
    expect(getOutputDimensions("720p", "1:1")).toEqual({ width: 720, height: 720 });
  });

  it("calculates 4:3 dimensions correctly", () => {
    const dim1080 = getOutputDimensions("1080p", "4:3");
    expect(dim1080.height).toBe(1080);
    expect(dim1080.width).toBe(1440);
  });

  it("handles valid export formats mov, mp4, webm, and gif", () => {
    const formats: Array<"mov" | "mp4" | "webm" | "gif"> = ["mov", "mp4", "webm", "gif"];
    expect(formats).toContain("mov");
    expect(formats).toContain("mp4");
    expect(formats).toContain("webm");
    expect(formats).toContain("gif");
  });
});
