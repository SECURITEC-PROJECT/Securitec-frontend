import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { ClipboardList, Pencil, Plus, Printer, RefreshCw, Search, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";

type AnomalieForm = {
  date: string;
  heure: string;
  poste: string;
  nature: string;
  anomalie: string;
  mesures: string;
};

type AnomalieEntry = {
  id: string;
  date: string;
  time: string;
  person: string | null;
  observations: string | null;
  facts: string | null;
  measures: string | null;
  siteName?: string;
};

const today = () => new Date().toLocaleDateString("en-CA");
const currentTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const blankForm = (): AnomalieForm => ({ date: today(), heure: currentTime(), poste: "", nature: "", anomalie: "", mesures: "" });

export default function Anomalie() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [form, setForm] = useState<AnomalieForm>(blankForm);
  const [entries, setEntries] = useState<AnomalieEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredEntries = entries.filter((entry) =>
    [entry.date, entry.time, entry.person, entry.observations, entry.facts, entry.measures]
      .filter(Boolean)
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
    serviceApi.listLogisticsEvents(siteId, "ANOMALIE")
      .then((rows) => { if (active) setEntries(rows as AnomalieEntry[]); })
      .catch((error) => { if (active) toast.error(error instanceof Error ? error.message : "Chargement des anomalies impossible."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [siteId, reloadKey]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) { toast.error("Selectionnez un site."); return; }
    setSaving(true);
    try {
      const payload = {
        type: "ANOMALIE",
        date: form.date,
        time: form.heure,
        person: form.poste,
        observations: form.nature,
        facts: form.anomalie,
        measures: form.mesures,
        siteId,
      };
      if (editingId) {
        const entry = await serviceApi.updateLogisticsIncident(editingId, siteId, payload);
        setEntries((current) => current.map((row) => row.id === editingId ? { ...row, ...entry } : row));
        setEditingId(null);
        toast.success("Anomalie modifiee.");
      } else {
        const entry = await serviceApi.createLogisticsEvent(payload);
        setEntries((current) => [entry as AnomalieEntry, ...current]);
        toast.success("Anomalie enregistree.");
      }
      setForm(blankForm());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de l'anomalie impossible.");
    } finally { setSaving(false); }
  };

  const editEntry = (entry: AnomalieEntry) => {
    setEditingId(entry.id);
    setForm({
      date: String(entry.date).slice(0, 10),
      heure: entry.time || "",
      poste: entry.person || "",
      nature: entry.observations || "",
      anomalie: entry.facts || "",
      mesures: entry.measures || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm());
  };

  const deleteEntry = async (entry: AnomalieEntry) => {
    if (!siteId || !window.confirm("Supprimer cette anomalie ? Cette action est definitive.")) return;
    try {
      await serviceApi.deleteLogisticsIncident(entry.id, siteId);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editingId === entry.id) cancelEdit();
      toast.success("Anomalie supprimee.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression de l'anomalie impossible.");
    }
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre des anomalies";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  return <div className="space-y-6">
    <PageHeader title="Anomalie" subtitle="Saisir et consulter les anomalies du site." />
    <div className="max-w-sm space-y-1.5">
      <label htmlFor="anomalie-site" className="text-sm font-medium">Site</label>
      <select id="anomalie-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        {!sites.length && <option value="">Aucun site disponible</option>}
        {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select>
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
    </div>

    <section className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="size-5" /></span>
        <div><h2 className="font-semibold">{editingId ? "Modifier le signalement" : "Nouveau signalement"}</h2><p className="text-sm text-muted-foreground">Renseignez les informations de l'anomalie.</p></div>
      </div>
      <form onSubmit={(event) => void submit(event)} className="space-y-4 p-4 sm:p-6">
        <div className="space-y-1.5"><label htmlFor="anomalie-date" className="text-sm font-medium">Date</label><input id="anomalie-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="space-y-1.5"><label htmlFor="anomalie-heure" className="text-sm font-medium">Heure</label><input id="anomalie-heure" type="time" required value={form.heure} onChange={(event) => setForm({ ...form, heure: event.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="space-y-1.5"><label htmlFor="anomalie-poste" className="text-sm font-medium">Poste</label><textarea id="anomalie-poste" required maxLength={255} rows={2} value={form.poste} onChange={(event) => setForm({ ...form, poste: event.target.value })} placeholder="Poste concerne" className="min-h-[72px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="space-y-1.5"><label htmlFor="anomalie-nature" className="text-sm font-medium">Nature</label><textarea id="anomalie-nature" required maxLength={20000} rows={3} value={form.nature} onChange={(event) => setForm({ ...form, nature: event.target.value })} placeholder="Nature de l'anomalie" className="min-h-[96px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="space-y-1.5"><label htmlFor="anomalie-faits" className="text-sm font-medium">Anomalie</label><textarea id="anomalie-faits" required maxLength={20000} rows={4} value={form.anomalie} onChange={(event) => setForm({ ...form, anomalie: event.target.value })} placeholder="Description de l'anomalie" className="min-h-[120px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="space-y-1.5"><label htmlFor="anomalie-mesures" className="text-sm font-medium">Mesures prises</label><textarea id="anomalie-mesures" maxLength={20000} rows={3} value={form.mesures} onChange={(event) => setForm({ ...form, mesures: event.target.value })} placeholder="Mesures prises" className="min-h-[96px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          {editingId && <Button type="button" variant="outline" disabled={saving} onClick={cancelEdit} className="h-11 w-full gap-2 sm:w-auto"><X className="size-4" />Annuler</Button>}
          <Button type="submit" disabled={saving || !siteId} className="h-11 w-full gap-2 sm:w-auto sm:min-w-40">{editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}{saving ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Enregistrer"}</Button>
        </div>
      </form>
    </section>

    <section id="anomalies-print-area" className="space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <div><h2 className="text-lg font-semibold">Anomalies enregistrees</h2><p className="text-sm text-muted-foreground">{entries.length} signalement(s)</p></div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" disabled={loading || !siteId} onClick={() => setReloadKey((current) => current + 1)}><RefreshCw className="mr-2 size-4" />Actualiser</Button>
          <Button variant="outline" size="sm" disabled={loading || !entries.length} onClick={handlePrint}><Printer className="mr-2 size-4" />Imprimer le registre</Button>
        </div>
      </div>
      <div className="relative print:hidden">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Rechercher une anomalie"
          placeholder="Rechercher par date, poste, nature, anomalie ou mesures…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 pl-9"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card print:hidden">
        <table className="w-full min-w-[1250px] table-fixed border-collapse text-left text-sm">
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr>
            {(["Date", "Heure", "Poste", "Nature", "Anomalie", "Mesures prises"] as const).map((heading, index) => <th key={heading} className={`border-b px-4 py-3 ${[0, 1].includes(index) ? "w-24" : index === 2 ? "w-40" : index === 3 ? "w-48" : "w-[360px]"}`}>{heading}</th>)}
            <th className="w-28 border-b px-4 py-3 text-right">Actions</th>
          </tr></thead>
          <tbody>{filteredEntries.map((entry) => <tr key={entry.id} className="align-top hover:bg-muted/30">
            <td className="whitespace-nowrap border-b px-4 py-3">{String(entry.date).slice(0, 10)}</td>
            <td className="whitespace-nowrap border-b px-4 py-3">{entry.time}</td>
            <td className="whitespace-pre-wrap break-words border-b px-4 py-3">{entry.person || "-"}</td>
            <td className="whitespace-pre-wrap break-words border-b px-4 py-3">{entry.observations || "-"}</td>
            <td className="whitespace-pre-wrap break-words border-b px-4 py-3">{entry.facts || "-"}</td>
            <td className="whitespace-pre-wrap break-words border-b px-4 py-3">{entry.measures || "-"}</td>
            <td className="border-b px-2 py-3"><div className="flex justify-end gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Modifier l'anomalie" title="Modifier" onClick={() => editEntry(entry)}><Pencil className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Supprimer l'anomalie" title="Supprimer" onClick={() => void deleteEntry(entry)} className="text-destructive hover:text-destructive"><Trash2 className="size-4" /></Button>
            </div></td>
          </tr>)}
          {!loading && entries.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Aucune anomalie enregistree pour ce site.</td></tr>}
          {!loading && entries.length > 0 && filteredEntries.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Aucune anomalie ne correspond à votre recherche.</td></tr>}
          {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Chargement...</td></tr>}</tbody>
        </table>
      </div>
      <div className="anomalies-print hidden">
        <h1 className="mb-1 text-xl font-bold">Registre des anomalies</h1>
        <p className="mb-4 text-sm">Site : {sites.find((site) => site.id === siteId)?.name || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
        <table>
          <thead>
            <tr>{["Date", "Heure", "Poste", "Nature", "Anomalie", "Mesures prises"].map((heading) => <th key={heading}>{heading}</th>)}</tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{String(entry.date).slice(0, 10)}</td>
                <td>{entry.time || "—"}</td>
                <td>{entry.person || "—"}</td>
                <td>{entry.observations || "—"}</td>
                <td>{entry.facts || "—"}</td>
                <td>{entry.measures || "—"}</td>
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
        #anomalies-print-area, #anomalies-print-area * { visibility: visible !important; }
        #anomalies-print-area {
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          width: 100% !important;
        }
        .anomalies-print { display: block !important; }
        .anomalies-print table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        .anomalies-print th, .anomalies-print td { border: 1px solid #777; padding: 5px; text-align: left; vertical-align: top; white-space: pre-wrap; }
        .anomalies-print th { background: #eee !important; print-color-adjust: exact; }
      }
    `}</style>
  </div>;
}
