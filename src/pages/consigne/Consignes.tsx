import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { ClipboardList, Download, FileDown, FileUp, Pencil, Plus, Printer, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";

type ConsigneForm = { date: string; heure: string; consigne: string; emetteur: string; destinataire: string; dateFin: string; jusquauNouvelOrdre: boolean; posteIds: string[] };
type ReadStatus = { posteId: string; posteNom: string; readAt: string | null; reader: string | null; readers?: { name: string; readAt: string }[] };
type ConsigneEntry = ConsigneForm & { id: string; createdAt?: string; posteId?: string | null; posteNom?: string | null; tousPostes?: boolean; lectures?: ReadStatus[] };

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const currentTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const blankForm = (): ConsigneForm => ({ date: today(), heure: currentTime(), consigne: "", emetteur: "", destinataire: "", dateFin: today(), jusquauNouvelOrdre: false, posteIds: [] });
const consigneHeaders = ["Date d'effet", "Heure", "Émetteur", "Destinataire", "Postes visés", "Consigne", "Valable jusqu'au", "Jusqu'au nouvel ordre"];
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

export default function Consignes() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [form, setForm] = useState<ConsigneForm>(blankForm);
  const [entries, setEntries] = useState<ConsigneEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<{ id: string; nom: string }[]>([]);

  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredEntries = entries.filter((entry) =>
    [entry.date, entry.heure, entry.emetteur, entry.destinataire, entry.consigne, entry.dateFin,
      ...(entry.posteIds || []).map((id) => posts.find((post) => post.id === id)?.nom || id),
      ...(entry.lectures || []).map((receipt) => `${receipt.posteNom} ${receipt.reader || ""}`),
      entry.jusquauNouvelOrdre ? "jusqu'au nouvel ordre" : ""]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  );

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [siteId, sites]);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    setLoading(true);
    serviceApi.listJournalConsignes(siteId)
      .then((rows) => { if (active) setEntries(rows as ConsigneEntry[]); })
      .catch((error) => { if (active) toast.error(error instanceof Error ? error.message : "Chargement des consignes impossible."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [siteId, reloadKey]);

  useEffect(() => {
    let active = true;
    if (!siteId) { setPosts([]); return () => { active = false; }; }
    serviceApi.listShiftPosts(siteId).then((rows) => { if (active) setPosts(rows); })
      .catch(() => { if (active) setPosts([]); });
    return () => { active = false; };
  }, [siteId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) { toast.error("Sélectionnez un site."); return; }
    setSaving(true);
    try {
      if (editingId) {
        const entry = await serviceApi.updateJournalConsigne(editingId, { ...form, tousPostes: form.posteIds.length === 0, siteId });
        setEntries((current) => current.map((row) => row.id === editingId ? entry as ConsigneEntry : row));
        setEditingId(null);
        toast.success("Consigne modifiée.");
      } else {
        const entry = await serviceApi.createJournalConsigne({ ...form, tousPostes: form.posteIds.length === 0, siteId });
        setEntries((current) => [entry as ConsigneEntry, ...current]);
        toast.success("Consigne enregistrée.");
      }
      setForm(blankForm());
      setFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de la consigne impossible.");
    } finally { setSaving(false); }
  };

  const editEntry = (entry: ConsigneEntry) => {
    setEditingId(entry.id);
    setForm({
      date: String(entry.date).slice(0, 10),
      heure: entry.heure || "",
      consigne: entry.consigne,
      emetteur: entry.emetteur,
      destinataire: entry.destinataire,
      dateFin: String(entry.dateFin || entry.date).slice(0, 10),
      jusquauNouvelOrdre: entry.jusquauNouvelOrdre === true,
      posteIds: entry.tousPostes ? [] : entry.posteIds || (entry.posteId ? [entry.posteId] : []),
    });
    setFormOpen(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm());
    setFormOpen(false);
  };

  const deleteEntry = async (entry: ConsigneEntry) => {
    if (!siteId || !(await confirmDeletion("Supprimer cette consigne ? Cette action est définitive."))) return;
    try {
      await serviceApi.deleteJournalConsigne(entry.id, siteId);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editingId === entry.id) cancelEdit();
      toast.success("Consigne supprimée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression de la consigne impossible.");
    }
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre des consignes";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const exportRows = filteredEntries.map((entry) => [
    entry.date, entry.heure, entry.emetteur, entry.destinataire,
    entry.tousPostes ? "Tous les postes" : (entry.posteIds || []).map((id) => posts.find((post) => post.id === id)?.nom || id).join(", "),
    entry.consigne, entry.jusquauNouvelOrdre ? "" : entry.dateFin || entry.date, entry.jusquauNouvelOrdre ? "Oui" : "Non",
  ]);

  const handleExport = () => {
    if (!filteredEntries.length) { toast.error("Aucune consigne à exporter."); return; }
    exportXlsx(`registre-consignes-${today()}.xlsx`, "Consignes", consigneHeaders, exportRows);
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    if (!siteId) { toast.error("Sélectionnez un site avant l’importation."); return; }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalize = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
      const headers = (sheet[0] || []).map(normalize);
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.includes(header));
      const cols = {
        date: column("date d'effet", "date effet", "date"), time: column("heure"), sender: column("emetteur"), recipient: column("destinataire"),
        posts: column("postes vises", "postes", "poste"), message: column("consigne", "instruction"),
        endDate: column("valable jusqu'au", "valable jusqu au", "date fin", "date de fin"), untilOrder: column("jusqu'au nouvel ordre", "jusqu au nouvel ordre", "jusqu'a nouvel ordre"),
      };
      if ([cols.date, cols.sender, cols.recipient, cols.message].some((index) => index < 0)) {
        throw new Error("Colonnes requises manquantes : Date d’effet, Émetteur, Destinataire et Consigne.");
      }
      const data = sheet.slice(1).map((cells, index) => {
        const get = (columnIndex: number) => columnIndex < 0 ? "" : String(cells[columnIndex] ?? "").trim();
        const untilValue = normalize(get(cols.untilOrder));
        const untilOrder = ["oui", "yes", "true", "1", "x"].includes(untilValue);
        const rawPosts = get(cols.posts);
        const postNames = rawPosts.split(/[;,|]/).map((name) => name.trim()).filter(Boolean);
        const posteIds = postNames.flatMap((name) => {
          if (normalize(name) === "tous les postes" || normalize(name) === "tous") return [];
          const match = posts.find((post) => normalize(post.nom) === normalize(name));
          return match ? [match.id] : ["?" + name];
        });
        return { line: index + 2, date: excelDate(get(cols.date)) || today(), heure: excelTime(get(cols.time)) || currentTime(), emetteur: get(cols.sender), destinataire: get(cols.recipient), consigne: get(cols.message), dateFin: untilOrder ? "" : excelDate(get(cols.endDate)) || excelDate(get(cols.date)) || today(), jusquauNouvelOrdre: untilOrder, posteIds };
      }).filter((row) => row.emetteur || row.destinataire || row.consigne);
      if (!data.length) throw new Error("Le fichier ne contient aucune ligne à importer.");
      let saved = 0;
      const failures: string[] = [];
      for (const row of data) {
        if (!row.emetteur || !row.destinataire || !row.consigne || (!row.jusquauNouvelOrdre && row.dateFin < row.date) || row.posteIds.some((id) => id.startsWith("?"))) {
          const unknownPost = row.posteIds.find((id) => id.startsWith("?"));
          failures.push(`Ligne ${row.line} : ${unknownPost ? `poste « ${unknownPost.slice(1)} » inconnu` : "champs obligatoires ou dates invalides"}.`);
          continue;
        }
        try {
          await serviceApi.createJournalConsigne({ date: row.date, heure: row.heure, emetteur: row.emetteur, destinataire: row.destinataire, consigne: row.consigne, dateFin: row.dateFin || row.date, jusquauNouvelOrdre: row.jusquauNouvelOrdre, posteIds: row.posteIds, tousPostes: row.posteIds.length === 0, siteId });
          saved += 1;
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
        }
      }
      if (saved) setReloadKey((current) => current + 1);
      if (failures.length) toast.warning(`${saved} consigne(s) importée(s), ${failures.length} ligne(s) ignorée(s). ${failures.slice(0, 2).join(" ")}`);
      else toast.success(`${saved} consigne(s) importée(s).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Importation impossible.");
    } finally {
      setImporting(false);
    }
  };

  return <div className="consigne-module space-y-5">
    <PageHeader title="Consignes" subtitle="Saisir et consulter les consignes du site." />
    <div className="max-w-sm space-y-1.5">
      <label htmlFor="consigne-site" className="text-sm font-medium">Site</label>
      <select id="consigne-site" value={siteId} onChange={(event) => { if (editingId) cancelEdit(); setSiteId(event.target.value); }} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
        {!sites.length && <option value="">Aucun site disponible</option>}
        {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select>
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
    </div>

    <div className="flex justify-end"><Button type="button" onClick={() => { setEditingId(null); setForm(blankForm()); setFormOpen(true); }} disabled={!siteId}><Plus className="mr-2 size-4" />Nouvelle consigne</Button></div>
    <Dialog open={formOpen} onOpenChange={setFormOpen}><DialogContent className="consigne-entry-modal">
    <section className="consigne-form-card w-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <DialogHeader className="consigne-entry-modal-header"><span className="consigne-form-icon flex size-10 items-center justify-center rounded-lg"><ClipboardList className="size-5" /></span><div><DialogTitle>{editingId ? "Modifier la consigne" : "Nouvelle consigne"}</DialogTitle><DialogDescription>Indiquez quand, par qui et à qui la consigne est transmise.</DialogDescription></div></DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="consigne-form space-y-4 p-4 sm:p-6">
        <div className="space-y-1.5"><label htmlFor="consigne-date" className="text-sm font-medium">Date d’effet</label><input id="consigne-date" type="date" required value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value, dateFin: current.dateFin === current.date ? event.target.value : current.dateFin }))} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="space-y-1.5"><label htmlFor="consigne-heure" className="text-sm font-medium">Heure</label><input id="consigne-heure" type="time" required value={form.heure} onChange={(event) => setForm({ ...form, heure: event.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="space-y-1.5"><label htmlFor="consigne-emetteur" className="text-sm font-medium">Émetteur</label><input id="consigne-emetteur" required maxLength={255} value={form.emetteur} onChange={(event) => setForm({ ...form, emetteur: event.target.value })} placeholder="Nom de l'émetteur" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="space-y-1.5"><label htmlFor="consigne-destinataire" className="text-sm font-medium">Destinataire</label><input id="consigne-destinataire" required maxLength={255} value={form.destinataire} onChange={(event) => setForm({ ...form, destinataire: event.target.value })} placeholder="Nom du destinataire" className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <fieldset className="space-y-2 rounded-md border p-3">
          <legend className="px-1 text-sm font-medium">Postes visés</legend>
          <p className="text-xs text-muted-foreground">Sans sélection, la consigne s’applique à tous les postes actifs du site.</p>
          {posts.length ? <div className="grid gap-2 sm:grid-cols-2">{posts.map((post) => <label key={post.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.posteIds.includes(post.id)} onChange={(event) => setForm((current) => ({ ...current, posteIds: event.target.checked ? [...current.posteIds, post.id] : current.posteIds.filter((id) => id !== post.id) }))} />{post.nom}</label>)}</div> : <p className="text-xs text-muted-foreground">Aucun poste actif configuré pour ce site.</p>}
        </fieldset>
        <label className="flex min-h-11 items-center gap-3 rounded-md border px-3 text-sm"><input type="checkbox" checked={form.jusquauNouvelOrdre} onChange={(event) => setForm({ ...form, jusquauNouvelOrdre: event.target.checked })} />Consigne valable jusqu’à nouvel ordre</label>
        {!form.jusquauNouvelOrdre && <div className="space-y-1.5"><label htmlFor="consigne-date-fin" className="text-sm font-medium">Valable jusqu’au</label><input id="consigne-date-fin" type="date" required min={form.date} value={form.dateFin} onChange={(event) => setForm({ ...form, dateFin: event.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>}
        <div className="space-y-1.5"><label htmlFor="consigne-message" className="text-sm font-medium">Consigne</label><textarea id="consigne-message" required maxLength={20000} rows={5} value={form.consigne} onChange={(event) => setForm({ ...form, consigne: event.target.value })} placeholder="Écrire la consigne..." className="min-h-32 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          {editingId && <Button type="button" variant="outline" disabled={saving} onClick={cancelEdit} className="h-11 w-full gap-2 sm:w-auto"><X className="size-4" />Annuler</Button>}
          <Button type="submit" disabled={saving || !siteId} className="h-11 w-full gap-2 sm:w-auto sm:min-w-40">{editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}{saving ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Enregistrer"}</Button>
        </div>
      </form>
    </section><DialogFooter className="consigne-entry-modal-footer"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Fermer</Button></DialogFooter></DialogContent></Dialog>

    <section id="consignes-print-area" className="consigne-registry space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div><h2 className="text-lg font-semibold">Consignes enregistrées</h2><p className="text-sm text-muted-foreground">{entries.length} consigne(s)</p></div>
        <div className="consigne-registry-actions">
          <label className={`consigne-import-button ${!siteId || importing ? "pointer-events-none opacity-50" : ""}`}>
            <FileUp aria-hidden="true" className="size-4 shrink-0" />{importing ? "Importation…" : "Importer Excel / CSV"}
            <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!siteId || importing} onChange={(event) => { void handleImport(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          </label>
          <Button type="button" variant="outline" size="sm" className="consigne-toolbar-button" disabled={loading || !filteredEntries.length} onClick={handleExport}><Download className="mr-2 size-4" />Exporter Excel</Button>
          <Button type="button" variant="outline" size="sm" className="consigne-toolbar-button" onClick={() => exportXlsx("modele-consignes.xlsx", "Consignes", consigneHeaders, [])}><FileDown className="mr-2 size-4" />Modèle Excel</Button>
          <Button type="button" variant="outline" size="sm" className="consigne-toolbar-button" disabled={loading || !siteId} onClick={() => setReloadKey((current) => current + 1)}><RefreshCw className="mr-2 size-4" />Actualiser</Button>
          <Button type="button" variant="outline" size="sm" className="consigne-toolbar-button" disabled={loading || !entries.length} onClick={handlePrint}><Printer className="mr-2 size-4" />Imprimer le registre</Button>
        </div>
      </div>
      <div className="relative print:hidden">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Rechercher une consigne"
          placeholder="Rechercher par date, poste, émetteur, destinataire ou consigne…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 pl-9"
        />
      </div>
      <div className="consigne-table-wrap overflow-x-auto rounded-xl border bg-card print:hidden">
        <table className="consigne-table w-full min-w-[1150px] border-collapse text-left text-sm">
          <thead className="consigne-table-head bg-muted/60 text-xs uppercase text-muted-foreground"><tr>
            {(["Date", "Heure", "Postes visés", "Émetteur", "Destinataire", "Consigne", "Validité", "Suivi de lecture"] as const).map((heading) => <th key={heading} className="border-b px-4 py-3">{heading}</th>)}
            <th className="w-28 border-b px-4 py-3 text-right">Actions</th>
          </tr></thead>
          <tbody>{filteredEntries.map((entry) => <tr key={entry.id} className={`consigne-table-row align-top ${entry.lectures?.some((receipt) => !receipt.readAt) ? "consigne-table-row--unread" : "consigne-table-row--read"}`}>
            <td className="whitespace-nowrap border-b px-4 py-3">{String(entry.date).slice(0, 10)}</td>
            <td className="whitespace-nowrap border-b px-4 py-3">{entry.heure}</td>
            <td className="border-b px-4 py-3 text-xs">{entry.tousPostes ? "Tous les postes" : (entry.posteIds || []).map((id) => posts.find((post) => post.id === id)?.nom || id).join(", ") || entry.posteNom || "Tous les postes"}</td>
            <td className="whitespace-pre-wrap break-words border-b px-4 py-3">{entry.emetteur}</td>
            <td className="whitespace-pre-wrap break-words border-b px-4 py-3">{entry.destinataire}</td>
            <td className="whitespace-pre-wrap break-words border-b px-4 py-3">{entry.consigne}</td>
            <td className="whitespace-nowrap border-b px-4 py-3">{entry.jusquauNouvelOrdre ? "Jusqu’à nouvel ordre" : `Jusqu’au ${String(entry.dateFin || entry.date).slice(0, 10)}`}</td>
            <td className="border-b px-4 py-3 text-xs"><div className="space-y-1">{(entry.lectures || []).map((receipt) => <p key={receipt.posteId} className={receipt.readAt ? "text-success" : "text-warning-foreground"}>{receipt.posteNom} · {receipt.readAt ? `Lu par ${(receipt.readers || []).map((reader) => reader.name).filter(Boolean).join(", ") || receipt.reader || "un agent"}` : "À lire"}</p>)}</div></td>
            <td className="border-b px-2 py-3"><div className="flex justify-end gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Modifier la consigne" title="Modifier" onClick={() => editEntry(entry)}><Pencil className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Supprimer la consigne" title="Supprimer" onClick={() => void deleteEntry(entry)} className="text-destructive hover:text-destructive"><Trash2 className="size-4" /></Button>
            </div></td>
          </tr>)}
          {!loading && entries.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Aucune consigne enregistrée pour ce site.</td></tr>}
          {!loading && entries.length > 0 && filteredEntries.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Aucune consigne ne correspond à votre recherche.</td></tr>}
          {loading && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">Chargement...</td></tr>}</tbody>
        </table>
      </div>
      <div className="consignes-print hidden">
        <h1 className="mb-1 text-xl font-bold">Registre des consignes</h1>
        <p className="mb-4 text-sm">Site : {sites.find((site) => site.id === siteId)?.name || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
        <table>
          <thead>
            <tr>{["Date", "Heure", "Postes visés", "Émetteur", "Destinataire", "Consigne", "Validité", "Suivi de lecture"].map((heading) => <th key={heading}>{heading}</th>)}</tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{String(entry.date).slice(0, 10)}</td>
                <td>{entry.heure || "—"}</td>
                <td>{entry.tousPostes ? "Tous les postes" : (entry.posteIds || []).map((id) => posts.find((post) => post.id === id)?.nom || id).join(", ") || "Tous les postes"}</td>
                <td>{entry.emetteur || "—"}</td>
                <td>{entry.destinataire || "—"}</td>
                <td>{entry.consigne || "—"}</td>
                <td>{entry.jusquauNouvelOrdre ? "Jusqu’à nouvel ordre" : String(entry.dateFin || entry.date).slice(0, 10)}</td>
                <td>{(entry.lectures || []).map((receipt) => `${receipt.posteNom} : ${receipt.readAt ? `lu par ${(receipt.readers || []).map((reader) => reader.name).filter(Boolean).join(", ") || receipt.reader || "un agent"}` : "à lire"}`).join(" · ")}</td>
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
        #consignes-print-area, #consignes-print-area * { visibility: visible !important; }
        #consignes-print-area {
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          width: 100% !important;
        }
        .consignes-print { display: block !important; }
        .consignes-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
        .consignes-print th, .consignes-print td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; white-space: pre-wrap; }
        .consignes-print th { background: #eee !important; print-color-adjust: exact; }
      }
    `}</style>
  </div>;
}
