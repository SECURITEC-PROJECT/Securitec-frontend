import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Pencil, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

interface MatierePremiereEntry {
  id: string;
  date: string;
  heurePointe?: string | null;
  vehicule?: string | null;
  designation?: string | null;
  quantite?: number | string | null;
  document?: string | null;
  provenance?: string | null;
}

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nowTime = () => new Date().toTimeString().slice(0, 5);

export default function DechargementMatierePremiere() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [date, setDate] = useState(today);
  const [heurePointe, setHeurePointe] = useState(nowTime);
  const [vehicule, setVehicule] = useState("");
  const [designation, setDesignation] = useState("");
  const [quantite, setQuantite] = useState("");
  const [document, setDocument] = useState("");
  const [provenance, setProvenance] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [registry, setRegistry] = useState<{
    siteId: string;
    entries: MatierePremiereEntry[];
    error: string;
  }>({ siteId: "", entries: [], error: "" });
  const [search, setSearch] = useState("");

  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const selectedSiteType = site?.type || siteType;
  const selectedSiteId = site?.id || "";

  useEffect(() => {
    let active = true;
    if (!selectedSiteId) return () => { active = false; };

    serviceApi.listLogistics(selectedSiteId)
      .then((result) => {
        if (active) setRegistry({
          siteId: selectedSiteId,
          entries: result.filter((entry) => entry.type === "MATIERE_PREMIERE"),
          error: "",
        });
      })
      .catch((error) => {
        if (active) setRegistry({
          siteId: selectedSiteId,
          entries: [],
          error: error instanceof Error ? error.message : "Chargement du registre impossible.",
        });
      });

    return () => { active = false; };
  }, [selectedSiteId]);

  const entries = registry.siteId === selectedSiteId ? registry.entries : [];
  const entriesError = registry.siteId === selectedSiteId ? registry.error : "";
  const loadingEntries = Boolean(selectedSiteId) && registry.siteId !== selectedSiteId;
  const filteredEntries = entries.filter((entry) =>
    [entry.date, entry.heurePointe, entry.vehicule, entry.designation, entry.document, entry.provenance]
      .some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
  );

  const clearForm = () => {
    setDate(today());
    setHeurePointe(nowTime());
    setVehicule("");
    setDesignation("");
    setQuantite("");
    setDocument("");
    setProvenance("");
    setEditingId(null);
  };

  const startEditing = (entry: MatierePremiereEntry) => {
    setEditingId(entry.id);
    setDate(entry.date.slice(0, 10));
    setHeurePointe(entry.heurePointe || "");
    setVehicule(entry.vehicule || "");
    setDesignation(entry.designation || "");
    setQuantite(entry.quantite == null ? "" : String(entry.quantite));
    setDocument(entry.document || "");
    setProvenance(entry.provenance || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: "MATIERE_PREMIERE",
        date,
        heurePointe,
        vehicule: vehicule.trim(),
        designation: designation.trim(),
        quantite: Number(quantite),
        document: document.trim(),
        provenance: provenance.trim(),
        siteId: site?.id,
        siteName: selectedSiteName,
        siteType: selectedSiteType,
      };
      if (editingId) {
        const { entry } = await serviceApi.updateMatierePremiereLogistics(editingId, payload);
        setRegistry((current) => ({
          ...current,
          entries: current.entries.map((item) => item.id === editingId ? { ...item, ...entry } : item),
        }));
        toast.success("Déchargement modifié.");
      } else {
        const result = await serviceApi.createLogistics(payload);
        if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement.");
        setRegistry((current) => current.siteId === selectedSiteId
          ? { ...current, entries: [result.entry, ...current.entries] }
          : { siteId: selectedSiteId, entries: [result.entry], error: "" });
        toast.success("Déchargement de matière première enregistré.");
      }
      clearForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: MatierePremiereEntry) => {
    if (!selectedSiteId) return;
    if (!window.confirm(`Supprimer le déchargement « ${entry.designation || entry.id} » ? Cette action est définitive.`)) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteMatierePremiereLogistics(entry.id, selectedSiteId);
      setRegistry((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }));
      if (editingId === entry.id) clearForm();
      toast.success("Déchargement supprimé du registre.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Déchargement matière première"
        subtitle="Enregistrement des réceptions de matière première"
      />
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <div className="max-w-4xl">
        <Panel title={editingId ? "Modifier un déchargement" : "Réception de matière première"}>
          <form className="space-y-5 rounded-lg border bg-card p-4 shadow-sm" onSubmit={(event) => void submit(event)}>
            <SitePicker
              id="matiere-site"
              value={selectedSiteName}
              type={selectedSiteType}
              sites={sites}
              canCreate={canCreateSite}
              onAdd={addSite}
              onChange={(name, type) => {
                setSiteName(name);
                setSiteType(type);
              }}
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="matiere-date">Date</Label>
                <Input id="matiere-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-heure">Heure de pointe</Label>
                <Input id="matiere-heure" type="time" required value={heurePointe} onChange={(event) => setHeurePointe(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-vehicule">Véhicule</Label>
                <Input id="matiere-vehicule" required maxLength={160} value={vehicule} onChange={(event) => setVehicule(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-designation">Désignation</Label>
                <Input id="matiere-designation" required maxLength={160} value={designation} onChange={(event) => setDesignation(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-quantite">Quantité</Label>
                <Input id="matiere-quantite" type="number" min="0.01" step="0.01" required value={quantite} onChange={(event) => setQuantite(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-document">Bon de livraison / facture</Label>
                <Input id="matiere-document" required maxLength={160} value={document} onChange={(event) => setDocument(event.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="matiere-provenance">Provenance</Label>
                <Input id="matiere-provenance" required maxLength={255} value={provenance} onChange={(event) => setProvenance(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || !selectedSiteName.trim()}>
                {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer le déchargement"}
              </Button>
              {editingId && <Button type="button" variant="outline" disabled={saving} onClick={clearForm}>Annuler</Button>}
            </div>
          </form>
        </Panel>
      </div>
      <Panel title="Registre des déchargements">
        <div className="mb-4 flex max-w-md items-center gap-2 rounded-md border bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            aria-label="Rechercher dans le registre"
            className="border-0 px-0 shadow-none focus-visible:ring-0"
            placeholder="Rechercher véhicule, désignation, document…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {entriesError ? (
          <p className="text-sm text-destructive">{entriesError}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Heure de pointe</th>
                  <th className="px-4 py-3">Véhicule</th>
                  <th className="px-4 py-3">Désignation</th>
                  <th className="px-4 py-3">Quantité</th>
                  <th className="px-4 py-3">Bon de livraison / facture</th>
                  <th className="px-4 py-3">Provenance</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingEntries ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={8}>Chargement du registre…</td></tr>
                ) : filteredEntries.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={8}>
                    {entries.length === 0 ? "Aucun déchargement enregistré." : "Aucun résultat pour cette recherche."}
                  </td></tr>
                ) : filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3">{entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                    <td className="px-4 py-3">{entry.heurePointe || "—"}</td>
                    <td className="px-4 py-3">{entry.vehicule || "—"}</td>
                    <td className="px-4 py-3">{entry.designation || "—"}</td>
                    <td className="px-4 py-3">{entry.quantite ?? "—"}</td>
                    <td className="px-4 py-3">{entry.document || "—"}</td>
                    <td className="px-4 py-3">{entry.provenance || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Modifier ce déchargement"
                          title="Modifier"
                          disabled={Boolean(deletingId)}
                          onClick={() => startEditing(entry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Supprimer ce déchargement"
                          title="Supprimer"
                          disabled={deletingId === entry.id}
                          onClick={() => void deleteEntry(entry)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
