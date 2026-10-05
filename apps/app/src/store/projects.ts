import { create } from "zustand";
import { isSupportedVideo, type ProjectSummary } from "@domolens/core";
import { copy } from "../copy/en";
import { platform, type IncomingFile } from "../platform";
import { toast } from "./toast";

type Status = "idle" | "loading" | "ready" | "error";

interface ProjectsState {
  projects: ProjectSummary[];
  status: Status;
  /** How many imports are running right now. */
  importing: number;

  load: () => Promise<void>;
  importFiles: (files: IncomingFile[]) => Promise<ProjectSummary | null>;
  pickAndImport: () => Promise<ProjectSummary | null>;
  rename: (id: string, name: string) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
}

export const useProjects = create<ProjectsState>((set, get) => ({
  projects: [],
  status: "idle",
  importing: 0,

  async load() {
    // Only show the loading state the first time, so refreshes never flash.
    if (get().status !== "ready") set({ status: "loading" });
    try {
      const projects = await platform.listProjects();
      set({ projects, status: "ready" });
    } catch (err) {
      console.error("Failed to load projects", err);
      set({ status: "error" });
    }
  },

  async importFiles(files) {
    const videos = files.filter((f) => isSupportedVideo(f.name));
    if (videos.length === 0) {
      toast.error(copy.drop.wrongType);
      return null;
    }
    if (files.length > 1) toast.info(copy.drop.onlyOne);

    const first = videos[0]!;
    set({ importing: get().importing + 1 });
    try {
      const project = await platform.importVideo(first);
      set({ projects: [project, ...get().projects.filter((p) => p.id !== project.id)] });
      toast.success(copy.import.done);
      return project;
    } catch (err) {
      console.error("Import failed", err);
      toast.error(copy.errors.importFailed);
      return null;
    } finally {
      set({ importing: Math.max(0, get().importing - 1) });
    }
  },

  async pickAndImport() {
    try {
      const file = await platform.pickVideo();
      return file ? get().importFiles([file]) : null;
    } catch (err) {
      console.error("Picker failed", err);
      toast.error(copy.errors.generic);
      return null;
    }
  },

  async rename(id, name) {
    try {
      const updated = await platform.renameProject(id, name);
      set({ projects: get().projects.map((p) => (p.id === id ? updated : p)) });
      toast.success(copy.project.renamed);
      return true;
    } catch (err) {
      console.error("Rename failed", err);
      toast.error(copy.errors.saveFailed);
      return false;
    }
  },

  async remove(id) {
    const before = get().projects;
    // Remove right away so it feels instant; put it back if it fails.
    set({ projects: before.filter((p) => p.id !== id) });
    try {
      await platform.deleteProject(id);
      toast.info(copy.project.deleted);
      return true;
    } catch (err) {
      console.error("Delete failed", err);
      set({ projects: before });
      toast.error(copy.errors.deleteFailed);
      return false;
    }
  },
}));
