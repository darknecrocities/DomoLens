import { useEffect, useState } from "react";
import {
  FolderOpen,
  Layers,
  Mic,
  Monitor,
  Play,
  RefreshCw,
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
import { checkForAppUpdates } from "../lib/updater";
import { useUpdateStore } from "../store/update";

export function HomeScreen() {
  const { go } = useNav();
  const { projects, status, pickAndImport, rename, remove } = useProjects();
  const isCheckingUpdate = useUpdateStore((s) => s.isChecking);
  const updateStatus = useUpdateStore((s) => s.status);

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
                DomoLens — Your Smart Showcase Zoom Tracker
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

              <button
                type="button"
                disabled={isCheckingUpdate}
                onClick={() => void checkForAppUpdates({ silent: false })}
                className="relative flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-[11px] text-neutral-300 hover:bg-white/15 hover:text-white disabled:opacity-60 transition-all shadow-sm active:scale-95"
                title={
                  updateStatus === "ready"
                    ? "Update downloaded: click to relaunch"
                    : updateStatus === "available"
                    ? "New update available"
                    : "Check for DomoLens updates"
                }
              >
                <RefreshCw
                  className={`size-3 text-white ${isCheckingUpdate ? "animate-spin text-white" : ""}`}
                />
                <span>
                  {isCheckingUpdate ? "Checking..." : updateStatus === "ready" ? "Update Ready" : "Check Updates"}
                </span>

                {(updateStatus === "available" || updateStatus === "ready") && (
                  <span
                    className={`absolute -top-1 -right-1 flex size-2 rounded-full ${
                      updateStatus === "ready" ? "bg-emerald-400" : "bg-white"
                    }`}
                  >
                    <span
                      className={`inline-flex size-full animate-ping rounded-full ${
                        updateStatus === "ready" ? "bg-emerald-400" : "bg-white"
                      } opacity-75`}
                    />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Main Floating Action Center */}
          <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Action 1: Record Screen */}
            <button
              type="button"
              onClick={() => go({ name: "record" })}
              className="group relative flex flex-col items-start justify-between rounded-2xl border border-white/20 bg-gradient-to-b from-white/[0.10] to-white/[0.04] p-5 text-left text-white backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.2)] hover:border-white/40 hover:from-white/[0.14] hover:to-white/[0.06] hover:shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.3)] active:scale-[0.98] transition-all"
            >
              <div className="flex w-full items-center justify-between mb-4">
                <div className="flex size-11 items-center justify-center rounded-xl bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)] group-hover:scale-105 transition-transform">
                  <Video className="size-5" strokeWidth={2.5} />
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                  <span className="size-1.5 rounded-full bg-white animate-pulse" />
                  <span>Shortcut R</span>
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  Record Screen
                  <Zap className="size-3.5 fill-white text-white" />
                </h3>
                <p className="mt-1 text-xs text-neutral-300 leading-relaxed">
                  Capture display or app window with zero-lag interaction auto-zooms.
                </p>
              </div>
            </button>

            {/* Action 2: Import Video */}
            <button
              type="button"
              onClick={() => void handleImportAndOpen()}
              className="group relative flex flex-col items-start justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left text-white backdrop-blur-xl shadow-[0_10px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/25 hover:bg-white/[0.08] hover:shadow-xl active:scale-[0.98] transition-all"
            >
              <div className="flex w-full items-center justify-between mb-4">
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white shadow-sm group-hover:bg-white group-hover:text-black transition-all">
                  <FolderOpen className="size-5" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] font-medium text-neutral-400">
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
              className="group relative flex flex-col items-start justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left text-white backdrop-blur-xl shadow-[0_10px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-white/25 hover:bg-white/[0.08] hover:shadow-xl active:scale-[0.98] transition-all"
            >
              <div className="flex w-full items-center justify-between mb-4">
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white shadow-sm group-hover:bg-white group-hover:text-black transition-all">
                  <Sliders className="size-5" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-[10px] font-medium text-neutral-400">
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
