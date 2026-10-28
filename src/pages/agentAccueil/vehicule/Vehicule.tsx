import { PageHeader, Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { useSites } from "@/hooks/useSites";
import { serviceApi, type VehicleMovement } from "@/lib/service-api";
import { confirmDeletion } from "@/lib/deletion-toast";
import { toast } from "sonner";
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
    return () => { active = false; };
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

  const exitVehicle = async (id: string, passengersOut: number) => {
    const result = await serviceApi.exitVehicle(id, passengersOut, site?.id);
    setRegistry((current) => ({
      ...current,
      vehicles: current.vehicles.map((vehicle) => vehicle.id === id ? { ...vehicle, ...result } : vehicle),
    }));
  };

  const deleteVehicle = async (id: string) => {
    if (!site?.id) return;
    const vehicle = vehicles.find((entry) => entry.id === id);
    if (!vehicle || !(await confirmDeletion(`Supprimer le mouvement du véhicule « ${vehicle.plate} » ? Cette action est définitive.`))) return;
    await serviceApi.deleteVehicle(id, site.id);
    setRegistry((current) => ({ ...current, vehicles: current.vehicles.filter((vehicle) => vehicle.id !== id) }));
    if (editingVehicle?.id === id) setEditingVehicle(null);
    toast.success("Mouvement véhicule supprimé.");
  };

  return (
    <div className="space-y-6">
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
