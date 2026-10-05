import { useEffect, useState, type FormEvent } from "react";
import { cleanProjectName } from "@domolens/core";
import { copy } from "../../copy/en";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { TextField } from "../ui/TextField";

interface RenameModalProps {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (newName: string) => void;
}

export function RenameModal({ open, initialName, onClose, onSave }: RenameModalProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) {
      setName(initialName);
    }
  }, [open, initialName]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = cleanProjectName(name);
    onSave(cleaned);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.project.renameTitle}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {copy.project.cancel}
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {copy.project.save}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label={copy.project.renameLabel}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </form>
    </Modal>
  );
}
