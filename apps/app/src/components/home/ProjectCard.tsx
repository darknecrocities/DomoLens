import { motion } from "framer-motion";
import { Clock, Film, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { formatDuration, formatWhen, type ProjectSummary } from "@domolens/core";
import { copy } from "../../copy/en";
import { platform } from "../../platform";
import { Menu } from "../ui/Menu";

interface ProjectCardProps {
  project: ProjectSummary;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onOpen, onRename, onDelete }: ProjectCardProps) {
  const thumbnailSrc = project.thumbnail ? platform.mediaUrl(project.thumbnail) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-800 transition-all duration-200 hover:border-ink-600 hover:shadow-soft"
    >
      {/* Thumbnail / Video Preview Area */}
      <div
        role="button"
        tabIndex={0}
        aria-label={copy.project.openLabel(project.name)}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className="relative aspect-video w-full cursor-pointer overflow-hidden bg-ink-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt=""
            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-ink-900 to-ink-950 text-fg-faint">
            <Film className="size-10 stroke-1 opacity-40" aria-hidden />
          </div>
        )}

        {/* Duration badge */}
        {project.durationMs !== null && (
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-md bg-ink-950/80 px-2 py-0.5 text-xs font-medium text-fg tabular shadow-sm backdrop-blur-sm">
            <Clock className="size-3 text-fg-muted" aria-hidden />
            <span>{formatDuration(project.durationMs)}</span>
          </div>
        )}

        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-ink-950/20 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>

      {/* Card Info Footer */}
      <div className="flex items-center justify-between p-3.5">
        <div className="min-w-0 flex-1 pr-2">
          <button
            type="button"
            onClick={onOpen}
            className="block w-full truncate text-left text-[15px] font-medium text-fg transition-colors hover:text-white focus-visible:outline-none touch-manipulation"
            title={project.name}
          >
            {project.name}
          </button>
          <p className="mt-0.5 text-xs text-fg-muted">
            {formatWhen(project.updatedAt)}
          </p>
        </div>

        {/* Options Menu */}
        <Menu
          label={copy.project.moreActions(project.name)}
          trigger={<MoreVertical className="size-4" />}
          side="top"
          items={[
            {
              label: copy.project.rename,
              icon: <Pencil className="size-4" />,
              onSelect: onRename,
            },
            {
              label: copy.project.delete,
              icon: <Trash2 className="size-4" />,
              tone: "danger",
              onSelect: onDelete,
            },
          ]}
        />
      </div>
    </motion.div>
  );
}
