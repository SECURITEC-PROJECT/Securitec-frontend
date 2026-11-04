import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type StarParticulierLoading } from "@/lib/service-api";
import { Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRecord } from "@/lib/printRecord";

const designationGroups = [
  { label: "Palette", options: ["1055 x 1310", "1000 x 1200", "800 x 1200"] },
  { label: "THB", options: ["en fut 30CL", "en fut 20CL", "65CL Pils C-20", "50CL Pils canette PA-24"] },
  { label: "Queen's", options: ["65CL C20", "33CL C24"] },
  { label: "Beaufort", options: ["50CL canette PA-24", "33CL C-24"] },
  { label: "Gold Blanc", options: ["Fut 20L", "Fut 30L", "50CL C-20", "50CL canette PA-24", "33CL C-24"] },
  { label: "Gold 8", options: ["50CL C-20", "50CL canette PA-24"] },
  { label: "Gold", options: ["50CL C-20", "50CL canette PA-24"] },
] as const;
const designationValues = designationGroups.flatMap(({ label, options }) =>
  options.map((option) => `${label} : ${option}`),
);

type LoadingType = StarParticulierLoading["typeChargement"];
type LoadingForm = Omit<StarParticulierLoading, "id" | "type" | "siteName" | "siteId">;
const paletteDesignations = designationGroups
  .find(({ label }) => label === "Palette")?.options
  .map((option) => `Palette : ${option}`) ?? [];

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nowTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (): LoadingForm => ({
  date: today(),
  typeChargement: "STAR",
  heureDebut: nowTime(),
  heureSortie: nowTime(),
  camion: "",
  immatriculationVehicule: "",
  proprietaire: "",
  nomChauffeur: "",
  designation: "",
  quantiteTexte: "",
  poids: "",
  destinataire: "",
  provenance: "",
  lp: "",
  titre: "",
  plomb: "",
});

