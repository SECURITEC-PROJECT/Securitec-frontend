import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock, Plus, RefreshCw, Route as RouteIcon, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ApercuSite from "./ApercuSite";
import GridStats from "./GridStats";
import MainCouranteRecente from "./MainCouranteRecente";
import RondePerimetrique from "./RondePerimetrique";

type DashboardData = {
  visitors: any[];
  vehicles: any[];
  shifts: any[];
  patrols: any[];
  mainCourante: any[];
  incidents: any[];
  consignes: any[];
};

const emptyData: DashboardData = {
  visitors: [], vehicles: [], shifts: [], patrols: [], mainCourante: [], incidents: [], consignes: [],
};
const dateLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const typeOptions = [
  ["TOUS", "Tous les types"],
  ["PROCEDURE", "Procédures"],
  ["EVENEMENT", "Événements / incidents"],
  ["VIOLATION", "Violations"],
  ["ANOMALIE", "Anomalies"],
  ["CONSIGNE", "Consignes actives"],
  ["DIVERS", "Divers"],
] as const;

function dateOf(entry: any): string {
  const value = entry?.date || entry?.createdAt || entry?.created_at || "";
  return String(value).slice(0, 10);
}

function asActivity(entry: any, source: "main" | "incident" | "consigne") {
  if (source === "consigne") {
    return {
      ...entry,
      activityType: "CONSIGNE",
      category: "Consigne active",
      description: entry.consigne,
      created_at: entry.createdAt || `${entry.date}T${entry.heure || "00:00"}:00`,
      agent_name: entry.emetteur,
      severity: "important",
    };
  }
  if (source === "incident") {
    const type = entry.type === "ANOMALIE" ? "ANOMALIE" : "VIOLATION";
    return {
      ...entry,
      activityType: type,
      category: type === "ANOMALIE" ? "Anomalie" : "Violation de procédure",
      description: entry.facts || entry.observations || entry.measures || "Signalement enregistré",
      created_at: entry.createdAt || `${dateOf(entry)}T${entry.time || "00:00"}:00`,
      agent_name: entry.person || "Agent",
      severity: type === "ANOMALIE" ? "important" : "grave",
    };
  }
  const activityType = entry.typeEntree === "VIOLATION"
    ? "VIOLATION"
    : entry.typeEntree === "DIVERS" ? "DIVERS" : entry.category?.toLocaleLowerCase("fr").includes("procédure") ? "PROCEDURE" : "EVENEMENT";
  return {
    ...entry,
    activityType,
    category: entry.category || (activityType === "VIOLATION" ? "Violation de procédure" : "Événement"),
    description: entry.description || entry.mesuresPrises || "Événement enregistré",
    created_at: entry.createdAt,
    agent_name: entry.agentNom || "Agent",
  };
}

function openInstruction(entry: any): boolean {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Indian/Antananarivo" });
  const starts = String(entry.date || "").slice(0, 10);
  if (starts && starts > today) return false;
  if (entry.jusquauNouvelOrdre) return true;
  const until = String(entry.dateFin || entry.date || "").slice(0, 10);
  return !!until && until >= today;
}

