import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Pencil, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

interface DepotageEntry {
  id: string;
  date: string;
  heurePointe?: string | null;
  titre?: string | null;
  plomb?: string | null;
  designation?: string | null;
  quantite?: number | string | null;
  cree?: string | null;
  chauffeur?: string | null;
  magasinier?: string | null;
  siteName?: string | null;
}

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nowTime = () => new Date().toTimeString().slice(0, 5);
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);

export default function DepotageFuelGasoil() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [date, setDate] = useState(today);
  const [heurePointe, setHeurePointe] = useState(nowTime);
  const [titre, setTitre] = useState("");
  const [plomb, setPlomb] = useState("");
  const [designation, setDesignation] = useState("");
  const [quantite, setQuantite] = useState("");
  const [cree, setCree] = useState("");
  const [chauffeur, setChauffeur] = useState("");
  const [magasinier, setMagasinier] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [registry, setRegistry] = useState<{
    siteId: string;
    entries: DepotageEntry[];
    error: string;
  }>({ siteId: "", entries: [], error: "" });
  const [search, setSearch] = useState("");
  const [searchDate, setSearchDate] = useState("");

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
          entries: result.filter((entry) => entry.type === "DEPOTAGE_FUEL"),
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
  const filteredEntries = entries.filter((entry) => {
    const matchesDate = !searchDate || entry.date?.slice(0, 10) === searchDate;
    const matchesText = [
      entry.date, entry.heurePointe, entry.titre, entry.plomb, entry.designation, entry.cree,
      entry.chauffeur, entry.magasinier,
    ].some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    return matchesDate && matchesText;
  });

  const clearForm = () => {
    setDate(today());
    setHeurePointe(nowTime());
    setTitre("");
    setPlomb("");
    setDesignation("");
    setQuantite("");
    setCree("");
    setChauffeur("");
    setMagasinier("");
    setEditingId(null);
  };

  const startEditing = (entry: DepotageEntry) => {
    setEditingId(entry.id);
    setDate(entry.date.slice(0, 10));
    setHeurePointe(entry.heurePointe || "");
    setTitre(entry.titre || "");
    setPlomb(entry.plomb || "");
    setDesignation(entry.designation || "");
    setQuantite(entry.quantite == null ? "" : String(entry.quantite));
    setCree(entry.cree || "");
    setChauffeur(entry.chauffeur || "");
    setMagasinier(entry.magasinier || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: "DEPOTAGE_FUEL",
        date,
        heurePointe,
        titre: titre.trim(),
        plomb: plomb.trim(),
        designation: designation.trim(),
        quantite: Number(quantite),
        cree: cree.trim(),
        chauffeur: chauffeur.trim(),
        magasinier: magasinier.trim(),
        siteId: site?.id,
        siteName: selectedSiteName,
        siteType: selectedSiteType,
      };
      if (editingId) {
        const { entry } = await serviceApi.updateDepotageFuelLogistics(editingId, payload);
        setRegistry((current) => ({
          ...current,
          entries: current.entries.map((item) => item.id === editingId ? { ...item, ...entry } : item),
        }));
        toast.success("Dépotage fuel/gasoil modifié.");
      } else {
        const result = await serviceApi.createLogistics(payload);
        if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement.");
        setRegistry((current) => current.siteId === selectedSiteId
          ? { ...current, entries: [result.entry, ...current.entries] }
          : { siteId: selectedSiteId, entries: [result.entry], error: "" });
        toast.success("Dépotage fuel/gasoil enregistré.");
      }
      clearForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: DepotageEntry) => {
    if (!selectedSiteId) return;
    if (!window.confirm(`Supprimer le dépotage « ${entry.titre || entry.id} » ? Cette action est définitive.`)) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteDepotageFuelLogistics(entry.id, selectedSiteId);
      setRegistry((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }));
      if (editingId === entry.id) clearForm();
      toast.success("Dépotage supprimé du registre.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const printEntry = (entry: DepotageEntry) => {
    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer le bon.");
      return;
    }
    const displayDate = entry.date?.slice(0, 10).split("-").reverse().join("/") || "—";
    const rows = [
      ["Date", displayDate],
      ["Heure de pointe", entry.heurePointe || "—"],
      ["Titre", entry.titre || "—"],
      ["Plomb", entry.plomb || "—"],
      ["Désignation", entry.designation || "—"],
      ["Quantité", entry.quantite == null ? "—" : String(entry.quantite)],
      ["Créé par", entry.cree || "—"],
      ["Chauffeur", entry.chauffeur || "—"],
      ["Magasinier", entry.magasinier || "—"],
    ];
    const details = rows.map(([label, value]) =>
      `<div class="row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`,
    ).join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>Bon de dépotage fuel/gasoil</title>
          <style>
            @page { size: A5 portrait; margin: 12mm; }
            * { box-sizing: border-box; }
            body { color: #172033; font: 14px Arial, sans-serif; }
            main { max-width: 700px; margin: 0 auto; }
            h1 { margin: 0 0 6px; text-align: center; font-size: 22px; }
            .site { margin: 0 0 24px; text-align: center; color: #526078; }
            .row { display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid #d6dbe4; padding: 10px 4px; }
            .row span { color: #526078; }
            strong { max-width: 60%; text-align: right; overflow-wrap: anywhere; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #68758a; }
          </style>
        </head>
        <body>
          <main>
            <h1>Dépotage fuel et gasoil</h1>
            <p class="site">${escapeHtml(entry.siteName || selectedSiteName)}</p>
            ${details}
            <p class="footer">Document généré depuis Securitec</p>
          </main>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Dépotage fuel et gasoil" subtitle="Enregistrement des réceptions de fuel et de gasoil" />
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <Panel title={editingId ? "Modifier un dépotage" : "Nouveau dépotage fuel / gasoil"}>
          <form className="w-full space-y-5 rounded-lg border bg-card p-4 shadow-sm" onSubmit={(event) => void submit(event)}>
            <SitePicker
              id="fuel-site"
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
                <Label htmlFor="fuel-date">Date</Label>
                <Input id="fuel-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-time">Heure de pointe</Label>
                <Input id="fuel-time" type="time" required value={heurePointe} onChange={(event) => setHeurePointe(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-titre">Titre</Label>
                <Input id="fuel-titre" required maxLength={160} value={titre} onChange={(event) => setTitre(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-plomb">Plomb</Label>
                <textarea
                  id="fuel-plomb"
                  required
                  rows={4}
                  maxLength={100}
                  placeholder="Saisissez une valeur par ligne"
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={plomb}
                  onChange={(event) => setPlomb(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-designation">Désignation</Label>
                <Input id="fuel-designation" required maxLength={160} value={designation} onChange={(event) => setDesignation(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-quantite">Quantité</Label>
                <Input id="fuel-quantite" type="number" min="0.01" step="0.01" required value={quantite} onChange={(event) => setQuantite(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-cree">Créé par</Label>
                <textarea
                  id="fuel-cree"
                  required
                  rows={4}
                  maxLength={160}
                  placeholder="Saisissez une valeur par ligne"
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={cree}
                  onChange={(event) => setCree(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-chauffeur">Chauffeur</Label>
                <Input id="fuel-chauffeur" required maxLength={160} value={chauffeur} onChange={(event) => setChauffeur(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel-magasinier">Magasinier</Label>
                <Input id="fuel-magasinier" required maxLength={160} value={magasinier} onChange={(event) => setMagasinier(event.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || !selectedSiteName.trim()}>
                {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer le dépotage"}
              </Button>
              {editingId && <Button type="button" variant="outline" disabled={saving} onClick={clearForm}>Annuler</Button>}
            </div>
          </form>
      </Panel>

      <Panel title="Registre des dépotages">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[260px] max-w-md flex-1 items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              aria-label="Rechercher dans le registre"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
              placeholder="Rechercher titre, plomb, désignation…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="fuel-search-date" className="whitespace-nowrap">Filtrer par date</Label>
            <Input
              id="fuel-search-date"
              type="date"
              aria-label="Filtrer le registre par date"
              className="w-auto"
              value={searchDate}
              onChange={(event) => setSearchDate(event.target.value)}
            />
          </div>
        </div>
        {entriesError ? (
          <p className="text-sm text-destructive">{entriesError}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[1200px] text-left text-sm">
              <thead className="bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Heure</th>
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Plomb</th>
                  <th className="px-4 py-3">Désignation</th>
                  <th className="px-4 py-3">Quantité</th>
                  <th className="px-4 py-3">Créé par</th>
                  <th className="px-4 py-3">Chauffeur</th>
                  <th className="px-4 py-3">Magasinier</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingEntries ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={10}>Chargement du registre…</td></tr>
                ) : filteredEntries.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={10}>
                    {entries.length === 0 ? "Aucun dépotage enregistré." : "Aucun résultat pour ces critères."}
                  </td></tr>
                ) : filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3">{entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                    <td className="px-4 py-3">{entry.heurePointe || "—"}</td>
                    <td className="px-4 py-3">{entry.titre || "—"}</td>
                    <td className="whitespace-pre-line px-4 py-3">{entry.plomb || "—"}</td>
                    <td className="px-4 py-3">{entry.designation || "—"}</td>
                    <td className="px-4 py-3">{entry.quantite ?? "—"}</td>
                    <td className="whitespace-pre-line px-4 py-3">{entry.cree || "—"}</td>
                    <td className="px-4 py-3">{entry.chauffeur || "—"}</td>
                    <td className="px-4 py-3">{entry.magasinier || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="ghost" size="icon" aria-label="Imprimer ce dépotage" title="Imprimer" onClick={() => printEntry(entry)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Modifier ce dépotage" title="Modifier" disabled={Boolean(deletingId)} onClick={() => startEditing(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Supprimer ce dépotage" title="Supprimer" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}>
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
