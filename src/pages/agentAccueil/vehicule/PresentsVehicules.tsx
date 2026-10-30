import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogOut, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { VehicleMovement } from "@/lib/service-api";

export default function PresentsVehicules({
  rows,
  onExit,
}: {
  rows: VehicleMovement[];
  onExit: (id: string, passengersOut: number) => Promise<void>;
}) {
  const [exitingId, setExitingId] = useState<string | null>(null);
  const [passengerCounts, setPassengerCounts] = useState<Record<string, string>>({});
  const present = rows.filter((vehicle) => !vehicle.exited_at && !vehicle.annuleLe);

  const handleExit = async (vehicle: VehicleMovement) => {
    const countValue = passengerCounts[vehicle.id] ?? String(vehicle.passengersEntry ?? "");
    const count = Number(countValue);
    if (!Number.isInteger(count) || count < 0 || count > 10000) {
      toast.error("Saisissez un nombre de personnes à la sortie entre 0 et 10 000.");
      return;
    }
    setExitingId(vehicle.id);
    try {
      await onExit(vehicle.id, count);
      toast.success(`Sortie enregistrée pour ${vehicle.plate}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sortie impossible.");
    } finally {
      setExitingId(null);
    }
  };

  return (
    <Panel title="Véhicules présents sur site">
      {present.length ? (
        <ul className="divide-y">
          {present.map((vehicle) => (
            <li key={vehicle.id} className="flex flex-wrap items-center justify-between gap-4 py-3">
              <div className="min-w-[220px]">
                <p className="flex items-center gap-2 font-medium">
                  <Truck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-mono">{vehicle.plate}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{vehicle.category}</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {vehicle.ownerName} · {vehicle.passengersEntry} personne(s) · entrée {vehicle.entryTime}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Personnes à la sortie</span>
                  <Input
                    className="h-9 w-36"
                    aria-label={`Nombre de personnes à la sortie pour ${vehicle.plate}`}
                    type="number"
                    min="0"
                    max="10000"
                    step="1"
                    value={passengerCounts[vehicle.id] ?? String(vehicle.passengersEntry ?? "")}
                    onChange={(event) => setPassengerCounts((current) => ({ ...current, [vehicle.id]: event.target.value }))}
                  />
                </label>
                <Button size="sm" disabled={exitingId === vehicle.id} onClick={() => void handleExit(vehicle)}>
                  <LogOut aria-hidden="true" />
                  {exitingId === vehicle.id ? "Enregistrement…" : "Enregistrer la sortie"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty text="Aucun véhicule présent sur ce site." />
      )}
    </Panel>
  );
}
