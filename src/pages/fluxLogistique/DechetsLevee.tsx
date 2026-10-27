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

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nowTime = () => new Date().toTimeString().slice(0, 5);

interface DechetsEntry {
  id: string;
  date: string;
  heureSortie?: string | null;
  numeroPesage?: string | null;
  facture?: string | null;
  poids?: string | number | null;
  destinataire?: string | null;
  vehicule?: string | null;
  siteName?: string | null;
}

const formatDate = (value: string) => {
  const date = value?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "—";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

export default function DechetsLevee() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [date, setDate] = useState(today);
  const [heureSortie, setHeureSortie] = useState(nowTime);
  const [numeroPesage, setNumeroPesage] = useState("");
  const [facture, setFacture] = useState("");
  const [poids, setPoids] = useState("");
  const [destinataire, setDestinataire] = useState("");
  const [vehicule, setVehicule] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [registry, setRegistry] = useState<{ siteId: string; entries: DechetsEntry[]; error: string }>({
    siteId: "",
    entries: [],
    error: "",
  });
  const [search, setSearch] = useState("");
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const selectedSiteType = site?.type || siteType;

  useEffect(() => {
    let active = true;
    const requestedSiteId = site?.id;
    if (!requestedSiteId) return () => { active = false; };
    serviceApi.listLogistics(requestedSiteId)
      .then((result) => {
        if (active) setRegistry({
          siteId: requestedSiteId,
          entries: result.filter((entry) => entry.type === "DECHETS"),
          error: "",
        });
      })
      .catch((error) => {
        if (active) setRegistry({
          siteId: requestedSiteId,
          entries: [],
          error: error instanceof Error ? error.message : "Chargement du registre impossible.",
        });
      });
    return () => { active = false; };
  }, [site?.id]);

  const selectedSiteId = site?.id || "";
  const entries = registry.siteId === selectedSiteId ? registry.entries : [];
  const entriesError = registry.siteId === selectedSiteId ? registry.error : "";
  const loadingEntries = Boolean(selectedSiteId) && registry.siteId !== selectedSiteId;
  const filteredEntries = entries.filter((entry) =>
    [entry.numeroPesage, entry.facture, entry.vehicule, entry.destinataire, entry.siteName]
      .some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
  );

  const clearForm = () => {
    setDate(today());
    setHeureSortie(nowTime());
    setNumeroPesage("");
    setFacture("");
    setPoids("");
    setDestinataire("");
    setVehicule("");
    setEditingId(null);
  };

  const startEditing = (entry: DechetsEntry) => {
    setEditingId(entry.id);
    setDate(entry.date.slice(0, 10));
    setHeureSortie(entry.heureSortie || "");
    setNumeroPesage(entry.numeroPesage || "");
    setFacture(entry.facture || "");
    setPoids(entry.poids == null ? "" : String(entry.poids));
    setDestinataire(entry.destinataire || "");
    setVehicule(entry.vehicule || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date,
        heureSortie,
        numeroPesage: numeroPesage.trim(),
        facture: facture.trim(),
        poids: Number(poids),
        destinataire: destinataire.trim(),
        vehicule: vehicule.trim(),
        siteId: site?.id,
        siteName: selectedSiteName,
        siteType: selectedSiteType,
      };
      if (editingId) {
        const { entry } = await serviceApi.updateWasteLogistics(editingId, payload);
        setRegistry((current) => ({
          ...current,
          entries: current.entries.map((item) => item.id === editingId ? { ...item, ...entry } : item),
        }));
        toast.success("Sortie de déchets modifiée.");
      } else {
        const result = await serviceApi.createLogistics({ ...payload, type: "DECHETS" });
        if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement.");
        setRegistry((current) => current.siteId === selectedSiteId
          ? { ...current, entries: [result.entry, ...current.entries] }
          : { siteId: selectedSiteId, entries: [result.entry], error: "" });
        toast.success("Sortie de déchets enregistrée.");
      }
      clearForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: DechetsEntry) => {
    if (!selectedSiteId) return;
    if (!window.confirm(`Supprimer la sortie de déchets « ${entry.numeroPesage || entry.id} » ? Cette action est définitive.`)) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteWasteLogistics(entry.id, selectedSiteId);
      setRegistry((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }));
      if (editingId === entry.id) clearForm();
      toast.success("Sortie supprimée du registre.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Déchets et levée"
        subtitle="Enregistrement des sorties de déchets et des informations de pesage"
      />
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <div className="max-w-3xl">
        <Panel title={editingId ? "Modifier une sortie de déchets" : "Sortie de déchets"}>
          <form className="space-y-5" onSubmit={(event) => void submit(event)}>
            <SitePicker
              id="dechets-site"
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dechets-date">Date de sortie</Label>
                <Input id="dechets-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dechets-time">Heure de sortie</Label>
                <Input id="dechets-time" type="time" required value={heureSortie} onChange={(event) => setHeureSortie(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dechets-pesage">Numéro de pesage</Label>
                <Input id="dechets-pesage" required maxLength={100} value={numeroPesage} onChange={(event) => setNumeroPesage(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dechets-facture">Numéro de facture</Label>
                <Input id="dechets-facture" required maxLength={160} value={facture} onChange={(event) => setFacture(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dechets-poids">Poids (kg)</Label>
                <Input id="dechets-poids" type="number" min="0.01" step="0.01" required value={poids} onChange={(event) => setPoids(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dechets-destinataire">Destinataire / client</Label>
                <Input id="dechets-destinataire" required maxLength={255} value={destinataire} onChange={(event) => setDestinataire(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dechets-vehicule">Véhicule</Label>
                <Input id="dechets-vehicule" required maxLength={160} placeholder="Immatriculation ou numéro du véhicule" value={vehicule} onChange={(event) => setVehicule(event.target.value)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" className="flex-1 sm:flex-none" disabled={saving || !selectedSiteName.trim()}>
                {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer la sortie"}
              </Button>
              {editingId && <Button type="button" variant="outline" disabled={saving} onClick={clearForm}>Annuler</Button>}
            </div>
          </form>
        </Panel>
      </div>
      <Panel title="Registre des sorties de déchets">
        {entriesError && <p className="mb-3 text-sm text-destructive">{entriesError}</p>}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/20 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Sorties enregistrées</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{entries.length}</p>
          </div>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher dans le registre des déchets"
              placeholder="Rechercher véhicule, pesage, facture, client…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-full min-h-11 pl-9"
            />
          </div>
        </div>
        {!site?.id ? (
          <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Sélectionnez un site pour afficher le registre.
          </p>
        ) : loadingEntries ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Chargement du registre…</p>
        ) : entries.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Aucune sortie de déchets enregistrée pour ce site.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-3 py-3">Heure de sortie</th>
                    <th className="px-3 py-3">Véhicule</th>
                    <th className="px-3 py-3">N° pesage</th>
                    <th className="px-3 py-3">Facture</th>
                    <th className="px-3 py-3 text-right">Poids (kg)</th>
                    <th className="px-4 py-3">Destinataire / client</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium">{formatDate(entry.date)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie || "—"}</td>
                      <td className="px-3 py-3 font-medium">{entry.vehicule || "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.numeroPesage || "—"}</td>
                      <td className="px-3 py-3">{entry.facture || "—"}</td>
                      <td className="px-3 py-3 text-right font-mono">{entry.poids == null ? "—" : Number(entry.poids).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3">{entry.destinataire || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button type="button" size="icon" variant="ghost" aria-label="Modifier la sortie" title="Modifier" onClick={() => startEditing(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Supprimer la sortie"
                            title="Supprimer"
                            disabled={deletingId !== null}
                            onClick={() => void deleteEntry(entry)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Aucun résultat pour cette recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
