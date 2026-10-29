import { API_URL, authHeaders } from "@/lib/api";
import type { VisitorRecord } from "@/types/visitor";

const apiBaseUrl = API_URL;
const tokenKey = "securitec-access-token";

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
}

export interface EmptyBottleDelivery {
  id: string;
  date: string;
  type: "BOUTEILLES_VIDES";
  heureArrivee: string;
  immatriculationVehicule: string;
  nomChauffeur: string | null;
  numeroTitre: string;
  provenance: string;
  poids: string | number;
  detailsBouteilles: { designation: string; quantite: number }[];
  siteName: string;
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
  createdAt?: string;
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
}

export interface AlcoholCheck {
  id: string;
  date: string;
  heure: string;
  matricule: string;
  personne: string;
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
}

export interface StarParticulierLoading {
  id: string;
  date: string;
  type: "CHARGEMENT";
  typeChargement: "STAR" | "PARTICULIER";
  heureSortie: string;
  camion: string;
  proprietaire: string;
  nomChauffeur: string;
  designation: string;
  quantiteTexte: string;
  poids: string | number;
  destinataire: string;
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
}

export interface WasteScrapRegisterEntry {
  id: string;
  date: string;
  heure: string;
  prenom: string;
  matricule: string;
  section: string;
  designation: string;
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
}

export interface MotorcycleMovement {
  id: string;
  date: string;
  heureEntree: string;
  moto: string;
  observation: string;
  heureSortie: string | null;
  siteId: string;
}

