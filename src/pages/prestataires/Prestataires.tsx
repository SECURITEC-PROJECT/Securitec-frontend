import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type Provider } from "@/lib/service-api";
import { ArrowRight, Building2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Prestataires() {
  const { sites, siteError } = useSites();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    serviceApi.listProviders()
      .then((rows) => { if (active) setProviders(rows.filter((provider) => provider.active)); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Chargement des prestataires impossible."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return <div className="space-y-6">
    <PageHeader title="Prestataires et sous-traitants" subtitle="Consultez les entreprises et leurs personnels, chauffeurs, véhicules et matériels associés." />
    {(error || siteError) && <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error || siteError}</p>}
    {loading ? <p className="text-sm text-muted-foreground">Chargement des prestataires…</p> : providers.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{providers.map((provider) => <Link key={provider.id} to={`/dashboard/prestataires/${provider.id}`} className="group rounded-xl border bg-card p-4 transition hover:border-primary/50 hover:shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Building2 className="size-5" /></div><ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></div><h2 className="mt-3 font-semibold">{provider.name}</h2><div className="mt-2 flex flex-wrap gap-2"><Badge variant="outline">{provider.employeeCount} employé(s)</Badge><Badge variant="outline">{provider.materialCount} mouvement(s) matériel</Badge></div><p className="mt-3 text-xs text-muted-foreground">Fiche entreprise · {sites.length === 1 ? sites[0].name : `${sites.length} sites`}</p></Link>)}</div> : <p className="rounded-lg border p-5 text-sm text-muted-foreground">Aucun prestataire actif n’est enregistré.</p>}
  </div>;
}
