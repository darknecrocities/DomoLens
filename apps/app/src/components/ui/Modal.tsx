import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion as tokens } from "@domolens/theme/tokens";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons at the bottom. */
  footer?: ReactNode;
  /** Element to focus when the modal opens. Defaults to the first focusable element. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Modal width size preset. Defaults to "md" (sm:max-w-md). */
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
  /** Optional custom className to add/override panel styles */
  className?: string;
  /** Show an explicit close button in the top right */
  showCloseButton?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
  "6xl": "sm:max-w-6xl",
};

/**
 * A calm dialog. Centered on computers, a bottom sheet on phones.
 * Traps keyboard focus, closes on Escape or a click outside, and gives focus back after.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  initialFocus,
  size = "md",
  className,
  showCloseButton = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusFirst = () => {
      const target = initialFocus?.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus();
    };
    // Wait one frame so the panel exists before we focus inside it.
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey, true);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, initialFocus]);

  const modalContent = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 md:p-6 overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: tokens.base, ease: tokens.easeSoft }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            className={`relative flex flex-col w-full max-h-[92dvh] sm:max-h-[min(90vh,54rem)] rounded-t-3xl sm:rounded-2xl border border-white/15 bg-neutral-900/95 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.15)] overflow-hidden ${SIZE_CLASSES[size ?? "md"]} ${className ?? ""}`}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={tokens.springSoft}
          >
            {/* Pinned Dialog Header */}
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6 pb-2 sm:pb-3 shrink-0">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-semibold tracking-tight text-white">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm leading-relaxed text-fg-muted">
                    {description}
                  </p>
                )}
              </div>
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors -mr-1 -mt-1 cursor-pointer shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Scrollable Content Body */}
            {children && (
              <div
                className={`flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-2 overscroll-contain ${
                  !footer ? "pb-[calc(1.5rem+var(--safe-bottom))] sm:pb-6" : ""
                }`}
              >
                {children}
              </div>
            )}

            {/* Pinned Dialog Footer */}
            {footer && (
              <div className="shrink-0 p-5 sm:p-6 pt-3 sm:pt-4 pb-[calc(1.25rem+var(--safe-bottom))] sm:pb-5 border-t border-white/5 bg-neutral-950/40">
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end w-full [&>div]:w-full">
                  {footer}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
}
