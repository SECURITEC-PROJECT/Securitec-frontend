import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [siteId, sites]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mouvements des clés"
        subtitle="Enregistrement des sorties et suivi des retours de clés pour le site sélectionné."
      />

      <div className="max-w-md space-y-1">
        <label htmlFor="access-control-site" className="text-sm font-medium">Site concerné</label>
        <select id="access-control-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={sites.length <= 1}>
          <option value="">Sélectionner un site</option>
          {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
        {siteError && <p className="text-sm text-destructive">{siteError}</p>}
        {!siteError && !sites.length && <p className="text-sm text-muted-foreground">Aucun site actif n’est associé ou disponible pour ce compte.</p>}
      </div>

      <GestionClesPanel siteId={siteId} />
    </div>
  );
}
