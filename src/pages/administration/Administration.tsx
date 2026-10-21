import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Camera, ContactRound, Plus, RefreshCw, Trash2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { serviceApi } from "@/lib/service-api";

type Site = { id: string; name: string; type: "USINE" | "AGENCE" };
type Employee = { id: string; firstName: string; lastName: string; matricule: string; provider: string; active: boolean; siteId: string | null; siteName: string | null };
type CameraItem = { id: string; name: string; status: string; siteId: string; siteName: string; zoneName: string };
type Zone = { id: string; name: string; siteId: string; siteName: string };
type Tab = "Vue société" | "Sites" | "Équipe et équipements";

export default function Administration() {
  const [tab, setTab] = useState<Tab>("Vue société");
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [canManageSites, setCanManageSites] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteType, setSiteType] = useState<Site["type"]>("USINE");
  const [savingSite, setSavingSite] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError("");
    try {
      const siteResult = await serviceApi.listSites();
      setSites(siteResult.sites);
      setCanManageSites(siteResult.canCreate && siteResult.canDelete);
      const employeeResult = await serviceApi.listEmployees();
      setEmployees(employeeResult);
      const cameraResults = await Promise.all(siteResult.sites.map(async (site) => {
        const [siteCameras, siteZones] = await Promise.all([
          serviceApi.listCameras(site.id),
          serviceApi.listCameraZones(site.id),
        ]);
        return { siteCameras, siteZones };
      }));
      setCameras(cameraResults.flatMap((result) => result.siteCameras));
      setZones(cameraResults.flatMap((result) => result.siteZones));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Chargement des données d’administration impossible.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filteredEmployees = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return employees;
    return employees.filter((employee) => `${employee.firstName} ${employee.lastName} ${employee.matricule} ${employee.provider} ${employee.siteName || ""}`.toLocaleLowerCase().includes(needle));
  }, [employees, query]);

  const createSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSite(true);
    try {
      await serviceApi.createSite({ name: siteName.trim(), type: siteType, address: siteAddress.trim() });
      setSiteName(""); setSiteAddress(""); setSiteType("USINE");
      toast.success("Site ajouté à la société.");
      await load(true);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Création du site impossible.");
    } finally { setSavingSite(false); }
  };

  const archiveSite = async (site: Site) => {
    if (!window.confirm(`Archiver « ${site.name} » ? Le site sera retiré des listes actives et ses historiques seront conservés.`)) return;
    try {
      await serviceApi.archiveSite(site.id);
      toast.success("Site archivé.");
      await load(true);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Archivage du site impossible.");
    }
  };

  const tabs: Tab[] = ["Vue société", "Sites", "Équipe et équipements"];
  return <div className="space-y-6">
    <PageHeader title="Administration de la société" subtitle="Vue globale des sites, des équipes et des équipements enregistrés dans la base." action={<Button variant="outline" onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Actualiser</Button>} />

    <div className="flex flex-wrap gap-1 border-b pb-3" role="tablist" aria-label="Sections administration">
      {tabs.map((item) => <Button key={item} role="tab" aria-selected={tab === item} variant={tab === item ? "secondary" : "ghost"} onClick={() => setTab(item)}>{item}</Button>)}
    </div>

    {error && <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    {loading ? <p className="py-12 text-center text-sm text-muted-foreground">Chargement des données de la société…</p> : <>
      {tab === "Vue société" && <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Sites actifs", count: sites.length, Icon: Building2 },
            { title: "Employés", count: employees.length, Icon: ContactRound },
            { title: "Employés actifs", count: employees.filter((item) => item.active).length, Icon: ContactRound },
            { title: "Caméras", count: cameras.length, Icon: Camera },
          ].map(({ title, count, Icon }) => <div key={title} className="rounded-lg border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{title}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-3 text-3xl font-semibold">{count}</p></div>)}
        </div>
        <Panel title="Situation par site">
          {sites.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sites.map((site) => {
            const siteEmployees = employees.filter((employee) => employee.siteId === site.id);
            const siteCameras = cameras.filter((camera) => camera.siteId === site.id);
            const siteZones = zones.filter((zone) => zone.siteId === site.id);
            return <article key={site.id} className="rounded-lg border p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{site.name}</h2><p className="mt-1 text-xs text-muted-foreground">{site.type === "USINE" ? "Usine" : "Agence"}</p></div><Badge variant="outline">Actif</Badge></div><div className="mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center"><div><p className="text-xl font-semibold">{siteEmployees.length}</p><p className="text-xs text-muted-foreground">Employés</p></div><div><p className="text-xl font-semibold">{siteZones.length}</p><p className="text-xs text-muted-foreground">Zones</p></div><div><p className="text-xl font-semibold">{siteCameras.length}</p><p className="text-xs text-muted-foreground">Caméras</p></div></div></article>;
          })}</div> : <p className="text-sm text-muted-foreground">Aucun site actif.</p>}
        </Panel>
        {employees.some((employee) => !employee.siteId || !sites.some((site) => site.id === employee.siteId)) && <Panel title="Employés sans site actif"><ul className="divide-y">{employees.filter((employee) => !employee.siteId || !sites.some((site) => site.id === employee.siteId)).map((employee) => <li key={employee.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{employee.firstName} {employee.lastName} · {employee.matricule}</span><span className="text-muted-foreground">{employee.siteName || "Affectation à vérifier"}</span></li>)}</ul></Panel>}
      </div>}

      {tab === "Sites" && <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={`Sites actifs (${sites.length})`}>
          {sites.length ? <div className="divide-y">{sites.map((site) => <div key={site.id} className="flex flex-wrap items-center gap-3 py-4"><Building2 className="h-5 w-5 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="font-medium">{site.name}</p><p className="text-xs text-muted-foreground">{site.type === "USINE" ? "Usine" : "Agence"} · {employees.filter((item) => item.siteId === site.id).length} employé(s)</p></div><Badge variant="outline">Actif</Badge>{canManageSites && <Button type="button" variant="ghost" size="icon" title={`Archiver ${site.name}`} aria-label={`Archiver ${site.name}`} onClick={() => void archiveSite(site)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}</div>)}</div> : <p className="text-sm text-muted-foreground">Aucun site actif.</p>}
        </Panel>
        {canManageSites ? <Panel title="Ajouter un site"><form className="space-y-4" onSubmit={(event) => void createSite(event)}><div><Label htmlFor="company-site-name">Nom du site</Label><Input id="company-site-name" required maxLength={255} value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="Ex. Agence centre-ville" /></div><div><Label htmlFor="company-site-type">Type</Label><select id="company-site-type" value={siteType} onChange={(event) => setSiteType(event.target.value as Site["type"])} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="USINE">Usine</option><option value="AGENCE">Agence</option></select></div><div><Label htmlFor="company-site-address">Adresse (facultatif)</Label><Input id="company-site-address" maxLength={2000} value={siteAddress} onChange={(event) => setSiteAddress(event.target.value)} /></div><Button className="w-full" disabled={savingSite}><Plus className="h-4 w-4" />{savingSite ? "Enregistrement…" : "Ajouter à la société"}</Button></form></Panel> : <Panel title="Gestion des sites"><p className="text-sm text-muted-foreground">La gestion globale des sites est réservée au compte administrateur de la société.</p></Panel>}
      </div>}

      {tab === "Équipe et équipements" && <div className="space-y-8">
        <Panel title={`Équipe de la société (${filteredEmployees.length})`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Input aria-label="Rechercher un employé" placeholder="Nom, matricule, prestataire ou site…" className="max-w-md" value={query} onChange={(event) => setQuery(event.target.value)} /><Button asChild variant="outline"><Link to="/dashboard/employes">Gérer les employés</Link></Button></div>
          {filteredEmployees.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="py-3 pr-4">Employé</th><th className="py-3 pr-4">Matricule</th><th className="py-3 pr-4">Prestataire</th><th className="py-3 pr-4">Site</th><th className="py-3">État</th></tr></thead><tbody className="divide-y">{filteredEmployees.map((employee) => <tr key={employee.id}><td className="py-3 pr-4 font-medium">{employee.firstName} {employee.lastName}</td><td className="py-3 pr-4 font-mono text-xs">{employee.matricule}</td><td className="py-3 pr-4">{employee.provider}</td><td className="py-3 pr-4">{employee.siteName || "—"}</td><td className="py-3"><Badge variant={employee.active ? "secondary" : "outline"}>{employee.active ? "Actif" : "Inactif"}</Badge></td></tr>)}</tbody></table></div> : <p className="py-6 text-center text-sm text-muted-foreground">Aucun employé ne correspond à cette recherche.</p>}
        </Panel>
        <Panel title={`Équipements enregistrés (${cameras.length} caméras · ${zones.length} zones)`}>
          <div className="mb-4 flex justify-end"><Button asChild variant="outline"><Link to="/dashboard/cameras">Gérer les caméras</Link></Button></div>
          {cameras.length ? <div className="divide-y">{cameras.map((camera) => <div key={camera.id} className="flex flex-wrap items-center gap-3 py-3"><Camera className="h-4 w-4 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="text-sm font-medium">{camera.name}</p><p className="text-xs text-muted-foreground">{camera.siteName} · {camera.zoneName}</p></div><Badge variant={camera.status === "EN_SERVICE" ? "secondary" : "outline"}>{camera.status === "EN_SERVICE" ? "En service" : camera.status}</Badge></div>)}</div> : <p className="py-5 text-sm text-muted-foreground">Aucune caméra enregistrée.</p>}
        </Panel>
      </div>}
    </>}
  </div>;
}
