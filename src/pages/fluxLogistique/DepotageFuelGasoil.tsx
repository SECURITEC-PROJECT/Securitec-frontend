import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { printRecord } from "@/lib/printRecord";
import { Download, FileDown, FileUp, Pencil, Plus, Printer, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { readXlsxRows } from "@/lib/read-xlsx";
import { exportXlsx } from "@/lib/export-xlsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DepotageEntry {
  id: string;
  date: string;
  heurePointe?: string | null;
  immatriculationVehicule?: string | null;
  titre?: string | null;
  plomb?: string | null;
  designation?: string | null;
  quantite?: number | string | null;
  cree?: string | null;
  chauffeur?: string | null;
  magasinier?: string | null;
  siteName?: string | null;
  pendingSync?: boolean;
}
interface FuelDraft {
  key: string;
  id?: string;
  date: string;
  heurePointe: string;
  immatriculationVehicule: string;
  titre: string;
  plomb: string;
  designation: string;
  quantite: string;
  cree: string;
  chauffeur: string;
  magasinier: string;
}

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nowTime = () => new Date().toTimeString().slice(0, 5);
const fuelDesignations = ["Fuel oil", "Gasoil"];
const fuelHeaders = ["Date", "Heure de pointe", "Immatriculation camion", "Titre", "Plomb", "Designation", "Quantite", "Cree par", "Chauffeur", "Magasinier"];
const newFuelDraft = (): FuelDraft => ({ key: `${Date.now()}-${Math.random()}`, date: today(), heurePointe: nowTime(), immatriculationVehicule: "", titre: "", plomb: "", designation: "", quantite: "", cree: "", chauffeur: "", magasinier: "" });
const normalizeHeader = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/\s+/g, " ");
const excelDate = (raw: string) => {
  const value = raw.trim();
  if (/^\d+(\.\d+)?$/.test(value) && Number(value) > 20000) return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(value)) * 86400000).toISOString().slice(0, 10);
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const fr = value.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2,"0")}-${iso[3].padStart(2,"0")}`;
  if (fr) return `${fr[3]}-${fr[2].padStart(2,"0")}-${fr[1].padStart(2,"0")}`;
  return "";
};
const excelTime = (raw: string) => {
  const value = raw.trim();
  if (/^\d+(\.\d+)?$/.test(value) && Number(value) >= 0 && Number(value) < 1) {
    const minutes = Math.round(Number(value) * 1440) % 1440;
    return `${String(Math.floor(minutes / 60)).padStart(2,"0")}:${String(minutes % 60).padStart(2,"0")}`;
  }
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2,"0")}:${match[2]}` : value;
};

