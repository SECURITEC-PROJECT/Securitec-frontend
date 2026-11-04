import { API_URL } from "@/lib/api";
import type { VisitorRecord } from "@/types/visitor";
import {
  cacheLogisticsEntries,
  getCachedLogisticsEntries,
  getCachedApiResponse,
  getQueuedLogisticsWrites,
  cacheApiResponse,
  queueLogisticsWrite,
  updateQueuedLogisticsWrite,
  removeQueuedLogisticsWrite,
} from "@/lib/offline-logistics";

const apiBaseUrl = API_URL;
const tokenKey = "securitec-access-token";
const logisticsSyncs = new Map<string, Promise<{ synced: number; pending: number }>>();

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
    if (!response.ok) throw new ApiResponseError(result.error || `Erreur API (${response.status})`, response.status);
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
      if (posteId && !scopedPayload.priseDePosteId) {
        const activeServiceId = localStorage.getItem(`securitec-active-shift:${siteId}:${posteId}`);
        if (activeServiceId) return JSON.stringify({ ...scopedPayload, priseDePosteId: activeServiceId });
      }
      if (scopedPayload !== payload) return JSON.stringify(scopedPayload);
    }
  }
  return JSON.stringify(data);
};

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
  async listDocuments(siteId: string) { return (await request<{ documents: SiteDocument[] }>(`/documents?siteId=${encodeURIComponent(siteId)}`)).documents; },
  async uploadDocument(siteId: string, file: File, category: string) {
    const token = sessionStorage.getItem(tokenKey);
    const headers = new Headers({ "Content-Type": file.type || "application/octet-stream", "X-Site-Id": siteId,
      "X-File-Name": encodeURIComponent(file.name), "X-File-Category": category });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${apiBaseUrl}/documents`, { method: "POST", headers, body: file });
    const result = await response.json().catch(() => ({})) as { document?: SiteDocument; error?: string };
    if (!response.ok) throw new Error(result.error || `Erreur API (${response.status})`);
    if (!result.document) throw new Error("La réponse du serveur ne contient pas le document importé.");
    return result.document;
  },
  async downloadDocument(id: string) {
    const token = sessionStorage.getItem(tokenKey);
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${apiBaseUrl}/documents/${encodeURIComponent(id)}`, { headers });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || `Erreur API (${response.status})`);
    }
    const disposition = response.headers.get("Content-Disposition") || "";
    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    return { blob: await response.blob(), name: encoded ? decodeURIComponent(encoded) : "document" };
  },
  async listRegistryAttachments(entity: string, recordId: string) {
    return (await request<{ attachments: Array<{ id: string; documentId: string; name: string; extension: string; size: number; linkedAt: string }> }>(`/register-attachments?entity=${encodeURIComponent(entity)}&recordId=${encodeURIComponent(recordId)}`)).attachments;
  },
  async linkRegistryAttachment(entity: string, recordId: string, documentId: string) {
    return request<{ linked: boolean; id: string | null }>("/register-attachments", { method: "POST", body: body({ entity, recordId, documentId }) });
  },
  async unlinkRegistryAttachment(id: string) {
    return request<{ id: string; unlinked: boolean }>(`/register-attachments/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  async listLogisticsAttachments(entryId: string, siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    return (await request<{ attachments: SiteDocument[] }>(`/logistics/${encodeURIComponent(entryId)}/attachments${query}`)).attachments;
  },
  async linkLogisticsDocument(entryId: string, documentId: string, siteId: string) {
    return request<{ linked: boolean }>(`/logistics/${encodeURIComponent(entryId)}/attachments`, {
      method: "POST", body: body({ documentId, siteId }),
    });
  },
  async listLogisticsAudit(entryId: string, siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    return (await request<{ entries: { id: string; action: string; createdAt: string; createdBy: string | null; before: Record<string, unknown>; after: Record<string, unknown> }[] }>(`/logistics/${encodeURIComponent(entryId)}/audit${query}`)).entries;
  },
  async deleteDocument(id: string) { return request<{ id: string; deleted: boolean }>(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" }); },
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
  async listShifts(siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    const result = await request<{ shifts?: any[] } | any[]>(`/shifts${query}`);
    return Array.isArray(result) ? result : result.shifts || [];
  },
  async listShiftPosts(siteId: string) {
    return (await request<{ posts: { id: string; nom: string }[] }>(`/shifts/posts?siteId=${encodeURIComponent(siteId)}`)).posts;
  },
  async startShift(data: unknown) { return (await request<{ shift: any }>("/shifts", { method: "POST", body: body(data) })).shift; },
  async endShift(id: string) { return (await request<{ shift: any }>(`/shifts/${id}/end`, { method: "POST", body: "{}" })).shift; },
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
  async listVisitors(siteId?: string) { return (await request<{ visitors: VisitorRecord[] }>(`/visitors${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).visitors; },
  async createVisitor(data: unknown) { return (await request<{ visitor: VisitorRecord }>("/visitors", { method: "POST", body: body(data) })).visitor; },
  async updateVisitor(id: string, data: unknown) { return (await request<{ visitor: VisitorRecord }>(`/visitors/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).visitor; },
  async deleteVisitor(id: string, siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    return request<{ id: string; deleted: boolean }>(`/visitors/${encodeURIComponent(id)}${query}`, { method: "DELETE" });
  },
  async setVisitorSiteBan(id: string, siteId: string, banned: boolean) {
    return request<{ visitorId: string; siteId: string; banned: boolean }>(`/visitors/${encodeURIComponent(id)}/site-ban`, { method: "PUT", body: body({ siteId, banned }) });
  },
  async exitVisitor(id: string, data: unknown) { return (await request<{ visitor: any }>(`/visitors/${id}/exit`, { method: "PATCH", body: body(data) })).visitor; },
  async listVehicles(siteId?: string) { return (await request<{ vehicles: VehicleMovement[] }>(`/vehicles${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).vehicles; },
  async createVehicle(data: unknown) { return (await request<{ vehicle: VehicleMovement }>("/vehicles", { method: "POST", body: body(data) })).vehicle; },
  async updateVehicle(id: string, data: unknown) { return (await request<{ vehicle: VehicleMovement }>(`/vehicles/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).vehicle; },
  async deleteVehicle(id: string, siteId: string) { return request<{ id: string; deleted: boolean }>(`/vehicles/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" }); },
  async exitVehicle(id: string, passengersOut?: number, siteId?: string) {
    const params = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    return (await request<{ vehicle: Partial<VehicleMovement> }>(`/vehicles/${encodeURIComponent(id)}/exit${params}`, { method: "PATCH", body: body(passengersOut === undefined ? {} : { passengersOut }) })).vehicle;
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
        returnTime: null,
        notReturned: false,
        returnDate: null,
        returnerLastName: null,
        returnerFirstName: null,
        returnerMatricule: null,
        lieu: String(item.payload.lieu || ""),
        observations: null,
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
  async createKeyTracking(data: { date: string; employeeId: string; lastName: string; firstName: string; matricule: string; keyType: string; quantity: number; departureTime: string; siteId: string; lieu: string }) {
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
      const pending = (await getQueuedLogisticsWrites(siteId)).filter((entry) => !entry.path || entry.path === "/logistics");
      return [...pending.map(pendingLogisticsEntry), ...entries];
    } catch (error) {
      if (!siteId) throw error;
      const [cached, pending] = await Promise.all([
        getCachedLogisticsEntries(siteId), getQueuedLogisticsWrites(siteId),
      ]);
      if (!cached.length && !pending.length) throw error;
      return [...pending.filter((entry) => !entry.path || entry.path === "/logistics").map(pendingLogisticsEntry), ...cached];
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
            const document = await serviceApi.uploadDocument(String(payload.siteId || ""), file, "Flux logistique");
            await serviceApi.linkLogisticsDocument(String(result.entry.id), document.id, String(payload.siteId || ""));
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
          const replayBody = item.path === "/vigilance"
            ? item.payload.entries
            : { ...item.payload, clientRequestId: item.requestId };
          const result = await request<{ entry?: any; id?: string; entries?: unknown[] }>(item.path || "/logistics", {
            method: item.method || "POST", body: body(replayBody),
          });
          if (!result.entry?.id && !result.id && !(Array.isArray(result.entries) && result.entries.length)) {
            throw new Error("Le serveur n’a pas confirmé la saisie hors connexion.");
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
  async updateTruckLogistics(id: string, type: "DECHARGEMENT" | "CHARGEMENT" | "ORDURES", data: unknown) {
    return request<{ entry: any }>(`/logistics/${encodeURIComponent(id)}?type=${type}`, { method: "PUT", body: body(data) });
  },
  async deleteTruckLogistics(id: string, type: "DECHARGEMENT" | "CHARGEMENT" | "ORDURES", siteId: string) {
    const params = new URLSearchParams({ type, siteId });
    return request<{ id: string; deleted: boolean }>(`/logistics/${encodeURIComponent(id)}?${params}`, { method: "DELETE" });
  },
  async listStarParticulierLoadings(siteId: string) {
    const query = `?siteId=${encodeURIComponent(siteId)}`;
    try {
      if (navigator.onLine) await serviceApi.syncPendingLogistics(siteId);
      const rows = await request<{ entries: StarParticulierLoading[] }>(`/logistics/star-particulier${query}`);
      const pending = (await getQueuedLogisticsWrites(siteId)).filter((entry) => entry.path === "/logistics/star-particulier");
      return [...pending.map((entry) => pendingLogisticsEntry(entry)), ...rows.entries]
        .filter((entry) => ["STAR", "PARTICULIER", "PALETTE"].includes(entry.typeChargement));
    } catch (error) {
      const pending = (await getQueuedLogisticsWrites(siteId)).filter((entry) => entry.path === "/logistics/star-particulier");
      if (!pending.length) throw error;
      return pending.map((entry) => pendingLogisticsEntry(entry)) as StarParticulierLoading[];
    }
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
  async updateStarParticulierLoading(id: string, data: Omit<StarParticulierLoading, "id" | "type" | "siteName" | "siteId"> & { siteId: string }) {
    return (await request<{ entry: StarParticulierLoading }>(`/logistics/star-particulier/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteStarParticulierLoading(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId });
    return request<{ id: string; deleted: boolean }>(`/logistics/star-particulier/${encodeURIComponent(id)}?${params}`, { method: "DELETE" });
  },
  async createEmptyBottleDelivery(data: unknown) {
    const result = await serviceApi.createLogistics(data);
    return { entry: result.entry as EmptyBottleDelivery };
  },
  async updateWasteLogistics(id: string, data: unknown) {
    return request<{ entry: any }>(`/logistics/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) });
  },
  async updateMatierePremiereLogistics(id: string, data: unknown) {
    return request<{ entry: any }>(`/logistics/${encodeURIComponent(id)}?type=MATIERE_PREMIERE`, { method: "PUT", body: body(data) });
  },
  async deleteWasteLogistics(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/logistics/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async updateEmptyBottleDelivery(id: string, data: unknown) {
    return request<{ entry: EmptyBottleDelivery }>(`/logistics/empty-bottles/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) });
  },
  async deleteEmptyBottleDelivery(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/logistics/empty-bottles/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async deleteMatierePremiereLogistics(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId, type: "MATIERE_PREMIERE" });
    return request<{ id: string; deleted: boolean }>(`/logistics/${encodeURIComponent(id)}?${params}`, { method: "DELETE" });
  },
  async updateDepotageFuelLogistics(id: string, data: unknown) {
    return request<{ entry: any }>(`/logistics/${encodeURIComponent(id)}?type=DEPOTAGE_FUEL`, { method: "PUT", body: body(data) });
  },
  async deleteDepotageFuelLogistics(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId, type: "DEPOTAGE_FUEL" });
    return request<{ id: string; deleted: boolean }>(`/logistics/${encodeURIComponent(id)}?${params}`, { method: "DELETE" });
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
  async listPatrols(siteId?: string) { return (await request<{ patrols: any[] }>(`/patrols${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).patrols; },
  async startPatrol(data: unknown) { return (await request<{ patrol: any }>("/patrols", { method: "POST", body: body(data) })).patrol; },
  async updatePatrol(id: string, checkpoints: { name: string; at: string | null }[]) { return (await request<{ patrol: any }>(`/patrols/${id}`, { method: "PATCH", body: body({ checkpoints }) })).patrol; },
  async finishPatrol(id: string, observations: string) { return (await request<{ patrol: any }>(`/patrols/${id}/finish`, { method: "POST", body: body({ observations }) })).patrol; },
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
  async createCourrierMovement(data: { date: string; heureEntree: string; prenom: string; designation: string; nombre: number; siteId: string }): Promise<CourrierMovement> {
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
    return (await request<{ entries: SubcontractorMaterialMovement[] }>(`/materiels-sous-traitant?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createSubcontractorMaterial(data: { date: string; heureEntree: string; materiels: string; nombre: number; prestataireId: string; siteId: string }) {
    return (await request<{ entry: SubcontractorMaterialMovement }>("/materiels-sous-traitant", { method: "POST", body: body(data) })).entry;
  },
  async updateSubcontractorMaterial(id: string, data: { date: string; heureEntree: string; materiels: string; nombre: number; prestataireId: string; siteId: string }) {
    return (await request<{ entry: SubcontractorMaterialMovement }>(`/materiels-sous-traitant/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteSubcontractorMaterial(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/materiels-sous-traitant/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async exitSubcontractorMaterial(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId });
    return (await request<{ entry: Pick<SubcontractorMaterialMovement, "id" | "heureSortie"> }>(`/materiels-sous-traitant/${encodeURIComponent(id)}/sortie?${params}`, { method: "PATCH", body: "{}" })).entry;
  },
  async listStarMaterials(siteId: string) {
    return (await request<{ entries: StarMaterialEntry[] }>(`/materiels-star?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createStarMaterial(data: { date: string; heureEntree: string; prenom: string; matricule: string; items: StarMaterialItem[]; prestataireId: string; siteId: string }) {
    return (await request<{ entry: StarMaterialEntry }>("/materiels-star", { method: "POST", body: body(data) })).entry;
  },
  async updateStarMaterial(id: string, data: { date: string; heureEntree: string; prenom: string; matricule: string; items: StarMaterialItem[]; prestataireId: string; siteId: string }) {
    return (await request<{ entry: StarMaterialEntry }>(`/materiels-star/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteStarMaterial(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/materiels-star/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async exitStarMaterial(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId });
    return (await request<{ entry: Pick<StarMaterialEntry, "id" | "heureSortie"> }>(`/materiels-star/${encodeURIComponent(id)}/sortie?${params}`, { method: "PATCH", body: "{}" })).entry;
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
  async getApsAttendance(date: string, service: "jour" | "nuit", siteId: string) {
    return request<{ data: Record<string, any[]> | null; postes: ApsPostConfiguration[] | null }>(`/aps-attendance?date=${encodeURIComponent(date)}&service=${service}&siteId=${encodeURIComponent(siteId)}`);
  },
  async saveApsPostConfiguration(data: { service: "jour" | "nuit"; siteId: string; postes: ApsPostConfiguration[] }) {
    return request<{ saved: boolean; postes: ApsPostConfiguration[] }>("/aps-attendance/posts", { method: "PUT", body: body(data) });
  },
  async lookupEmployeeByMatricule(matricule: string, signal?: AbortSignal) {
    try {
      return await request<EmployeeByMatricule>(`/employes/${encodeURIComponent(matricule)}`, { signal });
    } catch (error) {
      if (error instanceof ApiResponseError && error.status === 404) return null;
      throw error;
    }
  },
  async saveApsAttendance(data: { date: string; service: "jour" | "nuit"; siteId: string; data: Record<string, any[]>; postes: ApsPostConfiguration[] }) {
    return request<{ saved: boolean; updatedAt: string }>("/aps-attendance", { method: "PUT", body: body(data) });
  },
  async getApsMovements(date: string, service: "jour" | "nuit", siteId: string) {
    return request<{ data: ApsMovementData | null; postes: ApsPostConfiguration[] | null }>(
      `/aps-movements?date=${encodeURIComponent(date)}&service=${service}&siteId=${encodeURIComponent(siteId)}`,
    );
  },
  async saveApsMovementPostConfiguration(data: { siteId: string; postes: ApsPostConfiguration[] }) {
    return request<{ saved: boolean; postes: ApsPostConfiguration[] }>("/aps-movements/posts", {
      method: "PUT",
      body: body(data),
    });
  },
  async saveApsMovements(data: {
    date: string;
    service: "jour" | "nuit";
    siteId: string;
    data: ApsMovementData;
    postes: ApsPostConfiguration[];
  }) {
    return request<{ saved: boolean; updatedAt: string }>("/aps-movements", {
      method: "PUT",
      body: body(data),
    });
  },
  async listApsMovementEvents(siteId: string, date: string) {
    return (await request<{ entries: ApsMovementEvent[] }>(
      `/aps-movements/events?siteId=${encodeURIComponent(siteId)}&date=${encodeURIComponent(date)}`,
    )).entries;
  },
  async createApsMovementEvent(data: Omit<ApsMovementEvent, "id">) {
    return (await request<{ entry: ApsMovementEvent }>("/aps-movements/events", {
      method: "POST",
      body: body(data),
    })).entry;
  },
  async updateApsMovementEvent(id: string, data: Omit<ApsMovementEvent, "id">) {
    return (await request<{ entry: ApsMovementEvent }>(`/aps-movements/events/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: body(data),
    })).entry;
  },
  async deleteApsMovementEvent(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(
      `/aps-movements/events/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`,
      { method: "DELETE" },
    );
  },
  async listApsServiceHandovers(siteId: string, date: string) {
    return (await request<{ entries: ApsServiceHandover[] }>(
      `/aps-movements/service-handovers?siteId=${encodeURIComponent(siteId)}&date=${encodeURIComponent(date)}`,
    )).entries;
  },
  async createApsServiceHandover(data: ApsServiceHandoverInput) {
    return (await request<{ entry: ApsServiceHandover }>("/aps-movements/service-handovers", {
      method: "POST",
      body: body(data),
    })).entry;
  },
  async updateApsServiceHandover(id: string, data: ApsServiceHandoverInput) {
    return (await request<{ entry: ApsServiceHandover }>(`/aps-movements/service-handovers/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: body(data),
    })).entry;
  },
  async deleteApsServiceHandover(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(
      `/aps-movements/service-handovers/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`,
      { method: "DELETE" },
    );
  },
  async listCameras(siteId?: string) { return (await request<{ cameras: any[] }>(`/cameras${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).cameras; },
  async listCameraZones(siteId?: string) { return (await request<{ zones: any[] }>(`/camera-zones${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).zones; },
  async createCamera(data: unknown) { return (await request<{ camera: any }>("/cameras", { method: "POST", body: body(data) })).camera; },
  async updateCamera(id: string, data: unknown) { return (await request<{ camera: any }>(`/cameras/${id}`, { method: "PUT", body: body(data) })).camera; },
  async setCameraStatus(id: string, status: "EN_SERVICE" | "MAINTENANCE") { return (await request<{ camera: any }>(`/cameras/${id}`, { method: "PATCH", body: body({ status }) })).camera; },
  async deleteCamera(id: string) { return request<{ id: string; deleted: boolean }>(`/cameras/${id}`, { method: "DELETE" }); },
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
