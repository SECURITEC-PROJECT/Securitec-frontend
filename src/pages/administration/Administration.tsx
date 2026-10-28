import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Building2, Camera, ContactRound, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { serviceApi, type Provider } from "@/lib/service-api";
import { confirmDeletion } from "@/lib/deletion-toast";

type Site = { id: string; name: string; type: "USINE" | "AGENCE" };
type Employee = { id: string; firstName: string; lastName: string; matricule: string; providerId: string; provider: string; active: boolean; siteId: string | null; siteName: string | null };
type CameraItem = { id: string; name: string; status: string; siteId: string; siteName: string; zoneName: string };
type Zone = { id: string; name: string; siteId: string; siteName: string };
type UserAccount = { id: string; name: string; identifier: string; role: number; siteId: string | null; siteName: string | null };
type Tab = "Vue société" | "Sites" | "Équipe et équipements" | "Prestataires" | "Utilisateurs";

export default function Administration() {
  const [tab, setTab] = useState<Tab>("Vue société");
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showInactiveProviders, setShowInactiveProviders] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);
  const [cameras, setCameras] = useState<CameraItem[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserIdentifier, setNewUserIdentifier] = useState("");
  const [newUserRole, setNewUserRole] = useState("3");
  const [newUserSiteId, setNewUserSiteId] = useState("");
  const [newUserPin, setNewUserPin] = useState("");
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
      if (siteResult.canCreate) {
        const [userRows, providerRows] = await Promise.all([serviceApi.listUsers(), serviceApi.listProviders()]);
        setUsers(userRows);
        setProviders(providerRows);
      } else {
        setProviders([]);
      }
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

  const filteredUsers = useMemo(() => {
    const needle = userQuery.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const role = user.role === 1 ? "ADMIN" : user.role === 2 ? "SUPERVISEUR" : "AGENT";
      return (userRoleFilter === "ALL" || role === userRoleFilter) && (!needle || `${user.name} ${user.identifier} ${user.siteName || ""}`.toLocaleLowerCase().includes(needle));
    });
  }, [users, userQuery, userRoleFilter]);

  const displayedProviders = showInactiveProviders
    ? providers
    : providers.filter((provider) => provider.active);

  const resetUserForm = () => {
    setShowUserForm(false); setEditingUserId(null); setNewUserName(""); setNewUserIdentifier("");
    setNewUserRole("3"); setNewUserSiteId(""); setNewUserPin("");
  };

  const startCreateUser = () => {
    setEditingUserId(null); setNewUserName(""); setNewUserIdentifier("");
    setNewUserRole("3"); setNewUserSiteId(""); setNewUserPin(""); setShowUserForm(true);
  };

  const editUser = (user: UserAccount) => {
    setEditingUserId(user.id); setNewUserName(user.name); setNewUserIdentifier(user.identifier);
    setNewUserRole(String(user.role)); setNewUserSiteId(user.siteId || ""); setNewUserPin("");
    setShowUserForm(true);
  };

  const deleteUser = async (user: UserAccount) => {
    if (!(await confirmDeletion(`Désactiver le compte de ${user.name} ? Son accès sera supprimé et ses historiques conservés.`))) return;
    try {
      await serviceApi.deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      if (editingUserId === user.id) resetUserForm();
      toast.success("Le compte utilisateur a été supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression du compte impossible.");
    }
  };

  const saveUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const role = Number(newUserRole);
    const siteId = newUserSiteId || null;
    if (role !== 1 && !siteId) {
      toast.error("Un site est obligatoire pour un agent ou un superviseur.");
      return;
    }
    setSavingUser(true);
    try {
      const data = { name: newUserName.trim(), identifier: newUserIdentifier.trim(), role, pin: newUserPin, siteId };
      if (editingUserId) {
        const user = await serviceApi.updateUser(editingUserId, data);
        setUsers((current) => current.map((item) => item.id === user.id ? user : item));
        toast.success("Le compte utilisateur a été modifié.");
      } else {
        const user = await serviceApi.createUser(data);
        setUsers((current) => [...current, user].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Le compte utilisateur a été créé.");
      }
      resetUserForm();
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Création du compte impossible.");
    } finally {
      setSavingUser(false);
    }
  };

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
    if (!(await confirmDeletion(`Archiver « ${site.name} » ? Le site sera retiré des listes actives et ses historiques seront conservés.`))) return;
    try {
      await serviceApi.archiveSite(site.id);
      toast.success("Site archivé.");
      await load(true);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Archivage du site impossible.");
    }
  };

  const saveProvider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProvider(true);
    try {
      if (editingProviderId) {
        const updated = await serviceApi.updateProvider(editingProviderId, { name: providerName.trim() });
        setProviders((current) => current.map((provider) => provider.id === updated.id ? { ...provider, ...updated } : provider));
        toast.success("Prestataire modifié.");
      } else {
        const created = await serviceApi.createProvider(providerName.trim());
        setProviders((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success("Prestataire ajouté.");
      }
      setProviderName("");
      setEditingProviderId(null);
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement du prestataire impossible.");
    } finally {
      setSavingProvider(false);
    }
  };

  const toggleProvider = async (provider: Provider) => {
    try {
      const updated = await serviceApi.updateProvider(provider.id, { name: provider.name, active: !provider.active });
      setProviders((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item));
      toast.success(provider.active ? "Prestataire désactivé." : "Prestataire réactivé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Modification du prestataire impossible.");
    }
  };

  const deleteProvider = async (provider: Provider) => {
    if (!(await confirmDeletion(`Supprimer « ${provider.name} » ? S’il est utilisé, il sera désactivé afin de préserver les historiques.`))) return;
    try {
      const result = await serviceApi.deleteProvider(provider.id);
      if (result.deactivated) {
        setProviders((current) => current.map((item) => item.id === provider.id ? { ...item, active: false } : item));
        if (editingProviderId === provider.id) { setEditingProviderId(null); setProviderName(""); }
        toast.success("Prestataire désactivé ; ses historiques sont conservés.");
      }
      else {
        setProviders((current) => current.filter((item) => item.id !== provider.id));
        toast.success("Prestataire supprimé.");
      }
      if (editingProviderId === provider.id) { setEditingProviderId(null); setProviderName(""); }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression du prestataire impossible.");
    }
  };

  const tabs: Tab[] = ["Vue société", "Sites", "Équipe et équipements", ...(canManageSites ? ["Prestataires" as const, "Utilisateurs" as const] : [])];
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
      {tab === "Prestataires" && canManageSites && <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title={`Prestataires (${displayedProviders.length})`}>
          <div className="mb-3 flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowInactiveProviders((visible) => !visible)}>
              {showInactiveProviders ? "Masquer les prestataires inactifs" : `Afficher les prestataires inactifs (${providers.filter((provider) => !provider.active).length})`}
            </Button>
          </div>
          {displayedProviders.length ? <div className="divide-y">{displayedProviders.map((provider) => <div key={provider.id} className="flex flex-wrap items-center gap-3 py-4">
            <div className="min-w-0 flex-1"><p className="font-medium">{provider.name}</p><p className="text-xs text-muted-foreground">{provider.employeeCount} employé(s) · {provider.materialCount} mouvement(s) matériel</p></div>
            <Badge variant={provider.active ? "secondary" : "outline"}>{provider.active ? "Actif" : "Inactif"}</Badge>
            <Button type="button" variant="ghost" size="icon" aria-label={`Modifier ${provider.name}`} title="Modifier" onClick={() => { setEditingProviderId(provider.id); setProviderName(provider.name); }}><Pencil className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label={provider.active ? `Désactiver ${provider.name}` : `Réactiver ${provider.name}`} title={provider.active ? "Désactiver" : "Réactiver"} onClick={() => void toggleProvider(provider)}><RefreshCw className="h-4 w-4" /></Button>
            <Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${provider.name}`} title="Supprimer" onClick={() => void deleteProvider(provider)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>)}</div> : <p className="py-6 text-center text-sm text-muted-foreground">{showInactiveProviders ? "Aucun prestataire enregistré." : "Aucun prestataire actif."}</p>}
        </Panel>
        <Panel title={editingProviderId ? "Modifier un prestataire" : "Ajouter un prestataire"}>
          <form className="space-y-4" onSubmit={(event) => void saveProvider(event)}>
            <div><Label htmlFor="provider-name">Nom du prestataire</Label><Input id="provider-name" required maxLength={160} value={providerName} onChange={(event) => setProviderName(event.target.value)} placeholder="Nom de la société" /></div>
            <div className="flex gap-2"><Button className="flex-1" disabled={savingProvider}>{savingProvider ? "Enregistrement…" : editingProviderId ? "Enregistrer" : "Ajouter"}</Button>{editingProviderId && <Button type="button" variant="outline" onClick={() => { setEditingProviderId(null); setProviderName(""); }}>Annuler</Button>}</div>
          </form>
        </Panel>
      </div>}
      {tab === "Utilisateurs" && canManageSites && <Panel title={`Comptes utilisateurs (${filteredUsers.length})`}>
        <div className="mb-4 flex justify-end"><Button type="button" onClick={() => showUserForm ? resetUserForm() : startCreateUser()}><Plus className="h-4 w-4" />{showUserForm ? "Annuler" : "Ajouter un utilisateur"}</Button></div>
        {showUserForm && <form className="mb-6 grid gap-4 rounded-lg border bg-muted/20 p-4 sm:grid-cols-2" onSubmit={(event) => void saveUser(event)}>
          <div><Label htmlFor="new-user-name">Nom complet</Label><Input id="new-user-name" required maxLength={255} value={newUserName} onChange={(event) => setNewUserName(event.target.value)} /></div>
          <div><Label htmlFor="new-user-identifier">Identifiant de connexion</Label><Input id="new-user-identifier" required maxLength={100} autoComplete="username" value={newUserIdentifier} onChange={(event) => setNewUserIdentifier(event.target.value)} /></div>
          <div><Label htmlFor="new-user-role">Rôle</Label><select id="new-user-role" value={newUserRole} onChange={(event) => setNewUserRole(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="1">Administrateur</option><option value="2">Superviseur</option><option value="3">Agent</option></select></div>
          <div><Label htmlFor="new-user-site">Site {newUserRole === "1" ? "(facultatif)" : ""}</Label><select id="new-user-site" required={newUserRole !== "1"} value={newUserSiteId} onChange={(event) => setNewUserSiteId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">{newUserRole === "1" ? "Aucun site" : "Choisir un site"}</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></div>
          <div><Label htmlFor="new-user-pin">PIN {editingUserId ? "(laisser vide pour conserver l’actuel)" : "temporaire"} · 6 chiffres</Label><Input id="new-user-pin" required={!editingUserId} type="password" inputMode="numeric" pattern={newUserPin ? "[0-9]{6}" : editingUserId ? undefined : "[0-9]{6}"} minLength={newUserPin ? 6 : editingUserId ? undefined : 6} maxLength={6} autoComplete="new-password" value={newUserPin} onChange={(event) => setNewUserPin(event.target.value.replace(/\D/g, "").slice(0, 6))} /></div>
          <div className="flex items-end"><Button type="submit" disabled={savingUser}>{savingUser ? "Enregistrement…" : editingUserId ? "Enregistrer les modifications" : "Créer le compte"}</Button></div>
        </form>}
        <div className="mb-4 flex flex-wrap gap-3">
          <Input aria-label="Rechercher un utilisateur" placeholder="Nom, identifiant ou site…" className="max-w-md" value={userQuery} onChange={(event) => setUserQuery(event.target.value)} />
          <select aria-label="Filtrer par rôle" value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="ALL">Tous les rôles</option><option value="ADMIN">Administrateur</option><option value="SUPERVISEUR">Superviseur</option><option value="AGENT">Agent</option>
          </select>
        </div>
        {filteredUsers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b text-xs text-muted-foreground"><tr><th className="py-3 pr-4">Nom</th><th className="py-3 pr-4">Identifiant</th><th className="py-3 pr-4">Rôle</th><th className="py-3 pr-4">Site</th><th className="py-3">Actions</th></tr></thead><tbody className="divide-y">{filteredUsers.map((user) => <tr key={user.id}><td className="py-3 pr-4 font-medium">{user.name}</td><td className="py-3 pr-4 font-mono text-xs">{user.identifier}</td><td className="py-3 pr-4">{user.role === 1 ? "Administrateur" : user.role === 2 ? "Superviseur" : "Agent"}</td><td className="py-3 pr-4">{user.siteName || "—"}</td><td className="py-3"><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label={`Modifier ${user.name}`} title="Modifier" onClick={() => editUser(user)}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" aria-label={`Supprimer ${user.name}`} title="Supprimer" onClick={() => void deleteUser(user)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></td></tr>)}</tbody></table></div> : <p className="py-6 text-center text-sm text-muted-foreground">Aucun utilisateur ne correspond aux filtres.</p>}
      </Panel>}
    </>}
  </div>;
}
