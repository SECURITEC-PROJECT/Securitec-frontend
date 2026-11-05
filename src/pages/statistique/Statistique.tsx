import { Button } from "@/components/ui/button";
import { useSites } from "@/hooks/useSites";
import { exportCsv } from "@/lib/demo-store";
import { serviceApi } from "@/lib/service-api";
import logoSecuritec from "@/assets/logo securitec.jpg";
import { Download, FileText, Bell } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Period = "jour" | "semaine" | "mois";
type Kind = "TOUS" | "INCIDENT" | "VIOLATION" | "ANOMALIE";
type ReportData = { events: any[]; incidents: any[]; shifts: any[]; patrols: any[] };
type ReportRow = { id: string; date: Date | null; kind: Kind; facts: string; post: string; followUp: string; status: string };
const emptyData: ReportData = { events: [], incidents: [], shifts: [], patrols: [] };
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const parseDate = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
function range(period: Period, today: Date) {
  const start = startOfDay(today);
  if (period === "semaine") start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  if (period === "mois") start.setDate(1);
  return { start, end: new Date(today) };
}
const inRange = (date: Date | null, bounds: { start: Date; end: Date }) => !!date && date >= bounds.start && date <= bounds.end;
const safeLabel = (value: unknown, fallback = "—") => typeof value === "string" && value.trim() ? value : fallback;
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });

