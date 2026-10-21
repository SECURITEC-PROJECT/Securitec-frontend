import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CameraItem } from "./GrilleCameras";
import FluxCamera from "./FluxCamera";

interface ModalAgrandissementCameraProps { selected: CameraItem | null; onClose: () => void; }

export default function ModalAgrandissementCamera({ selected, onClose }: ModalAgrandissementCameraProps) {
  return <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-w-5xl">
      <DialogHeader><DialogTitle>{selected?.name} · {selected?.zoneName}</DialogTitle></DialogHeader>
      {selected && <FluxCamera camera={selected} />}
    </DialogContent>
  </Dialog>;
}
