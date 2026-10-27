import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { VehicleMovement } from "@/lib/service-api";

const formatDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return "—";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

export default function RegistreVehicules({
  rows,
  onEdit,
  onDelete,
}: {
  rows: VehicleMovement[];
  onEdit: (vehicle: VehicleMovement) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filtered = rows.filter((vehicle) =>
    [vehicle.plate, vehicle.ownerName, vehicle.category].join(" ").toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );

  const deleteEntry = async (vehicle: VehicleMovement) => {
    if (!window.confirm(`Supprimer le mouvement du véhicule « ${vehicle.plate} » ? Cette action est définitive.`)) return;
    setDeletingId(vehicle.id);
    try {
      await onDelete(vehicle.id);
      toast.success("Mouvement véhicule supprimé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Suppression impossible.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Panel title="Registre des mouvements véhicule">
      <div className="relative mb-4">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Rechercher un mouvement véhicule"
          placeholder="Rechercher par matricule, propriétaire ou catégorie…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="min-h-11 pl-9"
        />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <div className="max-h-[560px] overflow-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-muted/95 text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr>
                {["Date", "Matricule du véhicule", "Propriétaire (prénom)", "Type de propriétaire", "Personnes (entrée)", "Heure d’entrée", "Personnes (sortie)", "Heure de sortie", "Actions"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap border-b px-3 py-3 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {filtered.map((vehicle) => (
                <tr key={vehicle.id} className="transition-colors hover:bg-muted/30">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{formatDate(vehicle.entryDate)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-medium">{vehicle.plate}</td>
                  <td className="px-3 py-3">{vehicle.ownerName || "—"}</td>
                  <td className="px-3 py-3">{vehicle.category || "—"}</td>
                  <td className="px-3 py-3 text-center">{vehicle.passengersEntry ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{vehicle.entryTime || "—"}</td>
                  <td className="px-3 py-3 text-center">{vehicle.passengersOut ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{vehicle.exitTime || "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Modifier le mouvement" title="Modifier le mouvement" onClick={() => onEdit(vehicle)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Supprimer le mouvement" title="Supprimer le mouvement" disabled={deletingId === vehicle.id} onClick={() => void deleteEntry(vehicle)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-sm text-muted-foreground">Aucun mouvement véhicule trouvé.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
}
