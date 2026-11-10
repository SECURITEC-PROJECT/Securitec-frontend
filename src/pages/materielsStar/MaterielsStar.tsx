import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, FileDown, FileUp, LogOut, Package, Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type Provider, type StarMaterialEntry, type StarMaterialItem } from "@/lib/service-api";
import { printRecord } from "@/lib/printRecord";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { isWithinRegistryPeriod, RegistryPeriodExport } from "@/components/RegistryPeriodExport";
import { RegistryAuditHistory } from "@/components/RegistryAuditHistory";
import { RegistryAttachments } from "@/components/RegistryAttachments";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";

type MaterialForm = {
  date: string;
  heureEntree: string;
  prenom: string;
  matricule: string;
  prestataireId: string;
  items: Array<{ designation: string; nombre: string }>;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (): MaterialForm => ({
  date: today(),
  heureEntree: currentTime(),
  prenom: "",
  matricule: "",
  prestataireId: "",
  items: [{ designation: "", nombre: "1" }],
});

const displayDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value?.slice(0, 10) || "")) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const formatItems = (items: StarMaterialItem[]) =>
  items.map((item) => `${item.designation} × ${item.nombre}`).join(", ");

export default function MaterielsStar() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [registry, setRegistry] = useState<{ siteId: string; entries: StarMaterialEntry[]; error: string }>({
    siteId: "",
    entries: [],
    error: "",
  });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState<MaterialForm>(emptyForm);
  const [editing, setEditing] = useState<StarMaterialEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const entries = registry.siteId === site?.id ? registry.entries : [];
  const error = registry.siteId === site?.id ? registry.error : "";
  const loading = Boolean(site?.id) && registry.siteId !== site?.id;
  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredEntries = entries.filter((entry) => isWithinRegistryPeriod(entry.date, periodStart, periodEnd)
    && [
      entry.date,
      displayDate(entry.date),
      entry.heureEntree,
      entry.prenom,
      entry.matricule,
      entry.provider,
      formatItems(entry.items),
      entry.heureSortie ?? "",
    ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().includes(normalizedSearch),
  );
  const spreadsheetHeaders = ["Date", "Heure entrée", "Prénom", "Matricule", "Prestataire", "Matériel", "Nombre"];
  const spreadsheetRows = filteredEntries.flatMap((entry) => entry.items.map((item) => [entry.date, entry.heureEntree, entry.prenom, entry.matricule, entry.provider, item.designation, item.nombre]));

  useEffect(() => {
    serviceApi.listProviders()
      .then(setProviders)
      .catch((reason) => toast.error(reason instanceof Error ? reason.message : "Chargement des prestataires impossible."));
  }, []);

  useEffect(() => {
    if (!site?.id) return;
    let active = true;
    const refresh = () => serviceApi.listStarMaterials(site.id)
      .then((rows) => {
        if (active) setRegistry({ siteId: site.id, entries: rows, error: "" });
      })
      .catch((reason) => {
        if (active) setRegistry({
          siteId: site.id,
          entries: [],
          error: reason instanceof Error ? reason.message : "Chargement du registre impossible.",
        });
      });
    const onQueueChanged = () => { void refresh(); };
    window.addEventListener("online", onQueueChanged);
    window.addEventListener("securitec-offline-queue-changed", onQueueChanged);
    void refresh();
    return () => {
      active = false;
      window.removeEventListener("online", onQueueChanged);
      window.removeEventListener("securitec-offline-queue-changed", onQueueChanged);
    };
  }, [site?.id]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
    setFormOpen(false);
  };

  const updateItem = (index: number, field: "designation" | "nombre", value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    const items = form.items.map((item) => ({ designation: item.designation.trim(), nombre: Number(item.nombre) }));
    if (items.length < 1 || items.length > 100 || items.some((item) =>
      !item.designation || !Number.isSafeInteger(item.nombre) || item.nombre < 1 || item.nombre > 1000000,
    )) {
      toast.error("Renseignez chaque matériel et un nombre entier positif (maximum 1 000 000).");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        heureEntree: form.heureEntree,
        prenom: form.prenom.trim(),
        matricule: form.matricule.trim(),
        prestataireId: form.prestataireId,
        providerName: providers.find((provider) => provider.id === form.prestataireId)?.name || "",
        siteName: selectedSiteName,
        items,
        siteId: site.id,
      };
      const entry = editing
        ? await serviceApi.updateStarMaterial(editing.id, payload)
        : await serviceApi.createStarMaterial(payload);
      setRegistry((current) => ({
        siteId: site.id,
        entries: editing
          ? current.entries.map((row) => row.id === entry.id ? entry : row)
          : [entry, ...current.entries],
        error: "",
      }));
      resetForm();
      if (entry.pendingSync) toast.info("Mouvement enregistré sur cet appareil, en attente de synchronisation.");
      else toast.success(editing ? "Mouvement modifié." : "Entrée de matériel enregistrée.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (entry: StarMaterialEntry) => {
    setEditing(entry);
    setFormOpen(true);
    setForm({
      date: entry.date.slice(0, 10),
      heureEntree: entry.heureEntree,
      prenom: entry.prenom,
      matricule: entry.matricule,
      prestataireId: entry.providerId,
      items: entry.items.map((item) => ({ designation: item.designation, nombre: String(item.nombre) })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const importMaterials = async (file?: File) => {
    if (!file) return;
    if (!site?.id) { toast.error("Sélectionnez un site avant l’importation."); return; }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalizeHeader = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]/g, "");
      const headers = (sheet[0] || []).map(normalizeHeader);
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias)));
      const cols = {
        date: column("Date"), time: column("Heure entrée", "Heure d’entrée", "Heure"), firstName: column("Prénom", "Nom"),
        matricule: column("Matricule"), provider: column("Prestataire", "Fournisseur"), material: column("Matériel", "Désignation", "Designation"), count: column("Nombre", "Quantité", "Quantite"),
      };
      if ([cols.date, cols.time, cols.firstName, cols.matricule, cols.provider, cols.material, cols.count].some((index) => index < 0)) {
        throw new Error("Colonnes requises manquantes. Téléchargez le modèle Excel Matériels STAR.");
      }
      const get = (cells: string[], index: number) => String(cells[index] ?? "").trim();
      const parseDate = (value: string) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const french = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(value);
        if (french) return `${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`;
        const serial = Number(value);
        return Number.isFinite(serial) && serial > 20000 && serial < 80000 ? new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10) : "";
      };
      const parseTime = (value: string) => {
        const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value);
        if (match) return `${match[1].padStart(2, "0")}:${match[2]}`;
        const fraction = Number(value);
        if (Number.isFinite(fraction) && fraction >= 0 && fraction < 1) {
          const minutes = Math.round(fraction * 1440);
          return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        }
        return "";
      };
      const rows = sheet.slice(1).map((cells, index) => {
        const providerText = get(cells, cols.provider);
        const provider = providers.find((item) => item.id.toLocaleLowerCase() === providerText.toLocaleLowerCase() || item.name.trim().toLocaleLowerCase() === providerText.toLocaleLowerCase());
        const count = Number(get(cells, cols.count));
        return { line: index + 2, date: parseDate(get(cells, cols.date)), time: parseTime(get(cells, cols.time)), firstName: get(cells, cols.firstName), matricule: get(cells, cols.matricule), provider, material: get(cells, cols.material), count };
      }).filter((row) => row.date || row.matricule || row.material);
      if (!rows.length) throw new Error("Le fichier ne contient aucune ligne à importer.");
      const grouped = new Map<string, { rows: typeof rows; firstLine: number }>();
      const failures: string[] = [];
      for (const row of rows) {
        if (!row.date || !row.time || !row.firstName || !row.matricule || !row.provider || !row.material || !Number.isSafeInteger(row.count) || row.count < 1 || row.count > 1000000) {
          failures.push(`Ligne ${row.line} : date, heure, prénom, matricule, prestataire, matériel ou nombre invalide.`);
          continue;
        }
        const key = [row.date, row.time, row.matricule.toLocaleLowerCase(), row.provider.id].join("|");
        const group = grouped.get(key) || { rows: [], firstLine: row.line };
        group.rows.push(row);
        grouped.set(key, group);
      }
      const created: StarMaterialEntry[] = [];
      for (const group of grouped.values()) {
        const first = group.rows[0];
        try {
          created.push(await serviceApi.createStarMaterial({
            date: first.date, heureEntree: first.time, prenom: first.firstName, matricule: first.matricule,
            prestataireId: first.provider!.id, providerName: first.provider!.name, siteName: selectedSiteName,
            siteId: site.id, items: group.rows.map((row) => ({ designation: row.material, nombre: row.count })),
          }));
        } catch (reason) {
          failures.push(`Ligne ${group.firstLine} : ${reason instanceof Error ? reason.message : "enregistrement impossible"}`);
        }
      }
      if (created.length) setRegistry((current) => ({ siteId: site.id, error: "", entries: [...created.reverse(), ...(current.siteId === site.id ? current.entries : [])] }));
      if (failures.length) toast.warning(`${created.length} mouvement(s) importé(s), ${failures.length} ligne(s) ignorée(s). ${failures.slice(0, 2).join(" ")}`);
      else toast.success(`${created.length} mouvement(s) importé(s).`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Importation impossible.");
    } finally {
      setImporting(false);
    }
  };

  const registerExit = async (entry: StarMaterialEntry) => {
    if (!site?.id) return;
    setExitingId(entry.id);
    try {
      const result = await serviceApi.exitStarMaterial(entry.id, site.id);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.map((row) => row.id === entry.id ? { ...row, ...result } : row),
      }));
      if (result.pendingSync) toast.info("Sortie enregistrée sur cet appareil, en attente de synchronisation.");
      else toast.success(`Heure de sortie enregistrée pour ${entry.prenom}.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Impossible d’enregistrer la sortie.");
    } finally {
      setExitingId(null);
    }
  };

  const deleteEntry = async (entry: StarMaterialEntry) => {
    if (!site?.id || (!entry.heureSortie && !entry.id.startsWith("pending-")) || entry.annuleLe) return;
    const confirmation = entry.id.startsWith("pending-")
      ? `Supprimer l’entrée non synchronisée de ${entry.prenom} (${entry.matricule}) de cet appareil ?`
      : `Annuler le mouvement de ${entry.prenom} (${entry.matricule}) ? Il restera dans l’historique.`;
    if (!(await confirmDeletion(confirmation))) return;
    setDeletingId(entry.id);
    try {
      const result = await serviceApi.deleteStarMaterial(entry.id, site.id);
      setRegistry((current) => ({
        ...current,
        entries: entry.id.startsWith("pending-")
          ? current.entries.filter((row) => row.id !== entry.id)
          : current.entries.map((row) => row.id === entry.id ? { ...row, annuleLe: result.annuleLe || new Date().toISOString(), pendingSync: Boolean(result.pendingSync) } : row),
      }));
      if (editing?.id === entry.id) resetForm();
      if (entry.id.startsWith("pending-")) toast.info("Entrée non synchronisée supprimée de cet appareil.");
      else if (result.pendingSync) toast.info("Annulation en attente de synchronisation.");
      else toast.success("Mouvement annulé et conservé dans l’historique.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const printEntry = (entry: StarMaterialEntry) => {
    printRecord("Mouvement matériel Star", selectedSiteName, [
      ["Date", displayDate(entry.date)],
      ["Heure d’entrée", entry.heureEntree],
      ["Prénom", entry.prenom],
      ["Matricule", entry.matricule],
      ["Prestataire", entry.provider],
      ["Matériels", formatItems(entry.items)],
      ["Heure de sortie", entry.heureSortie || "—"],
    ]);
  };

  const printRegistry = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre des matériels Star";
    window.addEventListener("afterprint", () => { window.document.title = originalTitle; }, { once: true });
    window.print();
  };

  return (
    <div className="star-materials-module space-y-5">
      <PageHeader title="Matériels Star" subtitle="Suivi des entrées et sorties de matériels Star."
        action={<Button type="button" disabled={!site?.id || loading} onClick={() => { resetForm(); setFormOpen(true); }}><Plus className="mr-2 size-4" />Nouvelle entrée</Button>} />
      <div className="max-w-xl">
        <SitePicker
          id="materiels-star-site"
          value={selectedSiteName}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => { setSiteName(name); setSiteType(type); resetForm(); }}
        />
      </div>
      {(error || siteError) && (
        <Panel title="Erreur de chargement">
          <p className="text-sm text-destructive">{error || siteError}</p>
        </Panel>
      )}
      {entries.some((entry) => entry.pendingSync) && <Panel title="Synchronisation hors ligne">
        <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
          {entries.filter((entry) => entry.pendingSync).map((entry) => <li key={entry.id}>
            {entry.prenom || entry.matricule}: {entry.pendingSyncError || (entry.pendingSyncStatus === "pending" ? "en attente de synchronisation" : "à vérifier")}
          </li>)}
        </ul>
      </Panel>}
      {!loading && (
        <>
          <div className={`star-materials-entry-shell ${formOpen ? "is-open" : ""}`} aria-hidden={!formOpen} role={formOpen ? "dialog" : undefined} aria-modal={formOpen ? true : undefined} aria-label={editing ? "Modifier un mouvement matériel STAR" : "Nouvelle entrée de matériel STAR"}>
          <button type="button" className="star-materials-modal-close" aria-label="Fermer le formulaire" onClick={() => setFormOpen(false)}>×</button>
          <Panel title={editing ? "Modifier un mouvement" : "Enregistrer une entrée de matériel"}>
            <form className="star-materials-form space-y-5" onSubmit={(event) => void submit(event)}>
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-date">Date</Label>
                  <Input id="star-material-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-time-in">Heure d’entrée</Label>
                  <Input id="star-material-time-in" type="time" required value={form.heureEntree} onChange={(event) => setForm({ ...form, heureEntree: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-firstname">Prénom</Label>
                  <Input id="star-material-firstname" required maxLength={255} value={form.prenom} onChange={(event) => setForm({ ...form, prenom: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-id">Matricule</Label>
                  <Input id="star-material-id" required maxLength={100} value={form.matricule} onChange={(event) => setForm({ ...form, matricule: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-provider">Prestataire</Label>
                  <select id="star-material-provider" required value={form.prestataireId} onChange={(event) => setForm({ ...form, prestataireId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Sélectionner un prestataire</option>
                    {providers.filter((provider) => provider.active || provider.id === form.prestataireId).map((provider) => <option key={provider.id} value={provider.id}>{provider.name}{provider.active ? "" : " (inactif)"}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label>Matériels et nombres</Label>
                  <Button type="button" variant="outline" size="sm" disabled={form.items.length >= 100} onClick={() => setForm((current) => ({ ...current, items: [...current.items, { designation: "", nombre: "1" }] }))}>
                    <Plus className="mr-2 size-4" /> Ajouter un matériel
                  </Button>
                </div>
                {form.items.map((item, index) => (
                  <div key={index} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor={`star-material-name-${index}`}>Matériel {index + 1}</Label>
                      <Input id={`star-material-name-${index}`} required maxLength={255} placeholder="Désignation du matériel" value={item.designation} onChange={(event) => updateItem(index, "designation", event.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`star-material-count-${index}`}>Nombre</Label>
                      <Input id={`star-material-count-${index}`} type="number" min="1" max="1000000" step="1" required value={item.nombre} onChange={(event) => updateItem(index, "nombre", event.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" size="icon" aria-label={`Retirer le matériel ${index + 1}`} disabled={form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {!site?.id && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un mouvement.</p>}
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {editing && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 size-4" /> Annuler</Button>}
                <Button type="submit" disabled={saving || !site?.id || !providers.some((provider) => provider.active || provider.id === form.prestataireId)}>
                  {editing ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
                  {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Enregistrer l’entrée"}
                </Button>
              </div>
            </form>
          </Panel>
          </div>

          <section id="star-materials-print-area" className="star-materials-registry">
            <Panel title="Registre des matériels Star">
              <div className="star-materials-toolbar mb-4 flex flex-wrap items-center justify-between gap-3 star-materials-screen">
                <div className="relative min-w-[260px] flex-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="Rechercher un mouvement de matériel Star" placeholder="Rechercher date, prénom, matricule, matériel ou heure…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 pl-9" />
                </div>
                <div className="star-materials-actions">
                  <label className={`star-materials-import ${!site?.id || loading || importing ? "is-disabled" : ""}`}>
                    <FileUp className="size-4" />{importing ? "Importation…" : "Importer Excel / CSV"}
                    <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!site?.id || loading || importing} onChange={(event) => { void importMaterials(event.target.files?.[0]); event.currentTarget.value = ""; }} />
                  </label>
                  <Button type="button" variant="outline" onClick={() => exportXlsx("modele-materiels-star.xlsx", "Matériels STAR", spreadsheetHeaders, [])}>
                    <FileDown className="mr-2 size-4" />Modèle Excel
                  </Button>
                  <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={() => exportXlsx(`materiels-star-${today()}.xlsx`, "Matériels STAR", spreadsheetHeaders, spreadsheetRows)}>
                    <Download className="mr-2 size-4" />Exporter Excel
                  </Button>
                </div>
                <RegistryPeriodExport from={periodStart} to={periodEnd} onFromChange={setPeriodStart} onToChange={setPeriodEnd} records={filteredEntries} filename="materiels-star" columns={[
                  { label: "Date", value: (row) => row.date }, { label: "Heure entrée", value: (row) => row.heureEntree },
                  { label: "Prénom", value: (row) => row.prenom }, { label: "Matricule", value: (row) => row.matricule },
                  { label: "Prestataire", value: (row) => row.provider }, { label: "Matériels", value: (row) => formatItems(row.items) },
                  { label: "Heure sortie", value: (row) => row.heureSortie }, { label: "Annulé le", value: (row) => row.annuleLe },
                ]} />
                <Button type="button" variant="outline" className="print:hidden" disabled={!entries.length} onClick={printRegistry}>
                  <Printer className="mr-2 size-4" /> Imprimer le registre
                </Button>
              </div>
              {loading ? <div className="star-materials-screen"><Empty text="Chargement du registre…" /></div> : entries.length ? (
                <>
                  <div className="star-materials-table-wrap overflow-x-auto rounded-lg border star-materials-screen">
                    <table className="star-materials-table w-full min-w-[1050px] text-left text-sm">
                      <thead className="star-materials-table-head bg-muted/70 text-xs uppercase text-muted-foreground">
                          <tr>{["Date", "Heure d’entrée", "Prénom", "Matricule", "Prestataire", "Matériels / nombre", "Heure de sortie", "Actions"].map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id} className={`star-materials-table-row align-top transition-colors hover:bg-muted/30 ${entry.annuleLe ? "text-muted-foreground" : ""}`}>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{displayDate(entry.date)}{entry.annuleLe && <span className="ml-1 font-sans text-destructive">(annulé)</span>}</td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureEntree}</td>
                            <td className="px-3 py-3 font-medium">{entry.prenom}</td>
                            <td className="px-3 py-3 font-mono text-xs">{entry.matricule}</td>
                            <td className="px-3 py-3">{entry.provider}</td>
                            <td className="whitespace-pre-wrap px-3 py-3">{entry.items.map((item) => `${item.designation} — ${item.nombre}`).join("\n")}</td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie || "—"}</td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon" aria-label="Imprimer ce mouvement" title="Imprimer" onClick={() => printEntry(entry)}><Printer className="size-4" /></Button>
                                {!entry.annuleLe && <Button type="button" variant="ghost" size="icon" disabled={entry.pendingSync} aria-label="Modifier le mouvement" title="Modifier après synchronisation" onClick={() => beginEdit(entry)}><Pencil className="size-4" /></Button>}
                                {!entry.annuleLe && <Button type="button" variant="ghost" size="icon" aria-label="Annuler le mouvement" title={entry.id.startsWith("pending-") ? "Supprimer l’entrée non synchronisée" : entry.heureSortie ? "Annuler" : "Enregistrez d’abord la sortie pour annuler"} className="text-destructive hover:text-destructive" disabled={(!entry.heureSortie && !entry.id.startsWith("pending-")) || deletingId === entry.id} onClick={() => void deleteEntry(entry)}><Trash2 className="size-4" /></Button>}
                                {!entry.id.startsWith("pending-") && <RegistryAuditHistory entity="materiel_star" recordId={entry.id} />}
                                {!entry.id.startsWith("pending-") && <RegistryAttachments entity="materiel_star" recordId={entry.id} siteId={site?.id} />}
                                {!entry.annuleLe && !entry.heureSortie && <Button type="button" variant="outline" size="sm" disabled={exitingId === entry.id || entry.id.startsWith("pending-")} onClick={() => void registerExit(entry)}><LogOut className="mr-2 size-4" />{exitingId === entry.id ? "Sortie…" : entry.id.startsWith("pending-") ? "À synchroniser" : "Sortie"}</Button>}
                                {entry.heureSortie && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Package className="size-3" />Sorti</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filteredEntries.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun mouvement ne correspond à votre recherche.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <div className="star-materials-screen"><Empty text="Aucun matériel Star enregistré sur ce site." /></div>}
              {!loading && (
                <div className="star-materials-print hidden">
                  <h1 className="mb-1 text-xl font-bold">Registre des matériels Star</h1>
                  <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
                  <table>
                    <thead><tr>{["Date", "Heure d’entrée", "Prénom", "Matricule", "Prestataire", "Matériels / nombre", "Heure de sortie"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
                    <tbody>{filteredEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{displayDate(entry.date)}</td><td>{entry.heureEntree}</td><td>{entry.prenom}</td><td>{entry.matricule}</td><td>{entry.provider}</td>
                        <td>{entry.items.map((item) => `${item.designation} — ${item.nombre}`).join("\n")}</td><td>{entry.heureSortie || "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Panel>
          </section>
        </>
      )}
      {loading && <Panel title="Chargement du registre"><p className="text-sm text-muted-foreground">Chargement des mouvements…</p></Panel>}
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #star-materials-print-area, #star-materials-print-area * { visibility: visible !important; }
          #star-materials-print-area { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; }
          .star-materials-screen { display: none !important; }
          .star-materials-print { display: block !important; }
          .star-materials-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .star-materials-print th, .star-materials-print td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; white-space: pre-wrap; }
          .star-materials-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
