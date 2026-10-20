import { Button } from "@/components/ui/button";
import { Maximize2, Pencil, Power, Trash2 } from "lucide-react";
import FluxCamera from "./FluxCamera";

export interface CameraItem {
  id: string;
  name: string;
  streamUrl: string;
  status: "EN_SERVICE" | "MAINTENANCE";
  zoneId: string;
  zoneName: string;
  siteId: string;
  siteName: string;
  accessLevel: number;
}

interface GrilleCamerasProps {
  count: string;
  cameras: CameraItem[];
  onSelect: (camera: CameraItem) => void;
  onEdit: (camera: CameraItem) => void;
  onStatus: (camera: CameraItem) => void;
  onDelete: (camera: CameraItem) => void;
}

export default function GrilleCameras({ count, cameras, onSelect, onEdit, onStatus, onDelete }: GrilleCamerasProps) {
  const visible = cameras.slice(0, Number(count));
  const grid = count === "1" ? "grid-cols-1" : Number(count) > 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2";

  if (!cameras.length) return <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Aucune caméra n’est configurée pour ce site. Ajoutez une caméra et son URL de flux pour commencer.</div>;

  return <div className={`grid gap-4 ${grid}`}>
    {visible.map((camera, index) => <article key={camera.id} className="overflow-hidden rounded-md border bg-card">
      <div className="relative">
        <FluxCamera camera={camera} />
        <span className="absolute left-2 top-2 rounded bg-camera-overlay px-2 py-1 font-mono text-[10px] text-camera-foreground">CAM {String(index + 1).padStart(2, "0")}</span>
        <Button variant="secondary" size="icon" className="absolute right-2 top-2" aria-label={`Agrandir ${camera.name}`} onClick={() => onSelect(camera)}><Maximize2 /></Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{camera.name}</p>
          <p className="truncate text-xs text-muted-foreground">{camera.siteName} · {camera.zoneName}</p>
        </div>
        <Button variant="ghost" size="icon" aria-label={`Modifier ${camera.name}`} title="Modifier" onClick={() => onEdit(camera)}><Pencil /></Button>
        <Button variant="ghost" size="icon" aria-label={camera.status === "MAINTENANCE" ? `Remettre ${camera.name} en service` : `Mettre ${camera.name} en maintenance`} title={camera.status === "MAINTENANCE" ? "Remettre en service" : "Maintenance"} onClick={() => onStatus(camera)}><Power /></Button>
        <Button variant="ghost" size="icon" aria-label={`Supprimer ${camera.name}`} title="Supprimer" onClick={() => onDelete(camera)}><Trash2 className="text-destructive" /></Button>
      </div>
    </article>)}
    {visible.length < cameras.length && <p className="text-xs text-muted-foreground sm:col-span-2 xl:col-span-4">{cameras.length - visible.length} caméra(s) masquée(s) par la disposition choisie.</p>}
  </div>;
}
