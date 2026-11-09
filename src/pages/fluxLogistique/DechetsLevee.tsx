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
import { ClipboardList, Download, FileDown, FileUp, Pencil, Printer, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
const normalizeIdentity = (value: string) => normalizeHeader(value);
const normalizePersonName = (value: string) =>
  normalizeText(value).replace(/[^a-z0-9 ]/g, "").split(" ").filter(Boolean).sort().join(" ");
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
})[character] || character);

function printTable(title: string, siteName: string, headers: string[], rows: string[][]) {
  const printWindow = window.open("", "_blank", "width=1100,height=800");
  if (!printWindow) {
    toast.error("Autorisez les fenêtres contextuelles pour imprimer.");
    return;
  }
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows.map((row) => `<tr>${headers.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`).join("");
  printWindow.document.open();
  printWindow.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      body { color: #172033; font: 10pt Arial, sans-serif; }
      h1 { margin: 0 0 6px; font-size: 18pt; }
      p { margin: 0 0 16px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #777; padding: 6px; text-align: left; vertical-align: top; }
      th { background: #eee; }
      tr { break-inside: avoid; }
    </style></head><body><h1>${escapeHtml(title)}</h1>
    <p>Site : ${escapeHtml(siteName || "—")} · Imprimé le ${escapeHtml(new Date().toLocaleString("fr-FR"))}</p>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
    </body></html>`);
  printWindow.document.close();
}

function exportWordTable(filename: string, title: string, siteName: string, headers: string[], rows: string[][]) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("");
  const body = rows.map((row) => `<tr>${headers.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`).join("");
  const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="fr">
    <head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>@page Section1 { size: 841.9pt 595.3pt; margin: 28.35pt; mso-page-orientation: landscape; }
        div.Section1 { page: Section1; } body { font: 10pt Arial, sans-serif; } table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #777; padding: 5px; text-align: left; vertical-align: top; } th { background: #eee; }</style>
    </head><body><div class="Section1"><h1>${escapeHtml(title)}</h1><p>Site : ${escapeHtml(siteName || "—")}</p>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: "application/msword" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
  const findDriver = (reference: string) => {
    const identity = normalizeIdentity(reference);
    const name = normalizePersonName(reference);
    if (!identity) return undefined;
    return registeredChauffeurs.find((driver) =>
      normalizeIdentity(driver.vehicule || "") === identity ||
      normalizeIdentity(driver.matricule || "") === identity ||
      normalizePersonName(driver.nomPrenom) === name,
    );
  };
  const selectedDriver = findDriver(vehicule);
  const selectedVehicleIsRegistered = Boolean(selectedDriver?.vehicule?.trim());
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
  const chauffeursError = chauffeurRegistry.siteId === selectedSiteId ? chauffeurRegistry.error : "";
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
    if (chauffeurVehiclesLoading) {
      toast.error("Veuillez attendre le chargement des véhicules des chauffeurs.");
      return;
    }
    if (chauffeursError) {
      toast.error("Impossible de vérifier les véhicules enregistrés. Réessayez après le chargement du module Chauffeurs.");
      return;
    }
    if (!selectedVehicleIsRegistered) {
      toast.error("Ce véhicule n’est pas enregistré dans le module Chauffeurs pour ce site.");
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
        vehicule: selectedDriver?.vehicule?.trim() || vehicule.trim(),
        transporteur: transporteur.trim(),
        siteId: site?.id,
        siteName: selectedSiteName,
        siteType: selectedSiteType,
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
    printTable("Registre des sorties de drèche et de levure", selectedSiteName, wasteHeaders, filteredEntries.map((entry) => [
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
    exportWordTable(
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
    if (chauffeurVehiclesLoading) {
      toast.error("Attendez le chargement des véhicules des chauffeurs avant l’importation.");
      return;
    }
    if (chauffeursError) {
      toast.error("Impossible de charger les chauffeurs du site. Réessayez avant l’importation.");
      return;
    }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const headers = (sheet[0] || []).map((value) => normalizeHeader(String(value ?? "")));
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias)));
      const col = {
        date: column("date", "date sortie", "date de sortie"),
        type: column("designation", "désignation", "type", "type de sortie", "type dechet"),
        time: column("heure", "heure sortie", "heure de sortie"),
        vehicle: column("vehicule", "vehicule sortie", "vehicule immatriculation", "immatriculation", "immatriculation vehicule", "plaque", "plaque immatriculation"),
        matricule: column("matricule", "matricule chauffeur", "matricule vehicule", "immatriculation chauffeur"),
        driverName: column("nom chauffeur", "nom du chauffeur", "chauffeur", "nom et prenom", "nom complet"),
        lastName: column("nom de famille", "last name", "surname", "nom"),
        firstName: column("prenom", "prénom", "first name"),
        carrier: column("transporteur", "nom transporteur", "nom du transporteur", "societe", "entreprise"),
        weighing: column("numero pesage", "n pesage", "n° de pesage", "numero de pesage", "pesage"),
        invoice: column("facture", "numero facture", "numero de facture"),
        seal: column("plomb", "numero plomb", "numero de plomb"),
        weight: column("poids", "poids kg", "poids (kg)"),
        recipient: column("destinataire", "destinataire client", "destinataire / client", "client"),
      };
      if (col.date < 0 || col.type < 0 || col.time < 0 ||
          (col.vehicle < 0 && col.matricule < 0 && col.driverName < 0 && col.lastName < 0) ||
          col.carrier < 0 && col.driverName < 0 && col.lastName < 0 ||
          col.weighing < 0 || col.weight < 0 || col.recipient < 0) {
        throw new Error("Colonnes requises manquantes : Date, Désignation, Heure, Véhicule ou Matricule/Nom chauffeur, Transporteur (ou Nom), N° de pesage, Poids et Destinataire.");
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
      const rows = sheet.slice(1).map((cells, index) => {
        const rawVehicle = get(cells, col.vehicle);
        const rawMatricule = get(cells, col.matricule);
        const rawDriverName = [
          get(cells, col.lastName),
          get(cells, col.firstName),
        ].filter(Boolean).join(" ") || get(cells, col.driverName);
        const driver = [rawMatricule, rawDriverName, rawVehicle].map(findDriver).find(Boolean);
        const rawType = get(cells, col.type);
        const rawWeight = get(cells, col.weight);
        return {
          line: index + 2,
          date: parseDate(get(cells, col.date)),
          typeDechet: parseType(rawType),
          heureSortie: parseTime(get(cells, col.time)),
          vehicule: driver?.vehicule?.trim() || rawVehicle || rawMatricule,
          transporteur: get(cells, col.carrier) || driver?.provider?.trim() || rawDriverName,
          numeroPesage: get(cells, col.weighing),
          facture: get(cells, col.invoice),
          plomb: get(cells, col.seal),
          poids: parseWeight(rawWeight),
          destinataire: get(cells, col.recipient),
        };
      }).filter((row) => sheet[row.line - 1]?.some((value) => String(value ?? "").trim()));
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
        const matchingDriver = findDriver(row.vehicule);
        if (!matchingDriver?.vehicule?.trim()) {
          failures.push(`Ligne ${row.line} : véhicule, matricule ou nom chauffeur non reconnu pour ce site.`);
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
            vehicule: matchingDriver.vehicule.trim(),
            transporteur: row.transporteur,
            siteId: selectedSiteId,
            siteName: selectedSiteName,
            siteType: selectedSiteType,
          });
          if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement.");
          importedEntries.push(result.entry);
          saved += 1;
          if (result.entry.pendingSync) queued += 1;
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
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
                      placeholder={chauffeurVehiclesLoading ? "Chargement…" : "Véhicule, matricule ou nom"}
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
                <Button type="submit" disabled={saving || !selectedSiteName.trim() || chauffeurVehiclesLoading || Boolean(chauffeursError) || !selectedVehicleIsRegistered}>
                  {saving ? "Enregistrement…" : editingId ? "Modifier" : "Enregistrer"}
                </Button>
              </div>
            </div>
          </div>
          {chauffeursError
            ? <p role="alert" className="text-xs text-destructive">{chauffeursError}</p>
            : !chauffeurVehiclesLoading && vehicule.trim() && !selectedVehicleIsRegistered
              ? <p role="alert" className="text-xs text-destructive">Véhicule, matricule ou nom chauffeur non reconnu pour ce site.</p>
              : !chauffeurVehiclesLoading && !registeredChauffeurs.some((driver) => driver.vehicule?.trim())
                ? <p className="text-xs text-muted-foreground">Aucun véhicule n’est enregistré dans le module Chauffeurs pour ce site.</p>
                : null}
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
