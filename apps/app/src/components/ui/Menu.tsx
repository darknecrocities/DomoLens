import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion as tokens } from "@domolens/theme/tokens";
import { cn } from "../../lib/cn";

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  tone?: "default" | "danger";
  onSelect: () => void;
}

interface MenuProps {
  /** Accessible name for the trigger button. */
  label: string;
  trigger: ReactNode;
  items: MenuItem[];
  triggerClassName?: string;
  align?: "start" | "end";
  /** Open upward (handy near the bottom of a card). */
  side?: "top" | "bottom";
}

/** Small pop-up menu. Works with mouse, touch and keyboard (arrows, Enter, Escape). */
export function Menu({ label, trigger, items, triggerClassName, align = "end", side = "bottom" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    requestAnimationFrame(() => itemRefs.current[0]?.focus());
    window.addEventListener("pointerdown", onPointer);
    return () => window.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  };

  const onMenuKey = (e: KeyboardEvent) => {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const count = items.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itemRefs.current[(current + 1) % count]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itemRefs.current[(current - 1 + count) % count]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      itemRefs.current[count - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-lg text-fg-muted transition-colors duration-150 hover:bg-ink-700 hover:text-fg touch-manipulation",
          "after:absolute after:-inset-2 sm:after:hidden",
          open && "bg-ink-700 text-fg",
          triggerClassName,
        )}
      >
        {trigger}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKey}
            initial={{ opacity: 0, scale: 0.96, y: side === "top" ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: side === "top" ? 4 : -4 }}
            transition={{ duration: tokens.fast, ease: tokens.easeSoft }}
            className={cn(
              "absolute z-40 min-w-44 rounded-xl border border-ink-600 bg-ink-800 p-1.5 shadow-lift",
              align === "end" ? "right-0" : "left-0",
              side === "top" ? "bottom-full mb-2 origin-bottom" : "top-full mt-2 origin-top",
            )}
          >
            {items.map((item, i) => (
              <button
                key={item.label}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  close(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[15px] outline-none transition-colors duration-100",
                  "hover:bg-ink-700 focus-visible:bg-ink-700 focus-visible:outline-none",
                  item.tone === "danger" ? "text-danger" : "text-fg",
                )}
              >
                {item.icon && <span className="flex size-4 items-center opacity-80">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
