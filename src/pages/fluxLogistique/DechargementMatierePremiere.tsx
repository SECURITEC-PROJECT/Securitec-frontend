import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type ChauffeurRecord } from "@/lib/service-api";
import { printRecord } from "@/lib/printRecord";
import { Pencil, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";

const designationGroups = [
  {
    label: "Matières premières",
    options: [
      "Maîs Pilsen",
      "Maîs dégermée",
      "Granulé HDPE",
      "Suc Blanche",
      "Houblon Extrait",
      "Clarcel CBL",
      "Soude caustique",
      "Chlorure de calcium",
      "Arome",
      "Capsule Beaufort",
      "Capsule Gold",
      "Capsule Queen's",
      "Capsule THB",
      "Lubranol SM",
      "Caramel colorant",
      "Hurexol",
      "Hypochloryte de sodium",
      "Acide sulfuriques",
      "Azote liquide",
      "Argon",
      "Citrate de sodium",
      "Fuel oil",
      "Gasoil",
      "Couvertte canette",
    ],
  },
  {
    label: "Barquette",
    options: ["Canette GOLD blanche 50", "Canette GOLD 50CL", "Canette THB 50CL", "Canette Beaufort 50CL"],
  },
  {
    label: "Etiquette",
    options: ["THB 65CL", "Gold Blanche 50CL", "Beaufort 33CL", "Gold Blanche 33CL", "Queen's 65CL"],
  },
  {
    label: "Collerette",
    options: ["Gold Blanche 33CL", "Beaufort 33CL", "Gold Blanche 50CL", "THB 65CL", "Queen's 65CL"],
  },
] as const;
const designationOptions = designationGroups.flatMap(({ label, options }) =>
  label === "Matières premières" ? [...options] : options.map((option) => `${label} - ${option}`),
);

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
  const [searchDate, setSearchDate] = useState("");
  const [chauffeurRegistry, setChauffeurRegistry] = useState<{
    siteId: string;
    chauffeurs: ChauffeurRecord[];
    error: string;
  }>({ siteId: "", chauffeurs: [], error: "" });
  const [vehicleSuggestionsOpen, setVehicleSuggestionsOpen] = useState(false);
  const [activeVehicleSuggestion, setActiveVehicleSuggestion] = useState(0);

  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const selectedSiteType = site?.type || siteType;
  const selectedSiteId = site?.id || "";
  const isLegacyDesignation = designation && !designationOptions.includes(designation);
  const registeredChauffeurs = chauffeurRegistry.siteId === selectedSiteId
    ? chauffeurRegistry.chauffeurs
    : [];
  const availableVehicles = Array.from(
    new Map(
      registeredChauffeurs
        .filter((driver) => driver.vehicule?.trim())
        .map((driver) => [driver.vehicule!.trim(), driver]),
    ).values(),
  );
  const chauffeurVehiclesLoading = Boolean(selectedSiteId) && chauffeurRegistry.siteId !== selectedSiteId;
  const chauffeursError = chauffeurRegistry.siteId === selectedSiteId ? chauffeurRegistry.error : "";
  const selectedVehicleIsRegistered = availableVehicles.some(
    (driver) => driver.vehicule?.trim().toLocaleLowerCase("fr") === vehicule.trim().toLocaleLowerCase("fr"),
  );
  const normalizedVehicleSearch = vehicule.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const matchingVehicles = availableVehicles.filter((driver) =>
    !normalizedVehicleSearch ||
    `${driver.vehicule || ""} ${driver.matricule || ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr")
      .includes(normalizedVehicleSearch),
  ).slice(0, 8);

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

  useEffect(() => {
    let active = true;
    if (!selectedSiteId) return () => { active = false; };
    serviceApi.listChauffeurs(selectedSiteId)
      .then((chauffeurs) => {
        if (active) setChauffeurRegistry({ siteId: selectedSiteId, chauffeurs, error: "" });
      })
      .catch((error) => {
        if (active) setChauffeurRegistry({
          siteId: selectedSiteId,
          chauffeurs: [],
          error: error instanceof Error ? error.message : "Chargement des véhicules des chauffeurs impossible.",
        });
      });
    return () => { active = false; };
  }, [selectedSiteId]);

  const entries = registry.siteId === selectedSiteId ? registry.entries : [];
  const entriesError = registry.siteId === selectedSiteId ? registry.error : "";
  const loadingEntries = Boolean(selectedSiteId) && registry.siteId !== selectedSiteId;
  const filteredEntries = entries.filter((entry) => {
    const matchesDate = !searchDate || entry.date?.slice(0, 10) === searchDate;
    const matchesText = [entry.date, entry.heurePointe, entry.vehicule, entry.designation, entry.document, entry.provenance]
      .some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    return matchesDate && matchesText;
  });

  const clearForm = () => {
    setDate(today());
    setHeurePointe(nowTime());
    setVehicule("");
    setDesignation("");
    setQuantite("");
    setDocument("");
    setProvenance("");
    setVehicleSuggestionsOpen(false);
    setActiveVehicleSuggestion(0);
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
    if (chauffeurVehiclesLoading) {
      toast.error("Veuillez attendre le chargement des véhicules des chauffeurs.");
      return;
    }
    if (chauffeursError) {
      toast.error("Impossible de vérifier les véhicules enregistrés. Réessayez après le chargement du module Chauffeurs.");
      return;
    }
    if (!selectedVehicleIsRegistered) {
      toast.error("Ce véhicule n’est pas enregistré dans le module Chauffeurs pour ce site.");
      return;
    }
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
    if (!(await confirmDeletion(`Supprimer le déchargement « ${entry.designation || entry.id} » ? Cette action est définitive.`))) return;
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

  const handlePrintRegistry = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre des déchargements de matière première";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (entry: MatierePremiereEntry) => {
    const displayDate = entry.date?.slice(0, 10).split("-").reverse().join("/") || "—";
    printRecord("Déchargement matière première", selectedSiteName, [
      ["Date", displayDate],
      ["Heure de pointe", entry.heurePointe || "—"],
      ["Véhicule", entry.vehicule || "—"],
      ["Désignation", entry.designation || "—"],
      ["Quantité", entry.quantite == null ? "—" : String(entry.quantite)],
      ["Bon de livraison / facture", entry.document || "—"],
      ["Provenance", entry.provenance || "—"],
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Déchargement matière première"
        subtitle="Enregistrement des réceptions de matière première"
      />
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <Panel title={editingId ? "Modifier un déchargement" : "Réception de matière première"}>
          <form className="w-full space-y-5 rounded-lg border bg-card p-4 shadow-sm" onSubmit={(event) => void submit(event)}>
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
                setVehicule("");
                setVehicleSuggestionsOpen(false);
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
                <Popover open={vehicleSuggestionsOpen && matchingVehicles.length > 0} onOpenChange={setVehicleSuggestionsOpen}>
                  <PopoverAnchor asChild>
                    <Input
                      id="matiere-vehicule"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={vehicleSuggestionsOpen && matchingVehicles.length > 0}
                      aria-controls="matiere-vehicle-suggestions"
                      aria-activedescendant={matchingVehicles[activeVehicleSuggestion] ? `matiere-vehicle-option-${activeVehicleSuggestion}` : undefined}
                      required
                      maxLength={160}
                      autoComplete="off"
                      placeholder={chauffeurVehiclesLoading ? "Chargement des véhicules…" : "Rechercher un véhicule enregistré"}
                      value={vehicule}
                      onFocus={() => setVehicleSuggestionsOpen(true)}
                      onChange={(event) => {
                        setVehicule(event.target.value);
                        setActiveVehicleSuggestion(0);
                        setVehicleSuggestionsOpen(true);
                      }}
                      onKeyDown={(event) => {
                        if (!matchingVehicles.length) return;
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setActiveVehicleSuggestion((current) => (current + 1) % matchingVehicles.length);
                        } else if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setActiveVehicleSuggestion((current) => (current - 1 + matchingVehicles.length) % matchingVehicles.length);
                        } else if (event.key === "Enter" && vehicleSuggestionsOpen) {
                          event.preventDefault();
                          setVehicule(matchingVehicles[activeVehicleSuggestion]?.vehicule?.trim() || "");
                          setVehicleSuggestionsOpen(false);
                        } else if (event.key === "Escape") {
                          setVehicleSuggestionsOpen(false);
                        }
                      }}
                    />
                  </PopoverAnchor>
                  <PopoverContent
                    id="matiere-vehicle-suggestions"
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] p-1"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                  >
                    <ul role="listbox" aria-label="Véhicules enregistrés" className="max-h-52 overflow-y-auto">
                      {matchingVehicles.map((driver, index) => (
                        <li key={`${driver.id}-${driver.vehicule}`} role="presentation">
                          <button
                            id={`matiere-vehicle-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={index === activeVehicleSuggestion}
                            className={`w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent ${index === activeVehicleSuggestion ? "bg-accent" : ""}`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setVehicule(driver.vehicule?.trim() || "");
                              setVehicleSuggestionsOpen(false);
                            }}
                          >
                            {driver.vehicule?.trim()}
                            {driver.matricule && <span className="ml-2 text-muted-foreground">— {driver.matricule}</span>}
                            <span className="ml-2 text-muted-foreground">({driver.nomPrenom})</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
                {chauffeursError
                  ? <p role="alert" className="text-xs text-destructive">{chauffeursError}</p>
                  : !chauffeurVehiclesLoading && vehicule.trim() && !selectedVehicleIsRegistered
                    ? <p role="alert" className="text-xs text-destructive">Ce véhicule n’est pas enregistré dans le module Chauffeurs pour ce site.</p>
                    : !chauffeurVehiclesLoading && availableVehicles.length === 0
                      ? <p className="text-xs text-muted-foreground">Aucun véhicule n’est enregistré. Ajoutez d’abord un véhicule dans le module Chauffeurs.</p>
                      : <p className="text-xs text-muted-foreground">Sélectionnez un véhicule enregistré dans le module Chauffeurs.</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-designation">Désignation</Label>
                <Select value={designation || undefined} onValueChange={setDesignation} required>
                  <SelectTrigger id="matiere-designation">
                    <SelectValue placeholder="Choisir une désignation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designationGroups.map(({ label, options }) => (
                      <SelectGroup key={label}>
                        <SelectLabel>{label}</SelectLabel>
                        {options.map((option) => {
                          const value = label === "Matières premières" ? option : `${label} - ${option}`;
                          const display = label === "Matières premières" ? option : option;
                          return <SelectItem key={value} value={value}>{display}</SelectItem>;
                        })}
                      </SelectGroup>
                    ))}
                    {isLegacyDesignation && (
                      <SelectGroup>
                        <SelectLabel>Ancienne désignation</SelectLabel>
                        <SelectItem value={designation}>{designation}</SelectItem>
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
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
      <section id="raw-material-print-area">
      <Panel title="Registre des déchargements">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 raw-material-screen">
          <div className="flex min-w-[260px] max-w-md flex-1 items-center gap-2 rounded-md border bg-background px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              aria-label="Rechercher dans le registre"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
              placeholder="Rechercher véhicule, désignation, document…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="matiere-search-date" className="whitespace-nowrap">Filtrer par date</Label>
            <Input
              id="matiere-search-date"
              type="date"
              aria-label="Filtrer le registre par date"
              className="w-auto"
              value={searchDate}
              onChange={(event) => setSearchDate(event.target.value)}
            />
          </div>
          <Button type="button" variant="outline" className="print:hidden" disabled={!selectedSiteId || !entries.length} onClick={handlePrintRegistry}>
            <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
          </Button>
        </div>
        {entriesError ? (
          <p className="raw-material-screen text-sm text-destructive">{entriesError}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border raw-material-screen">
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
                    {entries.length === 0 ? "Aucun déchargement enregistré." : "Aucun résultat pour ces critères."}
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
                          aria-label="Imprimer ce déchargement"
                          title="Imprimer"
                          onClick={() => printEntry(entry)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
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
        {!loadingEntries && !entriesError && (
          <div className="raw-material-print hidden">
            <h1 className="mb-1 text-xl font-bold">Registre des déchargements de matière première</h1>
            <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
            <table>
              <thead>
                <tr>
                  {["Date", "Heure de pointe", "Véhicule", "Désignation", "Quantité", "Bon de livraison / facture", "Provenance"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                    <td>{entry.heurePointe || "—"}</td>
                    <td>{entry.vehicule || "—"}</td>
                    <td>{entry.designation || "—"}</td>
                    <td>{entry.quantite ?? "—"}</td>
                    <td>{entry.document || "—"}</td>
                    <td>{entry.provenance || "—"}</td>
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
          #raw-material-print-area, #raw-material-print-area * { visibility: visible !important; }
          #raw-material-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .raw-material-screen { display: none !important; }
          .raw-material-print { display: block !important; }
          .raw-material-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .raw-material-print th, .raw-material-print td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; }
          .raw-material-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
