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
import { LogOut, Pencil, Plus, Printer, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

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
    const load = isBicycle
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

    load.catch((error) => {
      if (!active) return;
      const message = error instanceof Error ? error.message : "Chargement du registre impossible.";
      setRegistry({ key: currentKey, entries: [], error: message });
      setEmployeeError(message);
      toast.error(message);
    });
    return () => { active = false; };
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

  const resetForm = () => {
    setForm(blankForm());
    setEmployee(null);
    setEmployeeQuery("");
    setEditingEntry(null);
    setShowEmployeeOptions(false);
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
          siteId,
        };
        entry = editingEntry
          ? await serviceApi.updateBicycleMovement(editingEntry.id, payload)
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
          ? await serviceApi.updateMotorcycleMovement(editingEntry.id, payload)
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
      toast.success(wasEditing ? "Mouvement modifié." : "Mouvement enregistré.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: MovementEntry) => {
    setEditingEntry(entry);
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

  const deleteEntry = async (entry: MovementEntry) => {
    if (!siteId || entry.annuleLe || !(await confirmDeletion("Annuler ce mouvement ? Il restera dans l’historique."))) return;
    setDeletingId(entry.id);
    try {
      if (isBicycle) await serviceApi.deleteBicycleMovement(entry.id, siteId);
      else await serviceApi.deleteMotorcycleMovement(entry.id, siteId);
      const cancelledAt = new Date().toISOString();
      setRegistry((current) => ({ ...current, entries: current.entries.map((item) => item.id === entry.id ? { ...item, annuleLe: cancelledAt } : item) }));
      if (editingEntry?.id === entry.id) resetForm();
      toast.success("Mouvement annulé et conservé dans l’historique.");
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
      const updated = await serviceApi.recordMotorcycleExit(entry.id, siteId);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.map((item) => item.id === updated.id ? updated : item),
      }));
      toast.success(`Sortie enregistrée à ${updated.heureSortie || "l’heure actuelle"}.`);
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
      const updated = await serviceApi.recordBicycleExit(entry.id, siteId);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.map((item) => item.id === updated.id ? updated : item),
      }));
      toast.success(`Sortie enregistrée à ${updated.heureSortie || "l’heure actuelle"}.`);
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
    <div className="space-y-6">
      <PageHeader title={title} subtitle={isBicycle
        ? "Enregistrement des entrées de vélos par employé."
        : "Enregistrement des entrées et sorties de motos."} />
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

      <Panel title={editingEntry ? "Modifier un mouvement" : `Nouvelle entrée ${isBicycle ? "vélo" : "moto"}`}>
        <form className="space-y-5" onSubmit={(event) => void submit(event)}>
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

      <Panel title={`Historique ${isBicycle ? "des vélos" : "des motos"} (${filteredEntries.length})`}>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input aria-label={`Rechercher dans ${title}`} placeholder="Rechercher dans le registre…" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
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
                : <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                      <tr>{(isBicycle
                        ? ["Date", "Heure d’entrée", "Matricule", "Prénom", "Section", "Marque vélo", "Heure de sortie", "Actions"]
                        : ["Date", "Heure d’entrée", "Moto", "Observation", "Heure de sortie", "Actions"]
                      ).map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredEntries.map((entry) => <tr key={entry.id} className="align-top hover:bg-muted/30">
                        <td className={`whitespace-nowrap px-3 py-3 ${entry.annuleLe ? "text-muted-foreground line-through" : ""}`}>{formatDate(entry.date)}{entry.annuleLe && <span className="ml-1 text-destructive no-underline">(annulé)</span>}</td>
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
                            {!entry.annuleLe && isBicycle && !(entry as BicycleMovement).heureSortie && <Button type="button" size="sm" variant="outline" disabled={exitingId === entry.id} onClick={() => void recordBicycleExit(entry as BicycleMovement)}>
                              <LogOut className="mr-1 size-4" />{exitingId === entry.id ? "Sortie…" : "Sortir"}
                            </Button>}
                            {!entry.annuleLe && !isBicycle && !(entry as MotorcycleMovement).heureSortie && <Button type="button" size="sm" variant="outline" disabled={exitingId === entry.id} onClick={() => void recordExit(entry as MotorcycleMovement)}>
                              <LogOut className="mr-1 size-4" />{exitingId === entry.id ? "Sortie…" : "Sortir"}
                            </Button>}
                            {!entry.annuleLe && <Button type="button" size="icon" variant="ghost" aria-label="Modifier le mouvement" title="Modifier" onClick={() => editEntry(entry)}><Pencil className="size-4" /></Button>}
                            {!entry.annuleLe && <Button type="button" size="icon" variant="ghost" aria-label="Annuler le mouvement" title="Annuler" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}><Trash2 className="size-4 text-destructive" /></Button>}
                            <RegistryAuditHistory entity={isBicycle ? "mouvement_velo" : "mouvement_moto"} recordId={entry.id} />
                            <RegistryAttachments entity={isBicycle ? "mouvement_velo" : "mouvement_moto"} recordId={entry.id} siteId={siteId} />
                          </div>
                        </td>
                      </tr>)}
                      {!filteredEntries.length && <tr><td colSpan={isBicycle ? 8 : 6} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun résultat pour cette recherche.</td></tr>}
                    </tbody>
                  </table>
                </div>}
      </Panel>
    </div>
  );
}
