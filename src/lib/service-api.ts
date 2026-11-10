import { API_URL } from "@/lib/api";
import type { VisitorRecord } from "@/types/visitor";
import {
  cacheLogisticsEntries,
  getCachedLogisticsEntries,
  getCachedApiResponse,
  getCachedDocumentFile,
  getQueuedLogisticsWrites,
  cacheApiResponse,
  cacheDocumentFile,
  queueLogisticsWrite,
  updateQueuedLogisticsWrite,
  removeQueuedLogisticsWrite,
} from "@/lib/offline-logistics";

const apiBaseUrl = API_URL;
const tokenKey = "securitec-access-token";
const logisticsSyncs = new Map<string, Promise<{ synced: number; pending: number }>>();
const madagascarTime = () => new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Indian/Antananarivo",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}).format(new Date());

class ApiResponseError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiResponseError";
    this.status = status;
  }
}

function pendingLogisticsEntry(item: { requestId: string; siteId: string; payload: Record<string, unknown>; createdAt: string; status?: "pending" | "conflict" | "rejected"; lastError?: string }): any {
  return {
    ...item.payload,
    id: `pending-${item.requestId}`,
    clientRequestId: item.requestId,
    siteId: item.siteId,
    date: item.payload.date || item.payload.dateOperation || item.createdAt.slice(0, 10),
    createdAt: item.createdAt,
    pendingSync: true,
    pendingSyncStatus: item.status || "pending",
    pendingSyncError: item.lastError,
  };
}

