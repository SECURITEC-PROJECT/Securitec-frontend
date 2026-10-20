import { PageHeader, Panel } from "@/components/PageHeader";
import { serviceApi } from "@/lib/service-api";
import { useSites } from "@/hooks/useSites";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import FormPriseDePoste from "./FormPriseDePoste";
import ListHistoriquePriseDePoste from "./ListHistoriquePriseDePoste";

interface Shift {
  id: string;
  agent_name: string;
  matricule: string;
  prestataire: string;
  site: string;
  siteId: string | null;
  shift: "JOUR" | "NUIT" | null;
  post_name: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
}

export default function PriseDePoste() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const { sites, canCreateSite, canDeleteSite, siteError, addSite, archiveSite } = useSites();

  useEffect(() => {
    serviceApi.listShifts().then(setShifts).catch((error) => setLoadError(error.message)).finally(() => setLoading(false));
  }, []);

  const start = async (details: { post: string; agent: string; matricule: string; prestataire: string; site: string; siteType: "USINE" | "AGENCE" }, notes: string) => {
    try {
      const shift = await serviceApi.startShift({ agentName: details.agent, matricule: details.matricule, providerName: details.prestataire, siteName: details.site, siteType: details.siteType, postName: details.post, observations: notes });
      setShifts((previous) => [shift, ...previous]);
      toast.success("Prise de poste enregistrée dans la base de données");
    } catch (error) {
      throw error;
    }
  };

  const end = async (id: string) => {
    const target = shifts.find((shift) => shift.id === id);
    if (!target || target.ended_at) return;
    try {
      const result = await serviceApi.endShift(id);
      setShifts((previous) => previous.map((shift) => shift.id === id ? { ...shift, ended_at: result.ended_at } : shift));
      toast.success("Fin de service enregistrée dans la base de données");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Clôture impossible");
    }
  };

  const fmt = (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "En cours";

  return <div>
    <PageHeader title="Prise de poste" subtitle="Informations de l’agent, poste et contrôles du rapport journalier." />
    {(loadError || siteError) && <Panel title="Connexion backend"><p className="text-sm text-destructive">{loadError || siteError}</p></Panel>}
    {loading ? <Panel title="Chargement"><p className="text-sm text-muted-foreground">Chargement des vacations…</p></Panel> : <div className="grid gap-6 lg:grid-cols-2">
      <FormPriseDePoste onStart={start} sites={sites} canCreateSite={canCreateSite} canDeleteSite={canDeleteSite} onAddSite={addSite} onArchiveSite={archiveSite} />
      <ListHistoriquePriseDePoste shifts={shifts} fmt={fmt} onEnd={(id) => void end(id)} />
    </div>}
  </div>;
}
