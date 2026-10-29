import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { confirmDeletion } from "@/lib/deletion-toast";
import { serviceApi, type ChauffeurRecord } from "@/lib/service-api";
import { Contact, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

type ChauffeurForm = {
  nomPrenom: string;
  telephone: string;
  cin: string;
  numeroPermis: string;
  expirationPermis: string;
  vehicule: string;
  matricule: string;
};

const emptyForm = (): ChauffeurForm => ({
  nomPrenom: "",
  telephone: "",
  cin: "",
  numeroPermis: "",
  expirationPermis: "",
  vehicule: "",
  matricule: "",
});

const noChauffeurs: ChauffeurRecord[] = [];

export default function Chauffeurs() {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [registry, setRegistry] = useState<{ siteId: string; records: ChauffeurRecord[] }>({ siteId: "", records: [] });
  const [form, setForm] = useState<ChauffeurForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const selectedSiteId = siteId || sites[0]?.id || "";
  const records = registry.siteId === selectedSiteId ? registry.records : noChauffeurs;
  const loading = Boolean(selectedSiteId) && registry.siteId !== selectedSiteId;

  useEffect(() => {
    if (!selectedSiteId) return;
    let active = true;
    serviceApi.listChauffeurs(selectedSiteId)
      .then((result) => { if (active) setRegistry({ siteId: selectedSiteId, records: result }); })
      .catch((reason) => {
        if (active) {
          setRegistry({ siteId: selectedSiteId, records: [] });
          setError(reason instanceof Error ? reason.message : "Chargement des chauffeurs impossible.");
        }
      })
    return () => { active = false; };
  }, [selectedSiteId]);

  const filtered = useMemo(() => {
    const query = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
    if (!query) return records;
    return records.filter((driver) =>
      [driver.nomPrenom, driver.telephone, driver.cin, driver.numeroPermis, driver.vehicule, driver.matricule]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("fr")
        .includes(query),
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
    const payload = { ...form, siteId: selectedSiteId };
    try {
      if (editingId) {
        const updated = await serviceApi.updateChauffeur(editingId, payload);
        setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
          ...current,
          records: current.records.map((driver) => driver.id === editingId ? updated : driver),
        }));
        toast.success("Fiche chauffeur modifiée.");
      } else {
        const created = await serviceApi.createChauffeur(payload);
        setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
          ...current,
          records: [...current.records, created].sort((a, b) => a.nomPrenom.localeCompare(b.nomPrenom, "fr")),
        }));
        toast.success("Fiche chauffeur enregistrée.");
      }
      resetForm();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement de la fiche chauffeur impossible.");
    } finally {
      setSaving(false);
    }
  };

  const edit = (driver: ChauffeurRecord) => {
    setEditingId(driver.id);
    setForm({
      nomPrenom: driver.nomPrenom,
      telephone: driver.telephone || "",
      cin: driver.cin || "",
      numeroPermis: driver.numeroPermis || "",
      expirationPermis: driver.expirationPermis || "",
      vehicule: driver.vehicule || "",
      matricule: driver.matricule || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (driver: ChauffeurRecord) => {
    if (!(await confirmDeletion(`Supprimer la fiche de ${driver.nomPrenom} ?`))) return;
    setWorkingId(driver.id);
    setError("");
    try {
      await serviceApi.deleteChauffeur(driver.id, selectedSiteId);
      setRegistry((current) => current.siteId !== selectedSiteId ? current : ({
        ...current,
        records: current.records.filter((entry) => entry.id !== driver.id),
      }));
      if (editingId === driver.id) resetForm();
      toast.success("Fiche chauffeur supprimée.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Suppression de la fiche chauffeur impossible.");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Chauffeurs" subtitle="Gérez les coordonnées et les pièces de conduite des chauffeurs du site." />

      <div className="w-full space-y-1.5">
        <label htmlFor="chauffeur-site" className="text-sm font-medium">Site</label>
        <select id="chauffeur-site" value={selectedSiteId} onChange={(event) => { setSiteId(event.target.value); setError(""); }} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {!sites.length && <option value="">Aucun site disponible</option>}
          {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
        </select>
        {siteError && <p role="alert" className="text-sm text-destructive">{siteError}</p>}
      </div>

      <section className="w-full space-y-4 rounded-lg border bg-card p-5">
        <div className="flex items-center gap-2">
          <Contact className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">{editingId ? "Modifier la fiche chauffeur" : "Nouvelle fiche chauffeur"}</h2>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label htmlFor="driver-name" className="text-sm font-medium">Nom et prénom *</label>
              <Input id="driver-name" required maxLength={255} autoComplete="name" value={form.nomPrenom} onChange={(event) => setForm({ ...form, nomPrenom: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="driver-phone" className="text-sm font-medium">Téléphone</label>
              <Input id="driver-phone" type="tel" maxLength={40} autoComplete="tel" value={form.telephone} onChange={(event) => setForm({ ...form, telephone: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="driver-cin" className="text-sm font-medium">N° CIN / pièce d’identité</label>
              <Input id="driver-cin" maxLength={80} value={form.cin} onChange={(event) => setForm({ ...form, cin: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="driver-license" className="text-sm font-medium">N° permis de conduire</label>
              <Input id="driver-license" maxLength={100} value={form.numeroPermis} onChange={(event) => setForm({ ...form, numeroPermis: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="driver-license-expiry" className="text-sm font-medium">Expiration du permis</label>
              <Input id="driver-license-expiry" type="date" value={form.expirationPermis} onChange={(event) => setForm({ ...form, expirationPermis: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="driver-vehicle" className="text-sm font-medium">Véhicule</label>
              <Input id="driver-vehicle" maxLength={160} value={form.vehicule} onChange={(event) => setForm({ ...form, vehicule: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="driver-registration" className="text-sm font-medium">Matricule du véhicule</label>
              <Input id="driver-registration" maxLength={40} value={form.matricule} onChange={(event) => setForm({ ...form, matricule: event.target.value })} />
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
            {editingId && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 h-4 w-4" />Annuler</Button>}
            <Button type="submit" disabled={!selectedSiteId || saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : editingId ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
              {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer le chauffeur"}
            </Button>
          </div>
        </form>
      </section>

      {error && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Chauffeurs enregistrés <span className="text-sm font-normal text-muted-foreground">({records.length})</span></h2>
          <div className="relative w-full sm:w-80">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Rechercher un chauffeur" placeholder="Nom, téléphone, CIN, permis, véhicule, matricule…" value={search} onChange={(event) => setSearch(event.target.value)} className="pl-9" />
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="border-b px-3 py-3">Nom et prénom</th>
                <th className="border-b px-3 py-3">Téléphone</th>
                <th className="border-b px-3 py-3">CIN</th>
                <th className="border-b px-3 py-3">Permis / expiration</th>
                <th className="border-b px-3 py-3">Véhicule</th>
                <th className="border-b px-3 py-3">Matricule</th>
                <th className="border-b px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Chargement des chauffeurs…</td></tr>
                : filtered.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">{records.length ? "Aucun chauffeur ne correspond à la recherche." : "Aucun chauffeur enregistré pour ce site."}</td></tr>
                  : filtered.map((driver) => (
                    <tr key={driver.id} className="align-top hover:bg-muted/30">
                      <td className="border-b px-3 py-3 font-medium">{driver.nomPrenom}</td>
                      <td className="border-b px-3 py-3">{driver.telephone || "—"}</td>
                      <td className="border-b px-3 py-3">{driver.cin || "—"}</td>
                      <td className="border-b px-3 py-3">{driver.numeroPermis || "—"}{driver.expirationPermis && <span className="block text-xs text-muted-foreground">Expire le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${driver.expirationPermis}T00:00:00Z`))}</span>}</td>
                      <td className="border-b px-3 py-3">{driver.vehicule || "—"}</td>
                      <td className="border-b px-3 py-3">{driver.matricule || "—"}</td>
                      <td className="border-b px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" aria-label={`Modifier ${driver.nomPrenom}`} onClick={() => edit(driver)} disabled={workingId === driver.id}><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${driver.nomPrenom}`} onClick={() => void remove(driver)} disabled={workingId === driver.id}>{workingId === driver.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}</Button>
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
