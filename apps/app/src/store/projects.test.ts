import { beforeEach, describe, expect, it } from "vitest";
import { useProjects } from "./projects";

describe("useProjects store", () => {
  beforeEach(() => {
    useProjects.setState({ projects: [], status: "idle", importing: 0 });
  });

  it("loads projects successfully", async () => {
    await useProjects.getState().load();
    const state = useProjects.getState();
    expect(state.status).toBe("ready");
    expect(Array.isArray(state.projects)).toBe(true);
  });

  it("imports a valid video file", async () => {
    const fakeFile = new File(["dummy content"], "my_cool_demo.mp4", { type: "video/mp4" });
    const imported = await useProjects.getState().importFiles([
      { kind: "file", file: fakeFile, name: "my_cool_demo.mp4" },
    ]);

    expect(imported).not.toBeNull();
    expect(imported?.name).toBe("my cool demo");
    expect(useProjects.getState().projects).toHaveLength(1);
    expect(useProjects.getState().projects[0]?.id).toBe(imported?.id);
  });

  it("rejects an invalid file format", async () => {
    const fakeDoc = new File(["text"], "notes.txt", { type: "text/plain" });
    const imported = await useProjects.getState().importFiles([
      { kind: "file", file: fakeDoc, name: "notes.txt" },
    ]);

    expect(imported).toBeNull();
    expect(useProjects.getState().projects).toHaveLength(0);
  });

  it("renames a project", async () => {
    const fakeFile = new File(["video"], "test.mp4", { type: "video/mp4" });
    const imported = await useProjects.getState().importFiles([
      { kind: "file", file: fakeFile, name: "test.mp4" },
    ]);

    expect(imported).toBeDefined();
    if (imported) {
      const ok = await useProjects.getState().rename(imported.id, "Renamed Demo");
      expect(ok).toBe(true);
      expect(useProjects.getState().projects[0]?.name).toBe("Renamed Demo");
    }
  });

  it("removes a project", async () => {
    const fakeFile = new File(["video"], "delete_me.mp4", { type: "video/mp4" });
    const imported = await useProjects.getState().importFiles([
      { kind: "file", file: fakeFile, name: "delete_me.mp4" },
    ]);

    expect(imported).toBeDefined();
    if (imported) {
      const ok = await useProjects.getState().remove(imported.id);
      expect(ok).toBe(true);
      expect(useProjects.getState().projects).toHaveLength(0);
    }
  });
});
