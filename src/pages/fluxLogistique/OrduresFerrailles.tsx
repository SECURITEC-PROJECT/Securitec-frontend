import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRecord } from "@/lib/printRecord";
import {
  serviceApi,
  type RegisterEmployeeOption,
  type WasteScrapRegisterEntry,
} from "@/lib/service-api";
import { Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

type RegisterKind = "ordures" | "ferrailles";
type RegisterForm = {
  date: string;
  heure: string;
  designation: string;
  observation: string;
  nombre: string;
  motif: string;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const blankForm = (): RegisterForm => ({
  date: today(),
  heure: currentTime(),
  designation: "",
  observation: "",
  nombre: "1",
  motif: "",
});

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);

export default function OrduresFerrailles({ kind }: { kind: RegisterKind }) {
  const isScrap = kind === "ferrailles";
  const title = isScrap ? "Registre des ferrailles" : "Registre des ordures";
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [selectedSiteName, setSelectedSiteName] = useState("");
  const [employees, setEmployees] = useState<RegisterEmployeeOption[]>([]);
  const [employee, setEmployee] = useState<RegisterEmployeeOption | null>(null);
  const [employeeQuery, setEmployeeQuery] = useState("");
  const [showEmployeeOptions, setShowEmployeeOptions] = useState(false);
  const [form, setForm] = useState<RegisterForm>(blankForm);
  const [entries, setEntries] = useState<WasteScrapRegisterEntry[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [loadError, setLoadError] = useState<{ key: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [employeeError, setEmployeeError] = useState("");
  const siteName = selectedSiteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === siteName), [sites, siteName]);
  const currentKey = site?.id ? `${kind}:${site.id}` : "";
  const isLoaded = Boolean(currentKey) && loadedKey === currentKey;
  const currentLoadError = loadError?.key === currentKey ? loadError.message : "";
  const loading = Boolean(currentKey) && !isLoaded && !currentLoadError;

  useEffect(() => {
    if (!site?.id) return;
    let active = true;
    Promise.all([
      serviceApi.listRegisterEmployees(site.id),
      serviceApi.listWasteScrapEntries(kind, site.id),
    ])
      .then(([employeeRows, entryRows]) => {
        if (active) {
          setEmployees(employeeRows);
          setEntries(entryRows);
          setLoadedKey(`${kind}:${site.id}`);
          setLoadError(null);
          setEmployeeError("");
        }
      })
      .catch((reason) => {
        if (active) {
          const message = reason instanceof Error ? reason.message : "Chargement du registre impossible.";
          setLoadError({ key: `${kind}:${site.id}`, message });
          setLoadedKey(`${kind}:${site.id}`);
          setEmployeeError(message);
          toast.error(message);
        }
      })
    return () => { active = false; };
  }, [site?.id, kind]);

  const visibleEmployees = useMemo(() => {
    const query = normalize(employeeQuery.trim());
    if (!query) return employees.slice(0, 8);
    return employees.filter((item) =>
      normalize(`${item.firstName} ${item.lastName} ${item.matricule} ${item.section}`).includes(query),
    ).slice(0, 8);
  }, [employees, employeeQuery]);

  const filteredEntries = useMemo(() => {
    const query = normalize(search.trim());
    if (!query) return entries;
    return entries.filter((entry) =>
      normalize([
        entry.date,
        formatDate(entry.date),
        entry.heure,
        entry.prenom,
        entry.matricule,
        entry.section,
        isScrap ? entry.designation : entry.observation,
        String(entry.nombre ?? ""),
        entry.motif ?? "",
      ].join(" ")).includes(query),
    );
  }, [entries, search, isScrap]);

  const resetForm = () => {
    setForm(blankForm());
    setEmployee(null);
    setEmployeeQuery("");
    setEditingId(null);
    setShowEmployeeOptions(false);
  };

  const handleEmployeeQueryChange = (value: string) => {
    setEmployeeQuery(value);
    setEmployee(null);
    setEmployeeError("");
    setShowEmployeeOptions(Boolean(value.trim()));
  };

  const chooseEmployee = (selected: RegisterEmployeeOption) => {
    setEmployee(selected);
    setEmployeeQuery(selected.matricule);
    setShowEmployeeOptions(false);
    setEmployeeError("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) {
      toast.error("Sélectionnez un site.");
      return;
    }
    if (!employee) {
      toast.error("Sélectionnez un employé à partir de son matricule.");
      return;
    }
    const nombre = Number(form.nombre);
    if (isScrap && (!Number.isSafeInteger(nombre) || nombre < 1 || nombre > 1000000)) {
      toast.error("Le nombre doit être un entier positif (maximum 1 000 000).");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        heure: form.heure,
        matricule: employee.matricule,
        siteId: site.id,
        ...(isScrap
          ? { designation: form.designation.trim(), nombre, motif: form.motif.trim() }
          : { observation: form.observation.trim() }),
      };
      const entry = editingId
        ? await serviceApi.updateWasteScrapEntry(kind, editingId, payload)
        : await serviceApi.createWasteScrapEntry(kind, payload);
      setEntries((current) => editingId
        ? current.map((item) => item.id === entry.id ? entry : item)
        : [entry, ...current]);
      resetForm();
      toast.success(editingId ? "Enregistrement modifié." : "Enregistrement ajouté.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: WasteScrapRegisterEntry) => {
    setEditingId(entry.id);
    setForm({
      date: entry.date.slice(0, 10),
      heure: entry.heure,
      designation: entry.designation ?? "",
      observation: entry.observation ?? "",
      nombre: String(entry.nombre ?? 1),
      motif: entry.motif ?? "",
    });
    const matched = employees.find((item) => item.matricule.toLocaleUpperCase() === entry.matricule.toLocaleUpperCase());
    chooseEmployee(matched ?? {
      id: "",
      firstName: entry.prenom,
      lastName: "",
      matricule: entry.matricule,
      section: entry.section,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = async (entry: WasteScrapRegisterEntry) => {
    if (!site?.id || !(await confirmDeletion(`Supprimer l’enregistrement de ${entry.prenom} (${entry.matricule}) ? Cette action est définitive.`))) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteWasteScrapEntry(kind, entry.id, site.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      if (editingId === entry.id) resetForm();
      toast.success("Enregistrement supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const printEntry = (entry: WasteScrapRegisterEntry) => {
    const rows: [string, string][] = [
      ["Date", formatDate(entry.date)],
      ["Heure", entry.heure || "—"],
      ["Prénom", entry.prenom || "—"],
      ["Matricule", entry.matricule || "—"],
      ["Section", entry.section || "—"],
    ];
    if (isScrap) {
      rows.push(
        ["Désignation", entry.designation || "—"],
        ["Nombre", String(entry.nombre ?? "—")],
        ["Motif", entry.motif || "—"],
      );
    } else {
      rows.push(["Observation", entry.observation || "—"]);
    }
    printRecord(isScrap ? "Enregistrement de ferraille" : "Enregistrement d’ordure", siteName, rows);
  };

  const printHistory = () => {
    const printWindow = window.open("", "_blank", "width=700,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer l’historique.");
      return;
    }

    const headings = ["Date", "Heure", "Prénom", "Matricule", "Section", isScrap ? "Désignation" : "Observation", ...(isScrap ? ["Nombre", "Motif"] : [])];
    const tableRows = entries.map((entry) => {
      const values = [
        formatDate(entry.date),
        entry.heure || "—",
        entry.prenom || "—",
        entry.matricule || "—",
        entry.section || "—",
        (isScrap ? entry.designation : entry.observation) || "—",
        ...(isScrap ? [String(entry.nombre ?? "—"), entry.motif || "—"] : []),
      ];
      return `<tr>${values.map((value) => `<td>${escapeHtml(value)}</td>`).join("")}</tr>`;
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

  return <div className="space-y-6">
    <PageHeader title={title} subtitle={`Saisie et consultation des ${isScrap ? "sorties de ferrailles" : "sorties d’ordures"} par employé.`} />
    <div className="max-w-xl">
      <SitePicker
        id={`${kind}-site`}
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

    <Panel title={editingId ? `Modifier un enregistrement ${isScrap ? "ferraille" : "ordure"}` : `Nouvel enregistrement ${isScrap ? "ferraille" : "ordure"}`}>
      <form className="space-y-5" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-date`}>Date</Label>
            <Input id={`${kind}-date`} type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-time`}>Heure</Label>
            <Input id={`${kind}-time`} type="time" required value={form.heure} onChange={(event) => setForm({ ...form, heure: event.target.value })} />
          </div>
          <div className="relative space-y-1.5">
            <Label htmlFor={`${kind}-employee`}>Matricule / employé</Label>
            <Input
              id={`${kind}-employee`}
              required
              autoComplete="off"
              placeholder="Rechercher un matricule ou un nom…"
              value={employeeQuery}
              onFocus={() => setShowEmployeeOptions(Boolean(employeeQuery.trim()))}
              onChange={(event) => handleEmployeeQueryChange(event.target.value)}
              onBlur={() => window.setTimeout(() => setShowEmployeeOptions(false), 120)}
            />
            {showEmployeeOptions && <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
              {visibleEmployees.length ? visibleEmployees.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseEmployee(item)}
                >
                  <span className="block font-medium">{item.matricule} · {item.firstName} {item.lastName}</span>
                  <span className="text-xs text-muted-foreground">Section : {item.section || "—"}</span>
                </button>
              )) : <p className="px-3 py-2 text-sm text-muted-foreground">{employeeError || "Aucun employé trouvé."}</p>}
            </div>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-first-name`}>Prénom</Label>
            <Input id={`${kind}-first-name`} readOnly required value={employee?.firstName || ""} placeholder="Rempli depuis le matricule" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${kind}-section`}>Section</Label>
            <Input id={`${kind}-section`} readOnly required value={employee?.section || ""} placeholder="Remplie depuis la fonction de l’employé" />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor={`${kind}-${isScrap ? "designation" : "observation"}`}>{isScrap ? "Désignation" : "Observation"}</Label>
            <Input
              id={`${kind}-${isScrap ? "designation" : "observation"}`}
              required
              maxLength={5000}
              value={isScrap ? form.designation : form.observation}
              onChange={(event) => setForm(isScrap
                ? { ...form, designation: event.target.value }
                : { ...form, observation: event.target.value })}
            />
          </div>
          {isScrap && <>
            <div className="space-y-1.5">
              <Label htmlFor={`${kind}-number`}>Nombre</Label>
              <Input id={`${kind}-number`} type="number" min="1" max="1000000" step="1" required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${kind}-reason`}>Motif</Label>
              <Input id={`${kind}-reason`} required maxLength={5000} value={form.motif} onChange={(event) => setForm({ ...form, motif: event.target.value })} />
            </div>
          </>}
        </div>
        <div className="flex justify-end gap-2 border-t pt-4">
          {editingId && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 size-4" />Annuler</Button>}
          <Button type="submit" disabled={saving || !site?.id || !employee}>
            {editingId ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
            {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Ajouter au registre"}
          </Button>
        </div>
      </form>
    </Panel>

    <Panel title={`Historique ${isScrap ? "ferrailles" : "ordures"} (${filteredEntries.length})`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input aria-label={`Rechercher dans le registre ${kind}`} placeholder={`Rechercher date, matricule, nom, section ou ${isScrap ? "désignation" : "observation"}…`} className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Button type="button" variant="outline" disabled={loading || !entries.length} onClick={printHistory}>
          <Printer className="mr-2 size-4" />
          Imprimer tout l’historique
        </Button>
      </div>
      {!site?.id ? <Empty text="Sélectionnez un site pour consulter le registre." /> : loading
        ? <Empty text="Chargement du registre…" />
        : currentLoadError ? <p className="py-6 text-center text-sm text-destructive">{currentLoadError}</p>
        : !entries.length ? <Empty text="Aucun enregistrement pour ce site." />
          : <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                <tr>{["Date", "Heure", "Prénom", "Matricule", "Section", isScrap ? "Désignation" : "Observation", ...(isScrap ? ["Nombre", "Motif"] : []), "Actions"].map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {filteredEntries.map((entry) => <tr key={entry.id} className="align-top hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-3">{formatDate(entry.date)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heure}</td>
                  <td className="px-3 py-3">{entry.prenom}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.matricule}</td>
                  <td className="px-3 py-3">{entry.section}</td>
                  <td className="whitespace-pre-wrap px-3 py-3">{isScrap ? entry.designation : entry.observation}</td>
                  {isScrap && <><td className="px-3 py-3">{entry.nombre}</td><td className="whitespace-pre-wrap px-3 py-3">{entry.motif}</td></>}
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="icon" aria-label="Imprimer l’enregistrement" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}><Printer className="size-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Modifier l’enregistrement" title="Modifier" onClick={() => editEntry(entry)}><Pencil className="size-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Supprimer l’enregistrement" title="Supprimer" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>)}
                {!filteredEntries.length && <tr><td colSpan={isScrap ? 9 : 7} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun résultat pour cette recherche.</td></tr>}
              </tbody>
            </table>
          </div>}
    </Panel>
  </div>;
}
