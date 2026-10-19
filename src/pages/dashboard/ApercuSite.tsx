import siteCamera from "@/assets/site-camera.jpg";
import { Video } from "lucide-react";
import { Link } from "react-router-dom";

export default function ApercuSite() {
  return (
    <section>
      <div className="mb-3 flex justify-between">
        <h2 className="text-sm font-semibold">Aperçu du site</h2>
        <Link to="/dashboard/cameras" className="flex items-center gap-1 text-xs text-primary"><Video className="h-3 w-3" /> Mur caméras</Link>
      </div>
      <Link to="/dashboard/cameras" className="relative block overflow-hidden rounded-md">
        <img src={siteCamera} width={1280} height={720} alt="Vue illustrative du portail principal du site" className="aspect-video w-full object-cover" />
        <span className="absolute bottom-2 left-2 rounded bg-camera-overlay px-2 py-1 text-[10px] text-camera-foreground">CAM 01 · Portail principal · Image illustrative</span>
      </Link>
    </section>
  );
}