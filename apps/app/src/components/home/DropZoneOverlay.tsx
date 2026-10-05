import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownToLine } from "lucide-react";
import { copy } from "../../copy/en";

interface DropZoneOverlayProps {
  isDragging: boolean;
}

export function DropZoneOverlay({ isDragging }: DropZoneOverlayProps) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.9, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 16 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="flex flex-col items-center rounded-3xl border-2 border-dashed border-white bg-ink-800/90 px-12 py-10 text-center shadow-lift"
          >
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-white text-black">
              <ArrowDownToLine className="size-8" strokeWidth={2.2} aria-hidden />
            </div>
            <h3 className="text-xl font-bold text-fg">
              {copy.drop.title}
            </h3>
            <p className="mt-1 text-sm text-fg-muted">
              {copy.drop.body}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
