import { describe, it, expect, beforeEach } from "vitest";
import { useTutorial, TUTORIAL_STEPS } from "./tutorial";

const storageMap = new Map<string, string>();
const fakeLocalStorage = {
  getItem: (k: string) => storageMap.get(k) ?? null,
  setItem: (k: string, v: string) => storageMap.set(k, v),
  removeItem: (k: string) => storageMap.delete(k),
  clear: () => storageMap.clear(),
};

if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = fakeLocalStorage;
}

describe("useTutorial store", () => {
  beforeEach(() => {
    fakeLocalStorage.clear();
    useTutorial.setState({
      isActive: false,
      currentStepIndex: 0,
      hasSeenTutorial: false,
    });
  });

  it("initializes with default inactive state and first step index", () => {
    const state = useTutorial.getState();
    expect(state.isActive).toBe(false);
    expect(state.currentStepIndex).toBe(0);
    expect(state.hasSeenTutorial).toBe(false);
  });

  it("starts the tutorial and activates step 0", () => {
    useTutorial.getState().startTutorial();
    const state = useTutorial.getState();
    expect(state.isActive).toBe(true);
    expect(state.currentStepIndex).toBe(0);
  });

  it("advances through steps with nextStep and navigates back with prevStep", () => {
    useTutorial.getState().startTutorial();
    expect(useTutorial.getState().currentStepIndex).toBe(0);

    useTutorial.getState().nextStep();
    expect(useTutorial.getState().currentStepIndex).toBe(1);

    useTutorial.getState().prevStep();
    expect(useTutorial.getState().currentStepIndex).toBe(0);
  });

  it("skips and persists completion state to localStorage", () => {
    useTutorial.getState().startTutorial();
    useTutorial.getState().skipTutorial();

    const state = useTutorial.getState();
    expect(state.isActive).toBe(false);
    expect(state.hasSeenTutorial).toBe(true);
    expect(fakeLocalStorage.getItem("domolens_tutorial_seen")).toBe("true");
  });

  it("resets tutorial allowing user to replay from settings", () => {
    useTutorial.getState().skipTutorial();
    expect(useTutorial.getState().hasSeenTutorial).toBe(true);

    useTutorial.getState().resetTutorial();
    const state = useTutorial.getState();
    expect(state.isActive).toBe(true);
    expect(state.currentStepIndex).toBe(0);
    expect(state.hasSeenTutorial).toBe(false);
  });

  it("completes when advancing past the final step", () => {
    useTutorial.getState().startTutorial();
    for (let i = 0; i < TUTORIAL_STEPS.length - 1; i++) {
      useTutorial.getState().nextStep();
    }
    expect(useTutorial.getState().currentStepIndex).toBe(TUTORIAL_STEPS.length - 1);

    useTutorial.getState().nextStep();
    expect(useTutorial.getState().isActive).toBe(false);
    expect(useTutorial.getState().hasSeenTutorial).toBe(true);
  });
});

describe("TUTORIAL_STEPS coverage", () => {
  it("has at least 20 unique steps with targets", () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(TUTORIAL_STEPS.map((s) => s.id)).size).toBe(TUTORIAL_STEPS.length);
    for (const s of TUTORIAL_STEPS) expect(s.targetKey.length).toBeGreaterThan(0);
  });
});
