import { useEffect, useMemo, useState, type FormEvent } from "react";
import { LogOut, Package, Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type Provider, type StarMaterialEntry, type StarMaterialItem } from "@/lib/service-api";
import { printRecord } from "@/lib/printRecord";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";

type MaterialForm = {
  date: string;
  heureEntree: string;
  prenom: string;
  matricule: string;
  prestataireId: string;
  items: Array<{ designation: string; nombre: string }>;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (): MaterialForm => ({
  date: today(),
  heureEntree: currentTime(),
  prenom: "",
  matricule: "",
  prestataireId: "",
  items: [{ designation: "", nombre: "1" }],
});

const displayDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value?.slice(0, 10) || "")) return "—";
  const [year, month, day] = value.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const formatItems = (items: StarMaterialItem[]) =>
  items.map((item) => `${item.designation} × ${item.nombre}`).join(", ");

export default function MaterielsStar() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [registry, setRegistry] = useState<{ siteId: string; entries: StarMaterialEntry[]; error: string }>({
    siteId: "",
    entries: [],
    error: "",
  });
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState<MaterialForm>(emptyForm);
  const [editing, setEditing] = useState<StarMaterialEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const entries = registry.siteId === site?.id ? registry.entries : [];
  const error = registry.siteId === site?.id ? registry.error : "";
  const loading = Boolean(site?.id) && registry.siteId !== site?.id;
  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredEntries = entries.filter((entry) =>
    [
      entry.date,
      displayDate(entry.date),
      entry.heureEntree,
      entry.prenom,
      entry.matricule,
      entry.provider,
      formatItems(entry.items),
      entry.heureSortie ?? "",
    ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().includes(normalizedSearch),
  );

  useEffect(() => {
    serviceApi.listProviders()
      .then(setProviders)
      .catch((reason) => toast.error(reason instanceof Error ? reason.message : "Chargement des prestataires impossible."));
  }, []);

  useEffect(() => {
    if (!site?.id) return;
    let active = true;
    serviceApi.listStarMaterials(site.id)
      .then((rows) => {
        if (active) setRegistry({ siteId: site.id, entries: rows, error: "" });
      })
      .catch((reason) => {
        if (active) setRegistry({
          siteId: site.id,
          entries: [],
          error: reason instanceof Error ? reason.message : "Chargement du registre impossible.",
        });
      });
    return () => { active = false; };
  }, [site?.id]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
  };

  const updateItem = (index: number, field: "designation" | "nombre", value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    const items = form.items.map((item) => ({ designation: item.designation.trim(), nombre: Number(item.nombre) }));
    if (items.length < 1 || items.length > 100 || items.some((item) =>
      !item.designation || !Number.isSafeInteger(item.nombre) || item.nombre < 1 || item.nombre > 1000000,
    )) {
      toast.error("Renseignez chaque matériel et un nombre entier positif (maximum 1 000 000).");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        heureEntree: form.heureEntree,
        prenom: form.prenom.trim(),
        matricule: form.matricule.trim(),
        prestataireId: form.prestataireId,
        items,
        siteId: site.id,
      };
      const entry = editing
        ? await serviceApi.updateStarMaterial(editing.id, payload)
        : await serviceApi.createStarMaterial(payload);
      setRegistry((current) => ({
        siteId: site.id,
        entries: editing
          ? current.entries.map((row) => row.id === entry.id ? entry : row)
          : [entry, ...current.entries],
        error: "",
      }));
      resetForm();
      toast.success(editing ? "Mouvement modifié." : "Entrée de matériel enregistrée.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (entry: StarMaterialEntry) => {
    setEditing(entry);
    setForm({
      date: entry.date.slice(0, 10),
      heureEntree: entry.heureEntree,
      prenom: entry.prenom,
      matricule: entry.matricule,
      prestataireId: entry.providerId,
      items: entry.items.map((item) => ({ designation: item.designation, nombre: String(item.nombre) })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const registerExit = async (entry: StarMaterialEntry) => {
    if (!site?.id) return;
    setExitingId(entry.id);
    try {
      const result = await serviceApi.exitStarMaterial(entry.id, site.id);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.map((row) => row.id === entry.id ? { ...row, ...result } : row),
      }));
      toast.success(`Heure de sortie enregistrée pour ${entry.prenom}.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Impossible d’enregistrer la sortie.");
    } finally {
      setExitingId(null);
    }
  };

  const deleteEntry = async (entry: StarMaterialEntry) => {
    if (!site?.id || !entry.heureSortie) return;
    if (!(await confirmDeletion(`Supprimer le mouvement de ${entry.prenom} (${entry.matricule}) ? Cette action est définitive.`))) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteStarMaterial(entry.id, site.id);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.filter((row) => row.id !== entry.id),
      }));
      if (editing?.id === entry.id) resetForm();
      toast.success("Mouvement supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const printEntry = (entry: StarMaterialEntry) => {
    printRecord("Mouvement matériel Star", selectedSiteName, [
      ["Date", displayDate(entry.date)],
      ["Heure d’entrée", entry.heureEntree],
      ["Prénom", entry.prenom],
      ["Matricule", entry.matricule],
      ["Prestataire", entry.provider],
      ["Matériels", formatItems(entry.items)],
      ["Heure de sortie", entry.heureSortie || "—"],
    ]);
  };

  const printRegistry = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre des matériels Star";
    window.addEventListener("afterprint", () => { window.document.title = originalTitle; }, { once: true });
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Matériels Star" subtitle="Suivi des entrées et sorties de matériels Star." />
      <div className="max-w-xl">
        <SitePicker
          id="materiels-star-site"
          value={selectedSiteName}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => { setSiteName(name); setSiteType(type); resetForm(); }}
        />
      </div>
      {(error || siteError) && (
        <Panel title="Erreur de chargement">
          <p className="text-sm text-destructive">{error || siteError}</p>
        </Panel>
      )}
      {!loading && (
        <>
          <Panel title={editing ? "Modifier un mouvement" : "Enregistrer une entrée de matériel"}>
            <form className="space-y-5" onSubmit={(event) => void submit(event)}>
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-date">Date</Label>
                  <Input id="star-material-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-time-in">Heure d’entrée</Label>
                  <Input id="star-material-time-in" type="time" required value={form.heureEntree} onChange={(event) => setForm({ ...form, heureEntree: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-firstname">Prénom</Label>
                  <Input id="star-material-firstname" required maxLength={255} value={form.prenom} onChange={(event) => setForm({ ...form, prenom: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-id">Matricule</Label>
                  <Input id="star-material-id" required maxLength={100} value={form.matricule} onChange={(event) => setForm({ ...form, matricule: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="star-material-provider">Prestataire</Label>
                  <select id="star-material-provider" required value={form.prestataireId} onChange={(event) => setForm({ ...form, prestataireId: event.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Sélectionner un prestataire</option>
                    {providers.filter((provider) => provider.active || provider.id === form.prestataireId).map((provider) => <option key={provider.id} value={provider.id}>{provider.name}{provider.active ? "" : " (inactif)"}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <Label>Matériels et nombres</Label>
                  <Button type="button" variant="outline" size="sm" disabled={form.items.length >= 100} onClick={() => setForm((current) => ({ ...current, items: [...current.items, { designation: "", nombre: "1" }] }))}>
                    <Plus className="mr-2 size-4" /> Ajouter un matériel
                  </Button>
                </div>
                {form.items.map((item, index) => (
                  <div key={index} className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                    <div className="space-y-1.5">
                      <Label htmlFor={`star-material-name-${index}`}>Matériel {index + 1}</Label>
                      <Input id={`star-material-name-${index}`} required maxLength={255} placeholder="Désignation du matériel" value={item.designation} onChange={(event) => updateItem(index, "designation", event.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`star-material-count-${index}`}>Nombre</Label>
                      <Input id={`star-material-count-${index}`} type="number" min="1" max="1000000" step="1" required value={item.nombre} onChange={(event) => updateItem(index, "nombre", event.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <Button type="button" variant="ghost" size="icon" aria-label={`Retirer le matériel ${index + 1}`} disabled={form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((_, itemIndex) => itemIndex !== index) }))}>
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {!site?.id && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un mouvement.</p>}
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {editing && <Button type="button" variant="outline" disabled={saving} onClick={resetForm}><X className="mr-2 size-4" /> Annuler</Button>}
                <Button type="submit" disabled={saving || !site?.id || !providers.some((provider) => provider.active || provider.id === form.prestataireId)}>
                  {editing ? <Save className="mr-2 size-4" /> : <Plus className="mr-2 size-4" />}
                  {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Enregistrer l’entrée"}
                </Button>
              </div>
            </form>
          </Panel>

          <section id="star-materials-print-area">
            <Panel title="Registre des matériels Star">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 star-materials-screen">
                <div className="relative min-w-[260px] flex-1">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input aria-label="Rechercher un mouvement de matériel Star" placeholder="Rechercher date, prénom, matricule, matériel ou heure…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-11 pl-9" />
                </div>
                <Button type="button" variant="outline" className="print:hidden" disabled={!entries.length} onClick={printRegistry}>
                  <Printer className="mr-2 size-4" /> Imprimer le registre
                </Button>
              </div>
              {loading ? <div className="star-materials-screen"><Empty text="Chargement du registre…" /></div> : entries.length ? (
                <>
                  <div className="overflow-x-auto rounded-lg border star-materials-screen">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                      <thead className="bg-muted/70 text-xs uppercase text-muted-foreground">
                          <tr>{["Date", "Heure d’entrée", "Prénom", "Matricule", "Prestataire", "Matériels / nombre", "Heure de sortie", "Actions"].map((heading) => <th key={heading} className="border-b px-3 py-3">{heading}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-border/70">
                        {filteredEntries.map((entry) => (
                          <tr key={entry.id} className="align-top transition-colors hover:bg-muted/30">
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{displayDate(entry.date)}</td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureEntree}</td>
                            <td className="px-3 py-3 font-medium">{entry.prenom}</td>
                            <td className="px-3 py-3 font-mono text-xs">{entry.matricule}</td>
                            <td className="px-3 py-3">{entry.provider}</td>
                            <td className="whitespace-pre-wrap px-3 py-3">{entry.items.map((item) => `${item.designation} — ${item.nombre}`).join("\n")}</td>
                            <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie || "—"}</td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <div className="flex items-center gap-1">
                                <Button type="button" variant="ghost" size="icon" aria-label="Imprimer ce mouvement" title="Imprimer" onClick={() => printEntry(entry)}><Printer className="size-4" /></Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Modifier le mouvement" title="Modifier" onClick={() => beginEdit(entry)}><Pencil className="size-4" /></Button>
                                <Button type="button" variant="ghost" size="icon" aria-label="Supprimer le mouvement" title={entry.heureSortie ? "Supprimer" : "Enregistrez d’abord la sortie pour supprimer"} className="text-destructive hover:text-destructive" disabled={!entry.heureSortie || deletingId === entry.id} onClick={() => void deleteEntry(entry)}><Trash2 className="size-4" /></Button>
                                {!entry.heureSortie && <Button type="button" variant="outline" size="sm" disabled={exitingId === entry.id} onClick={() => void registerExit(entry)}><LogOut className="mr-2 size-4" />{exitingId === entry.id ? "Sortie…" : "Sortie"}</Button>}
                                {entry.heureSortie && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Package className="size-3" />Sorti</span>}
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!filteredEntries.length && <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun mouvement ne correspond à votre recherche.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <div className="star-materials-screen"><Empty text="Aucun matériel Star enregistré sur ce site." /></div>}
              {!loading && (
                <div className="star-materials-print hidden">
                  <h1 className="mb-1 text-xl font-bold">Registre des matériels Star</h1>
                  <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
                  <table>
                    <thead><tr>{["Date", "Heure d’entrée", "Prénom", "Matricule", "Prestataire", "Matériels / nombre", "Heure de sortie"].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead>
                    <tbody>{entries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{displayDate(entry.date)}</td><td>{entry.heureEntree}</td><td>{entry.prenom}</td><td>{entry.matricule}</td><td>{entry.provider}</td>
                        <td>{entry.items.map((item) => `${item.designation} — ${item.nombre}`).join("\n")}</td><td>{entry.heureSortie || "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Panel>
          </section>
        </>
      )}
      {loading && <Panel title="Chargement du registre"><p className="text-sm text-muted-foreground">Chargement des mouvements…</p></Panel>}
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #star-materials-print-area, #star-materials-print-area * { visibility: visible !important; }
          #star-materials-print-area { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; }
          .star-materials-screen { display: none !important; }
          .star-materials-print { display: block !important; }
          .star-materials-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .star-materials-print th, .star-materials-print td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; white-space: pre-wrap; }
          .star-materials-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
