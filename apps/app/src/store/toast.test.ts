import { beforeEach, describe, expect, it } from "vitest";
import { toast, useToasts } from "./toast";

describe("useToasts store", () => {
  beforeEach(() => {
    useToasts.setState({ toasts: [] });
  });

  it("shows neutral toast", () => {
    const id = toast.info("Hello world");
    const state = useToasts.getState();
    expect(state.toasts).toHaveLength(1);
    expect(state.toasts[0]?.id).toBe(id);
    expect(state.toasts[0]?.message).toBe("Hello world");
    expect(state.toasts[0]?.tone).toBe("neutral");
  });

  it("shows success toast", () => {
    toast.success("Saved successfully");
    const state = useToasts.getState();
    expect(state.toasts[0]?.tone).toBe("success");
    expect(state.toasts[0]?.message).toBe("Saved successfully");
  });

  it("shows error toast", () => {
    toast.error("Failed to save");
    const state = useToasts.getState();
    expect(state.toasts[0]?.tone).toBe("error");
    expect(state.toasts[0]?.message).toBe("Failed to save");
  });

  it("dismisses toast by id", () => {
    const id = toast.info("Dismiss me");
    expect(useToasts.getState().toasts).toHaveLength(1);
    useToasts.getState().dismiss(id);
    expect(useToasts.getState().toasts).toHaveLength(0);
  });

  it("limits visible toasts to at most 3", () => {
    toast.info("1");
    toast.info("2");
    toast.info("3");
    toast.info("4");
    const state = useToasts.getState();
    expect(state.toasts).toHaveLength(3);
    expect(state.toasts.map((t) => t.message)).toEqual(["2", "3", "4"]);
  });
});
