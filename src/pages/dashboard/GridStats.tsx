import { ArrowUpRight, FileWarning, Route, ShieldCheck, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";

interface GridStatsProps {
  shiftsCount: number;
  patrolsCount: number;
  violationsCount: number;
  anomaliesCount: number;
}

export default function GridStats({ shiftsCount, patrolsCount, violationsCount, anomaliesCount }: GridStatsProps) {
  const stats = [
    { label: "Agents en poste", value: shiftsCount, note: "Présences actives", icon: ShieldCheck, to: "/dashboard/prise-de-poste", tone: "text-success bg-success/10", accent: "green" },
    { label: "Rondes en cours", value: patrolsCount, note: "Patrouilles actives", icon: Route, to: "/dashboard/rondes", tone: "text-info bg-info/10", accent: "blue" },
    { label: "Violations", value: violationsCount, note: "Faits de procédure", icon: TriangleAlert, to: "/dashboard/violations-procedure", tone: "text-destructive bg-destructive/10", accent: "red" },
    { label: "Anomalies", value: anomaliesCount, note: "Signalements techniques", icon: FileWarning, to: "/dashboard/anomalie", tone: "text-warning-foreground bg-warning/15", accent: "orange" },
  ] as const;

  return (
    <div className="dashboard-kpis grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Link key={stat.label} to={stat.to} className={`dashboard-kpi dashboard-kpi--${stat.accent} rounded-xl border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-md`}>
          <div className="flex items-center justify-between gap-3">
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${stat.tone}`}><stat.icon className="h-[18px] w-[18px]" /></span>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">{stat.label}</p>
          <div className="mt-0.5 flex items-end justify-between gap-2"><strong className="text-[26px] font-bold leading-none">{stat.value}</strong><span className="text-right text-[10px] text-muted-foreground">{stat.note}</span></div>
        </Link>
      ))}
    </div>
  );
}
