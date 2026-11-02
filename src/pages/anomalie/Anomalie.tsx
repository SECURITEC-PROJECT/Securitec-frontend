import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { AlertTriangle, ClipboardList, Pencil, Plus, Printer, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";

type AnomalieForm = {
  date: string;
  heure: string;
  personne: string;
  camion: string;
  transporteur: string;
  titre: string;
  casse: string;
  manquant: string;
  vides: string;
  phn: string;
  description: string;
  mesures: string;
  posteIds: string[];
};

type AnomalieEntry = {
  id: string;
  date: string;
  time: string;
  camion: string | null;
  transporteur: string | null;
  document: string | null;
  broken: string | null;
  missing: string | null;
  empty: string | null;
  phn: string | null;
  facts: string | null;
  measures: string | null;
  person?: string | null;
  typeEntree?: string;
  siteName?: string;
};

type AnomalieType = "ANOMALIE" | "DIVERS" | "VIOLATION_PROCEDURE";

const today = () => new Date().toLocaleDateString("en-CA");
const currentTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const blankForm = (): AnomalieForm => ({
  date: today(),
  heure: currentTime(),
  personne: "",
  camion: "",
  transporteur: "",
  titre: "",
  casse: "",
  manquant: "",
  vides: "",
  phn: "",
  description: "",
  mesures: "",
  posteIds: [],
});

export default function Anomalie({ initialType = "ANOMALIE" }: { initialType?: AnomalieType }) {
  const { sites, siteError } = useSites();
  const [siteId, setSiteId] = useState("");
  const [activeType, setActiveType] = useState<AnomalieType>(initialType);
  const [form, setForm] = useState<AnomalieForm>(blankForm);
  const [entries, setEntries] = useState<AnomalieEntry[]>([]);
  const [entriesContext, setEntriesContext] = useState<{ siteId: string; type: AnomalieType } | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<{ id: string; nom: string }[]>([]);
  const sectionName = activeType === "ANOMALIE" ? "Anomalie" : activeType === "DIVERS" ? "Divers" : "Violation de procédure";
  const visibleEntries = entriesContext?.siteId === siteId && entriesContext.type === activeType ? entries : [];

  const normalizedSearch = search.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
  const filteredEntries = visibleEntries.filter((entry) =>
    [entry.date, entry.time, entry.person, entry.camion, entry.transporteur, entry.document, entry.broken, entry.missing, entry.empty, entry.phn, entry.facts, entry.measures]
      .filter(Boolean)
      .join(" ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .includes(normalizedSearch),
  );

  useEffect(() => {
    setActiveType(initialType);
  }, [initialType]);

  useEffect(() => {
    if (!siteId && sites.length) setSiteId(sites[0].id);
  }, [siteId, sites]);

  useEffect(() => {
    if (!siteId) return;
    let active = true;
    setLoading(true);
    const loadEntries = activeType === "VIOLATION_PROCEDURE"
      ? serviceApi.listMainCourante(siteId).then((rows) => rows
        .filter((row) => row.typeEntree === "VIOLATION" || Boolean(row.natureViolation))
        .map((row) => ({
          id: row.id,
          date: row.createdAt ? String(row.createdAt).slice(0, 10) : today(),
          time: row.heure || "",
          camion: null,
          transporteur: null,
          document: null,
          broken: null,
          missing: null,
          empty: null,
          phn: null,
          facts: [row.natureViolation, row.description].filter(Boolean).join(" — "),
          measures: row.mesuresPrises || "",
          person: row.people || "",
          typeEntree: row.typeEntree,
        } satisfies AnomalieEntry)))
      : serviceApi.listLogisticsEvents(siteId, activeType);
    loadEntries
      .then((rows) => {
        if (active) {
          setEntries(rows as AnomalieEntry[]);
          setEntriesContext({ siteId, type: activeType });
        }
      })
      .catch((error) => { if (active) toast.error(error instanceof Error ? error.message : `Chargement ${sectionName.toLocaleLowerCase("fr")} impossible.`); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [siteId, activeType, reloadKey, sectionName]);

  useEffect(() => {
    let active = true;
    if (!siteId) { setPosts([]); return () => { active = false; }; }
    serviceApi.listShiftPosts(siteId)
      .then((rows) => { if (active) setPosts(rows); })
      .catch(() => { if (active) setPosts([]); });
    return () => { active = false; };
  }, [siteId]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) { toast.error("Selectionnez un site."); return; }
    setSaving(true);
    try {
      const payload = {
        type: activeType,
        date: form.date,
        time: form.heure,
        camion: form.camion,
        transporteur: form.transporteur,
        document: form.titre,
        broken: form.casse,
        missing: form.manquant,
        empty: form.vides,
        phn: form.phn,
        facts: form.description,
        measures: form.mesures,
        siteId,
        posteIds: form.posteIds,
      };
      if (activeType === "VIOLATION_PROCEDURE") {
        const response = await serviceApi.createMainCourante({
          typeEntree: "VIOLATION",
          siteId,
          category: "Violation de procédure",
          severity: "grave",
          people: form.personne,
          statutAuteur: "Non précisé",
          natureViolation: "Violation de procédure",
          description: form.description,
          mesuresPrises: form.mesures,
          heure: form.heure,
        });
        const row = response.entry;
        const entry: AnomalieEntry = {
          id: row.id,
          date: row.createdAt ? String(row.createdAt).slice(0, 10) : form.date,
          time: row.heure || form.heure,
          camion: null,
          transporteur: null,
          document: null,
          broken: null,
          missing: null,
          empty: null,
          phn: null,
          facts: row.description || form.description,
          measures: row.mesuresPrises || form.mesures,
          person: row.people || form.personne,
          typeEntree: row.typeEntree,
        };
        setEntries((current) => [entry, ...current]);
        toast.success("Violation de procédure enregistrée dans le rapport journalier.");
      } else if (editingId) {
        const entry = await serviceApi.updateLogisticsIncident(editingId, siteId, payload);
        setEntries((current) => current.map((row) => row.id === editingId ? { ...row, ...entry } : row));
        setEditingId(null);
        toast.success(`${sectionName} modifié${activeType === "ANOMALIE" ? "e" : ""}.`);
      } else {
        const entry = await serviceApi.createLogisticsEvent(payload);
        setEntries((current) => [entry as AnomalieEntry, ...current]);
        toast.success(`${sectionName} enregistré${activeType === "ANOMALIE" ? "e" : ""}.`);
      }
      setForm(blankForm());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement de l'anomalie impossible.");
    } finally { setSaving(false); }
  };

  const editEntry = (entry: AnomalieEntry) => {
    setEditingId(entry.id);
    setForm({
      date: String(entry.date).slice(0, 10),
      heure: entry.time || "",
      personne: entry.person || "",
      camion: entry.camion || "",
      transporteur: entry.transporteur || "",
      titre: entry.document || "",
      casse: entry.broken || "",
      manquant: entry.missing || "",
      vides: entry.empty || "",
      phn: entry.phn || "",
      description: entry.facts || "",
      mesures: entry.measures || "",
      posteIds: [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(blankForm());
  };

  const deleteEntry = async (entry: AnomalieEntry) => {
    if (!siteId || !(await confirmDeletion(`Supprimer ce signalement ${sectionName.toLocaleLowerCase("fr")} ? Cette action est définitive.`))) return;
    try {
      await serviceApi.deleteLogisticsIncident(entry.id, siteId);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      if (editingId === entry.id) cancelEdit();
      toast.success("Anomalie supprimée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression de l'anomalie impossible.");
    }
  };

  const handlePrint = () => {
    const originalTitle = window.document.title;
    window.document.title = `Registre ${sectionName.toLocaleLowerCase("fr")}`;
    window.addEventListener("afterprint", () => {
      window.document.title = originalTitle;
    }, { once: true });
    window.print();
  };

  return <div className="space-y-6">
    <PageHeader
      title={activeType === "VIOLATION_PROCEDURE" ? "Violation de procédure" : "Anomalie et Divers"}
      subtitle="Saisir et consulter les signalements du site."
    />
    <div className="max-w-sm space-y-1.5">
      <label htmlFor="anomalie-site" className="text-sm font-medium">Site</label>
      <select id="anomalie-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        {!sites.length && <option value="">Aucun site disponible</option>}
        {sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
      </select>
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
    </div>

    <Tabs
      value={activeType}
      onValueChange={(value) => {
        if (value !== "ANOMALIE" && value !== "DIVERS" && value !== "VIOLATION_PROCEDURE") return;
        if (value !== activeType) {
          setEditingId(null);
          setForm(blankForm());
        }
        setActiveType(value);
      }}
      className="space-y-4"
    >
      <TabsList aria-label="Type de signalement">
        <TabsTrigger value="ANOMALIE">Anomalie</TabsTrigger>
        <TabsTrigger value="DIVERS">Divers</TabsTrigger>
        <TabsTrigger value="VIOLATION_PROCEDURE">Violation de procédure</TabsTrigger>
      </TabsList>
    </Tabs>

    <section className="w-full overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b bg-muted/30 px-5 py-4">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><ClipboardList className="size-5" /></span>
        <div><h2 className="font-semibold">{editingId ? `Modifier ${sectionName.toLocaleLowerCase("fr")}` : `Nouveau signalement : ${sectionName.toLocaleLowerCase("fr")}`}</h2><p className="text-sm text-muted-foreground">Renseignez les informations du signalement.</p></div>
      </div>
      <form onSubmit={(event) => void submit(event)} className="space-y-4 p-4 sm:p-6">
        <div className={`grid gap-4 ${activeType === "VIOLATION_PROCEDURE" ? "" : "sm:grid-cols-2"}`}>
          {activeType !== "VIOLATION_PROCEDURE" && <div className="space-y-1.5"><label htmlFor="anomalie-date" className="text-sm font-medium">Date</label><input id="anomalie-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>}
          <div className="space-y-1.5"><label htmlFor="anomalie-heure" className="text-sm font-medium">Heure</label><input id="anomalie-heure" type="time" required value={form.heure} onChange={(event) => setForm({ ...form, heure: event.target.value })} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
        </div>
        {activeType === "ANOMALIE" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><label htmlFor="anomalie-camion" className="text-sm font-medium">N° CAMION</label><Input id="anomalie-camion" maxLength={160} value={form.camion} onChange={(event) => setForm({ ...form, camion: event.target.value })} placeholder="Immatriculation du camion" className="h-11" /></div>
              <div className="space-y-1.5"><label htmlFor="anomalie-transporteur" className="text-sm font-medium">TRANSPORTEUR</label><Input id="anomalie-transporteur" maxLength={255} value={form.transporteur} onChange={(event) => setForm({ ...form, transporteur: event.target.value })} placeholder="Nom du transporteur" className="h-11" /></div>
              <div className="space-y-1.5"><label htmlFor="anomalie-titre" className="text-sm font-medium">TITRE</label><Input id="anomalie-titre" maxLength={160} value={form.titre} onChange={(event) => setForm({ ...form, titre: event.target.value })} placeholder="N° titre / document" className="h-11" /></div>
              <div className="space-y-1.5"><label htmlFor="anomalie-casse" className="text-sm font-medium">CASSE</label><Input id="anomalie-casse" maxLength={2000} value={form.casse} onChange={(event) => setForm({ ...form, casse: event.target.value })} placeholder="Produit et quantité" className="h-11" /></div>
              <div className="space-y-1.5"><label htmlFor="anomalie-manquant" className="text-sm font-medium">MANQUANT</label><Input id="anomalie-manquant" maxLength={2000} value={form.manquant} onChange={(event) => setForm({ ...form, manquant: event.target.value })} placeholder="Produit et quantité manquante" className="h-11" /></div>
              <div className="space-y-1.5"><label htmlFor="anomalie-vides" className="text-sm font-medium">VIDES</label><Input id="anomalie-vides" maxLength={2000} value={form.vides} onChange={(event) => setForm({ ...form, vides: event.target.value })} placeholder="Type et quantité de vides" className="h-11" /></div>
              <div className="space-y-1.5 sm:col-span-2"><label htmlFor="anomalie-phn" className="text-sm font-medium">PHN</label><Input id="anomalie-phn" maxLength={2000} value={form.phn} onChange={(event) => setForm({ ...form, phn: event.target.value })} placeholder="Produit hors normes et quantité" className="h-11" /></div>
            </div>
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Diffuser la consigne générée aux postes</p>
              <p className="text-xs text-muted-foreground">Sans sélection, elle sera visible à tous les postes du site.</p>
              {posts.length ? <div className="grid gap-2 sm:grid-cols-2">{posts.map((post) => <label key={post.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.posteIds.includes(post.id)} onChange={(event) => setForm((current) => ({ ...current, posteIds: event.target.checked ? [...current.posteIds, post.id] : current.posteIds.filter((id) => id !== post.id) }))} />{post.nom}</label>)}</div> : <p className="text-xs text-muted-foreground">Aucun poste configuré; la diffusion se fera à l’échelle du site.</p>}
            </div>
            <div className="col-span-2 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground lg:col-span-4"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p>À l’enregistrement, les responsables du site recevront une notification dans l’application et une consigne active sera créée automatiquement.</p></div>
            <div className="space-y-1.5"><label htmlFor="anomalie-faits" className="text-sm font-medium">DESCRIPTION DES FAITS</label><textarea id="anomalie-faits" required maxLength={20000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Décrire les faits constatés" className="min-h-[120px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
          </>
        ) : activeType === "DIVERS" ? (
          <>
            <div className="space-y-1.5"><label htmlFor="divers-faits" className="text-sm font-medium">FAITS</label><textarea id="divers-faits" required maxLength={20000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Décrire les faits" className="min-h-[120px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
            <div className="space-y-1.5"><label htmlFor="divers-mesures" className="text-sm font-medium">MESURES PRISES</label><textarea id="divers-mesures" maxLength={20000} rows={3} value={form.mesures} onChange={(event) => setForm({ ...form, mesures: event.target.value })} placeholder="Mesures prises" className="min-h-[96px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
          </>
        ) : (
          <>
            <div className="space-y-1.5"><label htmlFor="violation-nom" className="text-sm font-medium">NOM &amp; PRÉNOM</label><Input id="violation-nom" required maxLength={255} value={form.personne} onChange={(event) => setForm({ ...form, personne: event.target.value })} placeholder="Nom et prénom de la personne concernée" className="h-11" /></div>
            <div className="space-y-1.5"><label htmlFor="violation-observations" className="text-sm font-medium">OBSERVATIONS</label><textarea id="violation-observations" required maxLength={20000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Décrire la violation de procédure constatée" className="min-h-[120px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
            <div className="space-y-1.5"><label htmlFor="violation-mesures" className="text-sm font-medium">MESURES PRISES</label><textarea id="violation-mesures" required maxLength={20000} rows={3} value={form.mesures} onChange={(event) => setForm({ ...form, mesures: event.target.value })} placeholder="Mesures prises à la suite de la violation" className="min-h-[96px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /></div>
          </>
        )}
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
          {editingId && <Button type="button" variant="outline" disabled={saving} onClick={cancelEdit} className="h-11 w-full gap-2 sm:w-auto"><X className="size-4" />Annuler</Button>}
          <Button type="submit" disabled={saving || !siteId} className="h-11 w-full gap-2 sm:w-auto sm:min-w-40">{editingId ? <Pencil className="size-4" /> : <Plus className="size-4" />}{saving ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Enregistrer"}</Button>
        </div>
      </form>
    </section>

    <section id="anomalies-print-area" className="space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <div><h2 className="text-lg font-semibold">{activeType === "ANOMALIE" ? "Anomalies enregistrées" : "Divers enregistrés"}</h2><p className="text-sm text-muted-foreground">{visibleEntries.length} signalement(s)</p></div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" disabled={loading || !siteId} onClick={() => setReloadKey((current) => current + 1)}><RefreshCw className="mr-2 size-4" />Actualiser</Button>
          <Button variant="outline" size="sm" disabled={loading || !visibleEntries.length} onClick={handlePrint}><Printer className="mr-2 size-4" />Imprimer le registre</Button>
        </div>
      </div>
      <div className="relative print:hidden">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={`Rechercher ${sectionName.toLocaleLowerCase("fr")}`}
          placeholder={activeType === "ANOMALIE"
            ? "Rechercher par date, heure, camion, transporteur, titre ou faits…"
            : activeType === "DIVERS"
              ? "Rechercher par date, heure, faits ou mesures prises…"
              : "Rechercher par heure, nom, observations ou mesures prises…"}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 pl-9"
        />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card print:hidden">
        <table className={`w-full ${activeType === "ANOMALIE" ? "min-w-[1400px]" : "min-w-[760px]"} table-fixed border-collapse text-left text-sm`}>
          <thead className="bg-muted/60 text-xs uppercase text-muted-foreground"><tr>
            {(activeType === "ANOMALIE"
              ? ["HEURE", "N° CAMION", "TRANSPORTEUR", "TITRE", "CASSE", "MANQUANT", "VIDES", "PHN", "DESCRIPTION DES FAITS"]
              : activeType === "DIVERS"
                ? ["DATE ET HEURE", "FAITS", "MESURES PRISES"]
                : ["HEURE", "NOM & PRÉNOM", "OBSERVATIONS", "MESURES PRISES"]).map((heading, index) => <th key={heading} className={`border-b px-3 py-3 ${activeType === "ANOMALIE" ? (index === 0 ? "w-24" : index === 8 ? "w-[360px]" : "w-36") : index === 0 ? "w-36" : "w-[360px]"}`}>{heading}</th>)}
              {activeType !== "VIOLATION_PROCEDURE" && <th className="w-28 border-b px-4 py-3 text-right">Actions</th>}
          </tr></thead>
          <tbody>{filteredEntries.map((entry) => <tr key={entry.id} className="align-top hover:bg-muted/30">
            {activeType === "ANOMALIE" ? (
              <>
                <td className="whitespace-nowrap border-b px-3 py-3">{entry.time || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.camion || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.transporteur || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.document || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.broken || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.missing || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.empty || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.phn || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.facts || "-"}</td>
              </>
            ) : activeType === "DIVERS" ? (
              <>
                <td className="whitespace-nowrap border-b px-3 py-3">{String(entry.date).slice(0, 10)} {entry.time || ""}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.facts || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.measures || "-"}</td>
              </>
            ) : (
              <>
                <td className="whitespace-nowrap border-b px-3 py-3">{entry.time || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.person || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.facts || "-"}</td>
                <td className="whitespace-pre-wrap break-words border-b px-3 py-3">{entry.measures || "-"}</td>
              </>
            )}
            {activeType !== "VIOLATION_PROCEDURE" && <td className="border-b px-2 py-3"><div className="flex justify-end gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label={`Modifier ${sectionName.toLocaleLowerCase("fr")}`} title="Modifier" onClick={() => editEntry(entry)}><Pencil className="size-4" /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${sectionName.toLocaleLowerCase("fr")}`} title="Supprimer" onClick={() => void deleteEntry(entry)} className="text-destructive hover:text-destructive"><Trash2 className="size-4" /></Button>
            </div></td>}
          </tr>)}
          {!loading && visibleEntries.length === 0 && <tr><td colSpan={activeType === "ANOMALIE" ? 10 : activeType === "DIVERS" ? 4 : 4} className="px-4 py-10 text-center text-muted-foreground">Aucun signalement enregistré pour cette section.</td></tr>}
          {!loading && visibleEntries.length > 0 && filteredEntries.length === 0 && <tr><td colSpan={activeType === "ANOMALIE" ? 10 : activeType === "DIVERS" ? 4 : 4} className="px-4 py-10 text-center text-muted-foreground">Aucun signalement ne correspond à votre recherche.</td></tr>}
          {loading && <tr><td colSpan={activeType === "ANOMALIE" ? 10 : activeType === "DIVERS" ? 4 : 4} className="px-4 py-10 text-center text-muted-foreground">Chargement...</td></tr>}</tbody>
        </table>
      </div>
      <div className="anomalies-print hidden">
        <h1 className="mb-1 text-xl font-bold">Registre {sectionName.toLocaleLowerCase("fr")}</h1>
        <p className="mb-4 text-sm">Site : {sites.find((site) => site.id === siteId)?.name || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
        <table>
          <thead>
            <tr>{(activeType === "ANOMALIE"
              ? ["HEURE", "N° CAMION", "TRANSPORTEUR", "TITRE", "CASSE", "MANQUANT", "VIDES", "PHN", "DESCRIPTION DES FAITS"]
              : activeType === "DIVERS"
                ? ["DATE ET HEURE", "FAITS", "MESURES PRISES"]
                : ["HEURE", "NOM & PRÉNOM", "OBSERVATIONS", "MESURES PRISES"]).map((heading) => <th key={heading}>{heading}</th>)}</tr>
          </thead>
          <tbody>
            {visibleEntries.map((entry) => (
              <tr key={entry.id}>
                {activeType === "ANOMALIE" ? (
                  <>
                    <td>{entry.time || "—"}</td>
                    <td>{entry.camion || "—"}</td>
                    <td>{entry.transporteur || "—"}</td>
                    <td>{entry.document || "—"}</td>
                    <td>{entry.broken || "—"}</td>
                    <td>{entry.missing || "—"}</td>
                    <td>{entry.empty || "—"}</td>
                    <td>{entry.phn || "—"}</td>
                    <td>{entry.facts || "—"}</td>
                  </>
                ) : activeType === "DIVERS" ? (
                  <>
                    <td>{String(entry.date).slice(0, 10)} {entry.time || ""}</td>
                    <td>{entry.facts || "—"}</td>
                    <td>{entry.measures || "—"}</td>
                  </>
                ) : (
                  <>
                    <td>{entry.time || "—"}</td>
                    <td>{entry.person || "—"}</td>
                    <td>{entry.facts || "—"}</td>
                    <td>{entry.measures || "—"}</td>
                  </>
                )}
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
        #anomalies-print-area, #anomalies-print-area * { visibility: visible !important; }
        #anomalies-print-area {
          position: absolute !important;
          inset: 0 auto auto 0 !important;
          width: 100% !important;
        }
        .anomalies-print { display: block !important; }
        .anomalies-print table { width: 100%; border-collapse: collapse; font-size: 9pt; }
        .anomalies-print th, .anomalies-print td { border: 1px solid #777; padding: 5px; text-align: left; vertical-align: top; white-space: pre-wrap; }
        .anomalies-print th { background: #eee !important; print-color-adjust: exact; }
      }
    `}</style>
  </div>;
}
