import { useState } from "react";
import { FolderOpen, Video } from "lucide-react";
import type { ProjectSummary } from "@domolens/core";
import { copy } from "../copy/en";
import { Button } from "../components/ui/Button";
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 pb-safe px-safe">
      {/* Hero / Action Section */}
      <section className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            {copy.home.title}
          </h1>
          <p className="mt-1 text-sm text-fg-muted sm:text-base">
            {copy.home.subtitle}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <Button
            variant="secondary"
            size="lg"
            icon={<FolderOpen className="size-5" />}
            onClick={() => pickAndImport()}
            className="flex-1 sm:flex-initial"
          >
            {copy.home.openVideo}
          </Button>

          <Button
            variant="primary"
            size="lg"
            icon={<Video className="size-5" strokeWidth={2.5} />}
            onClick={() => go({ name: "record" })}
            className="flex-1 sm:flex-initial"
          >
            {copy.home.newRecording}
          </Button>
        </div>
      </section>

      {/* Projects List Section */}
      <section className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-fg">
            {copy.home.projectsTitle}
          </h2>
          {projects.length > 0 && (
            <span className="rounded-full bg-ink-800 px-3 py-1 text-xs font-medium text-fg-muted">
              {copy.home.projectsCount(projects.length)}
            </span>
          )}
        </div>

        {status === "loading" && projects.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-20 text-sm text-fg-faint">
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
