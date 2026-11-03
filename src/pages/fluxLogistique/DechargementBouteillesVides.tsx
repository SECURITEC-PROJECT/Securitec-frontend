import { PageHeader } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type EmptyBottleDelivery } from "@/lib/service-api";
import { Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRecord } from "@/lib/printRecord";
import { useLocation } from "react-router-dom";

const DESIGNATION_GROUPS = [
  { label: "Bouteilles vides", options: ["Bouteilles vides - 65 Cl", "Bouteilles vides - 50 Cl", "Bouteilles vides - 33 Cl"] },
  { label: "Fût", options: ["Fût - 30 L", "Fût - 20 L", "Fût - 20L export", "Fût - 30L export"] },
  { label: "Cageau jaune", options: ["Cageau jaune - C20", "Cageau jaune - C24"] },
  { label: "Bouteilles neuves", options: ["Bouteilles neuves - 65 Cl", "Bouteilles neuves - 50 Cl", "Bouteilles neuves - 33 Cl"] },
  { label: "Palettes", options: ["Palette neuve - 1310 x 1055", "Palette neuve - 1000 x 1200", "Palette neuve - 800 x 1200"] },
] as const;
const DESIGNATIONS = DESIGNATION_GROUPS.flatMap((group) => group.options);
type BottleLine = { designation: string; quantite: string };
type DeliveryForm = {
  date: string;
  heureFin: string;
  immatriculationVehicule: string;
  nomChauffeur: string;
  numeroTitre: string;
  plomb: string;
  provenance: string;
  poids: string;
  brut: string;
  tare: string;
  net: string;
  clientFournisseur: string;
  produit: string;
  remarque: string;
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
  heureFin: "",
  immatriculationVehicule: "",
  nomChauffeur: "",
  numeroTitre: "",
  plomb: "",
  provenance: "",
  poids: "",
  brut: "",
  tare: "",
  net: "",
  clientFournisseur: "",
  produit: "",
  remarque: "",
  detailsBouteilles: [{ designation: "", quantite: "" }],
});

const displayDate = (value: string) => {
  const part = value.slice(0, 10);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(part) ? new Date(`${part}T00:00:00.000Z`) : null;
  return date && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === part
    ? date.toLocaleDateString("fr-FR", { timeZone: "UTC" })
    : "—";
};

const normalizeSearch = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

