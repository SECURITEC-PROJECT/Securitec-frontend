import { useEffect, useState, type FormEvent } from "react";
import { Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type CourrierMovement } from "@/lib/service-api";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown, FileUp, LogOut, Mail, MapPin, Pencil, Plus, Printer, Save, Search, Trash2, UserRound, X } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRecord } from "@/lib/printRecord";
import { RegistryAuditHistory } from "@/components/RegistryAuditHistory";
import { RegistryAttachments } from "@/components/RegistryAttachments";
import { Link } from "react-router-dom";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";

type MovementForm = {
  date: string;
  heureEntree: string;
  prenom: string;
  designation: string;
  nombre: string;
};

interface OpenShift {
  id: string;
  serviceId?: string;
  siteId?: string;
  site_de_travail?: string;
  pendingSync?: boolean;
  ended_at?: string | null;
  posteId?: string;
  posteNom?: string;
  shiftType?: string;
  nom?: string;
  prenom?: string;
  started_at?: string;
  serviceEndedAt?: string | null;
  fonctionService?: string;
}

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (): MovementForm => ({
  date: today(),
  heureEntree: currentTime(),
  prenom: "",
  designation: "",
  nombre: "1",
});

const formatDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const courrierHeaders = ["Date", "Heure d’entrée", "Prénom", "Désignation", "Nombre"];

