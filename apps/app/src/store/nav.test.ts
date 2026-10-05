import { beforeEach, describe, expect, it } from "vitest";
import { screenKey, useNav } from "./nav";

describe("useNav store", () => {
  beforeEach(() => {
    useNav.setState({ screen: { name: "home" }, direction: 1 });
  });

  it("starts at home screen", () => {
    const state = useNav.getState();
    expect(state.screen).toEqual({ name: "home" });
    expect(screenKey(state.screen)).toBe("home");
  });

  it("navigates to record screen with direction 1", () => {
    useNav.getState().go({ name: "record" });
    const state = useNav.getState();
    expect(state.screen).toEqual({ name: "record" });
    expect(state.direction).toBe(1);
    expect(screenKey(state.screen)).toBe("record");
  });

  it("navigates to project screen with stable key", () => {
    useNav.getState().go({ name: "project", id: "proj-123" });
    const state = useNav.getState();
    expect(state.screen).toEqual({ name: "project", id: "proj-123" });
    expect(screenKey(state.screen)).toBe("project:proj-123");
  });

  it("navigates back to home with direction -1", () => {
    useNav.getState().go({ name: "record" });
    useNav.getState().back();
    const state = useNav.getState();
    expect(state.screen).toEqual({ name: "home" });
    expect(state.direction).toBe(-1);
  });
});
