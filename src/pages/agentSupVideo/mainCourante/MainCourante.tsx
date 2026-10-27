import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { toast } from "sonner";
import FormulaireEvenement from "./FormulaireEvenement";
import JournalEvenements from "./JournalEvenements";
import ModuleQQOQCP from "./ModuleQQOQCP";
import ViolationsProcedure from "./ViolationsProcedure";

export default function MainCourante() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'standard' | 'violation' | 'qqoqcp'>('standard');

  useEffect(() => {
    if (!siteId && sites.length > 0) setSiteId(sites[0].id);
  }, [siteId, sites]);

  const fetchMainCourante = async () => {
    if (!siteId) { setData([]); return; }
    try {
      setData(await serviceApi.listMainCourante(siteId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement de la main courante impossible.");
    }
  };

  useEffect(() => {
    void fetchMainCourante();
  }, [siteId]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Main courante" 
        subtitle="Journal chronologique et horodaté des événements du site, violations et faits notables" 
      />

      <div className="max-w-xl">
        <label htmlFor="main-courante-site" className="mb-1 block text-sm font-medium">Site de travail</label>
        <select id="main-courante-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {!sites.length && <option value="">Aucun site disponible</option>}
          {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
        {siteError && <p className="mt-2 text-sm text-destructive">{siteError}</p>}
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          ['standard', 'Journal & Entrée Standard'],
          ['violation', 'Violation de procédure'],
          ['qqoqcp', 'Fait notable (QQOQCP)']
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === key 
                ? 'bg-primary text-primary-foreground shadow' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'standard' && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <FormulaireEvenement siteId={siteId} onRefresh={fetchMainCourante} />
          <JournalEvenements data={data} />
        </div>
      )}

      {activeTab === 'violation' && (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <ViolationsProcedure siteId={siteId} onRefresh={fetchMainCourante} />
          <JournalEvenements data={data} />
        </div>
      )}

      {activeTab === 'qqoqcp' && (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <ModuleQQOQCP siteId={siteId} onRefresh={fetchMainCourante} />
          <JournalEvenements data={data} />
        </div>
      )}
    </div>
  );
}
