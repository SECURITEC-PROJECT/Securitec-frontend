const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const tokenKey = "securitec-access-token";

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
  async listSites() { return request<{ sites: { id: string; name: string; type: "USINE" | "AGENCE" }[]; canCreate: boolean; canDelete: boolean }>("/sites"); },
  async createSite(data: { name: string; type: "USINE" | "AGENCE" }) { return (await request<{ site: { id: string; name: string; type: "USINE" | "AGENCE" } }>("/sites", { method: "POST", body: body(data) })).site; },
  async archiveSite(id: string) { return request<{ id: string; archived: boolean }>(`/sites/${id}`, { method: "DELETE" }); },
  async listShifts() { return (await request<{ shifts: any[] }>("/shifts")).shifts; },
  async startShift(data: unknown) { return (await request<{ shift: any }>("/shifts", { method: "POST", body: body(data) })).shift; },
  async endShift(id: string) { return (await request<{ shift: any }>(`/shifts/${id}/end`, { method: "POST", body: "{}" })).shift; },
  async listPassations() { return (await request<{ passations: any[] }>("/passations")).passations; },
  async createPassation(data: unknown) { return (await request<{ passation: any }>("/passations", { method: "POST", body: body(data) })).passation; },
  async listVisitors() { return (await request<{ visitors: any[] }>("/visitors")).visitors; },
  async createVisitor(data: unknown) { return (await request<{ visitor: any }>("/visitors", { method: "POST", body: body(data) })).visitor; },
  async exitVisitor(id: string, data: unknown) { return (await request<{ visitor: any }>(`/visitors/${id}/exit`, { method: "PATCH", body: body(data) })).visitor; },
  async listVehicles() { return (await request<{ vehicles: any[] }>("/vehicles")).vehicles; },
  async createVehicle(data: unknown) { return (await request<{ vehicle: any }>("/vehicles", { method: "POST", body: body(data) })).vehicle; },
  async exitVehicle(id: string) { return (await request<{ vehicle: any }>(`/vehicles/${id}/exit`, { method: "PATCH", body: "{}" })).vehicle; },
  async listKeyTracking(siteId?: string) { return (await request<{ entries: any[] }>(`/access-control/keys${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async createKeyTracking(data: unknown) { return (await request<{ entry: any }>("/access-control/keys", { method: "POST", body: body(data) })).entry; },
  async listBreathTests(siteId?: string) { return (await request<{ entries: any[] }>(`/access-control/breath-tests${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async createBreathTest(data: unknown) { return (await request<{ entry: any }>("/access-control/breath-tests", { method: "POST", body: body(data) })).entry; },
  async listLogistics(siteId?: string) { return (await request<{ entries: any[] }>(`/logistics${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).entries; },
  async createLogistics(data: unknown) {
    return request<{ entry?: any; entries?: any[] }>("/logistics", { method: "POST", body: body(data) });
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
  async listPatrols() { return (await request<{ patrols: any[] }>("/patrols")).patrols; },
  async startPatrol(data: unknown) { return (await request<{ patrol: any }>("/patrols", { method: "POST", body: body(data) })).patrol; },
  async updatePatrol(id: string, checkpoints: { name: string; at: string | null }[]) { return (await request<{ patrol: any }>(`/patrols/${id}`, { method: "PATCH", body: body({ checkpoints }) })).patrol; },
  async finishPatrol(id: string, observations: string) { return (await request<{ patrol: any }>(`/patrols/${id}/finish`, { method: "POST", body: body({ observations }) })).patrol; },
  async listCameras(siteId?: string) { return (await request<{ cameras: any[] }>(`/cameras${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).cameras; },
  async listCameraZones(siteId?: string) { return (await request<{ zones: any[] }>(`/camera-zones${siteId ? `?siteId=${encodeURIComponent(siteId)}` : ""}`)).zones; },
  async createCamera(data: unknown) { return (await request<{ camera: any }>("/cameras", { method: "POST", body: body(data) })).camera; },
  async updateCamera(id: string, data: unknown) { return (await request<{ camera: any }>(`/cameras/${id}`, { method: "PUT", body: body(data) })).camera; },
  async setCameraStatus(id: string, status: "EN_SERVICE" | "MAINTENANCE") { return (await request<{ camera: any }>(`/cameras/${id}`, { method: "PATCH", body: body({ status }) })).camera; },
  async deleteCamera(id: string) { return request<{ id: string; deleted: boolean }>(`/cameras/${id}`, { method: "DELETE" }); },
  async listReports(date?: string) { return (await request<{ reports: any[] }>(`/service-reports${date ? `?date=${encodeURIComponent(date)}` : ""}`)).reports; },
  async createReport(data: unknown) { return (await request<{ report: any }>("/service-reports", { method: "POST", body: body(data) })).report; },
  async updateReport(id: string, data: unknown) { return (await request<{ report: any }>(`/service-reports/${id}`, { method: "PUT", body: body(data) })).report; },
  async submitReport(id: string) { return request<{ id: string; statut: string }>(`/service-reports/${id}/submit`, { method: "POST", body: "{}" }); },
  async reportAudit(id: string) { return (await request<{ audit: any[] }>(`/service-reports/${id}/audit`)).audit; },
};
