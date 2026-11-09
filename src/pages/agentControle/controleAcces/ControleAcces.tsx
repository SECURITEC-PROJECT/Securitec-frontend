import { KeyRound } from "lucide-react";
import { useState } from "react";
import GestionClesPanel from "./GestionClesPanel";
import { useSites } from "@/hooks/useSites";

export interface AccessBadge {
  id: string;
  uid: string;
  holder: string;
  zone: string;
  level: string;
  active: boolean;
  validite: string;
}

export default function ControleAcces() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const selectedSiteId = siteId || sites[0]?.id || "";

  return (
    <div className="keys-module space-y-4">
      <section className="keys-hero">
        <div className="keys-hero-icon"><KeyRound aria-hidden="true" /></div>
        <div className="keys-hero-copy">
          <h1>Mouvements des clés</h1>
          <p>Enregistrez et suivez tous les mouvements de clés</p>
        </div>
      </section>

      <GestionClesPanel siteId={selectedSiteId} sites={sites} onSiteChange={setSiteId} siteError={siteError} />
    </div>
  );
}
