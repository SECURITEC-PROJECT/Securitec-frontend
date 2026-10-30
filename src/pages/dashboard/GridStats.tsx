import { ArrowUpRight, BellRing, Car, ClipboardList, FileWarning, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface GridStatsProps {
  visitorsCount: number;
  vehiclesCount: number;
  shiftsCount: number;
  alertsCount: number;
  proceduresCount: number;
  eventsCount: number;
  anomaliesCount: number;
  activeInstructionsCount: number;
}

export default function GridStats({ visitorsCount, vehiclesCount, shiftsCount, alertsCount, proceduresCount, eventsCount, anomaliesCount, activeInstructionsCount }: GridStatsProps) {
  const stats = [
    { label: "Agents en poste", value: shiftsCount, note: "Effectif filtré par poste", icon: ShieldCheck, to: "/dashboard/prise-de-poste", tone: "text-success bg-success/10" },
    { label: "Incidents", value: alertsCount, note: "Violations de procédure", icon: TriangleAlert, to: "/dashboard/main-courante", tone: "text-warning-foreground bg-warning/15" },
    { label: "Anomalies", value: anomaliesCount, note: "Signalements techniques", icon: FileWarning, to: "/dashboard/main-courante", tone: "text-warning-foreground bg-warning/15" },
    { label: "Consignes actives", value: activeInstructionsCount, note: "À appliquer aux postes", icon: BellRing, to: "/dashboard/consigne", tone: "text-primary bg-primary/10" },
    { label: "Procédures", value: proceduresCount, note: "Entrées de main courante", icon: ClipboardList, to: "/dashboard/main-courante", tone: "text-info bg-info/10" },
    { label: "Événements", value: eventsCount, note: "Événements et divers", icon: Users, to: "/dashboard/main-courante", tone: "text-primary bg-primary/10" },
    { label: "Personnes sur site", value: visitorsCount, note: "Visiteurs enregistrés", icon: Users, to: "/dashboard/visiteurs", tone: "text-primary bg-primary/10" },
    { label: "Véhicules présents", value: vehiclesCount, note: "Contrôles à jour", icon: Car, to: "/dashboard/vehicules", tone: "text-info bg-info/10" },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <Link key={s.label} to={s.to} className="rounded-lg border bg-card p-5 transition-colors hover:border-primary/40">
          <div className="flex items-center justify-between">
            <span className={`flex h-9 w-9 items-center justify-center rounded-md ${s.tone}`}>
              <s.icon className="h-4 w-4" />
            </span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{s.label}</p>
          <p className="mt-1 text-3xl font-semibold">{s.value.toString().padStart(2, "0")}</p>
          <p className="mt-3 text-[11px] text-muted-foreground">{s.note}</p>
        </Link>
      ))}
    </div>
  );
}
