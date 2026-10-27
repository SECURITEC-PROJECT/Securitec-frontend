import { API_URL } from "@/lib/api";

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
  async listVisitors(siteId?: string) { return (await request<{ visitors: any[] }>(`/visitors${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).visitors; },
  async createVisitor(data: unknown) { return (await request<{ visitor: any }>("/visitors", { method: "POST", body: body(data) })).visitor; },
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
  async listLogistics(siteId?: string) { return (await request<{ entries: any[] }>(`/logistics${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
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
  async listPatrols(siteId?: string) { return (await request<{ patrols: any[] }>(`/patrols${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).patrols; },
  async startPatrol(data: unknown) { return (await request<{ patrol: any }>("/patrols", { method: "POST", body: body(data) })).patrol; },
  async updatePatrol(id: string, checkpoints: { name: string; at: string | null }[]) { return (await request<{ patrol: any }>(`/patrols/${id}`, { method: "PATCH", body: body({ checkpoints }) })).patrol; },
  async finishPatrol(id: string, observations: string) { return (await request<{ patrol: any }>(`/patrols/${id}/finish`, { method: "POST", body: body({ observations }) })).patrol; },
  async listVigilance(siteId?: string) { return (await request<{ entries: any[] }>(`/vigilance${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async createVigilance(data: unknown) { return request<{ entries: any[] }>("/vigilance", { method: "POST", body: body(data) }); },
  async listMainCourante(siteId?: string) { return (await request<{ entries: any[] }>(`/main-courante${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async createMainCourante(data: unknown) { return request<{ entry: any }>("/main-courante", { method: "POST", body: body(data) }); },
  async listCameras(siteId?: string) { return (await request<{ cameras: any[] }>(`/cameras${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).cameras; },
  async listCameraZones(siteId?: string) { return (await request<{ zones: any[] }>(`/camera-zones${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).zones; },
  async createCamera(data: unknown) { return (await request<{ camera: any }>("/cameras", { method: "POST", body: body(data) })).camera; },
  async updateCamera(id: string, data: unknown) { return (await request<{ camera: any }>(`/cameras/${id}`, { method: "PUT", body: body(data) })).camera; },
  async setCameraStatus(id: string, status: "EN_SERVICE" | "MAINTENANCE") { return (await request<{ camera: any }>(`/cameras/${id}`, { method: "PATCH", body: body({ status }) })).camera; },
  async deleteCamera(id: string) { return request<{ id: string; deleted: boolean }>(`/cameras/${id}`, { method: "DELETE" }); },
  async listEmployees() { return (await request<{ employees: any[] }>("/employees")).employees; },
  async createEmployee(data: unknown) { return (await request<{ employee: any }>("/employees", { method: "POST", body: body(data) })).employee; },
  async updateEmployee(id: string, data: unknown) { return (await request<{ employee: any }>(`/employees/${id}`, { method: "PUT", body: body(data) })).employee; },
  async setEmployeeActive(id: string, active: boolean) { return (await request<{ employee: any }>(`/employees/${id}`, { method: "PATCH", body: body({ active }) })).employee; },
  async findEmployeeByMatricule(matricule: string) { return (await request<{ employee: any }>(`/employees/by-matricule/${encodeURIComponent(matricule)}`)).employee; },
  async listReports(date?: string) { return (await request<{ reports: any[] }>(`/service-reports${date ? `?date=${encodeURIComponent(date)}` : ""}`)).reports; },
  async createReport(data: unknown) { return (await request<{ report: any }>("/service-reports", { method: "POST", body: body(data) })).report; },
  async updateReport(id: string, data: unknown) { return (await request<{ report: any }>(`/service-reports/${id}`, { method: "PUT", body: body(data) })).report; },
  async submitReport(id: string) { return request<{ id: string; statut: string }>(`/service-reports/${id}/submit`, { method: "POST", body: "{}" }); },
  async reportAudit(id: string) { return (await request<{ audit: any[] }>(`/service-reports/${id}/audit`)).audit; },
};
