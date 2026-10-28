import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { serviceApi, type Provider } from "@/lib/service-api";
import { confirmDeletion } from "@/lib/deletion-toast";
import { useSites } from "@/hooks/useSites";
import { Pencil, Plus, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";

type Employee = { id: string; firstName: string; lastName: string; matricule: string; providerId: string; provider: string; active: boolean; siteId: string | null; siteName: string | null };
type EmployeeForm = { firstName: string; lastName: string; matricule: string; providerId: string; siteId: string };
const emptyForm: EmployeeForm = { firstName: "", lastName: "", matricule: "", providerId: "", siteId: "" };

export default function Employes() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const [savingSite, setSavingSite] = useState(false);
  const { sites, siteError, canCreateSite, canDeleteSite, addSite, archiveSite } = useSites();

  const refresh = useCallback(async () => {
    try {
      const [employeeRows, providerRows] = await Promise.all([serviceApi.listEmployees(), serviceApi.listProviders()]);
      setEmployees(employeeRows);
      setProviders(providerRows);
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Impossible de charger les employés."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) await serviceApi.updateEmployee(editing.id, form);
      else await serviceApi.createEmployee(form);
      toast.success(editing ? "Employé mis à jour." : "Employé ajouté.");
      setEditing(null); setForm(emptyForm); await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Enregistrement impossible."); }
    finally { setSaving(false); }
  };

  const edit = (employee: Employee) => {
    setEditing(employee);
    setForm({ firstName: employee.firstName, lastName: employee.lastName, matricule: employee.matricule, providerId: employee.providerId, siteId: employee.siteId || "" });
  };

  const toggleActive = async (employee: Employee) => {
    try {
      await serviceApi.setEmployeeActive(employee.id, !employee.active);
      toast.success(employee.active ? "Employé désactivé." : "Employé réactivé.");
      await refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Modification impossible."); }
  };

  const createWorkSite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSite(true);
    try {
      const site = await addSite(siteName, siteType);
      setForm((current) => ({ ...current, siteId: site.id }));
      setSiteName(""); setSiteType("USINE"); setSiteDialogOpen(false);
      toast.success("Site de travail ajouté.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Création du site impossible."); }
    finally { setSavingSite(false); }
  };

  const removeWorkSite = async () => {
    const site = sites.find((item) => item.id === form.siteId);
    if (!site || !(await confirmDeletion(`Retirer le site « ${site.name} » de la liste ? Il sera archivé pour conserver les historiques.`))) return;
    try {
      await archiveSite(site.id);
      setForm((current) => ({ ...current, siteId: current.siteId === site.id ? "" : current.siteId }));
      toast.success("Site archivé et retiré de la liste.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Suppression du site impossible."); }
  };

  return <div className="space-y-6">
    <PageHeader title="Employés" subtitle="Gérez les agents et leurs prestataires." />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title={`Équipe (${employees.length})`}>
        {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Chargement…</p> : employees.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Aucun employé enregistré.</p> :
          <div className="divide-y">{employees.map((employee) => <div key={employee.id} className="flex flex-wrap items-center gap-3 py-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-medium text-primary">{employee.firstName[0]}{employee.lastName[0]}</span>
            <div className="min-w-0 flex-1"><p className="font-medium">{employee.firstName} {employee.lastName}</p><p className="text-xs text-muted-foreground">Matricule : {employee.matricule} · {employee.provider} · {employee.siteName || "Aucun site affecté"}</p></div>
            <span className={`text-xs ${employee.active ? "text-success" : "text-muted-foreground"}`}>{employee.active ? "Actif" : "Inactif"}</span>
            <Button variant="ghost" size="icon" title="Modifier" aria-label={`Modifier ${employee.firstName} ${employee.lastName}`} onClick={() => edit(employee)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" title={employee.active ? "Désactiver" : "Réactiver"} aria-label={employee.active ? "Désactiver" : "Réactiver"} onClick={() => void toggleActive(employee)}>{employee.active ? <UserRoundX className="h-4 w-4" /> : <UserRoundCheck className="h-4 w-4" />}</Button>
          </div>)}</div>}
      </Panel>
      <Panel title={editing ? "Modifier un employé" : "Ajouter un employé"}>
        <form className="space-y-4" onSubmit={(event) => void submit(event)}>
          <div><Label htmlFor="employee-first-name">Prénom</Label><Input id="employee-first-name" required maxLength={100} value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} /></div>
          <div><Label htmlFor="employee-last-name">Nom</Label><Input id="employee-last-name" required maxLength={100} value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} /></div>
          <div><Label htmlFor="employee-matricule">Matricule</Label><Input id="employee-matricule" required maxLength={50} value={form.matricule} onChange={(event) => setForm({ ...form, matricule: event.target.value })} /></div>
          <div><Label htmlFor="employee-provider">Prestataire</Label><select id="employee-provider" required value={form.providerId} onChange={(event) => setForm({ ...form, providerId: event.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner un prestataire</option>{providers.filter((provider) => provider.active || provider.id === form.providerId).map((provider) => <option key={provider.id} value={provider.id}>{provider.name}{provider.active ? "" : " (inactif)"}</option>)}</select>{!providers.some((provider) => provider.active) && <p className="mt-1 text-xs text-muted-foreground">Créez ou réactivez un prestataire dans Administration avant d’ajouter un employé.</p>}</div>
          <div><Label htmlFor="employee-site">Site de travail</Label><div className="mt-1 flex gap-2"><select id="employee-site" required value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })} className="flex h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"><option value="">Sélectionner un site</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>{canCreateSite && <Button type="button" variant="outline" size="icon" title="Ajouter un site" aria-label="Ajouter un site" onClick={() => setSiteDialogOpen(true)}><Plus className="h-4 w-4" /></Button>}{canDeleteSite && <Button type="button" variant="outline" size="icon" title="Retirer le site sélectionné" aria-label="Retirer le site sélectionné" disabled={!form.siteId} onClick={() => void removeWorkSite()}><Trash2 className="h-4 w-4" /></Button>}</div>{siteError && <p className="mt-1 text-xs text-destructive">{siteError}</p>}</div>
          <Button className="w-full" disabled={saving || !providers.some((provider) => provider.active || provider.id === form.providerId)}>{editing ? <Pencil /> : <Plus />}{saving ? "Enregistrement…" : editing ? "Enregistrer" : "Ajouter l’employé"}</Button>
          {editing && <Button type="button" variant="outline" className="w-full" onClick={() => { setEditing(null); setForm(emptyForm); }}>Annuler</Button>}
        </form>
      </Panel>
    </div>
    <Dialog open={siteDialogOpen} onOpenChange={setSiteDialogOpen}>
      <DialogContent><DialogHeader><DialogTitle>Ajouter un site de travail</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(event) => void createWorkSite(event)}>
          <div><Label htmlFor="new-site-name">Nom du site</Label><Input id="new-site-name" required maxLength={255} autoFocus value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="Ex. Agence centre-ville" /></div>
          <div><Label htmlFor="new-site-type">Type de site</Label><select id="new-site-type" value={siteType} onChange={(event) => setSiteType(event.target.value as "USINE" | "AGENCE")} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="USINE">Usine</option><option value="AGENCE">Agence</option></select></div>
          <Button className="w-full" disabled={savingSite}>{savingSite ? "Ajout…" : "Ajouter le site"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
