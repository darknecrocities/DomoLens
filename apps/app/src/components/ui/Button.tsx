import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: Size;
  /** Icon shown before the label. */
  icon?: ReactNode;
  fullWidth?: boolean;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  // Crisp white on black for studio workspace
  primary: "bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-bold shadow-sm",
  secondary: "bg-ink-700 text-fg hover:bg-ink-600 border border-ink-600/70",
  ghost: "text-fg-muted hover:text-fg hover:bg-ink-700/70",
  danger: "bg-white text-black hover:bg-neutral-200 active:bg-neutral-300 font-bold border border-white/20 shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-md gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-lg gap-2",
  lg: "h-13 px-6 text-base rounded-xl gap-2.5",
  xl: "h-16 px-8 text-lg rounded-2xl gap-3",
};

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  fullWidth,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className={cn(
        "relative inline-flex select-none items-center justify-center whitespace-nowrap font-semibold touch-manipulation",
        "transition-[background-color,color,border-color,filter] duration-150 ease-(--ease-soft)",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {icon && <span className="-ml-0.5 flex shrink-0 items-center">{icon}</span>}
      {children}
    </motion.button>
  );
}
