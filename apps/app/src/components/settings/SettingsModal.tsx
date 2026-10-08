import { useState } from "react";
import { HelpCircle, Sparkles, Trash2 } from "lucide-react";
import { copy } from "../../copy/en";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TextField } from "../ui/TextField";
import { useSettings } from "../../store/settings";
import { useTutorial } from "../../store/tutorial";
import { toast } from "../../store/toast";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { apiKey, setApiKey, clearApiKey } = useSettings();
  const [inputVal, setInputVal] = useState(apiKey);

  const handleSave = () => {
    setApiKey(inputVal);
    toast.success(copy.settings.keySaved);
    onClose();
  };

  const handleRemove = () => {
    clearApiKey();
    setInputVal("");
    toast.info("API key removed.");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.settings.title}
      description={copy.settings.aiNotice}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {copy.project.cancel}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {copy.settings.saveKey}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-ink-700 bg-ink-900/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
            <Sparkles className="size-4" />
            <span>{copy.settings.aiTitle}</span>
          </div>
          <p className="text-xs text-fg-muted leading-relaxed">
            {copy.settings.aiNotice}
          </p>
        </div>

        <div className="space-y-2">
          <TextField
            label={copy.settings.apiKeyLabel}
            placeholder={copy.settings.apiKeyPlaceholder}
            type="password"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
          />
        </div>

        {apiKey && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 text-xs text-danger hover:underline"
            >
              <Trash2 className="size-3.5" />
              <span>{copy.settings.removeKey}</span>
            </button>
          </div>
        )}

        {/* Interactive Studio Walkthrough Tutorial */}
        <div className="rounded-2xl border border-neutral-700 bg-neutral-900/80 p-4">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <HelpCircle className="size-4 text-white" />
              <span>Studio Walkthrough Tutorial</span>
            </div>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed mb-3">
            Replay the spotlight tutorial to explore how Auto-Zoom, interactive camera framing, keyframes, and offline rendering work.
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              useTutorial.getState().resetTutorial();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-white py-2 text-xs font-bold uppercase text-black hover:bg-neutral-200 transition-colors shadow-sm"
          >
            <Sparkles className="size-3.5 fill-black" />
            <span>Launch Studio Tutorial</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