export interface KeyTrackingEntry {
  id: string | number;
  date: string;
  lastName: string;
  firstName: string;
  matricule: string;
  keyType: string;
  quantity: number;
  departureTime: string;
  returnTime: string | null;
  notReturned: boolean;
  returnDate: string | null;
  returnerLastName: string | null;
  returnerFirstName: string | null;
  returnerMatricule: string | null;
  lieu: string | null;
  observations: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface EmergencyContact {
  id: string;
  siteId: string;
  nom: string;
  fonction: string;
  telephone: string;
  email: string | null;
  instructions: string | null;
  ordre: number;
}

export interface AdminPost {
  id: string;
  siteId: string;
  siteName: string;
  nom: string;
  actif: boolean;
  serviceCount: number;
  reportCount: number;
}

export interface SiteService {
  id: string;
  siteId: string;
  siteName: string;
  nom: string;
  departement: string;
  responsable: string;
  actif: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt: string | null;
  createdAt: string;
  siteId: string;
  entityId: string | null;
}

export interface AccessBadge {
  id: string;
  uid: string;
  holder: string;
  zone: string;
  level: string;
  active: boolean;
  siteBanned: boolean;
  validite: string;
}

export interface EmptyBottleDelivery {
  id: string;
  date: string;
  type: "BOUTEILLES_VIDES";
  heureArrivee: string;
  heureFin: string | null;
  immatriculationVehicule: string;
  nomChauffeur: string | null;
  numeroTitre: string;
  plomb: string | null;
  provenance: string;
  poids: string | number;
  brut?: string | number | null;
  tare?: string | number | null;
  net?: string | number | null;
  observation?: string | null;
  clientFournisseur?: string | null;
  produit?: string | null;
  remarque?: string | null;
  detailsBouteilles: { designation: string; quantite: number }[];
  siteName: string;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface PondBrutEntry {
  id: string;
  fluxId: string;
  date: string;
  vehicule: string;
  brut: string | number;
  tare: string | number;
  net: string | number;
  observation?: string;
  clientFournisseur: string;
  produit: string;
  remarque: string;
  siteName: string;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface VehicleMovement {
  id: string;
  plate: string;
  type?: string;
  category: string;
  ownerName: string;
  passengersEntry: number | string;
  passengersOut: number | null;
  entryDate: string;
  entryTime: string;
  exitDate?: string | null;
  exitTime: string | null;
  entered_at: string;
  exited_at: string | null;
  siteId?: string | null;
  site_name?: string | null;
  annuleLe?: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface CourrierMovement {
  id: string;
  date: string;
  heureEntree: string;
  prenom: string;
  designation: string;
  nombre: number;
  heureSortie: string | null;
  siteId: string;
  siteName: string;
  annuleLe?: string | null;
  updatedAt?: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface SubcontractorMaterialMovement {
  id: string;
  date: string;
  heureEntree: string;
  materiels: string;
  nombre: number;
  entreprise: string;
  providerId: string;
  provider: string;
  heureSortie: string | null;
  siteId: string;
  siteName?: string;
  createdAt?: string;
  annuleLe?: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface StarMaterialItem {
  designation: string;
  nombre: number;
}

export interface StarMaterialEntry {
  id: string;
  date: string;
  heureEntree: string;
  prenom: string;
  matricule: string;
  providerId: string;
  provider: string;
  items: StarMaterialItem[];
  heureSortie: string | null;
  siteId: string;
  siteName: string;
  annuleLe?: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface Provider {
  id: string;
  name: string;
  active: boolean;
  employeeCount: number;
  materialCount: number;
}

export interface EmployeeRecord {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  providerId: string;
  provider: string;
  active: boolean;
  siteId: string | null;
  siteName: string | null;
}

export interface SiteDocument {
  id: string;
  name: string;
  extension: string;
  mimeType: string;
  size: number;
  category: string;
  createdAt: string;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface ChauffeurRecord {
  id: string;
  nomPrenom: string;
  telephone: string | null;
  cin: string | null;
  numeroPermis: string | null;
  expirationPermis: string | null;
  vehicule: string | null;
  matricule: string | null;
  providerId: string | null;
  provider?: string | null;
  siteId: string;
  createdAt: string;
}

export interface TransporteurRecord {
  id: string;
  nomTransporteur: string;
  vehicule: string;
  matricule: string | null;
  telephone: string | null;
  chauffeur: string | null;
  observation: string | null;
  siteId: string;
  createdAt: string;
}

export interface VigilanceEntry {
  id: string;
  typePoint: string;
  elementVerifie: string;
  statut: string;
  observations: string | null;
  heure: string;
  agentNom: string;
  createdAt: string;
  siteId: string;
  siteName: string;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export type VisitorQuestionnaireAnswer = "ENY" | "TSIA" | "";

export interface VisitorQuestionnaireData {
  code: string;
  version: string;
  page: string;
  firstName: string;
  lastName: string;
  factory: string;
  date: string;
  reason: string;
  origin: "MADAGASCAR" | "OTHER" | "";
  originPlace: string;
  originOther: string;
  visitTime: string;
  entryTime: string;
  exitTime: string;
  answers: Record<"1" | "2" | "3" | "4" | "5" | "6", VisitorQuestionnaireAnswer>;
  agreement: boolean;
  visitorSignature: string;
  securitySignature: string;
  managerSignature: string;
}

export interface VisitorQuestionnaireRecord {
  id: string;
  data: VisitorQuestionnaireData;
  siteId: string;
  siteName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface ObjectDeclarationData {
  date: string;
  entryTime: string;
  exitTime: string;
  firstName: string;
  company: string;
  vehicleNumber: string;
  objects: string;
  entryAgent: string;
  exitAgent: string;
  referenceNumber: string;
}

export interface ObjectDeclarationRecord {
  id: string;
  data: ObjectDeclarationData;
  siteId: string;
  siteName: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface AlcoholCheck {
  id: string;
  date: string;
  heure: string;
  matricule: string;
  personne: string;
  demandeur: string | null;
  fonction: string;
  resultat: "Positif" | "Négatif";
  tauxMesure: string | number | null;
  civilite: "Monsieur" | "Madame";
  typeAppareil: "Electronique" | "Ballon";
  testeurNom: string | null;
  testeurMatricule: string | null;
  testeurFonction: string | null;
  temoinNom: string | null;
  temoinMatricule: string | null;
  temoinFonction: string | null;
  temoin2Nom: string | null;
  temoin2Matricule: string | null;
  temoin2Fonction: string | null;
  siteId: string;
  siteName: string;
  annuleLe?: string | null;
  updatedAt?: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface StarParticulierLoading {
  id: string;
  date: string;
  type: "CHARGEMENT";
  typeChargement: "STAR" | "PARTICULIER" | "PALETTE";
  heureDebut: string | null;
  heureSortie: string;
  camion: string;
  immatriculationVehicule: string;
  proprietaire: string;
  nomChauffeur: string;
  designation: string;
  quantiteTexte: string;
  poids: string | number;
  destinataire: string;
  provenance: string;
  lp: string;
  titre: string;
  plomb: string;
  siteId: string;
  siteName: string;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface TruckChecklistRow {
  vehicle: string;
  carrier: string;
  controlTime: string;
  checks: Record<"starts" | "chocks" | "tires" | "leaks" | "cover" | "sideboards", "" | "OK" | "NOK">;
  signature: string;
  observation: string;
  decision: "" | "Autorisé" | "Interdit";
}

export interface TruckChecklist {
  id: string;
  date: string;
  rows: TruckChecklistRow[];
}

export interface EmployeeByMatricule {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  prestataire: string | null;
  section?: string;
}

export interface RegisterEmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  section: string;
  providerId?: string;
  prestataire?: string;
  siteId?: string;
  siteName?: string;
}

export interface WasteScrapRegisterEntry {
  id: string;
  date: string;
  heure: string;
  prenom: string;
  matricule: string;
  section: string;
  designation?: string;
  observation?: string;
  nombre?: number;
  motif?: string;
  siteId: string;
}

export interface BicycleMovement {
  id: string;
  date: string;
  heureEntree: string;
  heureSortie: string | null;
  matricule: string;
  prenom: string;
  section: string;
  marqueVelo: string;
  siteId: string;
  annuleLe?: string | null;
  updatedAt?: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface MotorcycleMovement {
  id: string;
  date: string;
  heureEntree: string;
  moto: string;
  observation: string;
  heureSortie: string | null;
  siteId: string;
  annuleLe?: string | null;
  updatedAt?: string | null;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface ApsPostConfiguration {
  name: string;
  count: number;
}

export interface ApsMovementEvent {
  id: string;
  date: string;
  heureEntree: string;
  mouvement: string;
  observation: string;
  heureSortie: string | null;
  siteId: string;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface CameraRecord {
  id: string;
  name: string;
  streamUrl: string;
  status: "EN_SERVICE" | "MAINTENANCE";
  zoneId: string;
  zoneName: string;
  siteId: string;
  siteName: string;
  accessLevel: number;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export interface CameraZone {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  accessLevel: number;
  pendingSync?: boolean;
}

export interface ApsServiceHandover {
  id: string;
  date: string;
  materiel: string;
  chaineEst: string;
  chaineOuest: string;
  clesRendus: string;
  clesNonRendus: string;
  etatDesLieux: string;
  consigne: string;
  evenement: string;
  remarque: string;
  cpDescendantMatricule: string;
  cpMontantMatricule: string;
  controleur: string;
  siteId: string;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
}

export type ApsServiceHandoverInput = Omit<ApsServiceHandover, "id" | "controleur">;

export interface ApsMovementAgent {
  nom: string;
  matricule: string;
}

export type ApsMovementData = Record<string, ApsMovementAgent[]>;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(tokenKey);
  const userId = sessionStorage.getItem("securitec-session-user-id");
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = result.debug ? `${result.error || `Erreur API (${response.status})`} - ${result.debug}` : result.error || `Erreur API (${response.status})`;
      throw new ApiResponseError(message, response.status);
    }
    if (method === "GET" && userId) {
      try {
        await cacheApiResponse(userId, path, result);
      } catch {
        // A failed local cache must not turn a successful server response into a failed request.
      }
    }
    return result as T;
  } catch (error) {
    if (method === "GET" && userId && (!navigator.onLine || error instanceof TypeError)) {
      const cached = await getCachedApiResponse<T>(userId, path).catch(() => null);
      if (cached !== null) return cached;
    }
    throw error;
  }
}

export function requestCachedApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init);
}

const body = (data: unknown): string => {
  if (data && typeof data === "object" && !Array.isArray(data) && typeof window !== "undefined") {
    const payload = data as Record<string, unknown>;
    const siteId = typeof payload.siteId === "string" ? payload.siteId : "";
    if (siteId) {
      const posteId = typeof payload.posteId === "string" ? payload.posteId : localStorage.getItem(`securitec-active-post:${siteId}`);
      const scopedPayload = posteId && !payload.posteId ? { ...payload, posteId } : payload;
      if (posteId && !Object.prototype.hasOwnProperty.call(scopedPayload, "priseDePosteId")) {
        const activeServiceId = localStorage.getItem(`securitec-active-shift:${siteId}:${posteId}`);
        if (activeServiceId) return JSON.stringify({ ...scopedPayload, priseDePosteId: activeServiceId });
      }
      if (scopedPayload !== payload) return JSON.stringify(scopedPayload);
    }
  }
  return JSON.stringify(data);
};

function addClientRequestId(data: unknown, requestId: string): Record<string, unknown> {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>), clientRequestId: requestId };
  }
  return { clientRequestId: requestId };
}

function isNetworkFailure(error: unknown): boolean {
  return !(error instanceof ApiResponseError) && (!navigator.onLine || error instanceof TypeError);
}

function pendingDocument(item: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>[number]): SiteDocument {
  const file = item.files[0];
  const name = file?.name || String(item.payload.name || "document");
  return {
    id: `pending-${item.requestId}`,
    name,
    extension: name.split(".").pop()?.toLowerCase() || "",
    mimeType: file?.type || "application/octet-stream",
    size: file?.blob.size || Number(item.payload.size || 0),
    category: String(item.payload.category || "Autre"),
    createdAt: item.createdAt,
    pendingSync: true,
    pendingSyncStatus: item.status || "pending",
    pendingSyncError: item.lastError,
  };
}

function applyPendingLogisticsWrites<T extends { id: string }>(
  entries: T[],
  queued: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>,
): T[] {
  let result = [...entries];
  for (const item of queued.sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const path = item.path || "";
    if (path === "/logistics" && (item.method || "POST") === "POST") {
      result.unshift(pendingLogisticsEntry(item) as T);
      continue;
    }
    if (!path.startsWith("/logistics/") || path.includes("/attachments")) continue;
    const id = path.match(/^\/logistics\/(?:empty-bottles\/|star-particulier\/)?([^/?]+)/)?.[1];
    if (!id) continue;
    const entryId = decodeURIComponent(id);
    if (item.method === "DELETE") {
      result = result.filter((entry) => entry.id !== entryId);
    } else if (item.method === "PUT") {
      result = result.map((entry) => entry.id === entryId
        ? { ...entry, ...item.payload, pendingSync: true, pendingSyncStatus: item.status || "pending", pendingSyncError: item.lastError } as T
        : entry);
    }
  }
  return result;
}

function pendingVisitor(item: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>[number]): VisitorRecord {
  const entryDate = String(item.payload.entryDate || item.payload.entry_date || item.createdAt.slice(0, 10));
  const entryTime = String(item.payload.entryTime || item.payload.entry_time || item.createdAt.slice(11, 16));
  return {
    ...item.payload,
    id: `pending-${item.requestId}`,
    site_id: item.siteId,
    full_name: String(item.payload.full_name || ""),
    company: String(item.payload.company || ""),
    reason: String(item.payload.reason || ""),
    entered_at: `${entryDate}T${entryTime}:00`,
    exited_at: null,
    pendingSync: true,
    pendingSyncStatus: item.status || "pending",
    pendingSyncError: item.lastError,
  } as VisitorRecord;
}

function applyPendingVisitorWrites(
  entries: VisitorRecord[],
  queued: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>,
): VisitorRecord[] {
  let result = [...entries];
  for (const item of queued.filter((entry) => entry.path === "/visitors" || entry.path?.startsWith("/visitors/"))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const path = item.path || "";
    if (path === "/visitors" && item.method === "POST") {
      result.unshift(pendingVisitor(item));
      continue;
    }
    const id = path.match(/^\/visitors\/([^/?]+)/)?.[1];
    if (!id) continue;
    const visitorId = decodeURIComponent(id);
    if (item.method === "DELETE") {
      if (item.status === "conflict" || item.status === "rejected") {
        result = result.map((entry) => entry.id === visitorId
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : entry);
      } else {
        result = result.filter((entry) => entry.id !== visitorId);
      }
    } else if (item.method === "PUT") {
      result = result.map((entry) => entry.id === visitorId
        ? item.status === "conflict" || item.status === "rejected"
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : {
          ...entry,
          full_name: String(item.payload.full_name || entry.full_name),
          company: String(item.payload.company || ""),
          reason: String(item.payload.reason || ""),
          badge: String(item.payload.badge || ""),
          entered_at: `${String(item.payload.entryDate || "")}T${String(item.payload.entryTime || "")}:00`,
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        }
        : entry);
    } else if (item.method === "PATCH" && path.endsWith("/exit")) {
      result = result.map((entry) => entry.id === visitorId
        ? item.status === "conflict" || item.status === "rejected"
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : {
          ...entry,
          exited_at: item.createdAt,
          exit_notes: item.payload.extraEquipment ? `Autre matériel déclaré à la sortie : ${item.payload.extraEquipment}` : "Sortie visiteur enregistrée.",
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        }
        : entry);
    }
  }
  return result;
}

function pendingVehicle(item: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>[number]): VehicleMovement {
  const date = String(item.payload.date || item.createdAt.slice(0, 10));
  const time = String(item.payload.entryTime || item.createdAt.slice(11, 16));
  return {
    ...item.payload,
    id: `pending-${item.requestId}`,
    plate: String(item.payload.plate || ""),
    category: String(item.payload.category || ""),
    ownerName: String(item.payload.ownerName || ""),
    passengersEntry: Number(item.payload.passengersEntry || 0),
    passengersOut: null,
    entryDate: date,
    entryTime: time,
    entered_at: `${date}T${time}:00`,
    exited_at: null,
    siteId: item.siteId,
    pendingSync: true,
    pendingSyncStatus: item.status || "pending",
    pendingSyncError: item.lastError,
  } as VehicleMovement;
}

function applyPendingVehicleWrites(
  entries: VehicleMovement[],
  queued: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>,
): VehicleMovement[] {
  let result = [...entries];
  for (const item of queued.filter((entry) => entry.path === "/vehicles" || entry.path?.startsWith("/vehicles/"))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const path = item.path || "";
    if (path === "/vehicles" && item.method === "POST") {
      result.unshift(pendingVehicle(item));
      continue;
    }
    const id = path.match(/^\/vehicles\/([^/?]+)/)?.[1];
    if (!id) continue;
    const vehicleId = decodeURIComponent(id);
    if (item.method === "PUT") {
      result = result.map((entry) => entry.id === vehicleId
        ? item.status === "conflict" || item.status === "rejected"
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : {
          ...entry,
          plate: String(item.payload.plate || entry.plate),
          ownerName: String(item.payload.ownerName || entry.ownerName),
          category: String(item.payload.category || entry.category),
          passengersEntry: Number(item.payload.passengersEntry ?? entry.passengersEntry),
          entryDate: String(item.payload.date || entry.entryDate),
          entryTime: String(item.payload.entryTime || entry.entryTime),
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        }
        : entry);
    } else if (item.method === "PATCH" && path.endsWith("/exit")) {
      result = result.map((entry) => entry.id === vehicleId
        ? item.status === "conflict" || item.status === "rejected"
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : {
          ...entry,
          exited_at: item.createdAt,
          exitDate: item.createdAt.slice(0, 10),
          exitTime: item.createdAt.slice(11, 16),
          passengersOut: item.payload.passengersOut == null ? entry.passengersOut : Number(item.payload.passengersOut),
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        }
        : entry);
    } else if (item.method === "DELETE") {
      result = result.map((entry) => entry.id === vehicleId
        ? item.status === "conflict" || item.status === "rejected"
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : { ...entry, annuleLe: item.createdAt, pendingSync: true, pendingSyncStatus: item.status || "pending", pendingSyncError: item.lastError }
        : entry);
    }
  }
  return result;
}

function pendingSubcontractorMaterial(item: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>[number]): SubcontractorMaterialMovement {
  return {
    id: `pending-${item.requestId}`,
    date: String(item.payload.date || item.createdAt.slice(0, 10)),
    heureEntree: String(item.payload.heureEntree || item.createdAt.slice(11, 16)),
    materiels: String(item.payload.materiels || ""),
    nombre: Number(item.payload.nombre || 0),
    entreprise: String(item.payload.providerName || ""),
    providerId: String(item.payload.prestataireId || ""),
    provider: String(item.payload.providerName || ""),
    heureSortie: null,
    siteId: item.siteId,
    createdAt: item.createdAt,
    pendingSync: true,
    pendingSyncStatus: item.status || "pending",
    pendingSyncError: item.lastError,
  };
}

function applyPendingSubcontractorMaterials(
  entries: SubcontractorMaterialMovement[],
  queued: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>,
): SubcontractorMaterialMovement[] {
  let result = [...entries];
  for (const item of queued.filter((entry) => entry.path === "/materiels-sous-traitant" || entry.path?.startsWith("/materiels-sous-traitant/"))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const path = item.path || "";
    if (path === "/materiels-sous-traitant" && item.method === "POST") {
      result.unshift(pendingSubcontractorMaterial(item));
      continue;
    }
    const id = path.match(/^\/materiels-sous-traitant\/([^/?]+)/)?.[1];
    if (!id) continue;
    const entryId = decodeURIComponent(id);
    if (item.method === "DELETE") {
      if (item.status === "conflict" || item.status === "rejected") {
        result = result.map((entry) => entry.id === entryId
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : entry);
      } else {
        result = result.map((entry) => entry.id === entryId
          ? { ...entry, annuleLe: item.createdAt, pendingSync: true, pendingSyncStatus: "pending" }
          : entry);
      }
    } else if (item.method === "PUT") {
      result = result.map((entry) => entry.id === entryId
        ? item.status === "conflict" || item.status === "rejected"
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : {
            ...entry,
            date: String(item.payload.date || entry.date),
            heureEntree: String(item.payload.heureEntree || entry.heureEntree),
            materiels: String(item.payload.materiels || ""),
            nombre: Number(item.payload.nombre || 0),
            providerId: String(item.payload.prestataireId || entry.providerId),
            provider: String(item.payload.providerName || entry.provider),
            entreprise: String(item.payload.providerName || entry.entreprise),
            pendingSync: true,
            pendingSyncStatus: "pending",
          }
        : entry);
    } else if (item.method === "PATCH" && path.endsWith("/sortie")) {
      result = result.map((entry) => entry.id === entryId
        ? item.status === "conflict" || item.status === "rejected"
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : { ...entry, heureSortie: String(item.payload.heureSortie || item.createdAt.slice(11, 16)), pendingSync: true, pendingSyncStatus: "pending" }
        : entry);
    }
  }
  return result;
}

function pendingStarMaterial(item: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>[number]): StarMaterialEntry {
  return {
    id: `pending-${item.requestId}`,
    date: String(item.payload.date || item.createdAt.slice(0, 10)),
    heureEntree: String(item.payload.heureEntree || item.createdAt.slice(11, 16)),
    prenom: String(item.payload.prenom || ""),
    matricule: String(item.payload.matricule || ""),
    providerId: String(item.payload.prestataireId || ""),
    provider: String(item.payload.providerName || ""),
    items: Array.isArray(item.payload.items) ? item.payload.items as StarMaterialItem[] : [],
    heureSortie: null,
    siteId: item.siteId,
    siteName: String(item.payload.siteName || ""),
    pendingSync: true,
    pendingSyncStatus: item.status || "pending",
    pendingSyncError: item.lastError,
  };
}

function applyPendingStarMaterials(
  entries: StarMaterialEntry[],
  queued: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>,
): StarMaterialEntry[] {
  let result = [...entries];
  for (const item of queued.filter((entry) => entry.path === "/materiels-star" || entry.path?.startsWith("/materiels-star/"))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const path = item.path || "";
    if (path === "/materiels-star" && item.method === "POST") {
      result.unshift(pendingStarMaterial(item));
      continue;
    }
    const id = path.match(/^\/materiels-star\/([^/?]+)/)?.[1];
    if (!id) continue;
    const entryId = decodeURIComponent(id);
    if (item.method === "DELETE") {
      if (item.status === "conflict" || item.status === "rejected") {
        result = result.map((entry) => entry.id === entryId
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : entry);
      } else {
        result = result.map((entry) => entry.id === entryId
          ? { ...entry, annuleLe: item.createdAt, pendingSync: true, pendingSyncStatus: "pending" }
          : entry);
      }
    } else if (item.method === "PUT") {
      result = result.map((entry) => entry.id === entryId
        ? item.status === "conflict" || item.status === "rejected"
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : {
            ...entry,
            date: String(item.payload.date || entry.date),
            heureEntree: String(item.payload.heureEntree || entry.heureEntree),
            prenom: String(item.payload.prenom || entry.prenom),
            matricule: String(item.payload.matricule || entry.matricule),
            providerId: String(item.payload.prestataireId || entry.providerId),
            provider: String(item.payload.providerName || entry.provider),
            items: Array.isArray(item.payload.items) ? item.payload.items as StarMaterialItem[] : entry.items,
            pendingSync: true,
            pendingSyncStatus: "pending",
          }
        : entry);
    } else if (item.method === "PATCH" && path.endsWith("/sortie")) {
      result = result.map((entry) => entry.id === entryId
        ? item.status === "conflict" || item.status === "rejected"
          ? { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError }
          : { ...entry, heureSortie: String(item.payload.heureSortie || item.createdAt.slice(11, 16)), pendingSync: true, pendingSyncStatus: "pending" }
        : entry);
    }
  }
  return result;
}

function applyPendingStarLoadings(
  entries: StarParticulierLoading[],
  queued: Awaited<ReturnType<typeof getQueuedLogisticsWrites>>,
): StarParticulierLoading[] {
  let result = [...entries];
  for (const item of queued.filter((entry) => entry.path?.startsWith("/logistics/star-particulier"))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))) {
    const path = item.path || "";
    if (path === "/logistics/star-particulier" && item.method === "POST") {
      result.unshift(pendingLogisticsEntry(item) as StarParticulierLoading);
      continue;
    }
    const id = path.match(/^\/logistics\/star-particulier\/([^/?]+)/)?.[1];
    if (!id) continue;
    const entryId = decodeURIComponent(id);
    if (item.method === "DELETE") result = result.filter((entry) => entry.id !== entryId);
    else if (item.method === "PUT") {
      result = result.map((entry) => entry.id === entryId
        ? { ...entry, ...item.payload, pendingSync: true, pendingSyncStatus: item.status || "pending", pendingSyncError: item.lastError }
        : entry);
    }
  }
  return result;
}

async function uploadDocumentRequest(siteId: string, file: File, category: string): Promise<SiteDocument> {
  const token = sessionStorage.getItem(tokenKey);
  const headers = new Headers({
    "Content-Type": file.type || "application/octet-stream",
    "X-Site-Id": siteId,
    "X-File-Name": encodeURIComponent(file.name),
    "X-File-Category": category,
  });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBaseUrl}/documents`, { method: "POST", headers, body: file });
  const result = await response.json().catch(() => ({})) as { document?: SiteDocument; error?: string };
  if (!response.ok) throw new ApiResponseError(result.error || `Erreur API (${response.status})`, response.status);
  if (!result.document) throw new Error("La réponse du serveur ne contient pas le document importé.");
  return result.document;
}

async function queueDocumentUpload(
  siteId: string,
  file: File,
  category: string,
  link?: { kind: "logistics"; entryId: string } | { kind: "registry"; entity: string; recordId: string },
): Promise<SiteDocument> {
  const requestId = crypto.randomUUID();
  await queueLogisticsWrite(requestId, siteId, {
    siteId,
    name: file.name,
    category,
    ...(link ? { link } : {}),
  }, [file], "/documents");
  return pendingDocument({
    requestId,
    siteId,
    userId: sessionStorage.getItem("securitec-session-user-id") || "",
    path: "/documents",
    method: "POST",
    payload: { siteId, name: file.name, category, ...(link ? { link } : {}) },
    files: [{ name: file.name, type: file.type, lastModified: file.lastModified, blob: file }],
    createdAt: new Date().toISOString(),
  });
}

export const serviceApi = {
  async listUsers() { return (await request<{ users: { id: string; name: string; identifier: string; role: number; siteId: string | null; siteName: string | null }[] }>("/users")).users; },
  async createUser(data: { name: string; identifier: string; role: number; pin: string; siteId: string | null }) { return (await request<{ user: { id: string; name: string; identifier: string; role: number; siteId: string | null; siteName: string | null } }>("/users", { method: "POST", body: body(data) })).user; },
  async updateUser(id: string, data: { name: string; identifier: string; role: number; pin?: string; siteId: string | null }) { return (await request<{ user: { id: string; name: string; identifier: string; role: number; siteId: string | null; siteName: string | null } }>(`/users/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).user; },
  async deleteUser(id: string) { return request<{ id: string; deleted: boolean }>(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async listChauffeurs(siteId: string) { return (await request<{ chauffeurs: ChauffeurRecord[] }>(`/chauffeurs?siteId=${encodeURIComponent(siteId)}`)).chauffeurs; },
  async createChauffeur(data: Omit<ChauffeurRecord, "id" | "siteId" | "createdAt" | "provider"> & { siteId: string }) {
    return (await request<{ chauffeur: ChauffeurRecord }>("/chauffeurs", { method: "POST", body: body(data) })).chauffeur;
  },
  async updateChauffeur(id: string, data: Omit<ChauffeurRecord, "id" | "siteId" | "createdAt" | "provider"> & { siteId: string }) {
    return (await request<{ chauffeur: ChauffeurRecord }>(`/chauffeurs/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).chauffeur;
  },
  async deleteChauffeur(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/chauffeurs/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async listTransporteurs(siteId: string) {
    return (await request<{ transporteurs: TransporteurRecord[] }>(`/transporteurs?siteId=${encodeURIComponent(siteId)}`)).transporteurs;
  },
  async createTransporteur(data: Omit<TransporteurRecord, "id" | "siteId" | "createdAt"> & { siteId: string }) {
    return (await request<{ transporteur: TransporteurRecord }>("/transporteurs", { method: "POST", body: body(data) })).transporteur;
  },
  async updateTransporteur(id: string, data: Omit<TransporteurRecord, "id" | "siteId" | "createdAt"> & { siteId: string }) {
    return (await request<{ transporteur: TransporteurRecord }>(`/transporteurs/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).transporteur;
  },
  async deleteTransporteur(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/transporteurs/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async listDocuments(siteId: string) {
    const queued = await getQueuedLogisticsWrites(siteId);
    let documents: SiteDocument[] = [];
    try {
      documents = (await request<{ documents: SiteDocument[] }>(`/documents?siteId=${encodeURIComponent(siteId)}`)).documents;
    } catch (error) {
      if (!(error instanceof TypeError) || !queued.some((item) => item.path === "/documents")) throw error;
    }
    const deletedIds = new Set(queued.filter((item) => item.method === "DELETE" && item.path?.startsWith("/documents/"))
      .map((item) => item.path?.split("/").pop() || ""));
    return [...queued.filter((item) => item.path === "/documents").map(pendingDocument),
      ...documents.filter((document) => !deletedIds.has(document.id))];
  },
  async uploadDocument(siteId: string, file: File, category: string) {
    try {
      return await uploadDocumentRequest(siteId, file, category);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      return queueDocumentUpload(siteId, file, category);
    }
  },
  async downloadDocument(id: string) {
    const token = sessionStorage.getItem(tokenKey);
    const userId = sessionStorage.getItem("securitec-session-user-id");
    if (id.startsWith("pending-")) {
      const queued = (await getQueuedLogisticsWrites()).find((item) => item.requestId === id.slice("pending-".length));
      const file = queued?.files[0];
      if (file) return { blob: file.blob, name: file.name };
    }
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    try {
      const response = await fetch(`${apiBaseUrl}/documents/${encodeURIComponent(id)}`, { headers });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Erreur API (${response.status})`);
      }
      const disposition = response.headers.get("Content-Disposition") || "";
      const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const name = encoded ? decodeURIComponent(encoded) : "document";
      const blob = await response.blob();
      if (userId) {
        try {
          await cacheDocumentFile(userId, id, blob, name);
        } catch (error) {
          console.warn("Le document téléchargé n’a pas pu être enregistré pour une consultation hors ligne.", error);
        }
      }
      return { blob, name };
    } catch (error) {
      if (!(error instanceof TypeError) || !userId) throw error;
      const cached = await getCachedDocumentFile(userId, id);
      if (cached) return cached;
      throw error;
    }
  },
  async listRegistryAttachments(entity: string, recordId: string) {
    const queued = await getQueuedLogisticsWrites();
    let attachments: Array<{ id: string; documentId: string; name: string; extension: string; size: number; linkedAt: string }> = [];
    try {
      attachments = (await request<{ attachments: typeof attachments }>(`/register-attachments?entity=${encodeURIComponent(entity)}&recordId=${encodeURIComponent(recordId)}`)).attachments;
    } catch (error) {
      const hasQueuedChange = queued.some((item) => {
        const link = item.payload.link as { kind?: string; entity?: string; recordId?: string } | undefined;
        return (item.path === "/documents" && link?.kind === "registry" && link.entity === entity && link.recordId === recordId)
          || (item.path === "/register-attachments" && item.payload.entity === entity && item.payload.recordId === recordId);
      });
      if (!(error instanceof TypeError) || !hasQueuedChange) throw error;
    }
    const pendingUploads = queued.filter((item) => {
      const link = item.payload.link as { kind?: string; entity?: string; recordId?: string } | undefined;
      return item.path === "/documents" && link?.kind === "registry" && link.entity === entity && link.recordId === recordId;
    }).map((item) => ({
      id: `pending-${item.requestId}`,
      documentId: `pending-${item.requestId}`,
      name: item.files[0]?.name || String(item.payload.name || "document"),
      extension: (item.files[0]?.name || "").split(".").pop()?.toLowerCase() || "",
      size: item.files[0]?.blob.size || 0,
      linkedAt: item.createdAt,
    }));
    const pendingLinks = queued.filter((item) => item.path === "/register-attachments"
      && item.method === "POST" && item.payload.entity === entity && item.payload.recordId === recordId)
      .map((item) => ({
        id: `pending-${item.requestId}`,
        documentId: String(item.payload.documentId || ""),
        name: String(item.payload.name || "Document à associer"),
        extension: String(item.payload.name || "").split(".").pop()?.toLowerCase() || "",
        size: Number(item.payload.size || 0),
        linkedAt: item.createdAt,
      }));
    const pendingDeletes = new Set(queued.filter((item) => item.method === "DELETE" && item.path?.startsWith("/register-attachments/"))
      .map((item) => item.path?.split("/").pop() || ""));
    return [...pendingUploads, ...pendingLinks, ...attachments.filter((item) => !pendingDeletes.has(item.id))];
  },
  async linkRegistryAttachment(entity: string, recordId: string, documentId: string, siteId?: string | null) {
    if (documentId.startsWith("pending-")) {
      const requestId = documentId.slice("pending-".length);
      const item = (await getQueuedLogisticsWrites()).find((entry) => entry.requestId === requestId);
      if (!item || item.path !== "/documents") throw new Error("Le document en attente est introuvable.");
      await updateQueuedLogisticsWrite(requestId, { payload: { ...item.payload, link: { kind: "registry", entity, recordId } } });
      return { linked: true, id: `pending-${requestId}`, pendingSync: true };
    }
    const requestId = crypto.randomUUID();
    const payload = { entity, recordId, documentId, siteId: siteId || "" };
    try {
      return await request<{ linked: boolean; id: string | null }>("/register-attachments", { method: "POST", body: body(payload) });
    } catch (error) {
      if (!(error instanceof TypeError) || !siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], "/register-attachments");
      return { linked: true, id: `pending-${requestId}`, pendingSync: true };
    }
  },
  async addRegistryAttachment(entity: string, recordId: string, siteId: string, file: File) {
    let document: SiteDocument;
    try {
      document = await uploadDocumentRequest(siteId, file, "Pièce de registre");
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      document = await queueDocumentUpload(siteId, file, "Pièce de registre", { kind: "registry", entity, recordId });
      return document;
    }
    await serviceApi.linkRegistryAttachment(entity, recordId, document.id, siteId);
    return document;
  },
  async unlinkRegistryAttachment(id: string, siteId?: string | null) {
    if (id.startsWith("pending-")) {
      await serviceApi.discardPendingOfflineWrite(id.slice("pending-".length));
      return { id, unlinked: true, pendingSync: true };
    }
    const requestId = crypto.randomUUID();
    const path = `/register-attachments/${encodeURIComponent(id)}`;
    try {
      return await request<{ id: string; unlinked: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError) || !siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId }, [], path, "DELETE");
      return { id, unlinked: true, pendingSync: true };
    }
  },
  async listLogisticsAttachments(entryId: string, siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    const queued = await getQueuedLogisticsWrites(siteId);
    let attachments: SiteDocument[] = [];
    try {
      attachments = (await request<{ attachments: SiteDocument[] }>(`/logistics/${encodeURIComponent(entryId)}/attachments${query}`)).attachments;
    } catch (error) {
      const hasQueuedChange = queued.some((item) => {
        const link = item.payload.link as { kind?: string; entryId?: string } | undefined;
        return (item.path === "/documents" && link?.kind === "logistics" && link.entryId === entryId)
          || item.path === `/logistics/${encodeURIComponent(entryId)}/attachments`;
      });
      if (!(error instanceof TypeError) || !hasQueuedChange) throw error;
    }
    const pending = queued.filter((item) => {
      const link = item.payload.link as { kind?: string; entryId?: string } | undefined;
      return (item.path === "/documents" && link?.kind === "logistics" && link.entryId === entryId)
        || (item.path === `/logistics/${encodeURIComponent(entryId)}/attachments` && item.method === "POST");
    }).map((item) => item.path === "/documents"
      ? pendingDocument(item)
      : { ...pendingDocument(item), id: String(item.payload.documentId || `pending-${item.requestId}`) });
    return [...pending, ...attachments];
  },
  async linkLogisticsDocument(entryId: string, documentId: string, siteId: string) {
    if (documentId.startsWith("pending-")) {
      const requestId = documentId.slice("pending-".length);
      const item = (await getQueuedLogisticsWrites(siteId)).find((entry) => entry.requestId === requestId);
      if (!item || item.path !== "/documents") throw new Error("Le document en attente est introuvable.");
      await updateQueuedLogisticsWrite(requestId, { payload: { ...item.payload, link: { kind: "logistics", entryId } } });
      return { linked: true, pendingSync: true };
    }
    const requestId = crypto.randomUUID();
    const path = `/logistics/${encodeURIComponent(entryId)}/attachments`;
    const payload = { documentId, siteId };
    try {
      return await request<{ linked: boolean }>(path, { method: "POST", body: body(payload) });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path);
      return { linked: true, pendingSync: true };
    }
  },
  async addLogisticsAttachment(entryId: string, siteId: string, file: File, category = "Flux logistique") {
    let document: SiteDocument;
    try {
      document = await uploadDocumentRequest(siteId, file, category);
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      document = await queueDocumentUpload(siteId, file, category, { kind: "logistics", entryId });
      return document;
    }
    await serviceApi.linkLogisticsDocument(entryId, document.id, siteId);
    return document;
  },
  async listLogisticsAudit(entryId: string, siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    return (await request<{ entries: { id: string; action: string; createdAt: string; createdBy: string | null; before: Record<string, unknown>; after: Record<string, unknown> }[] }>(`/logistics/${encodeURIComponent(entryId)}/audit${query}`)).entries;
  },
  async deleteDocument(id: string, siteId?: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) {
      await serviceApi.discardPendingOfflineWrite(id.slice("pending-".length));
      return { id, deleted: true, pendingSync: true };
    }
    const path = `/documents/${encodeURIComponent(id)}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError) || !siteId) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async listSites() { return request<{ sites: { id: string; name: string; type: "USINE" | "AGENCE" }[]; canCreate: boolean; canDelete: boolean }>("/sites"); },
  async listAdminPosts() { return (await request<{ posts: AdminPost[] }>("/admin/posts")).posts; },
  async createAdminPost(data: { siteId: string; nom: string }) { return (await request<{ post: AdminPost }>("/admin/posts", { method: "POST", body: body(data) })).post; },
  async updateAdminPost(id: string, data: { nom: string; actif: boolean }) { return (await request<{ post: AdminPost }>(`/admin/posts/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).post; },
  async deleteAdminPost(id: string) { return request<{ id: string; deactivated: boolean }>(`/admin/posts/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async listSiteServices() { return (await request<{ services: SiteService[] }>("/site-services")).services; },
  async createSiteService(data: Omit<SiteService, "id" | "siteName" | "actif">) { return (await request<{ service: SiteService }>("/site-services", { method: "POST", body: body(data) })).service; },
  async updateSiteService(id: string, data: Omit<SiteService, "id" | "siteName">) { return (await request<{ service: SiteService }>(`/site-services/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).service; },
  async deleteSiteService(id: string) { return request<{ id: string; deactivated: boolean }>(`/site-services/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async listEmergencyContacts(siteId: string) { return (await request<{ contacts: EmergencyContact[] }>(`/emergency-contacts?siteId=${encodeURIComponent(siteId)}`)).contacts; },
  async createEmergencyContact(data: Omit<EmergencyContact, "id" | "ordre">) { return (await request<{ contact: EmergencyContact }>("/emergency-contacts", { method: "POST", body: body(data) })).contact; },
  async updateEmergencyContact(id: string, data: Omit<EmergencyContact, "id" | "ordre">) { return (await request<{ contact: EmergencyContact }>(`/emergency-contacts/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).contact; },
  async deleteEmergencyContact(id: string, siteId: string) { return request<{ id: string; deactivated: boolean }>(`/emergency-contacts/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" }); },
  async createSite(data: { name: string; type: "USINE" | "AGENCE"; address?: string }) { return (await request<{ site: { id: string; name: string; type: "USINE" | "AGENCE" } }>("/sites", { method: "POST", body: body(data) })).site; },
  async archiveSite(id: string) { return request<{ id: string; archived: boolean }>(`/sites/${id}`, { method: "DELETE" }); },
  async listShifts(siteId?: string, options: { includePending?: boolean } = {}) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    const result = await request<{ shifts?: any[] } | any[]>(`/shifts${query}`);
    const shifts = Array.isArray(result) ? result : result.shifts || [];
    if (!options.includePending) return shifts;
    const queued = await getQueuedLogisticsWrites(siteId);
    for (const item of queued) {
      if (item.path === "/shifts") {
        const data = item.payload;
        const pendingId = `pending-${item.requestId}`;
        shifts.unshift({
          id: pendingId,
          serviceId: pendingId,
          clientRequestId: item.requestId,
          matricule: data.chefMatricule,
          nom: data.nom,
          prenom: data.prenom,
          prestataire: data.prestataire || "",
          site_de_travail: data.site_de_travail || "",
          siteId: item.siteId,
          posteId: data.posteId,
          posteNom: data.posteNom,
          shiftType: data.shiftType,
          fonctionService: "CHEF",
          started_at: item.createdAt,
          ended_at: null,
          pendingAgentCount: Array.isArray(data.agentMatricules) ? data.agentMatricules.length + 1 : 1,
          pendingSync: true,
          pendingSyncAction: "open",
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        });
      } else if (item.path?.startsWith("/shifts/") && item.path.endsWith("/end")) {
        const serviceId = decodeURIComponent(item.path.split("/")[2] || "");
        for (const shift of shifts.filter((row) => row.serviceId === serviceId || row.id === serviceId)) {
          shift.pendingSync = true;
          shift.pendingSyncAction = "end";
          shift.pendingSyncStatus = item.status || "pending";
          shift.pendingSyncError = item.lastError;
        }
      }
    }
    return shifts;
  },
  async listShiftPosts(siteId: string) {
    return (await request<{ posts: { id: string; nom: string }[] }>(`/shifts/posts?siteId=${encodeURIComponent(siteId)}`)).posts;
  },
  async deleteShift(id: string) {
    return request<{ deleted: boolean; serviceId: string; deletedFluxCount: number }>(`/shifts/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async startShift(data: Record<string, unknown>) {
    const siteId = String(data.siteId || "");
    if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId({
      ...data,
      agentName: `${String(data.prenom || "").trim()} ${String(data.nom || "").trim()}`.trim(),
      matricule: String(data.matricule || data.chefMatricule || ""),
      providerName: String(data.prestataire || "Non renseigné"),
      siteName: String(data.site_de_travail || ""),
      postName: String(data.posteNom || ""),
      observations: String(data.notes || ""),
    }, requestId);
    try {
      return await request<any>("/shifts", { method: "POST", body: JSON.stringify(payload) });
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      if (!siteId) throw new Error("Un site est nécessaire pour enregistrer la prise de poste hors connexion.");
      await queueLogisticsWrite(requestId, siteId, payload, [], "/shifts", "POST");
      const pendingId = `pending-${requestId}`;
      return {
        serviceId: pendingId,
        posteId: data.posteId,
        posteNom: data.posteNom,
        shiftType: data.shiftType,
        pendingSync: true,
        shifts: [{
          id: pendingId,
          serviceId: pendingId,
          matricule: data.chefMatricule,
          nom: data.nom,
          prenom: data.prenom,
          prestataire: data.prestataire || "",
          site_de_travail: data.site_de_travail || "",
          siteId,
          posteId: data.posteId,
          posteNom: data.posteNom,
          shiftType: data.shiftType,
          fonctionService: "CHEF",
          started_at: new Date().toISOString(),
          ended_at: null,
          pendingAgentCount: Array.isArray(data.agentMatricules) ? data.agentMatricules.length + 1 : 1,
          pendingSync: true,
          pendingSyncAction: "open",
          pendingSyncStatus: "pending",
        }],
      };
    }
  },
  async endShift(id: string, siteId: string) {
    if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const requestId = crypto.randomUUID();
    const payload = { clientRequestId: requestId };
    try {
      return await request<any>(`/shifts/${encodeURIComponent(id)}/end`, {
        method: "PUT",
        body: body(payload),
      });
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      if (!siteId) throw new Error("Un site est nécessaire pour enregistrer la clôture hors connexion.");
      await queueLogisticsWrite(requestId, siteId, payload, [], `/shifts/${encodeURIComponent(id)}/end`, "PUT");
      return { id, ended_at: new Date().toISOString(), pendingSync: true };
    }
  },
  async listHandovers(siteId?: string) {
    if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const result = await request<any[]>("/handovers");
    const handovers = Array.isArray(result) ? result : [];
    const queued = await getQueuedLogisticsWrites(siteId);
    for (const item of queued) {
      if (item.path !== "/handovers/complete") continue;
      const data = item.payload;
      handovers.unshift({
        id: `pending-${item.requestId}`,
        agent_sortant_nom: data.agent_sortant_nom,
        agent_sortant_prenom: data.agent_sortant_prenom,
        agent_sortant_matricule: data.agent_sortant_matricule,
        incoming_nom: data.incoming_nom,
        incoming_prenom: data.incoming_prenom,
        incoming_matricule: data.incoming_matricule,
        equipment: data.equipment,
        ongoing_events: data.ongoing_events,
        instructions: data.instructions,
        inventaire: data.inventaire,
        documents_retenus: data.documents_retenus,
        confirmation_sortant: data.confirmation_sortant,
        confirmation_entrant: data.confirmation_entrant,
        poste_nom: data.shiftData && typeof data.shiftData === "object" ? (data.shiftData as Record<string, unknown>).posteNom : "",
        site_id: item.siteId,
        created_at: item.createdAt,
        pendingSync: true,
        pendingSyncStatus: item.status || "pending",
        pendingSyncError: item.lastError,
      });
    }
    return handovers;
  },
  async completeHandover(data: Record<string, unknown>, siteId: string) {
    if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    try {
      return await request<any>("/handovers/complete", { method: "POST", body: body(payload) });
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      if (!siteId) throw new Error("Un site est nécessaire pour enregistrer la passation hors connexion.");
      await queueLogisticsWrite(requestId, siteId, payload, [], "/handovers/complete", "POST");
      return { pendingSync: true, clientRequestId: requestId };
    }
  },
  async listPassations() { return (await request<{ passations: any[] }>("/passations")).passations; },
  async createPassation(data: unknown) { return (await request<{ passation: any }>("/passations", { method: "POST", body: body(data) })).passation; },
  async listJournalConsignes(siteId: string, activeOnly = false) {
    const params = new URLSearchParams({ siteId });
    if (activeOnly) params.set("activeOnly", "true");
    return (await request<{ entries: any[] }>(`/consignes-journal?${params}`)).entries;
  },
  async listNotifications(): Promise<AppNotification[]> {
    return (await request<{ notifications: AppNotification[] }>("/notifications")).notifications;
  },
  async markNotificationRead(id: string) {
    return request<{ notification: any }>(`/notifications/${encodeURIComponent(id)}/read`, { method: "PATCH", body: "{}" });
  },
  async createJournalConsigne(data: unknown) {
    return (await request<{ entry: any }>("/consignes-journal", { method: "POST", body: body(data) })).entry;
  },
  async updateJournalConsigne(id: string, data: unknown) {
    return (await request<{ entry: any }>(`/consignes-journal/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async acknowledgeJournalConsigne(id: string, siteId: string, posteId: string) {
    return (await request<{ receipt: { consigneId: string; posteId: string; readAt: string } }>(`/consignes-journal/${encodeURIComponent(id)}/read`, { method: "POST", body: body({ siteId, posteId }) })).receipt;
  },
  async deleteJournalConsigne(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/consignes-journal/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async listVisitors(siteId?: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const queued = await getQueuedLogisticsWrites(siteId);
    const path = `/visitors${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`;
    let entries: VisitorRecord[] = [];
    try {
      entries = (await request<{ visitors: VisitorRecord[] }>(path)).visitors;
    } catch (error) {
      if (!(error instanceof TypeError) || !queued.some((item) => item.path === "/visitors" || item.path?.startsWith("/visitors/"))) throw error;
    }
    return applyPendingVisitorWrites(entries, queued);
  },
  async createVisitor(data: unknown) {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    const serialized = body(payload);
    try {
      return (await request<{ visitor: VisitorRecord }>("/visitors", { method: "POST", body: serialized })).visitor;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const queuedPayload = JSON.parse(serialized) as Record<string, unknown>;
      const siteId = String(queuedPayload.siteId || "");
      if (!siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, queuedPayload, [], "/visitors");
      return pendingVisitor({
        requestId, userId: sessionStorage.getItem("securitec-session-user-id") || "", siteId,
        path: "/visitors", method: "POST", payload: queuedPayload, files: [],
        createdAt: new Date().toISOString(),
      });
    }
  },
  async updateVisitor(id: string, data: unknown) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de l’entrée visiteur avant de la modifier.");
    const path = `/visitors/${encodeURIComponent(id)}`;
    const payload = JSON.parse(body(data)) as Record<string, unknown>;
    try {
      return (await request<{ visitor: VisitorRecord }>(path, { method: "PUT", body: JSON.stringify(payload) })).visitor;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const siteId = String(payload.siteId || "");
      if (!siteId) throw error;
      const requestId = crypto.randomUUID();
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PUT");
      return {
        id,
        full_name: String(payload.full_name || ""),
        company: String(payload.company || ""),
        reason: String(payload.reason || ""),
        badge: String(payload.badge || ""),
        entered_at: `${String(payload.entryDate || "")}T${String(payload.entryTime || "")}:00`,
        pendingSync: true,
        pendingSyncStatus: "pending" as const,
      };
    }
  },
  async deleteVisitor(id: string, siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    if (id.startsWith("pending-")) {
      await removeQueuedLogisticsWrite(id.slice("pending-".length));
      return { id, deleted: true, pendingSync: true };
    }
    const path = `/visitors/${encodeURIComponent(id)}${query}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError) || !siteId) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async setVisitorSiteBan(id: string, siteId: string, banned: boolean) {
    return request<{ visitorId: string; siteId: string; banned: boolean }>(`/visitors/${encodeURIComponent(id)}/site-ban`, { method: "PUT", body: body({ siteId, banned }) });
  },
  async exitVisitor(id: string, data: unknown, siteId?: string): Promise<Partial<VisitorRecord>> {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de l’entrée visiteur avant d’enregistrer sa sortie.");
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    const path = `/visitors/${encodeURIComponent(id)}/exit${query}`;
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(JSON.parse(body(data)), requestId);
    const serialized = body(payload);
    try {
      return (await request<{ visitor: VisitorRecord }>(path, { method: "PATCH", body: serialized })).visitor;
    } catch (error) {
      if (!(error instanceof TypeError) || !siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PATCH");
      return { id, exited_at: new Date().toISOString(), pendingSync: true, pendingSyncStatus: "pending" };
    }
  },
  async listVehicles(siteId?: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const queued = await getQueuedLogisticsWrites(siteId);
    const path = `/vehicles${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`;
    let entries: VehicleMovement[] = [];
    try {
      entries = (await request<{ vehicles: VehicleMovement[] }>(path)).vehicles;
    } catch (error) {
      if (!(error instanceof TypeError) || !queued.some((item) => item.path === "/vehicles" || item.path?.startsWith("/vehicles/"))) throw error;
    }
    return applyPendingVehicleWrites(entries, queued);
  },
  async createVehicle(data: unknown) {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    const serialized = body(payload);
    try {
      return (await request<{ vehicle: VehicleMovement }>("/vehicles", { method: "POST", body: serialized })).vehicle;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const queuedPayload = JSON.parse(serialized) as Record<string, unknown>;
      const siteId = String(queuedPayload.siteId || "");
      if (!siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, queuedPayload, [], "/vehicles");
      return pendingVehicle({
        requestId, userId: sessionStorage.getItem("securitec-session-user-id") || "", siteId,
        path: "/vehicles", method: "POST", payload: queuedPayload, files: [],
        createdAt: new Date().toISOString(),
      });
    }
  },
  async updateVehicle(id: string, data: unknown) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement véhicule avant de le modifier.");
    const path = `/vehicles/${encodeURIComponent(id)}`;
    const payload = JSON.parse(body(data)) as Record<string, unknown>;
    try {
      return (await request<{ vehicle: VehicleMovement }>(path, { method: "PUT", body: JSON.stringify(payload) })).vehicle;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const siteId = String(payload.siteId || "");
      if (!siteId) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, payload, [], path, "PUT");
      return {
        id,
        plate: String(payload.plate || ""),
        category: String(payload.category || ""),
        ownerName: String(payload.ownerName || ""),
        passengersEntry: Number(payload.passengersEntry || 0),
        passengersOut: payload.passengersOut == null ? null : Number(payload.passengersOut),
        entryDate: String(payload.date || ""),
        entryTime: String(payload.entryTime || ""),
        exitTime: payload.exitTime == null ? null : String(payload.exitTime),
        entered_at: `${String(payload.date || "")}T${String(payload.entryTime || "")}:00`,
        exited_at: null,
        pendingSync: true,
        pendingSyncStatus: "pending" as const,
      };
    }
  },
  async deleteVehicle(id: string, siteId: string): Promise<{ id: string; deleted: boolean; cancelled?: boolean; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) {
      await removeQueuedLogisticsWrite(id.slice("pending-".length));
      return { id, deleted: false, cancelled: true, pendingSync: true };
    }
    const path = `/vehicles/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`;
    try {
      return await request<{ id: string; deleted: boolean; cancelled?: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: false, cancelled: true, pendingSync: true };
    }
  },
  async exitVehicle(id: string, passengersOut?: number, siteId?: string) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de l’entrée véhicule avant d’enregistrer sa sortie.");
    const params = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    const path = `/vehicles/${encodeURIComponent(id)}/exit${params}`;
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(passengersOut === undefined ? {} : { passengersOut }, requestId);
    const serialized = body(payload);
    try {
      return (await request<{ vehicle: Partial<VehicleMovement> }>(path, { method: "PATCH", body: serialized })).vehicle;
    } catch (error) {
      if (!(error instanceof TypeError) || !siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PATCH");
      return { id, exited_at: new Date().toISOString(), passengersOut: passengersOut ?? null, pendingSync: true };
    }
  },
  async listBadges() {
    return request<AccessBadge[]>("/badges");
  },
  async scanBadge(uid: string) {
    return request<{ allowed: boolean; title: string; text: string; badge?: AccessBadge }>("/badges/scan", {
      method: "POST",
      body: body({ uid }),
    });
  },
  async updateBadgeStatus(id: string, active: boolean) {
    return request<AccessBadge>(`/badges/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: body({ active }),
    });
  },
  async listKeyTypes() { return (await request<{ keyTypes: string[] }>("/access-control/key-types")).keyTypes; },
  async listKeyEmployees(keyType: string, siteId: string) {
    const params = new URLSearchParams({ keyType, siteId });
    return (await request<{ employees: { id: string; firstName: string; lastName: string; matricule: string; role: string }[] }>(`/access-control/key-employees?${params}`)).employees;
  },
  async listKeyTracking(siteId: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const entries = (await request<{ entries: KeyTrackingEntry[] }>(`/access-control/keys?siteId=${encodeURIComponent(siteId)}`)).entries;
    const queued = await getQueuedLogisticsWrites(siteId);
    const pending = queued
      .filter((entry) => entry.path === "/access-control/keys")
      .map((item) => ({
        ...item.payload,
        id: `pending-${item.requestId}`,
        date: String(item.payload.date || item.createdAt.slice(0, 10)),
        lastName: String(item.payload.lastName || ""),
        firstName: String(item.payload.firstName || ""),
        matricule: String(item.payload.matricule || ""),
        keyType: String(item.payload.keyType || ""),
        quantity: Number(item.payload.quantity || 0),
        departureTime: String(item.payload.departureTime || ""),
        returnTime: item.payload.returnTime ? String(item.payload.returnTime) : null,
        notReturned: Boolean(item.payload.notReturned),
        returnDate: item.payload.returnDate ? String(item.payload.returnDate) : null,
        returnerLastName: item.payload.returnerLastName ? String(item.payload.returnerLastName) : null,
        returnerFirstName: item.payload.returnerFirstName ? String(item.payload.returnerFirstName) : null,
        returnerMatricule: item.payload.returnerMatricule ? String(item.payload.returnerMatricule) : null,
        lieu: String(item.payload.lieu || ""),
        observations: item.payload.observations ? String(item.payload.observations) : null,
        pendingSync: true,
        pendingSyncStatus: item.status || "pending",
        pendingSyncError: item.lastError,
      })) as KeyTrackingEntry[];
    const pendingActions = entries.map((entry) => {
      const queuedAction = queued.find((item) => item.path === `/access-control/keys/${entry.id}/return` ||
        item.path === `/access-control/keys/${entry.id}/not-returned`);
      if (!queuedAction) return entry;
      const notReturnedAction = queuedAction.path?.endsWith("/not-returned");
      return {
        ...entry,
        ...(notReturnedAction ? {
          notReturned: true,
          observations: String(queuedAction.payload.observations || "Clés non rendu"),
        } : {
          returnDate: String(queuedAction.payload.returnDate || entry.returnDate || ""),
          returnTime: String(queuedAction.payload.returnTime || entry.returnTime || ""),
        }),
        pendingSync: true,
        pendingSyncStatus: queuedAction.status || "pending",
        pendingSyncError: queuedAction.lastError,
      };
    });
    return [...pending, ...pendingActions];
  },
  async createKeyTracking(data: { date: string; employeeId: string; lastName: string; firstName: string; matricule: string; keyType: string; quantity: number; departureTime: string; siteId: string; lieu: string; observations?: string; returnDate?: string; returnTime?: string; returnerLastName?: string; returnerFirstName?: string; returnerMatricule?: string; notReturned?: boolean }) {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return (await request<{ entry: KeyTrackingEntry }>("/access-control/keys", { method: "POST", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/access-control/keys");
      return {
        ...data,
        id: `pending-${requestId}`,
        returnTime: null,
        notReturned: false,
        returnDate: null,
        returnerLastName: null,
        returnerFirstName: null,
        returnerMatricule: null,
        observations: null,
        pendingSync: true,
      };
    }
  },
  async returnKeyTracking(id: string | number, data: { returnDate: string; returnTime: string; siteId: string; returnerType: "same" | "other"; returnerEmployeeId?: string }) {
    if (String(id).startsWith("pending-")) throw new Error("Attendez la synchronisation de la sortie avant d’enregistrer le retour.");
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    const path = `/access-control/keys/${encodeURIComponent(String(id))}/return`;
    try {
      return (await request<{ entry: Pick<KeyTrackingEntry, "id" | "returnDate" | "returnTime" | "returnerLastName" | "returnerFirstName" | "returnerMatricule"> }>(path, { method: "PATCH", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], path, "PATCH");
      return {
        id,
        returnDate: data.returnDate,
        returnTime: data.returnTime,
        returnerLastName: null,
        returnerFirstName: null,
        returnerMatricule: null,
      };
    }
  },
  async markKeyTrackingNotReturned(id: string | number, data: { observations: string; siteId: string }) {
    if (String(id).startsWith("pending-")) throw new Error("Attendez la synchronisation de la sortie avant de signaler la clé non rendue.");
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    const path = `/access-control/keys/${encodeURIComponent(String(id))}/not-returned`;
    try {
      return (await request<{ entry: Pick<KeyTrackingEntry, "id" | "observations" | "notReturned"> }>(path, { method: "PATCH", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], path, "PATCH");
      return { id, observations: data.observations || "Clés non rendu", notReturned: true };
    }
  },
  async listBreathTests(siteId?: string) { return (await request<{ entries: any[] }>(`/access-control/breath-tests${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async createBreathTest(data: unknown) { return (await request<{ entry: any }>("/access-control/breath-tests", { method: "POST", body: body(data) })).entry; },
  async listAlcoholChecks(siteId: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const entries = (await request<{ entries: AlcoholCheck[] }>(`/access-control/alcohol-checks?siteId=${encodeURIComponent(siteId)}`)).entries;
    const queued = await getQueuedLogisticsWrites(siteId);
    const pending = queued
      .filter((item) => item.path === "/access-control/alcohol-checks")
      .map((item) => {
        const payload = item.payload as unknown as Omit<AlcoholCheck, "id" | "siteName">;
        return {
          ...payload,
          id: `pending-${item.requestId}`,
          siteId,
          siteName: String(item.payload.siteName || ""),
          annuleLe: null,
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        };
      });
    const pendingMutations = entries.map((entry) => {
      const path = `/access-control/alcohol-checks/${encodeURIComponent(entry.id)}`;
      const operation = queued.filter((item) => item.path?.split("?")[0] === path).slice(-1)[0];
      if (!operation) return entry;
      const deleted = operation.method === "DELETE";
      return {
        ...entry,
        ...(deleted ? { annuleLe: operation.createdAt } : operation.payload),
        pendingSync: true,
        pendingSyncStatus: operation.status || "pending",
        pendingSyncError: operation.lastError,
      };
    });
    return [...pending, ...pendingMutations];
  },
  async createAlcoholCheck(data: Omit<AlcoholCheck, "id" | "siteName">) {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return (await request<{ entry: AlcoholCheck }>("/access-control/alcohol-checks", { method: "POST", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/access-control/alcohol-checks");
      return {
        ...data,
        id: `pending-${requestId}`,
        siteName: "",
        annuleLe: null,
        pendingSync: true,
      };
    }
  },
  async updateAlcoholCheck(id: string, data: Omit<AlcoholCheck, "id" | "siteName">, expectedUpdatedAt?: string | null) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du contrôle avant de le modifier.");
    const requestId = crypto.randomUUID();
    const payload = { ...data, expectedUpdatedAt: expectedUpdatedAt || null, clientRequestId: requestId };
    const path = `/access-control/alcohol-checks/${encodeURIComponent(id)}`;
    try {
      return (await request<{ entry: AlcoholCheck }>(path, { method: "PUT", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], path, "PUT");
      return { ...data, id, siteName: "", updatedAt: expectedUpdatedAt || null, pendingSync: true };
    }
  },
  async deleteAlcoholCheck(id: string, siteId: string, expectedUpdatedAt?: string | null): Promise<{ id: string; deleted: boolean; cancelled?: boolean; annuleLe?: string; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du contrôle avant de l’annuler.");
    const requestId = crypto.randomUUID();
    const params = new URLSearchParams({ siteId });
    if (expectedUpdatedAt) params.set("expectedUpdatedAt", expectedUpdatedAt);
    const path = `/access-control/alcohol-checks/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean; cancelled?: boolean; annuleLe?: string }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId, expectedUpdatedAt: expectedUpdatedAt || null }, [], path, "DELETE");
      return { id, deleted: false, cancelled: true, annuleLe: new Date().toISOString(), pendingSync: true };
    }
  },
  async listLogistics(siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    try {
      if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
      const entries = (await request<{ entries: any[] }>(`/logistics${query}`)).entries;
      if (siteId) await cacheLogisticsEntries(siteId, entries);
      return applyPendingLogisticsWrites(entries, await getQueuedLogisticsWrites(siteId));
    } catch (error) {
      if (!siteId) throw error;
      const [cached, pending] = await Promise.all([
        getCachedLogisticsEntries(siteId), getQueuedLogisticsWrites(siteId),
      ]);
      if (!cached.length && !pending.length) throw error;
      return applyPendingLogisticsWrites(cached, pending);
    }
  },
  async listPondBrut(siteId: string) {
    const params = new URLSearchParams({ siteId });
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let entries: PondBrutEntry[] = [];
    try {
      entries = (await request<{ entries: PondBrutEntry[] }>(`/pond-brut?${params}`)).entries;
    } catch (error) {
      if (navigator.onLine && !(error instanceof TypeError)) throw error;
    }
    const pending = (await getQueuedLogisticsWrites(siteId))
      .filter((item) => (!item.path || item.path === "/logistics") && item.payload.type === "BOUTEILLES_VIDES" && item.payload.pondBrut)
      .map((item) => {
        const pondBrut = item.payload.pondBrut as Record<string, unknown>;
        return {
          id: `pending-${item.requestId}`,
          fluxId: `pending-${item.requestId}`,
          date: String(item.payload.date || item.createdAt.slice(0, 10)),
          vehicule: String(item.payload.immatriculationVehicule || ""),
          brut: String(pondBrut.brut || ""),
          tare: String(pondBrut.tare || ""),
          net: String(pondBrut.net || ""),
          observation: String(pondBrut.remarque || ""),
          clientFournisseur: String(pondBrut.clientFournisseur || ""),
          produit: String(pondBrut.produit || ""),
          remarque: String(pondBrut.remarque || ""),
          siteName: String(item.payload.siteName || ""),
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        } as PondBrutEntry;
      });
    return [...pending, ...entries];
  },
  async getTruckChecklist(siteId: string, date: string) {
    const params = new URLSearchParams({ siteId, date });
    return (await request<{ entry: TruckChecklist | null }>(`/truck-checklists?${params}`)).entry;
  },
  async saveTruckChecklist(data: { siteId: string; date: string; rows: TruckChecklistRow[] }) {
    return (await request<{ entry: TruckChecklist }>("/truck-checklists", { method: "PUT", body: body(data) })).entry;
  },
  async createLogistics(data: unknown, files: File[] = []) {
    const payload = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
    const requestId = crypto.randomUUID();
    try {
      const result = await request<{ entry?: any; entries?: any[] }>("/logistics", {
        method: "POST", body: body({ ...payload, clientRequestId: requestId }),
      });
      const attachmentErrors: string[] = [];
      if (result.entry) {
        for (const file of files) {
          try {
            await serviceApi.addLogisticsAttachment(String(result.entry.id), String(payload.siteId || ""), file);
          } catch (error) {
            attachmentErrors.push(error instanceof Error ? error.message : `Impossible d’ajouter ${file.name}.`);
          }
        }
      }
      return { ...result, attachmentErrors };
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const siteId = String(payload.siteId || "");
      if (!siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, files);
      return {
        entry: pendingLogisticsEntry({ requestId, siteId, payload, createdAt: new Date().toISOString() }),
        attachmentErrors: [],
      };
    }
  },
  async syncPendingLogistics(siteId?: string) {
    if (!navigator.onLine) return { synced: 0, pending: (await getQueuedLogisticsWrites(siteId)).length };
    const syncKey = siteId || "*";
    const activeSync = logisticsSyncs.get(syncKey);
    if (activeSync) return activeSync;
    const sync = (async () => {
      const queued = (await getQueuedLogisticsWrites(siteId)).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      let synced = 0;
      for (const item of queued) {
        if (item.status && item.status !== "pending") break;
        try {
          if (item.path === "/documents") {
            const queuedFile = item.files[0];
            if (!queuedFile) throw new Error("Le fichier associé à cette saisie hors ligne est introuvable.");
            const document = await uploadDocumentRequest(
              item.siteId,
              new File([queuedFile.blob], queuedFile.name, { type: queuedFile.type, lastModified: queuedFile.lastModified }),
              String(item.payload.category || "Autre"),
            );
            const link = item.payload.link as { kind?: string; entity?: string; recordId?: string; entryId?: string } | undefined;
            if (link?.kind === "logistics" && link.entryId) {
              const path = `/logistics/${encodeURIComponent(link.entryId)}/attachments`;
              const payload = { documentId: document.id, siteId: item.siteId, name: queuedFile.name, size: queuedFile.blob.size };
              await updateQueuedLogisticsWrite(item.requestId, { path, method: "POST", payload, files: [] });
              await request(path, { method: "POST", body: body(payload) });
            } else if (link?.kind === "registry" && link.entity && link.recordId) {
              const path = "/register-attachments";
              const payload = { entity: link.entity, recordId: link.recordId, documentId: document.id, name: queuedFile.name, size: queuedFile.blob.size };
              await updateQueuedLogisticsWrite(item.requestId, { path, method: "POST", payload, files: [] });
              await request(path, { method: "POST", body: body(payload) });
            }
            await removeQueuedLogisticsWrite(item.requestId);
            synced += 1;
            continue;
          }
          const replayBody = item.path === "/vigilance"
            ? item.payload.entries
            : { ...item.payload, clientRequestId: item.requestId };
          const result = await request<{ entry?: any; visitor?: { id?: string }; vehicle?: { id?: string }; handover?: { id?: string }; camera?: { id?: string }; shift?: { serviceId?: string }; patrol?: { id?: string }; serviceId?: string; id?: string; saved?: boolean; entries?: unknown[]; linked?: boolean; unlinked?: boolean }>(item.path || "/logistics", {
            method: item.method || "POST", body: body(replayBody),
          });
          if (!result.entry?.id && !result.visitor?.id && !result.vehicle?.id && !result.handover?.id && !result.camera?.id && !result.shift?.serviceId && !result.patrol?.id && !result.serviceId && !result.id && result.saved !== true && !result.linked && !result.unlinked
            && !(Array.isArray(result.entries) && result.entries.length)) {
            throw new Error("Le serveur n’a pas confirmé la saisie hors connexion.");
          }
          if (item.path === "/patrols" && item.payload.finishAfterSync && result.patrol?.id) {
            await request<{ patrol: { id: string } }>(`/patrols/${encodeURIComponent(result.patrol.id)}/finish`, {
              method: "POST",
              body: body({ observations: item.payload.observations || "" }),
            });
          }
          for (const file of item.files) {
            const upload = await serviceApi.uploadDocument(
              item.siteId,
              new File([file.blob], file.name, { type: file.type, lastModified: file.lastModified }),
              "Flux logistique",
            );
            await serviceApi.linkLogisticsDocument(result.entry.id, upload.id, item.siteId);
          }
          await removeQueuedLogisticsWrite(item.requestId);
          synced += 1;
        } catch (error) {
          if (error instanceof ApiResponseError && error.status >= 400 && error.status < 500 && error.status !== 401 && error.status !== 403) {
            await updateQueuedLogisticsWrite(item.requestId, {
              status: error.status === 409 ? "conflict" : "rejected",
              lastError: error.message,
            });
          }
          break;
        }
      }
      return { synced, pending: (await getQueuedLogisticsWrites(siteId)).length };
    })();
    logisticsSyncs.set(syncKey, sync);
    try {
      return await sync;
    } finally {
      if (logisticsSyncs.get(syncKey) === sync) logisticsSyncs.delete(syncKey);
    }
  },
  async syncAllPendingLogistics() {
    const queued = await getQueuedLogisticsWrites();
    const siteIds = [...new Set(queued.map((entry) => entry.siteId))];
    let synced = 0;
    for (const siteId of siteIds) {
      const result = await serviceApi.syncPendingLogistics(siteId);
      synced += result.synced;
    }
    return { synced, pending: (await getQueuedLogisticsWrites()).length };
  },
  async getPendingLogisticsCount() {
    return (await getQueuedLogisticsWrites()).length;
  },
  async getRejectedOfflineWriteCount() {
    return (await getQueuedLogisticsWrites()).filter((item) => item.status && item.status !== "pending").length;
  },
  async listPendingOfflineWrites() {
    return (await getQueuedLogisticsWrites()).map(({ requestId, siteId, path, method, createdAt, status, lastError }) => ({
      requestId, siteId, path, method, createdAt, status: status || "pending", lastError,
    }));
  },
  async retryPendingOfflineWrite(requestId: string) {
    const item = (await getQueuedLogisticsWrites()).find((entry) => entry.requestId === requestId);
    if (!item) throw new Error("Cette saisie n’est plus dans la file hors ligne.");
    await updateQueuedLogisticsWrite(requestId, { status: "pending", lastError: undefined });
  },
  async discardPendingOfflineWrite(requestId: string) {
    const item = (await getQueuedLogisticsWrites()).find((entry) => entry.requestId === requestId);
    if (!item) throw new Error("Cette saisie n’est plus dans la file hors ligne.");
    await removeQueuedLogisticsWrite(requestId);
  },
  async updateTruckLogistics(id: string, type: "DECHARGEMENT" | "CHARGEMENT" | "ORDURES", data: unknown, files: File[] = []) {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    const path = `/logistics/${encodeURIComponent(id)}?type=${type}`;
    try {
      return await request<{ entry: any }>(path, { method: "PUT", body: body(payload) });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const siteId = String(payload.siteId || "");
      if (!siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, files, path, "PUT");
      return { entry: { ...payload, id, pendingSync: true, pendingSyncStatus: "pending" as const } };
    }
  },
  async deleteTruckLogistics(id: string, type: "DECHARGEMENT" | "CHARGEMENT" | "ORDURES", siteId: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    const params = new URLSearchParams({ type, siteId });
    const path = `/logistics/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, { siteId, type }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async listStarParticulierLoadings(siteId: string) {
    const query = `?siteId=${encodeURIComponent(siteId)}`;
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const queued = await getQueuedLogisticsWrites(siteId);
    let entries: StarParticulierLoading[] = [];
    try {
      entries = (await request<{ entries: StarParticulierLoading[] }>(`/logistics/star-particulier${query}`)).entries;
    } catch (error) {
      if (!(error instanceof TypeError) || !queued.some((item) => item.path?.startsWith("/logistics/star-particulier"))) throw error;
    }
    return applyPendingStarLoadings(entries, queued)
      .filter((entry) => entry.typeChargement === "STAR" || entry.typeChargement === "PARTICULIER");
  },
  async createStarParticulierLoading(data: Omit<StarParticulierLoading, "id" | "type" | "siteName" | "siteId"> & { siteId: string }) {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return (await request<{ entry: StarParticulierLoading }>("/logistics/star-particulier", { method: "POST", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/logistics/star-particulier");
      return pendingLogisticsEntry({ requestId, siteId: data.siteId, payload, createdAt: new Date().toISOString() }) as StarParticulierLoading;
    }
  },
  async updateStarParticulierLoading(id: string, data: Omit<StarParticulierLoading, "id" | "type" | "date" | "siteName" | "siteId"> & { siteId: string }) {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    const path = `/logistics/star-particulier/${encodeURIComponent(id)}`;
    try {
      return (await request<{ entry: StarParticulierLoading }>(path, { method: "PUT", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], path, "PUT");
      return { ...data, id, pendingSync: true } as StarParticulierLoading;
    }
  },
  async deleteStarParticulierLoading(id: string, siteId: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    const params = new URLSearchParams({ siteId });
    const path = `/logistics/star-particulier/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async createEmptyBottleDelivery(data: unknown) {
    const result = await serviceApi.createLogistics(data);
    return { entry: result.entry as EmptyBottleDelivery };
  },
  async updateWasteLogistics(id: string, data: unknown) {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    const path = `/logistics/${encodeURIComponent(id)}`;
    try {
      return await request<{ entry: any }>(path, { method: "PUT", body: body(payload) });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const siteId = String(payload.siteId || "");
      if (!siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PUT");
      return { entry: { ...payload, id, pendingSync: true, pendingSyncStatus: "pending" as const } };
    }
  },
  async updateMatierePremiereLogistics(id: string, data: unknown) {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    const path = `/logistics/${encodeURIComponent(id)}?type=MATIERE_PREMIERE`;
    try {
      return await request<{ entry: any }>(path, { method: "PUT", body: body(payload) });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const siteId = String(payload.siteId || "");
      if (!siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PUT");
      return { entry: { ...payload, id, pendingSync: true, pendingSyncStatus: "pending" as const } };
    }
  },
  async deleteWasteLogistics(id: string, siteId: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    const path = `/logistics/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async updateEmptyBottleDelivery(id: string, data: Omit<EmptyBottleDelivery, "id" | "siteName" | "type"> & {
    siteId: string;
    type?: string;
    pondBrut?: { brut: number; tare: number; net: number; clientFournisseur: string; produit: string; remarque: string };
    siteName?: string;
    siteType?: string;
  }) {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    const path = `/logistics/empty-bottles/${encodeURIComponent(id)}`;
    try {
      return await request<{ entry: EmptyBottleDelivery }>(path, { method: "PUT", body: body(payload) });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const siteId = String(payload.siteId || "");
      if (!siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PUT");
      return { entry: { ...data, id, type: "BOUTEILLES_VIDES" as const, pendingSync: true, pendingSyncStatus: "pending" as const } };
    }
  },
  async deleteEmptyBottleDelivery(id: string, siteId: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    const path = `/logistics/empty-bottles/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async deleteMatierePremiereLogistics(id: string, siteId: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    const params = new URLSearchParams({ siteId, type: "MATIERE_PREMIERE" });
    const path = `/logistics/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, { siteId, type: "MATIERE_PREMIERE" }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async updateDepotageFuelLogistics(id: string, data: unknown) {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    const path = `/logistics/${encodeURIComponent(id)}?type=DEPOTAGE_FUEL`;
    try {
      return await request<{ entry: any }>(path, { method: "PUT", body: body(payload) });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const siteId = String(payload.siteId || "");
      if (!siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PUT");
      return { entry: { ...payload, id, pendingSync: true, pendingSyncStatus: "pending" as const } };
    }
  },
  async deleteDepotageFuelLogistics(id: string, siteId: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    const params = new URLSearchParams({ siteId, type: "DEPOTAGE_FUEL" });
    const path = `/logistics/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(crypto.randomUUID(), siteId, { siteId, type: "DEPOTAGE_FUEL" }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async listRegisterEmployees(siteId: string) {
    return (await request<{ employees: RegisterEmployeeOption[] }>(`/employees/options?siteId=${encodeURIComponent(siteId)}`)).employees;
  },
  async listWasteScrapEntries(kind: "ordures" | "ferrailles", siteId: string) {
    const path = kind === "ordures" ? "/waste-register" : "/scrap-register";
    return (await request<{ entries: WasteScrapRegisterEntry[] }>(`${path}?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createWasteScrapEntry(kind: "ordures" | "ferrailles", data: {
    date: string; heure: string; matricule: string; siteId: string; designation?: string; observation?: string; nombre?: number; motif?: string;
  }) {
    const path = kind === "ordures" ? "/waste-register" : "/scrap-register";
    return (await request<{ entry: WasteScrapRegisterEntry }>(path, { method: "POST", body: body(data) })).entry;
  },
  async updateWasteScrapEntry(kind: "ordures" | "ferrailles", id: string, data: {
    date: string; heure: string; matricule: string; siteId: string; designation?: string; observation?: string; nombre?: number; motif?: string;
  }) {
    const path = kind === "ordures" ? "/waste-register" : "/scrap-register";
    return (await request<{ entry: WasteScrapRegisterEntry }>(`${path}/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteWasteScrapEntry(kind: "ordures" | "ferrailles", id: string, siteId: string) {
    const path = kind === "ordures" ? "/waste-register" : "/scrap-register";
    return request<{ id: string; deleted: boolean }>(`${path}/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async listBicycleMovements(siteId: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let entries: BicycleMovement[] = [];
    try { entries = (await request<{ entries: BicycleMovement[] }>(`/bicycle-movements?siteId=${encodeURIComponent(siteId)}`)).entries; }
    catch (error) { if (navigator.onLine && !(error instanceof TypeError)) throw error; }
    const queued = (await getQueuedLogisticsWrites(siteId)).filter((item) => item.path?.startsWith("/bicycle-movements"));
    const pendingCreates = queued.filter((item) => item.path === "/bicycle-movements" && item.method === "POST").map((item) => ({
      ...(item.payload as unknown as Omit<BicycleMovement, "id">), id: `pending-${item.requestId}`,
      heureSortie: null, updatedAt: null, pendingSync: true, pendingSyncStatus: item.status || "pending", pendingSyncError: item.lastError,
    })) as BicycleMovement[];
    const pendingUpdates = entries.flatMap((entry) => {
      const base = `/bicycle-movements/${encodeURIComponent(entry.id)}`;
      const op = queued.filter((item) => item.path?.split("?")[0] === base || item.path?.split("?")[0] === `${base}/sortie`).slice(-1)[0];
      if (!op) return [entry];
      if (op.method === "DELETE") return [];
      return [{ ...entry, ...(op.method === "PUT" ? op.payload : {}), ...(op.method === "PATCH" ? { heureSortie: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false }) } : {}), pendingSync: true, pendingSyncStatus: op.status || "pending", pendingSyncError: op.lastError } as BicycleMovement];
    });
    return [...pendingCreates, ...pendingUpdates];
  },
  async createBicycleMovement(data: Omit<BicycleMovement, "id" | "prenom" | "section" | "heureSortie" | "updatedAt" | "pendingSync"> & { prenom?: string; section?: string }) {
    const requestId = crypto.randomUUID(); const payload = { ...data, clientRequestId: requestId };
    try { return (await request<{ entry: BicycleMovement }>("/bicycle-movements", { method: "POST", body: body(payload) })).entry; }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/bicycle-movements");
      return { ...data, id: `pending-${requestId}`, prenom: data.prenom || "", section: data.section || "", heureSortie: null, siteName: "", pendingSync: true } as BicycleMovement;
    }
  },
  async updateBicycleMovement(id: string, data: Omit<BicycleMovement, "id" | "prenom" | "section" | "heureSortie" | "updatedAt" | "pendingSync">, expectedUpdatedAt?: string | null) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant de le modifier.");
    const requestId = crypto.randomUUID(); const payload = { ...data, expectedUpdatedAt: expectedUpdatedAt || null, clientRequestId: requestId };
    const path = `/bicycle-movements/${encodeURIComponent(id)}`;
    try { return (await request<{ entry: BicycleMovement }>(path, { method: "PUT", body: body(payload) })).entry; }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], path, "PUT");
      return { ...data, id, prenom: "", section: "", heureSortie: null, siteName: "", updatedAt: expectedUpdatedAt || null, pendingSync: true };
    }
  },
  async deleteBicycleMovement(id: string, siteId: string, expectedUpdatedAt?: string | null): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant de l’annuler.");
    const requestId = crypto.randomUUID(); const params = new URLSearchParams({ siteId, clientRequestId: requestId });
    if (expectedUpdatedAt) params.set("expectedUpdatedAt", expectedUpdatedAt);
    const path = `/bicycle-movements/${encodeURIComponent(id)}?${params}`;
    try { return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" }); }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId, expectedUpdatedAt: expectedUpdatedAt || null }, [], path, "DELETE");
      return { id, deleted: false, pendingSync: true };
    }
  },
  async recordBicycleExit(id: string, siteId: string, expectedUpdatedAt?: string | null) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant d’enregistrer sa sortie.");
    const requestId = crypto.randomUUID(); const params = new URLSearchParams({ siteId });
    const path = `/bicycle-movements/${encodeURIComponent(id)}/sortie?${params}`;
    const payload = { siteId, expectedUpdatedAt: expectedUpdatedAt || null, clientRequestId: requestId };
    try { return (await request<{ entry: BicycleMovement }>(path, { method: "PATCH", body: body(payload) })).entry; }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PATCH");
      return { id, heureSortie: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false }), updatedAt: expectedUpdatedAt || null, pendingSync: true } as BicycleMovement;
    }
  },
  async listMotorcycleMovements(siteId: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let entries: MotorcycleMovement[] = [];
    try { entries = (await request<{ entries: MotorcycleMovement[] }>(`/motorcycle-movements?siteId=${encodeURIComponent(siteId)}`)).entries; }
    catch (error) { if (navigator.onLine && !(error instanceof TypeError)) throw error; }
    const queued = (await getQueuedLogisticsWrites(siteId)).filter((item) => item.path?.startsWith("/motorcycle-movements"));
    const pendingCreates = queued.filter((item) => item.path === "/motorcycle-movements" && item.method === "POST").map((item) => ({
      ...(item.payload as unknown as Omit<MotorcycleMovement, "id">), id: `pending-${item.requestId}`,
      heureSortie: null, updatedAt: null, pendingSync: true, pendingSyncStatus: item.status || "pending", pendingSyncError: item.lastError,
    })) as MotorcycleMovement[];
    const pendingUpdates = entries.flatMap((entry) => {
      const base = `/motorcycle-movements/${encodeURIComponent(entry.id)}`;
      const op = queued.filter((item) => item.path?.split("?")[0] === base || item.path?.split("?")[0] === `${base}/sortie`).slice(-1)[0];
      if (!op) return [entry];
      if (op.method === "DELETE") return [];
      return [{ ...entry, ...(op.method === "PUT" ? op.payload : {}), ...(op.method === "PATCH" ? { heureSortie: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false }) } : {}), pendingSync: true, pendingSyncStatus: op.status || "pending", pendingSyncError: op.lastError } as MotorcycleMovement];
    });
    return [...pendingCreates, ...pendingUpdates];
  },
  async createMotorcycleMovement(data: Omit<MotorcycleMovement, "id" | "heureSortie" | "updatedAt" | "pendingSync">) {
    const requestId = crypto.randomUUID(); const payload = { ...data, clientRequestId: requestId };
    try { return (await request<{ entry: MotorcycleMovement }>("/motorcycle-movements", { method: "POST", body: body(payload) })).entry; }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/motorcycle-movements");
      return { ...data, id: `pending-${requestId}`, heureSortie: null, siteName: "", pendingSync: true } as MotorcycleMovement;
    }
  },
  async updateMotorcycleMovement(id: string, data: Omit<MotorcycleMovement, "id" | "heureSortie" | "updatedAt" | "pendingSync">, expectedUpdatedAt?: string | null) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant de le modifier.");
    const requestId = crypto.randomUUID(); const payload = { ...data, expectedUpdatedAt: expectedUpdatedAt || null, clientRequestId: requestId };
    const path = `/motorcycle-movements/${encodeURIComponent(id)}`;
    try { return (await request<{ entry: MotorcycleMovement }>(path, { method: "PUT", body: body(payload) })).entry; }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], path, "PUT");
      return { ...data, id, heureSortie: null, siteName: "", updatedAt: expectedUpdatedAt || null, pendingSync: true };
    }
  },
  async recordMotorcycleExit(id: string, siteId: string, expectedUpdatedAt?: string | null) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant d’enregistrer sa sortie.");
    const requestId = crypto.randomUUID(); const path = `/motorcycle-movements/${encodeURIComponent(id)}/sortie?siteId=${encodeURIComponent(siteId)}`;
    const payload = { siteId, expectedUpdatedAt: expectedUpdatedAt || null, clientRequestId: requestId };
    try { return (await request<{ entry: MotorcycleMovement }>(path, { method: "PATCH", body: body(payload) })).entry; }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PATCH");
      return { id, heureSortie: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false }), updatedAt: expectedUpdatedAt || null, pendingSync: true } as MotorcycleMovement;
    }
  },
  async deleteMotorcycleMovement(id: string, siteId: string, expectedUpdatedAt?: string | null): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant de l’annuler.");
    const requestId = crypto.randomUUID(); const params = new URLSearchParams({ siteId, clientRequestId: requestId });
    if (expectedUpdatedAt) params.set("expectedUpdatedAt", expectedUpdatedAt);
    const path = `/motorcycle-movements/${encodeURIComponent(id)}?${params}`;
    try { return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" }); }
    catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: false, pendingSync: true };
    }
  },
  async listLogisticsEvents(siteId?: string, type?: "ANOMALIE" | "DIVERS" | "VIOLATION_PROCEDURE") {
    const params = new URLSearchParams();
    if (siteId) params.set("siteId", siteId);
    if (type) params.set("type", type);
    const query = params.size ? `?${params.toString()}` : "";
    return (await request<{ entries: any[] }>(`/logistics/incidents${query}`)).entries;
  },
  async createLogisticsEvent(data: unknown) {
    return (await request<{ entry: any }>("/logistics/incidents", { method: "POST", body: body(data) })).entry;
  },
  async updateLogisticsIncident(id: string, siteId: string, data: unknown) {
    const params = new URLSearchParams({ siteId });
    return (await request<{ entry: any }>(`/logistics/incidents/${encodeURIComponent(id)}?${params}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteLogisticsIncident(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId });
    return request<{ id: string; deleted: boolean }>(`/logistics/incidents/${encodeURIComponent(id)}?${params}`, { method: "DELETE" });
  },
  async listPatrols(siteId?: string) {
    if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let entries: any[] = [];
    try {
      entries = (await request<{ patrols: any[] }>(`/patrols${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).patrols;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
    }
    const queued = (await getQueuedLogisticsWrites(siteId)).filter((item) => item.path?.startsWith("/patrols"));
    const pending = new Map<string, any>();
    for (const item of queued) {
      if (item.path === "/patrols") {
        const patrolId = `pending-${item.requestId}`;
        pending.set(patrolId, {
          id: patrolId,
          route_name: item.payload.routeName,
          started_at: item.createdAt,
          ended_at: null,
          checkpoints: item.payload.checkpoints || [],
          anomalies: item.payload.finishAfterSync ? String(item.payload.observations || "") : null,
          siteId: item.siteId,
          agent_id: item.userId,
          site_name: String(item.payload.siteName || ""),
          pendingSync: true,
          pendingFinish: Boolean(item.payload.finishAfterSync),
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        });
        continue;
      }
      const path = item.path || "";
      const id = decodeURIComponent(path.split("/")[2] || "");
      const patrol = entries.find((entry) => entry.id === id);
      if (patrol) {
        const next = pending.get(id) || { ...patrol };
        if (path.endsWith("/finish")) {
          next.pendingFinish = true;
          next.pendingFinishObservations = item.payload.observations || "";
        } else if (item.method === "PATCH" && Array.isArray(item.payload.checkpoints)) {
          next.checkpoints = item.payload.checkpoints;
        }
        next.pendingSync = true;
        next.pendingSyncStatus = item.status || "pending";
        next.pendingSyncError = item.lastError;
        pending.set(id, next);
      }
    }
    return [...pending.values(), ...entries.filter((entry) => !pending.has(entry.id))];
  },
  async startPatrol(data: Record<string, unknown>) {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    try {
      return (await request<{ patrol: any }>("/patrols", { method: "POST", body: body(payload) })).patrol;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      const siteId = String(data.siteId || "");
      if (!siteId) throw new Error("Un site est nécessaire pour enregistrer une ronde hors connexion.");
      await queueLogisticsWrite(requestId, siteId, payload, [], "/patrols", "POST");
      return {
        id: `pending-${requestId}`,
        route_name: data.routeName,
        started_at: new Date().toISOString(),
        ended_at: null,
        checkpoints: data.checkpoints || [],
        siteId,
        agent_id: sessionStorage.getItem("securitec-session-user-id") || "",
        pendingSync: true,
        pendingSyncStatus: "pending",
      };
    }
  },
  async updatePatrol(id: string, checkpoints: { name: string; at: string | null }[], siteId: string) {
    if (id.startsWith("pending-")) {
      const requestId = id.slice("pending-".length);
      const queued = (await getQueuedLogisticsWrites(siteId)).find((item) => item.requestId === requestId && item.path === "/patrols");
      if (!queued) throw new Error("La ronde en attente est introuvable sur cet appareil.");
      const payload = { ...queued.payload, checkpoints };
      await updateQueuedLogisticsWrite(requestId, { payload });
      return { id, checkpoints, pendingSync: true };
    }
    const path = `/patrols/${encodeURIComponent(id)}`;
    const requestId = crypto.randomUUID();
    try {
      return (await request<{ patrol: any }>(path, { method: "PATCH", body: body({ checkpoints }) })).patrol;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, siteId, { checkpoints }, [], path, "PATCH");
      return { id, checkpoints, pendingSync: true, pendingSyncStatus: "pending" };
    }
  },
  async finishPatrol(id: string, observations: string, siteId: string) {
    if (id.startsWith("pending-")) {
      const requestId = id.slice("pending-".length);
      const queued = (await getQueuedLogisticsWrites(siteId)).find((item) => item.requestId === requestId && item.path === "/patrols");
      if (!queued) throw new Error("La ronde en attente est introuvable sur cet appareil.");
      await updateQueuedLogisticsWrite(requestId, {
        payload: { ...queued.payload, finishAfterSync: true, observations },
      });
      return { id, ended_at: null, anomalies: observations, pendingSync: true, pendingFinish: true };
    }
    const path = `/patrols/${encodeURIComponent(id)}/finish`;
    const requestId = crypto.randomUUID();
    try {
      return (await request<{ patrol: any }>(path, { method: "POST", body: body({ observations }) })).patrol;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, siteId, { observations }, [], path, "POST");
      return { id, ended_at: null, pendingSync: true, pendingFinish: true, pendingSyncStatus: "pending" };
    }
  },
  async listVigilance(siteId?: string) {
    if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const entries = (await request<{ entries: VigilanceEntry[] }>(`/vigilance${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries;
    if (!siteId) return entries;
    const queued = (await getQueuedLogisticsWrites(siteId)).filter((item) => item.path === "/vigilance");
    const pending = queued.flatMap((item) => {
      const rows = Array.isArray(item.payload.entries) ? item.payload.entries : [];
      return rows.map((row) => {
        const entry = row as Record<string, unknown>;
        return {
          ...entry,
          id: `pending-${String(entry.clientRequestId || item.requestId)}`,
          siteId,
          siteName: String(entry.siteName || ""),
          createdAt: item.createdAt,
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        } as unknown as VigilanceEntry;
      });
    });
    return [...pending, ...entries];
  },
  async createVigilance(data: unknown): Promise<{ entries: any[]; pendingSync?: boolean }> {
    const entries = (Array.isArray(data) ? data : [data]).map((entry) => ({
      ...(entry && typeof entry === "object" ? JSON.parse(body(entry)) : {}),
      clientRequestId: crypto.randomUUID(),
    }));
    const siteId = typeof entries[0]?.siteId === "string" ? entries[0].siteId : "";
    try {
      return await request<{ entries: any[]; pendingSync?: boolean }>("/vigilance", { method: "POST", body: body(entries) });
    } catch (error) {
      if (!(error instanceof TypeError) || !siteId) throw error;
      const requestId = crypto.randomUUID();
      await queueLogisticsWrite(requestId, siteId, { siteId, entries }, [], "/vigilance");
      return {
        entries: entries.map((entry) => ({ ...entry, id: `pending-${entry.clientRequestId}`, siteName: "", createdAt: new Date().toISOString(), pendingSync: true })),
        pendingSync: true,
      };
    }
  },
  async listMainCourante(siteId?: string) {
    if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const entries = (await request<{ entries: any[] }>(`/main-courante${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries;
    if (!siteId) return entries;
    const pending = (await getQueuedLogisticsWrites(siteId)).filter((item) => item.path === "/main-courante");
    return [...pending.map(pendingLogisticsEntry), ...entries];
  },
  async createMainCourante(data: unknown) {
    const source = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
    const siteId = typeof source.siteId === "string" ? source.siteId : "";
    const requestId = crypto.randomUUID();
    const payload = { ...source, clientRequestId: requestId };
    try {
      return await request<{ entry: any }>("/main-courante", { method: "POST", body: body(payload) });
    } catch (error) {
      if (!(error instanceof TypeError) || !siteId) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], "/main-courante");
      return { entry: pendingLogisticsEntry({ requestId, siteId, payload, createdAt: new Date().toISOString() }) };
    }
  },
  async listCourrierMovements(siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const entries = (await request<{ entries: CourrierMovement[] }>(`/courrier-movements${query}`)).entries;
    if (!siteId) return entries;
    const queued = await getQueuedLogisticsWrites(siteId);
    const pendingCreates = queued.filter((item) => item.path === "/courrier-movements" && item.method === "POST").map((item) => {
      const payload = item.payload as unknown as Omit<CourrierMovement, "id" | "siteName">;
      return {
        ...payload,
        id: `pending-${item.requestId}`,
        siteId,
        siteName: "",
        heureSortie: null,
        updatedAt: null,
        createdAt: item.createdAt,
        pendingSync: true,
        pendingSyncStatus: item.status || "pending",
        pendingSyncError: item.lastError,
      } as CourrierMovement;
    });
    const pendingUpdates = entries.map((entry) => {
      const basePath = `/courrier-movements/${encodeURIComponent(entry.id)}`;
      const operation = queued.filter((item) => {
        const path = item.path?.split("?")[0];
        return (path === basePath || path === `${basePath}/exit`) && item.method !== "POST";
      }).slice(-1)[0];
      if (!operation) return entry;
      return {
        ...entry,
        ...(operation.method === "PUT" ? operation.payload : {}),
        ...(operation.method === "PATCH" ? { heureSortie: String(operation.payload.heureSortie || "") } : {}),
        ...(operation.method === "DELETE" ? { annuleLe: operation.createdAt } : {}),
        pendingSync: true,
        pendingSyncStatus: operation.status || "pending",
        pendingSyncError: operation.lastError,
      } as CourrierMovement;
    });
    return [...pendingCreates, ...pendingUpdates];
  },
  async createCourrierMovement(data: { date: string; heureEntree: string; prenom: string; designation: string; nombre: number; siteId: string; priseDePosteId?: string | null }): Promise<CourrierMovement> {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return (await request<{ entry: CourrierMovement }>("/courrier-movements", { method: "POST", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/courrier-movements");
      return { ...data, id: `pending-${requestId}`, siteName: "", heureSortie: null, updatedAt: null, annuleLe: null, pendingSync: true };
    }
  },
  async updateCourrierMovement(id: string, data: { date: string; heureEntree: string; prenom: string; designation: string; nombre: number; siteId: string }, expectedUpdatedAt?: string | null) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant de le modifier.");
    const requestId = crypto.randomUUID();
    const payload = { ...data, expectedUpdatedAt: expectedUpdatedAt || null, clientRequestId: requestId };
    const path = `/courrier-movements/${encodeURIComponent(id)}`;
    try {
      return (await request<{ entry: CourrierMovement }>(path, { method: "PUT", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], path, "PUT");
      return { ...data, id, siteName: "", heureSortie: null, updatedAt: expectedUpdatedAt || null, pendingSync: true };
    }
  },
  async exitCourrierMovement(id: string, siteId: string, expectedUpdatedAt?: string | null) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant d’enregistrer sa sortie.");
    const requestId = crypto.randomUUID();
    const params = new URLSearchParams({ siteId });
    const path = `/courrier-movements/${encodeURIComponent(id)}/exit?${params}`;
    const heureSortie = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });
    const payload = { siteId, expectedUpdatedAt: expectedUpdatedAt || null, clientRequestId: requestId, heureSortie };
    try {
      return (await request<{ entry: Pick<CourrierMovement, "id" | "heureSortie" | "updatedAt"> & { pendingSync?: boolean } }>(path, { method: "PATCH", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PATCH");
      return { id, heureSortie, updatedAt: expectedUpdatedAt || null, pendingSync: true };
    }
  },
  async deleteCourrierMovement(id: string, siteId: string, expectedUpdatedAt?: string | null): Promise<{ id: string; deleted: boolean; cancelled?: boolean; annuleLe?: string; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant de l’annuler.");
    const requestId = crypto.randomUUID();
    const params = new URLSearchParams({ siteId, clientRequestId: requestId });
    if (expectedUpdatedAt) params.set("expectedUpdatedAt", expectedUpdatedAt);
    const path = `/courrier-movements/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean; cancelled?: boolean; annuleLe?: string }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId, expectedUpdatedAt: expectedUpdatedAt || null }, [], path, "DELETE");
      return { id, deleted: false, cancelled: true, annuleLe: new Date().toISOString(), pendingSync: true };
    }
  },
  async listSubcontractorMaterials(siteId: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const queued = await getQueuedLogisticsWrites(siteId);
    const path = `/materiels-sous-traitant?siteId=${encodeURIComponent(siteId)}`;
    let entries: SubcontractorMaterialMovement[] = [];
    try {
      entries = (await request<{ entries: SubcontractorMaterialMovement[] }>(path)).entries;
    } catch (error) {
      if (!(error instanceof TypeError) || !queued.some((item) => item.path?.startsWith("/materiels-sous-traitant"))) throw error;
    }
    return applyPendingSubcontractorMaterials(entries, queued);
  },
  async createSubcontractorMaterial(data: { date: string; heureEntree: string; materiels: string; nombre: number; prestataireId: string; providerName?: string; siteId: string }) {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    const serialized = body(payload);
    try {
      return (await request<{ entry: SubcontractorMaterialMovement }>("/materiels-sous-traitant", { method: "POST", body: serialized })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const queuedPayload = JSON.parse(serialized) as Record<string, unknown>;
      await queueLogisticsWrite(requestId, data.siteId, queuedPayload, [], "/materiels-sous-traitant");
      return pendingSubcontractorMaterial({
        requestId, userId: sessionStorage.getItem("securitec-session-user-id") || "", siteId: data.siteId,
        path: "/materiels-sous-traitant", method: "POST", payload: queuedPayload, files: [], createdAt: new Date().toISOString(),
      });
    }
  },
  async updateSubcontractorMaterial(id: string, data: { date: string; heureEntree: string; materiels: string; nombre: number; prestataireId: string; providerName?: string; siteId: string }) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de l’entrée avant de la modifier.");
    const requestId = crypto.randomUUID();
    const payload = { ...data, updateRequestId: requestId };
    const path = `/materiels-sous-traitant/${encodeURIComponent(id)}`;
    const serialized = body(payload);
    try {
      return (await request<{ entry: SubcontractorMaterialMovement }>(path, { method: "PUT", body: serialized })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const queuedPayload = JSON.parse(serialized) as Record<string, unknown>;
      await queueLogisticsWrite(requestId, data.siteId, queuedPayload, [], path, "PUT");
      return {
        id, date: data.date, heureEntree: data.heureEntree, materiels: data.materiels, nombre: data.nombre,
        entreprise: data.providerName || "", providerId: data.prestataireId, provider: data.providerName || "",
        heureSortie: null, siteId: data.siteId, pendingSync: true, pendingSyncStatus: "pending" as const,
      };
    }
  },
  async deleteSubcontractorMaterial(id: string, siteId: string): Promise<{ id: string; deleted: boolean; cancelled?: boolean; annuleLe?: string; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) {
      await removeQueuedLogisticsWrite(id.slice("pending-".length));
      return { id, deleted: true, pendingSync: true };
    }
    const requestId = crypto.randomUUID();
    const params = new URLSearchParams({ siteId, clientRequestId: requestId });
    const path = `/materiels-sous-traitant/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean; cancelled?: boolean; annuleLe?: string }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: false, cancelled: true, annuleLe: new Date().toISOString(), pendingSync: true };
    }
  },
  async exitSubcontractorMaterial(id: string, siteId: string): Promise<Pick<SubcontractorMaterialMovement, "id" | "heureSortie"> & { pendingSync?: boolean }> {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de l’entrée avant d’enregistrer sa sortie.");
    const requestId = crypto.randomUUID();
    const heureSortie = madagascarTime();
    const params = new URLSearchParams({ siteId });
    const path = `/materiels-sous-traitant/${encodeURIComponent(id)}/sortie?${params}`;
    const payload = { clientRequestId: requestId, heureSortie };
    try {
      return (await request<{ entry: Pick<SubcontractorMaterialMovement, "id" | "heureSortie"> }>(path, { method: "PATCH", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PATCH");
      return { id, heureSortie, pendingSync: true };
    }
  },
  async listStarMaterials(siteId: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const queued = await getQueuedLogisticsWrites(siteId);
    const path = `/materiels-star?siteId=${encodeURIComponent(siteId)}`;
    let entries: StarMaterialEntry[] = [];
    try {
      entries = (await request<{ entries: StarMaterialEntry[] }>(path)).entries;
    } catch (error) {
      if (!(error instanceof TypeError) || !queued.some((item) => item.path?.startsWith("/materiels-star"))) throw error;
    }
    return applyPendingStarMaterials(entries, queued);
  },
  async createStarMaterial(data: { date: string; heureEntree: string; prenom: string; matricule: string; items: StarMaterialItem[]; prestataireId: string; providerName?: string; siteName?: string; siteId: string }) {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    const serialized = body(payload);
    try {
      return (await request<{ entry: StarMaterialEntry }>("/materiels-star", { method: "POST", body: serialized })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const queuedPayload = JSON.parse(serialized) as Record<string, unknown>;
      await queueLogisticsWrite(requestId, data.siteId, queuedPayload, [], "/materiels-star");
      return pendingStarMaterial({
        requestId, userId: sessionStorage.getItem("securitec-session-user-id") || "", siteId: data.siteId,
        path: "/materiels-star", method: "POST", payload: queuedPayload, files: [], createdAt: new Date().toISOString(),
      });
    }
  },
  async updateStarMaterial(id: string, data: { date: string; heureEntree: string; prenom: string; matricule: string; items: StarMaterialItem[]; prestataireId: string; providerName?: string; siteName?: string; siteId: string }) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de l’entrée avant de la modifier.");
    const requestId = crypto.randomUUID();
    const payload = { ...data, updateRequestId: requestId };
    const path = `/materiels-star/${encodeURIComponent(id)}`;
    const serialized = body(payload);
    try {
      return (await request<{ entry: StarMaterialEntry }>(path, { method: "PUT", body: serialized })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      const queuedPayload = JSON.parse(serialized) as Record<string, unknown>;
      await queueLogisticsWrite(requestId, data.siteId, queuedPayload, [], path, "PUT");
      return {
        id, date: data.date, heureEntree: data.heureEntree, prenom: data.prenom, matricule: data.matricule,
        providerId: data.prestataireId, provider: data.providerName || "", items: data.items,
        heureSortie: null, siteId: data.siteId, siteName: data.siteName || "",
        pendingSync: true, pendingSyncStatus: "pending" as const,
      };
    }
  },
  async deleteStarMaterial(id: string, siteId: string): Promise<{ id: string; deleted: boolean; cancelled?: boolean; annuleLe?: string; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) {
      await removeQueuedLogisticsWrite(id.slice("pending-".length));
      return { id, deleted: true, pendingSync: true };
    }
    const requestId = crypto.randomUUID();
    const params = new URLSearchParams({ siteId, clientRequestId: requestId });
    const path = `/materiels-star/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean; cancelled?: boolean; annuleLe?: string }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: false, cancelled: true, annuleLe: new Date().toISOString(), pendingSync: true };
    }
  },
  async exitStarMaterial(id: string, siteId: string): Promise<Pick<StarMaterialEntry, "id" | "heureSortie"> & { pendingSync?: boolean }> {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de l’entrée avant d’enregistrer sa sortie.");
    const requestId = crypto.randomUUID();
    const heureSortie = madagascarTime();
    const params = new URLSearchParams({ siteId });
    const path = `/materiels-star/${encodeURIComponent(id)}/sortie?${params}`;
    const payload = { clientRequestId: requestId, heureSortie };
    try {
      return (await request<{ entry: Pick<StarMaterialEntry, "id" | "heureSortie"> }>(path, { method: "PATCH", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, payload, [], path, "PATCH");
      return { id, heureSortie, pendingSync: true };
    }
  },
  async listVisitorQuestionnaires(siteId: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let entries: VisitorQuestionnaireRecord[] = [];
    try {
      entries = (await request<{ entries: VisitorQuestionnaireRecord[] }>(`/visitor-questionnaires?siteId=${encodeURIComponent(siteId)}`)).entries;
    } catch (error) {
      if (navigator.onLine && !(error instanceof TypeError)) throw error;
    }
    const queued = await getQueuedLogisticsWrites(siteId);
    const pendingCreates = queued.filter((item) => item.path === "/visitor-questionnaires" && item.method === "POST").map((item) => ({
      ...(item.payload as unknown as { data: VisitorQuestionnaireData }),
      id: `pending-${item.requestId}`,
      siteId,
      siteName: "",
      createdAt: item.createdAt,
      updatedAt: item.createdAt,
      pendingSync: true,
      pendingSyncStatus: item.status || "pending",
      pendingSyncError: item.lastError,
    })) as unknown as VisitorQuestionnaireRecord[];
    const pendingUpdates = entries.flatMap((entry) => {
      const path = `/visitor-questionnaires/${encodeURIComponent(entry.id)}`;
      const operation = queued.filter((item) => item.path === path && item.method !== "POST").slice(-1)[0];
      if (!operation) return [entry];
      if (operation.method === "DELETE") return [];
      return [{
        ...entry,
        data: operation.payload.data as VisitorQuestionnaireData,
        pendingSync: true,
        pendingSyncStatus: operation.status || "pending",
        pendingSyncError: operation.lastError,
      }];
    });
    return [...pendingCreates, ...pendingUpdates];
  },
  async createVisitorQuestionnaire(data: { data: VisitorQuestionnaireData; siteId: string }) {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return (await request<{ entry: VisitorQuestionnaireRecord }>("/visitor-questionnaires", { method: "POST", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/visitor-questionnaires");
      return { id: `pending-${requestId}`, ...data, siteName: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pendingSync: true };
    }
  },
  async updateVisitorQuestionnaire(id: string, data: { data: VisitorQuestionnaireData; siteId: string }, expectedUpdatedAt?: string | null) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du questionnaire avant de le modifier.");
    const requestId = crypto.randomUUID();
    const payload = { ...data, expectedUpdatedAt: expectedUpdatedAt || null, clientRequestId: requestId };
    const path = `/visitor-questionnaires/${encodeURIComponent(id)}`;
    try {
      return (await request<{ entry: VisitorQuestionnaireRecord }>(path, { method: "PUT", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], path, "PUT");
      return { id, ...data, siteName: "", createdAt: expectedUpdatedAt || new Date().toISOString(), updatedAt: expectedUpdatedAt || new Date().toISOString(), pendingSync: true };
    }
  },
  async deleteVisitorQuestionnaire(id: string, siteId: string, expectedUpdatedAt?: string | null): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du questionnaire avant de le supprimer.");
    const requestId = crypto.randomUUID();
    const params = new URLSearchParams({ siteId, clientRequestId: requestId });
    if (expectedUpdatedAt) params.set("expectedUpdatedAt", expectedUpdatedAt);
    const path = `/visitor-questionnaires/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId, expectedUpdatedAt: expectedUpdatedAt || null }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async listObjectDeclarations(siteId: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let entries: ObjectDeclarationRecord[] = [];
    try {
      entries = (await request<{ entries: ObjectDeclarationRecord[] }>(`/object-declarations?siteId=${encodeURIComponent(siteId)}`)).entries;
    } catch (error) {
      if (navigator.onLine && !(error instanceof TypeError)) throw error;
    }
    const queued = await getQueuedLogisticsWrites(siteId);
    const pendingCreates = queued.filter((item) => item.path === "/object-declarations" && item.method === "POST").map((item) => ({
      ...(item.payload as unknown as { data: ObjectDeclarationData }),
      id: `pending-${item.requestId}`,
      siteId,
      siteName: "",
      createdAt: item.createdAt,
      updatedAt: item.createdAt,
      pendingSync: true,
      pendingSyncStatus: item.status || "pending",
      pendingSyncError: item.lastError,
    })) as unknown as ObjectDeclarationRecord[];
    const pendingUpdates = entries.flatMap((entry) => {
      const path = `/object-declarations/${encodeURIComponent(entry.id)}`;
      const operation = queued.filter((item) => item.path === path && item.method !== "POST").slice(-1)[0];
      if (!operation) return [entry];
      if (operation.method === "DELETE") return [];
      return [{
        ...entry,
        data: operation.payload.data as ObjectDeclarationData,
        pendingSync: true,
        pendingSyncStatus: operation.status || "pending",
        pendingSyncError: operation.lastError,
      }];
    });
    return [...pendingCreates, ...pendingUpdates];
  },
  async createObjectDeclaration(data: { data: ObjectDeclarationData; siteId: string }) {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return (await request<{ entry: ObjectDeclarationRecord }>("/object-declarations", { method: "POST", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/object-declarations");
      return { id: `pending-${requestId}`, ...data, siteName: "", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pendingSync: true };
    }
  },
  async updateObjectDeclaration(id: string, data: { data: ObjectDeclarationData; siteId: string }, expectedUpdatedAt?: string | null) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de la déclaration avant de la modifier.");
    const requestId = crypto.randomUUID();
    const payload = { ...data, expectedUpdatedAt: expectedUpdatedAt || null, clientRequestId: requestId };
    const path = `/object-declarations/${encodeURIComponent(id)}`;
    try {
      return (await request<{ entry: ObjectDeclarationRecord }>(path, { method: "PUT", body: body(payload) })).entry;
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], path, "PUT");
      return { id, ...data, siteName: "", createdAt: expectedUpdatedAt || new Date().toISOString(), updatedAt: expectedUpdatedAt || new Date().toISOString(), pendingSync: true };
    }
  },
  async deleteObjectDeclaration(id: string, siteId: string, expectedUpdatedAt?: string | null): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de la déclaration avant de la supprimer.");
    const requestId = crypto.randomUUID();
    const params = new URLSearchParams({ siteId, clientRequestId: requestId });
    if (expectedUpdatedAt) params.set("expectedUpdatedAt", expectedUpdatedAt);
    const path = `/object-declarations/${encodeURIComponent(id)}?${params}`;
    try {
      return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" });
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId, expectedUpdatedAt: expectedUpdatedAt || null }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async getApsAttendance(date: string, service: "jour" | "nuit", siteId: string): Promise<{
    data: Record<string, any[]> | null;
    postes: ApsPostConfiguration[] | null;
    pendingSync?: boolean;
    pendingSyncStatus?: "pending" | "conflict" | "rejected";
    pendingSyncError?: string;
  }> {
    const path = `/aps-attendance?date=${encodeURIComponent(date)}&service=${service}&siteId=${encodeURIComponent(siteId)}`;
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let result: { data: Record<string, any[]> | null; postes: ApsPostConfiguration[] | null } = { data: null, postes: null };
    let readError: unknown;
    try { result = await request<typeof result>(path); }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      readError = error;
    }
    const queued = await getQueuedLogisticsWrites(siteId);
    const attendance = queued.find((item) => item.path === "/aps-attendance"
      && item.payload.date === date && item.payload.service === service);
    const configuration = queued.find((item) => item.path === "/aps-attendance/posts"
      && item.payload.service === service);
    if (!attendance && !configuration) {
      if (readError) throw readError;
      return result;
    }
    return {
      data: attendance?.payload.data as Record<string, any[]> | undefined ?? result.data,
      postes: (attendance?.payload.postes || configuration?.payload.postes || result.postes) as ApsPostConfiguration[] | null,
      pendingSync: true,
      pendingSyncStatus: attendance?.status || configuration?.status || "pending",
      pendingSyncError: attendance?.lastError || configuration?.lastError,
    };
  },
  async saveApsPostConfiguration(data: { service: "jour" | "nuit"; siteId: string; postes: ApsPostConfiguration[] }): Promise<{ saved: boolean; postes: ApsPostConfiguration[]; pendingSync?: boolean }> {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return await request<{ saved: boolean; postes: ApsPostConfiguration[] }>("/aps-attendance/posts", { method: "PUT", body: body(payload) });
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/aps-attendance/posts", "PUT");
      return { saved: true, postes: data.postes, pendingSync: true };
    }
  },
  async lookupEmployeeByMatricule(matricule: string, signal?: AbortSignal) {
    try {
      return await request<EmployeeByMatricule>(`/employes/${encodeURIComponent(matricule)}`, { signal });
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 404) return null;
      throw error;
    }
  },
  async saveApsAttendance(data: { date: string; service: "jour" | "nuit"; siteId: string; data: Record<string, any[]>; postes: ApsPostConfiguration[] }): Promise<{ saved: boolean; updatedAt: string; pendingSync?: boolean }> {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return await request<{ saved: boolean; updatedAt: string }>("/aps-attendance", { method: "PUT", body: body(payload) });
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/aps-attendance", "PUT");
      return { saved: true, updatedAt: new Date().toISOString(), pendingSync: true };
    }
  },
  async getApsMovements(date: string, service: "jour" | "nuit", siteId: string): Promise<{
    data: ApsMovementData | null;
    postes: ApsPostConfiguration[] | null;
    pendingSync?: boolean;
    pendingSyncStatus?: "pending" | "conflict" | "rejected";
    pendingSyncError?: string;
  }> {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    const path = `/aps-movements?date=${encodeURIComponent(date)}&service=${service}&siteId=${encodeURIComponent(siteId)}`;
    let result: { data: ApsMovementData | null; postes: ApsPostConfiguration[] | null } = { data: null, postes: null };
    let readError: unknown;
    try { result = await request<typeof result>(path); }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      readError = error;
    }
    const queued = await getQueuedLogisticsWrites(siteId);
    const movement = queued.find((item) => item.path === "/aps-movements"
      && item.payload.date === date && item.payload.service === service);
    const configuration = queued.find((item) => item.path === "/aps-movements/posts");
    if (!movement && !configuration) {
      if (readError) throw readError;
      return result;
    }
    return {
      data: (movement?.payload.data as ApsMovementData | undefined) ?? result.data,
      postes: (movement?.payload.postes || configuration?.payload.postes || result.postes) as ApsPostConfiguration[] | null,
      pendingSync: true,
      pendingSyncStatus: movement?.status || configuration?.status || "pending",
      pendingSyncError: movement?.lastError || configuration?.lastError,
    };
  },
  async saveApsMovementPostConfiguration(data: { siteId: string; postes: ApsPostConfiguration[] }): Promise<{ saved: boolean; postes: ApsPostConfiguration[]; pendingSync?: boolean }> {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return await request<{ saved: boolean; postes: ApsPostConfiguration[] }>("/aps-movements/posts", { method: "PUT", body: body(payload) });
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/aps-movements/posts", "PUT");
      return { saved: true, postes: data.postes, pendingSync: true };
    }
  },
  async saveApsMovements(data: {
    date: string;
    service: "jour" | "nuit";
    siteId: string;
    data: ApsMovementData;
    postes: ApsPostConfiguration[];
  }): Promise<{ saved: boolean; updatedAt: string; pendingSync?: boolean }> {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return await request<{ saved: boolean; updatedAt: string }>("/aps-movements", { method: "PUT", body: body(payload) });
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/aps-movements", "PUT");
      return { saved: true, updatedAt: new Date().toISOString(), pendingSync: true };
    }
  },
  async listApsMovementEvents(siteId: string, date: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let entries: ApsMovementEvent[] = [];
    try {
      entries = (await request<{ entries: ApsMovementEvent[] }>(`/aps-movements/events?siteId=${encodeURIComponent(siteId)}&date=${encodeURIComponent(date)}`)).entries;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
    }
    const queued = await getQueuedLogisticsWrites(siteId);
    const result = new Map(entries.map((entry) => [entry.id, entry]));
    for (const item of queued.filter((write) => write.path?.startsWith("/aps-movements/events"))) {
      if (item.path === "/aps-movements/events" && item.payload.date === date) {
        const id = `pending-${item.requestId}`;
        result.set(id, { ...item.payload, id, pendingSync: true, pendingSyncStatus: item.status || "pending", pendingSyncError: item.lastError } as unknown as ApsMovementEvent);
        continue;
      }
      const path = item.path || "";
      const id = decodeURIComponent(path.split("?")[0].split("/")[3] || "");
      const entry = result.get(id);
      if (item.method === "DELETE") {
        if (item.status === "conflict" || item.status === "rejected") {
          if (entry) result.set(id, { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError });
        } else result.delete(id);
      } else if (item.method === "PUT") {
        if (item.payload.date !== date) result.delete(id);
        else result.set(id, {
          ...(entry || {}),
          ...item.payload,
          id,
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        } as ApsMovementEvent);
      }
    }
    return [...result.values()];
  },
  async createApsMovementEvent(data: Omit<ApsMovementEvent, "id">) {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return (await request<{ entry: ApsMovementEvent }>("/aps-movements/events", { method: "POST", body: body(payload) })).entry;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/aps-movements/events", "POST");
      return { ...data, id: `pending-${requestId}`, pendingSync: true } as ApsMovementEvent;
    }
  },
  async updateApsMovementEvent(id: string, data: Omit<ApsMovementEvent, "id">) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation du mouvement avant de le modifier.");
    const path = `/aps-movements/events/${encodeURIComponent(id)}`;
    try {
      return (await request<{ entry: ApsMovementEvent }>(path, { method: "PUT", body: body(data) })).entry;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      const requestId = crypto.randomUUID();
      await queueLogisticsWrite(requestId, data.siteId, data as unknown as Record<string, unknown>, [], path, "PUT");
      return { ...data, id, pendingSync: true } as ApsMovementEvent;
    }
  },
  async deleteApsMovementEvent(id: string, siteId: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) {
      await removeQueuedLogisticsWrite(id.slice("pending-".length));
      return { id, deleted: true, pendingSync: true };
    }
    const requestId = crypto.randomUUID();
    const path = `/aps-movements/events/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}&clientRequestId=${requestId}`;
    try { return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" }); }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async listApsServiceHandovers(siteId: string, date: string) {
    if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let entries: ApsServiceHandover[] = [];
    try {
      entries = (await request<{ entries: ApsServiceHandover[] }>(`/aps-movements/service-handovers?siteId=${encodeURIComponent(siteId)}&date=${encodeURIComponent(date)}`)).entries;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
    }
    const queued = await getQueuedLogisticsWrites(siteId);
    const result = new Map(entries.map((entry) => [entry.id, entry]));
    for (const item of queued.filter((write) => write.path?.startsWith("/aps-movements/service-handovers"))) {
      if (item.path === "/aps-movements/service-handovers" && item.payload.date === date) {
        const id = `pending-${item.requestId}`;
        result.set(id, { ...item.payload, id, pendingSync: true, pendingSyncStatus: item.status || "pending", pendingSyncError: item.lastError } as unknown as ApsServiceHandover);
        continue;
      }
      const path = item.path || "";
      const id = decodeURIComponent(path.split("?")[0].split("/")[3] || "");
      const entry = result.get(id);
      if (item.method === "DELETE") {
        if (item.status === "conflict" || item.status === "rejected") {
          if (entry) result.set(id, { ...entry, pendingSync: true, pendingSyncStatus: item.status, pendingSyncError: item.lastError });
        } else result.delete(id);
      } else if (item.method === "PUT") {
        if (item.payload.date !== date) result.delete(id);
        else result.set(id, {
          ...(entry || {}),
          ...item.payload,
          id,
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        } as ApsServiceHandover);
      }
    }
    return [...result.values()];
  },
  async createApsServiceHandover(data: ApsServiceHandoverInput) {
    const requestId = crypto.randomUUID();
    const payload = { ...data, clientRequestId: requestId };
    try {
      return (await request<{ entry: ApsServiceHandover }>("/aps-movements/service-handovers", { method: "POST", body: body(payload) })).entry;
    } catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, data.siteId, payload, [], "/aps-movements/service-handovers", "POST");
      return { ...data, id: `pending-${requestId}`, pendingSync: true } as ApsServiceHandover;
    }
  },
  async updateApsServiceHandover(id: string, data: ApsServiceHandoverInput) {
    if (id.startsWith("pending-")) throw new Error("Attendez la synchronisation de la passation avant de la modifier.");
    const path = `/aps-movements/service-handovers/${encodeURIComponent(id)}`;
    try { return (await request<{ entry: ApsServiceHandover }>(path, { method: "PUT", body: body(data) })).entry; }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      const requestId = crypto.randomUUID();
      await queueLogisticsWrite(requestId, data.siteId, data as unknown as Record<string, unknown>, [], path, "PUT");
      return { ...data, id, pendingSync: true } as ApsServiceHandover;
    }
  },
  async deleteApsServiceHandover(id: string, siteId: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) {
      await removeQueuedLogisticsWrite(id.slice("pending-".length));
      return { id, deleted: true, pendingSync: true };
    }
    const requestId = crypto.randomUUID();
    const path = `/aps-movements/service-handovers/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}&clientRequestId=${requestId}`;
    try { return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" }); }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async listCameras(siteId?: string): Promise<CameraRecord[]> {
    if (siteId && navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
    let cameras: CameraRecord[] = [];
    let readError: unknown;
    try { cameras = (await request<{ cameras: CameraRecord[] }>(`/cameras${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).cameras; }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      readError = error;
    }
    const queued = await getQueuedLogisticsWrites(siteId);
    if (readError && !cameras.length && !queued.some((item) => item.path === "/cameras" && item.method === "POST")) throw readError;
    const rows = new Map(cameras.map((camera) => [camera.id, camera]));
    for (const item of queued.filter((write) => write.path?.startsWith("/cameras"))) {
      const path = item.path || "";
      if (path === "/cameras" && item.method === "POST") {
        const id = `pending-${item.requestId}`;
        rows.set(id, {
          ...item.payload,
          id,
          name: String(item.payload.name || ""),
          streamUrl: String(item.payload.streamUrl || ""),
          status: item.payload.status === "MAINTENANCE" ? "MAINTENANCE" : "EN_SERVICE",
          zoneId: "",
          zoneName: String(item.payload.zoneName || ""),
          siteId: item.siteId,
          siteName: String(item.payload.siteName || ""),
          accessLevel: Number(item.payload.accessLevel || 0),
          pendingSync: true,
          pendingSyncStatus: item.status || "pending",
          pendingSyncError: item.lastError,
        });
        continue;
      }
      const cameraId = decodeURIComponent(path.split("?")[0].split("/")[2] || "");
      const existing = rows.get(cameraId);
      if (!existing) continue;
      if (item.method === "DELETE" && item.status !== "conflict" && item.status !== "rejected") rows.delete(cameraId);
      else rows.set(cameraId, {
        ...existing,
        ...(item.method === "PATCH" ? { status: item.payload.status === "MAINTENANCE" ? "MAINTENANCE" : "EN_SERVICE" } : item.payload),
        pendingSync: true,
        pendingSyncStatus: item.status || "pending",
        pendingSyncError: item.lastError,
      });
    }
    return [...rows.values()];
  },
  async listCameraZones(siteId?: string): Promise<CameraZone[]> {
    let zones: CameraZone[] = [];
    let readError: unknown;
    try { zones = (await request<{ zones: CameraZone[] }>(`/camera-zones${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).zones; }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      readError = error;
    }
    const queued = await getQueuedLogisticsWrites(siteId);
    if (readError && !zones.length && !queued.some((item) => item.path === "/cameras" && item.method === "POST")) throw readError;
    const known = new Set(zones.map((zone) => String(zone.name).toLocaleLowerCase("fr")));
    for (const item of queued.filter((write) => write.path === "/cameras" && write.method === "POST")) {
      const name = String(item.payload.zoneName || "").trim();
      if (!name || known.has(name.toLocaleLowerCase("fr"))) continue;
      known.add(name.toLocaleLowerCase("fr"));
      zones.push({ id: `pending-${item.requestId}`, name, siteId: item.siteId, siteName: String(item.payload.siteName || ""), accessLevel: Number(item.payload.accessLevel || 0), pendingSync: true });
    }
    return zones;
  },
  async createCamera(data: Record<string, unknown>): Promise<CameraRecord> {
    const requestId = crypto.randomUUID();
    const payload = addClientRequestId(data, requestId);
    try { return (await request<{ camera: CameraRecord }>("/cameras", { method: "POST", body: body(payload) })).camera; }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      const siteId = String(data.siteId || "");
      if (!siteId) throw new Error("Un site est nécessaire pour enregistrer une caméra hors connexion.");
      await queueLogisticsWrite(requestId, siteId, payload, [], "/cameras", "POST");
      return {
        ...data,
        id: `pending-${requestId}`,
        status: "EN_SERVICE",
        zoneId: "",
        zoneName: String(data.zoneName || ""),
        siteId,
        siteName: String(data.siteName || ""),
        accessLevel: Number(data.accessLevel || 0),
        pendingSync: true,
      } as CameraRecord;
    }
  },
  async updateCamera(id: string, data: Record<string, unknown>): Promise<Pick<CameraRecord, "id"> & Partial<CameraRecord>> {
    if (id.startsWith("pending-")) {
      const requestId = id.slice("pending-".length);
      const item = (await getQueuedLogisticsWrites(String(data.siteId || ""))).find((write) => write.requestId === requestId && write.path === "/cameras");
      if (!item) throw new Error("La caméra en attente est introuvable sur cet appareil.");
      await updateQueuedLogisticsWrite(requestId, { payload: { ...item.payload, ...data } });
      return {
        id,
        name: String(data.name ?? item.payload.name ?? ""),
        streamUrl: String(data.streamUrl ?? item.payload.streamUrl ?? ""),
        status: item.payload.status === "MAINTENANCE" ? "MAINTENANCE" : "EN_SERVICE",
        zoneId: "",
        zoneName: String(data.zoneName ?? item.payload.zoneName ?? ""),
        siteId: String(data.siteId ?? item.siteId),
        siteName: String(data.siteName ?? item.payload.siteName ?? ""),
        accessLevel: Number(data.accessLevel ?? item.payload.accessLevel ?? 0),
        pendingSync: true,
      };
    }
    const path = `/cameras/${encodeURIComponent(id)}`;
    try { return (await request<{ camera: CameraRecord }>(path, { method: "PUT", body: body(data) })).camera; }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      const requestId = crypto.randomUUID();
      await queueLogisticsWrite(requestId, String(data.siteId || ""), data, [], path, "PUT");
      return { ...data, id, pendingSync: true } as Pick<CameraRecord, "id"> & Partial<CameraRecord>;
    }
  },
  async setCameraStatus(id: string, status: "EN_SERVICE" | "MAINTENANCE", siteId: string): Promise<Pick<CameraRecord, "id" | "status" | "pendingSync">> {
    if (id.startsWith("pending-")) {
      const requestId = id.slice("pending-".length);
      const item = (await getQueuedLogisticsWrites(siteId)).find((write) => write.requestId === requestId && write.path === "/cameras");
      if (!item) throw new Error("La caméra en attente est introuvable sur cet appareil.");
      await updateQueuedLogisticsWrite(requestId, { payload: { ...item.payload, status } });
      return { id, status, pendingSync: true };
    }
    const path = `/cameras/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`;
    try { return (await request<{ camera: Pick<CameraRecord, "id" | "status"> }>(path, { method: "PATCH", body: body({ status }) })).camera; }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      const requestId = crypto.randomUUID();
      await queueLogisticsWrite(requestId, siteId, { status, siteId }, [], path, "PATCH");
      return { id, status, pendingSync: true };
    }
  },
  async deleteCamera(id: string, siteId: string): Promise<{ id: string; deleted: boolean; pendingSync?: boolean }> {
    if (id.startsWith("pending-")) {
      await removeQueuedLogisticsWrite(id.slice("pending-".length));
      return { id, deleted: true, pendingSync: true };
    }
    const requestId = crypto.randomUUID();
    const path = `/cameras/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}&clientRequestId=${requestId}`;
    try { return await request<{ id: string; deleted: boolean }>(path, { method: "DELETE" }); }
    catch (error) {
      if (!isNetworkFailure(error)) throw error;
      await queueLogisticsWrite(requestId, siteId, { siteId }, [], path, "DELETE");
      return { id, deleted: true, pendingSync: true };
    }
  },
  async listProviders() { return (await request<{ providers: Provider[] }>("/providers")).providers; },
  async createProvider(name: string) { return (await request<{ provider: Provider }>("/providers", { method: "POST", body: body({ name }) })).provider; },
  async updateProvider(id: string, data: { name: string; active?: boolean }) { return (await request<{ provider: Provider }>(`/providers/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).provider; },
  async deleteProvider(id: string) { return request<{ id: string; deleted: boolean; deactivated: boolean }>(`/providers/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async listEmployees() { return (await request<{ employees: EmployeeRecord[] }>("/employees")).employees; },
  async createEmployee(data: Omit<EmployeeRecord, "id" | "provider" | "active" | "siteName">) { return (await request<{ employee: EmployeeRecord }>("/employees", { method: "POST", body: body(data) })).employee; },
  async updateEmployee(id: string, data: Omit<EmployeeRecord, "id" | "provider" | "active" | "siteName">) { return (await request<{ employee: EmployeeRecord }>(`/employees/${id}`, { method: "PUT", body: body(data) })).employee; },
  async setEmployeeActive(id: string, active: boolean) { return (await request<{ employee: Pick<EmployeeRecord, "id" | "active"> }>(`/employees/${id}`, { method: "PATCH", body: body({ active }) })).employee; },
  async findEmployeeByMatricule(matricule: string) { return (await request<{ employee: any }>(`/employees/by-matricule/${encodeURIComponent(matricule)}`)).employee; },
  async listReports(date?: string) { return (await request<{ reports: any[] }>(`/service-reports${date ? `?date=${encodeURIComponent(date)}` : ""}`)).reports; },
  async createReport(data: unknown) { return (await request<{ report: any }>("/service-reports", { method: "POST", body: body(data) })).report; },
  async updateReport(id: string, data: unknown) { return (await request<{ report: any }>(`/service-reports/${id}`, { method: "PUT", body: body(data) })).report; },
  async submitReport(id: string) { return request<{ id: string; statut: string }>(`/service-reports/${id}/submit`, { method: "POST", body: "{}" }); },
  async reportAudit(id: string) { return (await request<{ audit: any[] }>(`/service-reports/${id}/audit`)).audit; },
};
