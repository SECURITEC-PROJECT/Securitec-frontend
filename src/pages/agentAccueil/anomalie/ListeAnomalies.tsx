import { useAnomalies } from "@/hooks/useAnomalies";
import { AlertTriangle, Truck, User } from "lucide-react";

// Liste des anomalies de sortie, à afficher dans le menu de la cloche
export default function ListeAnomalies({ className = "" }: { className?: string }) {
  const anomalies = useAnomalies();

  if (anomalies.length === 0) {
    return <p className="p-3 text-xs text-muted-foreground">Aucune anomalie de sortie.</p>;
  }

  return (
    <ul className={`space-y-2 ${className}`}>
      {anomalies.map((a) => (
        <li key={a.id} className="rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {a.titre}
            {a.type === "vehicule" ? <Truck className="ml-auto h-4 w-4" /> : <User className="ml-auto h-4 w-4" />}
          </p>
          <p className="mt-1">{a.message}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {a.lignes.map((l) => (
              <div key={l.label} className="contents">
                <dt className="font-medium opacity-80">{l.label}</dt>
                <dd className="font-semibold">{l.valeur}</dd>
              </div>
            ))}
          </dl>
        </li>
      ))}
    </ul>
  );
}