import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, ClipboardList, Download, FileDown, FileUp, MapPin, Plus, Printer, Search, Shield } from "lucide-react";
import { exportXlsx } from "@/lib/export-xlsx";
import ActivePatrolPanel from "./ActivePatrolPanel";
import PatrolHistoryPanel from "./PatrolHistoryPanel";
import StartPatrolPanel from "./StartPatrolPanel";

const POINTS = [
  "Accueil / hall", "Parking", "Portail principal", "Issues de secours",
  "Local technique", "Entrepôt", "Bureaux étage", "Clôture périmétrique",
];
const patrolHeaders = ["Date", "Parcours", "Début", "Fin", "Points contrôlés", "Statut", "Observations"];

type Checkpoint = { name: string; at: string | null };
type Patrol = {
  id: string; route_name: string; started_at: string; ended_at: string | null;
  checkpoints: Checkpoint[]; anomalies: string | null; siteId: string; site_name?: string;
  agent_id?: string;
  pendingSync?: boolean; pendingFinish?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected"; pendingSyncError?: string;
};

export default function Rondes() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [route, setRoute] = useState("Ronde complète");
  const [observations, setObservations] = useState("");
  const [patrols, setPatrols] = useState<Patrol[]>([]);
  const [saving, setSaving] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [routeFilter, setRouteFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const selectedSiteId = siteId || sites[0]?.id || "";
  const site = sites.find((item) => item.id === selectedSiteId);
  const currentUserId = sessionStorage.getItem("securitec-session-user-id") || "";

  useEffect(() => {
    let active = true;
    const refresh = () => serviceApi.listPatrols(selectedSiteId || undefined)
      .then((entries) => { if (active) setPatrols(entries); })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "Chargement des rondes impossible.");
      });
    const refreshQueued = () => { void refresh(); };
    void refresh();
    window.addEventListener("securitec-offline-queue-changed", refreshQueued);
    window.addEventListener("online", refreshQueued);
    return () => {
      active = false;
      window.removeEventListener("securitec-offline-queue-changed", refreshQueued);
      window.removeEventListener("online", refreshQueued);
    };
  }, [selectedSiteId]);

  const refreshPatrols = async () => {
    setPatrols(await serviceApi.listPatrols(selectedSiteId || undefined));
  };

  const active = useMemo(
    () => patrols.find((patrol) => !patrol.ended_at && patrol.agent_id === currentUserId),
    [patrols, currentUserId],
  );

  const start = async () => {
    if (!selectedSiteId) return;
    setSaving(true);
    try {
      const patrol = await serviceApi.startPatrol({
        routeName: route,
        siteId: selectedSiteId,
        siteName: site?.name || "",
        checkpoints: POINTS.map((name) => ({ name, at: null })),
      });
      if (patrol.pendingSync) toast.info("Démarrage enregistré sur cet appareil. La ronde sera confirmée après synchronisation.");
      else toast.success("Ronde démarrée.");
      setStartDialogOpen(false);
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
      const result = await serviceApi.updatePatrol(active.id, checkpoints, selectedSiteId);
      if (result.pendingSync) toast.info("Point de contrôle enregistré sur cet appareil, en attente de synchronisation.");
      await refreshPatrols();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mise à jour du point impossible.");
    } finally { setSaving(false); }
  };

  const finish = async () => {
    if (!active) return;
    setSaving(true);
    try {
      const result = await serviceApi.finishPatrol(active.id, observations, selectedSiteId);
      setObservations("");
      if (result.pendingSync) toast.info("Clôture enregistrée sur cet appareil. La ronde reste active sur le serveur jusqu’à sa confirmation.");
      else toast.success("Ronde clôturée.");
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

  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const routeOptions = useMemo(() => Array.from(new Set(patrols.map((patrol) => patrol.route_name).filter(Boolean))
    .values()).sort((left, right) => left.localeCompare(right, "fr")), [patrols]);
  const filteredPatrols = useMemo(() => patrols.filter((patrol) => {
    const date = patrol.started_at.slice(0, 10);
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    if (routeFilter && patrol.route_name !== routeFilter) return false;
    if (statusFilter === "active" && (patrol.pendingSync || patrol.ended_at)) return false;
    if (statusFilter === "finished" && (patrol.pendingSync || !patrol.ended_at)) return false;
    if (statusFilter === "pending" && !patrol.pendingSync) return false;
    const searchable = [patrol.route_name, patrol.site_name, patrol.anomalies, patrol.started_at, patrol.ended_at,
      ...(patrol.checkpoints || []).map((point) => point.name)]
      .filter(Boolean)
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase();
    return !normalizedSearch || searchable.includes(normalizedSearch);
  }), [patrols, dateFrom, dateTo, routeFilter, statusFilter, normalizedSearch]);
  const pageCount = Math.max(1, Math.ceil(filteredPatrols.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pagePatrols = filteredPatrols.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rowsForExport = (records: Patrol[]) => records.map((patrol) => [
    patrol.started_at.slice(0, 10),
    patrol.route_name,
    fmtTime(patrol.started_at),
    fmtTime(patrol.ended_at),
    `${(patrol.checkpoints || []).filter((point) => point.at).length}/${(patrol.checkpoints || []).length}`,
    patrol.pendingSync ? patrol.pendingSyncStatus === "conflict" ? "Conflit" : patrol.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente" : patrol.ended_at ? "Terminée" : "En cours",
    patrol.anomalies || "",
  ]);
  const exportFilteredPatrols = () => exportXlsx(
    `patrouilles-rondes-${new Date().toISOString().slice(0, 10)}.xlsx`,
    "Patrouilles et rondes",
    patrolHeaders,
    rowsForExport(filteredPatrols),
  );
  const downloadPatrolTemplate = () => exportXlsx(
    "modele-patrouilles-rondes.xlsx",
    "Patrouilles et rondes",
    patrolHeaders,
    [],
  );
  const printPatrols = () => {
    const originalTitle = window.document.title;
    window.document.title = "Patrouilles et rondes";
    window.addEventListener("afterprint", () => { window.document.title = originalTitle; }, { once: true });
    window.requestAnimationFrame(() => window.print());
  };
  const patrolStatus = (patrol: Patrol) => patrol.pendingSync
    ? patrol.pendingSyncStatus === "conflict" ? "Conflit de synchronisation" : patrol.pendingSyncStatus === "rejected" ? "À vérifier" : patrol.pendingFinish ? "Clôture en attente" : "En attente de synchronisation"
    : patrol.ended_at ? "Terminée" : "En cours";

  return <div className="patrol-module space-y-4">
    <header className="patrol-hero">
      <div className="patrol-hero-icon"><Shield aria-hidden="true" /></div>
      <div className="patrol-hero-copy">
        <h1>Patrouilles et rondes</h1>
        <p>Suivez les rondes de sécurité et les points de contrôle</p>
      </div>
    </header>

    {siteError && <p className="text-sm text-destructive">{siteError}</p>}
    {!site && sites.length > 0 && <p className="text-sm text-muted-foreground">Sélectionnez un site pour charger ou enregistrer les données.</p>}

    {active && <div className="patrol-active-wrap">
      <ActivePatrolPanel active={active} checkpoints={active.checkpoints || []} observations={observations} setObservations={setObservations} onCheck={check} onFinish={finish} fmtTime={fmtTime} saving={saving} />
    </div>}

    <section className="patrol-history">
      <div className="patrol-history-toolbar">
        <h2 className="patrol-panel-heading">Historique des rondes</h2>
        <div className="patrol-history-actions patrol-screen">
          {!active && <Button type="button" className="patrol-start-action" onClick={() => setStartDialogOpen(true)} disabled={!selectedSiteId}>
            <Plus aria-hidden="true" />Démarrer une ronde
          </Button>}
          <Button type="button" variant="outline" disabled={!filteredPatrols.length} onClick={exportFilteredPatrols}>
            <Download aria-hidden="true" />Exporter Excel
          </Button>
          <Button type="button" variant="outline" onClick={downloadPatrolTemplate}>
            <FileDown aria-hidden="true" />Télécharger modèle
          </Button>
          <Button type="button" variant="outline" disabled title="L’import des rondes n’est pas disponible">
            <FileUp aria-hidden="true" />Importer
          </Button>
          <Button type="button" variant="outline" disabled={!filteredPatrols.length} onClick={printPatrols}>
            <Printer aria-hidden="true" />Imprimer les lignes
          </Button>
        </div>
      </div>
      <div className="patrol-filter-grid patrol-screen">
        <label className="patrol-filter-field">
          <span><CalendarDays aria-hidden="true" />Période</span>
          <div className="patrol-date-range">
            <Input aria-label="Date de début" type="date" max={dateTo || undefined} value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
            <span aria-hidden="true">–</span>
            <Input aria-label="Date de fin" type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
          </div>
        </label>
        <label className="patrol-filter-field">
          <span><ClipboardList aria-hidden="true" />Parcours</span>
          <select value={routeFilter} onChange={(event) => { setRouteFilter(event.target.value); setPage(1); }}>
            <option value="">Tous les parcours</option>
            {routeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="patrol-filter-field">
          <span><MapPin aria-hidden="true" />Site</span>
          <select id="patrol-site" value={selectedSiteId} onChange={(event) => { setSiteId(event.target.value); setPage(1); }} disabled={sites.length <= 1}>
            {!sites.length && <option value="">Aucun site disponible</option>}
            {sites.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type === "AGENCE" ? "Agence" : "Usine"}</option>)}
          </select>
        </label>
        <label className="patrol-filter-field">
          <span><CheckCircle2 aria-hidden="true" />Statut</span>
          <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
            <option value="all">Tous</option>
            <option value="active">En cours</option>
            <option value="finished">Terminée</option>
            <option value="pending">En attente de synchronisation</option>
          </select>
        </label>
        <label className="patrol-filter-field patrol-filter-search">
          <span><Search aria-hidden="true" />Recherche</span>
          <Input aria-label="Rechercher une ronde" placeholder="Parcours, point, observation…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </label>
      </div>

      <PatrolHistoryPanel
        data={pagePatrols}
        fmt={fmtTime}
        total={filteredPatrols.length}
        page={currentPage}
        pageSize={pageSize}
        pageCount={pageCount}
        onPageChange={setPage}
        onPageSizeChange={(value) => { setPageSize(value); setPage(1); }}
      />
    </section>

    <section className="patrol-print-report">
      <header className="patrol-print-header">
        <p className="patrol-print-brand">SECURITEC · REGISTRE DE SÉCURITÉ</p>
        <h1>Registre des patrouilles et rondes</h1>
        <p className="patrol-print-meta">
          Site : <strong>{site?.name || "Tous les sites"}</strong>
          <span> · </span>
          Période : <strong>{dateFrom ? fmtTime(`${dateFrom}T00:00:00`).split(" ")[0] : "Toutes dates"}</strong>
          {dateTo && <> au <strong>{fmtTime(`${dateTo}T00:00:00`).split(" ")[0]}</strong></>}
          <span> · </span>
          {filteredPatrols.length} ronde(s)
        </p>
        <p className="patrol-print-generated">Document généré le {new Date().toLocaleString("fr-FR")}</p>
      </header>
      {filteredPatrols.length ? filteredPatrols.map((patrol, index) => {
        const checkpoints = patrol.checkpoints || [];
        const checkedCount = checkpoints.filter((point) => point.at).length;
        return (
          <article className="patrol-print-entry" key={patrol.id}>
            <div className="patrol-print-entry-heading">
              <h2>{index + 1}. {patrol.route_name}</h2>
              <span>{patrolStatus(patrol)}</span>
            </div>
            <dl className="patrol-print-facts">
              <div><dt>Date</dt><dd>{fmtTime(patrol.started_at).split(" ")[0]}</dd></div>
              <div><dt>Début</dt><dd>{fmtTime(patrol.started_at)}</dd></div>
              <div><dt>Fin</dt><dd>{fmtTime(patrol.ended_at)}</dd></div>
              <div><dt>Points contrôlés</dt><dd>{checkedCount} sur {checkpoints.length}</dd></div>
            </dl>
            <h3>Points de contrôle</h3>
            <ul className="patrol-print-checkpoints">
              {checkpoints.map((point, pointIndex) => (
                <li key={`${point.name}-${pointIndex}`}>
                  <span>{point.name}</span>
                  <strong>{point.at ? `Contrôlé · ${fmtTime(point.at)}` : "Non contrôlé"}</strong>
                </li>
              ))}
            </ul>
            <h3>Observations</h3>
            <p className="patrol-print-observations">{patrol.anomalies || "Aucune observation."}</p>
            {patrol.pendingSyncError && <p className="patrol-print-warning">Synchronisation : {patrol.pendingSyncError}</p>}
          </article>
        );
      }) : <p>Aucune ronde ne correspond aux filtres sélectionnés.</p>}
    </section>

    <Dialog open={startDialogOpen} onOpenChange={setStartDialogOpen}>
      <DialogContent className="patrol-start-dialog">
        <DialogHeader>
          <DialogTitle>Démarrer une patrouille ou une ronde</DialogTitle>
          <DialogDescription>Choisissez le parcours à effectuer sur le site sélectionné.</DialogDescription>
        </DialogHeader>
        <StartPatrolPanel route={route} setRoute={setRoute} onStart={start} saving={saving} />
      </DialogContent>
    </Dialog>
  </div>;
}
