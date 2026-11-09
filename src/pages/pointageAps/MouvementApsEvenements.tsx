import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRegistryTable } from "@/lib/registry-table";
import { exportXlsx } from "@/lib/export-xlsx";
import { printRecord } from "@/lib/printRecord";
import { readXlsxRows } from "@/lib/read-xlsx";
import { serviceApi, type ApsMovementEvent } from "@/lib/service-api";
import { Download, FileDown, FileUp, Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

const normalizeSearch = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .toLocaleLowerCase("fr");
const normalizeHeader = (value: string) => normalizeSearch(value).replace(/[^a-z0-9]/g, "");
const eventHeaders = ["Date", "Heure d’entrée", "Mouvement et événement", "Observation", "Heure de sortie"];

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
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<ApsMovementEvent | null>(null);
  const [form, setForm] = useState(blankForm);
  const [search, setSearch] = useState("");
  const [entryOpen, setEntryOpen] = useState(false);
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
  const normalizedSearch = normalizeSearch(search.trim());
  const filteredEntries = useMemo(
    () => orderedEntries.filter((entry) => !normalizedSearch || [
      entry.mouvement,
      entry.observation,
      entry.heureEntree,
      entry.heureSortie || "",
    ].some((value) => normalizeSearch(value).includes(normalizedSearch))),
    [normalizedSearch, orderedEntries],
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
      setEntryOpen(false);
      toast[saved.pendingSync ? "info" : "success"](saved.pendingSync
        ? "Mouvement enregistré sur cet appareil, en attente de synchronisation."
        : wasEditing ? "Mouvement modifié." : "Mouvement enregistré.");
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
    setEntryOpen(true);
  };

  const deleteEntry = async (entry: ApsMovementEvent) => {
    if (!(await confirmDeletion("Supprimer définitivement ce mouvement ?"))) return;
    try {
      const result = await serviceApi.deleteApsMovementEvent(entry.id, activeSiteId);
      setEntriesByKey((current) => ({
        ...current,
        [registryKey]: (current[registryKey] ?? []).filter((item) => item.id !== entry.id),
      }));
      if (editing?.id === entry.id) resetForm();
      toast[result.pendingSync ? "info" : "success"](result.pendingSync
        ? "Suppression enregistrée sur cet appareil, en attente de synchronisation."
        : "Mouvement supprimé.");
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
    printRegistryTable(
      "Registre des mouvements APS",
      activeSiteName,
      eventHeaders,
      filteredEntries.map((entry) => [entry.date, entry.heureEntree, entry.mouvement, entry.observation || "", entry.heureSortie || ""]),
    );
  };

  const exportHistory = () => {
    const rows = filteredEntries.map((entry) => [
      entry.date, entry.heureEntree, entry.mouvement, entry.observation || "", entry.heureSortie || "",
    ]);
    exportXlsx(`registre-mouvements-aps-${date}.xlsx`, "Mouvements APS", eventHeaders, rows);
  };

  const importHistory = async (file?: File) => {
    if (!file) return;
    if (!activeSiteId) {
      toast.error("Sélectionnez un site avant l’importation.");
      return;
    }
    if (loading || saving) {
      toast.error("Attendez la fin du chargement ou de l’enregistrement avant l’importation.");
      return;
    }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const headers = (sheet[0] || []).map((value) => normalizeHeader(String(value ?? "")));
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias)));
      const col = {
        date: column("date", "date mouvement"),
        entryTime: column("heure entree", "heure d entree", "heure entree movement"),
        movement: column("mouvement et evenement", "mouvement evenement", "mouvement", "evenement"),
        observation: column("observation", "remarque"),
        exitTime: column("heure sortie", "heure de sortie"),
      };
      if (col.entryTime < 0 || col.movement < 0) {
        throw new Error("Colonnes requises manquantes : Heure d’entrée et Mouvement/événement.");
      }
      const get = (cells: string[], index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
      const parseDate = (value: string) => {
        if (!value) return date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const frenchDate = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(value);
        if (frenchDate) {
          const parsed = `${frenchDate[3]}-${frenchDate[2].padStart(2, "0")}-${frenchDate[1].padStart(2, "0")}`;
          const check = new Date(`${parsed}T00:00:00.000Z`);
          return Number.isFinite(check.getTime()) && check.toISOString().slice(0, 10) === parsed ? parsed : "";
        }
        const serial = Number(value);
        return Number.isFinite(serial) && serial > 20000 && serial < 80000
          ? new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10)
          : "";
      };
      const parseTime = (value: string) => {
        const serial = Number(value);
        if (value && Number.isFinite(serial) && serial >= 0 && serial < 1) {
          const minutes = Math.round(serial * 24 * 60);
          return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        }
        const match = /^(\d{1,2}):(\d{2})/.exec(value);
        return match && Number(match[1]) < 24 && Number(match[2]) < 60
          ? `${match[1].padStart(2, "0")}:${match[2]}`
          : "";
      };
      const rows = sheet.slice(1).map((cells, index) => ({
        line: index + 2,
        date: parseDate(get(cells, col.date)),
        heureEntree: parseTime(get(cells, col.entryTime)),
        mouvement: get(cells, col.movement),
        observation: get(cells, col.observation),
        heureSortie: get(cells, col.exitTime) ? parseTime(get(cells, col.exitTime)) : "",
      })).filter((_, index) => sheet[index + 1]?.some((value) => String(value ?? "").trim()));
      if (!rows.length) throw new Error("Le fichier ne contient aucune ligne à importer.");

      let saved = 0;
      let queued = 0;
      const failures: string[] = [];
      const importedEntries: ApsMovementEvent[] = [];
      for (const row of rows) {
        if (!row.date || row.date !== date) {
          failures.push(`Ligne ${row.line} : sélectionnez la même date que celle du fichier (${row.date || "date invalide"}).`);
          continue;
        }
        if (!row.heureEntree || !row.mouvement || (get(sheet[row.line - 1], col.exitTime) && !row.heureSortie)) {
          failures.push(`Ligne ${row.line} : heure d’entrée, événement ou heure de sortie invalide.`);
          continue;
        }
        try {
          const entry = await serviceApi.createApsMovementEvent({
            date: row.date,
            heureEntree: row.heureEntree,
            mouvement: row.mouvement,
            observation: row.observation,
            heureSortie: row.heureSortie || null,
            siteId: activeSiteId,
          });
          importedEntries.push(entry);
          saved += 1;
          if (entry.pendingSync) queued += 1;
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
        }
      }
      if (importedEntries.length) {
        setEntriesByKey((current) => ({
          ...current,
          [registryKey]: [...importedEntries, ...(current[registryKey] ?? [])],
        }));
      }
      if (saved) toast.success(`${saved} mouvement(s) importé(s)${queued ? ` (${queued} en attente de synchronisation)` : ""}.`);
      if (failures.length) toast.error(`${failures.length} ligne(s) non importée(s) : ${failures.slice(0, 2).join(" ")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="aps-events-module space-y-4">
      <div className="aps-events-heading">
        <div className="aps-events-heading__identity"><span className="aps-events-heading__icon"><Plus aria-hidden="true" /></span><div><h2>Mouvements et événements</h2><p>Consultez et enregistrez les événements APS du site</p></div></div>
        <Button type="button" className="aps-events-new-button" onClick={() => { resetForm(); setEntryOpen(true); }}><Plus className="mr-2 size-4" />Nouveau mouvement</Button>
      </div>
      <div className="aps-events-date-filter print:hidden">
        <label htmlFor="aps-event-registry-date">Date du registre</label>
        <Input id="aps-event-registry-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="aps-event-dialog w-[calc(100vw-1rem)] max-w-[1500px] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>{editing ? "Modifier le mouvement" : "Nouveau mouvement APS"}</DialogTitle><DialogDescription>Renseignez les heures, le mouvement et les observations.</DialogDescription></DialogHeader>
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1160px] grid-cols-[150px_150px_minmax(250px,2fr)_minmax(200px,1.5fr)_150px_auto] items-end gap-3">
              <div className="space-y-1.5">
              <Label htmlFor="aps-event-date">Date</Label>
              <Input id="aps-event-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
              <div className="space-y-1.5">
              <Label htmlFor="aps-event-entry">Heure d’entrée</Label>
              <Input id="aps-event-entry" type="time" required value={form.heureEntree} onChange={(event) => setForm({ ...form, heureEntree: event.target.value })} />
            </div>
              <div className="space-y-1.5">
              <Label htmlFor="aps-event-description">Mouvement et événement</Label>
              <Input id="aps-event-description" required maxLength={500} value={form.mouvement} onChange={(event) => setForm({ ...form, mouvement: event.target.value })} placeholder="Décrire le mouvement ou l’événement" />
            </div>
              <div className="space-y-1.5">
              <Label htmlFor="aps-event-observation">Observation</Label>
              <Input id="aps-event-observation" maxLength={1000} value={form.observation} onChange={(event) => setForm({ ...form, observation: event.target.value })} placeholder="Facultatif" />
            </div>
              <div className="space-y-1.5">
              <Label htmlFor="aps-event-exit">Heure de sortie</Label>
              <Input id="aps-event-exit" type="time" value={form.heureSortie} onChange={(event) => setForm({ ...form, heureSortie: event.target.value })} />
            </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving || !activeSiteId}>
                  {editing ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
                  {saving ? "Enregistrement…" : editing ? "Modifier" : "Enregistrer"}
                </Button>
                {editing && <Button type="button" variant="outline" onClick={() => { resetForm(); setEntryOpen(false); }}><X className="mr-2 size-4" />Annuler</Button>}
              </div>
            </div>
          </div>
        </form>
      </section>
        </DialogContent>
      </Dialog>

      <div className="aps-events-toolbar print:hidden">
        <label className={`inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm font-medium ${!activeSiteId || importing ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
          <FileUp className="mr-2 size-4" />{importing ? "Importation…" : "Importer Excel / CSV"}
          <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!activeSiteId || importing || loading || saving} onChange={(event) => { void importHistory(event.target.files?.[0]); event.currentTarget.value = ""; }} />
        </label>
        <Button className="w-full" type="button" variant="outline" onClick={() => exportXlsx("modele-mouvements-aps.xlsx", "Mouvements APS", eventHeaders, [])}>
          <FileDown className="mr-2 size-4" />Modèle Excel
        </Button>
        <Button className="w-full" type="button" variant="outline" disabled={!filteredEntries.length} onClick={exportHistory}>
          <Download className="mr-2 size-4" />Exporter Excel
        </Button>
        <Button className="w-full" type="button" variant="outline" disabled={!filteredEntries.length} onClick={printHistory}>
          <Printer className="mr-2 size-4" />Imprimer les lignes (Word)
        </Button>
        <div className="relative w-full min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Rechercher dans les mouvements APS"
            placeholder="Rechercher un mouvement ou une observation..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full pl-9"
          />
        </div>
      </div>
      <section className="aps-events-table overflow-x-auto rounded-xl border bg-card shadow-sm">
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
            {filteredEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-muted/30">
                <td className="border-b px-4 py-3">{entry.heureEntree}{entry.pendingSync && <span className={`mt-1 block text-xs ${entry.pendingSyncStatus === "pending" ? "text-amber-700" : "text-destructive"}`} title={entry.pendingSyncError}>{entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"}</span>}</td>
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
            {!loading && !filteredEntries.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">{orderedEntries.length ? "Aucun mouvement ne correspond à la recherche." : "Aucun mouvement enregistré pour cette date."}</td></tr>}
          </tbody>
        </table>
        {loading && <p className="p-4 text-sm text-muted-foreground">Chargement des mouvements…</p>}
      </section>
    </div>
  );
}
