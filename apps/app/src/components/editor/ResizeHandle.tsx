import { useState, useRef, useCallback, useEffect } from "react";

export interface ResizeHandleProps {
  orientation: "horizontal" | "vertical";
  onResize: (delta: number, currentClientPos: number) => void;
  onResizeEnd?: () => void;
  onReset?: () => void;
  ariaLabel: string;
  title?: string;
  className?: string;
}

export function ResizeHandle({
  orientation,
  onResize,
  onResizeEnd,
  onReset,
  ariaLabel,
  title,
  className = "",
}: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const prevPosRef = useRef<number>(0);

  const isVertical = orientation === "vertical";

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Only primary mouse button or touch
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for virtual DOM test environments
      }

      setIsDragging(true);
      prevPosRef.current = isVertical ? e.clientX : e.clientY;

      document.body.style.cursor = isVertical ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [isVertical],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      const current = isVertical ? e.clientX : e.clientY;
      const delta = current - prevPosRef.current;
      prevPosRef.current = current;

      if (delta !== 0) {
        onResize(delta, current);
      }
    },
    [isDragging, isVertical, onResize],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Fallback
      }

      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      onResizeEnd?.();
    },
    [isDragging, onResizeEnd],
  );

  // Safety cleanup if unmounted while dragging
  useEffect(() => {
    return () => {
      if (isDragging) {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
  }, [isDragging]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 25 : 8;
    if (isVertical) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        onResize(-step, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        onResize(step, 0);
      }
    } else {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onResize(-step, 0);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        onResize(step, 0);
      }
    }

    if (e.key === "Enter" || e.key === " " || e.key === "Backspace") {
      e.preventDefault();
      onReset?.();
    }
  };

  const defaultTitle = isVertical
    ? "Drag horizontally to resize panel width • Double-click to reset"
    : "Drag vertically to resize timeline height • Double-click to reset";

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-orientation={orientation}
      aria-label={ariaLabel}
      title={title || defaultTitle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onReset?.();
      }}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative z-20 flex shrink-0 items-center justify-center select-none outline-none focus-visible:ring-1 focus-visible:ring-white/40 ${
        isVertical
          ? "w-2.5 -mx-1 h-full cursor-col-resize hover:bg-white/5 active:bg-white/10"
          : "h-2.5 -my-1 w-full cursor-row-resize hover:bg-white/5 active:bg-white/10"
      } ${className}`}
    >
      {/* Expanded invisible click/drag boundary target */}
      <div
        className={`pointer-events-none absolute ${
          isVertical ? "inset-y-0 -inset-x-2" : "inset-x-0 -inset-y-2"
        }`}
      />

      {/* Visible dividing line */}
      <div
        className={`transition-colors duration-150 ${
          isVertical
            ? "w-px h-full"
            : "h-px w-full"
        } ${
          isDragging
            ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            : isHovered
            ? "bg-neutral-400"
            : "bg-ink-800"
        }`}
      />

      {/* Tactile Centered Grip Pill Indicator */}
      <div
        className={`pointer-events-none absolute rounded-full transition-all duration-150 ${
          isVertical
            ? "h-8 w-1"
            : "w-10 h-1"
        } ${
          isDragging
            ? "bg-white scale-110 shadow-sm"
            : isHovered
            ? "bg-neutral-300 scale-100 opacity-100"
            : "bg-neutral-600/60 opacity-0 group-hover:opacity-100"
        }`}
      />
    </div>
  );
}