export default function DepotageFuelGasoil() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [drafts, setDrafts] = useState<FuelDraft[]>([newFuelDraft()]);
  const [savingKey, setSavingKey] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [registry, setRegistry] = useState<{
    siteId: string;
    entries: DepotageEntry[];
    error: string;
  }>({ siteId: "", entries: [], error: "" });
  const [search, setSearch] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [importing, setImporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const selectedSiteType = site?.type || siteType;
  const selectedSiteId = site?.id || "";

  useEffect(() => {
    let active = true;
    if (!selectedSiteId) return () => { active = false; };

    const refresh = () => {
      void serviceApi.listLogistics(selectedSiteId)
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
    };
    refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("securitec-offline-queue-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("online", refresh);
      window.removeEventListener("securitec-offline-queue-changed", refresh);
    };
  }, [selectedSiteId]);

  const entries = registry.siteId === selectedSiteId ? registry.entries : [];
  const entriesError = registry.siteId === selectedSiteId ? registry.error : "";
  const loadingEntries = Boolean(selectedSiteId) && registry.siteId !== selectedSiteId;
  const filteredEntries = entries.filter((entry) => {
    const matchesDate = !searchDate || entry.date?.slice(0, 10) === searchDate;
    const matchesText = [
      entry.date, entry.heurePointe, entry.immatriculationVehicule, entry.titre, entry.plomb, entry.designation, entry.cree,
      entry.chauffeur, entry.magasinier,
    ].some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    return matchesDate && matchesText;
  });

  const clearDraft = (key: string) => setDrafts((current) => {
    const remaining = current.filter((row) => row.key !== key);
    return remaining.length ? remaining : [newFuelDraft()];
  });
  const updateDraft = (key: string, field: keyof FuelDraft, value: string) => setDrafts((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));

  const startEditing = (entry: DepotageEntry) => {
    const draft: FuelDraft = {
      key: `edit-${entry.id}`, id: entry.id, date: entry.date.slice(0, 10), heurePointe: entry.heurePointe || "",
      immatriculationVehicule: entry.immatriculationVehicule || "", titre: entry.titre || "", plomb: entry.plomb || "",
      designation: entry.designation || "", quantite: entry.quantite == null ? "" : String(entry.quantite),
      cree: entry.cree || "", chauffeur: entry.chauffeur || "", magasinier: entry.magasinier || "",
    };
    setDrafts((current) => [draft, ...current.filter((row) => row.id !== entry.id)]);
    setFormOpen(true);
  };

  const saveDraft = async (row: FuelDraft) => {
    if (!selectedSiteId) { toast.error("Selectionnez un site de travail."); return; }
    const quantity = Number(row.quantite);
    if (!row.date || !row.heurePointe || !row.immatriculationVehicule.trim() || !row.titre.trim() || !row.plomb.trim() || !fuelDesignations.includes(row.designation) || !Number.isFinite(quantity) || quantity <= 0 || !row.cree.trim() || !row.chauffeur.trim() || !row.magasinier.trim()) {
      toast.error("Completez toutes les cellules obligatoires de cette ligne.");
      return;
    }
    setSavingKey(row.key);
    try {
      const payload = {
        type: "DEPOTAGE_FUEL", date: row.date, heurePointe: row.heurePointe,
        immatriculationVehicule: row.immatriculationVehicule.trim(), titre: row.titre.trim(), plomb: row.plomb.trim(),
        designation: row.designation, quantite: quantity, cree: row.cree.trim(), chauffeur: row.chauffeur.trim(),
        magasinier: row.magasinier.trim(), siteId: selectedSiteId, siteName: selectedSiteName, siteType: selectedSiteType,
      };
      if (row.id) {
        const { entry } = await serviceApi.updateDepotageFuelLogistics(row.id, payload);
        setRegistry((current) => ({ ...current, entries: current.entries.map((item) => item.id === row.id ? { ...item, ...entry } : item) }));
        toast[entry.pendingSync ? "info" : "success"](entry.pendingSync ? "Modification enregistree hors connexion." : "Depotage fuel/gasoil modifie.");
      } else {
        const result = await serviceApi.createLogistics(payload);
        if (!result.entry) throw new Error("La reponse du serveur ne contient pas l'enregistrement.");
        setRegistry((current) => current.siteId === selectedSiteId
          ? { ...current, entries: [result.entry, ...current.entries] }
          : { siteId: selectedSiteId, entries: [result.entry], error: "" });
        toast.success("Depotage fuel/gasoil enregistre.");
      }
      clearDraft(row.key);
      if (row.id || drafts.length === 1) setFormOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSavingKey("");
    }
  };

  const deleteEntry = async (entry: DepotageEntry) => {
    if (!selectedSiteId) return;
    if (!(await confirmDeletion(`Supprimer le dépotage « ${entry.titre || entry.id} » ? Cette action est définitive.`))) return;
    setDeletingId(entry.id);
    try {
      const result = await serviceApi.deleteDepotageFuelLogistics(entry.id, selectedSiteId);
      setRegistry((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }));
      setDrafts((current) => current.filter((row) => row.id !== entry.id));
      toast[result.pendingSync ? "info" : "success"](result.pendingSync
        ? "Suppression enregistrée hors connexion. Elle sera synchronisée au retour du réseau."
        : "Dépotage supprimé du registre.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const exportRegistry = () => {
    const rows = filteredEntries.map((entry) => [
      entry.date?.slice(0, 10) || "", entry.heurePointe || "", entry.immatriculationVehicule || "", entry.titre || "",
      entry.plomb || "", entry.designation || "", entry.quantite ?? "", entry.cree || "", entry.chauffeur || "", entry.magasinier || "",
    ]);
    const stamp = new Date().toISOString().slice(0, 10);
    exportXlsx(`registre-depotage-fuel-gasoil-${stamp}.xlsx`, "Registre dépotages", fuelHeaders, rows);
  };

  const importRegistry = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      if (!selectedSiteId) throw new Error("Sélectionnez le site de travail avant l’importation.");
      const data = await readXlsxRows(file);
      const headers = data[0]?.map(normalizeHeader) || [];
      const find = (...names: string[]) => headers.findIndex((header) => names.includes(header));
      const col = {
        date: find("date"), time: find("heure de pointe", "heure"), plate: find("immatriculation camion", "immatriculation", "plaque"),
        title: find("titre"), seal: find("plomb", "plombs"), designation: find("designation", "type de carburant", "carburant"),
        quantity: find("quantite", "volume", "litres"), createdBy: find("cree par", "cree"), driver: find("chauffeur", "conducteur"), storekeeper: find("magasinier"),
      };
      const required = [col.date, col.time, col.plate, col.title, col.seal, col.designation, col.quantity, col.createdBy, col.driver, col.storekeeper];
      if (required.some((index) => index < 0)) throw new Error("Colonnes requises manquantes. Utilisez le modèle Excel du module.");
      const get = (line: string[], index: number) => String(line[index] ?? "").trim();
      const imported = data.slice(1).filter((line) => line.some((value) => String(value ?? "").trim()));
      if (!imported.length) throw new Error("Le fichier ne contient aucune ligne à importer.");
      let saved = 0;
      const failures: string[] = [];
      for (const [index, line] of imported.entries()) {
        const entryDate = excelDate(get(line, col.date));
        const time = excelTime(get(line, col.time));
        const quantity = Number(get(line, col.quantity).replace(/\s/g, "").replace(",", "."));
        const itemDesignation = get(line, col.designation);
        if (!entryDate || !/^\d{2}:\d{2}$/.test(time) || !get(line, col.plate) || !get(line, col.title) || !get(line, col.seal) || !fuelDesignations.some((value) => normalizeHeader(value) === normalizeHeader(itemDesignation)) || !Number.isFinite(quantity) || quantity <= 0 || !get(line, col.createdBy) || !get(line, col.driver) || !get(line, col.storekeeper)) {
          failures.push(`Ligne ${index + 2} : données manquantes ou invalides.`);
          continue;
        }
        try {
          const result = await serviceApi.createLogistics({
            type: "DEPOTAGE_FUEL", date: entryDate, heurePointe: time, immatriculationVehicule: get(line, col.plate),
            titre: get(line, col.title), plomb: get(line, col.seal), designation: itemDesignation, quantite: quantity,
            cree: get(line, col.createdBy), chauffeur: get(line, col.driver), magasinier: get(line, col.storekeeper),
            siteId: selectedSiteId, siteName: selectedSiteName, siteType: selectedSiteType,
          });
          if (!result.entry) throw new Error("Enregistrement non confirmé par le serveur.");
          setRegistry((current) => current.siteId === selectedSiteId ? { ...current, entries: [result.entry, ...current.entries] } : current);
          saved += 1;
        } catch (error) {
          failures.push(`Ligne ${index + 2} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
        }
      }
      if (saved) toast.success(`${saved} dépotage(s) importé(s) dans le registre.`);
      if (failures.length) toast.error(failures.slice(0, 4).join(" "));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };

  const handlePrintRegistry = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre des dépotages fuel et gasoil";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (entry: DepotageEntry) => {
    const displayDate = entry.date?.slice(0, 10).split("-").reverse().join("/") || "—";
    printRecord("Dépotage fuel et gasoil", entry.siteName || selectedSiteName, [
      ["Date", displayDate],
      ["Heure de pointe", entry.heurePointe || "—"],
      ["Immatriculation du camion", entry.immatriculationVehicule || "—"],
      ["Titre", entry.titre || "—"],
      ["Plomb", entry.plomb || "—"],
      ["Désignation", entry.designation || "—"],
      ["Quantité", entry.quantite == null ? "—" : String(entry.quantite)],
      ["Créé par", entry.cree || "—"],
      ["Chauffeur", entry.chauffeur || "—"],
      ["Magasinier", entry.magasinier || "—"],
    ]);
  };

  return (
    <div className="fuel-module space-y-5">
      <PageHeader title="Dépotage fuel et gasoil" subtitle="Enregistrement des réceptions de fuel et de gasoil" />
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <div className="flex justify-end"><Button type="button" className="fuel-primary-action" onClick={() => { setDrafts([newFuelDraft()]); setFormOpen(true); }}><Plus className="mr-2 h-4 w-4" />Nouveau dépotage</Button></div>
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="fuel-entry-dialog w-[calc(100vw-1rem)] max-w-[1100px] max-h-[92vh] overflow-y-auto p-5 sm:p-7">
          <DialogHeader><DialogTitle>{drafts.some((row) => row.id) ? "Modifier un dépotage" : "Nouveau dépotage fuel / gasoil"}</DialogTitle><DialogDescription>Complétez les informations de la réception puis enregistrez.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <SitePicker
            id="fuel-site"
            value={selectedSiteName}
            type={selectedSiteType}
            sites={sites}
            canCreate={canCreateSite}
            onAdd={addSite}
            onChange={(name, type) => { setSiteName(name); setSiteType(type); }}
          />
          <p className="text-xs text-muted-foreground">Saisissez ou collez les informations directement dans les cellules, puis enregistrez chaque ligne.</p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="fuel-table fuel-entry-table w-full min-w-[1700px] text-left text-sm">
              <thead className="fuel-table-head bg-muted/60 text-xs uppercase text-muted-foreground"><tr>
                <th>#</th><th>Date *</th><th>Heure *</th><th>Immatriculation camion *</th><th>Titre *</th><th>Plomb *</th><th>Designation *</th><th>Quantite *</th><th>Cree par *</th><th>Chauffeur *</th><th>Magasinier *</th><th>Action</th>
              </tr></thead>
              <tbody>{drafts.map((row, index) => <tr key={row.key}>
                <td>{index + 1}</td>
                <td><Input aria-label="Date" type="date" value={row.date} onChange={(event) => updateDraft(row.key, "date", event.target.value)} /></td>
                <td><Input aria-label="Heure de pointe" type="time" value={row.heurePointe} onChange={(event) => updateDraft(row.key, "heurePointe", event.target.value)} /></td>
                <td><Input aria-label="Immatriculation camion" value={row.immatriculationVehicule} onChange={(event) => updateDraft(row.key, "immatriculationVehicule", event.target.value)} /></td>
                <td><Input aria-label="Titre" value={row.titre} onChange={(event) => updateDraft(row.key, "titre", event.target.value)} /></td>
                <td><Input aria-label="Plomb" value={row.plomb} onChange={(event) => updateDraft(row.key, "plomb", event.target.value)} /></td>
                <td><select aria-label="Designation" value={row.designation} onChange={(event) => updateDraft(row.key, "designation", event.target.value)} className="h-9 w-full min-w-28 rounded-md border bg-background px-2 text-sm"><option value="">Choisir...</option>{fuelDesignations.map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
                <td><Input aria-label="Quantite" type="number" min="0.01" step="any" value={row.quantite} onChange={(event) => updateDraft(row.key, "quantite", event.target.value)} /></td>
                <td><Input aria-label="Cree par" value={row.cree} onChange={(event) => updateDraft(row.key, "cree", event.target.value)} /></td>
                <td><Input aria-label="Chauffeur" value={row.chauffeur} onChange={(event) => updateDraft(row.key, "chauffeur", event.target.value)} /></td>
                <td><Input aria-label="Magasinier" value={row.magasinier} onChange={(event) => updateDraft(row.key, "magasinier", event.target.value)} /></td>
                <td><div className="flex items-center gap-1">
                  <Button type="button" size="sm" disabled={Boolean(savingKey)} onClick={() => void saveDraft(row)}><Save className="mr-1 h-4 w-4" />{savingKey === row.key ? "..." : row.id ? "Modifier" : "Enregistrer"}</Button>
                  <Button type="button" size="icon" variant="ghost" aria-label="Supprimer la ligne de saisie" disabled={drafts.length === 1 || Boolean(savingKey)} onClick={() => clearDraft(row.key)}><Trash2 className="h-4 w-4" /></Button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="flex justify-end"><Button type="button" variant="outline" onClick={() => setDrafts((current) => [...current, newFuelDraft()])}><Plus className="mr-2 h-4 w-4" />Nouvelle ligne</Button></div>
          {siteError && <p className="text-sm text-destructive">{siteError}</p>}
        </div>
          <div className="mt-4 flex justify-end"><Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Fermer</Button></div>
        </DialogContent>
      </Dialog>

      <section id="fuel-registry-print-area" className="fuel-registry">
      <Panel title="Registre des dépotages">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 fuel-registry-screen">
          <div className="flex min-w-[260px] max-w-md flex-1 items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              aria-label="Rechercher dans le registre"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
              placeholder="Rechercher immatriculation, titre, plomb…"
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
          <Button type="button" variant="outline" className="fuel-print-button print:hidden" disabled={!selectedSiteId || !entries.length} onClick={handlePrintRegistry}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
          </Button>
          <div className="flex flex-wrap gap-2 fuel-registry-screen">
            <label className={`inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted ${importing || !selectedSiteId ? "pointer-events-none opacity-50" : ""}`}>
              <FileUp className="mr-2 h-4 w-4" />{importing ? "Importation…" : "Importer Excel / CSV"}
              <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={importing || !selectedSiteId} onChange={(event) => { void importRegistry(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={exportRegistry}><FileDown className="mr-2 h-4 w-4" />Exporter Excel</Button>
            <Button type="button" variant="outline" onClick={() => exportXlsx("modele-depotage-fuel-gasoil.xlsx", "Modèle dépotage", fuelHeaders, [])}><Download className="mr-2 h-4 w-4" />Modèle Excel</Button>
          </div>
        </div>
        {entriesError ? (
          <p className="fuel-registry-screen text-sm text-destructive">{entriesError}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border fuel-registry-screen">
            <table className="fuel-table w-full min-w-[1200px] text-left text-sm">
              <thead className="fuel-table-head bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Heure</th>
                  <th className="px-4 py-3">Immatriculation camion</th>
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
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={11}>Chargement du registre…</td></tr>
                ) : filteredEntries.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={11}>
                    {entries.length === 0 ? "Aucun dépotage enregistré." : "Aucun résultat pour ces critères."}
                  </td></tr>
                ) : filteredEntries.map((entry) => (
                  <tr key={entry.id} className="fuel-table-row">
                    <td className="whitespace-nowrap px-4 py-3">{entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                    <td className="px-4 py-3">{entry.heurePointe || "—"}</td>
                    <td className="px-4 py-3">{entry.immatriculationVehicule || "—"}</td>
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
        {!loadingEntries && !entriesError && (
          <div className="fuel-registry-print hidden">
            <h1 className="mb-1 text-xl font-bold">Registre des dépotages fuel et gasoil</h1>
            <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
            <table>
              <thead>
                <tr>
                  {["Date", "Heure", "Immatriculation camion", "Titre", "Plomb", "Désignation", "Quantité", "Créé par", "Chauffeur", "Magasinier"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                    <td>{entry.heurePointe || "—"}</td>
                    <td>{entry.immatriculationVehicule || "—"}</td>
                    <td>{entry.titre || "—"}</td>
                    <td>{entry.plomb || "—"}</td>
                    <td>{entry.designation || "—"}</td>
                    <td>{entry.quantite ?? "—"}</td>
                    <td>{entry.cree || "—"}</td>
                    <td>{entry.chauffeur || "—"}</td>
                    <td>{entry.magasinier || "—"}</td>
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
          #fuel-registry-print-area, #fuel-registry-print-area * { visibility: visible !important; }
          #fuel-registry-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .fuel-registry-screen { display: none !important; }
          .fuel-registry-print { display: block !important; }
          .fuel-registry-print table { width: 100%; border-collapse: collapse; font-size: 9pt; }
          .fuel-registry-print th, .fuel-registry-print td { border: 1px solid #777; padding: 5px; text-align: left; vertical-align: top; }
          .fuel-registry-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
