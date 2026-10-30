import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { confirmDeletion } from "@/lib/deletion-toast";
import { serviceApi, type TransporteurRecord } from "@/lib/service-api";
import { Loader2, Pencil, Plus, Search, Trash2, Truck, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

type TransporteurForm = Omit<TransporteurRecord, "id" | "siteId" | "createdAt">;

const emptyForm = (): TransporteurForm => ({
  nomTransporteur: "",
  vehicule: "",
  matricule: "",
  telephone: "",
  chauffeur: "",
  observation: "",
});

const noTransporteurs: TransporteurRecord[] = [];

export default function Transporteurs() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [registry, setRegistry] = useState<{ siteId: string; records: TransporteurRecord[] }>({ siteId: "", records: [] });
  const [form, setForm] = useState<TransporteurForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const selectedSiteId = siteId || sites[0]?.id || "";
  const records = registry.siteId === selectedSiteId ? registry.records : noTransporteurs;
  const loading = Boolean(selectedSiteId) && registry.siteId !== selectedSiteId;

  useEffect(() => {
    if (!selectedSiteId) return;
    let active = true;
    serviceApi.listTransporteurs(selectedSiteId)
      .then((result) => { if (active) setRegistry({ siteId: selectedSiteId, records: result }); })
      .catch((reason) => {
        if (active) {
          setRegistry({ siteId: selectedSiteId, records: [] });
          setError(reason instanceof Error ? reason.message : "Chargement des transporteurs impossible.");
        }
      });
    return () => { active = false; };
  }, [selectedSiteId]);

  const filtered = useMemo(() => {
    const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
    const query = normalize(search.trim());
    if (!query) return records;
    return records.filter((entry) =>
      [entry.nomTransporteur, entry.vehicule, entry.matricule, entry.telephone, entry.chauffeur, entry.observation]
        .filter(Boolean)
        .some((value) => normalize(value || "").includes(query)),
    );
  }, [records, search]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSiteId) return;
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      matricule: form.matricule || null,
      telephone: form.telephone || null,
      chauffeur: form.chauffeur || null,
      observation: form.observation || null,
      siteId: selectedSiteId,
    };
    try {
      if (editingId) {
        const updated = await serviceApi.updateTransporteur(editingId, payload);
        setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
          ...current,
          records: current.records.map((entry) => entry.id === editingId ? updated : entry),
        }));
        toast.success("Fiche transporteur modifiée.");
      } else {
        const created = await serviceApi.createTransporteur(payload);
        setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
          ...current,
          records: [...current.records, created].sort((a, b) =>
            a.nomTransporteur.localeCompare(b.nomTransporteur, "fr") || a.vehicule.localeCompare(b.vehicule, "fr"),
          ),
        }));
        toast.success("Fiche transporteur enregistrée.");
      }
      resetForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement de la fiche transporteur impossible.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (entry: TransporteurRecord) => {
    setEditingId(entry.id);
    setForm({
      nomTransporteur: entry.nomTransporteur,
      vehicule: entry.vehicule,
      matricule: entry.matricule || "",
      telephone: entry.telephone || "",
      chauffeur: entry.chauffeur || "",
      observation: entry.observation || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (entry: TransporteurRecord) => {
    if (!(await confirmDeletion(`Supprimer la fiche transporteur ${entry.nomTransporteur} — ${entry.vehicule} ?`))) return;
    setWorkingId(entry.id);
    setError("");
    try {
      await serviceApi.deleteTransporteur(entry.id, selectedSiteId);
      setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
        ...current,
        records: current.records.filter((item) => item.id !== entry.id),
      }));
      if (editingId === entry.id) resetForm();
      toast.success("Fiche transporteur supprimée.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression de la fiche transporteur impossible.");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Transporteurs" subtitle="Enregistrez les transporteurs et les véhicules associés à chaque site." />

      <div className="w-full space-y-1.5">
        <label htmlFor="transporteur-site" className="text-sm font-medium">Site</label>
        <select id="transporteur-site" value={selectedSiteId} onChange={(event) => { setSiteId(event.target.value); setError(""); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {!sites.length && <option value="">Aucun site disponible</option>}
          {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
        {siteError && <p role="alert" className="text-sm text-destructive">{siteError}</p>}
      </div>

      <section className="w-full space-y-4 rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">{editingId ? "Modifier la fiche transporteur" : "Nouveau transporteur"}</h2>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="transporteur-name" className="text-sm font-medium">Nom du transporteur *</label>
              <Input id="transporteur-name" required maxLength={255} value={form.nomTransporteur} onChange={(event) => setForm({ ...form, nomTransporteur: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transporteur-vehicle" className="text-sm font-medium">Nom du véhicule *</label>
              <Input id="transporteur-vehicle" required maxLength={160} value={form.vehicule} onChange={(event) => setForm({ ...form, vehicule: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transporteur-registration" className="text-sm font-medium">Numéro / immatriculation</label>
              <Input id="transporteur-registration" maxLength={40} value={form.matricule || ""} onChange={(event) => setForm({ ...form, matricule: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transporteur-phone" className="text-sm font-medium">Téléphone</label>
              <Input id="transporteur-phone" type="tel" maxLength={40} autoComplete="tel" value={form.telephone || ""} onChange={(event) => setForm({ ...form, telephone: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="transporteur-driver" className="text-sm font-medium">Nom du chauffeur</label>
              <Input id="transporteur-driver" maxLength={255} autoComplete="name" value={form.chauffeur || ""} onChange={(event) => setForm({ ...form, chauffeur: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="transporteur-observation" className="text-sm font-medium">Observation</label>
              <textarea id="transporteur-observation" maxLength={2000} rows={3} value={form.observation || ""} onChange={(event) => setForm({ ...form, observation: event.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            {editingId && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 h-4 w-4" />Annuler</Button>}
            <Button type="submit" disabled={!selectedSiteId || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer le transporteur"}
            </Button>
          </div>
        </form>
      </section>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Transporteurs enregistrés <span className="text-sm font-normal text-muted-foreground">({records.length})</span></h2>
          <div className="relative w-full sm:w-80">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Rechercher un transporteur" placeholder="Nom, véhicule, matricule, téléphone, chauffeur…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[850px] border-collapse text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="border-b px-3 py-3">Transporteur</th>
                <th className="border-b px-3 py-3">Véhicule</th>
                <th className="border-b px-3 py-3">Numéro / immatriculation</th>
                <th className="border-b px-3 py-3">Téléphone</th>
                <th className="border-b px-3 py-3">Chauffeur</th>
                <th className="border-b px-3 py-3">Observation</th>
                <th className="border-b px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Chargement des transporteurs…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{records.length ? "Aucun transporteur ne correspond à la recherche." : "Aucun transporteur enregistré pour ce site."}</td></tr>
                  : filtered.map((entry) => (
                    <tr key={entry.id} className="align-top hover:bg-muted/30">
                      <td className="border-b px-3 py-3 font-medium">{entry.nomTransporteur}</td>
                      <td className="border-b px-3 py-3">{entry.vehicule}</td>
                      <td className="border-b px-3 py-3">{entry.matricule || "—"}</td>
                      <td className="border-b px-3 py-3">{entry.telephone || "—"}</td>
                      <td className="border-b px-3 py-3">{entry.chauffeur || "—"}</td>
                      <td className="border-b px-3 py-3">{entry.observation || "—"}</td>
                      <td className="border-b px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" aria-label={`Modifier ${entry.nomTransporteur}`} onClick={() => edit(entry)} disabled={workingId === entry.id}><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${entry.nomTransporteur}`} onClick={() => void remove(entry)} disabled={workingId === entry.id}>{workingId === entry.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
