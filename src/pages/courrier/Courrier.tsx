import { useEffect, useState, type FormEvent } from "react";
import { Empty, PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type CourrierMovement } from "@/lib/service-api";
import { LogOut, Pencil, Plus, Printer, Save, Search, Trash2, X } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { printRecord } from "@/lib/printRecord";

type MovementForm = {
  date: string;
  heureEntree: string;
  prenom: string;
  designation: string;
  nombre: string;
};

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

const emptyForm = (): MovementForm => ({
  date: today(),
  heureEntree: currentTime(),
  prenom: "",
  designation: "",
  nombre: "1",
});

const formatDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

export default function Courrier() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [registry, setRegistry] = useState<{ siteId: string; entries: CourrierMovement[]; error: string }>({
    siteId: "",
    entries: [],
    error: "",
  });
  const [form, setForm] = useState<MovementForm>(emptyForm);
  const [editing, setEditing] = useState<CourrierMovement | null>(null);
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
    [entry.date, formatDate(entry.date), entry.heureEntree, entry.prenom, entry.designation, String(entry.nombre), entry.heureSortie ?? ""]
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  );

  useEffect(() => {
    if (!site?.id) return;
    let active = true;
    serviceApi.listCourrierMovements(site.id)
      .then((rows) => {
        if (active) setRegistry({ siteId: site.id, entries: rows, error: "" });
      })
      .catch((reason) => {
        if (active) setRegistry({
          siteId: site.id,
          entries: [],
          error: reason instanceof Error ? reason.message : "Chargement du registre courrier impossible.",
        });
      });
    return () => { active = false; };
  }, [site?.id]);

  const resetForm = () => {
    setForm(emptyForm());
    setEditing(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    const nombre = Number(form.nombre);
    if (!Number.isSafeInteger(nombre) || nombre < 1 || nombre > 1000000) {
      toast.error("Le nombre doit être un entier entre 1 et 1 000 000.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        heureEntree: form.heureEntree,
        prenom: form.prenom.trim(),
        designation: form.designation.trim(),
        nombre,
        siteId: site.id,
      };
      const entry = editing
        ? await serviceApi.updateCourrierMovement(editing.id, payload)
        : await serviceApi.createCourrierMovement(payload);
      setRegistry((current) => ({
        siteId: site.id,
        entries: editing
          ? current.entries.map((row) => row.id === entry.id ? entry : row)
          : [entry, ...current.entries],
        error: "",
      }));
      resetForm();
      toast.success(editing ? "Mouvement courrier modifié." : "Entrée courrier enregistrée.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (entry: CourrierMovement) => {
    setEditing(entry);
    setForm({
      date: entry.date.slice(0, 10),
      heureEntree: entry.heureEntree,
      prenom: entry.prenom,
      designation: entry.designation,
      nombre: String(entry.nombre),
    });
  };

  const registerExit = async (entry: CourrierMovement) => {
    if (!site?.id) return;
    setExitingId(entry.id);
    try {
      const result = await serviceApi.exitCourrierMovement(entry.id, site.id);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.map((row) => row.id === entry.id ? { ...row, ...result } : row),
      }));
      toast.success(`Sortie enregistrée pour ${entry.prenom}.`);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Impossible d’enregistrer la sortie.");
    } finally {
      setExitingId(null);
    }
  };

  const deleteEntry = async (entry: CourrierMovement) => {
    if (!site?.id) return;
    if (!window.confirm(`Supprimer le mouvement de ${entry.prenom} ? Cette action est définitive.`)) return;
    setDeletingId(entry.id);
    try {
      await serviceApi.deleteCourrierMovement(entry.id, site.id);
      setRegistry((current) => ({
        ...current,
        entries: current.entries.filter((row) => row.id !== entry.id),
      }));
      if (editing?.id === entry.id) resetForm();
      toast.success("Mouvement courrier supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = "Registre du courrier";
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  const printEntry = (entry: CourrierMovement) => {
    printRecord("Mouvement courrier", selectedSiteName, [
      ["Date", formatDate(entry.date.slice(0, 10))],
      ["Heure d’entrée", entry.heureEntree],
      ["Prénom", entry.prenom],
      ["Désignation", entry.designation],
      ["Nombre", String(entry.nombre)],
      ["Heure de sortie", entry.heureSortie || "—"],
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Courrier" subtitle="Suivi des entrées et sorties de personnes et d’articles." />
      <div className="max-w-xl">
        <SitePicker
          id="courrier-site"
          value={selectedSiteName}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => { setSiteName(name); setSiteType(type); setEditing(null); }}
        />
      </div>
      {(error || siteError) && (
        <Panel title="Erreur de chargement">
          <p className="text-sm text-destructive">{error || siteError}</p>
        </Panel>
      )}
      {!loading && (
        <>
          <Panel title={editing ? "Modifier un mouvement" : "Enregistrer une entrée"}>
            <form className="space-y-5" onSubmit={(event) => void submit(event)}>
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="courrier-date">Date</Label>
                  <Input id="courrier-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="courrier-time-in">Heure d’entrée</Label>
                  <Input id="courrier-time-in" type="time" required value={form.heureEntree} onChange={(event) => setForm({ ...form, heureEntree: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="courrier-firstname">Prénom</Label>
                  <Input id="courrier-firstname" required maxLength={255} value={form.prenom} onChange={(event) => setForm({ ...form, prenom: event.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                  <Label htmlFor="courrier-designation">Désignation</Label>
                  <Input id="courrier-designation" required maxLength={20000} placeholder="Ex. sacs, carton" value={form.designation} onChange={(event) => setForm({ ...form, designation: event.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="courrier-count">Nombre</Label>
                  <Input id="courrier-count" type="number" min="1" max="1000000" step="1" required value={form.nombre} onChange={(event) => setForm({ ...form, nombre: event.target.value })} />
                </div>
              </div>
              {!site?.id && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un mouvement.</p>}
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                {editing && (
                  <Button type="button" variant="outline" disabled={saving} onClick={resetForm}>
                    <X /> Annuler
                  </Button>
                )}
                <Button type="submit" disabled={saving || !site?.id}>
                  {editing ? <Save /> : <Plus />}
                  {saving ? "Enregistrement…" : editing ? "Enregistrer les modifications" : "Enregistrer l’entrée"}
                </Button>
              </div>
            </form>
          </Panel>

          <section id="courrier-registry-print-area">
          <Panel title="Registre des entrées et sorties">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 courrier-registry-screen">
              <div className="relative min-w-[260px] flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher un mouvement courrier"
                  placeholder="Rechercher par date, prénom, désignation ou heure…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="min-h-11 pl-9"
                />
              </div>
              <Button type="button" variant="outline" className="print:hidden" disabled={!entries.length} onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimer le registre
              </Button>
            </div>
            {entries.length ? (
              <>
              <div className="overflow-hidden rounded-lg border courrier-registry-screen">
                <div className="max-h-[560px] overflow-auto">
                  <table className="w-full table-fixed text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                      <tr>
                        <th className="w-[11%] whitespace-nowrap border-b px-3 py-3 font-medium">Date</th>
                        <th className="w-[13%] whitespace-nowrap border-b px-3 py-3 font-medium">Heure d’entrée</th>
                        <th className="w-[13%] whitespace-nowrap border-b px-3 py-3 font-medium">Prénom</th>
                        <th className="w-[25%] border-b px-3 py-3 font-medium">Désignation</th>
                        <th className="w-[9%] whitespace-nowrap border-b px-3 py-3 font-medium">Nombre</th>
                        <th className="w-[15%] whitespace-nowrap border-b px-3 py-3 font-medium">Heure de sortie</th>
                        <th className="w-[14%] whitespace-nowrap border-b px-3 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="align-top transition-colors hover:bg-muted/30">
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{formatDate(entry.date.slice(0, 10))}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureEntree}</td>
                          <td className="px-3 py-3 font-medium">{entry.prenom}</td>
                          <td className="break-words whitespace-pre-wrap px-3 py-3">{entry.designation}</td>
                          <td className="px-3 py-3 text-center">{entry.nombre}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie || "—"}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer le mouvement" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}>
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier le mouvement" title="Modifier le mouvement" onClick={() => beginEdit(entry)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Supprimer le mouvement" title="Supprimer le mouvement" disabled={deletingId === entry.id} onClick={() => void deleteEntry(entry)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                              {!entry.heureSortie && (
                                <Button type="button" size="sm" variant="outline" disabled={exitingId === entry.id} onClick={() => void registerExit(entry)}>
                                  <LogOut className="h-4 w-4" />
                                  {exitingId === entry.id ? "Sortie…" : "Sortie"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {!filteredEntries.length && (
                <p className="courrier-registry-screen py-6 text-center text-sm text-muted-foreground">Aucun mouvement ne correspond à votre recherche.</p>
              )}
              </>
            ) : <div className="courrier-registry-screen"><Empty text={loading ? "Chargement du registre…" : "Aucun mouvement courrier enregistré sur ce site."} /></div>}
            <div className="courrier-registry-print hidden">
              <h1 className="mb-1 text-xl font-bold">Registre des entrées et sorties de courrier</h1>
              <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
              <table>
                <thead>
                  <tr>
                    {["Date", "Heure d’entrée", "Prénom", "Désignation", "Nombre", "Heure de sortie"].map((heading) => (
                      <th key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.date.slice(0, 10))}</td>
                      <td>{entry.heureEntree}</td>
                      <td>{entry.prenom}</td>
                      <td>{entry.designation}</td>
                      <td>{entry.nombre}</td>
                      <td>{entry.heureSortie || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
          </section>
        </>
      )}
      {loading && (
        <Panel title="Chargement du registre">
          <p className="text-sm text-muted-foreground">Chargement des mouvements courrier…</p>
        </Panel>
      )}
      <style>{`
        @media print {
          @page { size: landscape; margin: 12mm; }
          body * { visibility: hidden !important; }
          #courrier-registry-print-area, #courrier-registry-print-area * { visibility: visible !important; }
          #courrier-registry-print-area {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
          }
          .courrier-registry-screen { display: none !important; }
          .courrier-registry-print { display: block !important; }
          .courrier-registry-print table { width: 100%; border-collapse: collapse; font-size: 10pt; }
          .courrier-registry-print th, .courrier-registry-print td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; }
          .courrier-registry-print th { background: #eee !important; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