const numberField = (value: string, maxLength: number) => value === "" || new RegExp(`^\\d{1,${maxLength}}$`).test(value);
export default function ChargementsStarParticuliers() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [entries, setEntries] = useState<StarParticulierLoading[]>([]);
  const [entriesSiteId, setEntriesSiteId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<LoadingForm>(emptyForm);
  const [editing, setEditing] = useState<StarParticulierLoading | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const siteNameSelected = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === siteNameSelected), [sites, siteNameSelected]);
  const siteId = site?.id || "";
  const loading = Boolean(siteId) && entriesSiteId !== siteId;
  const isLegacyDesignation = form.designation && !designationValues.includes(form.designation);
  const visibleEntries = entriesSiteId === siteId
    ? entries.filter((entry) => entry.typeChargement === form.typeChargement)
    : [];
  const visibleDesignationGroups = designationGroups.filter(({ label }) =>
    form.typeChargement === "PALETTE" ? label === "Palette" : label !== "Palette",
  );
  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredEntries = visibleEntries.filter((entry) =>
    [
      entry.heureSortie,
      entry.heureDebut,
      entry.date,
      entry.camion,
      entry.immatriculationVehicule,
      entry.proprietaire,
      entry.nomChauffeur,
      entry.designation,
      entry.quantiteTexte,
      String(entry.poids),
      entry.destinataire,
      entry.provenance,
      entry.lp,
      entry.titre,
      entry.plomb,
      entry.typeChargement,
    ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().includes(normalizedSearch),
  );

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    const refresh = () => {
      void serviceApi.listStarParticulierLoadings(siteId)
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
            setLoadError(reason instanceof Error ? reason.message : "Chargement des chargements impossible.");
          }
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
    if (!numberField(form.lp, 6) || !numberField(form.titre, 8) || !numberField(form.plomb, 8)) {
      toast.error("LP doit contenir au maximum 6 chiffres ; le titre et le plomb, au maximum 8 chiffres.");
      return;
    }
    const poids = Number(form.poids);
    if (!Number.isFinite(poids) || poids < 0 || poids > 9999999999.99) {
      toast.error("Saisissez un poids valide.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        date: form.date,
        camion: form.camion.trim(),
        immatriculationVehicule: form.immatriculationVehicule.trim(),
        proprietaire: form.proprietaire.trim(),
        nomChauffeur: form.nomChauffeur.trim(),
        designation: form.designation.trim(),
        quantiteTexte: form.quantiteTexte.trim(),
        poids,
        destinataire: form.destinataire.trim(),
        provenance: form.provenance.trim(),
        lp: form.lp.trim(),
        titre: form.titre.trim(),
        plomb: form.plomb.trim(),
        siteId,
      };
      const entry = editing
        ? await serviceApi.updateStarParticulierLoading(editing.id, payload)
        : await serviceApi.createStarParticulierLoading(payload);
      setEntries((current) => editing
        ? current.map((row) => row.id === entry.id ? entry : row)
        : [entry, ...current]);
      setEntriesSiteId(siteId);
      resetForm();
      toast[entry.pendingSync ? "info" : "success"](entry.pendingSync
        ? `${editing ? "Modification" : "Saisie"} enregistrée hors connexion. Elle sera synchronisée au retour du réseau.`
        : editing ? "Chargement modifié." : "Chargement enregistré.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: StarParticulierLoading) => {
    setEditing(entry);
    setForm({
      date: entry.date?.slice(0, 10) || today(),
      typeChargement: entry.typeChargement,
      heureDebut: entry.heureDebut || "",
      heureSortie: entry.heureSortie,
      camion: entry.camion,
      immatriculationVehicule: entry.immatriculationVehicule || "",
      proprietaire: entry.proprietaire,
      nomChauffeur: entry.nomChauffeur,
      designation: entry.designation,
      quantiteTexte: entry.quantiteTexte,
      poids: String(entry.poids),
      destinataire: entry.destinataire,
      provenance: entry.provenance || "",
      lp: entry.lp,
      titre: entry.titre,
      plomb: entry.plomb,
    });
  };

  const deleteEntry = async (entry: StarParticulierLoading) => {
    if (!siteId) return;
    if (!(await confirmDeletion(`Supprimer le chargement ${entry.typeChargement} du véhicule « ${entry.camion} » ? Cette action est définitive.`))) return;
    setDeletingId(entry.id);
    try {
      const result = await serviceApi.deleteStarParticulierLoading(entry.id, siteId);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editing?.id === entry.id) resetForm();
      toast[result.pendingSync ? "info" : "success"](result.pendingSync
        ? "Suppression enregistrée hors connexion. Elle sera synchronisée au retour du réseau."
        : "Chargement supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = `Registre des chargements ${form.typeChargement === "STAR" ? "STAR" : form.typeChargement === "PALETTE" ? "Palette" : "particuliers"}`;
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (entry: StarParticulierLoading) => {
    const loadingLabel = entry.typeChargement === "STAR" ? "STAR" : entry.typeChargement === "PALETTE" ? "Palette" : "particulier";
    printRecord(`Chargement ${loadingLabel}`, siteNameSelected, [
      ["Date", entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"],
      ["Heure de début (HD)", entry.heureDebut || "—"],
      ["Heure de fin (HF)", entry.heureSortie || "—"],
      ["Véhicule", entry.camion],
      ["Immatriculation du camion", entry.immatriculationVehicule],
      ["Propriétaire", entry.proprietaire],
      ["Nom chauffeur", entry.nomChauffeur],
      ["Désignation", entry.designation],
      ["Quantité", entry.quantiteTexte],
      ["Poids", String(entry.poids)],
      ["Destination", entry.destinataire],
      ["Provenance", entry.provenance || "—"],
      ["LP", entry.lp],
      ["Titre", entry.titre],
      ["Plomb", entry.plomb],
      ["Chargement", loadingLabel],
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Chargements STAR, particuliers et palettes" subtitle="Enregistrement et suivi des chargements sortants." />
      <div className="max-w-xl">
        <SitePicker
          id="star-particulier-site"
          value={siteNameSelected}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => {
            setSiteName(name);
            setSiteType(type);
            resetForm();
          }}
        />
      </div>
      {(siteError || loadError) && (
        <Panel title="Erreur de chargement">
          <p className="text-sm text-destructive">{siteError || loadError}</p>
        </Panel>
      )}

      <Panel title={editing ? "Modifier un chargement" : "Enregistrer un chargement"}>
        <form className="space-y-5" onSubmit={(event) => void submit(event)}>
          <Tabs
            value={form.typeChargement}
            onValueChange={(value) => setForm((current) => ({
              ...current,
              typeChargement: value as LoadingType,
              designation: value === "PALETTE"
                ? (paletteDesignations.includes(current.designation) ? current.designation : "")
                : (paletteDesignations.includes(current.designation) ? "" : current.designation),
            }))}
          >
            <TabsList aria-label="Type de chargement">
              <TabsTrigger value="STAR">STAR</TabsTrigger>
              <TabsTrigger value="PARTICULIER">Particulier</TabsTrigger>
              <TabsTrigger value="PALETTE">Palette</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="loading-date">Date</Label>
              <Input id="loading-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-start-time">Heure d'entrée (HE)</Label>
              <Input id="loading-start-time" type="time" required value={form.heureDebut ?? ""} onChange={(event) => setForm({ ...form, heureDebut: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-exit-time">Heure de sortie (HS)</Label>
              <Input id="loading-exit-time" type="time" required value={form.heureSortie} onChange={(event) => setForm({ ...form, heureSortie: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-vehicle">Véhicule (matricule)</Label>
              <Input
                id="loading-vehicle"
                required
                maxLength={160}
                placeholder="Saisir le véhicule / matricule"
                value={form.camion}
                onChange={(event) => setForm({ ...form, camion: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-truck-registration">Immatriculation du camion</Label>
              <Input
                id="loading-truck-registration"
                required
                maxLength={100}
                placeholder="Saisir l’immatriculation"
                value={form.immatriculationVehicule}
                onChange={(event) => setForm({ ...form, immatriculationVehicule: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-owner">Propriétaire</Label>
              <Input id="loading-owner" required maxLength={255} value={form.proprietaire} onChange={(event) => setForm({ ...form, proprietaire: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-driver">Nom chauffeur</Label>
              <Input
                id="loading-driver"
                required
                maxLength={255}
                value={form.nomChauffeur}
                onChange={(event) => setForm({ ...form, nomChauffeur: event.target.value })}
                placeholder="Saisir le nom du chauffeur"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="loading-designation">Désignation</Label>
              <Select
                value={form.designation || undefined}
                onValueChange={(designation) => setForm({ ...form, designation })}
                required
              >
                <SelectTrigger id="loading-designation" className="h-10">
                  <SelectValue placeholder="Choisir une désignation" />
                </SelectTrigger>
                <SelectContent>
                  {visibleDesignationGroups.map(({ label, options }) => (
                    <SelectGroup key={label}>
                      <SelectLabel>{label}</SelectLabel>
                      {options.map((option) => {
                        const designation = `${label} : ${option}`;
                        return <SelectItem key={designation} value={designation}>{option}</SelectItem>;
                      })}
                    </SelectGroup>
                  ))}
                  {isLegacyDesignation && (
                    <SelectGroup>
                      <SelectLabel>Ancienne désignation</SelectLabel>
                      <SelectItem value={form.designation}>{form.designation}</SelectItem>
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-quantity">Quantité</Label>
              <Input id="loading-quantity" type="number" min="0" step="1" required value={form.quantiteTexte} onChange={(event) => setForm({ ...form, quantiteTexte: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-weight">Poids</Label>
              <Input id="loading-weight" type="number" min="0" max="9999999999.99" step="0.01" required value={form.poids} onChange={(event) => setForm({ ...form, poids: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-destination">Destination</Label>
              <Input id="loading-destination" required maxLength={255} value={form.destinataire} onChange={(event) => setForm({ ...form, destinataire: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-origin">Provenance</Label>
              <Input id="loading-origin" required maxLength={255} value={form.provenance} onChange={(event) => setForm({ ...form, provenance: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-lp">LP (6 chiffres max.)</Label>
              <Input id="loading-lp" required inputMode="numeric" maxLength={6} pattern="[0-9]{1,6}" value={form.lp} onChange={(event) => setForm({ ...form, lp: event.target.value.replace(/\D/g, "").slice(0, 6) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-title">Titre (8 chiffres max.)</Label>
              <Input id="loading-title" required inputMode="numeric" maxLength={8} pattern="[0-9]{1,8}" value={form.titre} onChange={(event) => setForm({ ...form, titre: event.target.value.replace(/\D/g, "").slice(0, 8) })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-seal">Plomb (8 chiffres max.)</Label>
              <Input id="loading-seal" required inputMode="numeric" maxLength={8} pattern="[0-9]{1,8}" value={form.plomb} onChange={(event) => setForm({ ...form, plomb: event.target.value.replace(/\D/g, "").slice(0, 8) })} />
            </div>
          </div>
          {!siteId && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un chargement.</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {editing && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X /> Annuler</Button>}
            <Button type="submit" disabled={saving || !siteId}>
              {editing ? <Save /> : <Plus />}
              {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Enregistrer le chargement"}
            </Button>
          </div>
        </form>
      </Panel>

      <section id="star-loading-print-area">
      <Panel title={`Registre des chargements ${form.typeChargement === "STAR" ? "STAR" : form.typeChargement === "PALETTE" ? "Palette" : "Particuliers"}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 star-loading-screen">
          <div className="relative min-w-[260px] flex-1">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher un chargement"
              placeholder="Rechercher véhicule, chauffeur, désignation, destination, provenance…"
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
          <div className="overflow-hidden rounded-lg border star-loading-screen">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[1500px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr>{["Date", "HE", "HS", "Véhicule", "Immatriculation camion", "Propriétaire", "Nom chauffeur", "Désignation", "Comptage", "Poids", "Destination", "Provenance", "LP", "Titre", "Plomb", "Chargement", "Actions"].map((heading) => <th key={heading} className="whitespace-nowrap border-b px-3 py-3 font-medium">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="align-top transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureDebut || "—"}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie || "—"}</td>
                      <td className="px-3 py-3 font-medium">{entry.camion}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.immatriculationVehicule || "—"}</td>
                      <td className="px-3 py-3">{entry.proprietaire}</td>
                      <td className="px-3 py-3">{entry.nomChauffeur}</td>
                      <td className="break-words px-3 py-3">{entry.designation}</td>
                      <td className="px-3 py-3">{entry.quantiteTexte}</td>
                      <td className="px-3 py-3">{entry.poids}</td>
                      <td className="px-3 py-3">{entry.destinataire}</td>
                      <td className="px-3 py-3">{entry.provenance || "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.lp}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.titre}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.plomb}</td>
                      <td className="px-3 py-3">{entry.typeChargement === "STAR" ? "STAR" : entry.typeChargement === "PALETTE" ? "Palette" : "Particulier"}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer le chargement" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}><Printer className="h-4 w-4" /></Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier le chargement" title="Modifier le chargement" onClick={() => editEntry(entry)}><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Supprimer le chargement" title="Supprimer le chargement" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <div className="star-loading-screen"><Empty text={loading ? "Chargement du registre…" : loadError ? "Le registre n’a pas pu être chargé." : visibleEntries.length ? "Aucun chargement ne correspond à votre recherche." : "Aucun chargement enregistré pour ce site."} /></div>}
        <div className="star-loading-print hidden">
          <h1 className="mb-1 text-xl font-bold">Registre des chargements {form.typeChargement === "STAR" ? "STAR" : form.typeChargement === "PALETTE" ? "Palette" : "particuliers"}</h1>
          <p className="mb-4 text-sm">Site : {siteNameSelected || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
          <table>
            <thead>
              <tr>{["Date", "HD", "HF", "Véhicule", "Immatriculation camion", "Propriétaire", "Nom chauffeur", "Désignation", "Comptage", "Poids", "Destination", "Provenance", "LP", "Titre", "Plomb", "Chargement"].map((heading) => <th key={heading}>{heading}</th>)}</tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                  <td>{entry.heureDebut || "—"}</td>
                  <td>{entry.heureSortie || "—"}</td>
                  <td>{entry.camion || "—"}</td>
                  <td>{entry.immatriculationVehicule || "—"}</td>
                  <td>{entry.proprietaire || "—"}</td>
                  <td>{entry.nomChauffeur || "—"}</td>
                  <td>{entry.designation || "—"}</td>
                  <td>{entry.quantiteTexte || "—"}</td>
                  <td>{entry.poids}</td>
                  <td>{entry.destinataire || "—"}</td>
                  <td>{entry.provenance || "—"}</td>
                  <td>{entry.lp || "—"}</td>
                  <td>{entry.titre || "—"}</td>
                  <td>{entry.plomb || "—"}</td>
                  <td>{entry.typeChargement === "STAR" ? "STAR" : entry.typeChargement === "PALETTE" ? "Palette" : "Particulier"}</td>
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
          #star-loading-print-area, #star-loading-print-area * { visibility: visible !important; }
          #star-loading-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .star-loading-screen { display: none !important; }
          .star-loading-print { display: block !important; }
          .star-loading-print table { width: 100%; border-collapse: collapse; font-size: 8pt; }
          .star-loading-print th, .star-loading-print td { border: 1px solid #777; padding: 4px; text-align: left; vertical-align: top; }
          .star-loading-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
