import { PageHeader } from "@/components/PageHeader";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import FormVigilance from "./FormVigilance";
import ListVigilance from "./ListVigilance";

export default function PointsVigilance() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [vigilanceData, setVigilanceData] = useState<Awaited<ReturnType<typeof serviceApi.listVigilance>>>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const selectedSiteId = siteId || sites[0]?.id || "";

  useEffect(() => {
    let active = true;
    serviceApi.listVigilance(selectedSiteId || undefined)
      .then((entries) => { if (active) setVigilanceData(entries); })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Chargement des points de vigilance impossible.");
      });
    return () => { active = false; };
  }, [refreshKey, selectedSiteId]);

  return <div className="space-y-6">
    <PageHeader title="Points de vigilance" subtitle="Contrôles périodiques et suivi des éléments de sécurité du site" />
    <div className="max-w-xl">
      <label htmlFor="vigilance-site" className="mb-1 block text-sm font-medium">Site de travail</label>
      <select id="vigilance-site" value={selectedSiteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        {!sites.length && <option value="">Aucun site disponible</option>}
        {sites.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type === "AGENCE" ? "Agence" : "Usine"}</option>)}
      </select>
      {siteError && <p className="mt-2 text-sm text-destructive">{siteError}</p>}
    </div>
    <div className="space-y-6">
      <FormVigilance siteId={selectedSiteId} onRefresh={() => setRefreshKey((key) => key + 1)} />
      <ListVigilance data={vigilanceData} />
    </div>
  </div>;
}
