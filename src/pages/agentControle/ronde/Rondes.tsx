import { PageHeader } from "@/components/PageHeader";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ActivePatrolPanel from "./ActivePatrolPanel";
import PatrolHistoryPanel from "./PatrolHistoryPanel";
import StartPatrolPanel from "./StartPatrolPanel";

const POINTS = [
  "Accueil / hall", "Parking", "Portail principal", "Issues de secours",
  "Local technique", "Entrepôt", "Bureaux étage", "Clôture périmétrique",
];

type Checkpoint = { name: string; at: string | null };
type Patrol = {
  id: string; route_name: string; started_at: string; ended_at: string | null;
  checkpoints: Checkpoint[]; anomalies: string | null; siteId: string; site_name?: string;
};

export default function Rondes() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [route, setRoute] = useState("Ronde complète");
  const [observations, setObservations] = useState("");
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [saving, setSaving] = useState(false);
  const selectedSiteId = siteId || sites[0]?.id || "";
  const site = sites.find((item) => item.id === selectedSiteId);

  useEffect(() => {
    let active = true;
    serviceApi.listPatrols(selectedSiteId || undefined)
      .then((entries) => { if (active) setPatrols(entries); })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Chargement des rondes impossible.");
      });
    return () => { active = false; };
  }, [selectedSiteId]);

  const refreshPatrols = async () => {
    setPatrols(await serviceApi.listPatrols(selectedSiteId || undefined));
  };

  const active = useMemo(() => patrols.find((patrol) => !patrol.ended_at), [patrols]);

  const start = async () => {
    if (!selectedSiteId) return;
    setSaving(true);
    try {
      await serviceApi.startPatrol({
        routeName: route,
        siteId: selectedSiteId,
        checkpoints: POINTS.map((name) => ({ name, at: null })),
      });
      toast.success("Ronde démarrée.");
      await refreshPatrols();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de démarrer la ronde.");
    } finally { setSaving(false); }
  };

  const check = async (index: number) => {
    if (!active) return;
    const checkpoints = (active.checkpoints || []).map((point, current) => current === index
      ? { ...point, at: point.at ? null : new Date().toISOString() }
      : point);
    setSaving(true);
    try {
      await serviceApi.updatePatrol(active.id, checkpoints);
      await refreshPatrols();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour du point impossible.");
    } finally { setSaving(false); }
  };

  const finish = async () => {
    if (!active) return;
    setSaving(true);
    try {
      await serviceApi.finishPatrol(active.id, observations);
      setObservations("");
      toast.success("Ronde clôturée.");
      await refreshPatrols();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Clôture de la ronde impossible.");
    } finally { setSaving(false); }
  };

  const fmtTime = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  };

  return <div className="space-y-6">
    <PageHeader title="Patrouilles et rondes" subtitle="Suivi des rondes de sécurité du site" />
    <div className="max-w-xl">
      <label htmlFor="patrol-site" className="mb-1 block text-sm font-medium">Site de travail</label>
      <select id="patrol-site" value={selectedSiteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        {!sites.length && <option value="">Aucun site disponible</option>}
        {sites.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type === "AGENCE" ? "Agence" : "Usine"}</option>)}
      </select>
      {siteError && <p className="mt-2 text-sm text-destructive">{siteError}</p>}
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      {active ? <ActivePatrolPanel active={active} checkpoints={active.checkpoints || []} observations={observations} setObservations={setObservations} onCheck={check} onFinish={finish} fmtTime={fmtTime} saving={saving} />
        : <StartPatrolPanel route={route} setRoute={setRoute} sites={sites} siteId={selectedSiteId} setSiteId={setSiteId} onStart={start} saving={saving} />}
      <PatrolHistoryPanel data={patrols} fmt={fmtTime} />
    </div>
    {!site && sites.length > 0 && <p className="text-sm text-muted-foreground">Sélectionnez un site pour charger ou enregistrer les données.</p>}
  </div>;
}
