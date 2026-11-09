import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { serviceApi, type KeyTrackingEntry, type RegisterEmployeeOption } from "@/lib/service-api";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown, Download, FileDown, FileUp, MapPin, Plus, Printer, Search, Trash2, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface SearchOption {
  value: string;
  label: string;
  searchTerms: string[];
}

function SearchableSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled = false,
  onChange,
}: {
  value: string;
  options: SearchOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredOptions = options.filter((option) => !normalizedSearch || option.searchTerms.some((term) =>
    term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().startsWith(normalizedSearch),
  ));

  return (
    <Popover open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) setSearch("");
    }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between px-3 font-normal"
        >
          <span className="truncate">{options.find((option) => option.value === value)?.label ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {filteredOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <Check className={`h-4 w-4 ${value === option.value ? "opacity-100" : "opacity-0"}`} />
                <span className="truncate">{option.label}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const dateActuelle = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const normaliserRecherche = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

const formaterDate = (value: string) => {
  const datePart = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return "—";
  const parsed = new Date(`${datePart}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== datePart) return "—";
  return parsed.toLocaleDateString("fr-FR", { timeZone: "UTC" });
};

const heureActuelle = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });
interface KeyDraft {
  id: string;
  date: string;
  employeeId: string;
  personName: string;
  matricule: string;
  keyType: string;
  quantity: string;
  lieu: string;
}
const nouvelleLigne = (): KeyDraft => ({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, date: dateActuelle(), employeeId: "", personName: "", matricule: "", keyType: "", quantity: "1", lieu: "" });

interface KeySiteOption {
  id: string;
  name: string;
}

export default function GestionClesPanel({
  siteId = "",
  sites = [],
  onSiteChange,
  siteError,
}: {
  siteId?: string;
  sites?: KeySiteOption[];
  onSiteChange?: (siteId: string) => void;
  siteError?: string;
}) {
  const [draftRows, setDraftRows] = useState<KeyDraft[]>(() => [nouvelleLigne()]);
  const [currentTime, setCurrentTime] = useState(heureActuelle);
  const [keyTypes, setKeyTypes] = useState<string[]>([]);
  const [siteEmployees, setSiteEmployees] = useState<RegisterEmployeeOption[]>([]);
  const [siteEmployeesFor, setSiteEmployeesFor] = useState("");
  const [entries, setEntries] = useState<KeyTrackingEntry[]>([]);
  const [entriesForSite, setEntriesForSite] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [returningEntryId, setReturningEntryId] = useState<string | number | null>(null);
  const [returnDialogEntry, setReturnDialogEntry] = useState<KeyTrackingEntry | null>(null);
  const [returnerChoice, setReturnerChoice] = useState<"" | "other" | "not-returned">("");
  const [returnerEmployeeId, setReturnerEmployeeId] = useState("");
  const [notReturnedObservation, setNotReturnedObservation] = useState("");
  const [savingObservation, setSavingObservation] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(heureActuelle()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    serviceApi.listKeyTypes()
      .then((types) => { if (active) setKeyTypes(types); })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement des types de clés impossible."));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    const refreshEntries = () => serviceApi.listKeyTracking(siteId)
      .then((rows) => {
        if (active) {
          setEntries(rows);
          setEntriesForSite(siteId);
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement du suivi des clés impossible."));
    const refreshOnQueueChange = () => { void refreshEntries(); };
    void refreshEntries();
    window.addEventListener("online", refreshOnQueueChange);
    window.addEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    return () => {
      active = false;
      window.removeEventListener("online", refreshOnQueueChange);
      window.removeEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    };
  }, [siteId]);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    setSiteEmployees([]);
    setSiteEmployeesFor("");
    serviceApi.listRegisterEmployees(siteId)
      .then((rows) => {
        if (active) {
          setSiteEmployees(rows);
          setSiteEmployeesFor(siteId);
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement des employés du site impossible."));
    return () => { active = false; };
  }, [siteId]);

  const handleSubmit = async (draft: KeyDraft) => {
    if (!siteId || savingRowId) return;
    setSavingRowId(draft.id);
    try {
      const employee = availableEmployees.find((item) => item.id === draft.employeeId);
      if (!draft.date) throw new Error("Saisissez la date de sortie.");
      if (!draft.personName.trim()) throw new Error("Saisissez le nom de la personne.");
      if (!draft.keyType) throw new Error("Sélectionnez un type de clé.");
      if (!draft.lieu.trim()) throw new Error("Indiquez le lieu de sortie.");
      const quantity = Number(draft.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10000) throw new Error("Le nombre de clés doit être compris entre 1 et 10 000.");
      const parts = draft.personName.trim().split(/\s+/);
      await serviceApi.createKeyTracking({
        date: draft.date,
        employeeId: employee?.id || "",
        keyType: draft.keyType,
        quantity,
        lieu: draft.lieu.trim(),
        lastName: employee?.lastName || parts[0],
        firstName: employee?.firstName || parts.slice(1).join(" "),
        matricule: employee?.matricule || draft.matricule.trim(),
        departureTime: heureActuelle(),
        siteId,
      });
      toast.success("Sortie de clé enregistrée.");
      setDraftRows((current) => {
        const remaining = current.filter((row) => row.id !== draft.id);
        return remaining.length ? remaining : [nouvelleLigne()];
      });
      const rows = await serviceApi.listKeyTracking(siteId);
      setEntries(rows);
      setEntriesForSite(siteId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de la sortie impossible.");
    } finally {
      setSavingRowId(null);
    }
  };
  const handleImport = async (file?: File) => {
    if (!file) return;
    if (!siteId) { toast.error("Sélectionnez un site avant l'importation."); return; }
    if (!keyTypes.length) { toast.error("Attendez le chargement des types de clés avant l'importation."); return; }
    if (siteEmployeesFor !== siteId) { toast.error("Attendez le chargement des employés du site avant l'importation."); return; }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalize = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
      const headers = (sheet[0] || []).map(normalize);
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.includes(header));
      const col = {
        date: column("date", "date sortie"), time: column("heure", "heure sortie", "heure de sortie"),
        fullName: column("nom et prenom", "nom prenom", "personne"), lastName: column("nom", "nom de famille"),
        firstName: column("prenom", "prenom"), matricule: column("matricule"),
        keyType: column("type de cle", "type cle", "cle", "trousse cle"),
        quantity: column("nombre", "nombre de cles", "quantite", "quantite de cles"), lieu: column("lieu", "lieu de sortie"),
        observations: column("observation", "observations"), returnDate: column("date retour", "date de retour"),
        returnTime: column("heure retour", "heure de retour"), returner: column("personne qui a rendu", "personne qui rend", "retourneur"),
        returnerMatricule: column("matricule du retour", "matricule retourneur", "matricule retour"), status: column("statut", "etat"),
      };
      if ((col.fullName < 0 && col.lastName < 0) || col.keyType < 0 || col.quantity < 0 || col.lieu < 0) {
        throw new Error("Colonnes requises manquantes : Nom, Type de clé, Nombre et Lieu.");
      }
      const excelDate = (value: string) => {
        const text = value.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
        const fr = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(text);
        if (fr) return `${fr[3]}-${fr[2].padStart(2,"0")}-${fr[1].padStart(2,"0")}`;
        const serial = Number(text);
        if (Number.isFinite(serial) && serial > 20000 && serial < 80000) return new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10);
        return "";
      };
      const excelTime = (value: string) => {
        const text = value.trim();
        if (!text) return "";
        const serial = Number(text);
        if (Number.isFinite(serial) && serial >= 0 && serial < 1) {
          const minutes = Math.round(serial * 24 * 60);
          return `${String(Math.floor(minutes / 60) % 24).padStart(2,"0")}:${String(minutes % 60).padStart(2,"0")}`;
        }
        const match = /^(\d{1,2}):(\d{2})/.exec(text);
        return match ? `${match[1].padStart(2,"0")}:${match[2]}` : "";
      };
      const data = sheet.slice(1).map((cells, index) => {
        const get = (index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
        const fullName = get(col.fullName) || [get(col.lastName), get(col.firstName)].filter(Boolean).join(" ");
        const employee = availableEmployees.find((item) => normalize(`${item.lastName} ${item.firstName}`) === normalize(fullName));
        const keyTypeValue = keyTypes.find((item) => normalize(item) === normalize(get(col.keyType)));
        return {
          line: index + 2, date: excelDate(get(col.date)) || dateActuelle(), time: excelTime(get(col.time)) || heureActuelle(), fullName,
          matricule: get(col.matricule) || employee?.matricule || "", keyType: keyTypeValue || "", quantity: Number(get(col.quantity)), lieu: get(col.lieu), employee,
          observations: get(col.observations), returnDate: excelDate(get(col.returnDate)), returnDateProvided: Boolean(get(col.returnDate)), returnTime: excelTime(get(col.returnTime)),
          returner: get(col.returner), returnerMatricule: get(col.returnerMatricule), status: normalize(get(col.status)),
        };
      }).filter((row) => row.fullName || row.keyType || row.lieu);
      if (!data.length) throw new Error("Le fichier ne contient aucune ligne à importer.");
      let saved = 0;
      let queued = 0;
      const failures: string[] = [];
      for (const row of data) {
        if (!row.fullName || !row.keyType || !row.lieu || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 10000) {
          failures.push(`Ligne ${row.line} : nom, type de clé, lieu ou quantité invalide.`); continue;
        }
        if ((row.returnDateProvided && !row.returnDate) || (row.returnTime && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row.returnTime))) {
          failures.push(`Ligne ${row.line} : date de retour invalide.`); continue;
        }
        if ((row.status === "rendu" || row.status === "retourne") && !row.returnTime) {
          failures.push(`Ligne ${row.line} : l'heure de retour est requise pour un statut rendu.`); continue;
        }
        const parts = row.fullName.trim().split(/\s+/);
        const returnerParts = row.returner.trim().split(/\s+/).filter(Boolean);
        try {
          const result = await serviceApi.createKeyTracking({
            date: row.date, employeeId: row.employee?.id || "", lastName: row.employee?.lastName || parts[0],
            firstName: row.employee?.firstName || parts.slice(1).join(" "), matricule: row.matricule,
            keyType: row.keyType, quantity: row.quantity, departureTime: row.time, siteId, lieu: row.lieu,
            observations: row.observations,
            ...(row.returnDate ? { returnDate: row.returnDate } : {}),
            ...(row.returnTime ? { returnTime: row.returnTime } : {}),
            ...(row.returner ? { returnerLastName: returnerParts[0] || "", returnerFirstName: returnerParts.slice(1).join(" "), returnerMatricule: row.returnerMatricule } : {}),
            notReturned: row.status.includes("non rendu"),
          });
          saved += 1;
          if (result.pendingSync) queued += 1;
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
        }
      }
      const updatedEntries = await serviceApi.listKeyTracking(siteId);
      setEntries(updatedEntries);
      setEntriesForSite(siteId);
      if (saved) toast.success(`${saved} mouvement(s) ajouté(s) au registre${queued ? ` (${queued} en attente de synchronisation)` : " et enregistré(s) dans la base"}.`);
      if (failures.length) toast.error(saved ? `${failures.length} ligne(s) n'ont pas été importées. Vérifiez les champs et les habilitations.` : failures.slice(0, 3).join(" "));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };
  const handleReturn = async (entry: KeyTrackingEntry, returnerType: "same" | "other", otherEmployeeId?: string) => {
    setReturningEntryId(entry.id);
    try {
      await serviceApi.returnKeyTracking(entry.id, {
        returnDate: dateActuelle(), returnTime: heureActuelle(), siteId, returnerType,
        ...(otherEmployeeId ? { returnerEmployeeId: otherEmployeeId } : {}),
      });
      toast.success("Retour de clé enregistré.");
      setReturnDialogEntry(null);
      setReturnerChoice("");
      setReturnerEmployeeId("");
      const rows = await serviceApi.listKeyTracking(siteId);
      setEntries(rows);
      setEntriesForSite(siteId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement du retour impossible.");
    } finally {
      setReturningEntryId(null);
    }
  };

  const handleNotReturned = async (entry: KeyTrackingEntry) => {
    setSavingObservation(true);
    try {
      await serviceApi.markKeyTrackingNotReturned(entry.id, {
        observations: notReturnedObservation.trim() || "Clés non rendu", siteId,
      });
      toast.success("Statut « Non rendu » enregistré.");
      setReturnDialogEntry(null);
      setReturnerChoice("");
      setNotReturnedObservation("");
      const rows = await serviceApi.listKeyTracking(siteId);
      setEntries(rows);
      setEntriesForSite(siteId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de l’observation impossible.");
    } finally {
      setSavingObservation(false);
    }
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Historique des mouvements de clés";
    window.addEventListener("afterprint", () => {
      document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const availableEmployees = siteEmployeesFor === siteId ? siteEmployees : [];
  const visibleEntries = useMemo(() => entriesForSite === siteId ? entries : [], [entriesForSite, entries, siteId]);
  const normalizedSearch = normaliserRecherche(search.trim());
  const filterEmployeeOptions = useMemo(() => Array.from(new Map(visibleEntries.map((entry) => {
    const name = `${entry.lastName} ${entry.firstName}`.trim();
    return [normaliserRecherche(name), name] as const;
  })).entries()).filter(([value]) => value), [visibleEntries]);
  const filteredEntries = useMemo(() => visibleEntries.filter((entry) => {
    const entryDate = String(entry.date || "").slice(0, 10);
    if (dateFrom && entryDate < dateFrom) return false;
    if (dateTo && entryDate > dateTo) return false;
    const identity = normaliserRecherche(`${entry.lastName} ${entry.firstName}`.trim());
    if (employeeFilter && identity !== employeeFilter) return false;
    const status = entry.pendingSync ? "pending"
      : entry.notReturned ? "not-returned"
      : entry.returnTime ? "returned"
      : "circulating";
    if (statusFilter !== "all" && status !== statusFilter) return false;
    return !normalizedSearch || normaliserRecherche([
      entry.date,
      formaterDate(entry.date),
      entry.lastName,
      entry.firstName,
      entry.matricule,
      entry.lieu ?? "",
      entry.observations ?? "",
      entry.departureTime,
      entry.keyType,
      String(entry.quantity),
      entry.returnTime ?? "",
      entry.returnDate ? formaterDate(entry.returnDate) : "",
      entry.returnerLastName ?? "",
      entry.returnerFirstName ?? "",
      entry.returnerMatricule ?? "",
    ].join(" ")).includes(normalizedSearch);
  }), [visibleEntries, dateFrom, dateTo, employeeFilter, statusFilter, normalizedSearch]);
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageNumbers = Array.from(
    { length: Math.min(pageCount, currentPage + 1) - Math.max(1, currentPage - 1) + 1 },
    (_, index) => Math.max(1, currentPage - 1) + index,
  );
  const handleExport = () => {
    const rows = filteredEntries.map((entry) => [
      entry.date, entry.departureTime, `${entry.lastName} ${entry.firstName}`.trim(), entry.matricule || "", entry.keyType,
      entry.quantity, entry.lieu || "", entry.observations || "", entry.returnDate || "", entry.returnTime || "",
      `${entry.returnerLastName || ""} ${entry.returnerFirstName || ""}`.trim(), entry.returnerMatricule || "",
      entry.notReturned ? "Non rendu" : entry.returnTime ? "Rendu" : "En circulation",
    ]);
    exportXlsx(`registre-mouvements-cles-${dateActuelle()}.xlsx`, "Mouvements de clés", [
      "Date sortie", "Heure sortie", "Nom et prénom", "Matricule", "Type de clé", "Nombre", "Lieu", "Observation",
      "Date retour", "Heure retour", "Personne qui a rendu", "Matricule du retour", "Statut",
    ], rows);
  };
  const employeeOptions = availableEmployees.map((employee) => ({
    value: employee.id,
    label: `${employee.lastName} ${employee.firstName}`,
    searchTerms: [employee.lastName, employee.firstName, employee.matricule],
  }));
  const keyTypeOptions = keyTypes.map((keyType) => ({
    value: keyType,
    label: keyType,
    searchTerms: [keyType],
  }));
  const siteEmployeeOptions = employeeOptions;
  const selectedReturner = siteEmployees.find((employee) => employee.id === returnerEmployeeId);
  const updateDraft = (id: string, changes: Partial<KeyDraft>) => {
    setDraftRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));
  };
  const removeDraft = (id: string) => {
    setDraftRows((current) => current.length > 1 ? current.filter((row) => row.id !== id) : [nouvelleLigne()]);
  };

  return (
    <div className="keys-module-panels space-y-4">
      <Dialog open={showEntryForm} onOpenChange={setShowEntryForm}>
        <DialogContent className="keys-entry-modal">
          <DialogHeader className="keys-entry-modal-header">
            <div className="keys-entry-modal-icon"><Plus aria-hidden="true" /></div>
            <div>
              <DialogTitle>Enregistrer une sortie de clé</DialogTitle>
              <DialogDescription>Saisissez chaque mouvement dans une ligne, puis enregistrez-la.</DialogDescription>
            </div>
          </DialogHeader>
          <section className="keys-entry-panel" aria-label="Nouvelle sortie de clé">
            <div className="keys-entry-toolbar">
              <p>Les champs marqués d’un astérisque sont obligatoires.</p>
              <Button type="button" variant="outline" onClick={() => setDraftRows((current) => [...current, nouvelleLigne()])} disabled={!siteId}>
                <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Nouvelle ligne
              </Button>
            </div>
        {!siteId && <p className="mb-3 text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un mouvement.</p>}
        {siteId && siteEmployeesFor === siteId && !availableEmployees.length && (
          <p className="mb-3 text-sm text-muted-foreground">Aucun employé enregistré sur ce site ; vous pouvez saisir son nom manuellement.</p>
        )}
        <div className="keys-entry-scroll">
          <table className="keys-entry-table">
            <thead><tr>
              <th scope="col">Date sortie</th><th scope="col">Nom et prénom *</th><th scope="col">Matricule</th><th scope="col">Heure sortie</th>
              <th scope="col">Type de clé *</th><th scope="col">Nombre *</th><th scope="col">Lieu *</th><th scope="col">Action</th>
            </tr></thead>
            <tbody>{draftRows.map((row) => {
              const employee = availableEmployees.find((item) => item.id === row.employeeId);
              const quantity = Number(row.quantity);
              const canSave = Boolean(siteId && row.date && row.personName.trim() && row.keyType && row.lieu.trim() && Number.isInteger(quantity) && quantity >= 1 && quantity <= 10000);
              return <tr key={row.id}>
                <td><Input aria-label="Date de sortie" type="date" value={row.date} onChange={(event) => updateDraft(row.id, { date: event.target.value })} /></td>
                <td><Input aria-label="Nom et prénom de la personne" list={`key-employee-options-${row.id}`} value={row.personName} onChange={(event) => {
                  const personName = event.target.value;
                  const match = availableEmployees.find((item) => `${item.lastName} ${item.firstName}`.trim().toLocaleLowerCase("fr") === personName.trim().toLocaleLowerCase("fr"));
                  updateDraft(row.id, { personName, employeeId: match?.id || "", matricule: match?.matricule || "" });
                }} placeholder="Nom et prénom" />
                  <datalist id={`key-employee-options-${row.id}`}>{availableEmployees.map((item) => <option key={item.id} value={`${item.lastName} ${item.firstName}`.trim()} />)}</datalist>
                </td>
                <td><Input aria-label="Matricule (facultatif)" value={employee?.matricule || row.matricule} onChange={(event) => updateDraft(row.id, { matricule: event.target.value, employeeId: "" })} placeholder="Matricule" /></td>
                <td>{currentTime}</td>
                <td><SearchableSelect
                  value={row.keyType}
                  options={keyTypeOptions}
                  placeholder="Choisir une clé"
                  searchPlaceholder="Rechercher un type de clé…"
                  emptyMessage="Aucun type de clé correspondant."
                  disabled={!keyTypeOptions.length}
                  onChange={(keyType) => updateDraft(row.id, { keyType })}
                /></td>
                <td><Input aria-label="Nombre de clés" type="number" min="1" max="10000" step="1" value={row.quantity} onChange={(event) => updateDraft(row.id, { quantity: event.target.value })} /></td>
                <td><Input aria-label="Lieu de sortie" maxLength={255} value={row.lieu} onChange={(event) => updateDraft(row.id, { lieu: event.target.value })} placeholder="Bureau, magasin…" /></td>
                <td className="keys-entry-actions">
                  <Button type="button" size="sm" onClick={() => void handleSubmit(row)} disabled={!canSave || savingRowId !== null}>
                    {savingRowId === row.id ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Supprimer cette ligne" title="Supprimer cette ligne" onClick={() => removeDraft(row.id)} disabled={savingRowId !== null}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </td>
              </tr>;
            })}</tbody>
          </table>
        </div>
          </section>
          <DialogFooter className="keys-entry-modal-footer">
            <Button type="button" variant="outline" onClick={() => setShowEntryForm(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section id="key-movements-print-area" className="keys-history space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="keys-history-toolbar">
          <h2 className="keys-panel-heading font-semibold">Historique et retour des clés</h2>
          <div className="keys-history-actions print:hidden">
            <Button type="button" onClick={() => setShowEntryForm((shown) => !shown)}>
              <Plus className="mr-2 h-4 w-4" />Nouvelle sortie
            </Button>
            <label className={`keys-import-button ${!siteId || importing ? "pointer-events-none opacity-50" : ""}`}>
              <FileUp className="h-4 w-4 shrink-0" /> {importing ? "Importation…" : "Importer Excel / CSV"}
              <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!siteId || importing} onChange={(event) => { void handleImport(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <Button type="button" variant="outline" onClick={() => exportXlsx("modele-mouvements-cles.xlsx", "Mouvements de clés", ["Date sortie", "Heure sortie", "Nom et prénom", "Matricule", "Type de clé", "Nombre", "Lieu", "Observation", "Date retour", "Heure retour", "Personne qui a rendu", "Matricule du retour", "Statut"], [])}>
              <FileDown className="h-4 w-4 shrink-0" />Modèle Excel
            </Button>
            <Button type="button" variant="outline" className="keys-print-button" disabled={!filteredEntries.length} onClick={handleExport}>
              <Download className="h-4 w-4 shrink-0" />Exporter Excel
            </Button>
            <Button type="button" variant="outline" className="keys-print-button" disabled={!siteId || !visibleEntries.length} onClick={handlePrint}>
              <Printer className="h-4 w-4 shrink-0" />Imprimer les lignes (Word)
            </Button>
          </div>
        </div>
        <div className="keys-filter-grid key-movements-screen">
          <label className="keys-filter-field">
            <span><CalendarDays aria-hidden="true" />Période</span>
            <div className="keys-date-range">
              <Input aria-label="Date de début" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
              <span aria-hidden="true">–</span>
              <Input aria-label="Date de fin" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
            </div>
          </label>
          <label className="keys-filter-field">
            <span><UserRound aria-hidden="true" />Agent</span>
            <select value={employeeFilter} onChange={(event) => { setEmployeeFilter(event.target.value); setPage(1); }}>
              <option value="">Tous les agents</option>
              {filterEmployeeOptions.map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            </select>
          </label>
          <label className="keys-filter-field">
            <span><MapPin aria-hidden="true" />Site</span>
            <select value={siteId} onChange={(event) => { onSiteChange?.(event.target.value); setPage(1); }} disabled={sites.length <= 1}>
              <option value="">Sélectionner un site</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
            </select>
          </label>
          <label className="keys-filter-field">
            <span><CheckCircle2 aria-hidden="true" />Statut</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="all">Tous</option>
              <option value="circulating">En circulation</option>
              <option value="returned">Rendu</option>
              <option value="not-returned">Non rendu</option>
              <option value="pending">En attente de synchronisation</option>
            </select>
          </label>
          <label className="keys-filter-field keys-filter-search">
            <span><Search aria-hidden="true" />Recherche</span>
            <Input
              aria-label="Rechercher un mouvement de clé"
              placeholder="Nom, matricule, clé…"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
          </label>
        </div>
        {siteError && <p className="text-sm text-destructive">{siteError}</p>}
        {!siteError && !sites.length && <p className="text-sm text-muted-foreground">Aucun site actif n’est associé ou disponible pour ce compte.</p>}
        <div className="keys-results-summary key-movements-screen">
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
        <div className="max-h-[520px] overflow-auto key-movements-screen">
          <table className="keys-history-table w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="keys-table-head sticky top-0 bg-muted">
              <tr>
                {["N°", "Date sortie", "Nom et prénom", "Matricule", "Heure sortie", "Type de clé", "Nombre", "Lieu", "Statut", "Action"].map((label) => (
                  <th key={label} className="border-b px-3 py-2 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageEntries.map((entry, index) => (
                <tr key={entry.id} className={`keys-table-row border-b last:border-0 ${entry.notReturned ? "keys-table-row--alert" : entry.returnTime ? "keys-table-row--returned" : "keys-table-row--pending"}`}>
                  <td className="px-3 py-2">{(currentPage - 1) * pageSize + index + 1}</td>
                  <td className="px-3 py-2">{formaterDate(entry.date)}</td>
                  <td className="px-3 py-2">{entry.lastName} {entry.firstName}</td>
                  <td className="px-3 py-2">{entry.matricule}</td>
                  <td className="px-3 py-2">{entry.departureTime}</td>
                  <td className="px-3 py-2">{entry.keyType}</td>
                  <td className="px-3 py-2">{entry.quantity}</td>
                  <td className="px-3 py-2">{entry.lieu || "—"}</td>
                  <td className="px-3 py-2">
                    {entry.pendingSync ? (
                      <span className="keys-status keys-status--pending" title={entry.pendingSyncError || undefined}>
                        {entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"}
                      </span>
                    ) : entry.notReturned ? (
                      <span className="keys-status keys-status--alert">Non rendu</span>
                    ) : entry.returnTime ? (
                      <span className="keys-status keys-status--returned">
                        <CheckCircle2 aria-hidden="true" /> Rendu · {entry.returnTime}
                      </span>
                    ) : (
                      <span className="keys-status">En circulation</span>
                    )}
                    {(entry.returnDate || entry.returnerLastName || entry.returnerFirstName || entry.observations) && (
                      <span className="keys-status-detail">
                        {entry.returnDate && `Le ${formaterDate(entry.returnDate)}`}
                        {(entry.returnerLastName || entry.returnerFirstName) && ` · ${entry.returnerLastName ?? ""} ${entry.returnerFirstName ?? ""}`.trim()}
                        {entry.observations && ` · ${entry.observations}`}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {!entry.pendingSync && !entry.notReturned && !entry.returnTime ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="keys-return-button h-8"
                        disabled={returningEntryId === entry.id}
                        onClick={() => {
                          setReturnDialogEntry(entry);
                          setReturnerChoice("");
                          setReturnerEmployeeId("");
                        }}
                      >
                        {returningEntryId === entry.id ? "Enregistrement…" : "Enregistrer le retour"}
                      </Button>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
              {siteId && entriesForSite === siteId && !filteredEntries.length && (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">
                  {visibleEntries.length ? "Aucun mouvement ne correspond aux filtres sélectionnés." : "Aucun mouvement de clé enregistré pour ce site."}
                </td></tr>
              )}
              {!siteId && (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">Sélectionnez un site pour afficher les mouvements.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="keys-pagination key-movements-screen">
          <span>
            {filteredEntries.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredEntries.length)} sur ${filteredEntries.length}` : "Aucun résultat"}
          </span>
          <div>
            <Button type="button" variant="outline" size="icon" aria-label="Page précédente" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            {pageNumbers.map((pageNumber) => (
              <Button key={pageNumber} type="button" variant={pageNumber === currentPage ? "default" : "outline"} className="keys-page-number" aria-current={pageNumber === currentPage ? "page" : undefined} onClick={() => setPage(pageNumber)}>
                {pageNumber}
              </Button>
            ))}
            <Button type="button" variant="outline" size="icon" aria-label="Page suivante" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>
        <div className="key-movements-print hidden">
          <h1 className="mb-1 text-xl font-bold">Historique des mouvements de clés</h1>
          <p className="mb-4 text-sm">Site : {siteId || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
          <table>
            <thead>
              <tr>
                {["Date sortie", "Nom et prénom", "Matricule", "Heure de sortie", "Type de clé", "Nombre de clés", "Lieu", "Observation", "Date retour", "Personne qui a rendu", "Heure de retour"].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formaterDate(entry.date)}</td>
                  <td>{entry.lastName} {entry.firstName}</td>
                  <td>{entry.matricule}</td>
                  <td>{entry.departureTime}</td>
                  <td>{entry.keyType}</td>
                  <td>{entry.quantity}</td>
                  <td>{entry.lieu || "—"}</td>
                  <td>{entry.observations || "—"}</td>
                  <td>{entry.returnDate ? formaterDate(entry.returnDate) : "—"}</td>
                  <td>{entry.returnerLastName || entry.returnerFirstName
                    ? `${entry.returnerLastName ?? ""} ${entry.returnerFirstName ?? ""} · ${entry.returnerMatricule ?? "—"}`
                    : "—"}</td>
                  <td>{entry.pendingSync ? "En attente de synchronisation" : entry.returnTime || (entry.notReturned ? "Non rendu" : "En attente")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Dialog open={Boolean(returnDialogEntry)} onOpenChange={(open) => {
        if (!open && !returningEntryId) {
          setReturnDialogEntry(null);
          setReturnerChoice("");
          setReturnerEmployeeId("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer le retour de la clé</DialogTitle>
            <DialogDescription>
              Choisissez qui rend la clé ou indiquez qu’elle n’est pas rendue.
            </DialogDescription>
          </DialogHeader>
          {returnDialogEntry && <div className="space-y-4">
            <p className="text-sm">
              {returnDialogEntry.keyType} · {returnDialogEntry.quantity} clé(s), prise par {returnDialogEntry.lastName} {returnDialogEntry.firstName}
            </p>
            {!returnerChoice && <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" disabled={returningEntryId === returnDialogEntry.id || savingObservation} onClick={() => void handleReturn(returnDialogEntry, "same")}>
                La personne qui a pris la clé
              </Button>
              <Button type="button" variant="outline" disabled={returningEntryId === returnDialogEntry.id || savingObservation} onClick={() => {
                setReturnerChoice("other");
                setReturnerEmployeeId("");
              }}>
                Une autre personne
              </Button>
              <Button type="button" variant="destructive" disabled={returningEntryId === returnDialogEntry.id || savingObservation} onClick={() => {
                setReturnerChoice("not-returned");
                setNotReturnedObservation("");
              }}>
                Non rendu
              </Button>
            </div>}
            {returnerChoice === "not-returned" && <label className="block space-y-1">
              <span className="text-sm font-medium">Observation (facultative)</span>
              <Textarea
                maxLength={20000}
                rows={3}
                value={notReturnedObservation}
                onChange={(event) => setNotReturnedObservation(event.target.value)}
                placeholder="Clés non rendu"
              />
            </label>}
            {returnerChoice === "other" && <div className="space-y-3 rounded-md border p-3">
              <p className="text-sm font-medium">Une autre personne rendra la clé</p>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Personne qui rend la clé</span>
                <SearchableSelect
                  value={returnerEmployeeId}
                  options={siteEmployeeOptions}
                  placeholder={siteEmployeesFor === siteId ? "Sélectionner un employé" : "Chargement des employés…"}
                  searchPlaceholder="Rechercher par nom ou matricule…"
                  emptyMessage="Aucun employé correspondant."
                  disabled={siteEmployeesFor !== siteId || !siteEmployeeOptions.length || returningEntryId === returnDialogEntry.id}
                  onChange={setReturnerEmployeeId}
                />
                {siteEmployeesFor === siteId && !siteEmployeeOptions.length && <span className="text-xs text-muted-foreground">Aucun employé actif disponible sur ce site.</span>}
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium">Nom et prénom</span>
                  <Input readOnly value={selectedReturner ? `${selectedReturner.lastName} ${selectedReturner.firstName}` : ""} placeholder="Sélectionnez la personne" />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium">Matricule</span>
                  <Input readOnly value={selectedReturner?.matricule ?? ""} placeholder="Automatique" />
                </label>
              </div>
            </div>}
          </div>}
          <DialogFooter>
              <Button type="button" variant="outline" disabled={Boolean(returningEntryId) || savingObservation} onClick={() => {
              setReturnDialogEntry(null);
              setReturnerChoice("");
              setReturnerEmployeeId("");
            }}>Annuler</Button>
            {returnerChoice === "other" && returnDialogEntry && <Button
              type="button"
              disabled={!selectedReturner || siteEmployeesFor !== siteId || returningEntryId === returnDialogEntry.id}
              onClick={() => void handleReturn(returnDialogEntry, "other", returnerEmployeeId)}
            >{returningEntryId === returnDialogEntry.id ? "Enregistrement…" : "Enregistrer le retour"}</Button>}
            {returnerChoice === "not-returned" && returnDialogEntry && <Button
              type="button"
              variant="destructive"
              disabled={savingObservation || returningEntryId === returnDialogEntry.id}
              onClick={() => void handleNotReturned(returnDialogEntry)}
            >{savingObservation ? "Enregistrement…" : "Confirmer non rendu"}</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #key-movements-print-area, #key-movements-print-area * { visibility: visible !important; }
          #key-movements-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .key-movements-screen { display: none !important; }
          .key-movements-print { display: block !important; }
          .key-movements-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .key-movements-print th, .key-movements-print td { border: 1px solid #777; padding: 6px; text-align: left; }
          .key-movements-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
