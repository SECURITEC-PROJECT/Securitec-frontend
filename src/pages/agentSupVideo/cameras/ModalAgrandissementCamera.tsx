import siteCamera from "@/assets/site-camera.jpg";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera } from "lucide-react";

interface ModalAgrandissementCameraProps {
  selected: string | null;
  onClose: () => void;
  onCapture: (name: string) => void;
}

export default function ModalAgrandissementCamera({ selected, onClose, onCapture }: ModalAgrandissementCameraProps) {
  return (
    <Dialog open={selected !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{selected} · Image illustrative</DialogTitle>
        </DialogHeader>
        <img src={siteCamera} width={1280} height={720} alt="Vue illustrative agrandie" className="w-full" />
        <Button onClick={() => { onCapture(selected ?? 'Caméra'); onClose(); }}>
          <Camera /> Rattacher une capture
        </Button>
      </DialogContent>
    </Dialog>
  );
}