import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { motion as tokens } from "@domolens/theme/tokens";
import { copy } from "../../copy/en";
import { cn } from "../../lib/cn";
import { useToasts } from "../../store/toast";

/** Small messages at the bottom of the screen. Read out by screen readers. */
export function Toaster() {
  const { toasts, dismiss } = useToasts();

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-[calc(1.25rem+var(--safe-bottom))] max-sm:pb-[calc(6.5rem+var(--safe-bottom))]"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            role={t.tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: tokens.fast } }}
            transition={tokens.spring}
            className="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border border-ink-600 bg-ink-800/95 py-2.5 pr-2 pl-4 shadow-lift backdrop-blur-md"
          >
            {t.tone === "success" && <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />}
            {t.tone === "error" && <CircleAlert className="size-5 shrink-0 text-danger" aria-hidden />}
            <p className="text-[15px] text-fg">{t.message}</p>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.run();
                  dismiss(t.id);
                }}
                className="rounded-lg px-2.5 py-1.5 text-sm font-bold text-white hover:bg-ink-700"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label={copy.a11y.dismiss}
              onClick={() => dismiss(t.id)}
              className={cn("rounded-lg p-1.5 text-fg-faint transition-colors hover:bg-ink-700 hover:text-fg")}
            >
              <X className="size-4" aria-hidden />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
