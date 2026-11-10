import { Empty, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSites } from "@/hooks/useSites";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRecord } from "@/lib/printRecord";
import { isWithinRegistryPeriod } from "@/components/RegistryPeriodExport";
import { RegistryAuditHistory } from "@/components/RegistryAuditHistory";
import { RegistryAttachments } from "@/components/RegistryAttachments";
import {
  serviceApi,
  type BicycleMovement,
  type MotorcycleMovement,
  type RegisterEmployeeOption,
} from "@/lib/service-api";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown, FileUp, LogOut, MapPin, Pencil, Plus, Printer, Search, Trash2, Truck, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";

type MovementKind = "velo" | "moto";
type MovementEntry = BicycleMovement | MotorcycleMovement;
type MovementForm = {
  date: string;
  heureEntree: string;
  matricule: string;
  marqueVelo: string;
  moto: string;
  observation: string;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const blankForm = (): MovementForm => ({
  date: today(),
  heureEntree: currentTime(),
  matricule: "",
  marqueVelo: "",
  moto: "",
  observation: "",
});

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

const formatDate = (value: string) => {
  const part = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(part) ? part.split("-").reverse().join("/") : "—";
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);

export default function MouvementsDeuxRoues({ kind }: { kind: MovementKind }) {
  const isBicycle = kind === "velo";
  const title = isBicycle ? "Mouvement Vélos" : "Mouvement Moto";
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [selectedSiteName, setSelectedSiteName] = useState("");
  const [employees, setEmployees] = useState<RegisterEmployeeOption[]>([]);
  const [employee, setEmployee] = useState<RegisterEmployeeOption | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [showEmployeeOptions, setShowEmployeeOptions] = useState(false);
  const [employeeError, setEmployeeError] = useState("");
  const [form, setForm] = useState<MovementForm>(blankForm);
  const [registry, setRegistry] = useState<{
    key: string;
    entries: MovementEntry[];
    error: string;
  }>({ key: "", entries: [], error: "" });
  const [editingEntry, setEditingEntry] = useState<MovementEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statusFilter, setStatusFilter] = useState("all");
  const [personFilter, setPersonFilter] = useState("");

  const siteName = selectedSiteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === siteName), [sites, siteName]);
  const siteId = site?.id || "";
  const currentKey = `${kind}:${siteId}`;
  const isLoaded = Boolean(siteId) && registry.key === currentKey;
  const entries = isLoaded ? registry.entries : [];
  const loadError = isLoaded ? registry.error : "";
  const loading = Boolean(siteId) && !isLoaded;

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    const load = () => isBicycle
      ? Promise.all([serviceApi.listRegisterEmployees(siteId), serviceApi.listBicycleMovements(siteId)])
        .then(([employeeRows, movementRows]) => {
          if (!active) return;
          setEmployees(employeeRows);
          setEmployeeError("");
          setRegistry({ key: currentKey, entries: movementRows, error: "" });
        })
      : serviceApi.listMotorcycleMovements(siteId)
        .then((movementRows) => {
          if (!active) return;
          setEmployees([]);
          setEmployeeError("");
          setRegistry({ key: currentKey, entries: movementRows, error: "" });
        });

    const refreshOnQueueChange = () => { void load().catch((error) => toast.error(error instanceof Error ? error.message : "Chargement du registre impossible.")); };
    void load().catch((error) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : "Chargement du registre impossible.";
      setRegistry({ key: currentKey, entries: [], error: message });
      setEmployeeError(message);
      toast.error(message);
    });
    window.addEventListener("online", refreshOnQueueChange);
    window.addEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    return () => {
      active = false;
      window.removeEventListener("online", refreshOnQueueChange);
      window.removeEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    };
  }, [siteId, currentKey, isBicycle]);

  const visibleEmployees = useMemo(() => {
    const query = normalize(employeeQuery.trim());
    if (!query) return employees.slice(0, 8);
    return employees.filter((item) =>
      normalize(`${item.firstName} ${item.lastName} ${item.matricule} ${item.section}`).includes(query),
    ).slice(0, 8);
  }, [employees, employeeQuery]);

  const filteredEntries = useMemo(() => {
    const query = normalize(search.trim());
    return entries.filter((entry) => {
      if (!isWithinRegistryPeriod(entry.date, periodStart, periodEnd)) return false;
      if (statusFilter === "cancelled" && !entry.annuleLe) return false;
      if (statusFilter === "pending" && !entry.pendingSync) return false;
      if (statusFilter === "exited" && (entry.annuleLe || entry.pendingSync || !entry.heureSortie)) return false;
      if (statusFilter === "in-progress" && (entry.annuleLe || entry.pendingSync || entry.heureSortie)) return false;
      const person = isBicycle
        ? `${(entry as BicycleMovement).prenom} · ${(entry as BicycleMovement).matricule}`
        : (entry as MotorcycleMovement).moto;
      if (personFilter && person !== personFilter) return false;
      const values = isBicycle
        ? [
          entry.date, formatDate(entry.date), entry.heureEntree, (entry as BicycleMovement).matricule,
          (entry as BicycleMovement).prenom, (entry as BicycleMovement).section, (entry as BicycleMovement).marqueVelo,
          (entry as BicycleMovement).heureSortie || "",
        ]
        : [
          entry.date, formatDate(entry.date), entry.heureEntree, (entry as MotorcycleMovement).moto,
          (entry as MotorcycleMovement).observation, (entry as MotorcycleMovement).heureSortie || "",
        ];
      return !query || normalize(values.join(" ")).includes(query);
    });
  }, [entries, search, isBicycle, periodStart, periodEnd, statusFilter, personFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const personOptions = useMemo(() => Array.from(new Set(entries.map((entry) => isBicycle
    ? `${(entry as BicycleMovement).prenom} · ${(entry as BicycleMovement).matricule}`
    : (entry as MotorcycleMovement).moto).filter(Boolean))).sort((left, right) => left.localeCompare(right, "fr")), [entries, isBicycle]);

  const spreadsheetHeaders = isBicycle
    ? ["Date", "Heure entrée", "Matricule", "Marque vélo"]
    : ["Date", "Heure entrée", "Moto", "Observation"];
  const spreadsheetRows = filteredEntries.map((entry) => isBicycle
    ? [entry.date, entry.heureEntree, (entry as BicycleMovement).matricule, (entry as BicycleMovement).marqueVelo]
    : [entry.date, entry.heureEntree, (entry as MotorcycleMovement).moto, (entry as MotorcycleMovement).observation || ""]);

  const resetForm = () => {
    setForm(blankForm());
    setEmployee(null);
    setEmployeeQuery("");
    setEditingEntry(null);
    setShowEmployeeOptions(false);
    setFormOpen(false);
  };

  const selectEmployee = (selected: RegisterEmployeeOption) => {
    setEmployee(selected);
    setEmployeeQuery(selected.matricule);
    setShowEmployeeOptions(false);
    setEmployeeError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) {
      toast.error("Sélectionnez un site.");
      return;
    }
    if (isBicycle && !employee) {
      toast.error("Sélectionnez un employé à partir de son matricule, de son prénom ou de sa section.");
      return;
    }
    setSaving(true);
    try {
      let entry: MovementEntry;
      if (isBicycle && employee) {
        const payload = {
          date: form.date,
          heureEntree: form.heureEntree,
          matricule: employee.matricule,
          marqueVelo: form.marqueVelo.trim(),
          prenom: employee.firstName,
          section: employee.section,
          siteId,
        };
        entry = editingEntry
          ? await serviceApi.updateBicycleMovement(editingEntry.id, payload, editingEntry.updatedAt)
          : await serviceApi.createBicycleMovement(payload);
      } else if (!isBicycle) {
        const payload = {
          date: form.date,
          heureEntree: form.heureEntree,
          moto: form.moto.trim(),
          observation: form.observation.trim(),
          siteId,
        };
        entry = editingEntry
          ? await serviceApi.updateMotorcycleMovement(editingEntry.id, payload, editingEntry.updatedAt)
          : await serviceApi.createMotorcycleMovement(payload);
      } else {
        return;
      }
      const wasEditing = Boolean(editingEntry);
      setRegistry((current) => ({
        key: currentKey,
        error: "",
        entries: current.key === currentKey
          ? wasEditing
            ? current.entries.map((item) => item.id === entry.id ? entry : item)
            : [entry, ...current.entries]
          : [entry],
      }));
      setPage(1);
      resetForm();
      toast.success(entry.pendingSync
        ? "Mouvement enregistré localement. Synchronisation au retour du réseau."
        : wasEditing ? "Mouvement modifié." : "Mouvement enregistré.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: MovementEntry) => {
    setEditingEntry(entry);
    setFormOpen(true);
    if (isBicycle) {
      const bicycle = entry as BicycleMovement;
      setForm({
        ...blankForm(),
        date: bicycle.date.slice(0, 10),
        heureEntree: bicycle.heureEntree,
        matricule: bicycle.matricule,
        marqueVelo: bicycle.marqueVelo,
      });
      const matched = employees.find((item) => item.matricule.toLocaleUpperCase() === bicycle.matricule.toLocaleUpperCase());
      selectEmployee(matched ?? {
        id: "",
        firstName: bicycle.prenom,
        lastName: "",
        matricule: bicycle.matricule,
        section: bicycle.section,
      });
    } else {
      const motorcycle = entry as MotorcycleMovement;
      setForm({
        ...blankForm(),
        date: motorcycle.date.slice(0, 10),
        heureEntree: motorcycle.heureEntree,
        moto: motorcycle.moto,
        observation: motorcycle.observation,
      });
    }
  };

  const importMovements = async (file?: File) => {
    if (!file) return;
    if (!siteId) { toast.error("Sélectionnez un site avant l’importation."); return; }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalizeHeader = (value: unknown) => normalize(String(value ?? "").trim()).replace(/[^a-z0-9]/g, "");
      const headers = (sheet[0] || []).map(normalizeHeader);
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias)));
      const cols = isBicycle
        ? { date: column("Date"), time: column("Heure entrée", "Heure d’entrée", "Heure"), matricule: column("Matricule", "Employé"), vehicle: column("Marque vélo", "Vélo", "Marque"), observation: -1 }
        : { date: column("Date"), time: column("Heure entrée", "Heure d’entrée", "Heure"), matricule: -1, vehicle: column("Moto"), observation: column("Observation", "Remarque") };
      const required = isBicycle ? [cols.date, cols.time, cols.matricule, cols.vehicle] : [cols.date, cols.time, cols.vehicle];
      if (required.some((index) => index < 0)) throw new Error("Colonnes requises manquantes. Téléchargez le modèle Excel de ce registre.");
      const get = (cells: string[], index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
      const parseDate = (value: string) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const french = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(value);
        if (french) return `${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`;
        const serial = Number(value);
        return Number.isFinite(serial) && serial > 20000 && serial < 80000 ? new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10) : "";
      };
      const parseTime = (value: string) => {
        const time = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
        if (time) return `${time[1].padStart(2, "0")}:${time[2]}`;
        const fraction = Number(value);
        if (Number.isFinite(fraction) && fraction >= 0 && fraction < 1) {
          const minutes = Math.round(fraction * 24 * 60);
          return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        }
        return "";
      };
      const rows = sheet.slice(1).map((cells, index) => ({
        line: index + 2, date: parseDate(get(cells, cols.date)), time: parseTime(get(cells, cols.time)),
        matricule: get(cells, cols.matricule), vehicle: get(cells, cols.vehicle), observation: get(cells, cols.observation),
      })).filter((row) => row.date || row.matricule || row.vehicle || row.observation);
      if (!rows.length) throw new Error("Le fichier ne contient aucune ligne à importer.");
      const created: MovementEntry[] = [];
      const failures: string[] = [];
      for (const row of rows) {
        const matchedEmployee = isBicycle ? employees.find((item) => item.matricule.toLocaleUpperCase() === row.matricule.toLocaleUpperCase()) : null;
        if (!row.date || !row.time || !row.vehicle || (isBicycle && !matchedEmployee)) {
          failures.push(`Ligne ${row.line} : date, heure, ${isBicycle ? "matricule connu" : "moto"} et informations requises.`);
          continue;
        }
        try {
          const entry = isBicycle
            ? await serviceApi.createBicycleMovement({ date: row.date, heureEntree: row.time, matricule: matchedEmployee!.matricule, marqueVelo: row.vehicle, prenom: matchedEmployee!.firstName, section: matchedEmployee!.section, siteId })
            : await serviceApi.createMotorcycleMovement({ date: row.date, heureEntree: row.time, moto: row.vehicle, observation: row.observation, siteId });
          created.push(entry);
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
        }
      }
      if (created.length) {
        setRegistry((current) => ({ key: currentKey, error: "", entries: [...created.reverse(), ...(current.key === currentKey ? current.entries : [])] }));
        setPage(1);
      }
      if (failures.length) toast.warning(`${created.length} ligne(s) importée(s), ${failures.length} ignorée(s). ${failures.slice(0, 2).join(" ")}`);
      else toast.success(`${created.length} mouvement(s) importé(s).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Importation impossible.");
    } finally {
      setImporting(false);
    }
  };

  const deleteEntry = async (entry: MovementEntry) => {
    if (!siteId || entry.annuleLe || !(await confirmDeletion("Annuler ce mouvement ? Il restera dans l’historique."))) return;
    setDeletingId(entry.id);
    try {
      const result = isBicycle
        ? await serviceApi.deleteBicycleMovement(entry.id, siteId, entry.updatedAt)
        : await serviceApi.deleteMotorcycleMovement(entry.id, siteId, entry.updatedAt);
      const cancelledAt = new Date().toISOString();
      setRegistry((current) => ({ ...current, entries: current.entries.map((item) => item.id === entry.id ? { ...item, annuleLe: cancelledAt, pendingSync: result.pendingSync } : item) }));
      if (editingEntry?.id === entry.id) resetForm();
      toast.success(result.pendingSync ? "Annulation enregistrée localement. Synchronisation au retour du réseau." : "Mouvement annulé et conservé dans l’historique.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const recordExit = async (entry: MotorcycleMovement) => {
    if (!siteId || entry.heureSortie) return;
    setExitingId(entry.id);
    try {
      const updated = await serviceApi.recordMotorcycleExit(entry.id, siteId, entry.updatedAt);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.map((item) => item.id === updated.id ? updated : item),
      }));
      toast.success(updated.pendingSync ? "Sortie enregistrée localement. Synchronisation au retour du réseau." : `Sortie enregistrée à ${updated.heureSortie || "l’heure actuelle"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de la sortie impossible.");
    } finally {
      setExitingId(null);
    }
  };

  const recordBicycleExit = async (entry: BicycleMovement) => {
    if (!siteId || entry.heureSortie) return;
    setExitingId(entry.id);
    try {
      const updated = await serviceApi.recordBicycleExit(entry.id, siteId, entry.updatedAt);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.map((item) => item.id === updated.id ? updated : item),
      }));
      toast.success(updated.pendingSync ? "Sortie enregistrée localement. Synchronisation au retour du réseau." : `Sortie enregistrée à ${updated.heureSortie || "l’heure actuelle"}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de la sortie impossible.");
    } finally {
      setExitingId(null);
    }
  };

  const printEntry = (entry: MovementEntry) => {
    const rows: [string, string][] = [
      ["Date", formatDate(entry.date)],
      ["Heure d’entrée", entry.heureEntree || "—"],
    ];
    if (isBicycle) {
      const bicycle = entry as BicycleMovement;
      rows.push(
        ["Matricule", bicycle.matricule || "—"],
        ["Prénom", bicycle.prenom || "—"],
        ["Section", bicycle.section || "—"],
        ["Marque vélo", bicycle.marqueVelo || "—"],
        ["Heure de sortie", bicycle.heureSortie || "—"],
      );
    } else {
      const motorcycle = entry as MotorcycleMovement;
      rows.push(
        ["Moto", motorcycle.moto || "—"],
        ["Observation", motorcycle.observation || "—"],
        ["Heure de sortie", motorcycle.heureSortie || "—"],
      );
    }
    printRecord(title, siteName, rows);
  };

  const printHistory = () => {
    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer l’historique.");
      return;
    }

    const headings = isBicycle
      ? ["Date", "Heure d’entrée", "Matricule", "Prénom", "Section", "Marque vélo", "Heure de sortie"]
      : ["Date", "Heure d’entrée", "Moto", "Observation", "Heure de sortie"];
    const tableRows = filteredEntries.map((entry) => {
      const values = isBicycle
        ? (() => {
          const bicycle = entry as BicycleMovement;
          return [
            formatDate(bicycle.date),
            bicycle.heureEntree || "—",
            bicycle.matricule || "—",
            bicycle.prenom || "—",
            bicycle.section || "—",
            bicycle.marqueVelo || "—",
            bicycle.heureSortie || "—",
          ];
        })()
        : (() => {
          const motorcycle = entry as MotorcycleMovement;
          return [
            formatDate(motorcycle.date),
            motorcycle.heureEntree || "—",
            motorcycle.moto || "—",
            motorcycle.observation || "—",
            motorcycle.heureSortie || "—",
          ];
        })();
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
            body { color: #172033; font: 14px Arial, sans-serif; }
            h1 { margin: 0 0 6px; font-size: 21px; }
            .site { margin: 0 0 20px; color: #526078; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border: 1px solid #d6dbe4; text-align: left; vertical-align: top; }
            th { background: #edf1f5; font-size: 11px; text-transform: uppercase; }
            td { white-space: pre-wrap; overflow-wrap: anywhere; }
            tr { break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p class="site">Site : ${escapeHtml(siteName || "—")} · Impression du ${escapeHtml(new Date().toLocaleDateString("fr-FR"))} · ${filteredEntries.length} mouvement(s)</p>
          <table>
            <thead><tr>${headings.map((heading) => `<th>${escapeHtml(heading)}</th>`).join("")}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <div className="courrier-module two-wheel-module space-y-4">
      <header className="courrier-hero">
        <div className="courrier-hero-icon"><Truck aria-hidden="true" /></div>
        <div className="courrier-hero-copy">
          <h1>{isBicycle ? "Mouvements des vélos" : "Mouvements des motos"}</h1>
          <p>{isBicycle ? "Enregistrez et suivez les entrées et sorties de vélos par employé" : "Enregistrez et suivez les entrées et sorties des motos"}</p>
        </div>
      </header>
      {loadError && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{loadError}</p>}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="two-wheel-entry-dialog">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Modifier un mouvement" : `Nouvelle entrée ${isBicycle ? "vélo" : "moto"}`}</DialogTitle>
            <DialogDescription>Renseignez le mouvement et les informations associées au site sélectionné.</DialogDescription>
          </DialogHeader>
      <Panel title={editingEntry ? "Modifier un mouvement" : `Nouvelle entrée ${isBicycle ? "vélo" : "moto"}`}>
        <form className="two-wheel-form space-y-5" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${kind}-date`}>Date</Label>
              <Input id={`${kind}-date`} type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${kind}-entry-time`}>Heure d’entrée</Label>
              <Input id={`${kind}-entry-time`} type="time" required value={form.heureEntree} onChange={(event) => setForm({ ...form, heureEntree: event.target.value })} />
            </div>
            {isBicycle ? <>
              <div className="relative space-y-1.5">
                <Label htmlFor="velo-employee">Matricule / prénom / section</Label>
                <Input
                  id="velo-employee"
                  required
                  autoComplete="off"
                  placeholder="Rechercher un matricule, prénom ou section…"
                  value={employeeQuery}
                  onFocus={() => setShowEmployeeOptions(Boolean(employeeQuery.trim()))}
                  onChange={(event) => {
                    setEmployeeQuery(event.target.value);
                    setEmployee(null);
                    setEmployeeError("");
                    setShowEmployeeOptions(Boolean(event.target.value.trim()));
                  }}
                  onBlur={() => window.setTimeout(() => setShowEmployeeOptions(false), 120)}
                />
                {showEmployeeOptions && <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
                  {visibleEmployees.length ? visibleEmployees.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectEmployee(item)}
                    >
                      <span className="block font-medium">{item.matricule} · {item.firstName} {item.lastName}</span>
                      <span className="text-xs text-muted-foreground">Section : {item.section || "—"}</span>
                    </button>
                  )) : <p className="px-3 py-2 text-sm text-muted-foreground">{employeeError || "Aucun employé trouvé."}</p>}
                </div>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="velo-first-name">Prénom</Label>
                <Input id="velo-first-name" readOnly required value={employee?.firstName || ""} placeholder="Rempli depuis l’employé sélectionné" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="velo-section">Section</Label>
                <Input id="velo-section" readOnly required value={employee?.section || ""} placeholder="Remplie depuis l’employé sélectionné" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="velo-brand">Marque du vélo</Label>
                <Input id="velo-brand" required maxLength={255} placeholder="Ex. VTT rouge" value={form.marqueVelo} onChange={(event) => setForm({ ...form, marqueVelo: event.target.value })} />
              </div>
            </> : <>
              <div className="space-y-1.5">
                <Label htmlFor="moto-name">Moto</Label>
                <Input id="moto-name" required maxLength={255} placeholder="Ex. scooter blanc" value={form.moto} onChange={(event) => setForm({ ...form, moto: event.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="moto-observation">Observation</Label>
                <Input id="moto-observation" maxLength={5000} placeholder="Ex. casque noir" value={form.observation} onChange={(event) => setForm({ ...form, observation: event.target.value })} />
              </div>
            </>}
          </div>
          {!siteId && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un mouvement.</p>}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 size-4" />Fermer</Button>
            <Button type="submit" disabled={saving || !siteId || (isBicycle && !employee)}>
              {editingEntry ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
              {saving ? "Enregistrement…" : editingEntry ? "Enregistrer les modifications" : "Enregistrer l’entrée"}
            </Button>
          </div>
        </form>
      </Panel>
          </DialogContent>
        </Dialog>

        <section className="courrier-history two-wheel-registry">
          <div className="courrier-history-toolbar">
            <h2 className="courrier-panel-heading">{isBicycle ? "Historique des vélos" : "Historique des motos"}</h2>
            <div className="courrier-history-actions courrier-registry-screen">
              <Button type="button" onClick={() => { resetForm(); setFormOpen(true); }} disabled={!siteId}>
                <Plus aria-hidden="true" />Nouvelle entrée
              </Button>
              <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={() => exportXlsx(`${isBicycle ? "mouvements-velos" : "mouvements-motos"}-${today()}.xlsx`, title, spreadsheetHeaders, spreadsheetRows)}>
                <Download aria-hidden="true" />Exporter Excel
              </Button>
              <Button type="button" variant="outline" onClick={() => exportXlsx(`modele-${isBicycle ? "mouvements-velos" : "mouvements-motos"}.xlsx`, title, spreadsheetHeaders, [])}>
                <FileDown aria-hidden="true" />Télécharger modèle
              </Button>
              <label className={`courrier-import-button ${!siteId || loading || importing ? "pointer-events-none opacity-50" : ""}`}>
                <FileUp aria-hidden="true" />{importing ? "Importation…" : "Importer"}
                <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!siteId || loading || importing} onChange={(event) => { void importMovements(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              </label>
              <Button type="button" variant="outline" disabled={loading || !filteredEntries.length} onClick={printHistory}>
                <Printer aria-hidden="true" />Imprimer les lignes
              </Button>
            </div>
          </div>
          <div className="courrier-filter-grid two-wheel-filter-grid courrier-registry-screen">
            <label className="courrier-filter-field">
              <span><CalendarDays aria-hidden="true" />Période</span>
              <div className="courrier-date-range">
                <Input aria-label="Date de début" type="date" max={periodEnd || undefined} value={periodStart} onChange={(event) => { setPeriodStart(event.target.value); setPage(1); }} />
                <span aria-hidden="true">–</span>
                <Input aria-label="Date de fin" type="date" min={periodStart || undefined} value={periodEnd} onChange={(event) => { setPeriodEnd(event.target.value); setPage(1); }} />
              </div>
            </label>
            <label className="courrier-filter-field">
              <span><UserRound aria-hidden="true" />{isBicycle ? "Personne" : "Moto"}</span>
              <select value={personFilter} onChange={(event) => { setPersonFilter(event.target.value); setPage(1); }}>
                <option value="">{isBicycle ? "Toutes les personnes" : "Toutes les motos"}</option>
                {personOptions.map((person) => <option key={person} value={person}>{person}</option>)}
              </select>
            </label>
            <div className="courrier-filter-field courrier-filter-site">
              <span><MapPin aria-hidden="true" />Site</span>
              <SitePicker id={`${kind}-movement-site`} value={siteName} type={site?.type || "USINE"} sites={sites} canCreate={canCreateSite} onAdd={addSite} onChange={(name) => { setSelectedSiteName(name); resetForm(); setPage(1); }} />
            </div>
            <label className="courrier-filter-field">
              <span><CheckCircle2 aria-hidden="true" />Statut</span>
              <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
                <option value="all">Tous</option>
                <option value="in-progress">En circulation</option>
                <option value="exited">Sortie effectuée</option>
                <option value="cancelled">Annulé</option>
                <option value="pending">En attente de synchronisation</option>
              </select>
            </label>
            <label className="courrier-filter-field courrier-filter-search">
              <span><Search aria-hidden="true" />Recherche</span>
              <Input aria-label={`Rechercher dans ${title}`} placeholder={isBicycle ? "Prénom, matricule, vélo…" : "Moto, observation…"} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            </label>
          </div>
          {siteError && <p role="alert" className="text-sm text-destructive">{siteError}</p>}
          {employeeError && isBicycle && !formOpen && <p role="alert" className="text-sm text-destructive">{employeeError}</p>}
          <div className="courrier-results-summary courrier-registry-screen">
            <p><CheckCircle2 aria-hidden="true" />{filteredEntries.length} mouvement(s) trouvé(s)</p>
            <label>Afficher
              <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
                <option value={10}>10 lignes</option><option value={25}>25 lignes</option><option value={50}>50 lignes</option><option value={100}>100 lignes</option>
              </select>
            </label>
          </div>
          {!siteId ? <Empty text="Sélectionnez un site pour consulter le registre." />
            : loading ? <Empty text="Chargement du registre…" />
              : loadError ? <p className="py-6 text-center text-sm text-destructive">{loadError}</p>
                : <div className="overflow-auto rounded-lg courrier-registry-screen">
                    <table className="courrier-table courrier-history-table two-wheel-table w-full border-collapse text-left text-sm">
                      <thead>
                        <tr>{(isBicycle
                          ? ["N°", "Date", "Heure d’entrée", "Matricule", "Prénom", "Section", "Marque vélo", "Heure de sortie", "Statut", "Action"]
                          : ["N°", "Date", "Heure d’entrée", "Moto", "Observation", "Heure de sortie", "Statut", "Action"]
                        ).map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y">
                        {pageEntries.map((entry, index) => {
                          const status = entry.pendingSync ? "pending" : entry.annuleLe ? "cancelled" : entry.heureSortie ? "exited" : "in-progress";
                          const statusLabel = status === "pending"
                            ? entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"
                            : status === "cancelled" ? "Annulé" : status === "exited" ? `Sortie · ${entry.heureSortie}` : "En circulation";
                          return <tr key={entry.id} className={`courrier-table-row courrier-table-row--${status}`}>
                          <td>{(currentPage - 1) * pageSize + index + 1}</td>
                          <td className={`whitespace-nowrap ${entry.annuleLe ? "line-through" : ""}`}>{formatDate(entry.date)}</td>
                          <td className="whitespace-nowrap">{entry.heureEntree}</td>
                          {isBicycle ? <>
                            <td>{(entry as BicycleMovement).matricule}</td>
                            <td className="font-medium">{(entry as BicycleMovement).prenom}</td>
                            <td>{(entry as BicycleMovement).section}</td>
                            <td>{(entry as BicycleMovement).marqueVelo}</td>
                            <td className="whitespace-nowrap">{(entry as BicycleMovement).heureSortie || "—"}</td>
                          </> : <>
                            <td className="font-medium">{(entry as MotorcycleMovement).moto}</td>
                            <td className="whitespace-pre-wrap">{(entry as MotorcycleMovement).observation || "—"}</td>
                            <td className="whitespace-nowrap">{(entry as MotorcycleMovement).heureSortie || "—"}</td>
                          </>}
                          <td><span className={`courrier-status courrier-status--${status}`}>{statusLabel}</span></td>
                          <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Button type="button" size="icon" variant="ghost" aria-label="Imprimer le mouvement" title="Imprimer le mouvement" onClick={() => printEntry(entry)}>
                              <Printer className="size-4" />
                            </Button>
                            {!entry.annuleLe && !entry.pendingSync && isBicycle && !(entry as BicycleMovement).heureSortie && <Button type="button" size="sm" variant="outline" disabled={exitingId === entry.id} onClick={() => void recordBicycleExit(entry as BicycleMovement)}>
                              <LogOut className="mr-1 size-4" />{exitingId === entry.id ? "Sortie…" : "Sortir"}
                            </Button>}
                            {!entry.annuleLe && !entry.pendingSync && !isBicycle && !(entry as MotorcycleMovement).heureSortie && <Button type="button" size="sm" variant="outline" disabled={exitingId === entry.id} onClick={() => void recordExit(entry as MotorcycleMovement)}>
                              <LogOut className="mr-1 size-4" />{exitingId === entry.id ? "Sortie…" : "Sortir"}
                            </Button>}
                            {!entry.annuleLe && !entry.pendingSync && <Button type="button" size="icon" variant="ghost" aria-label="Modifier le mouvement" title="Modifier" onClick={() => editEntry(entry)}><Pencil className="size-4" /></Button>}
                            {!entry.annuleLe && !entry.pendingSync && <Button type="button" size="icon" variant="ghost" aria-label="Annuler le mouvement" title="Annuler" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}><Trash2 className="size-4 text-destructive" /></Button>}
                            {!entry.pendingSync && <RegistryAuditHistory entity={isBicycle ? "mouvement_velo" : "mouvement_moto"} recordId={entry.id} />}
                            {!entry.pendingSync && <RegistryAttachments entity={isBicycle ? "mouvement_velo" : "mouvement_moto"} recordId={entry.id} siteId={siteId} />}
                          </div>
                        </td>
                      </tr>;
                      })}
                      {!pageEntries.length && <tr><td colSpan={isBicycle ? 10 : 8} className="courrier-empty-row">{entries.length ? "Aucun résultat pour ces filtres." : "Aucun mouvement enregistré pour ce site."}</td></tr>}
                    </tbody>
                  </table>
                </div>}
        <div className="courrier-pagination courrier-registry-screen">
          <span>Affichage de {filteredEntries.length ? (currentPage - 1) * pageSize + 1 : 0} à {Math.min(currentPage * pageSize, filteredEntries.length)} sur {filteredEntries.length}</span>
          <div>
            <Button type="button" variant="outline" size="icon" aria-label="Page précédente" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="size-4" /></Button>
            <Button type="button" className="courrier-page-number">{currentPage}</Button>
            <Button type="button" variant="outline" size="icon" aria-label="Page suivante" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
