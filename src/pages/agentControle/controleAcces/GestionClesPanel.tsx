import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { serviceApi, type KeyTrackingEntry } from "@/lib/service-api";
import { Check, CheckCircle2, ChevronsUpDown, KeyRound, Printer, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

interface KeyEmployee {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  role: string;
}

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
const nouveauFormulaire = () => ({ date: dateActuelle(), employeeId: "", keyType: "", quantity: "1" });

export default function GestionClesPanel({ siteId = "" }: { siteId?: string }) {
  const [form, setForm] = useState(nouveauFormulaire);
  const [currentTime, setCurrentTime] = useState(heureActuelle);
  const [keyTypes, setKeyTypes] = useState<string[]>([]);
  const [employees, setEmployees] = useState<KeyEmployee[]>([]);
  const [employeesFor, setEmployeesFor] = useState("");
  const [entries, setEntries] = useState<KeyTrackingEntry[]>([]);
  const [entriesForSite, setEntriesForSite] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [returningEntryId, setReturningEntryId] = useState<string | number | null>(null);

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
    serviceApi.listKeyTracking(siteId)
      .then((rows) => {
        if (active) {
          setEntries(rows);
          setEntriesForSite(siteId);
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement du suivi des clés impossible."));
    return () => { active = false; };
  }, [siteId]);

  useEffect(() => {
    if (!siteId || !form.keyType) return;
    let active = true;
    const requestKey = `${siteId}:${form.keyType}`;
    serviceApi.listKeyEmployees(form.keyType, siteId)
      .then((rows) => {
        if (active) {
          setEmployees(rows);
          setEmployeesFor(requestKey);
        }
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement des employés habilités impossible."));
    return () => { active = false; };
  }, [form.keyType, siteId]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await serviceApi.createKeyTracking({
        ...form,
        departureTime: heureActuelle(),
        quantity: Number(form.quantity),
        siteId,
      });
      toast.success("Sortie de clé enregistrée.");
      setForm(nouveauFormulaire());
      const rows = await serviceApi.listKeyTracking(siteId);
      setEntries(rows);
      setEntriesForSite(siteId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de la sortie impossible.");
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async (entry: KeyTrackingEntry) => {
    setReturningEntryId(entry.id);
    try {
      await serviceApi.returnKeyTracking(entry.id, { returnTime: heureActuelle(), siteId });
      toast.success("Heure de retour enregistrée.");
      const rows = await serviceApi.listKeyTracking(siteId);
      setEntries(rows);
      setEntriesForSite(siteId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement du retour impossible.");
    } finally {
      setReturningEntryId(null);
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

  const matchingEmployees = employeesFor === `${siteId}:${form.keyType}` ? employees : [];
  const visibleEntries = entriesForSite === siteId ? entries : [];
  const normalizedSearch = normaliserRecherche(search.trim());
  const filteredEntries = visibleEntries.filter((entry) =>
    normaliserRecherche([
      entry.date,
      formaterDate(entry.date),
      entry.lastName,
      entry.firstName,
      entry.matricule,
      entry.departureTime,
      entry.keyType,
      String(entry.quantity),
      entry.returnTime ?? "",
    ].join(" ")).includes(normalizedSearch),
  );
  const employeeOptions = matchingEmployees.map((employee) => ({
    value: employee.id,
    label: `${employee.lastName} ${employee.firstName}`,
    searchTerms: [employee.lastName, employee.firstName],
  }));
  const keyTypeOptions = keyTypes.map((keyType) => ({
    value: keyType,
    label: keyType,
    searchTerms: [keyType],
  }));

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="font-semibold text-primary">Enregistrer une sortie de clé</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm font-medium">Date</span>
            <Input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Nom et prénom</span>
            <SearchableSelect
              value={form.employeeId}
              options={employeeOptions}
              placeholder={form.keyType ? "Sélectionner un employé habilité" : "Sélectionnez d’abord un type de clé"}
              searchPlaceholder="Rechercher un employé..."
              emptyMessage="Aucun employé correspondant."
              disabled={!matchingEmployees.length}
              onChange={(employeeId) => setForm({ ...form, employeeId })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Matricule</span>
            <Input readOnly value={matchingEmployees.find((employee) => employee.id === form.employeeId)?.matricule ?? ""} placeholder="Automatique" />
          </label>
          <div className="space-y-1">
            <span className="text-sm font-medium">Heure de sortie</span>
            <Input readOnly type="time" value={currentTime} aria-describedby="key-departure-time-help" />
            <span id="key-departure-time-help" className="text-xs text-muted-foreground">Heure enregistrée au clic.</span>
          </div>
          <label className="space-y-1">
            <span className="text-sm font-medium">Type de clé</span>
            <SearchableSelect
              value={form.keyType}
              options={keyTypeOptions}
              placeholder="Sélectionner un type de clé"
              searchPlaceholder="Rechercher un type de clé..."
              emptyMessage="Aucun type de clé correspondant."
              onChange={(keyType) => setForm({ ...form, keyType, employeeId: "" })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Nombre de clés</span>
            <Input required type="number" min="1" max="10000" step="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
          </label>
        </div>
        {!siteId && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un mouvement.</p>}
        {form.keyType && !matchingEmployees.length && employeesFor === `${siteId}:${form.keyType}` && (
          <p className="text-sm text-muted-foreground">Aucun employé actif n’est habilité à prendre ce type de clé sur ce site.</p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !siteId || !form.keyType || !matchingEmployees.some((employee) => employee.id === form.employeeId)}>
            <KeyRound className="mr-2 h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>

      <section id="key-movements-print-area" className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-primary">Historique et retour des clés</h2>
          <Button type="button" variant="outline" className="print:hidden" disabled={!siteId || !visibleEntries.length} onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer tous les mouvements
          </Button>
        </div>
        <div className="relative key-movements-screen">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Rechercher un mouvement de clé"
            placeholder="Rechercher par nom, matricule, type de clé, date ou heure…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-11 pl-9"
          />
        </div>
        <div className="max-h-[520px] overflow-auto key-movements-screen">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {["Date", "Nom et prénom", "Matricule", "Heure de sortie", "Type de clé", "Nombre de clés", "Heure de retour"].map((label) => (
                  <th key={label} className="border-b px-3 py-2 font-medium">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{formaterDate(entry.date)}</td>
                  <td className="px-3 py-2">{entry.lastName} {entry.firstName}</td>
                  <td className="px-3 py-2">{entry.matricule}</td>
                  <td className="px-3 py-2">{entry.departureTime}</td>
                  <td className="px-3 py-2">{entry.keyType}</td>
                  <td className="px-3 py-2">{entry.quantity}</td>
                  <td className="px-3 py-2">
                    {entry.returnTime ? (
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" /> {entry.returnTime}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8"
                        disabled={returningEntryId === entry.id}
                        onClick={() => void handleReturn(entry)}
                      >
                        {returningEntryId === entry.id ? "Enregistrement…" : `Enregistrer le retour (${currentTime})`}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {siteId && entriesForSite === siteId && !filteredEntries.length && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  {visibleEntries.length ? "Aucun mouvement ne correspond à votre recherche." : "Aucun mouvement de clé enregistré pour ce site."}
                </td></tr>
              )}
              {!siteId && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Sélectionnez un site pour afficher les mouvements.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="key-movements-print hidden">
          <h1 className="mb-1 text-xl font-bold">Historique des mouvements de clés</h1>
          <p className="mb-4 text-sm">Site : {siteId || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
          <table>
            <thead>
              <tr>
                {["Date", "Nom et prénom", "Matricule", "Heure de sortie", "Type de clé", "Nombre de clés", "Heure de retour"].map((label) => (
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
                  <td>{entry.returnTime || "En attente"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
