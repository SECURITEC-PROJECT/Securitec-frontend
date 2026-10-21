import { useEffect, useState } from "react";
import { VideoOff } from "lucide-react";

interface CameraStream { id: string; name: string; streamUrl: string; status: string; }

export default function FluxCamera({ camera, className = "" }: { camera: CameraStream; className?: string }) {
  const rtsp = /^rtsps?:/i.test(camera.streamUrl || "");
  const mjpeg = /\.(mjpg|mjpeg)(?:$|[?#])/i.test(camera.streamUrl || "");
  const [mode, setMode] = useState<"video" | "image">(mjpeg ? "image" : "video");
  const [state, setState] = useState("loading");

  useEffect(() => { setMode(mjpeg ? "image" : "video"); setState("loading"); }, [camera.id, camera.streamUrl, mjpeg]);

  if (camera.status === "MAINTENANCE") return <div className={`flex aspect-video flex-col items-center justify-center gap-2 bg-muted text-muted-foreground ${className}`}><VideoOff className="h-7 w-7" /><p className="text-sm">Caméra en maintenance</p></div>;
  if (!camera.streamUrl) return <div className={`flex aspect-video flex-col items-center justify-center gap-2 bg-muted text-muted-foreground ${className}`}><VideoOff className="h-7 w-7" /><p className="text-sm">Aucun flux configuré</p></div>;
  if (rtsp) return <div className={`flex aspect-video flex-col items-center justify-center gap-2 bg-muted px-4 text-center text-muted-foreground ${className}`}><VideoOff className="h-7 w-7" /><p className="text-sm">Ce flux RTSP doit passer par une passerelle web (HLS ou MJPEG) pour être lu dans le navigateur.</p></div>;

  return <div className={`relative aspect-video overflow-hidden bg-black ${className}`}>
    {mode === "image"
      ? <img src={camera.streamUrl} alt={`Flux de ${camera.name}`} className="h-full w-full object-contain" onLoad={() => setState("online")} onError={() => setState("error")} />
      : <video key={camera.streamUrl} src={camera.streamUrl} autoPlay muted playsInline controls className="h-full w-full object-contain" onPlaying={() => setState("online")} onError={() => setState("error")} />}
    <span className={`absolute bottom-2 left-2 rounded px-2 py-1 text-[10px] font-medium ${state === "online" ? "bg-emerald-600 text-white" : state === "error" ? "bg-destructive text-destructive-foreground" : "bg-camera-overlay text-camera-foreground"}`}>
      {state === "online" ? "Flux actif" : state === "error" ? "Flux indisponible" : "Connexion au flux…"}
    </span>
    {state === "error" && mode === "video" && <button type="button" className="absolute bottom-2 right-2 rounded bg-background/90 px-2 py-1 text-xs" onClick={() => { setMode("image"); setState("loading"); }}>Essayer en MJPEG</button>}
  </div>;
}