export default function Courrier() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [registry, setRegistry] = useState<{ siteId: string; entries: CourrierMovement[]; error: string }>({
    siteId: "",
    entries: [],
    error: "",
  });
  const [form, setForm] = useState<MovementForm>(emptyForm);
  const [editing, setEditing] = useState<CourrierMovement | null>(null);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [shiftError, setShiftError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [personFilter, setPersonFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const entries = useMemo(() => registry.siteId === site?.id ? registry.entries : [], [registry.entries, registry.siteId, site?.id]);
  const error = registry.siteId === site?.id ? registry.error : "";
  const loading = Boolean(site?.id) && registry.siteId !== site?.id;
  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const personOptions = useMemo(() => Array.from(new Set(entries.map((entry) => entry.prenom.trim()).filter(Boolean))
    .values()).sort((left, right) => left.localeCompare(right, "fr")), [entries]);
  const filteredEntries = useMemo(() => entries.filter((entry) => {
    const date = entry.date.slice(0, 10);
    if (dateFrom && date < dateFrom) return false;
    if (dateTo && date > dateTo) return false;
    if (personFilter && entry.prenom !== personFilter) return false;
    if (statusFilter === "pending" && !entry.pendingSync) return false;
    if (statusFilter === "cancelled" && (entry.pendingSync || !entry.annuleLe)) return false;
    if (statusFilter === "exited" && (entry.pendingSync || entry.annuleLe || !entry.heureSortie)) return false;
    if (statusFilter === "circulating" && (entry.pendingSync || entry.annuleLe || entry.heureSortie)) return false;
    const searchable = [entry.date, formatDate(date), entry.heureEntree, entry.prenom, entry.designation,
      String(entry.nombre), entry.heureSortie ?? "", entry.siteName]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase();
    return !normalizedSearch || searchable.includes(normalizedSearch);
  }), [entries, dateFrom, dateTo, personFilter, statusFilter, normalizedSearch]);
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageNumbers = Array.from(
    { length: Math.min(pageCount, currentPage + 1) - Math.max(1, currentPage - 1) + 1 },
    (_, index) => Math.max(1, currentPage - 1) + index,
  );

  useEffect(() => {
    const updateConnectivity = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      if (!site?.id) {
        setOpenShifts([]);
        setOpenShiftId(null);
        setLoadingShifts(false);
        setShiftError("");
        return;
      }

      const selectedPostId = localStorage.getItem(`securitec-active-post:${site.id}`);
      const storageKey = `securitec-logistics-shift:${site.id}:${selectedPostId || "site"}`;
      if (!isOnline) {
        setOpenShifts([]);
        setOpenShiftId(localStorage.getItem(storageKey) ||
          (!selectedPostId ? localStorage.getItem(`securitec-logistics-shift:${site.id}`) ||
            localStorage.getItem(`securitec-active-shift:${site.id}`) : null));
        setLoadingShifts(false);
        setShiftError("");
        return;
      }

      setOpenShifts([]);
      setOpenShiftId(null);
      setLoadingShifts(true);
      setShiftError("");
      try {
        const shifts = await serviceApi.listShifts(site.id);
        const grouped = new Map<string, OpenShift[]>();
        shifts.filter((item: OpenShift) => !item.ended_at && !item.serviceEndedAt && !item.pendingSync &&
          (item.siteId === site.id || String(item.site_de_travail || "").trim().toLocaleLowerCase() === site.name.trim().toLocaleLowerCase()))
          .forEach((item: OpenShift) => {
            const id = String(item.serviceId || item.id);
            grouped.set(id, [...(grouped.get(id) || []), item]);
          });
        const candidates = Array.from(grouped.entries()).map(([serviceId, members]) => {
          const leader = members.find((item) => item.fonctionService === "CHEF") || members[0];
          return { ...leader, id: serviceId };
        });
        if (!active) return;
        setOpenShifts(candidates);
        const matchingPostShifts = selectedPostId ? candidates.filter((item) => item.posteId === selectedPostId) : [];
        const relevant = matchingPostShifts.length ? matchingPostShifts : candidates;
        const cached = localStorage.getItem(storageKey) ||
          (!selectedPostId ? localStorage.getItem(`securitec-logistics-shift:${site.id}`) ||
            localStorage.getItem(`securitec-active-shift:${site.id}`) : null);
        const id = relevant.some((item) => item.id === cached) ? cached : relevant.length === 1 ? relevant[0].id : null;
        setOpenShiftId(id);
        if (id) {
          localStorage.setItem(storageKey, id);
          const selected = relevant.find((item) => item.id === id);
          if (selected?.posteId) {
            localStorage.setItem(`securitec-active-post:${site.id}`, selected.posteId);
            localStorage.setItem(`securitec-active-shift:${site.id}:${selected.posteId}`, id);
          }
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (reason) {
        if (!active) return;
        setOpenShifts([]);
        setOpenShiftId(null);
        setShiftError(reason instanceof Error ? reason.message : "Chargement des prises de poste impossible.");
      } finally {
        if (active) setLoadingShifts(false);
      }
    });
    return () => { active = false; };
  }, [site?.id, site?.name, isOnline]);

  useEffect(() => {
    if (!site?.id) return;
    let active = true;
    const refreshEntries = () => serviceApi.listCourrierMovements(site.id)
      .then((rows) => {
        if (active) setRegistry({ siteId: site.id, entries: rows, error: "" });
      })
      .catch((reason) => {
        if (active) setRegistry({
          siteId: site.id,
          entries: [],
          error: reason instanceof Error ? reason.message : "Chargement du registre courrier impossible.",
        });
      });
    const refreshOnQueueChange = () => { void refreshEntries(); };
    void refreshEntries();
    window.addEventListener("online", refreshOnQueueChange);
    window.addEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    return () => {
      active = false;
      window.removeEventListener("online", refreshOnQueueChange);
      window.removeEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    };
  }, [site?.id]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setEntryFormOpen(false);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    if (!editing && loadingShifts) {
      toast.error("Veuillez attendre le chargement des prises de poste.");
      return;
    }
    if (!editing && !openShiftId) {
      toast.error(openShifts.length
        ? "Sélectionnez le poste et le service qui effectuent cette saisie."
        : "Ouvrez une prise de poste pour ce site avant d’enregistrer dans le registre courrier.");
      return;
    }
    const nombre = Number(form.nombre);
    if (!Number.isSafeInteger(nombre) || nombre < 1 || nombre > 1000000) {
      toast.error("Le nombre doit être un entier entre 1 et 1 000 000.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        heureEntree: form.heureEntree,
        prenom: form.prenom.trim(),
        designation: form.designation.trim(),
        nombre,
        siteId: site.id,
        priseDePosteId: editing ? null : openShiftId,
      };
      const entry = editing
        ? await serviceApi.updateCourrierMovement(editing.id, payload, editing.updatedAt)
        : await serviceApi.createCourrierMovement(payload);
      setRegistry((current) => ({
        siteId: site.id,
        entries: editing
          ? current.entries.map((row) => row.id === entry.id ? entry : row)
          : [entry, ...current.entries],
        error: "",
      }));
      resetForm();
      toast.success(entry.pendingSync
        ? "Mouvement enregistré localement. Synchronisation au retour du réseau."
        : editing ? "Mouvement courrier modifié." : "Entrée courrier enregistrée.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (entry: CourrierMovement) => {
    setEditing(entry);
    setEntryFormOpen(true);
    setForm({
      date: entry.date.slice(0, 10),
      heureEntree: entry.heureEntree,
      prenom: entry.prenom,
      designation: entry.designation,
      nombre: String(entry.nombre),
    });
  };

  const registerExit = async (entry: CourrierMovement) => {
    if (!site?.id) return;
    setExitingId(entry.id);
    try {
      const result = await serviceApi.exitCourrierMovement(entry.id, site.id, entry.updatedAt);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.map((row) => row.id === entry.id ? { ...row, ...result } : row),
      }));
      toast.success(result.pendingSync ? "Sortie enregistrée localement. Synchronisation au retour du réseau." : `Sortie enregistrée pour ${entry.prenom}.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Impossible d’enregistrer la sortie.");
    } finally {
      setExitingId(null);
    }
  };

  const deleteEntry = async (entry: CourrierMovement) => {
    if (!site?.id) return;
    if (entry.annuleLe || !(await confirmDeletion(`Annuler le mouvement de ${entry.prenom} ? Il restera dans l’historique.`))) return;
    setDeletingId(entry.id);
    try {
      const result = await serviceApi.deleteCourrierMovement(entry.id, site.id, entry.updatedAt);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.map((row) => row.id === entry.id ? { ...row, annuleLe: result.annuleLe || new Date().toISOString(), pendingSync: result.pendingSync } : row),
      }));
      if (editing?.id === entry.id) resetForm();
      toast.success(result.pendingSync ? "Annulation enregistrée localement. Synchronisation au retour du réseau." : "Mouvement courrier annulé et conservé dans l’historique.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre du courrier";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (entry: CourrierMovement) => {
    printRecord("Mouvement courrier", selectedSiteName, [
      ["Date", formatDate(entry.date.slice(0, 10))],
      ["Heure d’entrée", entry.heureEntree],
      ["Prénom", entry.prenom],
      ["Désignation", entry.designation],
      ["Nombre", String(entry.nombre)],
      ["Heure de sortie", entry.heureSortie || "—"],
    ]);
  };

  const rowsForExport = (records: CourrierMovement[]) => records.map((entry) => [
    entry.date.slice(0, 10),
    entry.heureEntree,
    entry.prenom,
    entry.designation,
    entry.nombre,
    entry.heureSortie || "",
    entry.annuleLe || "",
    entry.pendingSync ? entry.pendingSyncStatus === "conflict" ? "Conflit" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente" : "",
  ]);
  const exportExcel = () => exportXlsx(
    `registre-courrier-${today()}.xlsx`,
    "Mouvements courrier",
    [...courrierHeaders, "Heure sortie", "Annulé le", "Synchronisation"],
    rowsForExport(filteredEntries),
  );
  const downloadTemplate = () => exportXlsx(
    "modele-registre-courrier.xlsx",
    "Mouvements courrier",
    courrierHeaders,
    [],
  );
  const importFile = async (file?: File) => {
    if (!file) return;
    if (!site?.id) {
      toast.error("Sélectionnez un site avant l’importation.");
      return;
    }
    if (!openShiftId || loadingShifts) {
      toast.error("Sélectionnez une prise de poste active avant l’importation.");
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
        date: column("date", "dateentree", "datedentree", "dateoperation"),
        time: column("heureentree", "heuredentree", "heure", "heureoperation"),
        prenom: column("prenom", "nom", "nometprenom", "personne"),
        designation: column("designation", "objet", "description"),
        quantity: column("nombre", "quantite"),
      };
      if (Object.values(columns).some((index) => index < 0)) {
        throw new Error("Colonnes requises manquantes : Date, Heure d’entrée, Prénom, Désignation et Nombre.");
      }

      const cell = (row: string[], index: number) => String(row[index] ?? "").trim();
      const excelDate = (value: string) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const frenchDate = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(value);
        if (frenchDate) return `${frenchDate[3]}-${frenchDate[2].padStart(2, "0")}-${frenchDate[1].padStart(2, "0")}`;
        const serial = Number(value);
        if (Number.isFinite(serial) && serial >= 1 && serial < 100000) {
          return new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10);
        }
        return "";
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
      const data = sheet.slice(1).map((row, index) => ({
        line: index + 2,
        date: excelDate(cell(row, columns.date)),
        heureEntree: excelTime(cell(row, columns.time)),
        prenom: cell(row, columns.prenom),
        designation: cell(row, columns.designation),
        nombre: Number(cell(row, columns.quantity)),
      })).filter((row) => row.date || row.heureEntree || row.prenom || row.designation || Number.isFinite(row.nombre) && row.nombre !== 0);
      if (!data.length) throw new Error("Le fichier ne contient aucune ligne à importer.");

      let saved = 0;
      let queued = 0;
      const failures: string[] = [];
      for (const row of data) {
        const dateValue = new Date(`${row.date}T00:00:00.000Z`);
        const validDate = /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
          !Number.isNaN(dateValue.getTime()) && dateValue.toISOString().slice(0, 10) === row.date;
        if (!validDate || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.heureEntree)
          || !row.prenom || !row.designation || !Number.isSafeInteger(row.nombre) || row.nombre < 1 || row.nombre > 1000000) {
          failures.push(`Ligne ${row.line} : vérifiez la date, l’heure, le prénom, la désignation et le nombre.`);
          continue;
        }
        try {
          const entry = await serviceApi.createCourrierMovement({
            date: row.date,
            heureEntree: row.heureEntree,
            prenom: row.prenom,
            designation: row.designation,
            nombre: row.nombre,
            siteId: site.id,
            priseDePosteId: openShiftId,
          });
          saved += 1;
          if (entry.pendingSync) queued += 1;
          setRegistry((current) => ({
            ...current,
            entries: [entry, ...current.entries.filter((item) => item.id !== entry.id)],
          }));
        } catch (reason) {
          failures.push(`Ligne ${row.line} : ${reason instanceof Error ? reason.message : "enregistrement impossible"}`);
        }
      }
      if (saved) {
        setPage(1);
        toast.success(`${saved} mouvement(s) importé(s)${queued ? ` (${queued} en attente de synchronisation)` : ""}.`);
      }
      if (failures.length) {
        toast.error(failures.slice(0, 3).join(" "));
      } else if (!saved) {
        toast.error("Aucune ligne valide n’a été importée.");
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="courrier-module space-y-4">
      <header className="courrier-hero">
        <div className="courrier-hero-icon"><Mail aria-hidden="true" /></div>
        <div className="courrier-hero-copy">
          <h1>Mouvements du courrier</h1>
          <p>Enregistrez et suivez les entrées et sorties de courrier</p>
        </div>
      </header>

      {(error || siteError) && (
        <Panel title="Erreur de chargement">
          <p className="text-sm text-destructive">{error || siteError}</p>
        </Panel>
      )}

      {!loading && (
        <section id="courrier-registry-print-area" className="courrier-history">
          <div className="courrier-history-toolbar">
            <h2 className="courrier-panel-heading">Historique et retour du courrier</h2>
            <div className="courrier-history-actions courrier-registry-screen">
              <Button type="button" onClick={() => {
                resetForm();
                setEntryFormOpen(true);
              }}>
                <Plus className="h-4 w-4" />Nouvelle entrée
              </Button>
              <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={exportExcel}>
                <Download className="h-4 w-4" />Exporter Excel
              </Button>
              <Button type="button" variant="outline" onClick={downloadTemplate}>
                <FileDown className="h-4 w-4" />Télécharger modèle
              </Button>
              <label className={`courrier-import-button ${!site?.id || importing || loadingShifts || !openShiftId ? "pointer-events-none opacity-50" : ""}`}>
                <FileUp className="h-4 w-4" />{importing ? "Importation…" : "Importer"}
                <input
                  className="sr-only"
                  type="file"
                  accept=".xlsx,.csv,text/csv"
                  disabled={!site?.id || importing || loadingShifts || !openShiftId}
                  onChange={(event) => {
                    void importFile(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <Button type="button" variant="outline" className="courrier-print-button" disabled={!filteredEntries.length} onClick={handlePrint}>
                <Printer className="h-4 w-4" />Imprimer les lignes
              </Button>
            </div>
          </div>

          <div className="courrier-filter-grid courrier-registry-screen">
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
              <span><MapPin aria-hidden="true" />Site</span>
              <SitePicker
                id="courrier-site"
                value={selectedSiteName}
                type={site?.type || siteType}
                sites={sites}
                canCreate={canCreateSite}
                onAdd={addSite}
                onChange={(name, type) => {
                  setSiteName(name);
                  setSiteType(type);
                  setEditing(null);
                  setPage(1);
                }}
              />
            </div>
            <label className="courrier-filter-field">
              <span><CheckCircle2 aria-hidden="true" />Statut</span>
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                <option value="all">Tous</option>
                <option value="circulating">En circulation</option>
                <option value="exited">Sortie effectuée</option>
                <option value="cancelled">Annulé</option>
                <option value="pending">En attente de synchronisation</option>
              </select>
            </label>
            <label className="courrier-filter-field courrier-filter-search">
              <span><Search aria-hidden="true" />Recherche</span>
              <Input
                aria-label="Rechercher un mouvement courrier"
                placeholder="Prénom, désignation…"
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              />
            </label>
          </div>

          {site?.id && loadingShifts && <p className="text-sm text-muted-foreground">Vérification des prises de poste ouvertes…</p>}
          {shiftError && <p role="alert" className="text-sm text-destructive">{shiftError}</p>}
          <div className="courrier-results-summary courrier-registry-screen">
            <p><CheckCircle2 aria-hidden="true" />{filteredEntries.length} mouvement(s) trouvé(s)</p>
            <label>
              Afficher
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value={10}>10 lignes</option>
                <option value={25}>25 lignes</option>
                <option value={50}>50 lignes</option>
                <option value={100}>100 lignes</option>
              </select>
            </label>
          </div>

          <div className="overflow-auto rounded-lg courrier-registry-screen">
            <table className="courrier-table courrier-history-table w-full border-collapse text-left text-sm">
              <thead>
                <tr>
                  {["N°", "Date", "Heure entrée", "Prénom", "Désignation", "Nombre", "Heure sortie", "Statut", "Action"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageEntries.map((entry, index) => {
                  const status = entry.pendingSync ? "pending" : entry.annuleLe ? "cancelled" : entry.heureSortie ? "exited" : "circulating";
                  const statusLabel = status === "pending"
                    ? entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"
                    : status === "cancelled" ? "Annulé" : status === "exited" ? `Sortie · ${entry.heureSortie}` : "En circulation";
                  return (
                    <tr key={entry.id} className={`courrier-table-row courrier-table-row--${status}`}>
                      <td>{(currentPage - 1) * pageSize + index + 1}</td>
                      <td className="whitespace-nowrap">{formatDate(entry.date.slice(0, 10))}</td>
                      <td className="whitespace-nowrap">{entry.heureEntree}</td>
                      <td className="font-medium">{entry.prenom}</td>
                      <td className="break-words whitespace-pre-wrap">{entry.designation}</td>
                      <td>{entry.nombre}</td>
                      <td className="whitespace-nowrap">{entry.heureSortie || "—"}</td>
                      <td>
                        <span className={`courrier-status courrier-status--${status}`}>
                          {status === "exited" && <CheckCircle2 aria-hidden="true" />}
                          {statusLabel}
                        </span>
                        {entry.pendingSyncError && <span className="courrier-status-detail">{entry.pendingSyncError}</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          {!entry.annuleLe && !entry.pendingSync && !entry.heureSortie && (
                            <Button type="button" size="sm" variant="outline" className="courrier-exit-button" disabled={exitingId === entry.id} onClick={() => void registerExit(entry)}>
                              <LogOut className="h-4 w-4" />
                              {exitingId === entry.id ? "Sortie…" : "Enregistrer le retour"}
                            </Button>
                          )}
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer le mouvement" title="Imprimer le mouvement" onClick={() => printEntry(entry)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          {!entry.annuleLe && !entry.pendingSync && <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier le mouvement" title="Modifier le mouvement" onClick={() => beginEdit(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>}
                          {!entry.annuleLe && !entry.pendingSync && <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Annuler le mouvement" title="Annuler le mouvement" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>}
                          {!entry.pendingSync && <RegistryAuditHistory entity="mouvement_courrier" recordId={entry.id} />}
                          {!entry.pendingSync && <RegistryAttachments entity="mouvement_courrier" recordId={entry.id} siteId={site?.id} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!pageEntries.length && (
                  <tr><td colSpan={9} className="courrier-empty-row">
                    {entries.length ? "Aucun mouvement ne correspond aux filtres sélectionnés." : "Aucun mouvement courrier enregistré sur ce site."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="courrier-pagination courrier-registry-screen">
            <span>{filteredEntries.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredEntries.length)} sur ${filteredEntries.length}` : "Aucun résultat"}</span>
            <div>
              <Button type="button" variant="outline" size="icon" aria-label="Page précédente" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft aria-hidden="true" />
              </Button>
              {pageNumbers.map((pageNumber) => (
                <Button key={pageNumber} type="button" variant={pageNumber === currentPage ? "default" : "outline"} className="courrier-page-number" aria-current={pageNumber === currentPage ? "page" : undefined} onClick={() => setPage(pageNumber)}>
                  {pageNumber}
                </Button>
              ))}
              <Button type="button" variant="outline" size="icon" aria-label="Page suivante" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="courrier-registry-print hidden">
            <h1 className="mb-1 text-xl font-bold">Registre des entrées et sorties de courrier</h1>
            <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
            <table>
              <thead><tr>{["Date", "Heure d’entrée", "Prénom", "Désignation", "Nombre", "Heure de sortie"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.date.slice(0, 10))}</td>
                    <td>{entry.heureEntree}</td>
                    <td>{entry.prenom}</td>
                    <td>{entry.designation}</td>
                    <td>{entry.nombre}</td>
                    <td>{entry.heureSortie || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Dialog open={entryFormOpen} onOpenChange={setEntryFormOpen}>
        <DialogContent className="courrier-entry-dialog">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier un mouvement courrier" : "Enregistrer une entrée courrier"}</DialogTitle>
            <DialogDescription>Renseignez les informations du mouvement puis enregistrez.</DialogDescription>
          </DialogHeader>
          {site?.id && loadingShifts && <p className="text-sm text-muted-foreground">Vérification des prises de poste ouvertes…</p>}
          {shiftError && <p role="alert" className="text-sm text-destructive">{shiftError}</p>}
          {site?.id && !loadingShifts && openShifts.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="courrier-shift">Poste et service de saisie *</Label>
              <select
                id="courrier-shift"
                required={!editing}
                value={openShiftId || ""}
                onChange={(event) => {
                  const id = event.target.value || null;
                  setOpenShiftId(id);
                  const selected = openShifts.find((shift) => shift.id === id);
                  const selectedPostId = selected?.posteId || localStorage.getItem(`securitec-active-post:${site.id}`);
                  const storageKey = `securitec-logistics-shift:${site.id}:${selectedPostId || "site"}`;
                  if (id) localStorage.setItem(storageKey, id);
                  else localStorage.removeItem(storageKey);
                  if (id && selectedPostId) {
                    localStorage.setItem(`securitec-active-post:${site.id}`, selectedPostId);
                    localStorage.setItem(`securitec-active-shift:${site.id}:${selectedPostId}`, id);
                  }
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner le poste actif…</option>
                {openShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.posteNom || "Poste non renseigné"} · {shift.shiftType === "NUIT" ? "Nuit" : shift.shiftType === "JOUR" ? "Jour" : "Service"} · {shift.nom || ""} {shift.prenom || ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {site?.id && !loadingShifts && !openShifts.length && !openShiftId && (
            <p className="text-sm text-amber-700">
              Aucune prise de poste ouverte sur ce site.{" "}
              <Link to="/dashboard/prise-de-poste" state={{ siteId: site.id }} className="font-medium underline">Ouvrir un service</Link>{" "}
              avant d’enregistrer.
            </p>
          )}
          <form className="courrier-entry-form space-y-5" onSubmit={(event) => void submit(event)}>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="courrier-date">Date</Label>
                <Input id="courrier-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courrier-time-in">Heure d’entrée</Label>
                <Input id="courrier-time-in" type="time" required value={form.heureEntree} onChange={(event) => setForm({ ...form, heureEntree: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courrier-firstname">Prénom</Label>
                <Input id="courrier-firstname" required maxLength={255} value={form.prenom} onChange={(event) => setForm({ ...form, prenom: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="courrier-count">Nombre</Label>
                <Input id="courrier-count" type="number" min="1" max="1000000" step="1" required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="courrier-designation">Désignation</Label>
                <Input id="courrier-designation" required maxLength={20000} placeholder="Ex. sacs, carton" value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} />
              </div>
            </div>
            {!site?.id && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un mouvement.</p>}
            <DialogFooter className="courrier-entry-footer">
              {editing && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X />Annuler</Button>}
              <Button type="submit" disabled={saving || !site?.id || (!editing && (loadingShifts || !openShiftId))}>
                {editing ? <Save /> : <Plus />}
                {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Enregistrer l’entrée"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading && (
        <Panel title="Chargement du registre">
          <p className="text-sm text-muted-foreground">Chargement des mouvements courrier…</p>
        </Panel>
      )}
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #courrier-registry-print-area, #courrier-registry-print-area * { visibility: visible !important; }
          #courrier-registry-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .courrier-registry-screen { display: none !important; }
          .courrier-hero { display: none !important; }
          .courrier-registry-print { display: block !important; }
          .courrier-registry-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .courrier-registry-print th, .courrier-registry-print td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; }
          .courrier-registry-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
