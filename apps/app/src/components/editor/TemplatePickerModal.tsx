import { useState } from "react";
import {
  Sparkles,
  Volume2,
  Check,
  Smartphone,
  Monitor,
  Square,
  Layout,
  Wand2,
} from "lucide-react";
import {
  STUDIO_MOTION_TEMPLATES,
  type MotionTemplate,
  type TemplateCategory,
} from "@domolens/core";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { useEditor } from "../../store/editor";
import { sfx } from "../../lib/sound-effects";

interface TemplatePickerModalProps {
  open: boolean;
  onClose: () => void;
}

export function TemplatePickerModal({ open, onClose }: TemplatePickerModalProps) {
  const applyTemplate = useEditor((s) => s.applyTemplate);
  const activeTemplateId = useEditor((s) => s.activeTemplateId);

  const [selectedCategory, setSelectedCategory] = useState<"all" | TemplateCategory>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<MotionTemplate>(
    STUDIO_MOTION_TEMPLATES[0]!
  );

  // Editable fields draft for the selected template
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  const filteredTemplates = STUDIO_MOTION_TEMPLATES.filter((tpl) => {
    if (selectedCategory === "all") return true;
    return tpl.category === selectedCategory;
  });

  const handleSelect = (tpl: MotionTemplate) => {
    setSelectedTemplate(tpl);
    // Initialize default field values
    const defaults: Record<string, string> = {};
    tpl.customizableFields.forEach((f) => {
      defaults[f.id] = f.defaultValue;
    });
    setCustomFields(defaults);

    // Audition template sound effect
    if (tpl.audioSettings.typingSoundPreset && tpl.audioSettings.typingSoundPreset !== "none") {
      sfx.playTypingBurst(3, 85, tpl.audioSettings.typingSoundPreset, 0.65);
    } else {
      sfx.playClickBop(tpl.audioSettings.clickSoundPreset || "bop", 0.7);
    }
  };

  const handlePlaySound = (tpl: MotionTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tpl.audioSettings.typingSoundPreset && tpl.audioSettings.typingSoundPreset !== "none") {
      sfx.playTypingBurst(4, 90, tpl.audioSettings.typingSoundPreset, 0.75);
    } else {
      sfx.playClickBop(tpl.audioSettings.clickSoundPreset || "bop", 0.8);
    }
  };

  const handleApply = () => {
    applyTemplate(selectedTemplate.id);

    // If user edited custom text in the modal, apply the customized headline to project text overlays
    const state = useEditor.getState();
    if (state.project && customFields["headline"]) {
      const overlays = state.project.textOverlays || [];
      const updatedOverlays = overlays.map((o) => {
        if (o.id.startsWith("text-tpl-")) {
          return {
            ...o,
            text: customFields["headline"] || o.text,
            badge: customFields["badge"] || o.badge,
            color: customFields["accent"] ? "#ffffff" : o.color,
          };
        }
        return o;
      });

      useEditor.setState({
        project: {
          ...state.project,
          textOverlays: updatedOverlays,
          looks: {
            ...state.project.looks,
            brandAccentColor: customFields["accent"] || state.project.looks.brandAccentColor,
          },
        },
      });
    }

    onClose();
  };

  const getAspectIcon = (aspect: string) => {
    if (aspect === "9:16") return <Smartphone className="size-3.5" />;
    if (aspect === "1:1") return <Square className="size-3.5" />;
    if (aspect === "4:3") return <Layout className="size-3.5" />;
    return <Monitor className="size-3.5" />;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Motion Video Templates"
      description="Apply pre-made motion designer choreography, framing, and mechanical keyboard soundscapes in 1 click."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Sparkles className="size-3.5 text-indigo-400" />
            <span>Fully customizable after applying</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Wand2 className="size-4" />}
              onClick={handleApply}
            >
              Apply "{selectedTemplate.name}"
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4 max-h-[75vh] overflow-hidden -mx-2 px-2">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: "all" as const, label: "All Templates" },
            { id: "saas" as const, label: "SaaS Launch" },
            { id: "keynote" as const, label: "Apple Keynote" },
            { id: "social" as const, label: "Shorts / TikTok (9:16)" },
            { id: "developer" as const, label: "Developer CLI" },
            { id: "tutorial" as const, label: "Tutorials" },
            { id: "teaser" as const, label: "Product Hunt" },
            { id: "showcase" as const, label: "Design Reels" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-3 py-1 font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 2-Column Main Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 overflow-y-auto max-h-[52vh] pr-1">
          {/* Left: Template Cards List (7 Cols) */}
          <div className="md:col-span-7 space-y-2.5">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplate.id === tpl.id;
              const isCurrentActive = activeTemplateId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  onClick={() => handleSelect(tpl)}
                  className={`group relative flex flex-col rounded-xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-white bg-neutral-800/90 shadow-lg ring-1 ring-white/20"
                      : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3.5 rounded-full ring-2 ring-white/20"
                        style={{ backgroundColor: tpl.accentColor }}
                      />
                      <span className="font-semibold text-sm text-white group-hover:text-white">
                        {tpl.name}
                      </span>
                      {isCurrentActive && (
                        <span className="flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Check className="size-2.5" /> Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
                      <span className="flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 border border-neutral-700/60">
                        {getAspectIcon(tpl.aspectRatio)}
                        <span>{tpl.aspectRatio}</span>
                      </span>
                    </div>
                  </div>

                  <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                    {tpl.tagline}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-neutral-800/80">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">
                        {tpl.badge}
                      </span>
                      <span className="text-neutral-500">•</span>
                      <span className="text-[11px] text-neutral-400">
                        {tpl.looks.windowFrame || "macOS"} Frame
                      </span>
                    </div>

                    {/* SFX Audition Trigger */}
                    <button
                      type="button"
                      onClick={(e) => handlePlaySound(tpl, e)}
                      title="Audition keyboard sound"
                      className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium text-neutral-300 bg-neutral-800 hover:bg-neutral-700 hover:text-white transition-colors"
                    >
                      <Volume2 className="size-3 text-amber-400" />
                      <span className="capitalize">
                        {tpl.audioSettings.typingSoundPreset || "Mechanical"}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Selected Template Inspector & Quick Wording Editor (5 Cols) */}
          <div className="md:col-span-5 flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/90 p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: selectedTemplate.accentColor }}
                />
                <h4 className="font-bold text-sm text-white">
                  {selectedTemplate.name}
                </h4>
              </div>
              <p className="text-xs text-neutral-400">
                {selectedTemplate.description}
              </p>
            </div>

            {/* Template Specs Mini Pill Matrix */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-neutral-800/70 p-2 border border-neutral-800">
                <span className="block text-neutral-500 font-medium text-[10px] uppercase">
                  Window Shell
                </span>
                <span className="text-white font-semibold capitalize">
                  {selectedTemplate.looks.windowFrame || "macOS Sonoma"}
                </span>
              </div>
              <div className="rounded-lg bg-neutral-800/70 p-2 border border-neutral-800">
                <span className="block text-neutral-500 font-medium text-[10px] uppercase">
                  Camera 3D Tilt
                </span>
                <span className="text-white font-semibold">
                  {selectedTemplate.looks.tiltAngle ? `${selectedTemplate.looks.tiltAngle}° Pitch` : "Flat 2D"}
                </span>
              </div>
              <div className="rounded-lg bg-neutral-800/70 p-2 border border-neutral-800">
                <span className="block text-neutral-500 font-medium text-[10px] uppercase">
                  Physics Easing
                </span>
                <span className="text-white font-semibold capitalize">
                  {selectedTemplate.looks.cameraPhysics || "Spring Physics"}
                </span>
              </div>
              <div className="rounded-lg bg-neutral-800/70 p-2 border border-neutral-800">
                <span className="block text-neutral-500 font-medium text-[10px] uppercase">
                  Mechanical Audio
                </span>
                <span className="text-amber-300 font-semibold capitalize">
                  {selectedTemplate.audioSettings.typingSoundPreset || "Creamy"}
                </span>
              </div>
            </div>

            {/* Quick Template Wording Customizer */}
            <div className="space-y-3 pt-2 border-t border-neutral-800">
              <span className="block text-xs font-semibold text-white">
                Customize Template Text & Colors
              </span>

              {selectedTemplate.customizableFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
                    <span>{field.label}</span>
                    {field.type === "color" && (
                      <span
                        className="size-3.5 rounded border border-neutral-600 inline-block"
                        style={{ backgroundColor: customFields[field.id] || field.defaultValue }}
                      />
                    )}
                  </label>

                  {field.type === "color" ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customFields[field.id] || field.defaultValue}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className="size-7 rounded cursor-pointer bg-neutral-800 border-0 p-0"
                      />
                      <input
                        type="text"
                        value={customFields[field.id] || field.defaultValue}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      value={customFields[field.id] !== undefined ? customFields[field.id] : field.defaultValue}
                      onChange={(e) =>
                        setCustomFields((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-white focus:border-white focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
