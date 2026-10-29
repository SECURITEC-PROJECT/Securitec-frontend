import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRecord } from "@/lib/printRecord";
import { serviceApi, type ApsServiceHandover } from "@/lib/service-api";
import { Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

type HandoverForm = Omit<ApsServiceHandover, "id" | "siteId">;

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const blankForm = (): HandoverForm => ({
  date: today(),
  materiel: "",
  chaineEst: "",
  chaineOuest: "",
  clesRendus: "",
  clesNonRendus: "",
  etatDesLieux: "",
  consigne: "",
  evenement: "",
  remarque: "",
});

const fields = [
  { key: "materiel", label: "Matériel", multiline: true },
  { key: "clesRendus", label: "Clés rendus", multiline: true },
  { key: "clesNonRendus", label: "Clés non rendus", multiline: true },
  { key: "etatDesLieux", label: "État des lieux", multiline: true },
  { key: "consigne", label: "Consigne", multiline: true },
  { key: "evenement", label: "Événement", multiline: true },
  { key: "remarque", label: "Remarque", multiline: true },
] as const;

export default function PassationServiceAPS({
  activeSiteId,
  activeSiteName,
}: {
  activeSiteId: string;
  activeSiteName: string;
}) {
  const [entriesByKey, setEntriesByKey] = useState<Record<string, ApsServiceHandover[]>>({});
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ApsServiceHandover | null>(null);
  const [form, setForm] = useState<HandoverForm>(blankForm);
  const [search, setSearch] = useState("");
  const registryKey = `${activeSiteId}:${form.date}`;
  const entries = entriesByKey[registryKey] ?? [];
  const loading = Boolean(activeSiteId) && !Object.hasOwn(entriesByKey, registryKey);
  const normalizedSearch = search.trim().toLocaleLowerCase("fr");
  const filteredEntries = entries.filter((entry) =>
    !normalizedSearch || [
      formatDate(entry.date),
      entry.materiel,
      entry.chaineEst,
      entry.chaineOuest,
      entry.clesRendus,
      entry.clesNonRendus,
      entry.etatDesLieux,
      entry.consigne,
      entry.evenement,
      entry.remarque,
    ].some((value) => value.toLocaleLowerCase("fr").includes(normalizedSearch)),
  );

  useEffect(() => {
    if (!activeSiteId || Object.hasOwn(entriesByKey, registryKey)) return;
    let active = true;
    serviceApi.listApsServiceHandovers(activeSiteId, form.date)
      .then((items) => {
        if (active) setEntriesByKey((current) => ({ ...current, [registryKey]: items }));
      })
      .catch((error) => {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : "Chargement des passations impossible.");
        setEntriesByKey((current) => ({ ...current, [registryKey]: [] }));
      });
    return () => { active = false; };
  }, [activeSiteId, entriesByKey, form.date, registryKey]);

  const resetForm = () => {
    setEditing(null);
    setForm((current) => ({ ...blankForm(), date: current.date }));
  };

  const updateForm = (key: keyof HandoverForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
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
      const payload = { ...form, siteId: activeSiteId };
      const saved = editing
        ? await serviceApi.updateApsServiceHandover(editing.id, payload)
        : await serviceApi.createApsServiceHandover(payload);
      setEntriesByKey((current) => ({
        ...current,
        ...(wasEditing ? Object.fromEntries(Object.entries(current).map(([key, items]) => [
          key,
          items.filter((item) => item.id !== saved.id),
        ])) : {}),
        [registryKey]: [saved, ...(current[registryKey] ?? []).filter((item) => item.id !== saved.id)],
      }));
      resetForm();
      toast.success(wasEditing ? "Passation modifiée." : "Passation enregistrée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de la passation impossible.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (entry: ApsServiceHandover) => {
    setEditing(entry);
    setForm({
      date: entry.date,
      materiel: entry.materiel,
      chaineEst: entry.chaineEst,
      chaineOuest: entry.chaineOuest,
      clesRendus: entry.clesRendus,
      clesNonRendus: entry.clesNonRendus,
      etatDesLieux: entry.etatDesLieux,
      consigne: entry.consigne,
      evenement: entry.evenement,
      remarque: entry.remarque,
    });
  };

  const deleteEntry = async (entry: ApsServiceHandover) => {
    if (!(await confirmDeletion("Supprimer définitivement cette passation de service ?"))) return;
    try {
      await serviceApi.deleteApsServiceHandover(entry.id, activeSiteId);
      setEntriesByKey((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(current).map(([key, items]) => [
          key,
          items.filter((item) => item.id !== entry.id),
        ])),
      }));
      if (editing?.id === entry.id) resetForm();
      toast.success("Passation supprimée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression de la passation impossible.");
    }
  };

  const printEntry = (entry: ApsServiceHandover) => {
    printRecord("Passation de service", activeSiteName, [
      ["Date", formatDate(entry.date)],
      ["Matériel", entry.materiel],
      ["Chaîne Est", entry.chaineEst],
      ["Chaîne Ouest", entry.chaineOuest],
      ["Clés rendus", entry.clesRendus],
      ["Clés non rendus", entry.clesNonRendus],
      ["État des lieux", entry.etatDesLieux],
      ["Consigne", entry.consigne],
      ["Événement", entry.evenement],
      ["Remarque", entry.remarque],
    ]);
  };

  const printHistory = () => {
    const printWindow = window.open("", "_blank", "width=1100,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer l’historique.");
      return;
    }
    const headers = ["Date", "Matériel", "Chaîne Est", "Chaîne Ouest", "Clés rendus", "Clés non rendus", "État des lieux", "Consigne", "Événement", "Remarque"];
    const rows = entries.map((entry) => [
      formatDate(entry.date),
      entry.materiel,
      entry.chaineEst,
      entry.chaineOuest,
      entry.clesRendus,
      entry.clesNonRendus,
      entry.etatDesLieux,
      entry.consigne,
      entry.evenement,
      entry.remarque,
    ]);
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Passations de service</title>
      <style>@page{size:landscape;margin:10mm}body{font:10px Arial,sans-serif;color:#172033}h1,p{text-align:center}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #9ca3af;padding:5px;text-align:left;vertical-align:top;white-space:pre-wrap;overflow-wrap:anywhere}th{background:#e5e7eb}tr{break-inside:avoid}</style>
      </head><body><h1>Passations de service</h1><p>${escapeHtml(activeSiteName)}</p>
      <table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell || "—")}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="w-full max-w-sm space-y-1.5">
            <Label htmlFor="aps-handover-date">Date</Label>
            <Input id="aps-handover-date" type="date" required value={form.date} onChange={(event) => updateForm("date", event.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["chaineEst", "chaineOuest"] as const).map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`aps-handover-${key}`}>{key === "chaineEst" ? "Chaîne Est" : "Chaîne Ouest"}</Label>
                <Input id={`aps-handover-${key}`} maxLength={100} value={form[key]} onChange={(event) => updateForm(key, event.target.value)} />
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(({ key, label }) => (
              <div key={key} className={`space-y-1.5 ${key === "remarque" ? "sm:col-span-2 lg:col-span-3" : ""}`}>
                <Label htmlFor={`aps-handover-${key}`}>{label}</Label>
                <Textarea
                  id={`aps-handover-${key}`}
                  maxLength={key === "materiel" ? 3000 : 5000}
                  rows={key === "materiel" || key === "clesRendus" || key === "clesNonRendus" ? 4 : 3}
                  value={form[key]}
                  onChange={(event) => updateForm(key, event.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="submit" disabled={saving || !activeSiteId}>
              {editing ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
              {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Ajouter la passation"}
            </Button>
            {editing && <Button type="button" variant="outline" onClick={resetForm}><X className="mr-2 size-4" />Annuler</Button>}
          </div>
        </form>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            aria-label="Rechercher dans les passations de service"
            placeholder="Rechercher dans le registre…"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Button type="button" variant="outline" onClick={printHistory} disabled={!entries.length}>
          <Printer className="mr-2 size-4" />Imprimer tout le registre
        </Button>
      </div>
      <section className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="border-b px-3 py-3">Date</th>
              <th className="border-b px-3 py-3">Matériel</th>
              <th className="border-b px-3 py-3">Chaîne Est</th>
              <th className="border-b px-3 py-3">Chaîne Ouest</th>
              <th className="border-b px-3 py-3">Clés rendus</th>
              <th className="border-b px-3 py-3">Clés non rendus</th>
              <th className="border-b px-3 py-3">État des lieux</th>
              <th className="border-b px-3 py-3">Consigne</th>
              <th className="border-b px-3 py-3">Événement</th>
              <th className="border-b px-3 py-3">Remarque</th>
              <th className="w-32 border-b px-3 py-3 print:hidden">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="align-top hover:bg-muted/30">
                <td className="whitespace-nowrap border-b px-3 py-3">{formatDate(entry.date)}</td>
                <td className="max-w-48 whitespace-pre-wrap border-b px-3 py-3">{entry.materiel || "—"}</td>
                <td className="border-b px-3 py-3">{entry.chaineEst || "—"}</td>
                <td className="border-b px-3 py-3">{entry.chaineOuest || "—"}</td>
                <td className="max-w-48 whitespace-pre-wrap border-b px-3 py-3">{entry.clesRendus || "—"}</td>
                <td className="max-w-48 whitespace-pre-wrap border-b px-3 py-3">{entry.clesNonRendus || "—"}</td>
                <td className="max-w-48 whitespace-pre-wrap border-b px-3 py-3">{entry.etatDesLieux || "—"}</td>
                <td className="max-w-48 whitespace-pre-wrap border-b px-3 py-3">{entry.consigne || "—"}</td>
                <td className="max-w-48 whitespace-pre-wrap border-b px-3 py-3">{entry.evenement || "—"}</td>
                <td className="max-w-48 whitespace-pre-wrap border-b px-3 py-3">{entry.remarque || "—"}</td>
                <td className="border-b px-2 py-2 print:hidden">
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="ghost" aria-label="Modifier la passation" title="Modifier" onClick={() => startEditing(entry)}><Pencil className="size-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" aria-label="Imprimer la passation" title="Imprimer" onClick={() => printEntry(entry)}><Printer className="size-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label="Supprimer la passation" title="Supprimer" onClick={() => void deleteEntry(entry)}><Trash2 className="size-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && !filteredEntries.length && <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
              {entries.length ? "Aucune passation ne correspond à la recherche." : "Aucune passation enregistrée pour cette date."}
            </td></tr>}
          </tbody>
        </table>
        {loading && <p className="p-4 text-sm text-muted-foreground">Chargement des passations…</p>}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
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
