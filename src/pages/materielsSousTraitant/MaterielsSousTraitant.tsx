import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LogOut, Package, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type SubcontractorMaterialMovement } from "@/lib/service-api";
import { toast } from "sonner";

type FormData = { date: string; heureEntree: string; materiels: string; nombre: string; entreprise: string };
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const currentTime = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};
const blankForm = (): FormData => ({ date: today(), heureEntree: currentTime(), materiels: "", nombre: "1", entreprise: "" });
const displayDate = (date: string) => {
  const [year, month, day] = date.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

export default function MaterielsSousTraitant() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [entries, setEntries] = useState<SubcontractorMaterialMovement[]>([]);
  const [loadedSiteId, setLoadedSiteId] = useState("");
  const [form, setForm] = useState<FormData>(blankForm);
  const [saving, setSaving] = useState(false);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const loading = Boolean(site?.id) && loadedSiteId !== site?.id;

  const resetForm = () => {
    setForm(blankForm());
    setEditingId(null);
  };

  useEffect(() => {
    if (!site?.id) { setEntries([]); setLoadedSiteId(""); return; }
    let active = true;
    setLoadedSiteId("");
    serviceApi.listSubcontractorMaterials(site.id)
      .then((rows) => { if (active) { setEntries(rows); setLoadedSiteId(site.id); } })
      .catch((error) => { if (active) { setEntries([]); setLoadedSiteId(site.id); toast.error(error instanceof Error ? error.message : "Chargement du registre impossible."); } });
    return () => { active = false; };
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
        entreprise: form.entreprise.trim(),
        siteId: site.id,
      };
      const entry = editingId
        ? await serviceApi.updateSubcontractorMaterial(editingId, payload)
        : await serviceApi.createSubcontractorMaterial(payload);
      setEntries((current) => editingId
        ? current.map((row) => row.id === entry.id ? entry : row)
        : [entry, ...current]);
      resetForm();
      toast.success(editingId ? "Mouvement modifié." : "Entrée du matériel enregistrée.");
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
      entreprise: entry.entreprise,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = async (entry: SubcontractorMaterialMovement) => {
    if (!site?.id || !window.confirm(`Supprimer le mouvement de ${entry.entreprise} ? Cette action est définitive.`)) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteSubcontractorMaterial(entry.id, site.id);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editingId === entry.id) resetForm();
      toast.success("Mouvement supprimé.");
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
      toast.success("Heure de sortie enregistrée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de la sortie impossible.");
    } finally { setExitingId(null); }
  };

  return <div className="space-y-6">
    <PageHeader title="Matériels sous-traitant" subtitle="Enregistrer les entrées de matériel et leur heure de sortie." />
    <div className="max-w-xl">
      <SitePicker id="materiel-sous-traitant-site" value={selectedSiteName} type={site?.type || siteType} sites={sites} canCreate={canCreateSite} onAdd={addSite}
        onChange={(name, type) => { setSiteName(name); setSiteType(type); if (editingId) resetForm(); }} />
      {siteError && <p className="mt-2 text-sm text-destructive">{siteError}</p>}
    </div>

    <Panel title={editingId ? "Modifier le mouvement" : "Nouvelle entrée de matériel"}>
      <form onSubmit={(event) => void submit(event)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5"><Label htmlFor="materiel-date">Date</Label><Input id="materiel-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="materiel-heure-entree">Heure d’entrée</Label><Input id="materiel-heure-entree" type="time" required value={form.heureEntree} onChange={(event) => setForm({ ...form, heureEntree: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="materiel-nombre">Nombre de matériels</Label><Input id="materiel-nombre" type="number" min="1" max="1000000" step="1" required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="materiel-description">Matériels</Label><Input id="materiel-description" required maxLength={20000} placeholder="Désignation des matériels" value={form.materiels} onChange={(event) => setForm({ ...form, materiels: event.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="materiel-entreprise">Entreprise</Label><Input id="materiel-entreprise" required maxLength={255} placeholder="Nom de l’entreprise" value={form.entreprise} onChange={(event) => setForm({ ...form, entreprise: event.target.value })} /></div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          {editingId && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 size-4" />Annuler</Button>}
          <Button type="submit" disabled={saving || !site?.id}>{editingId ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}{saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer l’entrée"}</Button>
        </div>
      </form>
    </Panel>

    <Panel title="Registre des matériels sous-traitant">
      {loading ? <Empty text="Chargement du registre…" /> : entries.length === 0 ? <Empty text="Aucun matériel enregistré sur ce site." /> : (
        <div className="overflow-x-auto rounded-lg border"><table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted/70 text-xs uppercase text-muted-foreground"><tr>
            {["Date", "Heure d’entrée", "Matériels", "Nombre", "Entreprise", "Heure de sortie", "Actions"].map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-border/70">{entries.map((entry) => <tr key={entry.id} className="align-top hover:bg-muted/30">
            <td className="whitespace-nowrap px-3 py-3">{displayDate(entry.date)}</td>
            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureEntree}</td>
            <td className="whitespace-pre-wrap break-words px-3 py-3">{entry.materiels}</td>
            <td className="px-3 py-3 text-center">{entry.nombre}</td>
            <td className="break-words px-3 py-3">{entry.entreprise}</td>
            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie || "—"}</td>
            <td className="px-3 py-3"><div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label="Modifier le mouvement" title="Modifier" onClick={() => beginEdit(entry)}><Pencil className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Supprimer le mouvement" title="Supprimer" className="text-destructive hover:text-destructive" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}><Trash2 className="size-4" /></Button>
              {!entry.heureSortie && <Button type="button" variant="outline" size="sm" disabled={exitingId === entry.id} onClick={() => void registerExit(entry)}><LogOut className="mr-2 size-4" />{exitingId === entry.id ? "Sortie…" : "Sortie"}</Button>}
              {entry.heureSortie && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Package className="size-3" />Sorti</span>}
            </div></td>
          </tr>)}</tbody>
        </table></div>
      )}
    </Panel>
  </div>;
}
