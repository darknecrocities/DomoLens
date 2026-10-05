import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export interface IconButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  /** Required: screen readers read this out since there's no visible text. */
  label: string;
  icon: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "ghost" | "secondary" | "overlay";
}

const sizes = { sm: "size-8 rounded-md", md: "size-10 rounded-lg", lg: "size-12 rounded-xl" };
const variants = {
  ghost: "text-fg-muted hover:text-fg hover:bg-ink-700/70",
  secondary: "bg-ink-700 text-fg hover:bg-ink-600 border border-ink-600/70",
  overlay: "bg-ink-900/70 text-fg backdrop-blur-md hover:bg-ink-800/90",
};

export function IconButton({ label, icon, size = "md", variant = "ghost", className, type = "button", ...rest }: IconButtonProps) {
  return (
    <motion.button
      type={type}
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center transition-colors duration-150 touch-manipulation",
        "after:absolute after:-inset-2 sm:after:hidden",
        "disabled:pointer-events-none disabled:opacity-50",
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon}
    </motion.button>
  );
}
