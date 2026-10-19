import siteCamera from "@/assets/site-camera.jpg";
import { Button } from "@/components/ui/button";
import { Camera, Maximize2, VideoOff } from "lucide-react";

interface GrilleCamerasProps {
  count: string;
  names: string[];
  onCapture: (name: string) => void;
  onSelect: (name: string) => void;
}

export default function GrilleCameras({ count, names, onCapture, onSelect }: GrilleCamerasProps) {
  const total = Number(count);

  return (
    <div className={`grid gap-4 ${count === '1' ? '' : 'md:grid-cols-2'} ${total > 4 ? 'xl:grid-cols-4' : ''}`}>
      {Array.from({ length: total }, (_, i) => { 
        const cameraName = names[i % names.length] ?? "Caméra"; 
        const offline = i === 2; 
        return (
          <div key={i} className="overflow-hidden rounded-md border bg-card">
            <div className="relative aspect-video overflow-hidden">
              {offline ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
                  <VideoOff className="h-7 w-7" />
                  <p className="text-xs">Signal indisponible</p>
                </div>
              ) : (
                <img src={siteCamera} width={1280} height={720} loading="lazy" alt={`Illustration caméra ${cameraName}`} className="h-full w-full object-cover" />
              )}
              <span className="absolute left-2 top-2 rounded bg-camera-overlay px-2 py-1 font-mono text-[10px] text-camera-foreground">
                CAM {String(i + 1).padStart(2, '0')} · ILLUSTRATION
              </span>
              {!offline && (
                <Button variant="secondary" size="icon" className="absolute bottom-2 right-2" aria-label={`Agrandir ${cameraName}`} onClick={() => onSelect(cameraName)}>
                  <Maximize2 />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <p className="text-xs font-medium">{cameraName}</p>
              <Button variant="ghost" size="icon" title="Rattacher une capture" disabled={offline} onClick={() => onCapture(cameraName)}>
                <Camera />
              </Button>
            </div>
          </div>
        ); 
      })}
    </div>
  );
}