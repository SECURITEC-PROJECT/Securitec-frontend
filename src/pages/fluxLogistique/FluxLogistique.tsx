import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { printRecord } from "@/lib/printRecord";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, FileDown, FilePlus2, FileUp, MapPin, Pencil, Printer, RefreshCw, Search, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { exportXlsx } from "@/lib/export-xlsx";
import { readXlsxRows } from "@/lib/read-xlsx";

type TruckForm = {
  date: string;
  immatriculationVehicule: string;
  heureSortie: string;
  transporteur: string;
  designation: string;
  nbr: string;
  facture: string;
  plomb: string;
  destinataire: string;
  typeDocument: string;
  emetteur: string;
  verification: string;
  visaAgent: string;
};

type TruckEntry = TruckForm & {
  id: string;
  type: "DECHARGEMENT" | "ORDURES";
  siteName?: string;
  createdAt?: string;
  createdBy?: string;
  attachmentCount?: number;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
};

const wasteDesignations = ["Verres cassées", "Ordures", "Gravat"] as const;
const documentHeaders = [
  "Date", "Immatriculation", "Heure de sortie", "Désignation", "Nombre",
  "Numéro Bon / Facture", "Destination", "Type de document", "Émetteur", "Vérification", "Visa agent",
];
const wasteHeaders = ["Date", "Véhicule", "Transporteur", "Désignation", "Nombre", "Facture", "Destination", "Plomb"];

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const nowTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
const emptyTruck = (): TruckForm => ({
  date: today(),
  immatriculationVehicule: "",
  heureSortie: nowTime(),
  transporteur: "",
  designation: "",
  nbr: "",
  facture: "",
  plomb: "",
  destinataire: "",
  typeDocument: "BON",
  emetteur: "",
  verification: "",
  visaAgent: "",
});

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] || character);

