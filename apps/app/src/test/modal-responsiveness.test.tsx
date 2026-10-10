import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Modal } from "../components/ui/Modal";
import { ExportModal } from "../components/editor/ExportModal";
import { DEFAULT_LOOKS, type ProjectData } from "@domolens/core";

const mockProject: ProjectData = {
  summary: {
    id: "proj_test_resp",
    name: "Responsiveness Demo",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    durationMs: 10000,
    media: "/mock/recording.webm",
    source: "recording",
    width: 1920,
    height: 1080,
    thumbnail: null,
  },
  looks: DEFAULT_LOOKS,
  clicks: [],
  zoomBlocks: [],
  clips: [],
};

describe("Modal & Export Dialog Responsiveness", () => {
  it("renders Modal with vertical containment, flex-column layout, and scrollable body", () => {
    const html = renderToStaticMarkup(
      <Modal
        open={true}
        onClose={() => {}}
        title="Test Responsive Modal"
        description="A calm responsive modal test"
        footer={<button>Submit</button>}
      >
        <div style={{ height: "1200px" }}>Tall content that needs internal scrolling</div>
      </Modal>
    );

    // Modal dialog must contain max-height constraints to avoid exceeding viewport
    expect(html).toContain("max-h-[92dvh]");
    expect(html).toContain("sm:max-h-[min(90vh,54rem)]");
    expect(html).toContain("flex flex-col");
    expect(html).toContain("overflow-hidden");

    // Body content must be placed in a flexible, scrollable container
    expect(html).toContain("flex-1 min-h-0 overflow-y-auto");

    // Header and footer must remain pinned and shrink-resistant
    expect(html).toContain("shrink-0");
  });

  it("renders ExportModal with spacious 2xl size and responsive card badges", () => {
    const html = renderToStaticMarkup(
      <ExportModal
        open={true}
        project={mockProject}
        onClose={() => {}}
      />
    );

    // ExportModal must request 2xl sizing to prevent 3-column card squishing
    expect(html).toContain("sm:max-w-2xl");

    // Must feature responsive grid columns for aspect ratio and formats
    expect(html).toContain("grid-cols-1 sm:grid-cols-3");

    // Quality must feature 2-column responsive layout
    expect(html).toContain("grid-cols-1 sm:grid-cols-2");

    // Badges must have flex-wrap and whitespace-nowrap protection
    expect(html).toContain("whitespace-nowrap");
    expect(html).toContain("flex-wrap");
  });
});
