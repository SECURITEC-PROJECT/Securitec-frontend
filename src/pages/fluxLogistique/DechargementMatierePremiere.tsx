import { Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { printRecord } from "@/lib/printRecord";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Download, FileDown, FileUp, MapPin, PackageCheck, Pencil, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";

const designationGroups = [
  {
    label: "Matières premières",
    options: [
      "Malt Pilsen",
      "Maîs dégermée",
      "Granulé HDPE",
      "Sucre Blanche",
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
      "Couvercle canette",
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
const registryHeaders = [
  "Date", "Heure de pointe", "Véhicule", "Immatriculation camion", "Désignation",
  "Quantité", "Bon de livraison / facture", "Provenance",
];

interface MatierePremiereEntry {
  id: string;
  date: string;
  heurePointe?: string | null;
  immatriculationVehicule?: string | null;
  vehicule?: string | null;
  designation?: string | null;
  quantite?: number | string | null;
  document?: string | null;
  provenance?: string | null;
  pendingSync?: boolean;
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
  const [immatriculationVehicule, setImmatriculationVehicule] = useState("");
  const [vehicule, setVehicule] = useState("");
  const [designation, setDesignation] = useState("");
  const [quantite, setQuantite] = useState("");
  const [document, setDocument] = useState("");
  const [provenance, setProvenance] = useState("");
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [registry, setRegistry] = useState<{
    siteId: string;
    entries: MatierePremiereEntry[];
    error: string;
  }>({ siteId: "", entries: [], error: "" });
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const selectedSiteType = site?.type || siteType;
  const selectedSiteId = site?.id || "";
  const isLegacyDesignation = designation && !designationOptions.includes(designation);

  useEffect(() => {
    let active = true;
    if (!selectedSiteId) return () => { active = false; };

    const refresh = () => {
      void serviceApi.listLogistics(selectedSiteId)
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
    const entryDate = entry.date?.slice(0, 10) || "";
    const matchesDate = (!dateFrom || entryDate >= dateFrom) && (!dateTo || entryDate <= dateTo);
    const matchesStatus = statusFilter === "all" || (statusFilter === "pending" ? entry.pendingSync : !entry.pendingSync);
    const matchesText = [entry.date, entry.heurePointe, entry.immatriculationVehicule, entry.vehicule, entry.designation, entry.document, entry.provenance]
      .some((value) => value?.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
    return matchesDate && matchesText && matchesStatus;
  });
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageNumbers = Array.from(
    { length: Math.min(pageCount, currentPage + 1) - Math.max(1, currentPage - 1) + 1 },
    (_, index) => Math.max(1, currentPage - 1) + index,
  );
  const rowsForExport = (source: MatierePremiereEntry[]) => source.map((entry) => [
    entry.date?.slice(0, 10) || "",
    entry.heurePointe || "",
    entry.vehicule || "",
    entry.immatriculationVehicule || "",
    entry.designation || "",
    entry.quantite ?? "",
    entry.document || "",
    entry.provenance || "",
  ]);

  const clearForm = () => {
    setDate(today());
    setHeurePointe(nowTime());
    setImmatriculationVehicule("");
    setVehicule("");
    setDesignation("");
    setQuantite("");
    setDocument("");
    setProvenance("");
    setEditingId(null);
    setFormOpen(false);
  };

  const startEditing = (entry: MatierePremiereEntry) => {
    setEditingId(entry.id);
    setDate(entry.date.slice(0, 10));
    setHeurePointe(entry.heurePointe || "");
    setImmatriculationVehicule(entry.immatriculationVehicule || "");
    setVehicule(entry.vehicule || "");
    setDesignation(entry.designation || "");
    setQuantite(entry.quantite == null ? "" : String(entry.quantite));
    setDocument(entry.document || "");
    setProvenance(entry.provenance || "");
    setFormOpen(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: "MATIERE_PREMIERE",
        date,
        heurePointe,
        immatriculationVehicule: immatriculationVehicule.trim(),
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
        toast[entry.pendingSync ? "info" : "success"](entry.pendingSync
          ? "Modification enregistrée hors connexion. Elle sera synchronisée au retour du réseau."
          : "Déchargement modifié.");
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
      const result = await serviceApi.deleteMatierePremiereLogistics(entry.id, selectedSiteId);
      setRegistry((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }));
      if (editingId === entry.id) clearForm();
      toast[result.pendingSync ? "info" : "success"](result.pendingSync
        ? "Suppression enregistrée hors connexion. Elle sera synchronisée au retour du réseau."
        : "Déchargement supprimé du registre.");
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

  const importEntries = async (file?: File) => {
    if (!file) return;
    if (!selectedSiteId) {
      toast.error("Sélectionnez un site avant l’importation.");
      return;
    }
    if (loadingEntries || saving || importing) {
      toast.error("Attendez le chargement du registre ou la fin de l’enregistrement avant l’importation.");
      return;
    }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalizeHeader = (value: string) => value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]/g, "");
      const columns = {
        date: ["date"],
        time: ["heure de pointe", "heure pointe", "heure", "hp"],
        vehicle: ["vehicule"],
        registration: ["immatriculation camion", "immatriculation", "matricule vehicule"],
        designation: ["designation", "produit"],
        quantity: ["quantite", "quantite dechargee", "nombre"],
        document: ["bon de livraison facture", "bon de livraison", "facture", "document"],
        origin: ["provenance", "origine"],
      };
      const countHeaders = (row: string[]) => {
        const headers = row.map((value) => normalizeHeader(String(value ?? "")));
        return Object.values(columns).filter((aliases) =>
          headers.some((header) => aliases.some((alias) => header === normalizeHeader(alias))),
        ).length;
      };
      const headerRowIndex = sheet.slice(0, 10).reduce((bestIndex, row, index, rows) =>
        countHeaders(row) > countHeaders(rows[bestIndex] || []) ? index : bestIndex,
      0);
      const headers = (sheet[headerRowIndex] || []).map((value) => normalizeHeader(String(value ?? "")));
      const column = (...aliases: string[]) => headers.findIndex((header) =>
        aliases.some((alias) => header === normalizeHeader(alias)),
      );
      const col = Object.fromEntries(
        Object.entries(columns).map(([key, aliases]) => [key, column(...aliases)]),
      ) as Record<keyof typeof columns, number>;
      if (Object.values(col).some((index) => index < 0)) {
        const detected = (sheet[headerRowIndex] || []).filter(Boolean).join(", ");
        throw new Error(`Colonnes requises manquantes : ${registryHeaders.join(", ")}. En-têtes détectés : ${detected || "aucun"}.`);
      }
      const get = (cells: string[], index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
      const parseDate = (value: string) => {
        const text = value.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
        const frenchDate = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(text);
        if (frenchDate) return `${frenchDate[3]}-${frenchDate[2].padStart(2, "0")}-${frenchDate[1].padStart(2, "0")}`;
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
      const rows = sheet.slice(headerRowIndex + 1).map((cells, index) => {
        const rawQuantity = get(cells, col.quantity).replace(/\s/g, "");
        return {
          line: headerRowIndex + index + 2,
          date: parseDate(get(cells, col.date)),
          heurePointe: parseTime(get(cells, col.time)),
          vehicule: get(cells, col.vehicle),
          immatriculationVehicule: get(cells, col.registration),
          designation: get(cells, col.designation),
          quantite: Number(rawQuantity.includes(",") ? rawQuantity.replace(/\./g, "").replace(",", ".") : rawQuantity),
          document: get(cells, col.document),
          provenance: get(cells, col.origin),
          hasData: cells.some((value) => String(value ?? "").trim()),
        };
      }).filter((row) => row.hasData);
      if (!rows.length) throw new Error("Le fichier ne contient aucune ligne à importer.");

      const created: MatierePremiereEntry[] = [];
      const failures: string[] = [];
      for (const row of rows) {
        if (!row.date || !row.heurePointe || !row.vehicule || !row.immatriculationVehicule ||
            !row.designation || !Number.isInteger(row.quantite) || row.quantite <= 0 ||
            !row.document || !row.provenance) {
          failures.push(`Ligne ${row.line} : vérifiez la date, l’heure, le véhicule, l’immatriculation, la désignation, la quantité, le document et la provenance.`);
          continue;
        }
        try {
          const result = await serviceApi.createLogistics({
            type: "MATIERE_PREMIERE",
            date: row.date,
            heurePointe: row.heurePointe,
            immatriculationVehicule: row.immatriculationVehicule,
            vehicule: row.vehicule,
            designation: row.designation,
            quantite: row.quantite,
            document: row.document,
            provenance: row.provenance,
            siteId: selectedSiteId,
            siteName: selectedSiteName,
            siteType: selectedSiteType,
          });
          if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement.");
          created.push(result.entry as MatierePremiereEntry);
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
          if (error instanceof Error && "status" in error && error.status === 409) break;
        }
      }
      if (created.length) {
        setRegistry((current) => ({
          siteId: selectedSiteId,
          entries: [...created, ...(current.siteId === selectedSiteId
            ? current.entries.filter((entry) => !created.some((item) => item.id === entry.id))
            : [])],
          error: "",
        }));
        const queued = created.filter((entry) => entry.pendingSync).length;
        toast.success(`${created.length} déchargement(s) importé(s)${queued ? ` (${queued} en attente de synchronisation)` : ""}.`);
      }
      if (failures.length) toast.error(`${failures.length} ligne(s) non importée(s) : ${failures.slice(0, 2).join(" ")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };

  const printEntry = (entry: MatierePremiereEntry) => {
    const displayDate = entry.date?.slice(0, 10).split("-").reverse().join("/") || "—";
    printRecord("Déchargement matière première", selectedSiteName, [
      ["Date", displayDate],
      ["Heure de pointe", entry.heurePointe || "—"],
      ["Immatriculation du camion", entry.immatriculationVehicule || "—"],
      ["Véhicule", entry.vehicule || "—"],
      ["Désignation", entry.designation || "—"],
      ["Quantité", entry.quantite == null ? "—" : String(entry.quantite)],
      ["Bon de livraison / facture", entry.document || "—"],
      ["Provenance", entry.provenance || "—"],
    ]);
  };

  return (
    <div className="raw-material-module space-y-4">
      <section className="raw-material-hero">
        <div className="raw-material-hero-icon"><PackageCheck aria-hidden="true" /></div>
        <div>
          <h1>Déchargement matière première</h1>
          <p>Enregistrez et suivez les réceptions de matières premières</p>
        </div>
      </section>
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="raw-material-form-modal">
          <DialogHeader className="raw-material-form-modal-header">
            <div className="raw-material-form-modal-icon"><PackageCheck aria-hidden="true" /></div>
            <div>
              <DialogTitle>{editingId ? "Modifier un déchargement" : "Nouvelle réception de matière première"}</DialogTitle>
              <DialogDescription>Complétez les informations du déchargement puis enregistrez.</DialogDescription>
            </div>
          </DialogHeader>
          <form className="raw-material-form w-full space-y-5" onSubmit={(event) => void submit(event)}>
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
                setImmatriculationVehicule("");
              }}
            />
            <div className="raw-material-form-fields grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                <Input id="matiere-vehicule" required maxLength={160} autoComplete="off" placeholder="Saisir le véhicule" value={vehicule} onChange={(event) => setVehicule(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-immatriculation">Immatriculation camion</Label>
                <Input id="matiere-immatriculation" required maxLength={100} autoComplete="off" placeholder="Saisir l’immatriculation" value={immatriculationVehicule} onChange={(event) => setImmatriculationVehicule(event.target.value)} />
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
                <Input id="matiere-quantite" type="number" min="1" step="1" required value={quantite} onChange={(event) => setQuantite(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-document">Bon de livraison / facture</Label>
                <Input id="matiere-document" required maxLength={160} value={document} onChange={(event) => setDocument(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-provenance">Provenance</Label>
                <Input id="matiere-provenance" required maxLength={255} value={provenance} onChange={(event) => setProvenance(event.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !selectedSiteName.trim()}>
                {saving ? "Enregistrement…" : editingId ? "Enregistrer les modifications" : "Enregistrer le déchargement"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <section id="raw-material-print-area" className="raw-material-registry">
      <Panel>
        <div className="raw-material-registry-toolbar raw-material-screen">
          <h2>Registre des déchargements</h2>
          <div className="raw-material-registry-actions">
            <Button type="button" className="raw-material-primary-action" onClick={() => {
              clearForm();
              setFormOpen(true);
            }}>
              <PackageCheck className="h-4 w-4 shrink-0" />Nouveau déchargement
            </Button>
            <label className={`raw-material-import-action ${!selectedSiteId || importing || saving ? "pointer-events-none opacity-50" : ""}`}>
              <FileUp className="h-4 w-4 shrink-0" />{importing ? "Importation…" : "Importer Excel / CSV"}
              <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!selectedSiteId || importing || saving} onChange={(event) => { void importEntries(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <Button type="button" variant="outline" onClick={() => exportXlsx("modele-dechargement-matiere-premiere.xlsx", "Matière première", registryHeaders, [])}>
              <FileDown className="h-4 w-4 shrink-0" />Modèle Excel
            </Button>
            <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={() => exportXlsx(`dechargement-matiere-premiere-${today()}.xlsx`, "Matière première", registryHeaders, rowsForExport(filteredEntries))}>
              <Download className="h-4 w-4 shrink-0" />Exporter Excel
            </Button>
            <Button type="button" variant="outline" className="raw-material-print-button" disabled={!selectedSiteId || !filteredEntries.length} onClick={handlePrintRegistry}>
              <Printer className="h-4 w-4 shrink-0" />Imprimer les lignes (Word)
            </Button>
          </div>
        </div>
        <div className="raw-material-filter-grid raw-material-screen">
          <label className="raw-material-filter-field raw-material-period-filter">
            <span><CalendarDays aria-hidden="true" />Période</span>
            <div className="raw-material-date-range">
              <Input aria-label="Date de début" type="date" value={dateFrom} onChange={(event) => { setDateFrom(event.target.value); setPage(1); }} />
              <span aria-hidden="true">–</span>
              <Input aria-label="Date de fin" type="date" value={dateTo} onChange={(event) => { setDateTo(event.target.value); setPage(1); }} />
            </div>
          </label>
          <label className="raw-material-filter-field">
            <span><MapPin aria-hidden="true" />Site</span>
            <select
              value={selectedSiteName}
              onChange={(event) => {
                const nextSite = sites.find((item) => item.name === event.target.value);
                setSiteName(event.target.value);
                setSiteType(nextSite?.type || "USINE");
                setPage(1);
              }}
              disabled={sites.length <= 1}
            >
              <option value="">Sélectionner un site</option>
              {sites.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label className="raw-material-filter-field">
            <span><CheckCircle2 aria-hidden="true" />Statut</span>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}>
              <option value="all">Tous</option>
              <option value="recorded">Enregistré</option>
              <option value="pending">En attente de synchronisation</option>
            </select>
          </label>
          <label className="raw-material-filter-field raw-material-search-filter">
            <span><Search aria-hidden="true" />Recherche</span>
            <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher dans le registre"
              className="h-10 w-full pl-9"
              placeholder="Véhicule, désignation, document…"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            />
            </div>
          </label>
        </div>
        <div className="raw-material-results-summary raw-material-screen">
          <p><CheckCircle2 aria-hidden="true" />{filteredEntries.length} déchargement(s) trouvé(s)</p>
          <label>
            Afficher
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              <option value={10}>10 lignes</option>
              <option value={25}>25 lignes</option>
              <option value={50}>50 lignes</option>
              <option value={100}>100 lignes</option>
            </select>
          </label>
        </div>
        {entriesError ? (
          <p className="raw-material-screen text-sm text-destructive">{entriesError}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border raw-material-screen">
            <table className="raw-material-table w-full min-w-[1120px] text-left text-sm">
              <thead className="raw-material-table-head bg-muted/60 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">N°</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Heure de pointe</th>
                  <th className="px-4 py-3">Véhicule</th>
                  <th className="px-4 py-3">Immatriculation camion</th>
                  <th className="px-4 py-3">Désignation</th>
                  <th className="px-4 py-3">Quantité</th>
                  <th className="px-4 py-3">Bon de livraison / facture</th>
                  <th className="px-4 py-3">Provenance</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingEntries ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={11}>Chargement du registre…</td></tr>
                ) : filteredEntries.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={11}>
                    {entries.length === 0 ? "Aucun déchargement enregistré." : "Aucun résultat pour ces critères."}
                  </td></tr>
                ) : pageEntries.map((entry, index) => (
                  <tr key={entry.id} className="raw-material-table-row">
                    <td className="whitespace-nowrap px-4 py-3">{(currentPage - 1) * pageSize + index + 1}</td>
                    <td className="whitespace-nowrap px-4 py-3">{entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                    <td className="px-4 py-3">{entry.heurePointe || "—"}</td>
                    <td className="px-4 py-3">{entry.vehicule || "—"}</td>
                    <td className="px-4 py-3">{entry.immatriculationVehicule || "—"}</td>
                    <td className="px-4 py-3">{entry.designation || "—"}</td>
                    <td className="px-4 py-3">{entry.quantite ?? "—"}</td>
                    <td className="px-4 py-3">{entry.document || "—"}</td>
                    <td className="px-4 py-3">{entry.provenance || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`raw-material-status ${entry.pendingSync ? "raw-material-status--pending" : ""}`}>
                        {entry.pendingSync ? "En attente de synchronisation" : "Enregistré"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="raw-material-row-action"
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
                          className="raw-material-row-action"
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
          <div className="raw-material-pagination raw-material-screen">
            <span>
              {filteredEntries.length ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredEntries.length)} sur ${filteredEntries.length}` : "Aucun résultat"}
            </span>
            <div>
              <Button type="button" variant="outline" size="icon" aria-label="Page précédente" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
                <ChevronLeft aria-hidden="true" />
              </Button>
              {pageNumbers.map((pageNumber) => (
                <Button key={pageNumber} type="button" variant={pageNumber === currentPage ? "default" : "outline"} className="raw-material-page-number" aria-current={pageNumber === currentPage ? "page" : undefined} onClick={() => setPage(pageNumber)}>
                  {pageNumber}
                </Button>
              ))}
              <Button type="button" variant="outline" size="icon" aria-label="Page suivante" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        )}
        {!loadingEntries && !entriesError && (
          <div className="raw-material-print hidden">
            <h1 className="mb-1 text-xl font-bold">Registre des déchargements de matière première</h1>
            <p className="mb-4 text-sm">Site : {selectedSiteName || "—"} · Imprimé le {new Date().toLocaleString("fr-FR")}</p>
            <table>
              <thead>
                <tr>
                  {["Date", "Heure de pointe", "Véhicule", "Immatriculation camion", "Désignation", "Quantité", "Bon de livraison / facture", "Provenance"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.date?.slice(0, 10).split("-").reverse().join("/") || "—"}</td>
                    <td>{entry.heurePointe || "—"}</td>
                    <td>{entry.vehicule || "—"}</td>
                    <td>{entry.immatriculationVehicule || "—"}</td>
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
