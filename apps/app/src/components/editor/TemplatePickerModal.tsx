import { useState, useEffect } from "react";
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

  useEffect(() => {
    const defaults: Record<string, string> = {};
    selectedTemplate.customizableFields.forEach((f) => {
      defaults[f.id] = f.defaultValue;
    });
    setCustomFields(defaults);
  }, [selectedTemplate.id]);

  const filteredTemplates = STUDIO_MOTION_TEMPLATES.filter((tpl) => {
    if (selectedCategory === "all") return true;
    return tpl.category === selectedCategory;
  });

  const handleSelect = (tpl: MotionTemplate) => {
    setSelectedTemplate(tpl);
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
      size="5xl"
      title="Motion Video Templates"
      description="Apply pre-made motion designer choreography, framing, and mechanical keyboard soundscapes in 1 click."
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Sparkles className="size-3.5 text-indigo-400" />
            <span>Fully customizable after applying — fine-tune anytime in Studio</span>
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
      <div className="flex flex-col gap-4 -mx-1 px-1">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
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
              className={`rounded-full px-3 py-1 font-medium whitespace-nowrap transition-all text-xs cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-700 border border-neutral-700/50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* 2-Column Main Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Template Cards List (7 Cols) */}
          <div className="lg:col-span-7 h-[490px] overflow-y-auto pr-1 space-y-2.5">
            {filteredTemplates.map((tpl) => {
              const isSelected = selectedTemplate.id === tpl.id;
              const isCurrentActive = activeTemplateId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  onClick={() => handleSelect(tpl)}
                  className={`group relative flex flex-col rounded-xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? "border-white bg-neutral-800/90 shadow-xl ring-1 ring-white/30"
                      : "border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="size-3.5 rounded-full ring-2 ring-white/20 shrink-0"
                        style={{ backgroundColor: tpl.accentColor }}
                      />
                      <span className="font-semibold text-sm text-white">
                        {tpl.name}
                      </span>
                      {isCurrentActive && (
                        <span className="flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Check className="size-2.5" /> Active
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-300">
                      <span className="flex items-center gap-1 rounded bg-neutral-800/90 px-2 py-0.5 border border-neutral-700/60">
                        {getAspectIcon(tpl.aspectRatio)}
                        <span>{tpl.aspectRatio}</span>
                      </span>
                    </div>
                  </div>

                  <p className="mt-1.5 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                    {tpl.tagline}
                  </p>

                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-neutral-800/80">
                    <div className="flex items-center gap-2 text-[11px] text-neutral-300">
                      <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-semibold text-neutral-300 border border-neutral-700/50">
                        {tpl.badge}
                      </span>
                      <span className="text-neutral-500">•</span>
                      <span className="text-[11px] text-neutral-400 capitalize">
                        {tpl.looks.windowFrame || "macOS"} Frame
                      </span>
                    </div>

                    {/* SFX Audition Trigger */}
                    <button
                      type="button"
                      onClick={(e) => handlePlaySound(tpl, e)}
                      title="Audition keyboard sound"
                      className="flex items-center gap-1.5 rounded px-2.5 py-0.5 text-[11px] font-medium text-neutral-300 bg-neutral-800/90 hover:bg-neutral-700 hover:text-white transition-colors border border-neutral-700/50 cursor-pointer"
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

          {/* Right: Selected Template Live Preview & Customizer (5 Cols) */}
          <div className="lg:col-span-5 h-[490px] overflow-y-auto flex flex-col rounded-xl border border-white/10 bg-neutral-950/70 p-4 space-y-3.5">
            {/* Live Animated Canvas Mockup */}
            <div
              className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl flex flex-col justify-between p-3 select-none transition-all duration-300 shrink-0"
              style={{
                background:
                  selectedTemplate.looks.backgroundValue ||
                  "linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)",
              }}
            >
              {/* Top bar with traffic lights and aspect ratio badge */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10">
                  <span className="size-1.5 rounded-full bg-rose-500/90" />
                  <span className="size-1.5 rounded-full bg-amber-500/90" />
                  <span className="size-1.5 rounded-full bg-emerald-500/90" />
                  <span className="ml-1 text-[9px] font-mono text-neutral-300 capitalize">
                    {selectedTemplate.looks.windowFrame || "macOS"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedTemplate.looks.tiltAngle && selectedTemplate.looks.tiltAngle > 0 && (
                    <span className="rounded bg-indigo-500/25 text-indigo-300 px-1.5 py-0.5 text-[9px] font-mono border border-indigo-500/30">
                      {selectedTemplate.looks.tiltAngle}° 3D
                    </span>
                  )}
                  <span className="flex items-center gap-1 rounded bg-black/50 text-neutral-200 px-1.5 py-0.5 text-[9px] font-mono border border-white/10">
                    {getAspectIcon(selectedTemplate.aspectRatio)}
                    <span>{selectedTemplate.aspectRatio}</span>
                  </span>
                </div>
              </div>

              {/* Simulated Window Screen with 3D tilt */}
              <div
                className="my-auto mx-auto w-[88%] rounded-lg border border-white/15 bg-neutral-900/80 backdrop-blur-md p-2.5 text-center shadow-2xl transition-transform duration-300"
                style={{
                  transform: selectedTemplate.looks.tiltAngle
                    ? `perspective(800px) rotateX(${selectedTemplate.looks.tiltAngle * 0.7}deg) rotateY(-${selectedTemplate.looks.tiltAngle * 0.4}deg)`
                    : undefined,
                }}
              >
                {/* Live Badge Preview */}
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase mb-1 shadow-sm"
                  style={{
                    backgroundColor: `${customFields["accent"] || selectedTemplate.accentColor}25`,
                    color: customFields["accent"] || selectedTemplate.accentColor,
                    border: `1px solid ${customFields["accent"] || selectedTemplate.accentColor}50`,
                  }}
                >
                  {customFields["badge"] || selectedTemplate.badge}
                </span>
                {/* Live Headline Preview */}
                <h5 className="text-xs font-bold text-white tracking-tight line-clamp-1">
                  {customFields["headline"] || selectedTemplate.name}
                </h5>
                <div className="mt-1.5 mx-auto h-0.5 w-10 rounded-full bg-white/20" />
              </div>

              {/* Bottom audio indicator */}
              <div className="flex items-center justify-between text-[10px] text-neutral-400 z-10">
                <span className="flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded backdrop-blur border border-white/5 font-mono text-[9px]">
                  <Volume2 className="size-2.5 text-amber-400" />
                  <span className="capitalize">{selectedTemplate.audioSettings.typingSoundPreset || "Mechanical"}</span>
                </span>
                <span className="text-[9px] text-neutral-400 font-mono opacity-80">
                  Motion Choreography
                </span>
              </div>
            </div>

            {/* Template Specs Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-neutral-800/60 p-2 border border-neutral-700/40">
                <span className="block text-neutral-400 font-medium text-[10px] uppercase">
                  Window Shell
                </span>
                <span className="text-white font-semibold text-xs capitalize">
                  {selectedTemplate.looks.windowFrame || "macOS"}
                </span>
              </div>
              <div className="rounded-lg bg-neutral-800/60 p-2 border border-neutral-700/40">
                <span className="block text-neutral-400 font-medium text-[10px] uppercase">
                  Camera 3D Pitch
                </span>
                <span className="text-white font-semibold text-xs">
                  {selectedTemplate.looks.tiltAngle ? `${selectedTemplate.looks.tiltAngle}° Tilt` : "Flat 2D"}
                </span>
              </div>
              <div className="rounded-lg bg-neutral-800/60 p-2 border border-neutral-700/40">
                <span className="block text-neutral-400 font-medium text-[10px] uppercase">
                  Physics Easing
                </span>
                <span className="text-white font-semibold text-xs capitalize">
                  {selectedTemplate.looks.cameraPhysics || "Spring"}
                </span>
              </div>
              <div className="rounded-lg bg-neutral-800/60 p-2 border border-neutral-700/40 flex items-center justify-between">
                <div>
                  <span className="block text-neutral-400 font-medium text-[10px] uppercase">
                    Mechanical Audio
                  </span>
                  <span className="text-amber-300 font-semibold text-xs capitalize">
                    {selectedTemplate.audioSettings.typingSoundPreset || "Creamy"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handlePlaySound(selectedTemplate, e)}
                  className="rounded bg-neutral-700 hover:bg-neutral-600 p-1 text-amber-300 transition-colors cursor-pointer"
                  title="Audition sound"
                >
                  <Volume2 className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Quick Template Wording Customizer */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Customize Text & Accent
                </span>
                <span className="text-[10px] text-neutral-400 font-mono">Live updates</span>
              </div>

              {selectedTemplate.customizableFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-[11px] font-medium text-neutral-300 flex items-center justify-between">
                    <span>{field.label}</span>
                    {field.type === "color" && (
                      <span
                        className="size-3.5 rounded border border-neutral-600 inline-block shadow-sm"
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
                        className="size-7 rounded cursor-pointer bg-neutral-800 border border-neutral-700 p-0.5"
                      />
                      <input
                        type="text"
                        value={customFields[field.id] || field.defaultValue}
                        onChange={(e) =>
                          setCustomFields((prev) => ({ ...prev, [field.id]: e.target.value }))
                        }
                        className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800/90 px-3 py-1.5 text-xs text-white font-mono focus:border-white focus:outline-none"
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
                      className="w-full rounded-lg border border-neutral-700 bg-neutral-800/90 px-3 py-1.5 text-xs text-white focus:border-white focus:outline-none placeholder:text-neutral-500"
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
