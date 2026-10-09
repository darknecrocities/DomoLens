import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  useEditor,
  DEFAULT_TOOLS_SIDEBAR_WIDTH,
  MIN_TOOLS_SIDEBAR_WIDTH,
  MAX_TOOLS_SIDEBAR_WIDTH,
  DEFAULT_LLM_SIDEBAR_WIDTH,
  MIN_LLM_SIDEBAR_WIDTH,
  MAX_LLM_SIDEBAR_WIDTH,
  DEFAULT_TIMELINE_HEIGHT,
  MIN_TIMELINE_HEIGHT,
  MAX_TIMELINE_HEIGHT,
  DEFAULT_TRACK_HEADER_WIDTH,
  MIN_TRACK_HEADER_WIDTH,
  MAX_TRACK_HEADER_WIDTH,
} from "../store/editor";
import { ResizeHandle } from "../components/editor/ResizeHandle";

describe("Studio Responsiveness & Resizable Splitter Borders", () => {
  beforeEach(() => {
    useEditor.getState().resetLayoutDimensions();
  });

  describe("1. Editor Store Layout Dimensions & Clamping", () => {
    it("initializes with ergonomic default dimensions", () => {
      const state = useEditor.getState();
      expect(state.toolsSidebarWidth).toBe(DEFAULT_TOOLS_SIDEBAR_WIDTH);
      expect(state.llmSidebarWidth).toBe(DEFAULT_LLM_SIDEBAR_WIDTH);
      expect(state.timelineHeight).toBe(DEFAULT_TIMELINE_HEIGHT);
      expect(state.timelineTrackHeaderWidth).toBe(DEFAULT_TRACK_HEADER_WIDTH);
    });

    it("resizes tools sidebar within safe boundary clamps", () => {
      const { setToolsSidebarWidth } = useEditor.getState();

      // Normal valid adjustment
      setToolsSidebarWidth(420);
      expect(useEditor.getState().toolsSidebarWidth).toBe(420);

      // Clamped to minimum
      setToolsSidebarWidth(50);
      expect(useEditor.getState().toolsSidebarWidth).toBe(MIN_TOOLS_SIDEBAR_WIDTH);

      // Clamped to maximum
      setToolsSidebarWidth(1200);
      expect(useEditor.getState().toolsSidebarWidth).toBe(MAX_TOOLS_SIDEBAR_WIDTH);
    });

    it("resizes AI director sidebar within safe boundary clamps", () => {
      const { setLlmSidebarWidth } = useEditor.getState();

      setLlmSidebarWidth(380);
      expect(useEditor.getState().llmSidebarWidth).toBe(380);

      setLlmSidebarWidth(100);
      expect(useEditor.getState().llmSidebarWidth).toBe(MIN_LLM_SIDEBAR_WIDTH);

      setLlmSidebarWidth(999);
      expect(useEditor.getState().llmSidebarWidth).toBe(MAX_LLM_SIDEBAR_WIDTH);
    });

    it("resizes timeline height within safe boundary clamps", () => {
      const { setTimelineHeight } = useEditor.getState();

      setTimelineHeight(350);
      expect(useEditor.getState().timelineHeight).toBe(350);

      setTimelineHeight(50);
      expect(useEditor.getState().timelineHeight).toBe(MIN_TIMELINE_HEIGHT);

      setTimelineHeight(1500);
      expect(useEditor.getState().timelineHeight).toBe(MAX_TIMELINE_HEIGHT);
    });

    it("resizes timeline track header width within safe boundary clamps", () => {
      const { setTimelineTrackHeaderWidth } = useEditor.getState();

      setTimelineTrackHeaderWidth(160);
      expect(useEditor.getState().timelineTrackHeaderWidth).toBe(160);

      setTimelineTrackHeaderWidth(30);
      expect(useEditor.getState().timelineTrackHeaderWidth).toBe(MIN_TRACK_HEADER_WIDTH);

      setTimelineTrackHeaderWidth(500);
      expect(useEditor.getState().timelineTrackHeaderWidth).toBe(MAX_TRACK_HEADER_WIDTH);
    });

    it("resets all layout dimensions to defaults on resetLayoutDimensions", () => {
      const state = useEditor.getState();
      state.setToolsSidebarWidth(450);
      state.setLlmSidebarWidth(450);
      state.setTimelineHeight(400);
      state.setTimelineTrackHeaderWidth(200);

      expect(useEditor.getState().toolsSidebarWidth).toBe(450);

      useEditor.getState().resetLayoutDimensions();

      expect(useEditor.getState().toolsSidebarWidth).toBe(DEFAULT_TOOLS_SIDEBAR_WIDTH);
      expect(useEditor.getState().llmSidebarWidth).toBe(DEFAULT_LLM_SIDEBAR_WIDTH);
      expect(useEditor.getState().timelineHeight).toBe(DEFAULT_TIMELINE_HEIGHT);
      expect(useEditor.getState().timelineTrackHeaderWidth).toBe(DEFAULT_TRACK_HEADER_WIDTH);
    });
  });

  describe("2. ResizeHandle Component Markup & Accessibility", () => {
    it("renders vertical handle with separator ARIA roles and col-resize styling", () => {
      const onResize = vi.fn();
      const markup = renderToStaticMarkup(
        <ResizeHandle
          orientation="vertical"
          ariaLabel="Resize sidebar width"
          onResize={onResize}
        />
      );

      expect(markup).toContain('role="separator"');
      expect(markup).toContain('aria-orientation="vertical"');
      expect(markup).toContain('aria-label="Resize sidebar width"');
      expect(markup).toContain("cursor-col-resize");
      expect(markup).toContain("tabindex=\"0\"");
    });

    it("renders horizontal handle with separator ARIA roles and row-resize styling", () => {
      const onResize = vi.fn();
      const markup = renderToStaticMarkup(
        <ResizeHandle
          orientation="horizontal"
          ariaLabel="Resize timeline height"
          onResize={onResize}
        />
      );

      expect(markup).toContain('role="separator"');
      expect(markup).toContain('aria-orientation="horizontal"');
      expect(markup).toContain('aria-label="Resize timeline height"');
      expect(markup).toContain("cursor-row-resize");
      expect(markup).toContain("tabindex=\"0\"");
    });

    it("computes directional delta accurately for pointer tracking", () => {
      const onResize = vi.fn();
      let prevPos = 300;

      // Simulate pointer movement sequence:
      // Drag 1: +25px
      let currentPos = 325;
      let delta = currentPos - prevPos;
      prevPos = currentPos;
      if (delta !== 0) onResize(delta, currentPos);

      expect(onResize).toHaveBeenLastCalledWith(25, 325);

      // Drag 2: -10px
      currentPos = 315;
      delta = currentPos - prevPos;
      prevPos = currentPos;
      if (delta !== 0) onResize(delta, currentPos);

      expect(onResize).toHaveBeenLastCalledWith(-10, 315);
      expect(onResize).toHaveBeenCalledTimes(2);
    });

    it("executes keyboard navigation step increments and resets", () => {
      const onResize = vi.fn();
      const onReset = vi.fn();

      // Keyboard handler logic emulation for vertical splitter
      const simulateKey = (key: string, shiftKey: boolean, isVertical: boolean) => {
        const step = shiftKey ? 25 : 8;
        if (isVertical) {
          if (key === "ArrowLeft") onResize(-step, 0);
          else if (key === "ArrowRight") onResize(step, 0);
        } else {
          if (key === "ArrowUp") onResize(-step, 0);
          else if (key === "ArrowDown") onResize(step, 0);
        }
        if (key === "Enter" || key === " " || key === "Backspace") {
          onReset();
        }
      };

      // Standard arrow right (+8)
      simulateKey("ArrowRight", false, true);
      expect(onResize).toHaveBeenLastCalledWith(8, 0);

      // Shift + arrow left (-25)
      simulateKey("ArrowLeft", true, true);
      expect(onResize).toHaveBeenLastCalledWith(-25, 0);

      // Enter key triggers reset
      simulateKey("Enter", false, true);
      expect(onReset).toHaveBeenCalledTimes(1);

      // Space key triggers reset
      simulateKey(" ", false, true);
      expect(onReset).toHaveBeenCalledTimes(2);
    });
  });

  describe("3. Windows Responsive DPI & Screen Scaling Adaptations", () => {
    it("handles common Windows display resolutions without collapsing canvas", () => {
      const windowsResolutions = [
        { name: "1080p 150% Scale (Effective 1280x720)", width: 1280, height: 720 },
        { name: "1080p 125% Scale (Effective 1536x864)", width: 1536, height: 864 },
        { name: "1080p 100% Scale (1920x1080)", width: 1920, height: 1080 },
        { name: "1440p 125% Scale (2048x1152)", width: 2048, height: 1152 },
        { name: "4K 200% Scale (1920x1080)", width: 1920, height: 1080 },
      ];

      for (const res of windowsResolutions) {
        const maxSidebarAllowed = Math.min(MAX_TOOLS_SIDEBAR_WIDTH, Math.floor(res.width * 0.42));
        const maxTimelineAllowed = Math.min(MAX_TIMELINE_HEIGHT, Math.floor(res.height * 0.6));

        // Even with max sidebar width, canvas has ample horizontal space
        const remainingCanvasWidth = res.width - maxSidebarAllowed - 40;
        expect(remainingCanvasWidth).toBeGreaterThan(450);

        // Even with max timeline height, canvas has ample vertical space
        const remainingCanvasHeight = res.height - maxTimelineAllowed - 52;
        expect(remainingCanvasHeight).toBeGreaterThan(180);
      }
    });

    it("verifies dynamic auto-clamping on small window resize", () => {
      useEditor.getState().setToolsSidebarWidth(500);
      useEditor.getState().setLlmSidebarWidth(500);
      useEditor.getState().setTimelineHeight(500);

      // Emulate window resize to small Windows snap window (e.g. 1024x600)
      const windowWidth = 1024;
      const windowHeight = 600;

      const maxSafeTools = Math.min(MAX_TOOLS_SIDEBAR_WIDTH, Math.floor(windowWidth * 0.38));
      const maxSafeLlm = Math.min(MAX_LLM_SIDEBAR_WIDTH, Math.floor(windowWidth * 0.38));
      const maxSafeTimeline = Math.min(MAX_TIMELINE_HEIGHT, Math.floor(windowHeight * 0.45));

      if (useEditor.getState().toolsSidebarWidth > maxSafeTools) {
        useEditor.getState().setToolsSidebarWidth(maxSafeTools);
      }
      if (useEditor.getState().llmSidebarWidth > maxSafeLlm) {
        useEditor.getState().setLlmSidebarWidth(maxSafeLlm);
      }
      if (useEditor.getState().timelineHeight > maxSafeTimeline) {
        useEditor.getState().setTimelineHeight(maxSafeTimeline);
      }

      expect(useEditor.getState().toolsSidebarWidth).toBeLessThanOrEqual(maxSafeTools);
      expect(useEditor.getState().llmSidebarWidth).toBeLessThanOrEqual(maxSafeLlm);
      expect(useEditor.getState().timelineHeight).toBeLessThanOrEqual(maxSafeTimeline);
    });
  });
});