function LogisticsAttachments({ entryId, count, siteId }: { entryId: string; count: number; siteId: string }) {
  const [attachments, setAttachments] = useState<{ id: string; name: string; createdAt: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      setAttachments(await serviceApi.listLogisticsAttachments(entryId, siteId));
      setLoaded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement des pièces jointes impossible.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <details className="relative" onToggle={(event) => { if (event.currentTarget.open) void load(); }}>
      <summary className="cursor-pointer list-none whitespace-nowrap text-sm underline-offset-4 hover:underline">
        Pièces jointes ({count})
      </summary>
      <div className="absolute right-0 z-20 mt-2 max-h-64 min-w-64 overflow-auto rounded-md border bg-background p-3 shadow-lg">
        {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!loading && loaded && attachments.length === 0 && <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>}
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <button type="button" className="text-left text-sm text-primary underline" onClick={async () => {
                try {
                  const file = await serviceApi.downloadDocument(attachment.id);
                  const url = URL.createObjectURL(file.blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = file.name;
                  link.click();
                  URL.revokeObjectURL(url);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Téléchargement impossible.");
                }
              }}>{attachment.name}</button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

function LogisticsAudit({ entryId, siteId }: { entryId: string; siteId: string }) {
  const [history, setHistory] = useState<{ id: string; action: string; createdAt: string; createdBy: string | null }[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      setHistory(await serviceApi.listLogisticsAudit(entryId, siteId));
      setLoaded(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Chargement de l’historique impossible.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <details className="relative" onToggle={(event) => { if (event.currentTarget.open) void load(); }}>
      <summary className="cursor-pointer list-none whitespace-nowrap text-sm underline-offset-4 hover:underline">Historique</summary>
      <div className="absolute right-0 z-20 mt-2 max-h-64 min-w-72 overflow-auto rounded-md border bg-background p-3 shadow-lg">
        {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!loading && loaded && history.length === 0 && <p className="text-sm text-muted-foreground">Aucune correction enregistrée.</p>}
        <ul className="space-y-2">
          {history.map((item) => <li key={item.id} className="text-sm">
            <strong>{item.action === "ANNULATION" ? "Annulation" : "Modification"}</strong>
            <span className="block text-muted-foreground">{item.createdBy || "Utilisateur"} · {new Date(item.createdAt).toLocaleString("fr-FR")}</span>
          </li>)}
        </ul>
      </div>
    </details>
  );
}

export default function FluxLogistique({ kind = "bon-facture" }: { kind?: "bon-facture" | "ordures" }) {
  const isWasteRegister = kind === "ordures";
  const entryType: TruckEntry["type"] = isWasteRegister ? "ORDURES" : "DECHARGEMENT";
  const pageTitle = isWasteRegister ? "Registre des ordures" : "Enregistrements Bon / facture / Bon de sortie";
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [entries, setEntries] = useState<TruckEntry[]>([]);
  const [truckForm, setTruckForm] = useState<TruckForm>(emptyTruck);
  const [editingTruck, setEditingTruck] = useState<TruckEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [syncStatusFilter, setSyncStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);
  const [openShifts, setOpenShifts] = useState<any[]>([]);
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = sites.find((item) => item.name === selectedSiteName);
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return entries.filter((entry) => {
      const date = String(entry.date || "").slice(0, 10);
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      if (carrierFilter && entry.transporteur !== carrierFilter) return false;
      if (syncStatusFilter === "pending" && !entry.pendingSync) return false;
      if (syncStatusFilter === "synced" && entry.pendingSync) return false;
      if (!query) return true;
      return [
      entry.date,
      entry.immatriculationVehicule,
      entry.transporteur,
      entry.plomb,
      isWasteRegister ? "" : entry.heureSortie,
      entry.designation,
      entry.nbr,
      entry.facture,
      entry.destinataire,
      entry.typeDocument,
      entry.emetteur,
      entry.verification,
      entry.visaAgent,
      entry.siteName,
      entry.createdBy,
    ].some((value) => String(value || "").toLocaleLowerCase().includes(query));
    });
  }, [entries, search, isWasteRegister, fromDate, toDate, carrierFilter, syncStatusFilter]);
  const carrierOptions = useMemo(() =>
    Array.from(new Set(entries.map((entry) => String(entry.transporteur ?? "").trim()).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right, "fr")),
  [entries]);
  const pageCount = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageEntries = filteredEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const reloadEntries = useCallback(async () => {
    if (!site?.id) return;
    const rows = await serviceApi.listLogistics(site.id);
    setEntries(rows.filter((entry: TruckEntry) => entry.type === entryType));
  }, [site?.id, entryType]);

  useEffect(() => {
    if (!site?.id) return;
    const selectedPostId = localStorage.getItem(`securitec-active-post:${site.id}`);
    const storageKey = `securitec-logistics-shift:${site.id}:${selectedPostId || "site"}`;
    if (!navigator.onLine) {
      setOpenShifts([]);
      setOpenShiftId(localStorage.getItem(storageKey) || (!selectedPostId ? localStorage.getItem(`securitec-logistics-shift:${site.id}`) : null));
      return;
    }
    let active = true;
    serviceApi.listShifts(site.id).then((shifts) => {
      const grouped = new Map<string, any[]>();
      shifts.filter((item: any) => !item.ended_at && (item.siteId === site.id || String(item.site_de_travail || "").trim().toLocaleLowerCase() === selectedSiteName.trim().toLocaleLowerCase()))
        .forEach((item: any) => {
          const id = String(item.serviceId || item.id);
          grouped.set(id, [...(grouped.get(id) || []), item]);
        });
      const candidates = Array.from(grouped.entries()).map(([serviceId, members]) => {
        const leader = members.find((item) => item.fonctionService === "CHEF") || members[0];
        return { ...leader, id: serviceId, serviceId };
      }).sort((left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime());
      if (!active) return;
      setOpenShifts(candidates);
      const relevantCandidates = selectedPostId ? candidates.filter((shift) => shift.posteId === selectedPostId) : candidates;
      const cached = localStorage.getItem(storageKey) || (!selectedPostId ? localStorage.getItem(`securitec-logistics-shift:${site.id}`) || localStorage.getItem(`securitec-active-shift:${site.id}`) : null);
      const id = relevantCandidates.some((shift) => shift.id === cached) ? cached : relevantCandidates.length === 1 ? relevantCandidates[0].id : null;
      setOpenShiftId(id);
      if (id) {
        localStorage.setItem(storageKey, id);
        const selected = relevantCandidates.find((shift) => shift.id === id);
        if (selected?.posteId) {
          localStorage.setItem(`securitec-active-post:${site.id}`, selected.posteId);
          localStorage.setItem(`securitec-active-shift:${site.id}:${selected.posteId}`, id);
        }
      }
      else {
        localStorage.removeItem(storageKey);
      }
    }).catch(() => {
      if (active) {
        setOpenShifts([]);
        setOpenShiftId(localStorage.getItem(storageKey) || (!selectedPostId ? localStorage.getItem(`securitec-logistics-shift:${site.id}`) || localStorage.getItem(`securitec-active-shift:${site.id}`) : null));
      }
    });
    return () => { active = false; };
  }, [site?.id, selectedSiteName, isOnline]);

  useEffect(() => {
    if (!site?.id) return;
    let active = true;
    reloadEntries().catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : `Chargement du registre ${isWasteRegister ? "des ordures" : "bon/facture"} impossible.`);
      });
    return () => { active = false; };
  }, [reloadEntries, isWasteRegister]);

  useEffect(() => {
    const updateConnectivity = () => setIsOnline(navigator.onLine);
    const syncWhenOnline = () => {
      updateConnectivity();
      if (!navigator.onLine || !site?.id) return;
      setSyncing(true);
      serviceApi.syncPendingLogistics(site.id)
        .then(async ({ synced, pending }) => {
          await reloadEntries();
          if (synced) toast.success(`${synced} saisie${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""}.`);
          if (pending) toast.warning(`${pending} saisie${pending > 1 ? "s" : ""} reste${pending > 1 ? "nt" : ""} en attente.`);
        })
        .catch(() => {})
        .finally(() => setSyncing(false));
    };
    window.addEventListener("online", syncWhenOnline);
    window.addEventListener("offline", updateConnectivity);
    return () => {
      window.removeEventListener("online", syncWhenOnline);
      window.removeEventListener("offline", updateConnectivity);
    };
  }, [site?.id, reloadEntries]);

  const saveTruck = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!site?.id) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    setSaving(true);
    try {
      if (!openShiftId) {
        toast.error("Ouvrez une prise de poste pour ce site avant d’enregistrer le flux.");
        return;
      }
      const payload = { ...truckForm, type: entryType, siteId: site.id, siteName: selectedSiteName, siteType: site.type, priseDePosteId: openShiftId };
      let savedEntry: TruckEntry | undefined;
      let attachmentErrors: string[] = [];
      if (editingTruck) {
        const { entry } = await serviceApi.updateTruckLogistics(editingTruck.id, entryType, payload, attachmentFiles);
        savedEntry = { ...editingTruck, ...entry, siteName: selectedSiteName };
        for (const file of entry.pendingSync ? [] : attachmentFiles) {
          try {
            await serviceApi.addLogisticsAttachment(editingTruck.id, site.id, file);
            savedEntry!.attachmentCount = (savedEntry!.attachmentCount || 0) + 1;
          } catch (error) {
            attachmentErrors.push(error instanceof Error ? error.message : `Impossible d’ajouter ${file.name}.`);
          }
        }
        setEntries((current) => current.map((row) => row.id === editingTruck.id ? savedEntry! : row));
      } else {
        const result = await serviceApi.createLogistics(payload, attachmentFiles);
        if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement sauvegardé.");
        savedEntry = result.entry as TruckEntry;
        if (!savedEntry.pendingSync) savedEntry.attachmentCount = attachmentFiles.length;
        attachmentErrors = result.attachmentErrors || [];
        setEntries((current) => [savedEntry!, ...current]);
        if (!savedEntry.pendingSync) void reloadEntries();
      }
      setTruckForm(emptyTruck());
      setEditingTruck(null);
      setAttachmentFiles([]);
      setFormOpen(false);
      setPage(1);
      if (attachmentErrors.length) toast.warning(`Enregistrement sauvegardé, mais ${attachmentErrors.length} pièce(s) jointe(s) n’ont pas été ajoutées.`);
      if (savedEntry?.pendingSync) toast.info("Saisie enregistrée hors connexion. Elle sera synchronisée au retour du réseau.");
      else toast.success(editingTruck
          ? `Enregistrement ${isWasteRegister ? "d’ordures" : "bon/facture"} modifié.`
          : `Enregistrement ${isWasteRegister ? "d’ordures" : "bon/facture"} ajouté.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const editTruck = (entry: TruckEntry) => {
    setEditingTruck(entry);
    setTruckForm({
      date: String(entry.date).slice(0, 10),
      immatriculationVehicule: entry.immatriculationVehicule || "",
      heureSortie: entry.heureSortie || "",
      transporteur: entry.transporteur || "",
      designation: entry.designation || "",
      nbr: entry.nbr || "",
      facture: entry.facture || "",
      plomb: entry.plomb || "",
      destinataire: entry.destinataire || "",
      typeDocument: entry.typeDocument || "BON",
      emetteur: entry.emetteur || "",
      verification: entry.verification || "",
      visaAgent: entry.visaAgent || "",
    });
    setFormOpen(true);
  };

  const deleteTruck = async (entry: TruckEntry) => {
    if (!site?.id) return;
    if (entry.pendingSync) {
      toast.info("Cette saisie sera envoyée avant de pouvoir être annulée.");
      return;
    }
    if (!(await confirmDeletion(`Annuler l’enregistrement du véhicule « ${entry.immatriculationVehicule} » ? L’action restera visible dans l’historique.`))) return;
    try {
      const result = await serviceApi.deleteTruckLogistics(entry.id, entryType, site.id);
      setEntries((current) => current.filter((row) => row.id !== entry.id));
      setPage(1);
      if (editingTruck?.id === entry.id) {
        setEditingTruck(null);
        setTruckForm(emptyTruck());
      }
      toast[result.pendingSync ? "info" : "success"](result.pendingSync
        ? "Annulation enregistrée hors connexion. Elle sera synchronisée au retour du réseau."
        : `Enregistrement ${isWasteRegister ? "d’ordures" : "bon/facture"} annulé.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    }
  };

  const synchronize = async () => {
    if (!site?.id || !isOnline || syncing) return;
    setSyncing(true);
    try {
      const { synced, pending } = await serviceApi.syncPendingLogistics(site.id);
      await reloadEntries();
      toast[synced && !pending ? "success" : "info"](synced ? `${synced} saisie(s) synchronisée(s).` : "Aucune saisie en attente.");
      if (pending) toast.warning(`${pending} saisie(s) reste(nt) en attente.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Synchronisation impossible.");
    } finally {
      setSyncing(false);
    }
  };

  const exportSpreadsheet = () => {
    if (!isWasteRegister) {
      const rows = filteredEntries.map((entry) => [
        String(entry.date || "").slice(0, 10),
        entry.immatriculationVehicule || "",
        entry.heureSortie || "",
        entry.designation || "",
        entry.nbr || "",
        entry.facture || "",
        entry.destinataire || "",
        entry.typeDocument || "",
        entry.emetteur || "",
        entry.verification || "",
        entry.visaAgent || "",
      ]);
      const stamp = today().replaceAll("-", "");
      exportXlsx(`registre-bons-factures-${stamp}.xlsx`, pageTitle, documentHeaders, rows);
      return;
    }
    const columns = [...wasteHeaders, "Auteur", "Horodatage de saisie"];
    const rows = filteredEntries.map((entry) => [
      entry.date, entry.immatriculationVehicule, entry.transporteur, entry.designation, entry.nbr, entry.facture,
      entry.destinataire, entry.plomb || "", entry.createdBy || "",
      entry.createdAt ? new Date(entry.createdAt).toLocaleString("fr-FR") : "",
    ]);
    const stamp = today().replaceAll("-", "");
    exportXlsx(`${isWasteRegister ? "registre-ordures" : "registre-bons-factures"}-${stamp}.xlsx`, pageTitle, columns, rows);
  };

  const importDocumentRegister = async (file?: File) => {
    if (!file) return;
    if (isWasteRegister) return;
    if (!site?.id) {
      toast.error("Sélectionnez un site avant l’importation.");
      return;
    }
    if (saving || syncing || importing) {
      toast.error("Attendez la fin de l’enregistrement ou de la synchronisation avant l’importation.");
      return;
    }
    if (!openShiftId) {
      toast.error(openShifts.length
        ? "Sélectionnez le poste et le service qui effectuent cette saisie avant l’importation."
        : "Ouvrez une prise de poste pour ce site avant l’importation.");
      return;
    }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalizeHeader = (value: string) => value.trim().normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]/g, "");
      const columns = {
        date: ["date"],
        registration: ["immatriculation", "transport matricule", "matricule"],
        time: ["heure de sortie", "heure sortie", "heure"],
        designation: ["designation", "objet"],
        count: ["nombre", "nbr", "quantite"],
        number: ["numero bon facture", "numero bon", "bon facture", "facture", "numero document"],
        destination: ["destination", "destinataire"],
        documentType: ["type de document", "type document", "type"],
        issuer: ["emetteur", "expediteur"],
        verification: ["verification"],
        visa: ["visa agent", "visa de l agent", "agent"],
      };
      const requiredColumns = ["date", "registration", "time", "designation", "count", "number", "destination", "documentType"] as const;
      const matchingHeaders = (row: string[]) => {
        const headers = row.map((value) => normalizeHeader(String(value ?? "")));
        return Object.values(columns).filter((aliases) =>
          headers.some((header) => aliases.some((alias) => header === normalizeHeader(alias))),
        ).length;
      };
      const headerRowIndex = sheet.slice(0, 10).reduce((bestIndex, row, index, rows) =>
        matchingHeaders(row) > matchingHeaders(rows[bestIndex] || []) ? index : bestIndex,
      0);
      const headers = (sheet[headerRowIndex] || []).map((value) => normalizeHeader(String(value ?? "")));
      const column = (...aliases: string[]) => headers.findIndex((header) =>
        aliases.some((alias) => header === normalizeHeader(alias)),
      );
      const col = Object.fromEntries(
        Object.entries(columns).map(([key, aliases]) => [key, column(...aliases)]),
      ) as Record<keyof typeof columns, number>;
      if (requiredColumns.some((key) => col[key] < 0)) {
        const detected = (sheet[headerRowIndex] || []).filter(Boolean).join(", ");
        const requiredHeaders = documentHeaders.slice(0, 8);
        throw new Error(`Colonnes requises manquantes : ${requiredHeaders.join(", ")}. En-têtes détectés : ${detected || "aucun"}.`);
      }
      const get = (cells: string[], index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
      const parseDate = (value: string) => {
        const text = value.trim();
        const isoDate = /^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/.exec(text);
        if (isoDate && !Number.isNaN(Date.parse(`${isoDate[1]}T00:00:00`))) return isoDate[1];
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
      const parseDocumentType = (value: string) => {
        const normalized = normalizeHeader(value);
        if (normalized === "facture") return "FACTURE";
        if (["bonsortie", "sortie"].includes(normalized)) return "BON_SORTIE";
        return "BON";
      };
      const rows = sheet.slice(headerRowIndex + 1).map((cells, index) => ({
        line: headerRowIndex + index + 2,
        date: parseDate(get(cells, col.date)),
        immatriculationVehicule: get(cells, col.registration),
        heureSortie: parseTime(get(cells, col.time)),
        designation: get(cells, col.designation),
        nbr: get(cells, col.count),
        facture: get(cells, col.number),
        destinataire: get(cells, col.destination),
        typeDocument: parseDocumentType(get(cells, col.documentType)),
        emetteur: get(cells, col.issuer),
        verification: get(cells, col.verification),
        visaAgent: get(cells, col.visa),
        hasData: cells.some((value) => String(value ?? "").trim()),
      })).filter((row) => row.hasData);
      if (!rows.length) throw new Error("Le fichier ne contient aucune ligne à importer.");

      const created: TruckEntry[] = [];
      const failures: string[] = [];
      for (const row of rows) {
        const missingFields = [
          !row.date && "date (format attendu : JJ/MM/AAAA ou AAAA-MM-JJ)",
          !row.immatriculationVehicule && "immatriculation",
          !row.heureSortie && "heure de sortie (format attendu : HH:MM)",
          !row.designation && "désignation",
          !row.nbr && "nombre",
          !row.facture && "numéro du bon / facture",
          !row.destinataire && "destination",
        ].filter((field): field is string => Boolean(field));
        if (missingFields.length) {
          failures.push(`Ligne ${row.line} : champ(s) manquant(s) ou invalide(s) : ${missingFields.join(", ")}.`);
          continue;
        }
        try {
          const result = await serviceApi.createLogistics({
            date: row.date,
            type: "DECHARGEMENT",
            immatriculationVehicule: row.immatriculationVehicule,
            heureSortie: row.heureSortie,
            designation: row.designation,
            nbr: row.nbr,
            facture: row.facture,
            destinataire: row.destinataire,
            typeDocument: row.typeDocument,
            emetteur: row.emetteur,
            verification: row.verification,
            visaAgent: row.visaAgent,
            siteId: site.id,
            siteName: selectedSiteName,
            siteType: site.type,
            priseDePosteId: openShiftId,
          });
          if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement.");
          created.push(result.entry as TruckEntry);
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
          if (error instanceof Error && "status" in error && error.status === 409) break;
        }
      }
      if (created.length) {
        setEntries((current) => [...created, ...current.filter((entry) => !created.some((item) => item.id === entry.id))]);
        setPage(1);
        const queued = created.filter((entry) => entry.pendingSync).length;
        toast.success(`${created.length} enregistrement(s) importé(s)${queued ? ` (${queued} en attente de synchronisation)` : ""}.`);
      }
      if (failures.length) toast.error(`${failures.length} ligne(s) non importée(s) : ${failures.slice(0, 2).join(" ")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };

  const importWasteRegister = async (file?: File) => {
    if (!file) return;
    if (!site?.id) { toast.error("Sélectionnez un site avant l’importation."); return; }
    if (saving || syncing || importing) { toast.error("Attendez la fin de l’enregistrement ou de la synchronisation avant l’importation."); return; }
    if (!openShiftId) { toast.error("Ouvrez ou sélectionnez une prise de poste avant l’importation."); return; }
    setImporting(true);
    try {
      const sheet = await readXlsxRows(file);
      const normalizeHeader = (value: unknown) => String(value ?? "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").replace(/[^a-z0-9]/g, "");
      const headers = (sheet[0] || []).map(normalizeHeader);
      const column = (...aliases: string[]) => headers.findIndex((header) => aliases.some((alias) => header === normalizeHeader(alias)));
      const col = {
        date: column("date"), vehicle: column("vehicule", "immatriculation"), carrier: column("transporteur"), designation: column("designation"),
        count: column("nombre", "nbr", "quantite"), invoice: column("facture", "numero facture"), destination: column("destination", "destinataire"), seal: column("plomb"),
      };
      if ([col.date, col.vehicle, col.carrier, col.designation, col.count, col.invoice, col.destination].some((index) => index < 0)) {
        throw new Error("Colonnes requises manquantes. Téléchargez le modèle Excel du registre des déchets.");
      }
      const get = (cells: string[], index: number) => index < 0 ? "" : String(cells[index] ?? "").trim();
      const parseDate = (value: string) => {
        const text = value.trim();
        const iso = /^(\d{4}-\d{2}-\d{2})(?:[T\s].*)?$/.exec(text);
        if (iso && !Number.isNaN(Date.parse(`${iso[1]}T00:00:00`))) return iso[1];
        const french = /^(\d{1,2})[/. -](\d{1,2})[/. -](\d{4})$/.exec(text);
        if (french) return `${french[3]}-${french[2].padStart(2, "0")}-${french[1].padStart(2, "0")}`;
        const serial = Number(text);
        return Number.isFinite(serial) && serial > 20000 && serial < 80000 ? new Date(Date.UTC(1899, 11, 30 + Math.floor(serial))).toISOString().slice(0, 10) : "";
      };
      const rows = sheet.slice(1).map((cells, index) => ({
        line: index + 2, date: parseDate(get(cells, col.date)), immatriculationVehicule: get(cells, col.vehicle), transporteur: get(cells, col.carrier),
        designation: get(cells, col.designation), nbr: get(cells, col.count), facture: get(cells, col.invoice), destinataire: get(cells, col.destination), plomb: get(cells, col.seal),
      })).filter((row) => row.date || row.immatriculationVehicule || row.designation);
      if (!rows.length) throw new Error("Le fichier ne contient aucune ligne à importer.");
      const created: TruckEntry[] = [];
      const failures: string[] = [];
      for (const row of rows) {
        if (!row.date || !row.immatriculationVehicule || !row.transporteur || !wasteDesignations.includes(row.designation as typeof wasteDesignations[number]) || !row.nbr || !row.facture || !row.destinataire) {
          failures.push(`Ligne ${row.line} : date, véhicule, transporteur, désignation, nombre, facture ou destination invalide.`);
          continue;
        }
        try {
          const result = await serviceApi.createLogistics({
            date: row.date, type: "ORDURES", immatriculationVehicule: row.immatriculationVehicule, transporteur: row.transporteur,
            designation: row.designation, nbr: row.nbr, facture: row.facture, destinataire: row.destinataire, plomb: row.plomb,
            siteId: site.id, siteName: selectedSiteName, siteType: site.type, priseDePosteId: openShiftId,
          });
          if (!result.entry) throw new Error("La réponse du serveur ne contient pas l’enregistrement.");
          created.push(result.entry as TruckEntry);
        } catch (error) {
          failures.push(`Ligne ${row.line} : ${error instanceof Error ? error.message : "enregistrement impossible"}`);
          if (error instanceof Error && "status" in error && error.status === 409) break;
        }
      }
      if (created.length) {
        setEntries((current) => [...created, ...current.filter((entry) => !created.some((item) => item.id === entry.id))]);
        setPage(1);
        const queued = created.filter((entry) => entry.pendingSync).length;
        toast.success(`${created.length} enregistrement(s) importé(s)${queued ? ` (${queued} en attente de synchronisation)` : ""}.`);
        if (created.some((entry) => !entry.pendingSync)) void reloadEntries();
      }
      if (failures.length) toast.error(`${failures.length} ligne(s) non importée(s) : ${failures.slice(0, 2).join(" ")}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      setImporting(false);
    }
  };

  const printEntries = (items: TruckEntry[], title: string) => {
    const printWindow = window.open("", "_blank", "width=700,height=800");
    if (!printWindow) {
      toast.error("Autorisez les fenêtres contextuelles pour imprimer les données.");
      return;
    }

    const tableRows = items.map((entry) => {
      const date = String(entry.date || "").slice(0, 10);
      const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "—";
      const cells = [
        displayDate,
        entry.immatriculationVehicule || "—",
        ...(isWasteRegister ? [entry.transporteur || "—"] : []),
        ...(!isWasteRegister ? [entry.heureSortie || "—"] : []),
        entry.designation || "—",
        entry.nbr || "—",
        entry.facture || "—",
        entry.destinataire || "—",
        ...(isWasteRegister ? [entry.plomb || "—"] : []),
        ...(!isWasteRegister ? [entry.typeDocument || "—", entry.emetteur || "—", entry.verification || "—", entry.visaAgent || "—"] : []),
      ];
      return `<tr>${cells.map((value) => `<td>${escapeHtml(String(value))}</td>`).join("")}</tr>`;
    }).join("");
    const tableHeaders = [
      "Date",
      isWasteRegister ? "Véhicule" : "Transport (matricule)",
      ...(isWasteRegister ? ["Transporteur"] : []),
      ...(!isWasteRegister ? ["Heure de sortie"] : []),
      "Désignation",
      "Nombre",
      isWasteRegister ? "Facture" : "Numéro Bon / Facture",
      "Destination",
      ...(isWasteRegister ? ["Plomb"] : []),
      ...(!isWasteRegister ? ["Type de document", "Émetteur", "Vérification", "Visa agent"] : []),
    ].map((heading) => `<th>${escapeHtml(heading)}</th>`).join("");

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html lang="fr">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            * { box-sizing: border-box; }
            body { color: #172033; font: 14px Arial, sans-serif; }
            h1 { margin: 0 0 6px; font-size: 21px; }
            .site { margin: 0 0 20px; color: #526078; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px; border: 1px solid #d6dbe4; text-align: left; vertical-align: top; }
            th { background: #edf1f5; font-size: 11px; text-transform: uppercase; }
            td { white-space: pre-wrap; overflow-wrap: anywhere; }
            tr { break-inside: avoid; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          <p class="site">Site : ${escapeHtml(items[0]?.siteName || selectedSiteName || "—")}</p>
          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  const printEntry = (entry: TruckEntry) => {
    const date = String(entry.date || "").slice(0, 10);
    const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "—";
    printRecord(isWasteRegister ? "Enregistrement d’ordures" : "Enregistrement Bon / facture / Bon de sortie", entry.siteName || selectedSiteName, [
      ["Date", displayDate],
      [isWasteRegister ? "Véhicule" : "Transport (matricule)", entry.immatriculationVehicule || "—"],
      ...(isWasteRegister ? [["Transporteur", entry.transporteur || "—"] as [string, string]] : []),
      ...(!isWasteRegister ? [["Heure de sortie", entry.heureSortie || "—"] as [string, string]] : []),
      ["Désignation", entry.designation || "—"],
      ["Nombre", entry.nbr || "—"],
      [isWasteRegister ? "Facture" : "Numéro Bon / Facture", entry.facture || "—"],
      ["Destination", entry.destinataire || "—"],
      ...(isWasteRegister ? [["Plomb", entry.plomb || "—"] as [string, string]] : []),
      ...(!isWasteRegister ? [
        ["Type de document", entry.typeDocument || "—"] as [string, string],
        ["Émetteur", entry.emetteur || "—"] as [string, string],
        ["Vérification", entry.verification || "—"] as [string, string],
        ["Visa de l’agent", entry.visaAgent || "—"] as [string, string],
      ] : []),
    ]);
  };

  return (
    <div className={isWasteRegister ? "waste-flow-module courrier-module space-y-4" : "document-flow-module space-y-5"}>
      {isWasteRegister ? <header className="courrier-hero">
        <div className="courrier-hero-icon"><Trash2 aria-hidden="true" /></div>
        <div className="courrier-hero-copy">
          <h1>{pageTitle}</h1>
          <p>Saisie et suivi des sorties d’ordures par véhicule.</p>
        </div>
      </header> : <PageHeader
        title={pageTitle}
        subtitle="Saisie et suivi des transports, bons, factures et destinations."
        action={<Button className="document-flow-primary" type="button" disabled={!site?.id} onClick={() => { setEditingTruck(null); setTruckForm(emptyTruck()); setAttachmentFiles([]); setFormOpen(true); }}><FilePlus2 className="mr-2 h-4 w-4" />Nouvel enregistrement</Button>}
      />}
      {!isWasteRegister && <div className="max-w-xl">
        <SitePicker
          id="logistics-site"
          value={selectedSiteName}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => {
            if (name !== selectedSiteName) {
              setEntries([]);
              setEditingTruck(null);
              setTruckForm(emptyTruck());
              setFormOpen(false);
              setPage(1);
            }
            setSiteName(name);
            setSiteType(type);
          }}
        />
      </div>}
      {siteError && <p className="text-sm text-destructive">{siteError}</p>}
      {site?.id && openShifts.length > 0 && <div className={`max-w-xl space-y-1.5 ${isWasteRegister ? "waste-flow-shift" : ""}`}>
        <Label htmlFor="logistics-shift">Poste et service de saisie</Label>
        <select id="logistics-shift" value={openShiftId || ""} onChange={(event) => {
          const id = event.target.value || null;
          setOpenShiftId(id);
          const selected = openShifts.find((shift) => shift.id === id);
          const selectedPostId = selected?.posteId || localStorage.getItem(`securitec-active-post:${site.id}`);
          const storageKey = `securitec-logistics-shift:${site.id}:${selectedPostId || "site"}`;
          if (id) localStorage.setItem(storageKey, id); else localStorage.removeItem(storageKey);
          if (id && selectedPostId) {
            localStorage.setItem(`securitec-active-post:${site.id}`, selectedPostId);
            localStorage.setItem(`securitec-active-shift:${site.id}:${selectedPostId}`, id);
          }
        }} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
          <option value="">Sélectionner le poste actif…</option>
          {openShifts.map((shift) => <option key={shift.id} value={shift.id}>{shift.posteNom || "Poste non renseigné"} · {shift.shiftType === "NUIT" ? "Nuit" : shift.shiftType === "JOUR" ? "Jour" : "Service"} · {shift.nom} {shift.prenom}</option>)}
        </select>
      </div>}
      {site?.id && !openShiftId && <p className="text-sm text-amber-700">{openShifts.length ? "Sélectionnez le poste actif qui effectue cette saisie." : "Aucune prise de poste ouverte sur ce site. Ouvrez le service avant d’enregistrer un flux."}</p>}

          <div className={`document-flow-entry-shell ${isWasteRegister ? "waste-flow-entry-shell" : ""} ${formOpen ? "is-open" : ""}`} aria-hidden={!formOpen} role={formOpen ? "dialog" : undefined} aria-modal={formOpen ? true : undefined} aria-label={editingTruck ? `Modifier un enregistrement${isWasteRegister ? " d’ordures" : " bon ou facture"}` : `Nouvel enregistrement${isWasteRegister ? " d’ordures" : " bon ou facture"}`}>
          <Panel className={isWasteRegister ? "waste-flow-entry-panel" : "document-flow-entry-panel"} title={editingTruck ? `Modifier un enregistrement${isWasteRegister ? " d’ordures" : ""}` : isWasteRegister ? "Nouvel enregistrement d’ordures" : "Nouvel enregistrement Bon / facture / Bon de sortie"}>
          <button type="button" className={`document-flow-modal-close ${isWasteRegister ? "waste-flow-modal-close" : ""}`} aria-label="Fermer le formulaire" onClick={() => setFormOpen(false)}><X aria-hidden="true" size={18} /></button>
        <form className={`${isWasteRegister ? "waste-flow-form" : "document-flow-form"} space-y-5`} onSubmit={(event) => void saveTruck(event)}>
          {isWasteRegister && <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <div className="flex min-h-10 items-center justify-between gap-2">
                <Label htmlFor="flux-date" className="text-base font-semibold">Date</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-sm"
                  aria-label="Définir la date du jour"
                  onClick={() => setTruckForm((current) => ({ ...current, date: today() }))}
                >
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  Aujourd’hui
                </Button>
              </div>
              <Input
                id="flux-date"
                type="date"
                required
                className="h-12 text-base"
                value={truckForm.date}
                onChange={(event) => setTruckForm({ ...truckForm, date: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-truck" className="flex min-h-10 items-center text-base font-semibold">Véhicule</Label>
              <Input
                id="flux-truck"
                className="h-12 text-base"
                required
                maxLength={100}
                placeholder="Ex. 4586 TBC"
                value={truckForm.immatriculationVehicule}
                onChange={(event) => setTruckForm({ ...truckForm, immatriculationVehicule: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-carrier" className="flex min-h-10 items-center text-base font-semibold">Transporteur</Label>
              <Input
                id="flux-carrier"
                className="h-12 text-base"
                required
                maxLength={255}
                placeholder="Saisir le transporteur"
                value={truckForm.transporteur}
                onChange={(event) => setTruckForm({ ...truckForm, transporteur: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-designation" className="flex min-h-10 items-center text-base font-semibold">Désignation</Label>
              <select
                id="flux-designation"
                required
                value={truckForm.designation}
                onChange={(event) => setTruckForm({ ...truckForm, designation: event.target.value })}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Sélectionner une désignation</option>
                {wasteDesignations.map((designation) => <option key={designation} value={designation}>{designation}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-destination" className="flex min-h-10 items-center text-base font-semibold">Destination</Label>
              <Input
                id="flux-destination"
                className="h-12 text-base"
                required
                maxLength={255}
                value={truckForm.destinataire}
                onChange={(event) => setTruckForm({ ...truckForm, destinataire: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-nbr" className="flex min-h-10 items-center text-base font-semibold">Nombre</Label>
              <Input
                id="flux-nbr"
                className="h-12 text-base"
                required
                maxLength={255}
                placeholder="Ex. : 1 voyage"
                value={truckForm.nbr}
                onChange={(event) => setTruckForm({ ...truckForm, nbr: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-invoice" className="flex min-h-10 items-center text-base font-semibold">Facture (saisie manuelle)</Label>
              <Input
                id="flux-invoice"
                className="h-12 text-base"
                required
                maxLength={160}
                placeholder="Saisir la référence de facture"
                value={truckForm.facture}
                onChange={(event) => setTruckForm({ ...truckForm, facture: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-seal" className="flex min-h-10 items-center text-base font-semibold">Plomb (facultatif, saisie manuelle)</Label>
              <Input
                id="flux-seal"
                className="h-12 text-base"
                maxLength={100}
                placeholder="Saisir le plomb si disponible"
                value={truckForm.plomb}
                onChange={(event) => setTruckForm({ ...truckForm, plomb: event.target.value })}
              />
            </div>
          </div>}
          {!isWasteRegister && <>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <div className="flex min-h-10 items-center justify-between gap-2">
                <Label htmlFor="flux-date" className="text-base font-semibold">Date</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-sm"
                  aria-label="Définir la date du jour"
                  onClick={() => setTruckForm((current) => ({ ...current, date: today() }))}
                >
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  Aujourd’hui
                </Button>
              </div>
              <Input
                id="flux-date"
                type="date"
                required
                className="h-12 text-base"
                value={truckForm.date}
                onChange={(event) => setTruckForm({ ...truckForm, date: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-truck" className="flex min-h-10 items-center text-base font-semibold">Transport (matricule)</Label>
              <Input
                id="flux-truck"
                className="h-12 text-base"
                required
                maxLength={100}
                placeholder="Ex. 4586 TBC"
                value={truckForm.immatriculationVehicule}
                onChange={(event) => setTruckForm({ ...truckForm, immatriculationVehicule: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex min-h-10 items-center justify-between gap-2">
                <Label htmlFor="flux-exit-time" className="text-base font-semibold">Heure de sortie</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 px-3 text-sm"
                  aria-label="Définir l’heure actuelle"
                  onClick={() => setTruckForm((current) => ({ ...current, heureSortie: nowTime() }))}
                >
                  <Clock3 className="h-5 w-5" aria-hidden="true" />
                  Maintenant
                </Button>
              </div>
              <Input
                id="flux-exit-time"
                type="time"
                required
                className="h-12 text-base"
                value={truckForm.heureSortie}
                onChange={(event) => setTruckForm({ ...truckForm, heureSortie: event.target.value })}
              />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="flux-designation" className="flex min-h-10 items-center text-base font-semibold">Désignation</Label>
              <Input
                id="flux-designation"
                required
                maxLength={20000}
                value={truckForm.designation}
                onChange={(event) => setTruckForm({ ...truckForm, designation: event.target.value })}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-destination" className="flex min-h-10 items-center text-base font-semibold">Destination</Label>
              <Input
                id="flux-destination"
                className="h-12 text-base"
                required
                maxLength={255}
                value={truckForm.destinataire}
                onChange={(event) => setTruckForm({ ...truckForm, destinataire: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-nbr" className="flex min-h-10 items-center text-base font-semibold">Nombre</Label>
              <Input
                id="flux-nbr"
                className="h-12 text-base"
                required
                maxLength={255}
                placeholder="Ex. : 1 voyage"
                value={truckForm.nbr}
                onChange={(event) => setTruckForm({ ...truckForm, nbr: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-invoice" className="flex min-h-10 items-center text-base font-semibold">Numéro Bon / Facture</Label>
              <Input
                id="flux-invoice"
                className="h-12 text-base"
                required
                maxLength={160}
                placeholder="Ex. BL-2026-084"
                value={truckForm.facture}
                onChange={(event) => setTruckForm({ ...truckForm, facture: event.target.value })}
              />
            </div>
          </div>
          </>}
          {!isWasteRegister && <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="flux-document-type" className="flex min-h-10 items-center text-base font-semibold">Type de document</Label>
              <select id="flux-document-type" required value={truckForm.typeDocument} onChange={(event) => setTruckForm({ ...truckForm, typeDocument: event.target.value })} className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm">
                <option value="BON">Bon</option><option value="FACTURE">Facture</option><option value="BON_SORTIE">Bon de sortie</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-emetteur" className="flex min-h-10 items-center text-base font-semibold">Émetteur (facultatif)</Label>
              <Input id="flux-emetteur" maxLength={255} className="h-12 text-base" value={truckForm.emetteur} onChange={(event) => setTruckForm({ ...truckForm, emetteur: event.target.value })} />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <Label htmlFor="flux-verification" className="flex min-h-10 items-center text-base font-semibold">Vérification (facultatif)</Label>
              <Input id="flux-verification" maxLength={2000} className="h-12 text-base" value={truckForm.verification} onChange={(event) => setTruckForm({ ...truckForm, verification: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flux-visa-agent" className="flex min-h-10 items-center text-base font-semibold">Visa de l’agent (facultatif)</Label>
              <Input id="flux-visa-agent" maxLength={255} className="h-12 text-base" value={truckForm.visaAgent} onChange={(event) => setTruckForm({ ...truckForm, visaAgent: event.target.value })} />
            </div>
          </div>}
          <div className="space-y-2">
            <Label htmlFor="flux-attachments" className="flex items-center gap-2 text-base font-semibold"><FilePlus2 className="h-4 w-4" />Pièces justificatives</Label>
            <Input
              id="flux-attachments"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt"
              disabled={saving}
              onChange={(event) => {
                const selected = Array.from(event.target.files || []);
                const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx", "csv", "txt"]);
                const valid = selected.filter((file) => allowedExtensions.has(file.name.split(".").pop()?.toLowerCase() || "") && file.size > 0 && file.size <= 15 * 1024 * 1024);
                if (valid.length !== selected.length) toast.error("Formats autorisés : PDF, image, Office, CSV ou TXT; 15 Mo maximum par fichier.");
                setAttachmentFiles(valid);
              }}
            />
            {attachmentFiles.length > 0 && <p className="text-sm text-muted-foreground">{attachmentFiles.map((file) => file.name).join(", ")}</p>}
          </div>
          {!site?.id && <p className="text-base text-muted-foreground">Sélectionnez un site pour ajouter un enregistrement.</p>}
          {site?.id && !openShiftId && <p className="text-base text-amber-700">Aucune prise de poste ouverte pour ce site.</p>}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {editingTruck && (
                <Button type="button" variant="outline" className="h-11 px-5 text-base" disabled={saving} onClick={() => { setEditingTruck(null); setTruckForm(emptyTruck()); setFormOpen(false); }}>
                <X /> Annuler
              </Button>
            )}
            <Button className="h-11 px-5 text-base" disabled={saving || !site?.id || !openShiftId || (!isOnline && !!editingTruck)}>
              {editingTruck && <Pencil />}
              {saving ? "Enregistrement…" : editingTruck ? "Enregistrer les modifications" : isWasteRegister ? "Ajouter au registre" : "Enregistrer la sortie"}
            </Button>
          </div>
        </form>
          </Panel>
          </div>

      <div className={isWasteRegister ? "waste-flow-registry" : "document-flow-registry"}><Panel className={isWasteRegister ? "courrier-history waste-flow-panel" : undefined}>
        {isWasteRegister && <div className="courrier-history-toolbar">
          <h2 className="courrier-panel-heading">{pageTitle}</h2>
          <div className="courrier-history-actions courrier-registry-screen">
            <Button type="button" disabled={!site?.id} onClick={() => { setEditingTruck(null); setTruckForm(emptyTruck()); setAttachmentFiles([]); setFormOpen(true); }}>
              <FilePlus2 aria-hidden="true" />Nouvel enregistrement
            </Button>
            <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={exportSpreadsheet}>
              <Download aria-hidden="true" />Exporter Excel
            </Button>
            <Button type="button" variant="outline" onClick={() => exportXlsx("modele-registre-dechets.xlsx", pageTitle, wasteHeaders, [])}>
              <FileDown aria-hidden="true" />Télécharger modèle
            </Button>
            <label className={`courrier-import-button ${!site?.id || !openShiftId || importing || saving || syncing ? "pointer-events-none opacity-50" : ""}`}>
              <FileUp aria-hidden="true" />{importing ? "Importation…" : "Importer"}
              <input className="sr-only" type="file" accept=".xlsx,.csv,text/csv" disabled={!site?.id || !openShiftId || importing || saving || syncing} onChange={(event) => { void importWasteRegister(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
            <Button type="button" variant="outline" disabled={!filteredEntries.length} onClick={() => printEntries(filteredEntries, pageTitle)}>
              <Printer aria-hidden="true" />Imprimer les lignes
            </Button>
            {entries.some((entry) => entry.pendingSync) && <Button type="button" variant="outline" disabled={!isOnline || syncing} onClick={() => void synchronize()}>
              <RefreshCw className={syncing ? "animate-spin" : ""} />Synchroniser
            </Button>}
          </div>
        </div>}
        {!isWasteRegister && <div className="mb-4 flex flex-col gap-3 border-b pb-3 print:hidden xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 xl:flex-[0_1_25%]">
            <h2 className="text-sm font-semibold text-foreground">{pageTitle}</h2>
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:w-auto xl:flex-[1_1_0%] xl:grid-cols-4">
            <label className={`inline-flex h-10 min-w-0 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-md border px-2 text-center text-xs font-medium ${!site?.id || importing || saving ? "pointer-events-none opacity-50" : "hover:bg-muted"}`}>
              <FileUp className="mr-1.5 h-4 w-4 shrink-0" />{importing ? "Importation…" : "Importer Excel / CSV"}
              <input
                className="sr-only"
                type="file"
                accept=".xlsx,.csv,text/csv"
                disabled={!site?.id || importing || saving}
                onChange={(event) => { void importDocumentRegister(event.target.files?.[0]); event.currentTarget.value = ""; }}
              />
            </label>
            <Button className="w-full min-w-0 whitespace-nowrap px-2 text-xs" type="button" variant="outline" onClick={() => exportXlsx("modele-enregistrements-bon-facture.xlsx", pageTitle, documentHeaders, [])}>
              <FileDown className="mr-1.5 h-4 w-4 shrink-0" />Modèle Excel
            </Button>
            <Button className="w-full min-w-0 whitespace-nowrap px-2 text-xs" type="button" variant="outline" disabled={!filteredEntries.length} onClick={exportSpreadsheet}>
              <Download className="mr-1.5 h-4 w-4 shrink-0" />Exporter Excel
            </Button>
            <Button type="button" variant="outline" className="document-flow-outline w-full min-w-0 whitespace-nowrap px-2 text-xs" disabled={!filteredEntries.length} onClick={() => printEntries(filteredEntries, pageTitle)}>
              <Printer className="mr-1.5 h-4 w-4 shrink-0" />Imprimer les lignes (Word)
            </Button>
          </div>
        </div>}
        {isWasteRegister ? <div className="courrier-filter-grid waste-register-filter-grid courrier-registry-screen">
          <label className="courrier-filter-field">
            <span><CalendarDays aria-hidden="true" />Période</span>
            <div className="courrier-date-range">
              <Input aria-label="Date de début" type="date" max={toDate || undefined} value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} />
              <span aria-hidden="true">–</span>
              <Input aria-label="Date de fin" type="date" min={fromDate || undefined} value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} />
            </div>
          </label>
          <label className="courrier-filter-field">
            <span><Truck aria-hidden="true" />Transporteur</span>
            <select value={carrierFilter} onChange={(event) => { setCarrierFilter(event.target.value); setPage(1); }}>
              <option value="">Tous les transporteurs</option>
              {carrierOptions.map((carrier) => <option key={carrier} value={carrier}>{carrier}</option>)}
            </select>
          </label>
          <div className="courrier-filter-field courrier-filter-site">
            <span><MapPin aria-hidden="true" />Site</span>
            <SitePicker
              id="logistics-site"
              value={selectedSiteName}
              type={site?.type || siteType}
              sites={sites}
              canCreate={canCreateSite}
              onAdd={addSite}
              onChange={(name, type) => {
                if (name !== selectedSiteName) {
                  setEntries([]);
                  setEditingTruck(null);
                  setTruckForm(emptyTruck());
                  setFormOpen(false);
                  setPage(1);
                  setCarrierFilter("");
                  setSyncStatusFilter("all");
                }
                setSiteName(name);
                setSiteType(type);
              }}
            />
          </div>
          <label className="courrier-filter-field">
            <span><CheckCircle2 aria-hidden="true" />Statut</span>
            <select value={syncStatusFilter} onChange={(event) => { setSyncStatusFilter(event.target.value); setPage(1); }}>
              <option value="all">Tous</option>
              <option value="synced">Synchronisé</option>
              <option value="pending">En attente de synchronisation</option>
            </select>
          </label>
          <label className="courrier-filter-field courrier-filter-search">
            <span><Search aria-hidden="true" />Recherche</span>
            <Input aria-label="Rechercher dans le registre des ordures" placeholder="Véhicule, désignation, facture, destination…" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </label>
        </div> : <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className={`relative w-full ${isWasteRegister ? "max-w-none" : "max-w-md"}`}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Rechercher dans le registre"
              placeholder="Rechercher date, véhicule, désignation, facture, destination…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="sr-only" htmlFor="flux-from-date">Du</Label>
              <Input id="flux-from-date" type="date" aria-label="Filtrer depuis le" max={toDate || undefined} value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(1); }} className="w-auto" />
              <Label className="sr-only" htmlFor="flux-to-date">Au</Label>
              <Input id="flux-to-date" type="date" aria-label="Filtrer jusqu’au" min={fromDate || undefined} value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(1); }} className="w-auto" />
            </div>
          {!isWasteRegister && <div className="flex flex-wrap items-center gap-2">
            {!isOnline && <span className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">Hors connexion · les nouvelles saisies seront mises en attente</span>}
            {isOnline && entries.some((entry) => entry.pendingSync) && <span className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">Des saisies attendent la synchronisation</span>}
            <Button type="button" variant="outline" className="document-flow-outline" disabled={!isOnline || syncing || !entries.some((entry) => entry.pendingSync)} onClick={() => void synchronize()}>
              <RefreshCw className={syncing ? "animate-spin" : ""} />Synchroniser
            </Button>
          </div>}
          </div>
        </div>}
        {isWasteRegister && <div className="courrier-results-summary waste-flow-results">
          <p><CheckCircle2 aria-hidden="true" />{filteredEntries.length} enregistrement(s) trouvé(s)</p>
          <label>Afficher
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              <option value={10}>10 lignes</option>
              <option value={25}>25 lignes</option>
              <option value={50}>50 lignes</option>
              <option value={100}>100 lignes</option>
            </select>
          </label>
        </div>}
        <div className="overflow-hidden rounded-lg border">
          <div className="max-h-[560px] overflow-auto">
            <table className={`${isWasteRegister ? "waste-flow-table courrier-history-table" : "document-flow-table"} w-full min-w-[1450px] text-left text-sm`}>
              <thead className={`${isWasteRegister ? "waste-flow-table-head" : "document-flow-table-head"} sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur`}>
                <tr>
                  {[...(isWasteRegister ? ["N°"] : []), "Date", isWasteRegister ? "Véhicule" : "Transport (matricule)", ...(isWasteRegister ? ["Transporteur"] : []), ...(!isWasteRegister ? ["Heure de sortie"] : []), "Désignation", "Nombre", isWasteRegister ? "Facture" : "Numéro Bon / Facture", "Destination", ...(isWasteRegister ? ["Plomb", "Statut"] : []), ...(!isWasteRegister ? ["Type document", "Émetteur", "Vérification", "Visa agent"] : []), "Saisie par / le", "Pièces jointes", "Historique", "Actions"].map((label) => (
                    <th key={label} className="whitespace-nowrap border-b px-3 py-3 font-medium">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {(isWasteRegister ? pageEntries : filteredEntries).map((entry, index) => (
                  <tr key={entry.id} className={`${isWasteRegister ? "waste-flow-table-row courrier-table-row" : "document-flow-table-row"} align-top ${entry.pendingSync ? (isWasteRegister ? "waste-flow-table-row--pending courrier-table-row--pending" : "document-flow-table-row--pending") : ""}`}>
                    {isWasteRegister && <td>{(currentPage - 1) * pageSize + index + 1}</td>}
                    <td className="whitespace-nowrap px-3 py-3">{isWasteRegister && /^\d{4}-\d{2}-\d{2}$/.test(String(entry.date).slice(0, 10)) ? String(entry.date).slice(0, 10).split("-").reverse().join("/") : String(entry.date).slice(0, 10)}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium">{entry.immatriculationVehicule || "—"}</td>
                    {isWasteRegister && <td className="px-3 py-3">{entry.transporteur || "—"}</td>}
                    {!isWasteRegister && <td className="whitespace-nowrap px-3 py-3">{entry.heureSortie || "—"}</td>}
                    <td className="max-w-md whitespace-pre-wrap px-3 py-3">{entry.designation || "—"}</td>
                    <td className="px-3 py-3">{entry.nbr || "—"}</td>
                    <td className="px-3 py-3">{entry.facture || "—"}</td>
                    <td className="px-3 py-3">{entry.destinataire || "—"}</td>
                    {isWasteRegister && <td className="px-3 py-3">{entry.plomb || "—"}</td>}
                    {isWasteRegister && <td><span className={`courrier-status ${entry.pendingSync ? "courrier-status--pending" : "courrier-status--exited"}`}>{entry.pendingSync ? entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau" : "Synchronisé"}</span></td>}
                    {!isWasteRegister && <>
                      <td className="px-3 py-3"><span className={`document-type-badge document-type-badge--${entry.typeDocument?.toLocaleLowerCase() || "default"}`}>{entry.typeDocument || "—"}</span></td>
                      <td className="px-3 py-3">{entry.emetteur || "—"}</td>
                      <td className="max-w-xs whitespace-pre-wrap px-3 py-3">{entry.verification || "—"}</td>
                      <td className="px-3 py-3">{entry.visaAgent || "—"}</td>
                    </>}
                    <td className="px-3 py-3 text-xs">{entry.createdBy || "—"}<span className="block text-muted-foreground">{entry.createdAt ? new Date(entry.createdAt).toLocaleString("fr-FR") : "—"}</span>{entry.pendingSync && <span className="text-amber-700" title={entry.pendingSyncError || undefined}>{entry.pendingSyncStatus === "conflict" ? "Conflit à résoudre" : entry.pendingSyncStatus === "rejected" ? "À vérifier" : "En attente réseau"}</span>}</td>
                    <td className="px-3 py-3">{entry.pendingSync ? "À joindre après synchronisation" : <LogisticsAttachments entryId={entry.id} siteId={site?.id || ""} count={Number(entry.attachmentCount || 0)} />}</td>
                    <td className="px-3 py-3">{entry.pendingSync ? "—" : <LogisticsAudit entryId={entry.id} siteId={site?.id || ""} />}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimer la ligne" title="Imprimer au format 80 × 80 mm" onClick={() => printEntry(entry)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier l’enregistrement" title="Modifier l’enregistrement" disabled={entry.pendingSync || !isOnline} onClick={() => editTruck(entry)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Annuler l’enregistrement" title="Annuler l’enregistrement (conservé dans l’historique)" disabled={entry.pendingSync || !isOnline} onClick={() => void deleteTruck(entry)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredEntries.length && (
                  <tr><td colSpan={isWasteRegister ? 14 : 15} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    {entries.length ? "Aucun résultat pour cette recherche." : `Aucun enregistrement ${isWasteRegister ? "d’ordures" : "bon/facture"} pour ce site.`}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {isWasteRegister && <div className="courrier-pagination waste-flow-pagination">
          <span>{filteredEntries.length ? `Affichage de ${(currentPage - 1) * pageSize + 1} à ${Math.min(currentPage * pageSize, filteredEntries.length)} sur ${filteredEntries.length}` : "Aucun enregistrement"}</span>
          <div>
            <Button type="button" variant="outline" size="icon" aria-label="Page précédente" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className="courrier-page-number">{currentPage} / {pageCount}</span>
            <Button type="button" variant="outline" size="icon" aria-label="Page suivante" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>}
      </Panel></div>
    </div>
  );
}
