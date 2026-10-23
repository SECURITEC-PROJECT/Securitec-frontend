import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { rafraichirAnomalies, useAnomalies } from "@/hooks/useAnomalies";
import { LogOut, Truck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const formatTime = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Premier champ non vide parmi plusieurs noms possibles
const pick = (v: any, ...keys: string[]) => {
  for (const k of keys) {
    const value = v?.[k];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return "";
};

export default function PresentsVehicules({
  rows,
  onExit,
}: {
  rows: any[];
  onExit: (id: string) => Promise<void>;
}) {
  const [exitingId, setExitingId] = useState<string | null>(null);

  // Anomalies : véhicules encore présents après la fermeture du site
  const anomalies = useAnomalies();
  const enAnomalie = new Map(
    anomalies.filter((a) => a.type === "vehicule").map((a) => [String(a.rowId), a])
  );

  // Véhicules actuellement présents sur le site
  const present = rows.filter((v) => !v.exited_at);

  const handleExit = async (v: any) => {
    setExitingId(String(v.id));
    try {
      await onExit(v.id);
      rafraichirAnomalies();
      toast.success(`Sortie enregistrée pour ${pick(v, "plate", "immatriculation") || "le véhicule"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sortie impossible");
    } finally {
      setExitingId(null);
    }
  };

  return (
    <Panel title="Véhicules présents sur site">
      {present.length ? (
        <ul className="max-h-[640px] divide-y overflow-y-auto">
          {present.map((v) => {
            const plate = pick(v, "plate", "immatriculation");
            const details = [pick(v, "company", "societe"), pick(v, "driver", "conducteur")]
              .filter(Boolean)
              .join(" · ");
            const operation = pick(v, "operation");
            const loadState = pick(v, "load_state");
            const seal = pick(v, "seal_number");
            const doc = pick(v, "document_reference");
            const anomalie = enAnomalie.get(String(v.id));

            return (
              <li
                key={v.id}
                className={`flex items-center justify-between gap-3 py-2.5 text-sm ${
                  anomalie ? "my-1 rounded-md border-l-4 border-red-500 bg-red-50 px-3 text-red-700" : ""
                }`}
              >
                <div>
                  <p className="flex items-center gap-1.5 font-medium">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{plate || "—"}</span>
                    {operation && (
                      <span className="rounded bg-accent px-1.5 py-0.5 text-xs">{operation}</span>
                    )}
                  </p>
                  <p className="text-muted-foreground">
                    {details || "—"} · entré {formatTime(pick(v, "entered_at", "entree", "created_at"))}
                  </p>
                  {(loadState || seal || doc) && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[loadState, seal && `Plomb ${seal}`, doc && `Réf. ${doc}`].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={exitingId === String(v.id)}
                  onClick={() => handleExit(v)}
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Sortie
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty text="Aucun véhicule sur site" />
      )}
    </Panel>
  );
}