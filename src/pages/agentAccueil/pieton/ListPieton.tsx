import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnomalies } from "@/hooks/useAnomalies";
import { serviceApi } from "@/lib/service-api";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";
import type { VisitorRecord } from "@/types/visitor";
import { Ban, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown, FileUp, MapPin, Pencil, Plus, Printer, Search, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { formatTime } from "./formatTime";
import { printRecord } from "@/lib/printRecord";

const formatDate = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const dateInputValue = (value: string | Date | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const visitorHeaders = ["Nom et prénom", "Établissement", "Motif", "N° badge", "Date d’entrée", "Heure d’entrée"];

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);

export default function ListPieton({
  visitors,
  onEdit,
  onDelete,
  canManageSiteBans,
  onToggleSiteBan,
  siteId,
  siteName,
  siteType,
  onCreated,
  sitePicker,
  onNewEntry,
}: {
  visitors: VisitorRecord[];
  onEdit: (visitor: VisitorRecord) => void;
  onDelete: (visitor: VisitorRecord) => Promise<void>;
  canManageSiteBans: boolean;
  onToggleSiteBan: (visitor: VisitorRecord, banned: boolean) => Promise<void>;
  siteId: string;
  siteName: string;
  siteType: string;
  onCreated: (visitor: VisitorRecord) => void;
  sitePicker: ReactNode;
  onNewEntry: () => void;
}) {
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [accessFilter, setAccessFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [importing, setImporting] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const anomalies = useAnomalies();
  const enAnomalie = new Set(anomalies.filter((a) => a.type === "visiteur").map((a) => String(a.rowId)));
  const filtered = useMemo(() => {
    const query = q.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
    return visitors.filter((visitor) => {
      const visitDate = dateInputValue(visitor.entered_at);
      if (dateFrom && visitDate < dateFrom) return false;
      if (dateTo && visitDate > dateTo) return false;
      if (personFilter && visitor.full_name !== personFilter) return false;
      if (accessFilter === "pending" && !visitor.pendingSync) return false;
      if (accessFilter === "saved" && visitor.pendingSync) return false;
      if (accessFilter === "banned" && !visitor.site_banned) return false;
      if (accessFilter === "allowed" && visitor.site_banned) return false;
      if (!query) return true;
      return [
      visitor.full_name,
      visitor.company,
      visitor.reason,
      visitor.badge,
      visitor.entered_at,
      visitor.exited_at,
      ].some((value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().includes(query));
    });
  }, [q, visitors, dateFrom, dateTo, personFilter, accessFilter]);
  const personOptions = useMemo(() => Array.from(new Set(visitors.map(({ full_name }) => full_name.trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "fr")), [visitors]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageVisitors = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportRows = (items: VisitorRecord[]) => items.map((visitor) => [
    visitor.full_name || "",
    visitor.company || "",
    visitor.reason || "",
    visitor.badge || "",
    dateInputValue(visitor.entered_at),
    formatTime(visitor.entered_at),
    formatTime(visitor.exited_at),
    visitor.site_banned ? "Interdit" : "Autorisé",
    visitor.pendingSync ? visitor.pendingSyncStatus === "rejected" ? "À vérifier" : visitor.pendingSyncStatus === "conflict" ? "Conflit" : "En attente" : "Synchronisé",
  ]);
  const exportFiltered = () => exportXlsx(
    `registre-visiteurs-${dateInputValue(new Date())}.xlsx`,
    "Visiteurs et accès",
    [...visitorHeaders, "Heure de sortie", "Accès au site", "Synchronisation"],
    exportRows(filtered),
  );
  const downloadTemplate = () => exportXlsx("modele-visiteurs-et-acces.xlsx", "Visiteurs et accès", visitorHeaders, []);
  const importFile = async (file?: File) => {
    if (!file) return;
    if (!siteId) {
      toast.error("Sélectionnez un site avant l’importation.");
      return;
    }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalize = (value: unknown) => String(value ?? "").trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]/g, "");
      const headers = (sheet[0] || []).map(normalize);
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.includes(header));
      const columns = {
        fullName: column("nometprenom", "nomprenom", "visiteur"),
        company: column("etablissement", "entreprise", "societe"),
        reason: column("motif", "raison"),
        badge: column("nbadge", "numerodebadge", "badge"),
        entryDate: column("datedentree", "dateentree", "date"),
        entryTime: column("heuredentree", "heureentree", "heure"),
      };
      if (Object.values(columns).some((index) => index < 0)) {
        throw new Error("Colonnes requises manquantes : Nom et prénom, Établissement, Motif, N° badge, Date d’entrée et Heure d’entrée.");
      }
      const cell = (row: string[], index: number) => String(row[index] ?? "").trim();
      const excelDate = (value: string) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const frenchDate = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(value);
        if (frenchDate) return `${frenchDate[3]}-${frenchDate[2].padStart(2, "0")}-${frenchDate[1].padStart(2, "0")}`;
        const serial = Number(value);
        return Number.isFinite(serial) && serial >= 1 && serial < 100000
          ? new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10)
          : "";
      };
      const excelTime = (value: string) => {
        const serial = Number(value);
        if (value && Number.isFinite(serial) && serial >= 0 && serial < 1) {
          const minutes = Math.round(serial * 24 * 60);
          return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        }
        const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
        return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
      };
      const errors: string[] = [];
      const imported: VisitorRecord[] = [];
      for (const [index, row] of sheet.slice(1).entries()) {
        if (!row.some((value) => String(value ?? "").trim())) continue;
        const line = index + 2;
        const fullName = cell(row, columns.fullName);
        const reason = cell(row, columns.reason);
        const entryDate = excelDate(cell(row, columns.entryDate));
        const entryTime = excelTime(cell(row, columns.entryTime));
        if (!fullName || !reason || !entryDate || !entryTime) {
          errors.push(`Ligne ${line} : nom, motif, date ou heure d’entrée invalide.`);
          continue;
        }
        try {
          imported.push(await serviceApi.createVisitor({
            full_name: fullName,
            company: cell(row, columns.company),
            reason,
            badge: cell(row, columns.badge),
            entryDate,
            entryTime,
            siteId,
            siteName,
            siteType,
          }));
        } catch (error) {
          errors.push(`Ligne ${line} : ${error instanceof Error ? error.message : "import impossible"}`);
        }
      }
      imported.forEach(onCreated);
      if (errors.length) {
        toast.error(`${imported.length} entrée(s) importée(s), ${errors.length} ligne(s) en erreur. ${errors.slice(0, 3).join(" ")}`);
      } else if (imported.length) {
        toast.success(`${imported.length} entrée(s) visiteur importée(s).`);
      } else {
        toast.error("Aucune entrée valide à importer.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Importation impossible.");
    } finally {
      setImporting(false);
      if (importInput.current) importInput.current.value = "";
    }
  };

  const printVisitors = (items: VisitorRecord[], title: string) => {
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer le registre.");
      return;
    }
    const rows = items.map((visitor) => {
      const values = [
        formatDate(visitor.entered_at),
        visitor.full_name || "—",
        visitor.site_banned ? "Interdit" : "Autorisé",
        visitor.company || "—",
        visitor.reason || "—",
        visitor.badge || "—",
        formatTime(visitor.entered_at),
        formatTime(visitor.exited_at),
      ];
      return `<tr>${values.map((value) => `<td>${escapeHtml(String(value))}</td>`).join("")}</tr>`;
    }).join("");
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { color: #172033; font: 12px Arial, sans-serif; }
            h1 { margin: 0 0 5px; font-size: 20px; }
            .meta { margin: 0 0 18px; color: #536174; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 7px; border: 1px solid #d6dbe4; text-align: left; vertical-align: top; }
            th { background: #edf1f5; font-size: 10px; text-transform: uppercase; }
            td { white-space: pre-wrap; overflow-wrap: anywhere; }
            tr { break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p class="meta">Site : ${escapeHtml(siteName)} · Impression du ${escapeHtml(new Date().toLocaleDateString("fr-FR"))} · ${items.length} passage(s)</p>
          <table>
            <thead><tr><th>Date</th><th>Nom et prénom</th><th>Accès au site</th><th>Établissement</th><th>Motif</th><th>N° badge</th><th>Heure d’entrée</th><th>Heure de sortie</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  const printVisitor = (visitor: VisitorRecord) => {
    printRecord("Passage visiteur", visitor.site_name || "", [
      ["Date", formatDate(visitor.entered_at)],
      ["Nom et prénom", visitor.full_name || "—"],
      ["Établissement", visitor.company || "—"],
      ["Motif", visitor.reason || "—"],
      ["N° badge", visitor.badge || "—"],
      ["Heure d’entrée", formatTime(visitor.entered_at)],
      ["Heure de sortie", formatTime(visitor.exited_at)],
    ]);
  };

  return (
    <section className="courrier-history visitor-access-history">
      <div className="courrier-history-toolbar">
        <h2 className="courrier-panel-heading">Registre complet des visiteurs</h2>
        <div className="courrier-history-actions courrier-registry-screen">
          <Button type="button" onClick={onNewEntry}><Plus aria-hidden="true" />Nouvelle entrée</Button>
          <Button type="button" variant="outline" disabled={!filtered.length} onClick={exportFiltered}><Download aria-hidden="true" />Exporter Excel</Button>
          <Button type="button" variant="outline" onClick={downloadTemplate}><FileDown aria-hidden="true" />Télécharger modèle</Button>
          <label className={`courrier-import-button ${importing ? "pointer-events-none opacity-50" : ""}`}>
            <FileUp aria-hidden="true" />{importing ? "Importation…" : "Importer"}
          <input ref={importInput} type="file" accept=".xlsx,.csv" className="sr-only" onChange={(event) => void importFile(event.target.files?.[0])} />
          </label>
          <Button type="button" variant="outline" disabled={!filtered.length} onClick={() => printVisitors(filtered, "Registre des visiteurs")}><Printer aria-hidden="true" />Imprimer les lignes</Button>
        </div>
      </div>

      <div className="courrier-filter-grid visitor-access-filters courrier-registry-screen">
        <label className="courrier-filter-field">
          <span><CalendarDays aria-hidden="true" />Période</span>
          <div className="courrier-date-range">
            <Input aria-label="Date de début" type="date" max={dateTo || undefined} value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
            <span aria-hidden="true">–</span>
            <Input aria-label="Date de fin" type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
          </div>
        </label>
        <label className="courrier-filter-field">
          <span><UserRound aria-hidden="true" />Personne</span>
          <select value={personFilter} onChange={(event) => { setPersonFilter(event.target.value); setPage(1); }}>
            <option value="">Toutes les personnes</option>
            {personOptions.map((person) => <option key={person} value={person}>{person}</option>)}
          </select>
        </label>
        <div className="courrier-filter-field courrier-filter-site">
          <span><MapPin aria-hidden="true" />Site</span>{sitePicker}
        </div>
        <label className="courrier-filter-field">
          <span><CheckCircle2 aria-hidden="true" />Statut</span>
          <select value={accessFilter} onChange={(event) => { setAccessFilter(event.target.value); setPage(1); }}>
            <option value="all">Tous</option>
            <option value="allowed">Autorisé</option>
            <option value="banned">Interdit</option>
            <option value="pending">En attente de synchronisation</option>
            <option value="saved">Synchronisé</option>
          </select>
        </label>
        <label className="courrier-filter-field courrier-filter-search">
          <span><Search aria-hidden="true" />Recherche</span>
          <Input type="search" aria-label="Rechercher dans le registre visiteurs" placeholder="Nom, établissement, motif…" value={q} onChange={(event) => { setQ(event.target.value); setPage(1); }} />
        </label>
      </div>

      <div className="courrier-results-summary courrier-registry-screen">
        <p><CheckCircle2 aria-hidden="true" />{filtered.length} visiteur(s) trouvé(s)</p>
        <label>
          Afficher
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
            <option value={10}>10 lignes</option><option value={25}>25 lignes</option><option value={50}>50 lignes</option><option value={100}>100 lignes</option>
          </select>
        </label>
      </div>

      <div className="overflow-auto rounded-lg courrier-registry-screen">
        <table className="courrier-table courrier-history-table visitor-access-table w-full border-collapse text-left text-sm">
          <thead>
            <tr>
              {["Date", "Nom et prénom", "Accès au site", "Établissement", "Motif", "N° badge", "Heure d’entrée", "Heure de sortie", "Action"].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {pageVisitors.map((visitor) => (
              <tr key={visitor.id} className={`courrier-table-row ${enAnomalie.has(String(visitor.id)) ? "courrier-table-row--cancelled" : ""} ${visitor.pendingSync ? "courrier-table-row--pending" : ""}`}>
                <td className="whitespace-nowrap">{formatDate(visitor.entered_at)}{visitor.pendingSync && <span className="courrier-status-detail">{visitor.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : visitor.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"}</span>}</td>
                <td className="font-medium">{visitor.full_name || "—"}</td>
                <td><span className={`visitor-access-status ${visitor.site_banned ? "visitor-access-status--banned" : "visitor-access-status--allowed"}`}>{visitor.site_banned ? "INTERDIT" : "Autorisé"}</span></td>
                <td>{visitor.company || "—"}</td>
                <td className="break-words whitespace-pre-wrap">{visitor.reason || "—"}</td>
                <td>{visitor.badge || "—"}</td>
                <td className="whitespace-nowrap">{formatTime(visitor.entered_at)}</td>
                <td className="whitespace-nowrap">{formatTime(visitor.exited_at)}</td>
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {canManageSiteBans && <Button type="button" size="icon" variant="ghost" disabled={visitor.pendingSync} className={`h-8 w-8 ${visitor.site_banned ? "text-destructive" : ""}`} aria-label={visitor.site_banned ? "Lever l’interdiction sur le site" : "Interdire l’accès au site"} title={visitor.site_banned ? "Lever l’interdiction sur le site" : "Interdire l’accès au site"} onClick={() => void onToggleSiteBan(visitor, !visitor.site_banned)}>
                      {visitor.site_banned ? <ShieldCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    </Button>}
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer le passage" title="Imprimer au format 80 × 80 mm" onClick={() => printVisitor(visitor)}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" disabled={visitor.pendingSync} className="h-8 w-8" aria-label="Modifier le passage" title="Modifier le passage après synchronisation" onClick={() => onEdit(visitor)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label={visitor.exited_at || visitor.id.startsWith("pending-") ? "Supprimer le passage" : "La sortie doit être enregistrée avant la suppression"}
                      title={visitor.exited_at ? "Supprimer le passage" : visitor.id.startsWith("pending-") ? "Supprimer cette entrée non synchronisée" : "Enregistrez la sortie avant de supprimer ce passage"}
                      disabled={!visitor.exited_at && !visitor.id.startsWith("pending-")}
                      onClick={() => void onDelete(visitor)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={9} className="courrier-empty-row">
                {visitors.length ? "Aucun résultat pour ces filtres." : "Aucun passage enregistré."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      {visitors.length > 0 && <div className="courrier-pagination courrier-registry-screen">
        <span>Affichage de {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} à {Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length}</span>
        <div>
          <span>Page {currentPage} / {pageCount}</span>
          <Button type="button" variant="outline" size="icon" aria-label="Page précédente" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="size-4" /></Button>
          <Button type="button" className="courrier-page-number" disabled>{currentPage}</Button>
          <Button type="button" variant="outline" size="icon" aria-label="Page suivante" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="size-4" /></Button>
        </div>
      </div>}
    </section>
  );
}
