import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type ChauffeurRecord } from "@/lib/service-api";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";
import { printRecord } from "@/lib/printRecord";
import { downloadWordTable, printRegistryTable } from "@/lib/registry-table";
import { ClipboardList, Download, FileDown, FileUp, Pencil, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nowTime = () => new Date().toTimeString().slice(0, 5);

interface DechetsEntry {
  id: string;
  date: string;
  typeDechet?: "LEVURE" | "DRECHE" | null;
  heureSortie?: string | null;
  numeroPesage?: string | null;
  facture?: string | null;
  plomb?: string | null;
  poids?: string | number | null;
  destinataire?: string | null;
  vehicule?: string | null;
  transporteur?: string | null;
  siteName?: string | null;
  pendingSync?: boolean;
}

interface OpenShift {
  id: string;
  serviceId?: string;
  siteId?: string;
  site_de_travail?: string;
  pendingSync?: boolean;
  ended_at?: string | null;
  posteId?: string;
  posteNom?: string;
  shiftType?: string;
  nom?: string;
  prenom?: string;
  started_at?: string;
  serviceEndedAt?: string | null;
  fonctionService?: string;
}

const formatDate = (value: string) => {
  const date = value?.slice(0, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "—";
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

const formatWasteType = (type?: DechetsEntry["typeDechet"]) =>
  type === "LEVURE" ? "Levure" : type === "DRECHE" ? "Drèche" : "—";

const wasteHeaders = [
  "Date sortie", "Désignation", "Heure sortie", "Véhicule / immatriculation", "Transporteur",
  "N° de pesage", "Facture", "Plomb", "Poids (kg)", "Destinataire / client",
];
const normalizeText = (value: string) =>
  value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLocaleLowerCase("fr");
const normalizeHeader = (value: string) => normalizeText(value).replace(/[^a-z0-9]/g, "");
export default function DechetsLevee() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [date, setDate] = useState(today);
  const [typeDechet, setTypeDechet] = useState<"" | "LEVURE" | "DRECHE">("");
  const [heureSortie, setHeureSortie] = useState(nowTime);
  const [numeroPesage, setNumeroPesage] = useState("");
  const [facture, setFacture] = useState("");
  const [plomb, setPlomb] = useState("");
  const [poids, setPoids] = useState("");
  const [destinataire, setDestinataire] = useState("");
  const [vehicule, setVehicule] = useState("");
  const [transporteur, setTransporteur] = useState("");
  const [vehicleSuggestionsOpen, setVehicleSuggestionsOpen] = useState(false);
  const [activeVehicleSuggestion, setActiveVehicleSuggestion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [shiftError, setShiftError] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const shiftSelectRef = useRef<HTMLSelectElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [registry, setRegistry] = useState<{ siteId: string; entries: DechetsEntry[]; error: string }>({
    siteId: "",
    entries: [],
    error: "",
  });
  const [chauffeurRegistry, setChauffeurRegistry] = useState<{
    siteId: string;
    chauffeurs: ChauffeurRecord[];
    error: string;
  }>({ siteId: "", chauffeurs: [], error: "" });
  const [search, setSearch] = useState("");
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);
  const selectedSiteType = site?.type || siteType;
  const selectedSiteId = site?.id || "";

  useEffect(() => {
    const updateConnectivity = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, []);

  useEffect(() => {
    if (!selectedSiteId) {
      return;
    }

    const selectedPostId = localStorage.getItem(`securitec-active-post:${selectedSiteId}`);
    const storageKey = `securitec-logistics-shift:${selectedSiteId}:${selectedPostId || "site"}`;
    if (!isOnline) {
      setOpenShifts([]);
      setOpenShiftId(localStorage.getItem(storageKey) ||
        (!selectedPostId ? localStorage.getItem(`securitec-logistics-shift:${selectedSiteId}`) ||
          localStorage.getItem(`securitec-active-shift:${selectedSiteId}`) : null));
      setLoadingShifts(false);
      setShiftError("");
      return;
    }

    let active = true;
    setLoadingShifts(true);
    setShiftError("");
    serviceApi.listShifts(selectedSiteId).then((shifts) => {
      const grouped = new Map<string, OpenShift[]>();
      shifts.filter((item: OpenShift) => !item.ended_at && !item.serviceEndedAt && !item.pendingSync &&
        (item.siteId === selectedSiteId || String(item.site_de_travail || "").trim().toLocaleLowerCase() === selectedSiteName.trim().toLocaleLowerCase()))
        .forEach((item: OpenShift) => {
          const id = String(item.serviceId || item.id);
          grouped.set(id, [...(grouped.get(id) || []), item]);
        });
      const candidates = Array.from(grouped.entries()).map(([serviceId, members]) => {
        const leader = members.find((item) => item.fonctionService === "CHEF") || members[0];
        return { ...leader, id: serviceId, serviceId };
      }).sort((left, right) => new Date(right.started_at || 0).getTime() - new Date(left.started_at || 0).getTime());
      if (!active) return;
      setOpenShifts(candidates);
      const matchingPostShifts = selectedPostId ? candidates.filter((item) => item.posteId === selectedPostId) : [];
      const relevant = matchingPostShifts.length ? matchingPostShifts : candidates;
      const cached = localStorage.getItem(storageKey) ||
        (!selectedPostId ? localStorage.getItem(`securitec-logistics-shift:${selectedSiteId}`) ||
          localStorage.getItem(`securitec-active-shift:${selectedSiteId}`) : null);
      const id = relevant.some((item) => item.id === cached) ? cached : relevant.length === 1 ? relevant[0].id : null;
      setOpenShiftId(id);
      if (id) {
        localStorage.setItem(storageKey, id);
        const selected = relevant.find((item) => item.id === id);
        if (selected?.posteId) {
          localStorage.setItem(`securitec-active-post:${selectedSiteId}`, selected.posteId);
          localStorage.setItem(`securitec-active-shift:${selectedSiteId}:${selected.posteId}`, id);
        }
      } else {
        localStorage.removeItem(storageKey);
      }
    }).catch((error) => {
      if (!active) return;
      setOpenShifts([]);
      setOpenShiftId(null);
      setShiftError(error instanceof Error ? error.message : "Chargement des prises de poste impossible.");
    }).finally(() => {
      if (active) setLoadingShifts(false);
    });
    return () => { active = false; };
  }, [selectedSiteId, selectedSiteName, isOnline]);

  useEffect(() => {
    let active = true;
    const requestedSiteId = site?.id;
    if (!requestedSiteId) return () => { active = false; };
    const refresh = () => {
      void serviceApi.listLogistics(requestedSiteId)
        .then((result) => {
          if (active) setRegistry({
            siteId: requestedSiteId,
            entries: result.filter((entry) => entry.type === "DECHETS"),
            error: "",
          });
        })
        .catch((error) => {
          if (active) setRegistry({
            siteId: requestedSiteId,
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
  }, [site?.id]);

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

  const registeredChauffeurs = chauffeurRegistry.siteId === selectedSiteId
    ? chauffeurRegistry.chauffeurs
    : [];
  const normalizedVehicleSearch = normalizeText(vehicule);
  const matchingVehicles = registeredChauffeurs.filter((driver) =>
    driver.vehicule?.trim() &&
    (!normalizedVehicleSearch ||
      `${driver.vehicule || ""} ${driver.matricule || ""} ${driver.nomPrenom}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("fr")
        .includes(normalizedVehicleSearch)),
  ).slice(0, 8);
  const chauffeurVehiclesLoading = Boolean(selectedSiteId) && chauffeurRegistry.siteId !== selectedSiteId;
  const entries = registry.siteId === selectedSiteId ? registry.entries : [];
  const entriesError = registry.siteId === selectedSiteId ? registry.error : "";
  const loadingEntries = Boolean(selectedSiteId) && registry.siteId !== selectedSiteId;
  const filteredEntries = entries.filter((entry) =>
    [formatDate(entry.date), formatWasteType(entry.typeDechet), entry.heureSortie, entry.numeroPesage, entry.facture, entry.plomb, entry.vehicule, entry.transporteur, entry.destinataire, entry.siteName]
      .some((value) => normalizeText(value || "").includes(normalizeText(search))),
  );

  const clearForm = () => {
    setDate(today());
    setTypeDechet("");
    setHeureSortie(nowTime());
    setNumeroPesage("");
    setFacture("");
    setPlomb("");
    setPoids("");
    setDestinataire("");
    setVehicule("");
    setTransporteur("");
    setVehicleSuggestionsOpen(false);
    setEditingId(null);
  };

  const startEditing = (entry: DechetsEntry) => {
    setEditingId(entry.id);
    setDate(entry.date.slice(0, 10));
    setTypeDechet(entry.typeDechet || "");
    setHeureSortie(entry.heureSortie || "");
    setNumeroPesage(entry.numeroPesage || "");
    setFacture(entry.facture || "");
    setPlomb(entry.plomb || "");
    setPoids(entry.poids == null ? "" : String(entry.poids));
    setDestinataire(entry.destinataire || "");
    setVehicule(entry.vehicule || "");
    setTransporteur(entry.transporteur || "");
    setVehicleSuggestionsOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId && loadingShifts) {
      toast.error("Veuillez attendre le chargement des prises de poste.");
      return;
    }
    if (!editingId && !openShiftId) {
      toast.error(openShifts.length
        ? "Sélectionnez le poste et le service qui effectuent cette saisie."
        : "Ouvrez une prise de poste pour ce site avant d’enregistrer un flux logistique.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date,
        typeDechet,
        heureSortie,
        numeroPesage: numeroPesage.trim(),
        facture: facture.trim(),
        plomb: plomb.trim(),
        poids: Number(poids),
        destinataire: destinataire.trim(),
        vehicule: vehicule.trim(),
        transporteur: transporteur.trim(),
        siteId: site?.id,
        siteName: selectedSiteName,
        siteType: selectedSiteType,
        priseDePosteId: openShiftId,
      };
      if (editingId) {
        const { entry } = await serviceApi.updateWasteLogistics(editingId, payload);
        setRegistry((current) => ({
          ...current,
          entries: current.entries.map((item) => item.id === editingId ? { ...item, ...entry } : item),
        }));
        toast[entry.pendingSync ? "info" : "success"](entry.pendingSync
          ? "Modification enregistrée hors connexion. Elle sera synchronisée au retour du réseau."
          : "Sortie de drèche modifiée.");
      } else {
        const result = await serviceApi.createLogistics({ ...payload, type: "DECHETS" });
        if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement.");
        setRegistry((current) => current.siteId === selectedSiteId
          ? { ...current, entries: [result.entry, ...current.entries] }
          : { siteId: selectedSiteId, entries: [result.entry], error: "" });
        toast.success("Sortie de drèche enregistrée.");
      }
      clearForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (entry: DechetsEntry) => {
    if (!selectedSiteId) return;
    if (!(await confirmDeletion(`Supprimer la sortie de drèche « ${entry.numeroPesage || entry.id} » ? Cette action est définitive.`))) return;
    setDeletingId(entry.id);
    try {
      const result = await serviceApi.deleteWasteLogistics(entry.id, selectedSiteId);
      setRegistry((current) => ({ ...current, entries: current.entries.filter((item) => item.id !== entry.id) }));
      if (editingId === entry.id) clearForm();
      toast[result.pendingSync ? "info" : "success"](result.pendingSync
        ? "Suppression enregistrée hors connexion. Elle sera synchronisée au retour du réseau."
        : "Sortie supprimée du registre.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrintRegistry = () => {
    printRegistryTable("Registre des sorties de drèche et de levure", selectedSiteName, wasteHeaders, filteredEntries.map((entry) => [
      formatDate(entry.date), formatWasteType(entry.typeDechet), entry.heureSortie || "", entry.vehicule || "",
      entry.transporteur || "", entry.numeroPesage || "", entry.facture || "", entry.plomb || "",
      entry.poids == null ? "" : Number(entry.poids).toLocaleString("fr-FR"), entry.destinataire || "",
    ]));
  };

  const handleExport = () => {
    exportXlsx(
      `registre-dechets-levure-${today()}.xlsx`,
      "Drèche et levure",
      wasteHeaders,
      filteredEntries.map((entry) => [
        entry.date, formatWasteType(entry.typeDechet), entry.heureSortie || "", entry.vehicule || "",
        entry.transporteur || "", entry.numeroPesage || "", entry.facture || "", entry.plomb || "",
        entry.poids == null ? "" : String(entry.poids), entry.destinataire || "",
      ]),
    );
  };

  const handleExportWord = () => {
    downloadWordTable(
      `registre-dechets-levure-${today()}.doc`,
      "Registre des sorties de drèche et de levure",
      selectedSiteName,
      wasteHeaders,
      filteredEntries.map((entry) => [
        formatDate(entry.date), formatWasteType(entry.typeDechet), entry.heureSortie || "", entry.vehicule || "",
        entry.transporteur || "", entry.numeroPesage || "", entry.facture || "", entry.plomb || "",
        entry.poids == null ? "" : Number(entry.poids).toLocaleString("fr-FR"), entry.destinataire || "",
      ]),
    );
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    if (!selectedSiteId) {
      toast.error("Sélectionnez un site avant l’importation.");
      return;
    }
    if (loadingShifts) {
      toast.error("Attendez le chargement des prises de poste avant l’importation.");
      return;
    }
    if (!openShiftId) {
      toast.error(openShifts.length
        ? `Le site ${selectedSiteName} est sélectionné. Choisissez aussi le poste et le service actifs dans le champ « Poste et service de saisie » avant l’importation.`
        : `Le site ${selectedSiteName} est sélectionné, mais aucune prise de poste ouverte n’est disponible. Ouvrez un service avant l’importation.`);
      shiftSelectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      shiftSelectRef.current?.focus({ preventScroll: true });
      return;
    }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const columns = {
        date: ["date", "date sortie", "date de sortie"],
        type: ["designation", "type", "type de sortie", "type dechet"],
        time: ["heure", "heure sortie", "heure de sortie"],
        vehicle: ["vehicule", "vehicule sortie", "vehicule immatriculation", "immatriculation", "immatriculation vehicule", "plaque", "plaque immatriculation"],
        matricule: ["matricule", "matricule chauffeur", "matricule vehicule", "immatriculation chauffeur"],
        driverName: ["nom chauffeur", "nom du chauffeur", "chauffeur", "nom et prenom", "nom complet"],
        lastName: ["nom de famille", "last name", "surname", "nom"],
        firstName: ["prenom", "first name"],
        carrier: ["transporteur", "nom transporteur", "nom du transporteur", "societe", "entreprise"],
        weighing: ["numero pesage", "n pesage", "n° de pesage", "numero de pesage", "pesage"],
        invoice: ["facture", "numero facture", "numero de facture"],
        seal: ["plomb", "numero plomb", "numero de plomb"],
        weight: ["poids", "poids kg", "poids (kg)", "poids net"],
        recipient: ["destinataire", "destinataire client", "destinataire / client", "client"],
      };
      const matchingHeaderCount = (row: string[]) => {
        const headers = row.map((value) => normalizeHeader(String(value ?? "")));
        return Object.values(columns).filter((aliases) =>
          headers.some((header) => aliases.some((alias) => header === normalizeHeader(alias))),
        ).length;
      };
      const headerRowIndex = sheet.slice(0, 10).reduce((bestIndex, row, index, rows) =>
        matchingHeaderCount(row) > matchingHeaderCount(rows[bestIndex] || []) ? index : bestIndex,
      0);
      const headers = (sheet[headerRowIndex] || []).map((value) => normalizeHeader(String(value ?? "")));
      const column = (...aliases: string[]) => headers.findIndex((header) =>
        aliases.some((alias) => {
          const normalizedAlias = normalizeHeader(alias);
          return header === normalizedAlias || (normalizedAlias.length >= 5 && header.startsWith(normalizedAlias));
        }),
      );
      const col = Object.fromEntries(
        Object.entries(columns).map(([key, aliases]) => [key, column(...aliases)]),
      ) as Record<keyof typeof columns, number>;
      if (col.date < 0 || col.type < 0 || col.time < 0 ||
          (col.vehicle < 0 && col.matricule < 0 && col.driverName < 0 && col.lastName < 0) ||
          col.carrier < 0 ||
          col.weighing < 0 || col.weight < 0 || col.recipient < 0) {
        const detected = (sheet[headerRowIndex] || []).filter(Boolean).join(", ");
        throw new Error(`Colonnes requises manquantes : Date, Désignation, Heure, Véhicule ou Matricule, Transporteur, N° de pesage, Poids et Destinataire. En-têtes détectés : ${detected || "aucun"}.`);
      }
      const get = (cells: string[], index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
      const parseDate = (value: string) => {
        const text = value.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
          const date = new Date(`${text}T00:00:00.000Z`);
          return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : "";
        }
        const frenchDate = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(text);
        if (frenchDate) {
          const parsed = `${frenchDate[3]}-${frenchDate[2].padStart(2, "0")}-${frenchDate[1].padStart(2, "0")}`;
          const date = new Date(`${parsed}T00:00:00.000Z`);
          return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === parsed ? parsed : "";
        }
        const serial = Number(text);
        if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
          return new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10);
        }
        return "";
      };
      const parseTime = (value: string) => {
        const text = value.trim();
        const serial = Number(text);
        if (text && Number.isFinite(serial) && serial >= 0 && serial < 1) {
          const minutes = Math.round(serial * 24 * 60);
          return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
        }
        const match = /^(\d{1,2}):(\d{2})/.exec(text);
        return match && Number(match[1]) < 24 && Number(match[2]) < 60
          ? `${match[1].padStart(2, "0")}:${match[2]}`
          : "";
      };
      const parseType = (value: string): "" | "LEVURE" | "DRECHE" => {
        const normalized = normalizeHeader(value);
        if (["levure", "levures"].includes(normalized)) return "LEVURE";
        if (["dreche", "dreches", "drêche", "drêches"].map(normalizeHeader).includes(normalized)) return "DRECHE";
        return "";
      };
      const parseWeight = (value: string) => {
        const text = value.trim().replace(/\s/g, "");
        const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
        return Number(normalized);
      };
      const rows = sheet.slice(headerRowIndex + 1).map((cells, index) => {
        const rawVehicle = get(cells, col.vehicle);
        const rawMatricule = get(cells, col.matricule);
        const rawDriverName = [
          get(cells, col.lastName),
          get(cells, col.firstName),
        ].filter(Boolean).join(" ") || get(cells, col.driverName);
        const rawType = get(cells, col.type);
        const rawWeight = get(cells, col.weight);
        return {
          line: index + 2,
          date: parseDate(get(cells, col.date)),
          typeDechet: parseType(rawType),
          heureSortie: parseTime(get(cells, col.time)),
          vehicule: rawVehicle || rawMatricule || rawDriverName,
          transporteur: get(cells, col.carrier),
          numeroPesage: get(cells, col.weighing),
          facture: get(cells, col.invoice),
          plomb: get(cells, col.seal),
          poids: parseWeight(rawWeight),
          destinataire: get(cells, col.recipient),
        };
      }).filter((_, index) => sheet[headerRowIndex + index + 1]?.some((value) => String(value ?? "").trim()));
      if (!rows.length) throw new Error("Le fichier ne contient aucune ligne à importer.");

      let saved = 0;
      let queued = 0;
      const failures: string[] = [];
      const importedEntries: DechetsEntry[] = [];
      for (const row of rows) {
        if (!row.date || !row.typeDechet || !row.heureSortie || !row.vehicule.trim() ||
            !row.transporteur.trim() || !row.numeroPesage || !Number.isFinite(row.poids) || row.poids <= 0 ||
            !row.destinataire.trim()) {
          failures.push(`Ligne ${row.line} : vérifiez la date, la désignation, l’heure, le véhicule/matricule, le transporteur, le pesage, le poids et le destinataire.`);
          continue;
        }
        try {
          const result = await serviceApi.createLogistics({
            date: row.date,
            type: "DECHETS",
            typeDechet: row.typeDechet,
            heureSortie: row.heureSortie,
            numeroPesage: row.numeroPesage,
            facture: row.facture,
            plomb: row.plomb,
            poids: row.poids,
            destinataire: row.destinataire,
            vehicule: row.vehicule.trim(),
            transporteur: row.transporteur,
            siteId: selectedSiteId,
            siteName: selectedSiteName,
            siteType: selectedSiteType,
            priseDePosteId: openShiftId,
          });
          if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement.");
          importedEntries.push(result.entry);
          saved += 1;
          if (result.entry.pendingSync) queued += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : "enregistrement impossible";
          failures.push(`Ligne ${row.line} : ${message}`);
          if (error instanceof Error && "status" in error && error.status === 409) {
            setOpenShiftId(null);
            setShiftError(message);
            break;
          }
        }
      }
      if (importedEntries.length) {
        setRegistry((current) => ({
          siteId: selectedSiteId,
          entries: [
            ...importedEntries,
            ...(current.siteId === selectedSiteId
              ? current.entries.filter((entry) => !importedEntries.some((imported) => imported.id === entry.id))
              : []),
          ],
          error: "",
        }));
      }
      try {
        const updatedEntries = (await serviceApi.listLogistics(selectedSiteId)).filter((entry) => entry.type === "DECHETS");
        setRegistry({ siteId: selectedSiteId, entries: updatedEntries, error: "" });
      } catch (error) {
        toast.error(`Import terminé, mais le registre n’a pas pu être actualisé : ${error instanceof Error ? error.message : "erreur inconnue"}`);
      }
      if (saved) toast.success(`${saved} sortie(s) importée(s)${queued ? ` (${queued} en attente de synchronisation)` : ""}.`);
      if (failures.length) {
        const details = failures.slice(0, 2).join(" ");
        toast.error(`${failures.length} ligne(s) non importée(s)${saved ? "" : " :"} ${details}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };

  const printEntry = (entry: DechetsEntry) => {
    const rows = [
      ["Date", formatDate(entry.date)],
      ["Type", formatWasteType(entry.typeDechet)],
      ["Heure de sortie", entry.heureSortie || "—"],
      ["Véhicule", entry.vehicule || "—"],
      ["Transporteur", entry.transporteur || "—"],
      ["N° de pesage", entry.numeroPesage || "—"],
      ["Facture", entry.facture || "—"],
      ["Plomb", entry.plomb || "—"],
      ["Poids", entry.poids == null ? "—" : `${Number(entry.poids).toLocaleString("fr-FR")} kg`],
      ["Destinataire / client", entry.destinataire || "—"],
    ] as const;
    printRecord("Sortie de drèche", entry.siteName || selectedSiteName, rows);
  };

  return (
    <div className="waste-module space-y-5">
      <PageHeader
        title="Drèche et levure"
        subtitle="Enregistrement des sorties de drèche et de levure avec les informations de pesage"
      />
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      <section className="waste-entry-card w-full overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="waste-entry-heading flex items-center gap-3 border-b px-5 py-4">
          <div className="waste-entry-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{editingId ? "Modifier une sortie" : "Nouvelle sortie de drèche ou de levure"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Saisissez les informations sur une ligne, puis enregistrez la sortie.</p>
          </div>
        </div>
        <form className="space-y-4 p-4 sm:p-6" onSubmit={(event) => void submit(event)}>
          <div className="max-w-2xl">
            <SitePicker
              id="dechets-site"
              value={selectedSiteName}
              type={selectedSiteType}
              sites={sites}
              canCreate={canCreateSite}
              onAdd={addSite}
              onChange={(name, type) => {
                setSiteName(name);
                setSiteType(type);
                setVehicule("");
              }}
            />
          </div>
          {selectedSiteId && loadingShifts && <p className="text-sm text-muted-foreground">Vérification des prises de poste ouvertes…</p>}
          {shiftError && <p role="alert" className="text-sm text-destructive">{shiftError}</p>}
          {selectedSiteId && !loadingShifts && openShifts.length > 0 && (
            <div className="max-w-xl space-y-1.5">
              <Label htmlFor="dechets-shift">Poste et service de saisie *</Label>
              <select
                id="dechets-shift"
                ref={shiftSelectRef}
                required={!editingId}
                value={openShiftId || ""}
                onChange={(event) => {
                  const id = event.target.value || null;
                  setOpenShiftId(id);
                  const selected = openShifts.find((shift) => shift.id === id);
                  const storageKey = `securitec-logistics-shift:${selectedSiteId}:${selected?.posteId || "site"}`;
                  if (id) {
                    localStorage.setItem(storageKey, id);
                    localStorage.setItem(`securitec-logistics-shift:${selectedSiteId}`, id);
                    if (selected?.posteId) {
                      localStorage.setItem(`securitec-active-post:${selectedSiteId}`, selected.posteId);
                      localStorage.setItem(`securitec-active-shift:${selectedSiteId}:${selected.posteId}`, id);
                    }
                  } else {
                    localStorage.removeItem(storageKey);
                  }
                }}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Sélectionner le poste actif…</option>
                {openShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {shift.posteNom || "Poste non renseigné"} · {shift.shiftType === "NUIT" ? "Nuit" : shift.shiftType === "JOUR" ? "Jour" : "Service"} · {shift.nom || ""} {shift.prenom || ""}
                  </option>
                ))}
              </select>
            </div>
          )}
          {selectedSiteId && !loadingShifts && !openShifts.length && !openShiftId && (
            <p className="text-sm text-amber-700">
              Aucune prise de poste ouverte sur ce site.{" "}
              <Link to="/dashboard/prise-de-poste" state={{ siteId: selectedSiteId }} className="font-medium underline">
                Ouvrir un service
              </Link>{" "}
              avant d’enregistrer ou d’importer les lignes.
            </p>
          )}
          <div className="overflow-x-auto pb-2">
            <div className="grid min-w-[1640px] grid-cols-[135px_130px_115px_190px_180px_145px_145px_120px_120px_190px_auto] items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dechets-date">Date sortie *</Label>
                <Input id="dechets-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-type">Désignation *</Label>
                <select
                  id="dechets-type"
                  required
                  value={typeDechet}
                  onChange={(event) => setTypeDechet(event.target.value as "" | "LEVURE" | "DRECHE")}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sélectionner</option>
                  <option value="LEVURE">Levure</option>
                  <option value="DRECHE">Drèche</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-time">Heure sortie *</Label>
                <Input id="dechets-time" type="time" required value={heureSortie} onChange={(event) => setHeureSortie(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-vehicule">Véhicule / matricule *</Label>
                <Popover open={vehicleSuggestionsOpen && matchingVehicles.length > 0} onOpenChange={setVehicleSuggestionsOpen}>
                  <PopoverAnchor asChild>
                    <Input
                      id="dechets-vehicule"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-expanded={vehicleSuggestionsOpen && matchingVehicles.length > 0}
                      aria-controls="dechets-vehicle-suggestions"
                      aria-activedescendant={matchingVehicles[activeVehicleSuggestion] ? `dechets-vehicle-option-${activeVehicleSuggestion}` : undefined}
                      required
                      maxLength={160}
                      autoComplete="off"
                      placeholder={chauffeurVehiclesLoading ? "Chargement des suggestions…" : "Véhicule ou matricule"}
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
                    id="dechets-vehicle-suggestions"
                    align="start"
                    className="w-[var(--radix-popover-trigger-width)] p-1"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                  >
                    <ul role="listbox" aria-label="Véhicules enregistrés" className="max-h-52 overflow-y-auto">
                      {matchingVehicles.map((driver, index) => (
                        <li key={`${driver.id}-${driver.vehicule}`} role="presentation">
                          <button
                            id={`dechets-vehicle-option-${index}`}
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
                            {driver.vehicule?.trim()} · {driver.nomPrenom}
                            {driver.matricule ? <span className="ml-2 text-muted-foreground">— {driver.matricule}</span> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-transporteur">Transporteur *</Label>
                <Input id="dechets-transporteur" required maxLength={255} autoComplete="organization" placeholder="Transporteur" value={transporteur} onChange={(event) => setTransporteur(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-pesage">N° de pesage *</Label>
                <Input id="dechets-pesage" required maxLength={100} value={numeroPesage} onChange={(event) => setNumeroPesage(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-facture">Facture</Label>
                <Input id="dechets-facture" maxLength={160} placeholder="Facultatif" value={facture} onChange={(event) => setFacture(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-plomb">Plomb</Label>
                <Input id="dechets-plomb" maxLength={100} placeholder="Facultatif" value={plomb} onChange={(event) => setPlomb(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-poids">Poids (kg) *</Label>
                <Input id="dechets-poids" type="number" min="0.01" step="0.01" required value={poids} onChange={(event) => setPoids(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dechets-destinataire">Destinataire / client *</Label>
                <Input id="dechets-destinataire" required maxLength={255} value={destinataire} onChange={(event) => setDestinataire(event.target.value)} />
              </div>
              <div className="flex gap-2">
                {editingId && <Button type="button" variant="outline" disabled={saving} onClick={clearForm}>Annuler</Button>}
                <Button type="submit" disabled={saving || !selectedSiteName.trim()}>
                  {saving ? "Enregistrement…" : editingId ? "Modifier" : "Enregistrer"}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Le véhicule/matricule et le transporteur se saisissent indépendamment. Les véhicules enregistrés sont proposés en suggestion, mais la saisie manuelle reste possible.
          </p>
        </form>
      </section>
      <section id="waste-registry-print-area" className="waste-registry-section">
        <Panel title="Registre des sorties de drèche et de levure">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 waste-registry-screen">
          <p className="text-sm text-muted-foreground">Historique des sorties pour le site sélectionné.</p>
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <label className={`inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md border px-3 text-center text-sm font-medium ${!selectedSiteId || importing ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
              <FileUp className="mr-2 h-4 w-4" /> {importing ? "Importation…" : "Importer Excel / CSV"}
              <input
                className="sr-only"
                type="file"
                accept=".xlsx,.csv,text/csv"
                disabled={!selectedSiteId || importing}
                onChange={(event) => { void handleImport(event.target.files?.[0]); event.currentTarget.value = ""; }}
              />
            </label>
            <Button className="w-full" type="button" variant="outline" onClick={() => exportXlsx("modele-registre-dechets-levure.xlsx", "Drèche et levure", wasteHeaders, [])}>
              <FileDown className="mr-2 h-4 w-4" /> Modèle Excel
            </Button>
            <Button className="w-full" type="button" variant="outline" disabled={!filteredEntries.length} onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" /> Exporter Excel
            </Button>
            <Button className="w-full" type="button" variant="outline" disabled={!filteredEntries.length} onClick={handleExportWord}>
              <FileDown className="mr-2 h-4 w-4" /> Télécharger Word
            </Button>
            <Button type="button" variant="outline" className="waste-print-button w-full" disabled={!filteredEntries.length} onClick={handlePrintRegistry}>
              <Printer className="mr-2 h-4 w-4" /> Imprimer les lignes (Word)
            </Button>
          </div>
        </div>
        {entriesError && <p className="waste-registry-screen mb-3 text-sm text-destructive">{entriesError}</p>}
        <div className="relative mb-4 waste-registry-screen">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Rechercher dans le registre des sorties de drèche et de levure"
              placeholder="Rechercher véhicule, transporteur, pesage, facture…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-full min-h-11 pl-9"
            />
        </div>
        {!site?.id ? (
          <p className="waste-registry-screen rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Sélectionnez un site pour afficher le registre.
          </p>
        ) : loadingEntries ? (
          <p className="waste-registry-screen py-8 text-center text-sm text-muted-foreground">Chargement du registre…</p>
        ) : entries.length === 0 ? (
          <p className="waste-registry-screen rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
            Aucune sortie de drèche ou de levure enregistrée pour ce site.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border waste-registry-screen">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="waste-table-head sticky top-0 z-10 bg-muted/95 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-3 py-3">Désignation</th>
                    <th className="px-3 py-3">Heure de sortie</th>
                    <th className="px-3 py-3">Véhicule</th>
                    <th className="px-3 py-3">Transporteur</th>
                    <th className="px-3 py-3">N° pesage</th>
                    <th className="px-3 py-3">Facture</th>
                    <th className="px-3 py-3">Plomb</th>
                    <th className="px-3 py-3 text-right">Poids (kg)</th>
                    <th className="px-4 py-3">Destinataire / client</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className={`waste-table-row transition-colors ${entry.typeDechet === "LEVURE" ? "waste-table-row--levure" : "waste-table-row--dreche"}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium">{formatDate(entry.date)}</td>
                      <td className="px-3 py-3"><span className={`waste-type-badge ${entry.typeDechet === "LEVURE" ? "waste-type-badge--levure" : "waste-type-badge--dreche"}`}>{formatWasteType(entry.typeDechet)}</span></td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{entry.heureSortie || "—"}</td>
                      <td className="px-3 py-3 font-medium">{entry.vehicule || "—"}</td>
                      <td className="px-3 py-3">{entry.transporteur || "—"}</td>
                      <td className="px-3 py-3 font-mono text-xs">{entry.numeroPesage || "—"}</td>
                      <td className="px-3 py-3">{entry.facture || "—"}</td>
                      <td className="px-3 py-3">{entry.plomb || "—"}</td>
                      <td className="px-3 py-3 text-right font-mono">{entry.poids == null ? "—" : Number(entry.poids).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-3">{entry.destinataire || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button type="button" size="icon" variant="ghost" className="waste-row-action" aria-label="Imprimer le bon de sortie" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button type="button" size="icon" variant="ghost" className="waste-row-action" aria-label="Modifier la sortie" title="Modifier" onClick={() => startEditing(entry)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            aria-label="Supprimer la sortie"
                            title="Supprimer"
                            disabled={deletingId !== null}
                            onClick={() => void deleteEntry(entry)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEntries.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Aucun résultat pour cette recherche.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Panel>
      </section>
    </div>
  );
}
