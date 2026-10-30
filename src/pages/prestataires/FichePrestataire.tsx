import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type ChauffeurRecord, type EmployeeRecord, type Provider, type StarMaterialEntry, type SubcontractorMaterialMovement } from "@/lib/service-api";
import { ArrowLeft, Boxes, ContactRound, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

export default function FichePrestataire() {
  const { providerId = "" } = useParams();
  const { sites, siteError } = useSites();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [drivers, setDrivers] = useState<ChauffeurRecord[]>([]);
  const [subcontractorMaterials, setSubcontractorMaterials] = useState<SubcontractorMaterialMovement[]>([]);
  const [starMaterials, setStarMaterials] = useState<StarMaterialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sites.length) { if (siteError) setLoading(false); return; }
    let active = true;
    setLoading(true); setError("");
    Promise.all([
      serviceApi.listProviders(),
      serviceApi.listEmployees(),
      Promise.all(sites.map((site) => serviceApi.listChauffeurs(site.id))),
      Promise.all(sites.map((site) => serviceApi.listSubcontractorMaterials(site.id))),
      Promise.all(sites.map((site) => serviceApi.listStarMaterials(site.id))),
    ]).then(([providers, employeeRows, driverRows, subcontractorRows, starRows]) => {
      if (!active) return;
      setProvider(providers.find((item) => item.id === providerId) || null);
      setEmployees(employeeRows.filter((item) => item.providerId === providerId));
      setDrivers(driverRows.flat().filter((item) => item.providerId === providerId));
      setSubcontractorMaterials(subcontractorRows.flat().filter((item) => item.providerId === providerId));
      setStarMaterials(starRows.flat().filter((item) => item.providerId === providerId));
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : "Chargement de la fiche prestataire impossible.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [providerId, sites, siteError]);

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.active), [employees]);
  const materialCount = subcontractorMaterials.filter((entry) => !entry.annuleLe).length + starMaterials.filter((entry) => !entry.annuleLe).length;

  return <div className="space-y-6">
    <Link to="/dashboard/prestataires" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Tous les prestataires</Link>
    <PageHeader title={provider?.name || "Fiche prestataire"} subtitle="Personnel autorisé, chauffeurs, véhicules et matériels associés." />
    {(error || siteError) && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error || siteError}</p>}
    {loading ? <p className="py-8 text-sm text-muted-foreground">Chargement de la fiche…</p> : !provider ? <p className="rounded-lg border p-5 text-sm text-muted-foreground">Prestataire introuvable ou inaccessible.</p> : <>
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Personnel actif</span><ContactRound className="size-4 text-primary" /></div><p className="mt-2 text-2xl font-semibold">{activeEmployees.length}</p></div>
        <div className="rounded-lg border bg-card p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Chauffeurs et véhicules</span><Truck className="size-4 text-primary" /></div><p className="mt-2 text-2xl font-semibold">{drivers.length}</p></div>
        <div className="rounded-lg border bg-card p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Mouvements matériel</span><Boxes className="size-4 text-primary" /></div><p className="mt-2 text-2xl font-semibold">{materialCount}</p></div>
      </section>

      <section className="rounded-xl border bg-card p-5"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Personnel autorisé</h2><Button size="sm" variant="outline" asChild><Link to="/dashboard/employes">Gérer le personnel</Link></Button></div>
        {employees.length ? <div className="divide-y">{employees.map((employee) => <div key={employee.id} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="font-medium">{employee.firstName} {employee.lastName}</p><p className="text-xs text-muted-foreground">Matricule {employee.matricule} · {employee.siteName || "Site non précisé"}</p></div><Badge variant={employee.active ? "secondary" : "outline"}>{employee.active ? "Actif" : "Inactif"}</Badge></div>)}</div> : <p className="text-sm text-muted-foreground">Aucun employé n’est associé à ce prestataire.</p>}
      </section>

      <section className="rounded-xl border bg-card p-5"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Chauffeurs et véhicules autorisés</h2><Button size="sm" variant="outline" asChild><Link to="/dashboard/chauffeurs">Gérer les chauffeurs</Link></Button></div>
        {drivers.length ? <div className="divide-y">{drivers.map((driver) => <div key={driver.id} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="font-medium">{driver.nomPrenom}</p><p className="text-xs text-muted-foreground">{driver.vehicule || "Véhicule non précisé"}{driver.matricule ? ` · ${driver.matricule}` : ""} · {sites.find((site) => site.id === driver.siteId)?.name || "Site"}</p></div>{driver.numeroPermis && <Badge variant="outline">Permis {driver.numeroPermis}</Badge>}</div>)}</div> : <p className="text-sm text-muted-foreground">Aucun chauffeur ou véhicule n’est associé à ce prestataire.</p>}
      </section>

      <section className="rounded-xl border bg-card p-5"><div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">Matériels et mouvements enregistrés</h2><div className="flex gap-2"><Button size="sm" variant="outline" asChild><Link to="/dashboard/materiels-sous-traitant">Matériel sous-traitant</Link></Button><Button size="sm" variant="outline" asChild><Link to="/dashboard/materiels-star">Matériel STAR</Link></Button></div></div>
        {materialCount ? <div className="space-y-4">{subcontractorMaterials.filter((entry) => !entry.annuleLe).map((entry) => <article key={`sub-${entry.id}`} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{entry.materiels} · {entry.nombre}</p><Badge variant="outline">{entry.heureSortie ? "Sorti" : "Présent"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{entry.date} · {entry.siteName || "Site"}</p></article>)}{starMaterials.filter((entry) => !entry.annuleLe).map((entry) => <article key={`star-${entry.id}`} className="rounded-lg border p-3"><div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{entry.items.map((item) => `${item.designation} × ${item.nombre}`).join(" · ")}</p><Badge variant="outline">{entry.heureSortie ? "Sorti" : "Présent"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{entry.date} · {entry.siteName || "Site"} · {entry.prenom}</p></article>)}</div> : <p className="text-sm text-muted-foreground">Aucun mouvement matériel n’est associé à ce prestataire.</p>}
      </section>
    </>}
  </div>;
}
