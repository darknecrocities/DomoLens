import {
  BACKGROUND_PRESETS,
  CURSOR_PRESETS,
  SHADOW_PRESETS,
} from "@domolens/core";
import { copy } from "../../copy/en";
import { useEditor } from "../../store/editor";

export function LooksPanel() {
  const { project, updateLooks } = useEditor();

  if (!project) return null;
  const looks = project.looks;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto p-4 space-y-6">
      {/* 1. Backgrounds */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {copy.looks.background}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BACKGROUND_PRESETS.map((preset) => {
            const isSelected = looks.backgroundValue === preset.value;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  updateLooks({
                    backgroundType: preset.type,
                    backgroundValue: preset.value,
                  })
                }
                className={`flex min-h-[44px] items-center gap-2.5 rounded-xl border p-2 text-left transition-all touch-manipulation ${
                  isSelected
                    ? "border-white bg-ink-700 shadow-sm"
                    : "border-ink-700 bg-ink-800 hover:border-ink-600"
                }`}
              >
                <div
                  className="size-6 shrink-0 rounded-lg border border-ink-600 shadow-inner"
                  style={{ background: preset.value }}
                />
                <span className="truncate text-xs font-medium text-fg">{preset.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Framing Sliders: Padding & Corners */}
      <div className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-medium">
            <span className="text-fg-muted">{copy.looks.padding}</span>
            <span className="font-mono text-fg">{looks.padding}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={4}
            value={looks.padding}
            onChange={(e) => updateLooks({ padding: Number(e.target.value) })}
            className="w-full accent-white py-2 cursor-pointer touch-none"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs font-medium">
            <span className="text-fg-muted">{copy.looks.corners}</span>
            <span className="font-mono text-fg">{looks.borderRadius}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={48}
            step={2}
            value={looks.borderRadius}
            onChange={(e) => updateLooks({ borderRadius: Number(e.target.value) })}
            className="w-full accent-white py-2 cursor-pointer touch-none"
          />
        </div>
      </div>

      {/* 3. Drop Shadow Preset */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {copy.looks.shadow}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SHADOW_PRESETS.map((preset) => {
            const isSelected = looks.shadow === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateLooks({ shadow: preset.id })}
                className={`flex min-h-[44px] items-center justify-center rounded-xl border p-2 text-center text-xs font-medium transition-all touch-manipulation ${
                  isSelected
                    ? "border-white bg-ink-700 text-white font-bold"
                    : "border-ink-700 bg-ink-800 text-fg-muted hover:border-ink-600 hover:text-fg"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Mouse Pointer Styling */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-fg-muted">
          {copy.looks.cursor}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CURSOR_PRESETS.map((preset) => {
            const isSelected = looks.cursorStyle === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => updateLooks({ cursorStyle: preset.id, showCursor: preset.id !== "hidden" })}
                className={`flex min-h-[44px] items-center justify-center rounded-xl border p-2 text-center text-xs font-medium transition-all touch-manipulation ${
                  isSelected
                    ? "border-white bg-ink-700 text-white font-bold"
                    : "border-ink-700 bg-ink-800 text-fg-muted hover:border-ink-600 hover:text-fg"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Click Ripples Toggle */}
      <div className="rounded-2xl border border-ink-700 bg-ink-800/80 p-3.5">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex flex-col pr-2">
            <span className="text-sm font-semibold text-fg">{copy.looks.ripples}</span>
            <span className="text-xs text-fg-muted">{copy.looks.ripplesDesc}</span>
          </div>
          <input
            type="checkbox"
            checked={looks.showClickRipples}
            onChange={(e) => updateLooks({ showClickRipples: e.target.checked })}
            className="size-5 accent-white rounded cursor-pointer"
          />
        </label>
      </div>
    </div>
  );
}
