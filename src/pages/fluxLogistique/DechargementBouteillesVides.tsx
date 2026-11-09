import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type EmptyBottleDelivery } from "@/lib/service-api";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";
import { ClipboardList, Pencil, Plus, Printer, Save, Search, Trash2, X, FileUp, FileDown, Download } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { printRecord } from "@/lib/printRecord";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DESIGNATION_GROUPS = [
  { label: "Bouteilles vides", options: ["Bouteilles vides - 65 Cl", "Bouteilles vides - 50 Cl", "Bouteilles vides - 33 Cl"] },
  { label: "Fût", options: ["Fût - 30 L", "Fût - 20 L", "Fût - 20L export", "Fût - 30L export"] },
  { label: "Cageau jaune", options: ["Cageau jaune - C20", "Cageau jaune - C24"] },
  { label: "Bouteilles neuves", options: ["Bouteilles neuves - 65 Cl", "Bouteilles neuves - 50 Cl", "Bouteilles neuves - 33 Cl"] },
  { label: "Palettes", options: ["Palette neuve - 1310 x 1055", "Palette neuve - 1000 x 1200", "Palette neuve - 800 x 1200"] },
] as const;
const DESIGNATIONS = DESIGNATION_GROUPS.flatMap((group) => group.options);
const DELIVERY_HEADERS = [
  "Date", "Heure d'arrivée", "Heure de sortie", "Immatriculation", "Nom du chauffeur",
  "N° titre", "N° plomb", "Provenance", "Poids (kg)", "BRUT", "TARE", "NET",
  "Client / Fournisseur", "Produit", "Remarque", ...DESIGNATIONS,
];
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
  const [importing, setImporting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [designationFilter, setDesignationFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [pontBasculePost, setPontBasculePost] = useState(false);

  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  useEffect(() => {
    let active = true;
    const contextMatchesSite = routeContext?.siteId === site?.id;
    const postId = contextMatchesSite ? routeContext?.posteId : null;
    if (!site?.id || !postId) {
      setPontBasculePost(false);
      return () => { active = false; };
    }
    const contextPostName = contextMatchesSite && routeContext?.posteId === postId ? routeContext.posteNom : "";
    if (contextPostName) {
      setPontBasculePost(normalizeSearch(contextPostName).trim().startsWith("pont bascule"));
      return () => { active = false; };
    }
    serviceApi.listShiftPosts(site.id)
      .then((posts) => {
        if (active) setPontBasculePost(normalizeSearch(posts.find((post) => post.id === postId)?.nom || "").trim().startsWith("pont bascule"));
      })
      .catch(() => { if (active) setPontBasculePost(false); });
    return () => { active = false; };
  }, [routeContext?.posteId, routeContext?.posteNom, routeContext?.siteId, site?.id]);
  const normalizedSearch = normalizeSearch(search.trim());
  const showPondBrutFields = pontBasculePost || editingEntry?.brut != null;
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
    ].join(" ")).includes(normalizedSearch)
    && (!dateFrom || String(entry.date).slice(0, 10) >= dateFrom)
    && (!dateTo || String(entry.date).slice(0, 10) <= dateTo)
    && (!designationFilter || entry.detailsBouteilles.some((line) => line.designation === designationFilter)),
  );
  const rowsForExport = (source: EmptyBottleDelivery[]) => source.map((entry) => {
    const quantities = new Map(entry.detailsBouteilles.map((line) => [line.designation, line.quantite]));
    return [
      String(entry.date).slice(0, 10),
      entry.heureArrivee || "",
      entry.heureFin || "",
      entry.immatriculationVehicule || "",
      entry.nomChauffeur || "",
      entry.numeroTitre || "",
      entry.plomb || "",
      entry.provenance || "",
      entry.poids ?? "",
      entry.brut ?? "",
      entry.tare ?? "",
      entry.net ?? "",
      entry.clientFournisseur || "",
      entry.produit || "",
      entry.remarque || entry.observation || "",
      ...DESIGNATIONS.map((designation) => quantities.get(designation) ?? ""),
    ];
  });
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
    const refreshEntries = () => serviceApi.listLogistics(site.id)
      .then((flows) => {
        if (active) setEntries((flows as EmptyBottleDelivery[]).filter((entry) => entry.type === "BOUTEILLES_VIDES"));
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Chargement des réceptions impossible."));
    const refreshOnQueueChange = () => { void refreshEntries(); };
    void refreshEntries();
    window.addEventListener("online", refreshOnQueueChange);
    window.addEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    return () => {
      active = false;
      window.removeEventListener("online", refreshOnQueueChange);
      window.removeEventListener("securitec-offline-queue-changed", refreshOnQueueChange);
    };
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
    const usePondBrut = pontBasculePost || editingEntry?.brut != null;
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
        toast[entry.pendingSync ? "info" : "success"](entry.pendingSync
          ? "Modification enregistrée hors connexion. Elle sera synchronisée au retour du réseau."
          : "Réception modifiée.");
      } else {
        const { entry } = await serviceApi.createEmptyBottleDelivery(payload);
        setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
        toast.success(entry.pendingSync
          ? "Réception enregistrée localement. Synchronisation au retour du réseau."
          : "Réception de bouteilles enregistrée.");
      }
      resetForm();
      setFormOpen(false);
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
    setFormOpen(true);
  };

  const deleteEntry = async (entry: EmptyBottleDelivery) => {
    if (!site?.id || !(await confirmDeletion(`Supprimer la réception du véhicule « ${entry.immatriculationVehicule} » ? Cette action est définitive.`))) return;
    setDeletingId(entry.id);
    try {
      const result = await serviceApi.deleteEmptyBottleDelivery(entry.id, site.id);
      setEntries((current) => current.filter((item) => item.id !== entry.id));
      if (editingEntry?.id === entry.id) resetForm();
      toast[result.pendingSync ? "info" : "success"](result.pendingSync
        ? "Suppression enregistrée hors connexion. Elle sera synchronisée au retour du réseau."
        : "Réception supprimée.");
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

  const importDeliveries = async (file?: File) => {
    if (!file) return;
    if (!site?.id) {
      toast.error("Sélectionnez un site avant l’importation.");
      return;
    }
    if (saving || importing) {
      toast.error("Attendez la fin de l’enregistrement ou de l’importation.");
      return;
    }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalizeHeader = (value: string) => normalizeSearch(value).replace(/[^a-z0-9]/g, "");
      const headers = (sheet[0] || []).map((value) => normalizeHeader(String(value ?? "")));
      const column = (...aliases: string[]) => headers.findIndex((header) =>
        aliases.some((alias) => header === normalizeHeader(alias)),
      );
      const columns = {
        date: column("date"),
        arrival: column("heure d'arrivée", "heure arrivée", "he", "hd"),
        end: column("heure de sortie", "heure sortie", "hs", "hf"),
        registration: column("immatriculation", "immatriculation véhicule", "véhicule"),
        driver: column("nom du chauffeur", "nom chauffeur", "chauffeur"),
        title: column("n° titre", "numero titre", "titre"),
        seal: column("n° plomb", "numero plomb", "plomb"),
        origin: column("provenance"),
        weight: column("poids", "poids kg"),
        brut: column("brut"),
        tare: column("tare"),
        net: column("net"),
        client: column("client fournisseur", "client / fournisseur"),
        product: column("produit"),
        remark: column("remarque", "observations"),
        details: DESIGNATIONS.map((designation) => column(designation)),
      };
      if ([columns.date, columns.arrival, columns.registration, columns.driver, columns.title, columns.origin, columns.weight].some((index) => index < 0) ||
          columns.details.every((index) => index < 0)) {
        throw new Error("Colonnes requises manquantes : Date, Heure d’arrivée, Immatriculation, Nom du chauffeur, N° titre, Provenance, Poids et au moins un format d’article.");
      }
      const get = (cells: string[], index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
      const parseDate = (value: string) => {
        const text = value.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
        const french = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/.exec(text);
        if (french) return `${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`;
        const serial = Number(text);
        return Number.isFinite(serial) && serial > 20000 && serial < 80000
          ? new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10)
          : "";
      };
      const parseTime = (value: string) => {
        const text = value.trim();
        const serial = Number(text);
        if (text && Number.isFinite(serial) && serial >= 0 && serial < 1) {
          const minutes = Math.round(serial * 1440);
          return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        }
        const match = /^(\d{1,2}):(\d{2})/.exec(text);
        return match && Number(match[1]) < 24 && Number(match[2]) < 60
          ? `${match[1].padStart(2, "0")}:${match[2]}`
          : "";
      };
      const parseNumber = (value: string) => {
        const text = value.trim().replace(/\s/g, "");
        return Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
      };
      const rows = sheet.slice(1).map((cells, index) => {
        const detailsBouteilles = DESIGNATIONS.flatMap((designation, detailIndex) => {
          const quantityText = get(cells, columns.details[detailIndex]);
          return quantityText ? [{ designation, quantite: Number(quantityText) }] : [];
        });
        return {
          line: index + 2,
          date: parseDate(get(cells, columns.date)),
          heureArrivee: parseTime(get(cells, columns.arrival)),
          heureFin: parseTime(get(cells, columns.end)) || null,
          immatriculationVehicule: get(cells, columns.registration),
          nomChauffeur: get(cells, columns.driver),
          numeroTitre: get(cells, columns.title),
          plomb: get(cells, columns.seal),
          provenance: get(cells, columns.origin),
          poids: parseNumber(get(cells, columns.weight)),
          brut: get(cells, columns.brut),
          tare: get(cells, columns.tare),
          net: get(cells, columns.net),
          clientFournisseur: get(cells, columns.client),
          produit: get(cells, columns.product),
          remarque: get(cells, columns.remark),
          detailsBouteilles,
          hasData: cells.some((value) => String(value ?? "").trim()),
        };
      }).filter((row) => row.hasData);
      if (!rows.length) throw new Error("Le fichier ne contient aucune ligne à importer.");

      let imported = 0;
      const failures: string[] = [];
      const created: EmptyBottleDelivery[] = [];
      for (const row of rows) {
        const hasPondBrut = Boolean(row.brut || row.tare || row.net);
        const brut = parseNumber(row.brut);
        const tare = parseNumber(row.tare);
        const net = parseNumber(row.net);
        if (!row.date || !row.heureArrivee || !row.immatriculationVehicule || !row.nomChauffeur ||
            !/^\d+$/.test(row.numeroTitre) || !/^\d+$/.test(row.provenance) ||
            (!hasPondBrut && (!Number.isFinite(row.poids) || row.poids <= 0)) ||
            (hasPondBrut && (!Number.isFinite(brut) || !Number.isFinite(tare) || !Number.isFinite(net) || brut <= 0 || tare <= 0 || net <= 0)) ||
            !row.detailsBouteilles.length || row.detailsBouteilles.some((line) => !Number.isInteger(line.quantite) || line.quantite < 1 || line.quantite > 1_000_000)) {
          failures.push(`Ligne ${row.line} : vérifiez la date, les heures, le véhicule, le chauffeur, le titre, la provenance, le poids et les quantités.`);
          continue;
        }
        try {
          const result = await serviceApi.createEmptyBottleDelivery({
            type: "BOUTEILLES_VIDES",
            date: row.date,
            heureArrivee: row.heureArrivee,
            heureFin: row.heureFin,
            immatriculationVehicule: row.immatriculationVehicule,
            nomChauffeur: row.nomChauffeur,
            numeroTitre: row.numeroTitre,
            plomb: row.plomb,
            provenance: row.provenance,
            poids: hasPondBrut ? net : row.poids,
            ...(hasPondBrut ? { pondBrut: { brut, tare, net, clientFournisseur: row.clientFournisseur, produit: row.produit, remarque: row.remarque } } : {}),
            detailsBouteilles: row.detailsBouteilles,
            siteId: site.id,
            siteName: selectedSiteName,
            siteType: site.type,
            posteId: routeContext?.siteId === site.id ? routeContext.posteId : undefined,
          });
          created.push(result.entry);
          imported += 1;
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
          if (error instanceof Error && "status" in error && error.status === 409) break;
        }
      }
      if (created.length) setEntries((current) => [...created, ...current.filter((entry) => !created.some((item) => item.id === entry.id))]);
      if (imported) toast.success(`${imported} réception(s) importée(s).`);
      if (failures.length) toast.error(`${failures.length} ligne(s) non importée(s) : ${failures.slice(0, 2).join(" ")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
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
    <div className="empty-bottles-module space-y-5">
      <header className="empty-bottles-registry-heading">
        <div className="empty-bottles-registry-heading__identity">
          <span className="empty-bottles-registry-heading__icon"><ClipboardList aria-hidden="true" /></span>
          <div><h1>Déchargement bouteilles vides</h1><p>Suivez les réceptions par véhicule, format et quantité</p></div>
        </div>
        <div className="empty-bottles-registry-heading__controls">
          <SitePicker {...siteProps} />
          <Button type="button" className="empty-bottles-new-button" onClick={() => { resetForm(); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nouvelle réception
          </Button>
        </div>
      </header>
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="empty-bottles-entry-dialog w-[calc(100vw-1rem)] max-w-[1440px] max-h-[94vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Modifier une réception" : "Nouvelle réception de bouteilles vides"}</DialogTitle>
            <DialogDescription>Renseignez les informations du véhicule et les quantités reçues.</DialogDescription>
          </DialogHeader>
      <form onSubmit={(event) => void submit(event)} className="empty-bottles-form overflow-hidden rounded-xl border bg-card shadow-sm">
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
                    <Label htmlFor="empty-bottles-brut">BRUT</Label>
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
                    <Label htmlFor="empty-bottles-remark">Observations</Label>
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
          {editingEntry && <Button type="button" variant="outline" onClick={() => { resetForm(); setFormOpen(false); }}><X /> Annuler</Button>}
          <Button type="submit" disabled={saving || !site?.id}>
            <Save /> {saving ? "Enregistrement…" : editingEntry ? "Enregistrer les modifications" : "Enregistrer la réception"}
          </Button>
        </div>
      </form>
        </DialogContent>
      </Dialog>

      <section id="empty-bottles-print-area" className="empty-bottles-registry space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="empty-bottles-toolbar empty-bottles-screen">
          <div className="empty-bottles-toolbar__label">Registre des réceptions <span>{filteredEntries.length} enregistrement(s)</span></div>
          <div className="empty-bottles-toolbar__actions">
            <label className={`inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm font-medium ${!site?.id || importing || saving ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
              <FileUp className="mr-2 h-4 w-4" />{importing ? "Importation…" : "Importer Excel / CSV"}
              <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!site?.id || importing || saving} onChange={(event) => { void importDeliveries(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <Button type="button" variant="outline" onClick={() => exportXlsx("modele-receptions-bouteilles-vides.xlsx", "Réceptions bouteilles vides", DELIVERY_HEADERS, [])}>
              <FileDown className="mr-2 h-4 w-4" />Modèle Excel
            </Button>
            <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={() => exportXlsx(`receptions-bouteilles-vides-${today()}.xlsx`, "Réceptions bouteilles vides", DELIVERY_HEADERS, rowsForExport(filteredEntries))}>
              <Download className="mr-2 h-4 w-4" />Exporter Excel
            </Button>
            <Button type="button" variant="outline" className="empty-bottles-print-button" disabled={!site?.id || !filteredEntries.length} onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />Imprimer les lignes (Word)
            </Button>
            <span className="sr-only" aria-live="polite">{filteredEntries.length} réception{filteredEntries.length === 1 ? "" : "s"} affichée{filteredEntries.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="empty-bottles-filters empty-bottles-screen">
          <label className="empty-bottles-search"><span>Recherche</span><div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Rechercher une réception de bouteilles vides"
            placeholder="Rechercher par date, véhicule, chauffeur, titre, plomb, provenance, format…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-11 pl-9"
          />
          </div></label>
          <label>Période du<input type="date" max={dateTo || undefined} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label>
          <label>Au<input type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label>
          <label>Format<select value={designationFilter} onChange={(event) => setDesignationFilter(event.target.value)}><option value="">Tous les formats</option>{DESIGNATION_GROUPS.map((group) => <optgroup key={group.label} label={group.label}>{group.options.map((designation) => <option key={designation} value={designation}>{designation.split(" - ").slice(1).join(" - ")}</option>)}</optgroup>)}</select></label>
          {(search || dateFrom || dateTo || designationFilter) && <Button type="button" variant="ghost" onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setDesignationFilter(""); }}>Effacer</Button>}
        </div>
        <div className="max-h-[520px] overflow-auto empty-bottles-screen">
          <table className="empty-bottles-table w-full min-w-[1400px] border-collapse text-left text-sm">
            <thead className="empty-bottles-table-head sticky top-0 bg-muted">
              <tr>
                {["Date", "HE", "HS", "Immatriculation", "Nom du chauffeur", "N° titre", "N° plomb", "Comptage", "Provenance", "Poids", "Actions"].map((heading) => (
                  <th key={heading} className="border-b px-3 py-2 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className={`empty-bottles-table-row border-b last:border-0 ${entry.pendingSync ? "empty-bottles-table-row--pending" : ""}`}>
                  <td className="px-3 py-2">{displayDate(entry.date)}{entry.pendingSync && <span className="mt-1 block text-xs text-amber-700" title={entry.pendingSyncError || undefined}>{entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"}</span>}</td>
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
                      <Button type="button" size="icon" variant="ghost" className="empty-bottles-row-action h-8 w-8" aria-label="Imprimer la réception" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="empty-bottles-row-action h-8 w-8" aria-label="Modifier la réception" title={entry.pendingSync ? "Disponible après synchronisation" : "Modifier la réception"} disabled={Boolean(entry.pendingSync)} onClick={() => editEntry(entry)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Supprimer la réception" title={entry.pendingSync ? "Disponible après synchronisation" : "Supprimer la réception"} disabled={Boolean(entry.pendingSync) || deletingId === entry.id} onClick={() => void deleteEntry(entry)}>
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
              {filteredEntries.map((entry) => (
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
