import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type VehicleMovement } from "@/lib/service-api";
import { useEffect, useMemo, useState } from "react";
import FormVehicule from "./FormVehicule";
import PresentsVehicules from "./PresentsVehicules";
import RegistreVehicules from "./RegistreVehicules";

export default function Vehicule() {
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [editingVehicle, setEditingVehicle] = useState<VehicleMovement | null>(null);
  const [registry, setRegistry] = useState<{ siteId: string; vehicles: VehicleMovement[]; error: string }>({
    siteId: "",
    vehicles: [],
    error: "",
  });
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = useMemo(() => sites.find((item) => item.name === selectedSiteName), [sites, selectedSiteName]);

  useEffect(() => {
    let active = true;
    if (!site?.id) return () => { active = false; };
    const refresh = () => {
      serviceApi.listVehicles(site.id)
        .then((vehicles) => {
          if (active) setRegistry({ siteId: site.id, vehicles, error: "" });
        })
        .catch((reason) => {
          if (active) setRegistry({
            siteId: site.id,
            vehicles: [],
            error: reason instanceof Error ? reason.message : "Chargement des mouvements impossible.",
          });
        });
    };
    const onQueueChanged = () => refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("securitec-offline-queue-changed", onQueueChanged);
    refresh();
    return () => {
      active = false;
      window.removeEventListener("online", refresh);
      window.removeEventListener("securitec-offline-queue-changed", onQueueChanged);
    };
  }, [site?.id]);

  const vehicles = registry.siteId === site?.id ? registry.vehicles : [];
  const error = registry.siteId === site?.id ? registry.error : "";
  const loading = Boolean(site?.id) && registry.siteId !== site?.id;

  const saveVehicle = (vehicle: VehicleMovement) => {
    setRegistry((current) => ({
      siteId: site?.id || current.siteId,
      vehicles: current.siteId === site?.id
        ? current.vehicles.some((row) => row.id === vehicle.id)
          ? current.vehicles.map((row) => row.id === vehicle.id ? { ...row, ...vehicle } : row)
          : [vehicle, ...current.vehicles]
        : [vehicle],
      error: "",
    }));
    setEditingVehicle(null);
  };

  const exitVehicle = async (id: string, passengersOut: number): Promise<boolean> => {
    const result = await serviceApi.exitVehicle(id, passengersOut, site?.id);
    setRegistry((current) => ({
      ...current,
      vehicles: current.vehicles.map((vehicle) => vehicle.id === id ? { ...vehicle, ...result } : vehicle),
    }));
    return Boolean(result.pendingSync);
  };

  const deleteVehicle = async (id: string): Promise<boolean> => {
    if (!site?.id) return false;
    const vehicle = vehicles.find((entry) => entry.id === id);
    if (!vehicle || vehicle.annuleLe) return false;
    const result = await serviceApi.deleteVehicle(id, site.id);
      setRegistry((current) => ({
        ...current,
        vehicles: id.startsWith("pending-")
          ? current.vehicles.filter((entry) => entry.id !== id)
          : current.vehicles.map((entry) => entry.id === id
            ? { ...entry, annuleLe: new Date().toISOString(), pendingSync: Boolean(result.pendingSync) }
            : entry),
      }));
      if (editingVehicle?.id === id) setEditingVehicle(null);
      return Boolean(result.pendingSync);
  };

  return (
    <div className="vehicle-module space-y-5">
      <PageHeader title="Mouvements véhicule (Entrée / Sortie)" subtitle="Enregistrez les entrées et sorties des véhicules et le nombre de personnes à bord." />
      <div className="max-w-xl">
        <SitePicker
          id="vehicle-site"
          value={selectedSiteName}
          type={site?.type || "USINE"}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name) => {
            setSiteName(name);
            setEditingVehicle(null);
          }}
        />
      </div>
      {(error || siteError) && (
        <Panel title="Erreur de chargement">
          <p className="text-sm text-destructive">{error || siteError}</p>
        </Panel>
      )}
      {vehicles.some((vehicle) => vehicle.pendingSync) && (
        <Panel title="Synchronisation hors ligne">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{vehicles.filter((vehicle) => vehicle.pendingSync).length} mouvement(s) véhicule en attente ou à vérifier.</p>
            <ul className="list-inside list-disc">
              {vehicles.filter((vehicle) => vehicle.pendingSync).map((vehicle) => (
                <li key={vehicle.id}>
                  {vehicle.plate}: {vehicle.pendingSyncError || (vehicle.pendingSyncStatus === "pending" ? "en attente de synchronisation" : "à vérifier")}
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      )}
      {!loading && (
        <>
          <FormVehicule
            key={editingVehicle?.id || "new"}
            siteId={site?.id || ""}
            editingVehicle={editingVehicle}
            onSaved={saveVehicle}
            onCancelEdit={() => setEditingVehicle(null)}
          />
          <PresentsVehicules
            rows={vehicles}
            onExit={exitVehicle}
          />
          <RegistreVehicules
            rows={vehicles}
            siteName={selectedSiteName}
            onEdit={setEditingVehicle}
            onDelete={deleteVehicle}
          />
        </>
      )}
      {loading && (
        <Panel title="Chargement du registre">
          <p className="text-sm text-muted-foreground">Chargement des mouvements véhicules…</p>
        </Panel>
      )}
    </div>
  );
}
