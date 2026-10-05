import { copy } from "../../copy/en";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface DeleteModalProps {
  open: boolean;
  projectName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteModal({ open, projectName, onClose, onConfirm }: DeleteModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.project.deleteTitle}
      description={copy.project.deleteBody(projectName)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {copy.project.cancel}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {copy.project.deleteConfirm}
          </Button>
        </>
      }
    />
  );
}
