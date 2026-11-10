import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, FileDown, FileUp, LogOut, Package, Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type Provider, type SubcontractorMaterialMovement } from "@/lib/service-api";
import { toast } from "sonner";
import { printRecord } from "@/lib/printRecord";
import { confirmDeletion } from "@/lib/deletion-toast";
import { isWithinRegistryPeriod, RegistryPeriodExport } from "@/components/RegistryPeriodExport";
import { RegistryAuditHistory } from "@/components/RegistryAuditHistory";
import { RegistryAttachments } from "@/components/RegistryAttachments";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";

type FormData = { date: string; heureEntree: string; materiels: string; nombre: string; prestataireId: string };
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const currentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};
const blankForm = (): FormData => ({ date: today(), heureEntree: currentTime(), materiels: "", nombre: "1", prestataireId: "" });
const displayDate = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};
const materialHeaders = ["Date", "Heure d'entrée", "Matériels", "Nombre", "Prestataire"];
const excelDate = (value: string) => {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const fr = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(text);
  if (fr) return `${fr[3]}-${fr[2].padStart(2, "0")}-${fr[1].padStart(2, "0")}`;
  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) return new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10);
  return "";
};
const excelTime = (value: string) => {
  const text = value.trim();
  const serial = Number(text);
  if (text && Number.isFinite(serial) && serial >= 0 && serial < 1) {
    const minutes = Math.round(serial * 1440);
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  const match = /^(\d{1,2}):(\d{2})/.exec(text);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
};

export default function MaterielsSousTraitant() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [entries, setEntries] = useState<SubcontractorMaterialMovement[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loadedSiteId, setLoadedSiteId] = useState("");
  const [form, setForm] = useState<FormData>(blankForm);
  const [saving, setSaving] = useState(false);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const loading = Boolean(site?.id) && loadedSiteId !== site?.id;
  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredEntries = entries.filter((entry) => isWithinRegistryPeriod(entry.date, periodStart, periodEnd)
    && [entry.date, displayDate(entry.date), entry.heureEntree, entry.materiels, String(entry.nombre), entry.provider, entry.entreprise, entry.heureSortie ?? ""]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  );

  const resetForm = () => {
    setForm(blankForm());
    setEditingId(null);
    setFormOpen(false);
  };

  useEffect(() => {
    serviceApi.listProviders()
      .then(setProviders)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement des prestataires impossible."));
  }, []);

  useEffect(() => {
    if (!site?.id) { setEntries([]); setLoadedSiteId(""); return; }
    let active = true;
    setLoadedSiteId("");
    const refresh = () => serviceApi.listSubcontractorMaterials(site.id)
      .then((rows) => { if (active) { setEntries(rows); setLoadedSiteId(site.id); } })
      .catch((error) => { if (active) { setEntries([]); setLoadedSiteId(site.id); toast.error(error instanceof Error ? error.message : "Chargement du registre impossible."); } });
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) { toast.error("Sélectionnez un site."); return; }
    const nombre = Number(form.nombre);
    if (!Number.isSafeInteger(nombre) || nombre < 1 || nombre > 1000000) { toast.error("Le nombre doit être un entier positif."); return; }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        heureEntree: form.heureEntree,
        materiels: form.materiels.trim(),
        nombre,
        prestataireId: form.prestataireId,
        providerName: providers.find((provider) => provider.id === form.prestataireId)?.name || "",
        siteId: site.id,
      };
      const entry = editingId
        ? await serviceApi.updateSubcontractorMaterial(editingId, payload)
        : await serviceApi.createSubcontractorMaterial(payload);
      setEntries((current) => editingId
        ? current.map((row) => row.id === entry.id ? entry : row)
        : [entry, ...current]);
      resetForm();
      if (entry.pendingSync) toast.info("Mouvement enregistré sur cet appareil, en attente de synchronisation.");
      else toast.success(editingId ? "Mouvement modifié." : "Entrée du matériel enregistrée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally { setSaving(false); }
  };

  const beginEdit = (entry: SubcontractorMaterialMovement) => {
    setEditingId(entry.id);
    setForm({
      date: entry.date.slice(0, 10),
      heureEntree: entry.heureEntree,
      materiels: entry.materiels,
      nombre: String(entry.nombre),
      prestataireId: entry.providerId,
    });
    setFormOpen(true);
  };

  const deleteEntry = async (entry: SubcontractorMaterialMovement) => {
    if (!site?.id || entry.annuleLe || !(await confirmDeletion(`Annuler le mouvement de ${entry.provider} ? Il restera dans l’historique.`))) return;
    setDeletingId(entry.id);
    try {
      const result = await serviceApi.deleteSubcontractorMaterial(entry.id, site.id);
      setEntries((current) => entry.id.startsWith("pending-")
        ? current.filter((row) => row.id !== entry.id)
        : current.map((row) => row.id === entry.id ? { ...row, annuleLe: result.annuleLe || new Date().toISOString(), pendingSync: Boolean(result.pendingSync) } : row));
      if (editingId === entry.id) resetForm();
      if (entry.id.startsWith("pending-")) toast.info("Entrée non synchronisée supprimée de cet appareil.");
      else if (result.pendingSync) toast.info("Annulation en attente de synchronisation.");
      else toast.success("Mouvement annulé et conservé dans l’historique.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally { setDeletingId(null); }
  };

  const registerExit = async (entry: SubcontractorMaterialMovement) => {
    if (!site?.id) return;
    setExitingId(entry.id);
    try {
      const result = await serviceApi.exitSubcontractorMaterial(entry.id, site.id);
      setEntries((current) => current.map((row) => row.id === entry.id ? { ...row, ...result } : row));
      if (result.pendingSync) toast.info("Sortie enregistrée sur cet appareil, en attente de synchronisation.");
      else toast.success("Heure de sortie enregistrée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de la sortie impossible.");
    } finally { setExitingId(null); }
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre des matériels sous-traitant";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (entry: SubcontractorMaterialMovement) => {
    printRecord("Mouvement matériel sous-traitant", selectedSiteName, [
      ["Date", displayDate(entry.date)],
      ["Heure d’entrée", entry.heureEntree],
      ["Matériels", entry.materiels],
      ["Nombre", String(entry.nombre)],
      ["Prestataire", entry.provider],
      ["Heure de sortie", entry.heureSortie || "—"],
    ]);
  };

  const exportRows = filteredEntries.map((entry) => [entry.date, entry.heureEntree, entry.materiels, entry.nombre, entry.provider]);
  const handleExport = () => {
    if (!filteredEntries.length) { toast.error("Aucun mouvement à exporter."); return; }
    exportXlsx(`registre-materiels-sous-traitant-${today()}.xlsx`, "Materiels sous-traitant", materialHeaders, exportRows);
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    if (!site?.id) { toast.error("Sélectionnez un site avant l’importation."); return; }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalize = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
      const headers = (sheet[0] || []).map(normalize);
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.includes(header));
      const cols = { date: column("date"), time: column("heure d'entree", "heure entree", "heure d'entree du materiel"), materials: column("materiels", "materiel", "designation"), count: column("nombre", "nombre de materiels", "quantite"), provider: column("prestataire", "entreprise") };
      if ([cols.date, cols.time, cols.materials, cols.count, cols.provider].some((index) => index < 0)) {
        throw new Error("Colonnes requises manquantes. Téléchargez le modèle Excel du registre.");
      }
      const data = sheet.slice(1).map((cells, index) => {
        const get = (columnIndex: number) => columnIndex < 0 ? "" : String(cells[columnIndex] ?? "").trim();
        const providerName = get(cols.provider);
        const matches = providers.filter((item) => item.active && normalize(item.name) === normalize(providerName));
        return { line: index + 2, date: excelDate(get(cols.date)), heureEntree: excelTime(get(cols.time)), materiels: get(cols.materials), nombre: Number(get(cols.count)), providerName, provider: matches.length === 1 ? matches[0] : null };
      }).filter((row) => row.date || row.materiels || row.providerName);
      if (!data.length) throw new Error("Le fichier ne contient aucune ligne à importer.");
      let saved = 0;
      let pendingSync = 0;
      const created: SubcontractorMaterialMovement[] = [];
      const failures: string[] = [];
      for (const row of data) {
        if (!row.date || !row.heureEntree || !row.materiels || row.materiels.length > 20000 || !Number.isSafeInteger(row.nombre) || row.nombre < 1 || row.nombre > 1000000 || !row.provider) {
          failures.push(`Ligne ${row.line} : date, heure, matériel, quantité ou prestataire invalide.`);
          continue;
        }
        try {
          const entry = await serviceApi.createSubcontractorMaterial({ date: row.date, heureEntree: row.heureEntree, materiels: row.materiels, nombre: row.nombre, prestataireId: row.provider.id, providerName: row.provider.name, siteId: site.id });
          created.push(entry);
          saved += 1;
          if (entry.pendingSync) pendingSync += 1;
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
        }
      }
      if (created.length) setEntries((current) => [...created.reverse(), ...current]);
      if (failures.length) toast.warning(`${saved} mouvement(s) importé(s), ${failures.length} ligne(s) ignorée(s). ${failures.slice(0, 2).join(" ")}`);
      else toast.success(`${saved} mouvement(s) importé(s).${pendingSync ? ` ${pendingSync} en attente de synchronisation.` : ""}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Importation impossible.");
    } finally {
      setImporting(false);
    }
  };

  return <div className="subcontractor-materials-module space-y-5">
    <PageHeader title="Matériels sous-traitant" subtitle="Enregistrer les entrées de matériel et leur heure de sortie." />
    <div className="max-w-xl">
      <SitePicker id="materiel-sous-traitant-site" value={selectedSiteName} type={site?.type || siteType} sites={sites} canCreate={canCreateSite} onAdd={addSite}
        onChange={(name, type) => { setSiteName(name); setSiteType(type); resetForm(); }} />
      {siteError && <p className="mt-2 text-sm text-destructive">{siteError}</p>}
    </div>
    {entries.some((entry) => entry.pendingSync) && <Panel title="Synchronisation hors ligne">
      <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
        {entries.filter((entry) => entry.pendingSync).map((entry) => <li key={entry.id}>
          {entry.provider || entry.materiels}: {entry.pendingSyncError || (entry.pendingSyncStatus === "pending" ? "en attente de synchronisation" : "à vérifier")}
        </li>)}
      </ul>
    </Panel>}

    <div className="flex justify-end"><Button type="button" onClick={() => { setEditingId(null); setForm(blankForm()); setFormOpen(true); }} disabled={!site?.id}><Plus className="mr-2 size-4" />Nouvelle entrée</Button></div>
    <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="subcontractor-materials-entry-modal">
    <section className="subcontractor-materials-form-card">
      <DialogHeader className="subcontractor-materials-modal-header"><span className="subcontractor-materials-modal-icon"><Package className="size-5" /></span><div><DialogTitle>{editingId ? "Modifier le mouvement" : "Nouvelle entrée de matériel"}</DialogTitle><DialogDescription>Renseignez le matériel, la quantité et le prestataire concerné.</DialogDescription></div></DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="subcontractor-materials-form space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="materiel-date">Date</Label><Input id="materiel-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="materiel-heure-entree">Heure d’entrée</Label><Input id="materiel-heure-entree" type="time" required value={form.heureEntree} onChange={(event) => setForm({ ...form, heureEntree: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="materiel-nombre">Nombre de matériels</Label><Input id="materiel-nombre" type="number" min="1" max="1000000" step="1" required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="materiel-description">Matériels</Label><Input id="materiel-description" required maxLength={20000} placeholder="Désignation des matériels" value={form.materiels} onChange={(event) => setForm({ ...form, materiels: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="materiel-prestataire">Prestataire</Label><select id="materiel-prestataire" required value={form.prestataireId} onChange={(event) => setForm({ ...form, prestataireId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner un prestataire</option>{providers.filter((provider) => provider.active || provider.id === form.prestataireId).map((provider) => <option key={provider.id} value={provider.id}>{provider.name}{provider.active ? "" : " (inactif)"}</option>)}</select></div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          {editingId && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 size-4" />Annuler</Button>}
          <Button type="submit" disabled={saving || !site?.id || !providers.some((provider) => provider.active || provider.id === form.prestataireId)}>{editingId ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}{saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer l’entrée"}</Button>
        </div>
      </form>
    </section><DialogFooter className="subcontractor-materials-modal-footer"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Fermer</Button></DialogFooter></DialogContent></Dialog>

    <section id="subcontractor-materials-print-area" className="subcontractor-materials-registry">
    <Panel title="Registre des matériels sous-traitant">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 subcontractor-materials-screen">
        <div className="relative min-w-[260px] flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Rechercher un mouvement de matériel sous-traitant"
            placeholder="Rechercher date, matériel, prestataire, nombre ou heure…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-11 pl-9"
          />
        </div>
        <div className="subcontractor-materials-actions print:hidden">
          <label className={`subcontractor-materials-import ${!site?.id || importing ? "pointer-events-none opacity-50" : ""}`}>
            <FileUp aria-hidden="true" className="size-4 shrink-0" />{importing ? "Importation…" : "Importer Excel / CSV"}
            <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!site?.id || importing} onChange={(event) => { void handleImport(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          </label>
          <Button type="button" variant="outline" disabled={loading || !filteredEntries.length} onClick={handleExport}><Download className="mr-2 size-4" />Exporter Excel</Button>
          <Button type="button" variant="outline" onClick={() => exportXlsx("modele-materiels-sous-traitant.xlsx", "Materiels sous-traitant", materialHeaders, [])}><FileDown className="mr-2 size-4" />Modèle Excel</Button>
        </div>
        <RegistryPeriodExport from={periodStart} to={periodEnd} onFromChange={setPeriodStart} onToChange={setPeriodEnd} records={filteredEntries} filename="materiels-sous-traitants" columns={[
          { label: "Date", value: (row) => row.date }, { label: "Heure entrée", value: (row) => row.heureEntree },
          { label: "Matériel", value: (row) => row.materiels }, { label: "Nombre", value: (row) => row.nombre },
          { label: "Prestataire", value: (row) => row.provider }, { label: "Heure sortie", value: (row) => row.heureSortie }, { label: "Annulé le", value: (row) => row.annuleLe },
        ]} />
        <Button type="button" variant="outline" className="subcontractor-materials-print-button print:hidden" disabled={loading || !entries.length} onClick={handlePrint}>
          <Printer className="mr-2 size-4" /> Imprimer le registre
        </Button>
      </div>
      {loading ? <div className="subcontractor-materials-screen"><Empty text="Chargement du registre…" /></div> : entries.length === 0 ? <div className="subcontractor-materials-screen"><Empty text="Aucun matériel enregistré sur ce site." /></div> : (
        <div className="subcontractor-materials-table-wrap overflow-x-auto rounded-lg border subcontractor-materials-screen"><table className="subcontractor-materials-table w-full min-w-[900px] text-left text-sm">
          <thead className="subcontractor-materials-table-head bg-muted/70 text-xs uppercase text-muted-foreground"><tr>
            {["Date", "Heure d’entrée", "Matériels", "Nombre", "Prestataire", "Heure de sortie", "Actions"].map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-border/70">{filteredEntries.map((entry) => <tr key={entry.id} className={`subcontractor-materials-table-row align-top ${entry.annuleLe ? "subcontractor-materials-table-row--cancelled" : entry.pendingSync ? "subcontractor-materials-table-row--pending" : entry.heureSortie ? "subcontractor-materials-table-row--exited" : ""}`}>
            <td className="whitespace-nowrap px-3 py-3">{displayDate(entry.date)}{entry.annuleLe && <span className="ml-1 text-destructive">(annulé)</span>}</td>
            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureEntree}</td>
            <td className="whitespace-pre-wrap break-words px-3 py-3">{entry.materiels}</td>
            <td className="px-3 py-3 text-center">{entry.nombre}</td>
            <td className="break-words px-3 py-3">{entry.provider}</td>
            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie || "—"}</td>
            <td className="px-3 py-3"><div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Imprimer le mouvement" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}><Printer className="size-4" /></Button>
              {!entry.annuleLe && <Button type="button" variant="ghost" size="icon" disabled={entry.pendingSync} aria-label="Modifier le mouvement" title="Modifier après synchronisation" onClick={() => beginEdit(entry)}><Pencil className="size-4" /></Button>}
              {!entry.annuleLe && <Button type="button" variant="ghost" size="icon" aria-label="Annuler le mouvement" title={entry.id.startsWith("pending-") ? "Supprimer l’entrée non synchronisée" : "Annuler"} className="text-destructive hover:text-destructive" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}><Trash2 className="size-4" /></Button>}
              {!entry.id.startsWith("pending-") && <RegistryAuditHistory entity="materiel_sous_traitant" recordId={entry.id} />}
              {!entry.id.startsWith("pending-") && <RegistryAttachments entity="materiel_sous_traitant" recordId={entry.id} siteId={site?.id} />}
              {!entry.annuleLe && !entry.heureSortie && <Button type="button" variant="outline" size="sm" className="subcontractor-materials-exit-button" disabled={exitingId === entry.id || entry.id.startsWith("pending-")} onClick={() => void registerExit(entry)}><LogOut className="mr-2 size-4" />{exitingId === entry.id ? "Sortie…" : entry.id.startsWith("pending-") ? "À synchroniser" : "Sortie"}</Button>}
              {entry.heureSortie && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Package className="size-3" />Sorti</span>}
            </div></td>
          </tr>)}
          {!filteredEntries.length && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun mouvement ne correspond à votre recherche.</td></tr>}
          </tbody>
        </table></div>
      )}
      {!loading && (
        <div className="subcontractor-materials-print hidden">
          <h1 className="mb-1 text-xl font-bold">Registre des matériels sous-traitant</h1>
          <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
          <table>
            <thead>
              <tr>{["Date", "Heure d’entrée", "Matériels", "Nombre", "Entreprise", "Heure de sortie"].map((heading) => <th key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{displayDate(entry.date)}</td>
                  <td>{entry.heureEntree || "—"}</td>
                  <td>{entry.materiels || "—"}</td>
                  <td>{entry.nombre}</td>
                  <td>{entry.entreprise || "—"}</td>
                  <td>{entry.heureSortie || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
    </section>
    <style>{`
      @media print {
        @page { size: landscape; margin: 12mm; }
        body * { visibility: hidden !important; }
        #subcontractor-materials-print-area, #subcontractor-materials-print-area * { visibility: visible !important; }
        #subcontractor-materials-print-area {
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          width: 100% !important;
        }
        .subcontractor-materials-screen { display: none !important; }
        .subcontractor-materials-print { display: block !important; }
        .subcontractor-materials-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        .subcontractor-materials-print th, .subcontractor-materials-print td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; white-space: pre-wrap; }
        .subcontractor-materials-print th { background: #eee !important; print-color-adjust: exact; }
      }
    `}</style>
  </div>;
}
