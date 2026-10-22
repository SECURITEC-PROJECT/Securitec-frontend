import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSites } from "@/hooks/useSites";
import { exportCsv } from "@/lib/demo-store";
import { serviceApi } from "@/lib/service-api";
import { Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import ChartStatistique, { type ChartPoint } from "./ChartStatistique";
import GridStatistique from "./GridStatistique";

type Period = "jour" | "semaine" | "mois";
type StatsData = { visitors: any[]; vehicles: any[]; events: any[]; patrols: any[] };
const emptyData: StatsData = { visitors: [], vehicles: [], events: [], patrols: [] };
const dateOf = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

function periodBounds(period: Period, now: Date) {
  const end = new Date(now);
  const start = startOfDay(now);
  if (period === "semaine") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (period === "mois") {
    start.setDate(1);
  }
  return { start, end };
}

function withinPeriod(row: any, key: string, start: Date, end: Date) {
  const date = dateOf(row[key]);
  return date !== null && date >= start && date <= end;
}

function makeChart(period: Period, visitors: any[], now: Date): ChartPoint[] {
  if (period === "jour") {
    return Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, "0")} h`,
      value: visitors.filter((row) => {
        const date = dateOf(row.entered_at);
        return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate() && date.getHours() === hour;
      }).length,
    }));
  }
  if (period === "semaine") {
    const monday = startOfDay(now);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(monday);
      day.setDate(day.getDate() + offset);
      return { label: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(day), value: visitors.filter((row) => {
        const date = dateOf(row.entered_at);
        return date && date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
      }).length };
    });
  }
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const weeks = Math.ceil((new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() + (firstDay.getDay() + 6) % 7) / 7);
  return Array.from({ length: weeks }, (_, index) => {
    const start = new Date(firstDay);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + index * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { label: `Sem. ${index + 1}`, value: visitors.filter((row) => {
      const date = dateOf(row.entered_at);
      return date && date >= start && date < end && date.getMonth() === now.getMonth();
    }).length };
  });
}

export default function Statistique() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [period, setPeriod] = useState<Period>("jour");
  const [data, setData] = useState<StatsData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (!siteId && sites.length) setSiteId(sites[0].id); }, [siteId, sites]);

  const refresh = useCallback(async () => {
    if (!siteId) return;
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      serviceApi.listVisitors(siteId), serviceApi.listVehicles(siteId),
      serviceApi.listMainCourante(siteId), serviceApi.listPatrols(siteId),
    ]);
    const names = ["visiteurs", "véhicules", "événements", "rondes"];
    const failures = results.flatMap((result, index) => result.status === "rejected"
      ? [`${names[index]} : ${result.reason instanceof Error ? result.reason.message : "erreur inconnue"}`]
      : []);
    setData({
      visitors: results[0].status === "fulfilled" ? results[0].value : [],
      vehicles: results[1].status === "fulfilled" ? results[1].value : [],
      events: results[2].status === "fulfilled" ? results[2].value : [],
      patrols: results[3].status === "fulfilled" ? results[3].value : [],
    });
    setError(failures.length ? `Chargement partiel — ${failures.join(" · ")}.` : "");
    setLoading(false);
  }, [siteId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const now = new Date();
  const bounds = periodBounds(period, now);
  const counts = useMemo(() => ({
    visitors: data.visitors.filter((row) => withinPeriod(row, "entered_at", bounds.start, bounds.end)).length,
    vehicles: data.vehicles.filter((row) => withinPeriod(row, "entered_at", bounds.start, bounds.end)).length,
    events: data.events.filter((row) => withinPeriod(row, "createdAt", bounds.start, bounds.end)).length,
    patrols: data.patrols.filter((row) => withinPeriod(row, "started_at", bounds.start, bounds.end)).length,
  }), [data, period, siteId]);
  const series = useMemo(() => makeChart(period, data.visitors, now), [data.visitors, period]);

  return <div className="space-y-6">
    <PageHeader title="Statistiques" subtitle={`Indicateurs réels · ${sites.find((site) => site.id === siteId)?.name || "Sélectionnez un site"}`} action={<div className="flex flex-wrap gap-2">
      <Select value={siteId} onValueChange={setSiteId}><SelectTrigger className="w-52" aria-label="Site"><SelectValue placeholder="Choisir un site" /></SelectTrigger><SelectContent>{sites.map((site) => <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>)}</SelectContent></Select>
      <Select value={period} onValueChange={(value) => setPeriod(value as Period)}><SelectTrigger className="w-36" aria-label="Période"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="jour">Aujourd’hui</SelectItem><SelectItem value="semaine">Cette semaine</SelectItem><SelectItem value="mois">Ce mois</SelectItem></SelectContent></Select>
      <Button variant="outline" onClick={() => void refresh()} disabled={loading || !siteId}><RefreshCw className={loading ? "animate-spin" : ""} /> Actualiser</Button>
      <Button variant="outline" onClick={() => exportCsv("statistiques.csv", [{ site: sites.find((site) => site.id === siteId)?.name || "", période: period, visiteurs: counts.visitors, véhicules: counts.vehicles, événements: counts.events, rondes: counts.patrols }])} disabled={!siteId}><Download /> CSV</Button>
    </div>} />
    {siteError && <p role="alert" className="text-sm text-destructive">{siteError}</p>}
    {error && <p role="status" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">{error}</p>}
    <GridStatistique visitorsCount={counts.visitors} vehiclesCount={counts.vehicles} logsCount={counts.events} patrolsCount={counts.patrols} loading={loading} />
    <ChartStatistique period={period} series={series} />
  </div>;
}
