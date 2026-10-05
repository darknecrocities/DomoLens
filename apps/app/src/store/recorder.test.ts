import { beforeEach, describe, expect, it } from "vitest";
import { useRecorder } from "./recorder";

describe("useRecorder store", () => {
  beforeEach(() => {
    useRecorder.setState({
      state: "idle",
      countdown: 3,
      source: "screen",
      micEnabled: true,
      systemAudioEnabled: true,
      elapsedMs: 0,
      clicks: [],
    });
  });

  it("updates recording source", () => {
    useRecorder.getState().setSource("window");
    expect(useRecorder.getState().source).toBe("window");
  });

  it("toggles audio sources", () => {
    useRecorder.getState().toggleMic();
    expect(useRecorder.getState().micEnabled).toBe(false);

    useRecorder.getState().toggleSystemAudio();
    expect(useRecorder.getState().systemAudioEnabled).toBe(false);
  });

  it("records clicks during active recording", () => {
    useRecorder.setState({ state: "recording" });
    useRecorder.getState().recordClick(0.4, 0.6, "left");

    const clicks = useRecorder.getState().clicks;
    expect(clicks).toHaveLength(1);
    expect(clicks[0]?.x).toBe(0.4);
    expect(clicks[0]?.y).toBe(0.6);
    expect(clicks[0]?.button).toBe("left");
  });

  it("ignores clicks when not in recording state", () => {
    useRecorder.setState({ state: "idle" });
    useRecorder.getState().recordClick(0.4, 0.6);
    expect(useRecorder.getState().clicks).toHaveLength(0);
  });
});
