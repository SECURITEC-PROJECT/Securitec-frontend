import { PageHeader } from "@/components/PageHeader";
import { serviceApi } from "@/lib/service-api";
import { restoreSession } from "@/lib/auth-api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ActivePatrolPanel from "./ActivePatrolPanel";
import PatrolHistoryPanel from "./PatrolHistoryPanel";
import StartPatrolPanel from "./StartPatrolPanel";

export default function Rondes() {
  const [route, setRoute] = useState("Ronde complète");
  const [observations, setObservations] = useState("");
  const [data, setData] = useState<any[]>([]);
  const [sites, setSites] = useState<{ id: string; name: string; type: "USINE" | "AGENCE" }[]>([]);
  const [siteId, setSiteId] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setData(await serviceApi.listPatrols()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Chargement des rondes impossible."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void Promise.all([restoreSession(), serviceApi.listSites()]).then(([user, availableSites]) => {
      setUserId(user?.id || "");
      setSites(availableSites.sites);
      setSiteId(user?.siteId || availableSites.sites[0]?.id || "");
    }).catch((error) => toast.error(error instanceof Error ? error.message : "Chargement des sites impossible."));
    void refresh();
  }, [refresh]);

  const active = useMemo(() => data.find((patrol) => patrol.agent_id === userId && !patrol.ended_at), [data, userId]);
  const selectedSite = sites.find((site) => site.id === siteId);

  const start = async () => {
    if (!route.trim() || !selectedSite) { toast.error("Choisissez un site et renseignez le parcours."); return; }
    setSaving(true);
    try {
      await serviceApi.startPatrol({ routeName: route, siteName: selectedSite.name, siteType: selectedSite.type, checkpoints: [] });
      setObservations("");
      await refresh();
      toast.success("Ronde démarrée.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Démarrage de la ronde impossible."); }
    finally { setSaving(false); }
  };

  const finish = async () => {
    if (!active || saving) return;
    setSaving(true);
    try {
      const updated = await serviceApi.finishPatrol(active.id, observations);
      setData((current) => current.map((row) => row.id === updated.id ? { ...row, ...updated } : row));
      toast.success("Fin de ronde enregistrée.");
      setObservations("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Clôture de la ronde impossible."); }
    finally { setSaving(false); }
  };

  const fmtTime = (date: string | null) => date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const sectionNumber = selectedSite?.type === "USINE" ? 6 : 7;

  return <div>
    <PageHeader title="Patrouilles et rondes" subtitle={`Rubrique ${sectionNumber} du rapport journalier · Début, fin et observations`} />
    {loading ? <p className="py-8 text-sm text-muted-foreground">Chargement des rondes…</p> : <div className="grid gap-6 lg:grid-cols-2">
      {active
        ? <ActivePatrolPanel active={active} observations={observations} setObservations={setObservations} onFinish={() => void finish()} fmtTime={fmtTime} saving={saving} />
        : <StartPatrolPanel route={route} setRoute={setRoute} siteId={siteId} setSiteId={setSiteId} sites={sites} onStart={() => void start()} saving={saving} />}
      <PatrolHistoryPanel data={data} fmt={fmtTime} />
    </div>}
  </div>;
}