export default function DechargementBouteillesVides() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const location = useLocation();
  const routeContext = location.state as { siteId?: string; posteId?: string; posteNom?: string } | null;
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [entries, setEntries] = useState<EmptyBottleDelivery[]>([]);
  const [form, setForm] = useState<DeliveryForm>(emptyForm);
  const [editingEntry, setEditingEntry] = useState<EmptyBottleDelivery | null>(null);
  const [time, setTime] = useState(currentTime);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pondBasculPost, setPondBasculPost] = useState(false);

  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  useEffect(() => {
    let active = true;
    const contextMatchesSite = routeContext?.siteId === site?.id;
    const postId = contextMatchesSite ? routeContext?.posteId : null;
    if (!site?.id || !postId) {
      setPondBasculPost(false);
      return () => { active = false; };
    }
    const contextPostName = contextMatchesSite && routeContext?.posteId === postId ? routeContext.posteNom : "";
    if (contextPostName) {
      setPondBasculPost(normalizeSearch(contextPostName).trim().startsWith("pond bascul"));
      return () => { active = false; };
    }
    serviceApi.listShiftPosts(site.id)
      .then((posts) => {
        if (active) setPondBasculPost(normalizeSearch(posts.find((post) => post.id === postId)?.nom || "").trim().startsWith("pond bascul"));
      })
      .catch(() => { if (active) setPondBasculPost(false); });
    return () => { active = false; };
  }, [routeContext?.posteId, routeContext?.posteNom, routeContext?.siteId, site?.id]);
  const normalizedSearch = normalizeSearch(search.trim());
  const showPondBrutFields = pondBasculPost || editingEntry?.brut != null;
  const filteredEntries = entries.filter((entry) =>
    normalizeSearch([
      entry.date,
      displayDate(entry.date),
      entry.heureArrivee,
      entry.heureFin ?? "",
      entry.immatriculationVehicule,
      entry.nomChauffeur ?? "",
      entry.numeroTitre,
      entry.plomb ?? "",
      entry.provenance,
      String(entry.poids),
      entry.clientFournisseur ?? "",
      entry.produit ?? "",
      entry.remarque ?? "",
      ...entry.detailsBouteilles.flatMap((line) => [line.designation, String(line.quantite)]),
    ].join(" ")).includes(normalizedSearch),
  );
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
    const brut = Number(form.brut);
    const tare = Number(form.tare);
    const net = Number(form.net);
    const usePondBrut = pondBasculPost || editingEntry?.brut != null;
    if (usePondBrut && (!form.brut || !form.tare || !form.net || !Number.isFinite(brut) || !Number.isFinite(tare) || !Number.isFinite(net) || brut <= 0 || tare <= 0 || net <= 0)) {
      toast.error("Saisissez un BRUT, une TARE et un NET positifs.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: "BOUTEILLES_VIDES",
        date: form.date,
        heureArrivee: editingEntry?.heureArrivee || currentTime(),
        heureFin: form.heureFin || null,
        immatriculationVehicule: form.immatriculationVehicule.trim(),
        nomChauffeur: form.nomChauffeur.trim(),
        numeroTitre: form.numeroTitre.trim(),
        plomb: form.plomb.trim(),
        provenance: form.provenance.trim(),
        poids: usePondBrut ? net : Number(form.poids),
        ...(usePondBrut ? {
          pondBrut: {
            brut,
            tare,
            net,
            clientFournisseur: form.clientFournisseur.trim(),
            produit: form.produit.trim(),
            remarque: form.remarque.trim(),
          },
        } : {}),
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
      heureFin: entry.heureFin || "",
      immatriculationVehicule: entry.immatriculationVehicule,
      nomChauffeur: entry.nomChauffeur || "",
      numeroTitre: entry.numeroTitre,
      plomb: entry.plomb || "",
      provenance: String(entry.provenance),
      poids: String(entry.poids),
      brut: entry.brut == null ? "" : String(entry.brut),
      tare: entry.tare == null ? "" : String(entry.tare),
      net: entry.net == null ? "" : String(entry.net),
      clientFournisseur: entry.clientFournisseur || "",
      produit: entry.produit || "",
      remarque: entry.remarque || entry.observation || "",
      detailsBouteilles: details.map((line) => ({
        designation: line.designation,
        quantite: String(line.quantite),
      })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = async (entry: EmptyBottleDelivery) => {
    if (!site?.id || !(await confirmDeletion(`Supprimer la réception du véhicule « ${entry.immatriculationVehicule} » ? Cette action est définitive.`))) return;
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

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = "Registre des réceptions de bouteilles vides";
    window.addEventListener("afterprint", () => {
      document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (entry: EmptyBottleDelivery) => {
    const weights: [string, string][] = entry.brut != null
      ? [["BRUT", `${entry.brut} kg`], ["TARE", `${entry.tare ?? "—"} kg`], ["NET", `${entry.net ?? entry.poids} kg`], ["Client / Fournisseur", entry.clientFournisseur || "—"], ["Produit", entry.produit || "—"], ["Remarque", entry.remarque || entry.observation || "—"]]
      : [["Poids", `${entry.poids} kg`]];
    printRecord("Réception de bouteilles vides", selectedSiteName, [
      ["Date", displayDate(entry.date)],
      ["Heure de début (HD)", entry.heureArrivee || "—"],
      ["Heure de fin (HF)", entry.heureFin || "—"],
      ["Immatriculation", entry.immatriculationVehicule],
      ["Nom du chauffeur", entry.nomChauffeur || "—"],
      ["N° titre", entry.numeroTitre],
      ["N° plomb", entry.plomb || "—"],
      ["Comptage", entry.detailsBouteilles.map((line) => `${line.designation} : ${line.quantite}`).join("\n")],
      ["Provenance", entry.provenance],
      ...weights,
    ]);
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
                <Label htmlFor="empty-bottles-arrival">Heure d'entréet (HE)</Label>
                <Input id="empty-bottles-arrival" type="time" readOnly value={editingEntry?.heureArrivee || time} className="bg-muted/50 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-end">Heure de Sortie (HS)</Label>
                <Input id="empty-bottles-end" type="time" value={form.heureFin} onChange={(event) => setForm({ ...form, heureFin: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-driver">Nom du chauffeur</Label>
                <Input
                  id="empty-bottles-driver"
                  required
                  maxLength={255}
                  autoComplete="name"
                  placeholder="Saisir le nom du chauffeur"
                  value={form.nomChauffeur}
                  onChange={(event) => setForm({ ...form, nomChauffeur: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-registration">Immatriculation du véhicule</Label>
                <Input
                  id="empty-bottles-registration"
                  required
                  maxLength={100}
                  autoComplete="off"
                  placeholder="Saisir l'immatriculation"
                  value={form.immatriculationVehicule}
                  onChange={(event) => setForm({ ...form, immatriculationVehicule: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-title">N° de titre</Label>
                <Input id="empty-bottles-title" required inputMode="numeric" pattern="[0-9]+" maxLength={100} value={form.numeroTitre} onChange={(event) => setForm({ ...form, numeroTitre: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-seal">N° de plomb</Label>
                <Input id="empty-bottles-seal" maxLength={100} value={form.plomb} onChange={(event) => setForm({ ...form, plomb: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="empty-bottles-origin">Provenance (chiffre)</Label>
                <Input id="empty-bottles-origin" type="text" inputMode="numeric" pattern="[0-9]+" maxLength={100} required value={form.provenance} onChange={(event) => setForm({ ...form, provenance: event.target.value })} />
              </div>
              {showPondBrutFields ? (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="empty-bottles-brut">BRUT (poids total du véhicule chargé)</Label>
                    <Input id="empty-bottles-brut" type="number" min="1" max="9999999999.99" step="1" required value={form.brut} onChange={(event) => setForm({ ...form, brut: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="empty-bottles-tare">TARE</Label>
                    <Input id="empty-bottles-tare" type="number" min="1" max="9999999999.99" step="1" required value={form.tare} onChange={(event) => setForm({ ...form, tare: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="empty-bottles-net">NET</Label>
                    <Input id="empty-bottles-net" type="number" min="1" max="9999999999.99" step="1" required value={form.net} onChange={(event) => setForm({ ...form, net: event.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label htmlFor="empty-bottles-client">Client / Fournisseur</Label>
                    <Input id="empty-bottles-client" maxLength={255} autoComplete="off" placeholder="Saisir le client ou fournisseur (facultatif)" value={form.clientFournisseur} onChange={(event) => setForm({ ...form, clientFournisseur: event.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label htmlFor="empty-bottles-product">Produit</Label>
                    <Input id="empty-bottles-product" maxLength={255} autoComplete="off" placeholder="Ex. bouteille vide (facultatif)" value={form.produit} onChange={(event) => setForm({ ...form, produit: event.target.value })} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label htmlFor="empty-bottles-remark">Remarque</Label>
                    <textarea id="empty-bottles-remark" rows={3} maxLength={2000} placeholder="Ajouter une remarque (facultatif)" value={form.remarque} onChange={(event) => setForm({ ...form, remarque: event.target.value })} className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5 sm:max-w-[calc(50%-0.5rem)] lg:max-w-none">
                  <Label htmlFor="empty-bottles-weight">Poids</Label>
                  <Input id="empty-bottles-weight" type="number" min="1" max="9999999999.99" step="1" required value={form.poids} onChange={(event) => setForm({ ...form, poids: event.target.value })} />
                </div>
              )}
            </div>
          </section>

          <section className="space-y-3 border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">Comptage des articles</h3>
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
                      <select id={`empty-bottles-designation-${index}`} required value={line.designation} onChange={(event) => updateLine(index, { designation: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                        <option value="">Choisir un format</option>
                        {DESIGNATION_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((designation) => (
                              <option key={designation} value={designation} disabled={usedDesignations.has(designation)}>
                                {designation.split(" - ").slice(1).join(" - ")}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                        {line.designation && !DESIGNATIONS.includes(line.designation as typeof DESIGNATIONS[number]) && (
                          <option value={line.designation}>{line.designation} (ancienne désignation)</option>
                        )}
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

      <section id="empty-bottles-print-area" className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-3">
          <div>
            <h2 className="font-semibold text-primary">Registre des réceptions</h2>
            <p className="mt-1 text-sm text-muted-foreground">Historique des déchargements pour le site sélectionné.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 empty-bottles-screen">
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">{filteredEntries.length} réception{filteredEntries.length === 1 ? "" : "s"}</span>
            <Button type="button" variant="outline" className="print:hidden" disabled={!site?.id || !entries.length} onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
            </Button>
          </div>
        </div>
        <div className="relative empty-bottles-screen">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Rechercher une réception de bouteilles vides"
            placeholder="Rechercher par date, véhicule, chauffeur, titre, plomb, provenance, format…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-11 pl-9"
          />
        </div>
        <div className="max-h-[520px] overflow-auto empty-bottles-screen">
          <table className="w-full min-w-[1400px] border-collapse text-left text-sm">
            <thead className="sticky top-0 bg-muted">
              <tr>
                {["Date", "HE", "HS", "Immatriculation", "Nom du chauffeur", "N° titre", "N° plomb", "Comptage", "Provenance", "Poids", "Actions"].map((heading) => (
                  <th key={heading} className="border-b px-3 py-2 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{displayDate(entry.date)}</td>
                  <td className="px-3 py-2">{entry.heureArrivee || "—"}</td>
                  <td className="px-3 py-2">{entry.heureFin || "—"}</td>
                  <td className="px-3 py-2 font-medium">{entry.immatriculationVehicule}</td>
                  <td className="px-3 py-2">{entry.nomChauffeur || "—"}</td>
                  <td className="px-3 py-2">{entry.numeroTitre}</td>
                  <td className="px-3 py-2">{entry.plomb || "—"}</td>
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
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer la réception" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}>
                        <Printer className="h-4 w-4" />
                      </Button>
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
              {site?.id && !filteredEntries.length && (
                <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">
                  {entries.length ? "Aucune réception ne correspond à votre recherche." : "Aucune réception enregistrée pour ce site."}
                </td></tr>
              )}
              {!site?.id && (
                <tr><td colSpan={11} className="px-3 py-6 text-center text-muted-foreground">Sélectionnez un site pour afficher les réceptions.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="empty-bottles-print hidden">
          <h1 className="mb-1 text-xl font-bold">Registre des réceptions de bouteilles vides</h1>
          <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
          <table>
            <thead>
              <tr>
                {["Date", "HD", "HF", "Immatriculation", "Nom du chauffeur", "N° titre", "N° plomb", "Comptage", "Provenance", "Poids"].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{displayDate(entry.date)}</td>
                  <td>{entry.heureArrivee || "—"}</td>
                  <td>{entry.heureFin || "—"}</td>
                  <td>{entry.immatriculationVehicule || "—"}</td>
                  <td>{entry.nomChauffeur || "—"}</td>
                  <td>{entry.numeroTitre || "—"}</td>
                  <td>{entry.plomb || "—"}</td>
                  <td>{entry.detailsBouteilles.map((line) => `${line.designation} : ${line.quantite}`).join(", ") || "—"}</td>
                  <td>{entry.provenance || "—"}</td>
                  <td>{entry.poids ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #empty-bottles-print-area, #empty-bottles-print-area * { visibility: visible !important; }
          #empty-bottles-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            border: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          .empty-bottles-screen { display: none !important; }
          .empty-bottles-print { display: block !important; }
          .empty-bottles-print table { width: 100%; border-collapse: collapse; font-size: 9pt; }
          .empty-bottles-print th, .empty-bottles-print td { border: 1px solid #777; padding: 5px; text-align: left; vertical-align: top; }
          .empty-bottles-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
