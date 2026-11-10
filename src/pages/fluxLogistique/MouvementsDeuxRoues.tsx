import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRecord } from "@/lib/printRecord";
import { isWithinRegistryPeriod, RegistryPeriodExport, type RegistryColumn } from "@/components/RegistryPeriodExport";
import { RegistryAuditHistory } from "@/components/RegistryAuditHistory";
import { RegistryAttachments } from "@/components/RegistryAttachments";
import {
  serviceApi,
  type BicycleMovement,
  type MotorcycleMovement,
  type RegisterEmployeeOption,
} from "@/lib/service-api";
import { Download, FileDown, FileUp, LogOut, Pencil, Plus, Printer, Search, Trash2, X } from "lucide-react";
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
  }, [entries, search, isBicycle, periodStart, periodEnd]);

  const exportColumns: RegistryColumn<MovementEntry>[] = isBicycle
    ? [
      { label: "Date", value: (row) => row.date }, { label: "Heure entrée", value: (row) => row.heureEntree },
      { label: "Matricule", value: (row) => (row as BicycleMovement).matricule }, { label: "Prénom", value: (row) => (row as BicycleMovement).prenom },
      { label: "Section", value: (row) => (row as BicycleMovement).section }, { label: "Vélo", value: (row) => (row as BicycleMovement).marqueVelo },
      { label: "Heure sortie", value: (row) => (row as BicycleMovement).heureSortie }, { label: "Annulé le", value: (row) => (row as BicycleMovement).annuleLe },
    ]
    : [
      { label: "Date", value: (row) => row.date }, { label: "Heure entrée", value: (row) => row.heureEntree },
      { label: "Moto", value: (row) => (row as MotorcycleMovement).moto }, { label: "Observation", value: (row) => (row as MotorcycleMovement).observation },
      { label: "Heure sortie", value: (row) => (row as MotorcycleMovement).heureSortie }, { label: "Annulé le", value: (row) => (row as MotorcycleMovement).annuleLe },
    ];
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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      if (created.length) setRegistry((current) => ({ key: currentKey, error: "", entries: [...created.reverse(), ...(current.key === currentKey ? current.entries : [])] }));
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
    const tableRows = entries.map((entry) => {
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
          <p class="site">Site : ${escapeHtml(siteName || "—")}</p>
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
    <div className="two-wheel-module space-y-5">
      <PageHeader title={title} subtitle={isBicycle
        ? "Enregistrement des entrées de vélos par employé."
        : "Enregistrement des entrées et sorties de motos."}
        action={<Button type="button" disabled={!siteId} onClick={() => { resetForm(); setFormOpen(true); }}><Plus className="mr-2 size-4" />Nouvelle entrée</Button>} />
      <div className="max-w-xl">
        <SitePicker
          id={`${kind}-movement-site`}
          value={siteName}
          type={site?.type || "USINE"}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name) => {
            setSelectedSiteName(name);
            resetForm();
          }}
        />
        {siteError && <p className="mt-2 text-sm text-destructive">{siteError}</p>}
      </div>

      <div className={`two-wheel-entry-shell ${formOpen ? "is-open" : ""}`} aria-hidden={!formOpen} role={formOpen ? "dialog" : undefined} aria-modal={formOpen ? true : undefined} aria-label={editingEntry ? "Modifier un mouvement" : `Nouvelle entrée ${isBicycle ? "vélo" : "moto"}`}>
      <button type="button" className="two-wheel-modal-close" aria-label="Fermer le formulaire" onClick={() => setFormOpen(false)}>×</button>
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
            {editingEntry && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 size-4" />Annuler</Button>}
            <Button type="submit" disabled={saving || !siteId || (isBicycle && !employee)}>
              {editingEntry ? <Pencil className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
              {saving ? "Enregistrement…" : editingEntry ? "Enregistrer les modifications" : "Enregistrer l’entrée"}
            </Button>
          </div>
        </form>
      </Panel>
      </div>

      <div className="two-wheel-registry">
      <Panel title={`Historique ${isBicycle ? "des vélos" : "des motos"} (${filteredEntries.length})`}>
        <div className="two-wheel-toolbar mb-4 flex flex-wrap items-end gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input aria-label={`Rechercher dans ${title}`} placeholder="Rechercher dans le registre…" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="two-wheel-actions">
            <label className={`two-wheel-import ${!siteId || loading || importing ? "is-disabled" : ""}`}>
              <FileUp className="size-4" />{importing ? "Importation…" : "Importer Excel / CSV"}
              <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!siteId || loading || importing} onChange={(event) => { void importMovements(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <Button type="button" variant="outline" onClick={() => exportXlsx(`modele-${isBicycle ? "mouvements-velos" : "mouvements-motos"}.xlsx`, title, spreadsheetHeaders, [])}>
              <FileDown className="mr-2 size-4" />Modèle Excel
            </Button>
            <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={() => exportXlsx(`${isBicycle ? "mouvements-velos" : "mouvements-motos"}-${today()}.xlsx`, title, spreadsheetHeaders, spreadsheetRows)}>
              <Download className="mr-2 size-4" />Exporter Excel
            </Button>
          </div>
          <RegistryPeriodExport from={periodStart} to={periodEnd} onFromChange={setPeriodStart} onToChange={setPeriodEnd} records={filteredEntries} columns={exportColumns} filename={isBicycle ? "mouvements-velos" : "mouvements-motos"} />
          <Button type="button" variant="outline" disabled={loading || !entries.length} onClick={printHistory}>
            <Printer className="mr-2 size-4" />
            Imprimer tout l’historique
          </Button>
        </div>
        {!siteId ? <Empty text="Sélectionnez un site pour consulter le registre." />
          : loading ? <Empty text="Chargement du registre…" />
            : loadError ? <p className="py-6 text-center text-sm text-destructive">{loadError}</p>
              : !entries.length ? <Empty text="Aucun mouvement enregistré pour ce site." />
              : <div className="two-wheel-table-wrap overflow-x-auto rounded-lg border">
                  <table className="two-wheel-table w-full min-w-[760px] text-left text-sm">
                    <thead className="two-wheel-table-head bg-muted/70 text-xs uppercase text-muted-foreground">
                      <tr>{(isBicycle
                        ? ["Date", "Heure d’entrée", "Matricule", "Prénom", "Section", "Marque vélo", "Heure de sortie", "Actions"]
                        : ["Date", "Heure d’entrée", "Moto", "Observation", "Heure de sortie", "Actions"]
                      ).map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredEntries.map((entry) => <tr key={entry.id} className="two-wheel-table-row align-top hover:bg-muted/30">
                        <td className={`whitespace-nowrap px-3 py-3 ${entry.annuleLe ? "text-muted-foreground line-through" : ""}`}>{formatDate(entry.date)}{entry.annuleLe && <span className="ml-1 text-destructive no-underline">(annulé)</span>}{entry.pendingSync && <span className="mt-1 block text-xs text-amber-700" title={entry.pendingSyncError || undefined}>{entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"}</span>}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureEntree}</td>
                        {isBicycle ? <>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{(entry as BicycleMovement).matricule}</td>
                          <td className="px-3 py-3">{(entry as BicycleMovement).prenom}</td>
                          <td className="px-3 py-3">{(entry as BicycleMovement).section}</td>
                          <td className="px-3 py-3">{(entry as BicycleMovement).marqueVelo}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{(entry as BicycleMovement).heureSortie || "—"}</td>
                        </> : <>
                          <td className="px-3 py-3">{(entry as MotorcycleMovement).moto}</td>
                          <td className="whitespace-pre-wrap px-3 py-3">{(entry as MotorcycleMovement).observation || "—"}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{(entry as MotorcycleMovement).heureSortie || "—"}</td>
                        </>}
                        <td className="whitespace-nowrap px-3 py-3">
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
                      </tr>)}
                      {!filteredEntries.length && <tr><td colSpan={isBicycle ? 8 : 6} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun résultat pour cette recherche.</td></tr>}
                    </tbody>
                  </table>
                </div>}
      </Panel>
      </div>
    </div>
  );
}
