import { PageHeader, Panel } from "@/components/PageHeader";
import { serviceApi } from "@/lib/service-api";
import { useSites } from "@/hooks/useSites";
import { useEffect, useState } from "react";
import FormVehicule from "./FormVehicule";
import ListVehicule from "./ListVehicule";

function Vehicule() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const refresh = () => serviceApi.listVehicles().then(setVehicles);
  useEffect(() => { refresh().catch((reason) => setError(reason.message)).finally(() => setLoading(false)); }, []);

  const exit = async (id: string) => {
    try {
      const result = await serviceApi.exitVehicle(id);
      setVehicles((previous) => previous.map((vehicle) => vehicle.id === id ? { ...vehicle, exited_at: result.exited_at } : vehicle));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Sortie impossible";
      setError(message);
      throw reason;
    }
  };

  return <div>
    <PageHeader title="Contrôle des véhicules" subtitle="Chargements et déchargements avec immatriculation, transporteur, titre, plomb et état du chargement." />
    {(error || siteError) && <Panel title="Connexion backend"><p className="text-sm text-destructive">{error || siteError}</p></Panel>}
    {loading ? <Panel title="Chargement"><p className="text-sm text-muted-foreground">Chargement des mouvements véhicules…</p></Panel> : <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_1fr]">
      <FormVehicule sites={sites} canCreateSite={canCreateSite} onAddSite={addSite} onCreated={(vehicle) => setVehicles((previous) => [vehicle, ...previous])} />
      <ListVehicule rows={vehicles} onExit={exit} />
    </div>}
  </div>;
}

export default Vehicule;
