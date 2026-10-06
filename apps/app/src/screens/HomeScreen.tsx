import { useEffect, useState } from "react";
import {
  FolderOpen,
  Layers,
  Mic,
  Monitor,
  Play,
  Sliders,
  UploadCloud,
  Video,
  Zap,
} from "lucide-react";
import type { ProjectSummary } from "@domolens/core";
import { copy } from "../copy/en";
import { ProjectCard } from "../components/home/ProjectCard";
import { EmptyProjects } from "../components/home/EmptyProjects";
import { RenameModal } from "../components/home/RenameModal";
import { DeleteModal } from "../components/home/DeleteModal";
import { useNav } from "../store/nav";
import { useProjects } from "../store/projects";

export function HomeScreen() {
  const { go } = useNav();
  const { projects, status, pickAndImport, rename, remove } = useProjects();

  const [projectToRename, setProjectToRename] = useState<ProjectSummary | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ProjectSummary | null>(null);
  const [micActive, setMicActive] = useState(true);

  // Keyboard shortcuts: R for Record, I for Import, E for Open Editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        go({ name: "record" });
      } else if (e.key === "i" || e.key === "I" || ((e.metaKey || e.ctrlKey) && e.key === "o")) {
        e.preventDefault();
        void handleImportAndOpen();
      } else if (e.key === "e" || e.key === "E" || ((e.metaKey || e.ctrlKey) && e.key === "e")) {
        e.preventDefault();
        handleOpenEditorDirectly();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [projects]);

  const handleOpenEditorDirectly = () => {
    const first = projects[0];
    if (first) {
      go({ name: "editor", id: first.id });
    } else {
      go({ name: "editor", id: "studio-main" });
    }
  };

  const handleImportAndOpen = async () => {
    const project = await pickAndImport();
    if (project) {
      go({ name: "editor", id: project.id });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 pb-safe px-safe">
      {/* OpenScreen Floating Quick Action Bar Island */}
      <section className="mb-10 w-full">
        <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-black/60 p-6 sm:p-8 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.15)]">
          {/* Subtle Ambient Studio Glow */}
          <div className="pointer-events-none absolute -left-20 -top-20 size-72 rounded-full bg-white/[0.05] blur-3xl" />
          <div className="pointer-events-none absolute -right-20 -bottom-20 size-72 rounded-full bg-white/[0.03] blur-3xl" />

          {/* Bar Top Indicator */}
          <div className="relative mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="size-2 rounded-full bg-white animate-pulse" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-white">
                DomoLens OpenScreen HUD
              </span>
              <span className="hidden sm:inline-block font-mono text-xs text-neutral-500">•</span>
              <span className="hidden sm:inline-block font-mono text-xs text-neutral-400">
                Floating Quick Action Bar
              </span>
            </div>

            {/* Hardware Status Indicators */}
            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] text-neutral-300"
                title="Screen capture hardware permission is granted and active"
              >
                <Monitor className="size-3 text-white" />
                <span>Screen Capture Ready</span>
              </div>

              <button
                type="button"
                onClick={() => setMicActive((v) => !v)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] transition-all ${
                  micActive
                    ? "border-white/20 bg-white/10 text-white"
                    : "border-white/10 bg-black/30 text-neutral-400"
                }`}
                title="Toggle default microphone status"
              >
                <Mic className="size-3 text-white" />
                <span>{micActive ? "Mic Active" : "Mic Muted"}</span>
              </button>
            </div>
          </div>

          {/* Main Floating Action Center */}
          <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Action 1: Record Screen */}
            <button
              type="button"
              onClick={() => go({ name: "record" })}
              className="group relative flex flex-col items-start justify-between rounded-2xl border border-white/20 bg-white p-5 text-left text-black transition-all hover:bg-neutral-100 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-[0.98]"
            >
              <div className="flex w-full items-center justify-between mb-4">
                <div className="flex size-11 items-center justify-center rounded-xl bg-black text-white shadow-md group-hover:scale-105 transition-transform">
                  <Video className="size-5" strokeWidth={2.5} />
                </div>
                <span className="rounded-md bg-neutral-200 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-neutral-800">
                  Shortcut R
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-black flex items-center gap-1.5">
                  Record Screen
                  <Zap className="size-3.5 fill-black" />
                </h3>
                <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                  Capture display or app window with zero-lag interaction auto-zooms.
                </p>
              </div>
            </button>

            {/* Action 2: Import Video */}
            <button
              type="button"
              onClick={() => void handleImportAndOpen()}
              className="group relative flex flex-col items-start justify-between rounded-2xl border border-white/15 bg-white/[0.06] p-5 text-left text-white transition-all hover:border-white/30 hover:bg-white/[0.12] hover:shadow-xl active:scale-[0.98]"
            >
              <div className="flex w-full items-center justify-between mb-4">
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm group-hover:bg-white group-hover:text-black transition-all">
                  <FolderOpen className="size-5" />
                </div>
                <span className="rounded-md border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[10px] font-medium text-neutral-400">
                  Shortcut I
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-white">
                  Import Video
                </h3>
                <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                  Open an existing MP4 or MOV clip and immediately edit in studio.
                </p>
              </div>
            </button>

            {/* Action 3: Open Video Editor Directly */}
            <button
              type="button"
              onClick={handleOpenEditorDirectly}
              className="group relative flex flex-col items-start justify-between rounded-2xl border border-white/15 bg-white/[0.06] p-5 text-left text-white transition-all hover:border-white/30 hover:bg-white/[0.12] hover:shadow-xl active:scale-[0.98]"
            >
              <div className="flex w-full items-center justify-between mb-4">
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white shadow-sm group-hover:bg-white group-hover:text-black transition-all">
                  <Sliders className="size-5" />
                </div>
                <span className="rounded-md border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[10px] font-medium text-neutral-400">
                  Shortcut E
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-white">
                  Open Video Editor
                </h3>
                <p className="mt-1 text-xs text-neutral-400 leading-relaxed">
                  Launch the full video studio with timeline, keyframes, and AI director.
                </p>
              </div>
            </button>
          </div>

          {/* Quick Dropzone & Template Strip */}
          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="flex items-center gap-2 font-mono text-xs text-neutral-300">
              <UploadCloud className="size-4 text-white" />
              <span>Drag and drop video files anywhere on this window to open directly</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go({ name: "editor", id: "blank" })}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-neutral-300 hover:bg-white/15 hover:text-white transition-all"
                title="Open empty editor stage"
              >
                <Layers className="size-3" />
                <span>Blank Canvas</span>
              </button>

              <button
                type="button"
                onClick={() => go({ name: "editor", id: "demo-saas" })}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] text-neutral-300 hover:bg-white/15 hover:text-white transition-all"
                title="Launch SaaS product demo"
              >
                <Play className="size-3 fill-white" />
                <span>Sample Demo</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Projects List Section */}
      <section className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-fg">
              {copy.home.projectsTitle}
            </h2>
            {projects.length > 0 && (
              <span className="rounded-full bg-ink-800 px-3 py-0.5 text-xs font-mono font-medium text-fg-muted">
                {copy.home.projectsCount(projects.length)}
              </span>
            )}
          </div>

          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenEditorDirectly}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs font-semibold text-neutral-300 hover:bg-white/15 hover:text-white transition-all"
              >
                Launch Studio
              </button>
            </div>
          )}
        </div>

        {status === "loading" && projects.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-20 text-sm font-mono text-fg-faint">
            {copy.home.loading}
          </div>
        ) : projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => go({ name: "editor", id: project.id })}
                onRename={() => setProjectToRename(project)}
                onDelete={() => setProjectToDelete(project)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {projectToRename && (
        <RenameModal
          open={!!projectToRename}
          initialName={projectToRename.name}
          onClose={() => setProjectToRename(null)}
          onSave={(newName) => rename(projectToRename.id, newName)}
        />
      )}

      {projectToDelete && (
        <DeleteModal
          open={!!projectToDelete}
          projectName={projectToDelete.name}
          onClose={() => setProjectToDelete(null)}
          onConfirm={() => remove(projectToDelete.id)}
        />
      )}
    </div>
  );
}