export default function Statistique() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [period, setPeriod] = useState<Period>("semaine");
  const [kind, setKind] = useState<Kind>("TOUS");
  const [data, setData] = useState<ReportData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { if (!siteId && sites.length) setSiteId(sites[0].id); }, [siteId, sites]);
  const refresh = useCallback(async () => {
    if (!siteId) { setLoading(false); return; }
    setLoading(true); setError("");
    const results = await Promise.allSettled([
      serviceApi.listMainCourante(siteId), serviceApi.listLogisticsEvents(siteId),
      serviceApi.listShifts(siteId), serviceApi.listPatrols(siteId),
    ]);
    const labels = ["journal", "incidents", "vacations", "rondes"];
    const failures = results.flatMap((result, index) => result.status === "rejected"
      ? [`${labels[index]} : ${result.reason instanceof Error ? result.reason.message : "erreur inconnue"}`] : []);
    setData({
      events: results[0].status === "fulfilled" ? results[0].value : [],
      incidents: results[1].status === "fulfilled" ? results[1].value : [],
      shifts: results[2].status === "fulfilled" ? results[2].value : [],
      patrols: results[3].status === "fulfilled" ? results[3].value : [],
    });
    setError(failures.length ? `Chargement partiel — ${failures.join(" · ")}.` : "");
    setLoading(false);
  }, [siteId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const bounds = range(period, new Date());
  const rows = useMemo<ReportRow[]>(() => [
    ...data.events.map((item, index) => {
      const date = parseDate(item.createdAt || item.date);
      const itemKind: Kind = item.typeEntree === "VIOLATION" ? "VIOLATION" : item.category?.toLowerCase?.().includes("anomalie") ? "ANOMALIE" : "INCIDENT";
      return { id: `event-${item.id || index}`, date, kind: itemKind, facts: safeLabel(item.description || item.mesuresPrises || item.category, "Événement enregistré"), post: safeLabel(item.posteNom || item.poste), followUp: safeLabel(item.mesuresPrises || item.suivi), status: safeLabel(item.statut || item.status, "Enregistré") };
    }),
    ...data.incidents.map((item, index) => {
      const date = parseDate(item.createdAt || `${item.date || ""}T${item.time || "00:00"}:00`);
      const itemKind: Kind = item.type === "ANOMALIE" ? "ANOMALIE" : item.type === "VIOLATION_PROCEDURE" || item.type === "VIOLATION" ? "VIOLATION" : "INCIDENT";
      return { id: `incident-${item.id || index}`, date, kind: itemKind, facts: safeLabel(item.facts || item.description || item.natureViolation, "Signalement enregistré"), post: safeLabel(item.posteNom || item.poste), followUp: safeLabel(item.measures || item.mesuresPrises), status: safeLabel(item.status || item.statut, "Enregistré") };
    }),
  ].filter((row) => inRange(row.date, bounds)).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)), [data, period, siteId]);
  const filteredRows = kind === "TOUS" ? rows : rows.filter((row) => row.kind === kind);
  const shiftsInPeriod = data.shifts.filter((shift) => inRange(parseDate(shift.started_at || shift.startedAt), bounds));
  const patrolsInPeriod = data.patrols.filter((patrol) => inRange(parseDate(patrol.started_at || patrol.startedAt), bounds));
  const incidents = rows.filter((row) => row.kind === "INCIDENT").length;
  const violations = rows.filter((row) => row.kind === "VIOLATION").length;
  const anomalies = rows.filter((row) => row.kind === "ANOMALIE").length;
  const currentSite = sites.find((site) => site.id === siteId);
  const periodName = period === "jour" ? "aujourd’hui" : period === "semaine" ? "la semaine" : "le mois";
  const statusTone = (status: string) => /cours|attente|ouvert/i.test(status) ? "report-status report-status--active" : "report-status report-status--closed";

  return <div className="report-screen">
    <aside className="report-filters">
      <div className="report-site"><img src={logoSecuritec} alt="" /><div><strong>{currentSite?.name || "SECURITEC"}</strong><span>Sites suivis par SECURITEC</span></div></div>
      <section><h2>Période</h2>{([ ["jour", "Aujourd’hui"], ["semaine", "Semaine"], ["mois", "Mois"] ] as const).map(([value, label]) => <button key={value} className={period === value ? "report-filter is-selected" : "report-filter"} onClick={() => setPeriod(value)}>{label}</button>)}</section>
      <section><h2>Type de fait</h2>{([ ["TOUS", "Tous", rows.length], ["INCIDENT", "Incidents", incidents], ["VIOLATION", "Violations", violations], ["ANOMALIE", "Anomalies", anomalies] ] as const).map(([value, label, count]) => <button key={value} className={kind === value ? "report-filter is-selected" : "report-filter"} onClick={() => setKind(value)}><span className={`report-dot report-dot--${value.toLowerCase()}`} />{label}<b>{count}</b></button>)}</section>
      <div className="report-exports"><button onClick={() => window.print()}><FileText />Télécharger le rapport PDF</button><button onClick={() => exportCsv("rapport-securitec.csv", filteredRows.map((row) => ({ date: row.date?.toISOString() || "", type: row.kind, fait: row.facts, poste: row.post, suivi: row.followUp, statut: row.status })))}><Download />Exporter en Excel</button><button><Bell />Mes notifications</button></div>
    </aside>
    <section className="report-content">
      <div className="report-readonly"><span className="report-readonly-icon"><FileText /></span><span className="report-readonly-tag">Lecture seule</span><span className="report-viewer">Responsable sécurité · {currentSite?.name || "Site"}</span></div>
      {(siteError || error) && <p role="status" className="mb-3 rounded border border-warning/40 bg-warning/10 px-3 py-2 text-sm">{siteError || error}</p>}
      <div className="report-kpis">
        <article><span>Prises de service</span><strong>{loading ? "—" : shiftsInPeriod.length}</strong><small className="report-pill report-pill--green">{shiftsInPeriod.length ? "enregistrées" : "aucune vacation"}</small></article>
        <article><span>Rondes enregistrées</span><strong>{loading ? "—" : patrolsInPeriod.length}</strong><small className="report-pill report-pill--lime">{loading ? "" : `${patrolsInPeriod.length} pointées`}</small></article>
        <article><span>Incidents</span><strong>{loading ? "—" : incidents}</strong><small className="report-pill report-pill--red">{incidents ? `${incidents} signalé(s)` : "aucun incident"}</small></article>
        <article><span>Violations</span><strong>{loading ? "—" : violations}</strong><small className="report-pill report-pill--orange">{violations ? `${violations} signalée(s)` : "aucune violation"}</small></article>
      </div>
      <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Date</th><th>Type</th><th>Fait</th><th>Poste</th><th>Suivi SECURITEC</th><th>Statut</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6} className="report-empty">Chargement des faits…</td></tr> : filteredRows.length ? filteredRows.map((row) => <tr key={row.id} className={`report-row report-row--${row.kind.toLowerCase()}`}><td className="report-date">{row.date ? `${dateFormatter.format(row.date)} ${timeFormatter.format(row.date)}` : "—"}</td><td><span className={`report-pill report-pill--${row.kind.toLowerCase()}`}>{row.kind === "ANOMALIE" ? "Anomalie" : row.kind === "VIOLATION" ? "Violation" : "Incident"}</span></td><td>{row.facts}</td><td>{row.post}</td><td>{row.followUp}</td><td><span className={statusTone(row.status)}>{row.status}</span></td></tr>) : <tr><td colSpan={6} className="report-empty">Aucun fait pour {periodName}.</td></tr>}
      </tbody></table></div>
      <div className="report-footer"><div><strong>Rapport de {period === "semaine" ? "la semaine" : period === "mois" ? "la période" : "la journée"}</strong><span>Présence par poste, rondes, événements et signalements de sécurité.</span></div><div><Button onClick={() => window.print()} className="report-pdf"><Download /> Télécharger PDF</Button><Button variant="outline" className="report-excel" onClick={() => exportCsv("rapport-securitec.csv", filteredRows.map((row) => ({ date: row.date?.toISOString() || "", type: row.kind, fait: row.facts, poste: row.post, suivi: row.followUp, statut: row.status })))}><Download /> Excel</Button></div></div>
    </section>
  </div>;
}
