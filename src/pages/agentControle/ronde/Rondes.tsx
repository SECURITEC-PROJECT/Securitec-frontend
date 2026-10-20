import { PageHeader } from "@/components/PageHeader";
import { serviceApi } from "@/lib/service-api";
import { restoreSession } from "@/lib/auth-api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import ActivePatrolPanel from "./ActivePatrolPanel";
import PatrolHistoryPanel from "./PatrolHistoryPanel";
import StartPatrolPanel from "./StartPatrolPanel";

const POINTS = ["Accueil / hall", "Parking", "Portail principal", "Issues de secours", "Local technique", "Entrepôt", "Bureaux étage", "Clôture périmétrique"];

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
  const cps = active?.checkpoints || [];
  const selectedSite = sites.find((site) => site.id === siteId);

  const start = async () => {
    if (!route.trim() || !selectedSite) { toast.error("Choisissez un site et renseignez le parcours."); return; }
    setSaving(true);
    try {
      await serviceApi.startPatrol({ routeName: route, siteName: selectedSite.name, siteType: selectedSite.type, checkpoints: POINTS.map((name) => ({ name, at: null })) });
      setObservations("");
      await refresh();
      toast.success("Ronde démarrée");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Démarrage de la ronde impossible."); }
    finally { setSaving(false); }
  };

  const check = async (index: number) => {
    if (!active || saving) return;
    const next = cps.map((point: any, i: number) => i === index ? { ...point, at: point.at ? null : new Date().toISOString() } : point);
    setSaving(true);
    try { const updated = await serviceApi.updatePatrol(active.id, next); setData((current) => current.map((row) => row.id === updated.id ? { ...row, ...updated } : row)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Validation du point impossible."); }
    finally { setSaving(false); }
  };

  const finish = async () => {
    if (!active || saving) return;
    setSaving(true);
    try {
      const updated = await serviceApi.finishPatrol(active.id, observations);
      setData((current) => current.map((row) => row.id === updated.id ? { ...row, ...updated } : row));
      const checked = (updated.checkpoints || []).filter((point: any) => point.at).length;
      toast.success(`Ronde clôturée · ${checked}/${(updated.checkpoints || []).length} points validés`);
      setObservations("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Clôture de la ronde impossible."); }
    finally { setSaving(false); }
  };

  const fmtTime = (date: string | null) => date ? new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
  const sectionNumber = selectedSite?.type === "AGENCE" ? 7 : 6;

  return <div>
    <PageHeader title="Rondes" subtitle={`Enregistrement opérationnel · Rubrique ${sectionNumber} « Patrouilles et rondes » du rapport journalier`} />
    {loading ? <p className="py-8 text-sm text-muted-foreground">Chargement des rondes…</p> : <div className="grid gap-6 lg:grid-cols-2">
      {active ? <ActivePatrolPanel active={active} cps={cps} observations={observations} setObservations={setObservations} onCheck={(index) => void check(index)} onFinish={() => void finish()} fmtTime={fmtTime} saving={saving} /> : <StartPatrolPanel route={route} setRoute={setRoute} siteId={siteId} setSiteId={setSiteId} sites={sites} pointsCount={POINTS.length} pointsListString={POINTS.join(", ")} onStart={() => void start()} saving={saving} />}
      <PatrolHistoryPanel data={data} fmt={fmtTime} />
    </div>}
  </div>;
}
