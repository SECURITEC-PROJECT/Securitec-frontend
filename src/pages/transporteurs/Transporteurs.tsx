import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSites } from "@/hooks/useSites";
import { confirmDeletion } from "@/lib/deletion-toast";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";
import { serviceApi, type TransporteurRecord } from "@/lib/service-api";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown, FileUp, Loader2, MapPin, Pencil, Plus, Printer, Search, Trash2, Truck, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

type TransporteurForm = Omit<TransporteurRecord, "id" | "siteId" | "createdAt">;

const emptyForm = (): TransporteurForm => ({
  nomTransporteur: "",
  vehicule: "",
  matricule: "",
  telephone: "",
  chauffeur: "",
  observation: "",
});

const noTransporteurs: TransporteurRecord[] = [];
const transporteurHeaders = ["Nom du transporteur", "Nom du véhicule", "Numéro / immatriculation", "Téléphone", "Nom du chauffeur", "Observation"];

const dateValue = (value: string | Date | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
})[character] || character);

export default function Transporteurs() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [registry, setRegistry] = useState<{ siteId: string; records: TransporteurRecord[] }>({ siteId: "", records: [] });
  const [form, setForm] = useState<TransporteurForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [importing, setImporting] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const selectedSiteId = siteId || sites[0]?.id || "";
  const records = registry.siteId === selectedSiteId ? registry.records : noTransporteurs;
  const loading = Boolean(selectedSiteId) && registry.siteId !== selectedSiteId;

  useEffect(() => {
    if (!selectedSiteId) return;
    let active = true;
    serviceApi.listTransporteurs(selectedSiteId)
      .then((result) => { if (active) setRegistry({ siteId: selectedSiteId, records: result }); })
      .catch((reason) => {
        if (active) {
          setRegistry({ siteId: selectedSiteId, records: [] });
          setError(reason instanceof Error ? reason.message : "Chargement des transporteurs impossible.");
        }
      });
    return () => { active = false; };
  }, [selectedSiteId]);

  const filtered = useMemo(() => {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
    const query = normalize(search.trim());
    return records.filter((entry) => {
      const createdDate = dateValue(entry.createdAt);
      if (dateFrom && (!createdDate || createdDate < dateFrom)) return false;
      if (dateTo && (!createdDate || createdDate > dateTo)) return false;
      if (personFilter && entry.nomTransporteur !== personFilter) return false;
      if (statusFilter === "registration" && !entry.matricule) return false;
      if (statusFilter === "no-registration" && entry.matricule) return false;
      if (!query) return true;
      return [entry.nomTransporteur, entry.vehicule, entry.matricule, entry.telephone, entry.chauffeur, entry.observation]
        .filter(Boolean)
        .some((value) => normalize(value || "").includes(query));
    });
  }, [records, search, dateFrom, dateTo, personFilter, statusFilter]);
  const personOptions = useMemo(() => Array.from(new Set(records.map((entry) => entry.nomTransporteur.trim()).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right, "fr")), [records]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormOpen(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSiteId) return;
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      matricule: form.matricule || null,
      telephone: form.telephone || null,
      chauffeur: form.chauffeur || null,
      observation: form.observation || null,
      siteId: selectedSiteId,
    };
    try {
      if (editingId) {
        const updated = await serviceApi.updateTransporteur(editingId, payload);
        setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
          ...current,
          records: current.records.map((entry) => entry.id === editingId ? updated : entry),
        }));
        toast.success("Fiche transporteur modifiée.");
      } else {
        const created = await serviceApi.createTransporteur(payload);
        setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
          ...current,
          records: [...current.records, created].sort((a, b) =>
            a.nomTransporteur.localeCompare(b.nomTransporteur, "fr") || a.vehicule.localeCompare(b.vehicule, "fr"),
          ),
        }));
        toast.success("Fiche transporteur enregistrée.");
      }
      resetForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement de la fiche transporteur impossible.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (entry: TransporteurRecord) => {
    setEditingId(entry.id);
    setForm({
      nomTransporteur: entry.nomTransporteur,
      vehicule: entry.vehicule,
      matricule: entry.matricule || "",
      telephone: entry.telephone || "",
      chauffeur: entry.chauffeur || "",
      observation: entry.observation || "",
    });
    setFormOpen(true);
  };

  const remove = async (entry: TransporteurRecord) => {
    if (!(await confirmDeletion(`Supprimer la fiche transporteur ${entry.nomTransporteur} — ${entry.vehicule} ?`))) return;
    setWorkingId(entry.id);
    setError("");
    try {
      await serviceApi.deleteTransporteur(entry.id, selectedSiteId);
      setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
        ...current,
        records: current.records.filter((item) => item.id !== entry.id),
      }));
      if (editingId === entry.id) resetForm();
      toast.success("Fiche transporteur supprimée.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression de la fiche transporteur impossible.");
    } finally {
      setWorkingId("");
    }
  };

  const exportFiltered = () => exportXlsx(
    `registre-transporteurs-${dateValue(new Date())}.xlsx`,
    "Transporteurs",
    transporteurHeaders,
    filtered.map((entry) => [entry.nomTransporteur, entry.vehicule, entry.matricule || "", entry.telephone || "", entry.chauffeur || "", entry.observation || ""]),
  );
  const downloadTemplate = () => exportXlsx("modele-transporteurs.xlsx", "Transporteurs", transporteurHeaders, []);
  const importFile = async (file?: File) => {
    if (!file) return;
    if (!selectedSiteId) {
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
        name: column("nomdutransporteur", "transporteur", "nomtransporteur"),
        vehicle: column("nomduvehicule", "vehicule"),
        registration: column("numeroimmatriculation", "immatriculation", "matricule"),
        phone: column("telephone", "tel"),
        driver: column("nomduchauffeur", "chauffeur"),
        observation: column("observation", "observations"),
      };
      if (columns.name < 0 || columns.vehicle < 0) {
        throw new Error("Colonnes requises manquantes : Nom du transporteur et Nom du véhicule.");
      }
      const cell = (row: string[], index: number) => index < 0 ? "" : String(row[index] ?? "").trim();
      const imported: TransporteurRecord[] = [];
      const errors: string[] = [];
      for (const [index, row] of sheet.slice(1).entries()) {
        if (!row.some((value) => String(value ?? "").trim())) continue;
        const line = index + 2;
        const nomTransporteur = cell(row, columns.name);
        const vehicule = cell(row, columns.vehicle);
        if (!nomTransporteur || !vehicule) {
          errors.push(`Ligne ${line} : nom du transporteur et véhicule obligatoires.`);
          continue;
        }
        try {
          imported.push(await serviceApi.createTransporteur({
            nomTransporteur,
            vehicule,
            matricule: cell(row, columns.registration) || null,
            telephone: cell(row, columns.phone) || null,
            chauffeur: cell(row, columns.driver) || null,
            observation: cell(row, columns.observation) || null,
            siteId: selectedSiteId,
          }));
        } catch (reason) {
          errors.push(`Ligne ${line} : ${reason instanceof Error ? reason.message : "import impossible"}`);
        }
      }
      if (imported.length) {
        setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
          ...current,
          records: [...current.records, ...imported].sort((a, b) => a.nomTransporteur.localeCompare(b.nomTransporteur, "fr") || a.vehicule.localeCompare(b.vehicule, "fr")),
        }));
        setPage(1);
      }
      if (errors.length) toast.error(`${imported.length} fiche(s) importée(s), ${errors.length} ligne(s) en erreur. ${errors.slice(0, 3).join(" ")}`);
      else if (imported.length) toast.success(`${imported.length} fiche(s) transporteur importée(s).`);
      else toast.error("Aucune fiche valide à importer.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Importation impossible.");
    } finally {
      setImporting(false);
      if (importInput.current) importInput.current.value = "";
    }
  };
  const printFiltered = () => {
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer le registre.");
      return;
    }
    const rows = filtered.map((entry) => `<tr>${[
      entry.nomTransporteur, entry.vehicule, entry.matricule || "—", entry.telephone || "—",
      entry.chauffeur || "—", entry.observation || "—",
    ].map((value) => `<td>${escapeHtml(String(value))}</td>`).join("")}</tr>`).join("");
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Registre transporteurs</title><style>
      @page{size:landscape;margin:12mm}*{box-sizing:border-box}body{color:#172033;font:12px Arial,sans-serif}
      h1{margin:0 0 5px;font-size:20px}.meta{margin:0 0 18px;color:#536174;font-size:11px}
      table{width:100%;border-collapse:collapse}th,td{padding:7px;border:1px solid #d6dbe4;text-align:left;vertical-align:top}
      th{background:#edf1f5;font-size:10px;text-transform:uppercase}td{white-space:pre-wrap;overflow-wrap:anywhere}tr{break-inside:avoid}
      </style></head><body><h1>Registre des transporteurs</h1><p class="meta">Site : ${escapeHtml(sites.find((site) => site.id === selectedSiteId)?.name || "")} · Impression du ${new Date().toLocaleDateString("fr-FR")} · ${filtered.length} fiche(s)</p>
      <table><thead><tr>${transporteurHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()};</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="courrier-module transporters-module space-y-4">
      <header className="courrier-hero">
        <div className="courrier-hero-icon"><Truck aria-hidden="true" /></div>
        <div className="courrier-hero-copy">
          <h1>Transporteurs</h1>
          <p>Enregistrez et suivez les transporteurs et les véhicules associés à chaque site</p>
        </div>
      </header>

      {siteError && <p role="alert" className="text-sm text-destructive">{siteError}</p>}
      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <section className="courrier-history transporters-history">
        <div className="courrier-history-toolbar">
          <h2 className="courrier-panel-heading">Transporteurs enregistrés</h2>
          <div className="courrier-history-actions courrier-registry-screen">
            <Button type="button" onClick={() => { resetForm(); setError(""); setFormOpen(true); }}>
              <Plus aria-hidden="true" />Nouveau transporteur
            </Button>
            <Button type="button" variant="outline" disabled={!filtered.length} onClick={exportFiltered}>
              <Download aria-hidden="true" />Exporter Excel
            </Button>
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <FileDown aria-hidden="true" />Télécharger modèle
            </Button>
            <label className={`courrier-import-button ${importing ? "pointer-events-none opacity-50" : ""}`}>
              <FileUp aria-hidden="true" />{importing ? "Importation…" : "Importer"}
              <input ref={importInput} type="file" accept=".xlsx,.csv" className="sr-only" disabled={importing} onChange={(event) => void importFile(event.target.files?.[0])} />
            </label>
            <Button type="button" variant="outline" disabled={!filtered.length} onClick={printFiltered}>
              <Printer aria-hidden="true" />Imprimer les lignes
            </Button>
          </div>
        </div>

        <div className="courrier-filter-grid transporters-filter-grid courrier-registry-screen">
          <label className="courrier-filter-field">
            <span><CalendarDays aria-hidden="true" />Période d’enregistrement</span>
            <div className="courrier-date-range">
              <Input aria-label="Date de début" type="date" max={dateTo || undefined} value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
              <span aria-hidden="true">–</span>
              <Input aria-label="Date de fin" type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
            </div>
          </label>
          <label className="courrier-filter-field">
            <span><UserRound aria-hidden="true" />Transporteur</span>
            <select value={personFilter} onChange={(event) => { setPersonFilter(event.target.value); setPage(1); }}>
              <option value="">Tous les transporteurs</option>
              {personOptions.map((person) => <option key={person} value={person}>{person}</option>)}
            </select>
          </label>
          <div className="courrier-filter-field courrier-filter-site">
            <span><MapPin aria-hidden="true" />Site</span>
            <div className="transporters-site-select">
              <select id="transporteur-site" aria-label="Site" value={selectedSiteId} onChange={(event) => { setSiteId(event.target.value); setError(""); setPage(1); }}>
                {!sites.length && <option value="">Aucun site disponible</option>}
                {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
              </select>
            </div>
          </div>
          <label className="courrier-filter-field">
            <span><CheckCircle2 aria-hidden="true" />Immatriculation</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="all">Tous</option>
              <option value="registration">Avec immatriculation</option>
              <option value="no-registration">Sans immatriculation</option>
            </select>
          </label>
          <label className="courrier-filter-field courrier-filter-search">
            <span><Search aria-hidden="true" />Recherche</span>
            <Input aria-label="Rechercher un transporteur" placeholder="Nom, véhicule, matricule…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </label>
        </div>

        <div className="courrier-results-summary courrier-registry-screen">
          <p><CheckCircle2 aria-hidden="true" />{filtered.length} transporteur(s) trouvé(s)</p>
          <label>Afficher
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              <option value={10}>10 lignes</option><option value={25}>25 lignes</option><option value={50}>50 lignes</option><option value={100}>100 lignes</option>
            </select>
          </label>
        </div>

        <div className="overflow-auto rounded-lg courrier-registry-screen">
          <table className="courrier-table courrier-history-table transporters-table w-full border-collapse text-left text-sm">
            <thead>
              <tr>
                {["N°", "Transporteur", "Véhicule", "Numéro / immatriculation", "Téléphone", "Chauffeur", "Observation", "Action"].map((heading) => <th key={heading}>{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="courrier-empty-row">Chargement des transporteurs…</td></tr>
                : pageRecords.length === 0 ? <tr><td colSpan={8} className="courrier-empty-row">{records.length ? "Aucun transporteur ne correspond aux filtres." : "Aucun transporteur enregistré pour ce site."}</td></tr>
                  : pageRecords.map((entry, index) => (
                    <tr key={entry.id} className="courrier-table-row">
                      <td>{(currentPage - 1) * pageSize + index + 1}</td>
                      <td className="font-medium">{entry.nomTransporteur}</td>
                      <td>{entry.vehicule}</td>
                      <td>{entry.matricule || "—"}</td>
                      <td>{entry.telephone || "—"}</td>
                      <td>{entry.chauffeur || "—"}</td>
                      <td className="break-words whitespace-pre-wrap">{entry.observation || "—"}</td>
                      <td className="whitespace-nowrap">
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="icon" aria-label={`Modifier ${entry.nomTransporteur}`} onClick={() => edit(entry)} disabled={workingId === entry.id}><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${entry.nomTransporteur}`} onClick={() => void remove(entry)} disabled={workingId === entry.id}>{workingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <div className="courrier-pagination courrier-registry-screen">
          <span>Affichage de {filtered.length ? (currentPage - 1) * pageSize + 1 : 0} à {Math.min(currentPage * pageSize, filtered.length)} sur {filtered.length}</span>
          <div>
            <Button type="button" variant="outline" size="icon" aria-label="Page précédente" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="size-4" /></Button>
            <Button type="button" className="courrier-page-number">{currentPage}</Button>
            <Button type="button" variant="outline" size="icon" aria-label="Page suivante" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </section>

      <Dialog open={formOpen} onOpenChange={(open) => {
        setFormOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="transporters-entry-dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier la fiche transporteur" : "Nouveau transporteur"}</DialogTitle>
            <DialogDescription>Renseignez le transporteur et le véhicule associés au site sélectionné.</DialogDescription>
          </DialogHeader>
        <form onSubmit={(event) => void submit(event)} className="transporters-form space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="transporteur-name" className="text-sm font-medium">Nom du transporteur *</label>
              <Input id="transporteur-name" required maxLength={255} value={form.nomTransporteur} onChange={(event) => setForm({ ...form, nomTransporteur: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transporteur-vehicle" className="text-sm font-medium">Nom du véhicule *</label>
              <Input id="transporteur-vehicle" required maxLength={160} value={form.vehicule} onChange={(event) => setForm({ ...form, vehicule: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transporteur-registration" className="text-sm font-medium">Numéro / immatriculation</label>
              <Input id="transporteur-registration" maxLength={40} value={form.matricule || ""} onChange={(event) => setForm({ ...form, matricule: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transporteur-phone" className="text-sm font-medium">Téléphone</label>
              <Input id="transporteur-phone" type="tel" maxLength={40} autoComplete="tel" value={form.telephone || ""} onChange={(event) => setForm({ ...form, telephone: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transporteur-driver" className="text-sm font-medium">Nom du chauffeur</label>
              <Input id="transporteur-driver" maxLength={255} autoComplete="name" value={form.chauffeur || ""} onChange={(event) => setForm({ ...form, chauffeur: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="transporteur-observation" className="text-sm font-medium">Observation</label>
              <textarea id="transporteur-observation" maxLength={2000} rows={3} value={form.observation || ""} onChange={(event) => setForm({ ...form, observation: event.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 h-4 w-4" />Fermer</Button>
            <Button type="submit" disabled={!selectedSiteId || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer le transporteur"}
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
