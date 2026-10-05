import { motion } from "framer-motion";
import { Sparkles, Video } from "lucide-react";
import { copy } from "../../copy/en";
import { platform } from "../../platform";

export function EmptyProjects() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-600/80 bg-ink-800/40 px-6 py-16 text-center sm:py-20"
    >
      <div className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-ink-700/80 text-white shadow-inner">
        <Video className="size-8" strokeWidth={1.75} aria-hidden />
        <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-white text-black">
          <Sparkles className="size-3" />
        </span>
      </div>

      <h3 className="text-lg font-semibold text-fg">
        {copy.home.emptyTitle}
      </h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-fg-muted">
        {copy.home.emptyBody}
      </p>

      <div className="mt-6 rounded-full border border-ink-600 bg-ink-900/60 px-4 py-1.5 text-xs text-fg-faint">
        {platform.isTouch ? copy.home.emptyHintTouch : copy.home.emptyHintDesktop}
      </div>
    </motion.div>
  );
}
