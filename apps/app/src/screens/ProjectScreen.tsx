import { ArrowLeft, Film } from "lucide-react";
import { copy } from "../copy/en";
import { Button } from "../components/ui/Button";
import { platform } from "../platform";
import { useNav } from "../store/nav";
import { useProjects } from "../store/projects";

interface ProjectScreenProps {
  id: string;
}

export function ProjectScreen({ id }: ProjectScreenProps) {
  const { back } = useNav();
  const { projects } = useProjects();
  const project = projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <p className="text-base text-fg-muted">{copy.errors.generic}</p>
        <Button variant="secondary" className="mt-4" onClick={back}>
          {copy.project.back}
        </Button>
      </div>
    );
  }

  const mediaSrc = project.media ? platform.mediaUrl(project.media) : null;
  const thumbnailSrc = project.thumbnail ? platform.mediaUrl(project.thumbnail) : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6">
      {/* Top Bar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="size-4" />}
            onClick={back}
          >
            {copy.project.back}
          </Button>
          <h1 className="text-lg font-semibold text-fg sm:text-xl truncate max-w-md">
            {project.name}
          </h1>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => useNav.getState().go({ name: "editor", id: project.id })}
        >
          Open Editor
        </Button>
      </div>

      {/* Video Preview Container */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-ink-700 bg-ink-950 shadow-lift">
        {mediaSrc ? (
          <video
            src={mediaSrc}
            controls
            autoPlay
            playsInline
            className="size-full object-contain"
          />
        ) : thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={project.name}
            className="size-full object-contain"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center text-fg-muted">
            <Film className="size-16 stroke-1 opacity-30" />
            <p className="mt-3 text-sm text-fg-faint">{copy.project.gettingReady}</p>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-sm text-fg-muted">
        {copy.project.editorSoon}
      </p>
    </div>
  );
}
