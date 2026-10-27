import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type StarParticulierLoading } from "@/lib/service-api";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

type LoadingType = StarParticulierLoading["typeChargement"];
type LoadingForm = Omit<StarParticulierLoading, "id" | "type" | "date" | "siteName" | "siteId">;

const nowTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (): LoadingForm => ({
  typeChargement: "STAR",
  heureSortie: nowTime(),
  camion: "",
  proprietaire: "",
  nomChauffeur: "",
  designation: "",
  quantiteTexte: "",
  poids: "",
  destinataire: "",
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
  const siteNameSelected = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === siteNameSelected), [sites, siteNameSelected]);
  const siteId = site?.id || "";
  const loading = Boolean(siteId) && entriesSiteId !== siteId;
  const visibleEntries = entriesSiteId === siteId
    ? entries.filter((entry) => entry.typeChargement === form.typeChargement)
    : [];

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    serviceApi.listStarParticulierLoadings(siteId)
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
    return () => { active = false; };
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
        camion: form.camion.trim(),
        proprietaire: form.proprietaire.trim(),
        nomChauffeur: form.nomChauffeur.trim(),
        designation: form.designation.trim(),
        quantiteTexte: form.quantiteTexte.trim(),
        poids,
        destinataire: form.destinataire.trim(),
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
      toast.success(editing ? "Chargement modifié." : "Chargement enregistré.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: StarParticulierLoading) => {
    setEditing(entry);
    setForm({
      typeChargement: entry.typeChargement,
      heureSortie: entry.heureSortie,
      camion: entry.camion,
      proprietaire: entry.proprietaire,
      nomChauffeur: entry.nomChauffeur,
      designation: entry.designation,
      quantiteTexte: entry.quantiteTexte,
      poids: String(entry.poids),
      destinataire: entry.destinataire,
      lp: entry.lp,
      titre: entry.titre,
      plomb: entry.plomb,
    });
  };

  const deleteEntry = async (entry: StarParticulierLoading) => {
    if (!siteId) return;
    if (!window.confirm(`Supprimer le chargement ${entry.typeChargement} du véhicule « ${entry.camion} » ? Cette action est définitive.`)) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteStarParticulierLoading(entry.id, siteId);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editing?.id === entry.id) resetForm();
      toast.success("Chargement supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Chargements Star et particuliers" subtitle="Enregistrement et suivi des chargements sortants." />
      <div className="max-w-xl">
        <SitePicker
          id="star-particulier-site"
          value={siteNameSelected}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => { setSiteName(name); setSiteType(type); resetForm(); }}
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
            onValueChange={(value) => setForm((current) => ({ ...current, typeChargement: value as LoadingType }))}
          >
            <TabsList aria-label="Type de chargement">
              <TabsTrigger value="STAR">STAR</TabsTrigger>
              <TabsTrigger value="PARTICULIER">Particulier</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="loading-exit-time">Heure de sortie</Label>
              <Input id="loading-exit-time" type="time" required value={form.heureSortie} onChange={(event) => setForm({ ...form, heureSortie: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-vehicle">Véhicule (matricule)</Label>
              <Input id="loading-vehicle" required maxLength={160} value={form.camion} onChange={(event) => setForm({ ...form, camion: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-owner">Propriétaire</Label>
              <Input id="loading-owner" required maxLength={255} value={form.proprietaire} onChange={(event) => setForm({ ...form, proprietaire: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-driver">Nom chauffeur</Label>
              <Input id="loading-driver" required maxLength={255} value={form.nomChauffeur} onChange={(event) => setForm({ ...form, nomChauffeur: event.target.value })} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="loading-designation">Désignation</Label>
              <Input id="loading-designation" required maxLength={20000} value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loading-quantity">Quantité (texte)</Label>
              <Input id="loading-quantity" required maxLength={5000} value={form.quantiteTexte} onChange={(event) => setForm({ ...form, quantiteTexte: event.target.value })} />
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

      <Panel title={`Registre des chargements ${form.typeChargement === "STAR" ? "STAR" : "Particuliers"}`}>
        {visibleEntries.length ? (
          <div className="overflow-hidden rounded-lg border">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[1450px] text-left text-sm">
                <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr>{["Heure de sortie", "Véhicule", "Propriétaire", "Nom chauffeur", "Désignation", "Quantité", "Poids", "Destination", "LP", "Titre", "Plomb", "Chargement", "Actions"].map((heading) => <th key={heading} className="whitespace-nowrap border-b px-3 py-3 font-medium">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {visibleEntries.map((entry) => (
                    <tr key={entry.id} className="align-top transition-colors hover:bg-muted/30">
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie}</td>
                      <td className="px-3 py-3 font-medium">{entry.camion}</td>
                      <td className="px-3 py-3">{entry.proprietaire}</td>
                      <td className="px-3 py-3">{entry.nomChauffeur}</td>
                      <td className="break-words px-3 py-3">{entry.designation}</td>
                      <td className="px-3 py-3">{entry.quantiteTexte}</td>
                      <td className="px-3 py-3">{entry.poids}</td>
                      <td className="px-3 py-3">{entry.destinataire}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.lp}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.titre}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.plomb}</td>
                      <td className="px-3 py-3">{entry.typeChargement === "STAR" ? "STAR" : "Particulier"}</td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <div className="flex items-center gap-1">
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
        ) : <Empty text={loading ? "Chargement du registre…" : loadError ? "Le registre n’a pas pu être chargé." : "Aucun chargement enregistré pour ce site."} />}
      </Panel>
    </div>
  );
}
