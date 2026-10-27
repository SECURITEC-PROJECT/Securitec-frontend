import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import AlcootestPanel from "./AlcootestPanel";
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
  const [activeTab, setActiveTab] = useState<"cles" | "alcootest">("cles");
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [siteId, sites]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrôle d’accès"
        subtitle="Suivi des clés et contrôles d’alcoolémie enregistrés dans la base de données."
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

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {([["cles", "Suivi des clés"], ["alcootest", "Contrôles d’alcoolémie"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`rounded px-3 py-2 text-sm font-medium transition-colors ${activeTab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "cles" && <GestionClesPanel siteId={siteId} />}
      {activeTab === "alcootest" && <AlcootestPanel siteId={siteId} />}
    </div>
  );
}
