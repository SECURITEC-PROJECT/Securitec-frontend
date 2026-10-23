import ListeAnomalies from "@/pages/agentAccueil/anomalie/ListeAnomalies";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAnomalies } from "@/hooks/useAnomalies";
import { Bell } from "lucide-react";

// Cloche de l'en-tête : affiche le nombre d'anomalies de sortie et leur liste
export default function ClocheAnomalies() {
  const anomalies = useAnomalies();
  const nb = anomalies.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={nb > 0 ? `${nb} anomalie(s) de sortie` : "Notifications"}
          className="relative flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted"
        >
          <Bell className={`h-5 w-5 ${nb > 0 ? "text-red-600" : ""}`} />
          {nb > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {nb > 99 ? "99+" : nb}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="max-h-[70vh] w-96 overflow-y-auto p-3">
        <p className="mb-2 text-sm font-semibold">Anomalies de sortie</p>
        <ListeAnomalies />
      </PopoverContent>
    </Popover>
  );
}