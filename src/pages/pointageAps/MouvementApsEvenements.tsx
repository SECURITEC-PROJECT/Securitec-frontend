import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRecord } from "@/lib/printRecord";
import { serviceApi, type ApsMovementEvent } from "@/lib/service-api";
import { Pencil, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

const EMPTY_ENTRIES: ApsMovementEvent[] = [];

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const blankForm = () => ({
  heureEntree: currentTime(),
  mouvement: "",
  observation: "",
  heureSortie: "",
});

export default function MouvementApsEvenements({
  activeSiteId,
  activeSiteName,
}: {
  activeSiteId: string;
  activeSiteName: string;
}) {
  const [date, setDate] = useState(today);
  const [entriesByKey, setEntriesByKey] = useState<Record<string, ApsMovementEvent[]>>({});
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ApsMovementEvent | null>(null);
  const [form, setForm] = useState(blankForm);
  const registryKey = `${activeSiteId}:${date}`;
  const entries = entriesByKey[registryKey] ?? EMPTY_ENTRIES;
  const loading = Boolean(activeSiteId) && !Object.hasOwn(entriesByKey, registryKey);

  useEffect(() => {
    if (!activeSiteId || Object.hasOwn(entriesByKey, registryKey)) return;
    let active = true;
    serviceApi.listApsMovementEvents(activeSiteId, date)
      .then((items) => {
        if (active) setEntriesByKey((current) => ({ ...current, [registryKey]: items }));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Chargement des mouvements impossible.");
        setEntriesByKey((current) => ({ ...current, [registryKey]: [] }));
      });
    return () => { active = false; };
  }, [activeSiteId, date, entriesByKey, registryKey]);

  const orderedEntries = useMemo(
    () => [...entries].sort((a, b) => a.heureEntree.localeCompare(b.heureEntree)),
    [entries],
  );

  const resetForm = () => {
    setEditing(null);
    setForm(blankForm());
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeSiteId) {
      toast.error("Sélectionnez un site avant l’enregistrement.");
      return;
    }
    setSaving(true);
    const wasEditing = Boolean(editing);
    try {
      const saved = editing
        ? await serviceApi.updateApsMovementEvent(editing.id, { ...form, date, siteId: activeSiteId })
        : await serviceApi.createApsMovementEvent({ ...form, date, siteId: activeSiteId });
      setEntriesByKey((current) => ({
        ...current,
        [registryKey]: wasEditing
          ? (current[registryKey] ?? []).map((item) => item.id === saved.id ? saved : item)
          : [saved, ...(current[registryKey] ?? [])],
      }));
      resetForm();
      toast.success(wasEditing ? "Mouvement modifié." : "Mouvement enregistré.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: ApsMovementEvent) => {
    setEditing(entry);
    setForm({
      heureEntree: entry.heureEntree,
      mouvement: entry.mouvement,
      observation: entry.observation,
      heureSortie: entry.heureSortie ?? "",
    });
  };

  const deleteEntry = async (entry: ApsMovementEvent) => {
    if (!(await confirmDeletion("Supprimer définitivement ce mouvement ?"))) return;
    try {
      await serviceApi.deleteApsMovementEvent(entry.id, activeSiteId);
      setEntriesByKey((current) => ({
        ...current,
        [registryKey]: (current[registryKey] ?? []).filter((item) => item.id !== entry.id),
      }));
      if (editing?.id === entry.id) resetForm();
      toast.success("Mouvement supprimé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    }
  };

  const printEntry = (entry: ApsMovementEvent) => {
    printRecord("Mouvement APS", activeSiteName, [
      ["Date", entry.date],
      ["Heure d’entrée", entry.heureEntree],
      ["Mouvement et événement", entry.mouvement],
      ["Observation", entry.observation],
      ["Heure de sortie", entry.heureSortie || "—"],
    ]);
  };

  const printHistory = () => {
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer l’historique.");
      return;
    }
    const headers = ["Heure d’entrée", "Mouvement et événement", "Observation", "Heure de sortie"];
    const rows = orderedEntries.map((entry) => [
      entry.heureEntree,
      entry.mouvement,
      entry.observation || "—",
      entry.heureSortie || "—",
    ]);
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Mouvements APS</title>
      <style>@page{size:landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#172033}h1{text-align:center}p{text-align:center}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #9ca3af;padding:8px;text-align:left;white-space:pre-wrap}th{background:#e5e7eb}</style>
      </head><body><h1>Registre des mouvements APS</h1><p>${escapeHtml(activeSiteName)} · ${escapeHtml(date)}</p>
      <table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
              <Label htmlFor="aps-event-date">Date</Label>
              <Input id="aps-event-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-12">
            <div className="space-y-1.5 lg:col-span-3">
              <Label htmlFor="aps-event-entry">Heure d’entrée</Label>
              <Input id="aps-event-entry" type="time" required value={form.heureEntree} onChange={(event) => setForm({ ...form, heureEntree: event.target.value })} />
            </div>
            <div className="space-y-1.5 lg:col-span-6">
              <Label htmlFor="aps-event-description">Mouvement et événement</Label>
              <Input id="aps-event-description" required maxLength={500} value={form.mouvement} onChange={(event) => setForm({ ...form, mouvement: event.target.value })} placeholder="Décrire le mouvement ou l’événement" />
            </div>
            <div className="space-y-1.5 lg:col-span-3">
              <Label htmlFor="aps-event-exit">Heure de sortie</Label>
              <Input id="aps-event-exit" type="time" value={form.heureSortie} onChange={(event) => setForm({ ...form, heureSortie: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-12">
              <Label htmlFor="aps-event-observation">Observation</Label>
              <Input id="aps-event-observation" maxLength={1000} value={form.observation} onChange={(event) => setForm({ ...form, observation: event.target.value })} placeholder="Observation (facultatif)" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving || !activeSiteId}>
              {editing ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
              {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Ajouter le mouvement"}
            </Button>
            {editing && <Button type="button" variant="outline" onClick={resetForm}><X className="mr-2 size-4" />Annuler</Button>}
          </div>
        </form>
      </section>

      <div className="flex justify-end print:hidden">
        <Button type="button" variant="outline" onClick={printHistory} disabled={!orderedEntries.length}>
          <Printer className="mr-2 size-4" />Imprimer tout le registre
        </Button>
      </div>
      <section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[850px] border-collapse text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="border-b px-4 py-3">Heure d’entrée</th>
              <th className="border-b px-4 py-3">Mouvement et événement</th>
              <th className="border-b px-4 py-3">Observation</th>
              <th className="border-b px-4 py-3">Heure de sortie</th>
              <th className="w-32 border-b px-4 py-3 print:hidden">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orderedEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-muted/30">
                <td className="border-b px-4 py-3">{entry.heureEntree}</td>
                <td className="border-b px-4 py-3 whitespace-pre-wrap">{entry.mouvement}</td>
                <td className="border-b px-4 py-3 whitespace-pre-wrap">{entry.observation || "—"}</td>
                <td className="border-b px-4 py-3">{entry.heureSortie || "—"}</td>
                <td className="border-b px-3 py-2 print:hidden">
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label="Modifier le mouvement" title="Modifier" onClick={() => editEntry(entry)}><Pencil className="size-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" aria-label="Imprimer le mouvement" title="Imprimer" onClick={() => printEntry(entry)}><Printer className="size-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label="Supprimer le mouvement" title="Supprimer" onClick={() => void deleteEntry(entry)}><Trash2 className="size-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !orderedEntries.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Aucun mouvement enregistré pour cette date.</td></tr>}
          </tbody>
        </table>
        {loading && <p className="p-4 text-sm text-muted-foreground">Chargement des mouvements…</p>}
      </section>
    </div>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);
}
