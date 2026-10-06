import { motion } from "framer-motion";
import { Clock, Film, MoreVertical, Pencil, Play, Trash2 } from "lucide-react";
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
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl transition-all duration-200 hover:border-white/25 hover:bg-white/[0.07] hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)]"
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
        className="relative aspect-video w-full cursor-pointer overflow-hidden bg-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt=""
            className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-white/[0.03] to-black/60 text-neutral-400">
            <Film className="size-10 stroke-[1.5] opacity-40 group-hover:opacity-70 transition-opacity" aria-hidden />
          </div>
        )}

        {/* Duration badge */}
        {project.durationMs !== null && (
          <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-md border border-white/10 bg-black/70 px-2 py-0.5 text-xs font-mono font-medium text-neutral-200 tabular shadow-sm backdrop-blur-md">
            <Clock className="size-3 text-neutral-400" aria-hidden />
            <span>{formatDuration(project.durationMs)}</span>
          </div>
        )}

        {/* Hover overlay hint with centered Play icon */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
          <div className="flex size-10 items-center justify-center rounded-full bg-white text-black shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="size-4 fill-black translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="flex items-center justify-between p-3.5">
        <div className="min-w-0 flex-1 pr-2">
          <button
            type="button"
            onClick={onOpen}
            className="block w-full truncate text-left text-sm font-semibold text-white transition-colors hover:text-neutral-300 focus-visible:outline-none touch-manipulation"
            title={project.name}
          >
            {project.name}
          </button>
          <p className="mt-0.5 text-xs font-mono text-neutral-400">
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
