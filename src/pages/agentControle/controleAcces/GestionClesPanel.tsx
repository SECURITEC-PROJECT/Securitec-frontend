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
import { Check, CheckCircle2, ChevronsUpDown, KeyRound, Printer, Search } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
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
const nouveauFormulaire = () => ({ date: dateActuelle(), employeeId: "", keyType: "", quantity: "1", lieu: "" });

export default function GestionClesPanel({ siteId = "" }: { siteId?: string }) {
  const [form, setForm] = useState(nouveauFormulaire);
  const [currentTime, setCurrentTime] = useState(heureActuelle);
  const [keyTypes, setKeyTypes] = useState<string[]>([]);
  const [siteEmployees, setSiteEmployees] = useState<RegisterEmployeeOption[]>([]);
  const [siteEmployeesFor, setSiteEmployeesFor] = useState("");
  const [entries, setEntries] = useState<KeyTrackingEntry[]>([]);
  const [entriesForSite, setEntriesForSite] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const employee = availableEmployees.find((item) => item.id === form.employeeId);
      if (!employee) throw new Error("Sélectionnez un employé actif.");
      await serviceApi.createKeyTracking({
        ...form,
        lastName: employee.lastName,
        firstName: employee.firstName,
        matricule: employee.matricule,
        lieu: form.lieu.trim(),
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
  const visibleEntries = entriesForSite === siteId ? entries : [];
  const normalizedSearch = normaliserRecherche(search.trim());
  const filteredEntries = visibleEntries.filter((entry) =>
    normaliserRecherche([
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
    ].join(" ")).includes(normalizedSearch),
  );
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
              placeholder={siteEmployeesFor === siteId ? "Sélectionner un employé" : "Chargement des employés…"}
              searchPlaceholder="Rechercher un employé..."
              emptyMessage="Aucun employé correspondant."
              disabled={siteEmployeesFor !== siteId || !employeeOptions.length}
              onChange={(employeeId) => setForm({ ...form, employeeId })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Matricule</span>
            <Input readOnly value={availableEmployees.find((employee) => employee.id === form.employeeId)?.matricule ?? ""} placeholder="Automatique" />
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
              onChange={(keyType) => setForm({ ...form, keyType })}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Nombre de clés</span>
            <Input required type="number" min="1" max="10000" step="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-sm font-medium">Lieu</span>
            <Input required maxLength={255} value={form.lieu} onChange={(event) => setForm({ ...form, lieu: event.target.value })} placeholder="Bureau, magasin…" />
          </label>
        </div>
        {!siteId && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un mouvement.</p>}
        {siteId && siteEmployeesFor === siteId && !availableEmployees.length && (
          <p className="text-sm text-muted-foreground">Aucun employé actif disponible sur ce site.</p>
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !siteId || !form.keyType || !availableEmployees.some((employee) => employee.id === form.employeeId)}>
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
            placeholder="Rechercher par nom, matricule, type de clé, date ou heure de retour…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-11 pl-9"
          />
        </div>
        <div className="max-h-[520px] overflow-auto key-movements-screen">
          <table className="w-full min-w-[1280px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {["Date sortie", "Nom et prénom", "Matricule", "Heure de sortie", "Type de clé", "Nombre de clés", "Lieu", "Observation", "Date retour", "Personne qui a rendu", "Heure de retour"].map((label) => (
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
                  <td className="px-3 py-2">{entry.lieu || "—"}</td>
                  <td className="whitespace-pre-wrap px-3 py-2">{entry.observations || "—"}</td>
                  <td className="px-3 py-2">{entry.returnDate ? formaterDate(entry.returnDate) : "—"}</td>
                  <td className="px-3 py-2">{entry.returnerLastName || entry.returnerFirstName
                    ? `${entry.returnerLastName ?? ""} ${entry.returnerFirstName ?? ""} · ${entry.returnerMatricule ?? "—"}`
                    : "—"}</td>
                  <td className="px-3 py-2">
                    {entry.pendingSync ? (
                      <span className="font-medium text-amber-700" title={entry.pendingSyncError || undefined}>
                        {entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"}
                      </span>
                    ) : entry.notReturned ? (
                      <span className="font-medium text-destructive">Non rendu</span>
                    ) : entry.returnTime ? (
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
                        onClick={() => {
                          setReturnDialogEntry(entry);
                          setReturnerChoice("");
                          setReturnerEmployeeId("");
                        }}
                      >
                        {returningEntryId === entry.id ? "Enregistrement…" : `Enregistrer le retour (${currentTime})`}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {siteId && entriesForSite === siteId && !filteredEntries.length && (
                <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">
                  {visibleEntries.length ? "Aucun mouvement ne correspond à votre recherche." : "Aucun mouvement de clé enregistré pour ce site."}
                </td></tr>
              )}
              {!siteId && (
                <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Sélectionnez un site pour afficher les mouvements.</td></tr>
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
