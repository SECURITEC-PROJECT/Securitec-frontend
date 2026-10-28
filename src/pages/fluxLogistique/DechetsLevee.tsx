import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { printRecord } from "@/lib/printRecord";
import { ClipboardList, Pencil, Printer, Scale, Search, Trash2, Truck } from "lucide-react";
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
  typeDechet?: "LEVURE" | "DRECHE" | null;
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

const formatWasteType = (type?: DechetsEntry["typeDechet"]) =>
  type === "LEVURE" ? "Levure" : type === "DRECHE" ? "Drèche" : "—";

export default function DechetsLevee() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [date, setDate] = useState(today);
  const [typeDechet, setTypeDechet] = useState<"" | "LEVURE" | "DRECHE">("");
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
    [formatWasteType(entry.typeDechet), entry.numeroPesage, entry.facture, entry.vehicule, entry.destinataire, entry.siteName]
      .some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),
  );

  const clearForm = () => {
    setDate(today());
    setTypeDechet("");
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
    setTypeDechet(entry.typeDechet || "");
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
        typeDechet,
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

  const handlePrintRegistry = () => {
    const originalTitle = document.title;
    document.title = "Registre des sorties de déchets";
    window.addEventListener("afterprint", () => {
      document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (entry: DechetsEntry) => {
    const rows = [
      ["Date", formatDate(entry.date)],
      ["Type", formatWasteType(entry.typeDechet)],
      ["Heure de sortie", entry.heureSortie || "—"],
      ["Véhicule", entry.vehicule || "—"],
      ["N° de pesage", entry.numeroPesage || "—"],
      ["Facture", entry.facture || "—"],
      ["Poids", entry.poids == null ? "—" : `${Number(entry.poids).toLocaleString("fr-FR")} kg`],
      ["Destinataire / client", entry.destinataire || "—"],
    ] as const;
    printRecord("Sortie de déchets", entry.siteName || selectedSiteName, rows);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Déchêt et Levure"
        subtitle="Enregistrement des sorties de déchets et des informations de pesage"
      />
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <section className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{editingId ? "Modifier une sortie" : "Nouvelle sortie de déchets"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Complétez les informations du transport et du pesage.</p>
          </div>
        </div>
        <form className="space-y-5 p-4 sm:p-6" onSubmit={(event) => void submit(event)}>
          <div className="max-w-2xl">
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
          </div>

          <section className="rounded-lg border bg-muted/15 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Truck className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Informations de sortie</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Date, heure, véhicule et destinataire.</p>
              </div>
            </div>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dechets-date">Date de sortie</Label>
                <Input id="dechets-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-type">Désignation</Label>
                <select
                  id="dechets-type"
                  required
                  value={typeDechet}
                  onChange={(event) => setTypeDechet(event.target.value as "" | "LEVURE" | "DRECHE")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sélectionner un type</option>
                  <option value="LEVURE">Levure</option>
                  <option value="DRECHE">Drèche</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-time">Heure de sortie</Label>
                <Input id="dechets-time" type="time" required value={heureSortie} onChange={(event) => setHeureSortie(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-vehicule">Véhicule</Label>
                <Input id="dechets-vehicule" required maxLength={160} placeholder="Immatriculation ou numéro" value={vehicule} onChange={(event) => setVehicule(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-destinataire">Destinataire / client</Label>
                <Input id="dechets-destinataire" required maxLength={255} value={destinataire} onChange={(event) => setDestinataire(event.target.value)} />
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-muted/15 p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Scale className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold">Références et pesage</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Numéros de suivi et poids mesuré.</p>
              </div>
            </div>
            <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dechets-pesage">Numéro de pesage</Label>
                <Input id="dechets-pesage" required maxLength={100} value={numeroPesage} onChange={(event) => setNumeroPesage(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-facture">Numéro de facture</Label>
                <Input id="dechets-facture" required maxLength={160} value={facture} onChange={(event) => setFacture(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-poids">Poids (kg)</Label>
                <Input id="dechets-poids" type="number" min="0.01" step="0.01" required value={poids} onChange={(event) => setPoids(event.target.value)} />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-2 border-t pt-5">
            {editingId && <Button type="button" variant="outline" disabled={saving} onClick={clearForm}>Annuler</Button>}
            <Button type="submit" disabled={saving || !selectedSiteName.trim()}>
              {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer la sortie"}
            </Button>
          </div>
        </form>
      </section>
      <section id="waste-registry-print-area">
        <Panel title="Registre des sorties de déchets">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 waste-registry-screen">
          <p className="text-sm text-muted-foreground">Historique des sorties pour le site sélectionné.</p>
          <Button type="button" variant="outline" className="print:hidden" disabled={!entries.length} onClick={handlePrintRegistry}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
          </Button>
        </div>
        {entriesError && <p className="waste-registry-screen mb-3 text-sm text-destructive">{entriesError}</p>}
        <div className="relative mb-4 waste-registry-screen">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher dans le registre des déchets"
              placeholder="Rechercher véhicule, pesage, facture, client…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-full min-h-11 pl-9"
            />
        </div>
        {!site?.id ? (
          <p className="waste-registry-screen rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Sélectionnez un site pour afficher le registre.
          </p>
        ) : loadingEntries ? (
          <p className="waste-registry-screen py-8 text-center text-sm text-muted-foreground">Chargement du registre…</p>
        ) : entries.length === 0 ? (
          <p className="waste-registry-screen rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Aucune sortie de déchets enregistrée pour ce site.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border waste-registry-screen">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-3 py-3">Désignation</th>
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
                      <td className="px-3 py-3">{formatWasteType(entry.typeDechet)}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie || "—"}</td>
                      <td className="px-3 py-3 font-medium">{entry.vehicule || "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.numeroPesage || "—"}</td>
                      <td className="px-3 py-3">{entry.facture || "—"}</td>
                      <td className="px-3 py-3 text-right font-mono">{entry.poids == null ? "—" : Number(entry.poids).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3">{entry.destinataire || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button type="button" size="icon" variant="ghost" aria-label="Imprimer le bon de sortie" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}>
                            <Printer className="h-4 w-4" />
                          </Button>
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
                      <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Aucun résultat pour cette recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {!loadingEntries && (
          <div className="waste-registry-print hidden">
            <h1 className="mb-1 text-xl font-bold">Registre des sorties de déchets</h1>
            <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
            <table>
              <thead>
                <tr>
                  {["Date", "Désignation", "Heure de sortie", "Véhicule", "N° pesage", "Facture", "Poids (kg)", "Destinataire / client"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.date)}</td>
                    <td>{formatWasteType(entry.typeDechet)}</td>
                    <td>{entry.heureSortie || "—"}</td>
                    <td>{entry.vehicule || "—"}</td>
                    <td>{entry.numeroPesage || "—"}</td>
                    <td>{entry.facture || "—"}</td>
                    <td>{entry.poids == null ? "—" : Number(entry.poids).toLocaleString("fr-FR")}</td>
                    <td>{entry.destinataire || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      </section>
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #waste-registry-print-area, #waste-registry-print-area * { visibility: visible !important; }
          #waste-registry-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .waste-registry-screen { display: none !important; }
          .waste-registry-print { display: block !important; }
          .waste-registry-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .waste-registry-print th, .waste-registry-print td { border: 1px solid #777; padding: 6px; text-align: left; }
          .waste-registry-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
