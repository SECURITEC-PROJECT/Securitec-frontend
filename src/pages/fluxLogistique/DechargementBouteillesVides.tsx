import { PageHeader } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type EmptyBottleDelivery } from "@/lib/service-api";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

const DESIGNATIONS = ["65 Cl", "50 Cl", "33 Cl", "30 Cl", "1 L"] as const;
type Designation = typeof DESIGNATIONS[number];
type BottleLine = { designation: Designation | ""; quantite: string };
type DeliveryForm = {
  date: string;
  immatriculationVehicule: string;
  nomChauffeur: string;
  numeroTitre: string;
  provenance: string;
  poids: string;
  detailsBouteilles: BottleLine[];
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (): DeliveryForm => ({
  date: today(),
  immatriculationVehicule: "",
  nomChauffeur: "",
  numeroTitre: "",
  provenance: "",
  poids: "",
  detailsBouteilles: [{ designation: "", quantite: "" }],
});

const displayDate = (value: string) => {
  const part = value.slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(part) ? new Date(`${part}T00:00:00.000Z`) : null;
  return date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === part
    ? date.toLocaleDateString("fr-FR", { timeZone: "UTC" })
    : "—";
};

export default function DechargementBouteillesVides() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [entries, setEntries] = useState<EmptyBottleDelivery[]>([]);
  const [form, setForm] = useState<DeliveryForm>(emptyForm);
  const [editingEntry, setEditingEntry] = useState<EmptyBottleDelivery | null>(null);
  const [time, setTime] = useState(currentTime);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const siteProps = {
    id: "empty-bottles-site",
    value: selectedSiteName,
    type: site?.type || siteType,
    sites,
    canCreate: canCreateSite,
    onAdd: addSite,
    onChange: (name: string, type: "USINE" | "AGENCE") => {
      if (name !== siteName) resetForm();
      if (name !== selectedSiteName) setEntries([]);
      setSiteName(name);
      setSiteType(type);
    },
  };

  useEffect(() => {
    const timer = window.setInterval(() => setTime(currentTime()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    if (!site?.id) return;
    serviceApi.listLogistics(site.id)
      .then((flows) => {
        if (active) setEntries((flows as EmptyBottleDelivery[]).filter((entry) => entry.type === "BOUTEILLES_VIDES"));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement des réceptions impossible."));
    return () => { active = false; };
  }, [site?.id]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditingEntry(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: "BOUTEILLES_VIDES",
        date: form.date,
        heureArrivee: editingEntry?.heureArrivee || currentTime(),
        immatriculationVehicule: form.immatriculationVehicule.trim(),
        nomChauffeur: form.nomChauffeur.trim(),
        numeroTitre: form.numeroTitre.trim(),
        provenance: form.provenance.trim(),
        poids: Number(form.poids),
        detailsBouteilles: form.detailsBouteilles.map((line) => ({
          designation: line.designation,
          quantite: Number(line.quantite),
        })),
        siteId: site.id,
        siteName: selectedSiteName,
        siteType: site.type,
      };
      if (editingEntry) {
        const { entry } = await serviceApi.updateEmptyBottleDelivery(editingEntry.id, payload);
        setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, ...entry, siteName: selectedSiteName } : item));
        toast.success("Réception modifiée.");
      } else {
        const { entry } = await serviceApi.createEmptyBottleDelivery(payload);
        setEntries((current) => [entry, ...current]);
        toast.success("Réception de bouteilles enregistrée.");
      }
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editEntry = (entry: EmptyBottleDelivery) => {
    const details = Array.isArray(entry.detailsBouteilles) ? entry.detailsBouteilles : [];
    setEditingEntry(entry);
    setForm({
      date: String(entry.date).slice(0, 10),
      immatriculationVehicule: entry.immatriculationVehicule,
      nomChauffeur: entry.nomChauffeur || "",
      numeroTitre: entry.numeroTitre,
      provenance: String(entry.provenance),
      poids: String(entry.poids),
      detailsBouteilles: details.map((line) => ({
        designation: line.designation as Designation,
        quantite: String(line.quantite),
      })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = async (entry: EmptyBottleDelivery) => {
    if (!site?.id || !window.confirm(`Supprimer la réception du véhicule « ${entry.immatriculationVehicule} » ? Cette action est définitive.`)) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteEmptyBottleDelivery(entry.id, site.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      if (editingEntry?.id === entry.id) resetForm();
      toast.success("Réception supprimée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const updateLine = (index: number, patch: Partial<BottleLine>) => {
    setForm((current) => ({
      ...current,
      detailsBouteilles: current.detailsBouteilles.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Déchargement de bouteilles vides"
        subtitle="Enregistrement des réceptions de bouteilles vides, par véhicule, format et quantité."
      />
      <div className="max-w-xl"><SitePicker {...siteProps} /></div>
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}

      <form onSubmit={(event) => void submit(event)} className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="border-b bg-muted/30 px-5 py-4">
          <h2 className="font-semibold text-primary">{editingEntry ? "Modifier une réception" : "Enregistrer une réception"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Renseignez les informations du véhicule et les quantités reçues.</p>
        </div>
        <div className="space-y-6 p-5">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Informations du véhicule</h3>
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-date">Date</Label>
                <Input id="empty-bottles-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-arrival">Heure</Label>
                <Input id="empty-bottles-arrival" type="time" readOnly value={editingEntry?.heureArrivee || time} className="bg-muted/50 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-registration">Immatriculation du véhicule</Label>
                <Input id="empty-bottles-registration" required maxLength={100} value={form.immatriculationVehicule} onChange={(event) => setForm({ ...form, immatriculationVehicule: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-driver">Nom du chauffeur</Label>
                <Input id="empty-bottles-driver" required maxLength={255} value={form.nomChauffeur} onChange={(event) => setForm({ ...form, nomChauffeur: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-title">N° de titre</Label>
                <Input id="empty-bottles-title" required inputMode="numeric" pattern="[0-9]+" maxLength={100} value={form.numeroTitre} onChange={(event) => setForm({ ...form, numeroTitre: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-origin">Provenance (chiffre)</Label>
                <Input id="empty-bottles-origin" type="text" inputMode="numeric" pattern="[0-9]+" maxLength={100} required value={form.provenance} onChange={(event) => setForm({ ...form, provenance: event.target.value })} />
              </div>
              <div className="space-y-1.5 sm:max-w-[calc(50%-0.5rem)] lg:max-w-none">
                <Label htmlFor="empty-bottles-weight">Poids</Label>
                <Input id="empty-bottles-weight" type="number" min="0.01" max="9999999999.99" step="0.01" required value={form.poids} onChange={(event) => setForm({ ...form, poids: event.target.value })} />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Désignations et quantités</h3>
                <p className="mt-1 text-xs text-muted-foreground">Ajoutez les formats présents dans cette réception.</p>
              </div>
              <Button type="button" variant="outline" size="sm" disabled={form.detailsBouteilles.length >= DESIGNATIONS.length} onClick={() => setForm((current) => ({ ...current, detailsBouteilles: [...current.detailsBouteilles, { designation: "", quantite: "" }] }))}>
                <Plus /> Ajouter un format
              </Button>
            </div>
            <div className="space-y-2">
              {form.detailsBouteilles.map((line, index) => {
                const usedDesignations = new Set(form.detailsBouteilles.flatMap((item, itemIndex) =>
                  itemIndex !== index && item.designation ? [item.designation] : [],
                ));
                return (
                  <div key={index} className="grid grid-cols-1 items-end gap-3 rounded-lg border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,0.65fr)_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor={`empty-bottles-designation-${index}`}>Désignation</Label>
                      <select id={`empty-bottles-designation-${index}`} required value={line.designation} onChange={(event) => updateLine(index, { designation: event.target.value as Designation | "" })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="">Choisir un format</option>
                        {DESIGNATIONS.map((designation) => <option key={designation} value={designation} disabled={usedDesignations.has(designation)}>{designation}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`empty-bottles-quantity-${index}`}>Quantité</Label>
                      <Input id={`empty-bottles-quantity-${index}`} type="number" min="1" max="1000000" step="1" required value={line.quantite} onChange={(event) => updateLine(index, { quantite: event.target.value })} />
                    </div>
                    <Button type="button" size="icon" variant="outline" className="text-destructive hover:text-destructive" aria-label="Retirer ce format" title="Retirer ce format" disabled={form.detailsBouteilles.length === 1} onClick={() => setForm((current) => ({ ...current, detailsBouteilles: current.detailsBouteilles.filter((_, itemIndex) => itemIndex !== index) }))}>
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        {!site?.id && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer une réception.</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t bg-muted/20 px-5 py-4">
          {editingEntry && <Button type="button" variant="outline" onClick={resetForm}><X /> Annuler</Button>}
          <Button type="submit" disabled={saving || !site?.id}>
            <Save /> {saving ? "Enregistrement…" : editingEntry ? "Enregistrer les modifications" : "Enregistrer la réception"}
          </Button>
        </div>
      </form>

      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="font-semibold text-primary">Registre des réceptions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Historique des déchargements pour le site sélectionné.</p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{entries.length} réception{entries.length === 1 ? "" : "s"}</span>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {["Date", "Heure d’arrivée", "Immatriculation", "Nom du chauffeur", "N° titre", "Désignation · quantité", "Provenance", "Poids", "Actions"].map((heading) => (
                  <th key={heading} className="border-b px-3 py-2 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{displayDate(entry.date)}</td>
                  <td className="px-3 py-2">{entry.heureArrivee}</td>
                  <td className="px-3 py-2 font-medium">{entry.immatriculationVehicule}</td>
                  <td className="px-3 py-2">{entry.nomChauffeur || "—"}</td>
                  <td className="px-3 py-2">{entry.numeroTitre}</td>
                  <td className="px-3 py-2">
                    <div className="space-y-1">
                      {entry.detailsBouteilles.map((line) => (
                        <div key={line.designation}>{line.designation} : {line.quantite}</div>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">{entry.provenance}</td>
                  <td className="px-3 py-2">{entry.poids}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Modifier la réception" title="Modifier la réception" onClick={() => editEntry(entry)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Supprimer la réception" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {site?.id && !entries.length && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Aucune réception enregistrée pour ce site.</td></tr>
              )}
              {!site?.id && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Sélectionnez un site pour afficher les réceptions.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
