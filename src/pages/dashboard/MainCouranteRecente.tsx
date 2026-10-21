import { fmtTime } from "@/lib/security";
import { ArrowRight, Check, TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";

interface MainCouranteRecenteProps {
  logs: any[];
  name: (id: string) => string;
}

export default function MainCouranteRecente({ logs, name }: MainCouranteRecenteProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Incidents récents</h2>
        <Link to="/dashboard/main-courante" className="flex items-center gap-1 text-xs text-primary">Tout voir <ArrowRight className="h-3 w-3" /></Link>
      </div>
      <div className="divide-y border-y">
        {logs.slice(0, 5).map((log) => (
          <div key={log.id} className="flex gap-4 py-4">
            <span className="w-10 shrink-0 pt-1 font-mono text-[11px] text-muted-foreground">{log.created_at ? fmtTime(log.created_at) : "—"}</span>
            <span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${log.severity === "normal" ? "bg-accent text-primary" : "bg-warning/15 text-warning-foreground"}`}>
              {log.severity === "normal" ? <Check className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
            </span>
            <div>
              <p className="text-xs font-semibold">{log.category}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{log.description}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{log.agent_name || name(log.agent_id)}</p>
            </div>
          </div>
        ))}
        {!logs.length && <p className="py-5 text-xs text-muted-foreground">Aucun incident logistique récent.</p>}
      </div>
    </section>
  );
}