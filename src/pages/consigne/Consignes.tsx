import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { ClipboardList, Pencil, Plus, Printer, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";

type ConsigneForm = { date: string; heure: string; consigne: string; emetteur: string; destinataire: string; dateFin: string; jusquauNouvelOrdre: boolean; posteIds: string[] };
type ReadStatus = { posteId: string; posteNom: string; readAt: string | null; reader: string | null; readers?: { name: string; readAt: string }[] };
type ConsigneEntry = ConsigneForm & { id: string; createdAt?: string; posteId?: string | null; posteNom?: string | null; tousPostes?: boolean; lectures?: ReadStatus[] };

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const currentTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const blankForm = (): ConsigneForm => ({ date: today(), heure: currentTime(), consigne: "", emetteur: "", destinataire: "", dateFin: today(), jusquauNouvelOrdre: false, posteIds: [] });

export default function Consignes() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [form, setForm] = useState<ConsigneForm>(blankForm);
  const [entries, setEntries] = useState<ConsigneEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm());
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

  return <div className="space-y-6">
    <PageHeader title="Consignes" subtitle="Saisir et consulter les consignes du site." />
    <div className="max-w-sm space-y-1.5">
      <label htmlFor="consigne-site" className="text-sm font-medium">Site</label>
      <select id="consigne-site" value={siteId} onChange={(event) => { if (editingId) cancelEdit(); setSiteId(event.target.value); }} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
        {!sites.length && <option value="">Aucun site disponible</option>}
        {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select>
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
    </div>

    <section className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="size-5" /></span>
        <div><h2 className="font-semibold">{editingId ? "Modifier la consigne" : "Nouvelle consigne"}</h2><p className="text-sm text-muted-foreground">Indiquez quand, par qui et à qui la consigne est transmise.</p></div>
      </div>
      <form onSubmit={(event) => void submit(event)} className="space-y-4 p-4 sm:p-6">
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
    </section>

    <section id="consignes-print-area" className="space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <div><h2 className="text-lg font-semibold">Consignes enregistrées</h2><p className="text-sm text-muted-foreground">{entries.length} consigne(s)</p></div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={loading || !siteId} onClick={() => setReloadKey((current) => current + 1)}><RefreshCw className="mr-2 size-4" />Actualiser</Button>
          <Button type="button" variant="outline" size="sm" disabled={loading || !entries.length} onClick={handlePrint}><Printer className="mr-2 size-4" />Imprimer le registre</Button>
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
      <div className="overflow-x-auto rounded-xl border bg-card print:hidden">
        <table className="w-full min-w-[1150px] border-collapse text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr>
            {(["Date", "Heure", "Postes visés", "Émetteur", "Destinataire", "Consigne", "Validité", "Suivi de lecture"] as const).map((heading) => <th key={heading} className="border-b px-4 py-3">{heading}</th>)}
            <th className="w-28 border-b px-4 py-3 text-right">Actions</th>
          </tr></thead>
          <tbody>{filteredEntries.map((entry) => <tr key={entry.id} className="align-top hover:bg-muted/30">
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
