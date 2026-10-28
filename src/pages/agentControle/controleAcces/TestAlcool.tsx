import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type AlcoholCheck } from "@/lib/service-api";
import { Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

const FUNCTIONS = ["CR", "ADM", "Qualite", "Labo", "Maintenance", "Logistique", "Pile & Face", "Sécurité", "Pronete", "Néa"] as const;
type JobFunction = typeof FUNCTIONS[number];

type CheckForm = {
  date: string;
  heure: string;
  matricule: string;
  personne: string;
  fonction: JobFunction;
  resultat: "Positif" | "Négatif";
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (): CheckForm => ({
  date: today(),
  heure: currentTime(),
  matricule: "",
  personne: "",
  fonction: "CR",
  resultat: "Négatif",
});

const formatDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

export default function TestAlcool() {
  const { sites, siteError } = useSites();
  const [selectedSiteId, setSelectedSiteId] = useState("");
  const [entries, setEntries] = useState<AlcoholCheck[]>([]);
  const [entriesSiteId, setEntriesSiteId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<CheckForm>(emptyForm);
  const [editing, setEditing] = useState<AlcoholCheck | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const site = useMemo(
    () => sites.find((item) => item.id === selectedSiteId) || sites[0],
    [sites, selectedSiteId],
  );
  const siteId = site?.id || "";
  const visibleEntries = entriesSiteId === siteId ? entries : [];
  const loading = Boolean(siteId) && entriesSiteId !== siteId;
  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredEntries = visibleEntries.filter((entry) =>
    [entry.date, formatDate(entry.date.slice(0, 10)), entry.heure, entry.matricule, entry.personne, entry.fonction, entry.resultat]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  );

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    serviceApi.listAlcoholChecks(siteId)
      .then((rows) => {
        if (active) {
          setEntries(rows);
          setEntriesSiteId(siteId);
          setLoadError("");
        }
      })
      .catch((reason) => {
        if (active) {
          setEntries([]);
          setEntriesSiteId(siteId);
          setLoadError(reason instanceof Error ? reason.message : "Chargement des tests alcool impossible.");
        }
      });
    return () => { active = false; };
  }, [siteId]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        matricule: form.matricule.trim(),
        personne: form.personne.trim(),
        siteId,
      };
      const entry = editing
        ? await serviceApi.updateAlcoholCheck(editing.id, payload)
        : await serviceApi.createAlcoholCheck(payload);
      setEntries((current) => editing
        ? current.map((row) => row.id === entry.id ? entry : row)
        : [entry, ...current]);
      setEntriesSiteId(siteId);
      resetForm();
      toast.success(editing ? "Test alcool modifié." : "Test alcool enregistré.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: AlcoholCheck) => {
    setEditing(entry);
    setForm({
      date: entry.date.slice(0, 10),
      heure: entry.heure,
      matricule: entry.matricule,
      personne: entry.personne,
      fonction: FUNCTIONS.includes(entry.fonction as JobFunction) ? entry.fonction as JobFunction : "CR",
      resultat: entry.resultat,
    });
  };

  const deleteEntry = async (entry: AlcoholCheck) => {
    if (!siteId) return;
    if (!window.confirm(`Supprimer le contrôle de ${entry.personne} (${entry.matricule}) ? Cette action est définitive.`)) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteAlcoholCheck(entry.id, siteId);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editing?.id === entry.id) resetForm();
      toast.success("Test alcool supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre des tests alcool";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Test alcool" subtitle="Enregistrement et suivi des contrôles d’alcoolémie du personnel." />
      <div className="max-w-xl space-y-1">
        <Label htmlFor="alcohol-check-site">Site concerné</Label>
        <select
          id="alcohol-check-site"
          value={siteId}
          onChange={(event) => {
            setSelectedSiteId(event.target.value);
            resetForm();
          }}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          disabled={sites.length <= 1}
        >
          {!sites.length && <option value="">Aucun site disponible</option>}
          {sites.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      </div>

      {(loadError || (!siteId && !siteError)) && (
        <Panel title={loadError ? "Erreur de chargement" : "Site indisponible"}>
          <p className={loadError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {loadError || "Aucun site actif n’est associé ou disponible pour ce compte."}
          </p>
        </Panel>
      )}

      <Panel title={editing ? "Modifier un test alcool" : "Enregistrer un test alcool"}>
        <form className="space-y-5" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="alcohol-date">Date</Label>
              <Input id="alcohol-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alcohol-time">Heure</Label>
              <Input id="alcohol-time" type="time" required value={form.heure} onChange={(event) => setForm({ ...form, heure: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alcohol-id">Matricule</Label>
              <Input id="alcohol-id" required maxLength={100} value={form.matricule} onChange={(event) => setForm({ ...form, matricule: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alcohol-person">Nom et prénom</Label>
              <Input id="alcohol-person" required maxLength={255} value={form.personne} onChange={(event) => setForm({ ...form, personne: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alcohol-function">Fonction</Label>
              <select
                id="alcohol-function"
                required
                value={form.fonction}
                onChange={(event) => setForm({ ...form, fonction: event.target.value as JobFunction })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {FUNCTIONS.map((fonction) => <option key={fonction} value={fonction}>{fonction}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alcohol-result">Résultat</Label>
              <select
                id="alcohol-result"
                required
                value={form.resultat}
                onChange={(event) => setForm({ ...form, resultat: event.target.value as CheckForm["resultat"] })}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="Positif">Positif</option>
                <option value="Négatif">Négatif</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {editing && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X /> Annuler</Button>}
            <Button type="submit" disabled={saving || !siteId}>
              {editing ? <Save /> : <Plus />}
              {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Enregistrer le contrôle"}
            </Button>
          </div>
        </form>
      </Panel>

      <section id="alcohol-registry-print-area">
      <Panel title="Registre des tests alcool">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 alcohol-registry-screen">
          <div className="relative min-w-[260px] flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher un test alcool"
              placeholder="Rechercher par date, matricule, personne, fonction ou résultat…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-11 pl-9"
            />
          </div>
          <Button type="button" variant="outline" className="print:hidden" disabled={loading || !visibleEntries.length} onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
          </Button>
        </div>
        {filteredEntries.length ? (
          <div className="overflow-hidden rounded-lg border alcohol-registry-screen">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="w-[12%] border-b px-3 py-3 font-medium">Date</th>
                    <th className="w-[10%] border-b px-3 py-3 font-medium">Heure</th>
                    <th className="w-[14%] border-b px-3 py-3 font-medium">Matricule</th>
                    <th className="w-[22%] border-b px-3 py-3 font-medium">Nom et prénom</th>
                    <th className="w-[16%] border-b px-3 py-3 font-medium">Fonction</th>
                    <th className="w-[13%] border-b px-3 py-3 font-medium">Résultat</th>
                    <th className="w-[13%] border-b px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="align-top transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{formatDate(entry.date.slice(0, 10))}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heure}</td>
                      <td className="break-words px-3 py-3 font-mono text-xs">{entry.matricule || "—"}</td>
                      <td className="break-words px-3 py-3 font-medium">{entry.personne}</td>
                      <td className="break-words px-3 py-3">{entry.fonction || "—"}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${entry.resultat === "Positif" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                          {entry.resultat}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier le test" title="Modifier le test" onClick={() => editEntry(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Supprimer le test" title="Supprimer le test" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <div className="alcohol-registry-screen"><Empty text={loading ? "Chargement des contrôles…" : visibleEntries.length ? "Aucun contrôle ne correspond à votre recherche." : "Aucun contrôle enregistré pour ce site."} /></div>}
        <div className="alcohol-registry-print hidden">
          <h1 className="mb-1 text-xl font-bold">Registre des tests alcool</h1>
          <p className="mb-4 text-sm">Site : {site?.name || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
          <table>
            <thead>
              <tr>{["Date", "Heure", "Matricule", "Nom et prénom", "Fonction", "Résultat"].map((heading) => <th key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.date.slice(0, 10))}</td>
                  <td>{entry.heure || "—"}</td>
                  <td>{entry.matricule || "—"}</td>
                  <td>{entry.personne || "—"}</td>
                  <td>{entry.fonction || "—"}</td>
                  <td>{entry.resultat || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      </section>
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #alcohol-registry-print-area, #alcohol-registry-print-area * { visibility: visible !important; }
          #alcohol-registry-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .alcohol-registry-screen { display: none !important; }
          .alcohol-registry-print { display: block !important; }
          .alcohol-registry-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .alcohol-registry-print th, .alcohol-registry-print td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; }
          .alcohol-registry-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
