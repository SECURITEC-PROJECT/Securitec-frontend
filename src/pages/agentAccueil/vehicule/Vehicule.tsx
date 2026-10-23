import { PageHeader, Panel } from "@/components/PageHeader";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { useCallback, useEffect, useState } from "react";
import FormVehicule from "./FormVehicule";
import PresentsVehicules from "./PresentsVehicules";
import RegistreVehicules from "./RegistreVehicules";

function Vehicule() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const refresh = useCallback(async () => setVehicles(await serviceApi.listVehicles()), []);
  useEffect(() => {
    refresh().catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, [refresh]);

  const exit = async (id: string) => {
    try {
      const result = await serviceApi.exitVehicle(id);
      setVehicles((previous) =>
        previous.map((vehicle) => (vehicle.id === id ? { ...vehicle, exited_at: result.exited_at } : vehicle))
      );
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Sortie impossible";
      setError(message);
      throw reason;
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Contrôle des véhicules" subtitle="Chargements et déchargements avec immatriculation, transporteur, titre, plomb et état du chargement." />
      {(error || siteError) && (
        <Panel title="Connexion backend">
          <p className="text-sm text-destructive">{error || siteError}</p>
        </Panel>
      )}
      {loading ? (
        <Panel title="Chargement">
          <p className="text-sm text-muted-foreground">Chargement des mouvements véhicules…</p>
        </Panel>
      ) : (
        <>
          {/* Formulaire à gauche, véhicules présents sur site à droite */}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[480px_1fr]">
            <FormVehicule
              sites={sites}
              canCreateSite={canCreateSite}
              onAddSite={addSite}
              onCreated={(vehicle) => setVehicles((previous) => [vehicle, ...previous])}
            />
            <PresentsVehicules rows={vehicles} onExit={exit} />
          </div>

          {/* Registre complet en bas */}
          <RegistreVehicules rows={vehicles} />
        </>
      )}
    </div>
  );
}

export default Vehicule;