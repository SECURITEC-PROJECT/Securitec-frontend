import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check } from "lucide-react";
import type { DocumentItem } from "./ListDocumentation";

interface ModalDocumentationProps {
  doc: DocumentItem | undefined;
  open: boolean;
  onClose: () => void;
  onConfirmRead: (id: string) => void;
}

export default function ModalDocumentation({
  doc,
  open,
  onClose,
  onConfirmRead,
}: ModalDocumentationProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{doc?.title}</DialogTitle>
        </DialogHeader>
        <p className="py-4 text-sm leading-relaxed">{doc?.content}</p>
        <Button
          onClick={() => {
            if (doc?.id) onConfirmRead(doc.id);
            onClose();
          }}
        >
          <Check /> Confirmer la lecture
        </Button>
      </DialogContent>
    </Dialog>
  );
}