import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";
import { useTutorial, TUTORIAL_STEPS } from "../../store/tutorial";
import { useEditor } from "../../store/editor";

interface CutoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

export function SpotlightTutorial() {
  const { isActive, currentStepIndex, nextStep, prevStep, skipTutorial } = useTutorial();
  const isRightSidebarOpen = useEditor((s) => s.isRightSidebarOpen);
  const toggleRightSidebar = useEditor((s) => s.toggleRightSidebar);
  const [cutoutRect, setCutoutRect] = useState<CutoutRect | null>(null);
  const [cardPlacement, setCardPlacement] = useState<{ top?: number; bottom?: number; left: number }>({ left: 16 });
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TUTORIAL_STEPS[currentStepIndex];

  // Prepare UI state for step if needed (e.g. open tools sidebar if targeting tools)
  useEffect(() => {
    if (!isActive || !step) return;
    if (step.targetKey === "tools-panel" && !isRightSidebarOpen) {
      toggleRightSidebar();
    }
  }, [isActive, step, isRightSidebarOpen, toggleRightSidebar]);

  // Measure target element rect
  const updateRect = useCallback(() => {
    if (!isActive || !step) return;

    const el = document.querySelector(`[data-tutorial-target="${step.targetKey}"]`);
    if (el) {
      const b = el.getBoundingClientRect();
      const pad = step.padding ?? 8;
      const rx = step.borderRadius ?? 12;

      const rect: CutoutRect = {
        x: Math.max(0, b.left - pad),
        y: Math.max(0, b.top - pad),
        width: b.width + pad * 2,
        height: b.height + pad * 2,
        rx,
      };

      setCutoutRect(rect);

      // Compute card position (place below if room, otherwise place above, centered horizontally)
      const windowW = window.innerWidth;
      const windowH = window.innerHeight;
      const cardW = Math.min(420, windowW - 32);

      let idealX = rect.x + (rect.width - cardW) / 2;
      idealX = Math.max(16, Math.min(windowW - cardW - 16, idealX));

      const spaceBelow = windowH - (rect.y + rect.height);
      const spaceAbove = rect.y;

      if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
        setCardPlacement({
          top: Math.min(windowH - 240, rect.y + rect.height + 16),
          left: idealX,
        });
      } else {
        setCardPlacement({
          bottom: Math.min(windowH - 120, windowH - rect.y + 16),
          left: idealX,
        });
      }
    } else {
      // Fallback center if target is not on screen
      setCutoutRect(null);
      setCardPlacement({
        top: window.innerHeight / 2 - 100,
        left: Math.max(16, (window.innerWidth - 420) / 2),
      });
    }
  }, [isActive, step]);

  useEffect(() => {
    if (!isActive) return;

    // Small delay to let any sidebar/canvas CSS transition finish
    const timer = setTimeout(updateRect, 100);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [isActive, updateRect, currentStepIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        skipTutorial();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.stopPropagation();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.stopPropagation();
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, nextStep, prevStep, skipTutorial]);

  if (!isActive || !step || typeof document === "undefined") return null;

  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[55] select-none">
        {/* Full-screen SVG spotlight mask & backdrop */}
        <svg className="fixed inset-0 size-full pointer-events-auto">
          <defs>
            <mask id="domolens-spotlight-mask">
              {/* Opaque white scrim */}
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {/* Cutout rectangle */}
              {cutoutRect && (
                <motion.rect
                  initial={false}
                  animate={{
                    x: cutoutRect.x,
                    y: cutoutRect.y,
                    width: cutoutRect.width,
                    height: cutoutRect.height,
                    rx: cutoutRect.rx,
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  fill="black"
                />
              )}
            </mask>
          </defs>

          {/* Dimmed backdrop scrim with mask */}
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(10, 10, 12, 0.78)"
            mask="url(#domolens-spotlight-mask)"
            onClick={skipTutorial}
            className="cursor-pointer"
          />

          {/* Glowing outline around spotlight */}
          {cutoutRect && (
            <motion.rect
              initial={false}
              animate={{
                x: cutoutRect.x,
                y: cutoutRect.y,
                width: cutoutRect.width,
                height: cutoutRect.height,
                rx: cutoutRect.rx,
              }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              fill="none"
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth="2"
              className="pointer-events-none drop-shadow-[0_0_16px_rgba(255,255,255,0.45)]"
            />
          )}
        </svg>

        {/* Charcoal & White Spotlight Tutorial Card */}
        <motion.div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-label={step.title}
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            top: cardPlacement.top !== undefined ? `${cardPlacement.top}px` : undefined,
            bottom: cardPlacement.bottom !== undefined ? `${cardPlacement.bottom}px` : undefined,
            left: `${cardPlacement.left}px`,
          }}
          className="z-[56] w-[92vw] max-w-[420px] rounded-2xl border border-neutral-700/80 bg-neutral-900/95 p-5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-2xl"
        >
          {/* Top Row: Badge, Step Counter & Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-200">
                <Sparkles className="size-3 text-white" />
                {step.badge}
              </span>
              <span className="font-mono text-xs text-neutral-400">
                {currentStepIndex + 1} / {TUTORIAL_STEPS.length}
              </span>
            </div>

            <button
              type="button"
              onClick={skipTutorial}
              className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              title="Close tutorial (Esc)"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Title & Description */}
          <div className="mt-3">
            <h3 className="text-base font-bold text-white tracking-tight">
              {step.title}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-neutral-300">
              {step.description}
            </p>
          </div>

          {/* Step Progress Indicators */}
          <div className="mt-4 flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((s, idx) => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                    : idx < currentStepIndex
                    ? "bg-neutral-600"
                    : "bg-neutral-800"
                }`}
              />
            ))}
          </div>

          {/* Action Footer Buttons */}
          <div className="mt-5 flex items-center justify-between gap-2 border-t border-neutral-800 pt-3.5">
            <button
              type="button"
              onClick={skipTutorial}
              className="font-mono text-xs text-neutral-400 hover:text-white transition-colors"
            >
              Skip Tour
            </button>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-1.5 font-mono text-xs font-medium text-neutral-200 hover:border-neutral-500 hover:text-white transition-all active:scale-95"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Back</span>
                </button>
              )}

              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1 rounded-lg bg-white px-4 py-1.5 font-mono text-xs font-bold uppercase text-black hover:bg-neutral-200 shadow-[0_0_16px_rgba(255,255,255,0.2)] transition-all active:scale-95"
              >
                <span>{isLast ? "Got It!" : "Next"}</span>
                {!isLast && <ChevronRight className="size-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
}
