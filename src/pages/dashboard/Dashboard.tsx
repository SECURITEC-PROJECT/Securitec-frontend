import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { serviceApi } from "@/lib/service-api";
import { useSites } from "@/hooks/useSites";
import { ArrowRight, AlertTriangle, Circle, ClipboardCheck, Clock, Plus, RefreshCw, Route as RouteIcon, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ApercuSite from "./ApercuSite";
import EquipeEnPoste from "./EquipeEnPoste";
import GridStats from "./GridStats";
import MainCouranteRecente from "./MainCouranteRecente";
import RondePerimetrique from "./RondePerimetrique";

type OverviewData = { visitors: any[]; vehicles: any[]; shifts: any[]; patrols: any[]; incidents: any[]; cameras: any[] };
const emptyData: OverviewData = { visitors: [], vehicles: [], shifts: [], patrols: [], incidents: [], cameras: [] };
const asArray = (value: unknown): any[] => Array.isArray(value) ? value : [];

const dateLabel = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export default function Dashboard() {
  const { sites } = useSites();
  const [data, setData] = useState<OverviewData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      serviceApi.listVisitors(), serviceApi.listVehicles(), serviceApi.listShifts(),
      serviceApi.listPatrols(), serviceApi.listLogisticsEvents(), serviceApi.listCameras(),
    ]);
    const labels = ["visiteurs", "véhicules", "vacations", "rondes", "incidents logistiques", "caméras"];
    const failed = results.flatMap((result, index) => {
      if (result.status === "rejected") {
        const reason = result.reason instanceof Error ? result.reason.message : "erreur inconnue";
        return [`${labels[index]} : ${reason}`];
      }
      return Array.isArray(result.value) ? [] : [`${labels[index]} : format de réponse inattendu`];
    });
    if (failed.length === results.length) {
      setError("Les données du tableau de bord sont indisponibles. Vérifiez la connexion au serveur.");
      setData(emptyData);
    } else {
      setData({
        visitors: results[0].status === "fulfilled" ? asArray(results[0].value) : [],
        vehicles: results[1].status === "fulfilled" ? asArray(results[1].value) : [],
        shifts: results[2].status === "fulfilled" ? asArray(results[2].value) : [],
        patrols: results[3].status === "fulfilled" ? asArray(results[3].value) : [],
        incidents: results[4].status === "fulfilled" ? asArray(results[4].value) : [],
        cameras: results[5].status === "fulfilled" ? asArray(results[5].value) : [],
      });
      if (failed.length) setError(`Chargement partiel — ${failed.join(" · ")}.`);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const activeShifts = useMemo(() => asArray(data.shifts).filter((shift) => !shift.ended_at), [data.shifts]);
  const activePatrols = useMemo(() => asArray(data.patrols).filter((patrol) => !patrol.ended_at), [data.patrols]);
  const name = useCallback((id: string | null | undefined) => {
    if (!id) return "Agent";
    const shift = data.shifts.find((item) => item.agent_id === id || item.utilisateur_id === id);
    const patrol = data.patrols.find((item) => item.agent_id === id);
    return shift?.agent_name || patrol?.agent_name || "Agent";
  }, [data.shifts, data.patrols]);

  const alertsCount = asArray(data.incidents).length + asArray(data.cameras).filter((camera) => camera.status !== "EN_SERVICE").length;
  const recentLogs = asArray(data.incidents).slice(0, 5).map((item) => ({
    ...item,
    created_at: item.createdAt || item.created_at || (item.date && item.time ? `${item.date}T${item.time}:00` : undefined),
    category: item.category || item.type_signalement || item.type || "Incident logistique",
    severity: item.severity || "important",
    description: item.description || item.description_faits || item.facts || item.observations || "Incident signalé",
    agent_id: item.agent_id || item.utilisateur_id,
    agent_name: item.agent_name || item.person,
  }));
  const currentSite = sites.find((site) => site.id === (activeShifts[0]?.siteId || activePatrols[0]?.siteId)) || sites[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Vue d’ensemble" subtitle={dateLabel.format(new Date())} action={<Button asChild><Link to="/dashboard/main-courante"><Plus /> Nouvel événement</Link></Button>} />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${activeShifts.length ? "border-success/20 bg-success/10 text-success" : "border-muted bg-muted text-muted-foreground"}`}>
          <Circle className="h-2 w-2 fill-current" /> {activeShifts.length ? "Vacation ouverte" : "Aucune vacation ouverte"}
        </span>
        <span className="text-muted-foreground">{currentSite?.name || "Site non renseigné"}</span>
        <Button className="ml-auto h-7 px-2 text-xs" variant="ghost" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      {error && <div role="status" className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

      <GridStats
        visitorsCount={loading ? 0 : asArray(data.visitors).filter((visitor) => !visitor.exited_at).length}
        vehiclesCount={loading ? 0 : asArray(data.vehicles).filter((vehicle) => !vehicle.exited_at).length}
        shiftsCount={loading ? 0 : activeShifts.length}
        alertsCount={loading ? 0 : alertsCount}
      />

      {alertsCount > 0 && !loading && <div className="flex flex-wrap items-center gap-3 border-l-4 border-warning bg-warning/10 px-4 py-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-warning-foreground" />
        <div className="min-w-0 flex-1"><p className="text-xs font-semibold">{alertsCount} point{alertsCount > 1 ? "s" : ""} à suivre</p><p className="mt-0.5 text-xs text-muted-foreground">Incident logistique ou caméra en maintenance détecté.</p></div>
        <Button asChild variant="ghost" size="sm"><Link to="/dashboard/logistique">Consulter <ArrowRight /></Link></Button>
      </div>}

      <div className="grid gap-7 xl:grid-cols-[1.4fr_1fr]">
        <MainCouranteRecente logs={recentLogs} name={name} />
        <div className="space-y-6">
          <EquipeEnPoste shifts={data.shifts} name={name} />
          <RondePerimetrique patrols={activePatrols.length ? activePatrols : data.patrols} name={name} />
          <ApercuSite />
        </div>
      </div>

      <section className="border-t pt-5">
        <h2 className="mb-3 text-xs font-semibold text-muted-foreground">ACCÈS RAPIDES</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline"><Link to="/dashboard/visiteurs"><Users /> Enregistrer un visiteur</Link></Button>
          <Button asChild variant="outline"><Link to="/dashboard/rondes"><RouteIcon /> Démarrer une ronde</Link></Button>
          <Button asChild variant="outline"><Link to="/dashboard/comptes-rendus"><ClipboardCheck /> Compte rendu de vacation</Link></Button>
          <span className="ml-auto flex items-center gap-1.5 self-center text-[11px] text-muted-foreground"><Clock className="h-3 w-3" /> Mis à jour {new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date())}</span>
        </div>
      </section>
    </div>
  );
}
