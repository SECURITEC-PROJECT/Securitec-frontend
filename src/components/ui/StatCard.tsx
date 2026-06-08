import type { ReactNode } from "react";

type Tone = "blue" | "green" | "orange" | "red";

interface Props {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: Tone;
  icon?: ReactNode;
}

export default function StatCard({ label, value, sub, tone = "blue", icon }: Props) {
  return (
    <div className={`stat-card sc-${tone}`}>
      <div className="stat-label">{label}</div>
      <div className={`stat-value sv-${tone}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
      {icon && <span className="stat-icon">{icon}</span>}
    </div>
  );
}