export default function Dashboard() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [postId, setPostId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activityType, setActivityType] = useState("TOUS");
  const [posts, setPosts] = useState<{ id: string; nom: string }[]>([]);
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [siteId, sites]);

  const refresh = useCallback(async () => {
    if (!siteId) {
      setData(emptyData);
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      serviceApi.listVisitors(siteId),
      serviceApi.listVehicles(siteId),
      serviceApi.listShifts(siteId),
      serviceApi.listPatrols(siteId),
      serviceApi.listMainCourante(siteId),
      serviceApi.listLogisticsEvents(siteId),
      serviceApi.listJournalConsignes(siteId, true),
      serviceApi.listShiftPosts(siteId),
    ]);
    const labels = ["visiteurs", "véhicules", "prises de poste", "rondes", "main courante", "incidents/anomalies", "consignes actives", "postes"];
    const failures = results.flatMap((result, index) => result.status === "rejected"
      ? [`${labels[index]} : ${result.reason instanceof Error ? result.reason.message : "erreur inconnue"}`]
      : []);
    setData({
      visitors: results[0].status === "fulfilled" ? results[0].value : [],
      vehicles: results[1].status === "fulfilled" ? results[1].value : [],
      shifts: results[2].status === "fulfilled" ? results[2].value : [],
      patrols: results[3].status === "fulfilled" ? results[3].value : [],
      mainCourante: results[4].status === "fulfilled" ? results[4].value : [],
      incidents: results[5].status === "fulfilled" ? results[5].value : [],
      consignes: results[6].status === "fulfilled" ? results[6].value : [],
    });
    setPosts(results[7].status === "fulfilled" ? results[7].value : []);
    if (failures.length) setError(`Chargement partiel — ${failures.join(" · ")}.`);
    setLoading(false);
  }, [siteId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setPostId(""); }, [siteId]);

  const activeShifts = useMemo(() => data.shifts.filter((shift) => !shift.ended_at), [data.shifts]);
  const selectedSite = sites.find((site) => site.id === siteId);
  const filteredShifts = useMemo(() => activeShifts.filter((shift) => !postId || shift.posteId === postId), [activeShifts, postId]);
  const activeServices = useMemo(() => new Set(filteredShifts.map((shift) => shift.serviceId || shift.id)).size, [filteredShifts]);
  const activeServiceId = siteId && typeof window !== "undefined" ? window.localStorage.getItem(`securitec-active-shift:${siteId}`) : null;
  const currentPostShift = activeShifts.find((shift) => activeServiceId && (shift.id === activeServiceId || shift.serviceId === activeServiceId));
  const readingPostId = currentPostShift?.posteId || postId;
  const readingPostName = posts.find((post) => post.id === readingPostId)?.nom || currentPostShift?.posteNom;

  const operationalConsignes = useMemo(() => data.consignes.filter((entry) => openInstruction(entry)
    && (!readingPostId || entry.tousPostes || !entry.posteIds?.length || entry.posteIds.includes(readingPostId) || entry.posteId === readingPostId)),
  [data.consignes, readingPostId]);
  const activeConsignes = useMemo(() => data.consignes.filter((entry) => openInstruction(entry)
    && (!postId || entry.tousPostes || !entry.posteIds?.length || entry.posteIds.includes(postId) || entry.posteId === postId)
    && (!fromDate || dateOf(entry) >= fromDate)
    && (!toDate || dateOf(entry) <= toDate)), [data.consignes, postId, fromDate, toDate]);
  const priorityTargets = readingPostId ? operationalConsignes.flatMap((entry) => (entry.lectures || [])
    .filter((receipt: any) => (!readingPostId || receipt.posteId === readingPostId) && !receipt.readAt)
    .map((receipt: any) => ({ entry, posteId: receipt.posteId, posteNom: receipt.posteNom }))) : [];

  const acknowledgeConsigne = async (entry: any, targetPostId: string) => {
    if (!siteId || !targetPostId) return;
    setAcknowledging(`${entry.id}:${targetPostId}`);
    try {
      const receipt = await serviceApi.acknowledgeJournalConsigne(entry.id, siteId, targetPostId);
      setData((current) => ({
        ...current,
        consignes: current.consignes.map((item) => item.id !== entry.id ? item : {
          ...item,
          lectures: (item.lectures || []).map((row: any) => row.posteId === targetPostId ? { ...row, readAt: receipt.readAt } : row),
        }),
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Confirmation de lecture impossible.");
    } finally { setAcknowledging(null); }
  };

  const activities = useMemo(() => [
    ...data.mainCourante.map((entry) => asActivity(entry, "main")),
    ...data.incidents.map((entry) => asActivity(entry, "incident")),
    ...activeConsignes.map((entry) => asActivity(entry, "consigne")),
  ].filter((entry) => (!postId || entry.posteId === postId)
    && (!fromDate || dateOf(entry) >= fromDate)
    && (!toDate || dateOf(entry) <= toDate)
    && (activityType === "TOUS" || entry.activityType === activityType))
    .sort((left, right) => new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()),
  [data.mainCourante, data.incidents, activeConsignes, postId, fromDate, toDate, activityType]);

  const counts = useMemo(() => ({
    procedures: activities.filter((entry) => entry.activityType === "PROCEDURE").length,
    events: activities.filter((entry) => ["EVENEMENT", "DIVERS"].includes(entry.activityType)).length,
    incidents: activities.filter((entry) => entry.activityType === "VIOLATION").length,
    anomalies: activities.filter((entry) => entry.activityType === "ANOMALIE").length,
  }), [activities]);

  const staffing = useMemo(() => {
    const byPost = new Map<string, { id: string; name: string; members: any[] }>();
    for (const post of posts) byPost.set(post.id, { id: post.id, name: post.nom, members: [] });
    for (const shift of activeShifts) {
      const key = shift.posteId || "sans-poste";
      if (!byPost.has(key)) byPost.set(key, { id: key, name: shift.posteNom || "Poste non renseigné", members: [] });
      if (!postId || key === postId) byPost.get(key)!.members.push(shift);
    }
    return [...byPost.values()].filter((post) => !postId || post.id === postId);
  }, [posts, activeShifts, postId]);

  const shiftNames = useMemo(() => new Map(data.shifts.map((shift) => [shift.id, `${shift.prenom || ""} ${shift.nom || ""}`.trim()])), [data.shifts]);
  const recentLogs = activities.slice(0, 8).map((entry) => ({
    ...entry,
    agent_name: entry.agent_name || (entry.priseDePosteId ? shiftNames.get(entry.priseDePosteId) : "") || "Agent",
    severity: entry.severity || "normal",
  }));
  const activePatrols = useMemo(() => data.patrols.filter((patrol) => !patrol.ended_at && (!postId || patrol.posteId === postId)), [data.patrols, postId]);
  const alertCount = counts.incidents + counts.anomalies;

  return (
    <div className="space-y-6">
      <PageHeader title="Tableau de bord du site" subtitle={dateLabel.format(new Date())} action={<Button asChild><Link to="/dashboard/main-courante"><Plus /> Nouvel événement</Link></Button>} />

      {!readingPostId && data.consignes.some((entry) => openInstruction(entry)) && <div className="flex flex-wrap items-center gap-3 border-l-4 border-warning bg-warning/10 px-4 py-3">
        <AlertTriangle className="size-5 shrink-0 text-warning-foreground" />
        <p className="min-w-0 flex-1 text-sm">Des consignes actives attendent une lecture. Sélectionnez un poste pour afficher et confirmer celles qui le concernent.</p>
      </div>}

      <Dialog open={priorityTargets.length > 0} onOpenChange={() => {}}>
        <DialogContent className="max-h-[85vh] overflow-y-auto [&>button]:hidden" onEscapeKeyDown={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Consignes à lire avant la prise de service</DialogTitle>
            <DialogDescription>{readingPostId ? `${readingPostName || "Poste sélectionné"} · ` : "Tous postes · "}{priorityTargets.length} lecture(s) à confirmer</DialogDescription>
          </DialogHeader>
          <div className="divide-y rounded-md border">
            {priorityTargets.map(({ entry, posteId: targetPostId, posteNom }) => <article key={`${entry.id}:${targetPostId}`} className="space-y-3 p-4">
              <p className="whitespace-pre-wrap text-sm font-medium">{entry.consigne}</p>
              <p className="text-xs text-muted-foreground">{posteNom} · Émise par {entry.emetteur} · {entry.jusquauNouvelOrdre ? "Jusqu’à nouvel ordre" : `Valable jusqu’au ${String(entry.dateFin || entry.date).slice(0, 10)}`}</p>
              <Button size="sm" onClick={() => void acknowledgeConsigne(entry, targetPostId)} disabled={acknowledging === `${entry.id}:${targetPostId}`}>
                <CheckCircle2 className="mr-2 size-4" />{acknowledging === `${entry.id}:${targetPostId}` ? "Enregistrement…" : `Confirmer pour ${posteNom}`}
              </Button>
            </article>)}
          </div>
        </DialogContent>
      </Dialog>

      <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-1"><label htmlFor="dashboard-site" className="text-xs font-medium text-muted-foreground">Site</label><select id="dashboard-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></div>
        <div className="space-y-1"><label htmlFor="dashboard-post" className="text-xs font-medium text-muted-foreground">Poste de garde</label><select id="dashboard-post" value={postId} onChange={(event) => setPostId(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Tous les postes</option>{posts.map((post) => <option key={post.id} value={post.id}>{post.nom}</option>)}</select></div>
        <div className="space-y-1"><label htmlFor="dashboard-from" className="text-xs font-medium text-muted-foreground">Du</label><input id="dashboard-from" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></div>
        <div className="space-y-1"><label htmlFor="dashboard-to" className="text-xs font-medium text-muted-foreground">Au</label><input id="dashboard-to" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm" /></div>
        <div className="space-y-1"><label htmlFor="dashboard-type" className="text-xs font-medium text-muted-foreground">Type d’activité</label><select id="dashboard-type" value={activityType} onChange={(event) => setActivityType(event.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{typeOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
        <Button className="h-10 self-end xl:col-start-6" variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />Actualiser</Button>
      </section>

      {(siteError || error) && <div role="status" className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground"><AlertTriangle className="size-4 shrink-0" />{siteError || error}</div>}

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${filteredShifts.length ? "border-success/20 bg-success/10 text-success" : "border-muted bg-muted text-muted-foreground"}`}>
          <span className="size-2 rounded-full bg-current" />{activeServices} service(s) ouvert(s) · {filteredShifts.length} agent(s) présent(s)
        </span>
        <span className="text-muted-foreground">{selectedSite?.name || "Aucun site sélectionné"}</span>
      </div>

      <GridStats
        visitorsCount={data.visitors.filter((visitor) => !visitor.exited_at).length}
        vehiclesCount={data.vehicles.filter((vehicle) => !vehicle.exited_at).length}
        shiftsCount={filteredShifts.length}
        alertsCount={alertCount}
        proceduresCount={counts.procedures}
        eventsCount={counts.events}
        anomaliesCount={counts.anomalies}
        activeInstructionsCount={activeConsignes.length}
      />

      <section className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div><h2 className="text-sm font-semibold">Effectifs par poste</h2><p className="text-xs text-muted-foreground">Agents présents, service et prestataire</p></div>
          <span className="text-xs text-muted-foreground">{staffing.reduce((total, post) => total + post.members.length, 0)} agent(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-2.5">Poste</th><th className="px-4 py-2.5">Services</th><th className="px-4 py-2.5">Effectif</th><th className="px-4 py-2.5">Agents et prestataires</th></tr></thead>
            <tbody>{staffing.map((post) => {
              const services = [...new Set(post.members.map((member) => member.shiftType === "NUIT" ? "Nuit" : member.shiftType === "JOUR" ? "Jour" : "Service non précisé"))];
              const providers = [...post.members.reduce((counts, member) => counts.set(member.prestataire || "Prestataire non renseigné", (counts.get(member.prestataire || "Prestataire non renseigné") || 0) + 1), new Map<string, number>())].map(([provider, count]) => `${provider} (${count})`);
              return <tr key={post.id} className="border-t align-top"><td className="px-4 py-3 font-medium">{post.name}</td><td className="px-4 py-3">{services.join(", ") || "—"}</td><td className="px-4 py-3">{post.members.length}</td><td className="max-w-xl px-4 py-3 text-xs text-muted-foreground">{providers.length ? providers.join(" · ") : "Aucun agent en service"}</td></tr>;
            })}
            {!staffing.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun poste ne correspond au filtre.</td></tr>}</tbody>
          </table>
        </div>
      </section>

      {alertCount > 0 && <div className="flex flex-wrap items-center gap-3 border-l-4 border-warning bg-warning/10 px-4 py-3">
        <AlertTriangle className="size-5 shrink-0 text-warning-foreground" />
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold">{alertCount} incident(s) ou anomalie(s) dans la période filtrée</p><p className="mt-0.5 text-xs text-muted-foreground">Les résultats suivent les filtres de site, poste, période et type.</p></div>
        <Button asChild variant="ghost" size="sm"><Link to="/dashboard/main-courante">Consulter <ClipboardCheck /></Link></Button>
      </div>}

      <div className="grid gap-7 xl:grid-cols-[1.4fr_1fr]">
        <MainCouranteRecente logs={recentLogs} name={(id) => shiftNames.get(id) || "Agent"} />
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Consignes actives</h2><span className="text-xs text-primary">{activeConsignes.length}</span></div>
            <div className="divide-y border-y">
              {activeConsignes.slice(0, 6).map((entry) => <article key={entry.id} className="py-3"><p className="text-xs font-semibold">{entry.consigne}</p><p className="mt-1 text-[11px] text-muted-foreground">{entry.posteNom || "Tous postes / poste non rattaché"} · {entry.emetteur} · {entry.jusquauNouvelOrdre ? "Jusqu’à nouvel ordre" : `Jusqu’au ${String(entry.dateFin || entry.date).slice(0, 10)}`}</p></article>)}
              {!activeConsignes.length && <p className="py-5 text-xs text-muted-foreground">Aucune consigne active pour ces filtres.</p>}
            </div>
          </section>
          <RondePerimetrique patrols={activePatrols} name={(id) => shiftNames.get(id) || "Agent"} />
          <ApercuSite />
        </div>
      </div>

      <section className="border-t pt-5">
        <h2 className="mb-3 text-xs font-semibold text-muted-foreground">ACCÈS RAPIDES</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/dashboard/visiteurs"><Users /> Enregistrer un visiteur</Link></Button>
          <Button asChild variant="outline"><Link to="/dashboard/rondes"><RouteIcon /> Démarrer une ronde</Link></Button>
          <Button asChild variant="outline"><Link to="/dashboard/comptes-rendus"><ClipboardCheck /> Compte rendu de vacation</Link></Button>
          <span className="ml-auto flex items-center gap-1.5 self-center text-[11px] text-muted-foreground"><Clock className="size-3" /> Mis à jour {new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}</span>
        </div>
      </section>
    </div>
  );
}
