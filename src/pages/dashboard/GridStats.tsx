import { ArrowUpRight, Car, ShieldCheck, TriangleAlert, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface GridStatsProps {
  visitorsCount: number;
  vehiclesCount: number;
  shiftsCount: number;
  alertsCount: number;
}

export default function GridStats({ visitorsCount, vehiclesCount, shiftsCount, alertsCount }: GridStatsProps) {
  const stats = [
    { label: "Personnes sur site", value: visitorsCount, note: "Visiteurs enregistrés", icon: Users, to: "/dashboard/visiteurs", tone: "text-primary bg-primary/10" }, 
    { label: "Véhicules présents", value: vehiclesCount, note: "Contrôles à jour", icon: Car, to: "/dashboard/vehicules", tone: "text-info bg-info/10" }, 
    { label: "Agents en poste", value: shiftsCount, note: "Vacation de jour · 06 h – 18 h", icon: ShieldCheck, to: "/dashboard/prise-de-poste", tone: "text-success bg-success/10" }, 
    { label: "Alertes à suivre", value: alertsCount, note: "Anomalie technique", icon: TriangleAlert, to: "/dashboard/main-courante", tone: "text-warning-foreground bg-warning/15" }
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