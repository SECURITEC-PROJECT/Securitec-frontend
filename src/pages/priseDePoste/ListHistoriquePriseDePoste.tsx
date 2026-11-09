import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";
import { useSites } from "@/hooks/useSites";
import type { ShiftFormData } from "./FormPriseDePoste";
import { Download, FileDown, FileUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const MADAGASCAR_TIME_ZONE = "Indian/Antananarivo";
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();
const dateInSiteTimeZone = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: MADAGASCAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day") => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};

// 💡 EXPORT OBLIGATOIRE DE L'INTERFACE SHIFT
export interface Shift {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  prestataire: string;
  site_de_travail: string;
  siteId?: string | null;
  posteId?: string | null;
  posteNom?: string | null;
  shiftType?: "JOUR" | "NUIT" | null;
  fonctionService?: "CHEF" | "AGENT" | null;
  serviceId?: string | null;
  agents?: Shift[];
  started_at: string;
  ended_at: string | null;
  checks?: Record<string, boolean>;
  notes?: string;
  pendingAgentCount?: number;
  pendingSync?: boolean;
  pendingSyncAction?: "open" | "end";
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

interface ListHistoriquePriseDePosteProps {
  shifts: Shift[];
  onOpenEndDialog: (shift: Shift, isOnlyOne: boolean) => void;
  onDeleteShift: (shift: Shift) => Promise<{ deleted: boolean; deletedFluxCount: number }>;
  onImportShift: (data: ShiftFormData) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function ListHistoriquePriseDePoste({
  shifts,
  onOpenEndDialog,
  onDeleteShift,
  onImportShift,
  onRefresh,
}: ListHistoriquePriseDePosteProps) {
  const { sites } = useSites();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [serviceFilter, setServiceFilter] = useState<"" | "JOUR" | "NUIT">("");
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const groups = Array.from(shifts.reduce((all, shift) => {
    const key = shift.serviceId || shift.id;
    const group = all.get(key) || [];
    group.push(shift);
    all.set(key, group);
    return all;
  }, new Map<string, Shift[]>()).entries()).map(([serviceId, members]) => ({
    ...((members.find((member) => member.fonctionService === "CHEF") || members[0]) as Shift),
    serviceId,
    agents: members,
  }));
  const query = normalize(search);
  const filteredGroups = groups.filter((shift) => {
      const crew = shift.agents || [shift];
      const searchText = normalize([
        shift.posteNom, shift.site_de_travail, shift.prestataire, shift.shiftType, shift.notes,
        shift.ended_at ? "terminé" : "en cours",
        ...crew.flatMap((agent) => [agent.nom, agent.prenom, agent.matricule, agent.prestataire]),
      ].filter(Boolean).join(" "));
      const started = dateInSiteTimeZone(shift.started_at);
      const ended = shift.ended_at ? dateInSiteTimeZone(shift.ended_at) : started;
      return (!query || searchText.includes(query))
        && (!dateFrom || ended >= dateFrom)
        && (!dateTo || started <= dateTo)
        && (!serviceFilter || shift.shiftType === serviceFilter);
  });
  const allActiveShiftCount = groups.filter((shift) => shift.ended_at === null && shift.pendingSyncAction !== "open").length;
  const registerShifts = filteredGroups;

  const fmtFull = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.toLocaleDateString("fr-FR", { timeZone: MADAGASCAR_TIME_ZONE })} à ${date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: MADAGASCAR_TIME_ZONE,
    })}`;
  };

  const exportHeaders = ["Poste / Site", "Service", "Équipe", "Prise", "Fin", "État"];
  const exportRows = filteredGroups.map((group) => {
    const crew = group.agents || [group];
    return [
      `${group.posteNom || "Poste non renseigné"}\n${group.site_de_travail || ""}`,
      group.shiftType === "NUIT" ? "Nuit" : group.shiftType === "JOUR" ? "Jour" : "Service",
      `${crew.length} agent(s)\nChef : ${group.prenom || ""} ${group.nom || ""}`.trim(),
      fmtFull(group.started_at), group.ended_at ? fmtFull(group.ended_at) : "",
      group.ended_at ? "Terminé" : "En service",
    ];
  });

  const deleteService = async (shift: Shift) => {
    const serviceId = shift.serviceId || shift.id;
    if (shift.pendingSync || shift.pendingSyncAction === "open") {
      toast.error("Synchronisez cette prise de service avant de la supprimer.");
      return;
    }
    if (!window.confirm(`Supprimer la prise de service de ${shift.posteNom || shift.site_de_travail} ? Les flux logistiques et leurs audits associés seront aussi supprimés. Cette action est définitive.`)) return;
    setDeletingId(serviceId);
    try {
      const result = await onDeleteShift(shift);
      if (result.deleted) toast.success(result.deletedFluxCount
        ? `Prise supprimée avec ${result.deletedFluxCount} flux logistique(s) associé(s).`
        : "Prise de service supprimée.");
      else toast.info("Cette prise de service était déjà absente du registre.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression de la prise de service impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const norm = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
      const headers = (sheet[0] || []).map(norm);
      const col = (...names: string[]) => headers.findIndex((header) => names.includes(header));
      const c = {
        location: col("poste / site"), site: col("site", "site de travail"), post: col("poste", "poste de garde"), service: col("service", "type de service"),
        team: col("equipe"), last: col("nom", "nom de l'agent"), first: col("prenom", "prenom de l'agent"), matricule: col("matricule", "matricule responsable"),
        provider: col("prestataire", "fournisseur"), started: col("prise", "prise de poste", "debut", "debut de service"),
        ended: col("fin", "fin de service", "fin de poste"), state: col("etat", "statut"), notes: col("observations", "observation"),
      };
      if ([c.service, c.started].some((index) => index < 0) || (c.location < 0 && [c.site, c.post].some((index) => index < 0)) || (c.team < 0 && [c.last, c.first].some((index) => index < 0))) {
        throw new Error("Colonnes requises : Poste / Site, Service, Équipe et Prise.");
      }
      const parseTimestamp = (raw: string): string | undefined => {
        const value = raw.trim();
        if (!value) return undefined;
        if (/^\d{4}-\d{2}-\d{2}(?:T| )/.test(value)) {
          const timestamp = new Date(value);
          return Number.isNaN(timestamp.getTime()) ? undefined : timestamp.toISOString();
        }
        const local = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})(?:\D+(\d{1,2}):(\d{2}))?$/i.exec(value);
        if (local) {
          const [, day, month, year, hour = "00", minute = "00"] = local;
          const datePart = `${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}`;
          const parsed = new Date(`${datePart}T${hour.padStart(2,"0")}:${minute}:00+03:00`);
          return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
        }
        const serial = Number(value);
        if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
          const date = new Date(Date.UTC(1899, 11, 30 + Math.floor(serial)));
          const minutes = Math.round((serial % 1) * 24 * 60);
          return new Date(`${date.toISOString().slice(0,10)}T${String(Math.floor(minutes/60)%24).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}:00+03:00`).toISOString();
        }
        return undefined;
      };
      const records = sheet.slice(1).map((cells, index) => {
        const get = (index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
        const location = get(c.location);
        const locationParts = location.split(/\r?\n/).map((part) => part.trim()).filter(Boolean);
        const postName = c.post >= 0 ? get(c.post) : locationParts[0] || "";
        const siteName = c.site >= 0 ? get(c.site) : locationParts.slice(1).join(" ");
        const site = sites.find((item) => norm(item.name) === norm(siteName));
        const service = norm(get(c.service));
        const shiftType: ShiftFormData["shiftType"] | "" = service.includes("nuit") ? "NUIT" : service.includes("jour") ? "JOUR" : "";
        const team = get(c.team);
        const chefLine = team.split(/\r?\n/).map((part) => part.trim()).find((part) => norm(part).startsWith("chef")) || "";
        const chefName = chefLine.replace(/^chef\s*:\s*/i, "").trim();
        const chefParts = chefName.split(/\s+/).filter(Boolean);
        return {
          line: index + 2, hasData: cells.some((cell) => String(cell ?? "").trim() !== ""), siteName, siteId: site?.id || "", postName, shiftType,
          lastName: c.last >= 0 ? get(c.last) : chefParts.slice(1).join(" "), firstName: c.first >= 0 ? get(c.first) : chefParts[0] || "",
          matricule: get(c.matricule), provider: get(c.provider),
          startedAt: parseTimestamp(get(c.started)), endedAt: parseTimestamp(get(c.ended)), endedProvided: Boolean(get(c.ended)),
          state: norm(get(c.state)), notes: get(c.notes),
        };
      }).filter((row) => row.hasData);
      if (!records.length) throw new Error("Le fichier ne contient aucune ligne à importer.");
      let imported = 0;
      const failures: string[] = [];
      for (const record of records) {
        const matricule = record.matricule || `IMPORT-${Date.now().toString(36).toUpperCase()}-${record.line}`;
        try {
          await onImportShift({
            nom: record.lastName || "Non renseigné", prenom: record.firstName || "Non renseigné", matricule,
            prestataire: record.provider || "Non renseigné", site_de_travail: record.siteName || "Site non renseigné", siteId: record.siteId,
            posteId: "", posteNom: record.postName, shiftType: record.shiftType, chefMatricule: matricule,
            agentMatricules: [], notes: record.notes, startedAt: record.startedAt, endedAt: record.endedAt,
          });
          imported += 1;
        } catch (error) {
          failures.push(`Ligne ${record.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
        }
      }
      await onRefresh();
      if (imported) toast.success(`${imported} ligne(s) importée(s) dans le registre de prise de service.`);
      if (failures.length) toast.error(imported ? `${failures.length} ligne(s) non importée(s). Vérifiez les données du fichier.` : failures.slice(0,3).join(" "));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Panel title="Services en cours & Historique">
      <div className="shift-history-filters" aria-label="Recherche dans l'historique">
        <label className="shift-history-filters__search">Recherche
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, matricule, poste, site…" />
        </label>
        <label>Date de début<input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} /></label>
        <label>Date de fin<input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} /></label>
        <label>Service<select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value as "" | "JOUR" | "NUIT")}>
          <option value="">Tous</option><option value="JOUR">Jour</option><option value="NUIT">Nuit</option>
        </select></label>
        {(search || dateFrom || dateTo || serviceFilter) && <Button type="button" variant="ghost" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setServiceFilter(""); }}>Effacer</Button>}
      </div>
      <p className="shift-history-result-count" aria-live="polite">{filteredGroups.length} service(s) correspondant(s)</p>
      <div className="shift-finished-section">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="shift-section-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Registre des prises de service
          </h3>
          <div className="flex flex-wrap gap-2 print:hidden">
            <label className={`inline-flex h-10 cursor-pointer items-center rounded-md border px-3 text-sm font-medium ${importing ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
              <FileUp className="mr-2 h-4 w-4" /> {importing ? "Importation…" : "Importer Excel / CSV"}
              <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={importing} onChange={(event) => { void importFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <Button type="button" variant="outline" disabled={!exportRows.length} onClick={() => exportXlsx(
              `registre-prise-de-service-${new Date().toISOString().slice(0,10)}.xlsx`, "Registre prise de service", exportHeaders, exportRows,
            )}>
              <Download className="mr-2 h-4 w-4" /> Exporter Excel
            </Button>
            <Button type="button" variant="outline" onClick={() => exportXlsx(
              "modele-registre-prise-de-service.xlsx", "Registre prise de service", exportHeaders, [],
            )}>
              <FileDown className="mr-2 h-4 w-4" /> Modèle Excel
            </Button>
          </div>
        </div>
        {registerShifts.length > 0 ? (
          <div className="shift-history-table-wrap overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr><th>Poste / Site</th><th>Service</th><th>Équipe</th><th>Prise</th><th>Fin</th><th>État</th><th>Action</th></tr></thead><tbody>
            {registerShifts.map((s) => <tr key={s.id}>
              <td><strong>{s.posteNom || "Poste non renseigné"}</strong><small className="block text-muted-foreground">{s.site_de_travail}</small></td>
              <td><span className={`shift-type-pill ${s.shiftType === "NUIT" ? "shift-type-pill--night" : "shift-type-pill--day"}`}>{s.shiftType === "NUIT" ? "Nuit" : s.shiftType === "JOUR" ? "Jour" : "Service"}</span></td>
              <td>{s.agents?.length || 1} agent(s)<small className="block text-muted-foreground">Chef : {s.prenom} {s.nom}</small></td>
              <td className="whitespace-nowrap">{fmtFull(s.started_at)}</td><td className="whitespace-nowrap">{fmtFull(s.ended_at)}</td>
              <td><span className={s.ended_at ? "shift-closed-pill" : "shift-type-pill shift-type-pill--pending"}>{s.pendingSyncAction === "open" ? "À confirmer" : s.ended_at ? "Terminé" : "En service"}</span>{s.pendingSync && <small className="mt-1 block text-amber-700">Synchronisation en attente{s.pendingSyncError ? ` · ${s.pendingSyncError}` : ""}</small>}</td>
              <td><div className="flex flex-wrap gap-2">
                {!s.ended_at && s.pendingSyncAction !== "open" && <Button size="sm" className="shift-end-button" onClick={() => onOpenEndDialog(s, allActiveShiftCount === 1)} disabled={s.pendingSync || deletingId === (s.serviceId || s.id)}>Terminer</Button>}
                <Button type="button" size="sm" variant="destructive" onClick={() => void deleteService(s)} disabled={s.pendingSync || s.pendingSyncAction === "open" || deletingId === (s.serviceId || s.id)} aria-label={`Supprimer la prise de service ${s.posteNom || ""}`}>
                  <Trash2 className="mr-1 h-4 w-4" />{deletingId === (s.serviceId || s.id) ? "Suppression…" : "Supprimer"}
                </Button>
              </div></td>
            </tr>)}
          </tbody></table></div>
        ) : (
          <Empty text="Aucune prise de service enregistrée" />
        )}
      </div>
    </Panel>
  );
}