export interface ApsPostConfiguration {
  name: string;
  count: number;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = sessionStorage.getItem(tokenKey);
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Erreur API (${response.status})`);
  return result as T;
}

const body = (data: unknown): string => JSON.stringify(data);

export const serviceApi = {
  async listUsers() { return (await request<{ users: { id: string; name: string; identifier: string; role: number; siteId: string | null; siteName: string | null }[] }>("/users")).users; },
  async createUser(data: { name: string; identifier: string; role: number; pin: string; siteId: string | null }) { return (await request<{ user: { id: string; name: string; identifier: string; role: number; siteId: string | null; siteName: string | null } }>("/users", { method: "POST", body: body(data) })).user; },
  async updateUser(id: string, data: { name: string; identifier: string; role: number; pin?: string; siteId: string | null }) { return (await request<{ user: { id: string; name: string; identifier: string; role: number; siteId: string | null; siteName: string | null } }>(`/users/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).user; },
  async deleteUser(id: string) { return request<{ id: string; deleted: boolean }>(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async listDocuments(siteId: string) { return (await request<{ documents: any[] }>(`/documents?siteId=${encodeURIComponent(siteId)}`)).documents; },
  async uploadDocument(siteId: string, file: File, category: string) {
    const token = sessionStorage.getItem(tokenKey);
    const headers = new Headers({ "Content-Type": file.type || "application/octet-stream", "X-Site-Id": siteId,
      "X-File-Name": encodeURIComponent(file.name), "X-File-Category": category });
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${apiBaseUrl}/documents`, { method: "POST", headers, body: file });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Erreur API (${response.status})`);
    return result.document as any;
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
  async deleteDocument(id: string) { return request<{ id: string; deleted: boolean }>(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" }); },
  async listSites() { return request<{ sites: { id: string; name: string; type: "USINE" | "AGENCE" }[]; canCreate: boolean; canDelete: boolean }>("/sites"); },
  async createSite(data: { name: string; type: "USINE" | "AGENCE"; address?: string }) { return (await request<{ site: { id: string; name: string; type: "USINE" | "AGENCE" } }>("/sites", { method: "POST", body: body(data) })).site; },
  async archiveSite(id: string) { return request<{ id: string; archived: boolean }>(`/sites/${id}`, { method: "DELETE" }); },
  async listShifts() { return (await request<{ shifts: any[] }>("/shifts")).shifts; },
  async startShift(data: unknown) { return (await request<{ shift: any }>("/shifts", { method: "POST", body: body(data) })).shift; },
  async endShift(id: string) { return (await request<{ shift: any }>(`/shifts/${id}/end`, { method: "POST", body: "{}" })).shift; },
  async listPassations() { return (await request<{ passations: any[] }>("/passations")).passations; },
  async createPassation(data: unknown) { return (await request<{ passation: any }>("/passations", { method: "POST", body: body(data) })).passation; },
  async listJournalConsignes(siteId: string) {
    return (await request<{ entries: any[] }>(`/consignes-journal?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createJournalConsigne(data: unknown) {
    return (await request<{ entry: any }>("/consignes-journal", { method: "POST", body: body(data) })).entry;
  },
  async updateJournalConsigne(id: string, data: unknown) {
    return (await request<{ entry: any }>(`/consignes-journal/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
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
    return (await request<{ entries: KeyTrackingEntry[] }>(`/access-control/keys?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createKeyTracking(data: { date: string; employeeId: string; keyType: string; quantity: number; departureTime: string; siteId: string }) {
    return (await request<{ entry: KeyTrackingEntry }>("/access-control/keys", { method: "POST", body: body(data) })).entry;
  },
  async returnKeyTracking(id: string | number, data: { returnTime: string; siteId: string }) {
    return (await request<{ entry: { id: string | number; returnTime: string } }>(`/access-control/keys/${encodeURIComponent(String(id))}/return`, { method: "PATCH", body: body(data) })).entry;
  },
  async listBreathTests(siteId?: string) { return (await request<{ entries: any[] }>(`/access-control/breath-tests${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async createBreathTest(data: unknown) { return (await request<{ entry: any }>("/access-control/breath-tests", { method: "POST", body: body(data) })).entry; },
  async listAlcoholChecks(siteId: string) {
    return (await request<{ entries: AlcoholCheck[] }>(`/access-control/alcohol-checks?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createAlcoholCheck(data: Omit<AlcoholCheck, "id" | "siteName">) {
    return (await request<{ entry: AlcoholCheck }>("/access-control/alcohol-checks", { method: "POST", body: body(data) })).entry;
  },
  async updateAlcoholCheck(id: string, data: Omit<AlcoholCheck, "id" | "siteName">) {
    return (await request<{ entry: AlcoholCheck }>(`/access-control/alcohol-checks/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteAlcoholCheck(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId });
    return request<{ id: string; deleted: boolean }>(`/access-control/alcohol-checks/${encodeURIComponent(id)}?${params}`, { method: "DELETE" });
  },
  async listLogistics(siteId?: string) { return (await request<{ entries: any[] }>(`/logistics${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async getTruckChecklist(siteId: string, date: string) {
    const params = new URLSearchParams({ siteId, date });
    return (await request<{ entry: TruckChecklist | null }>(`/truck-checklists?${params}`)).entry;
  },
  async saveTruckChecklist(data: { siteId: string; date: string; rows: TruckChecklistRow[] }) {
    return (await request<{ entry: TruckChecklist }>("/truck-checklists", { method: "PUT", body: body(data) })).entry;
  },
  async createLogistics(data: unknown) {
    return request<{ entry?: any; entries?: any[] }>("/logistics", { method: "POST", body: body(data) });
  },
  async updateTruckLogistics(id: string, type: "DECHARGEMENT" | "CHARGEMENT", data: unknown) {
    return request<{ entry: any }>(`/logistics/${encodeURIComponent(id)}?type=${type}`, { method: "PUT", body: body(data) });
  },
  async deleteTruckLogistics(id: string, type: "DECHARGEMENT" | "CHARGEMENT", siteId: string) {
    const params = new URLSearchParams({ type, siteId });
    return request<{ id: string; deleted: boolean }>(`/logistics/${encodeURIComponent(id)}?${params}`, { method: "DELETE" });
  },
  async listStarParticulierLoadings(siteId: string) {
    const query = `?siteId=${encodeURIComponent(siteId)}`;
    const rows = await request<{ entries: StarParticulierLoading[] }>(`/logistics/star-particulier${query}`);
    return rows.entries.filter((entry) => entry.typeChargement === "STAR" || entry.typeChargement === "PARTICULIER");
  },
  async createStarParticulierLoading(data: Omit<StarParticulierLoading, "id" | "type" | "date" | "siteName" | "siteId"> & { siteId: string }) {
    return (await request<{ entry: StarParticulierLoading }>("/logistics/star-particulier", { method: "POST", body: body(data) })).entry;
  },
  async updateStarParticulierLoading(id: string, data: Omit<StarParticulierLoading, "id" | "type" | "date" | "siteName" | "siteId"> & { siteId: string }) {
    return (await request<{ entry: StarParticulierLoading }>(`/logistics/star-particulier/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteStarParticulierLoading(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId });
    return request<{ id: string; deleted: boolean }>(`/logistics/star-particulier/${encodeURIComponent(id)}?${params}`, { method: "DELETE" });
  },
  async createEmptyBottleDelivery(data: unknown) {
    return request<{ entry: EmptyBottleDelivery }>("/logistics", { method: "POST", body: body(data) });
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
    date: string; heure: string; matricule: string; designation: string; siteId: string; nombre?: number; motif?: string;
  }) {
    const path = kind === "ordures" ? "/waste-register" : "/scrap-register";
    return (await request<{ entry: WasteScrapRegisterEntry }>(path, { method: "POST", body: body(data) })).entry;
  },
  async updateWasteScrapEntry(kind: "ordures" | "ferrailles", id: string, data: {
    date: string; heure: string; matricule: string; designation: string; siteId: string; nombre?: number; motif?: string;
  }) {
    const path = kind === "ordures" ? "/waste-register" : "/scrap-register";
    return (await request<{ entry: WasteScrapRegisterEntry }>(`${path}/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteWasteScrapEntry(kind: "ordures" | "ferrailles", id: string, siteId: string) {
    const path = kind === "ordures" ? "/waste-register" : "/scrap-register";
    return request<{ id: string; deleted: boolean }>(`${path}/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async listBicycleMovements(siteId: string) {
    return (await request<{ entries: BicycleMovement[] }>(`/bicycle-movements?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createBicycleMovement(data: Omit<BicycleMovement, "id" | "prenom" | "section" | "heureSortie">) {
    return (await request<{ entry: BicycleMovement }>("/bicycle-movements", { method: "POST", body: body(data) })).entry;
  },
  async updateBicycleMovement(id: string, data: Omit<BicycleMovement, "id" | "prenom" | "section" | "heureSortie">) {
    return (await request<{ entry: BicycleMovement }>(`/bicycle-movements/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteBicycleMovement(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/bicycle-movements/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async recordBicycleExit(id: string, siteId: string) {
    return (await request<{ entry: BicycleMovement }>(`/bicycle-movements/${encodeURIComponent(id)}/sortie?siteId=${encodeURIComponent(siteId)}`, { method: "PATCH" })).entry;
  },
  async listMotorcycleMovements(siteId: string) {
    return (await request<{ entries: MotorcycleMovement[] }>(`/motorcycle-movements?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createMotorcycleMovement(data: Omit<MotorcycleMovement, "id" | "heureSortie">) {
    return (await request<{ entry: MotorcycleMovement }>("/motorcycle-movements", { method: "POST", body: body(data) })).entry;
  },
  async updateMotorcycleMovement(id: string, data: Omit<MotorcycleMovement, "id" | "heureSortie">) {
    return (await request<{ entry: MotorcycleMovement }>(`/motorcycle-movements/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async recordMotorcycleExit(id: string, siteId: string) {
    return (await request<{ entry: MotorcycleMovement }>(`/motorcycle-movements/${encodeURIComponent(id)}/sortie?siteId=${encodeURIComponent(siteId)}`, { method: "PATCH" })).entry;
  },
  async deleteMotorcycleMovement(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/motorcycle-movements/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async listLogisticsEvents(siteId?: string, type?: "ANOMALIE" | "VIOLATION_PROCEDURE") {
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
  async listVigilance(siteId?: string) { return (await request<{ entries: any[] }>(`/vigilance${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async createVigilance(data: unknown) { return request<{ entries: any[] }>("/vigilance", { method: "POST", body: body(data) }); },
  async listMainCourante(siteId?: string) { return (await request<{ entries: any[] }>(`/main-courante${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async createMainCourante(data: unknown) { return request<{ entry: any }>("/main-courante", { method: "POST", body: body(data) }); },
  async listCourrierMovements(siteId?: string) {
    const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
    return (await request<{ entries: CourrierMovement[] }>(`/courrier-movements${query}`)).entries;
  },
  async createCourrierMovement(data: { date: string; heureEntree: string; prenom: string; designation: string; nombre: number; siteId: string }) {
    return (await request<{ entry: CourrierMovement }>("/courrier-movements", { method: "POST", body: body(data) })).entry;
  },
  async updateCourrierMovement(id: string, data: { date: string; heureEntree: string; prenom: string; designation: string; nombre: number; siteId: string }) {
    return (await request<{ entry: CourrierMovement }>(`/courrier-movements/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async exitCourrierMovement(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId });
    return (await request<{ entry: Pick<CourrierMovement, "id" | "heureSortie"> }>(
      `/courrier-movements/${encodeURIComponent(id)}/exit?${params}`,
      { method: "PATCH", body: "{}" },
    )).entry;
  },
  async deleteCourrierMovement(id: string, siteId: string) {
    const params = new URLSearchParams({ siteId });
    return request<{ id: string; deleted: boolean }>(`/courrier-movements/${encodeURIComponent(id)}?${params}`, { method: "DELETE" });
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
    return (await request<{ entries: VisitorQuestionnaireRecord[] }>(`/visitor-questionnaires?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createVisitorQuestionnaire(data: { data: VisitorQuestionnaireData; siteId: string }) {
    return (await request<{ entry: VisitorQuestionnaireRecord }>("/visitor-questionnaires", { method: "POST", body: body(data) })).entry;
  },
  async updateVisitorQuestionnaire(id: string, data: { data: VisitorQuestionnaireData; siteId: string }) {
    return (await request<{ entry: VisitorQuestionnaireRecord }>(`/visitor-questionnaires/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteVisitorQuestionnaire(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/visitor-questionnaires/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async listObjectDeclarations(siteId: string) {
    return (await request<{ entries: ObjectDeclarationRecord[] }>(`/object-declarations?siteId=${encodeURIComponent(siteId)}`)).entries;
  },
  async createObjectDeclaration(data: { data: ObjectDeclarationData; siteId: string }) {
    return (await request<{ entry: ObjectDeclarationRecord }>("/object-declarations", { method: "POST", body: body(data) })).entry;
  },
  async updateObjectDeclaration(id: string, data: { data: ObjectDeclarationData; siteId: string }) {
    return (await request<{ entry: ObjectDeclarationRecord }>(`/object-declarations/${encodeURIComponent(id)}`, { method: "PUT", body: body(data) })).entry;
  },
  async deleteObjectDeclaration(id: string, siteId: string) {
    return request<{ id: string; deleted: boolean }>(`/object-declarations/${encodeURIComponent(id)}?siteId=${encodeURIComponent(siteId)}`, { method: "DELETE" });
  },
  async getApsAttendance(date: string, service: "jour" | "nuit", siteId: string) {
    return request<{ data: Record<string, any[]> | null; postes: ApsPostConfiguration[] | null }>(`/aps-attendance?date=${encodeURIComponent(date)}&service=${service}&siteId=${encodeURIComponent(siteId)}`);
  },
  async saveApsPostConfiguration(data: { service: "jour" | "nuit"; siteId: string; postes: ApsPostConfiguration[] }) {
    return request<{ saved: boolean; postes: ApsPostConfiguration[] }>("/aps-attendance/posts", { method: "PUT", body: body(data) });
  },
  async lookupEmployeeByMatricule(matricule: string, signal?: AbortSignal) {
    const response = await fetch(`${apiBaseUrl}/employes/${encodeURIComponent(matricule)}`, {
      headers: authHeaders(),
      signal,
    });
    const result = await response.json().catch(() => ({}));
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(result.error || `Erreur API (${response.status})`);
    return result as EmployeeByMatricule;
  },
  async saveApsAttendance(data: { date: string; service: "jour" | "nuit"; siteId: string; data: Record<string, any[]>; postes: ApsPostConfiguration[] }) {
    return request<{ saved: boolean; updatedAt: string }>("/aps-attendance", { method: "PUT", body: body(data) });
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
