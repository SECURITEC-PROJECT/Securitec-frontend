import { Empty, Panel } from "@/components/PageHeader";

type Cp = { name: string; at: string | null };

interface PatrolHistoryPanelProps {
  data: any[];
  fmt: (dateStr: string) => string;
}

export default function PatrolHistoryPanel({ data, fmt }: PatrolHistoryPanelProps) {
  return (
    <Panel title="Historique des rondes">
      {data.length ? (
        <ul className="divide-y space-y-2">
          {data.map((p) => {
            const c = (p.checkpoints as Cp[]) ?? [];
            return (
              <li key={p.id} className="py-2.5 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{p.route_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{fmt(p.started_at)}</span>
                </div>
                <p className="text-muted-foreground mt-1">
                  {c.filter((x) => x.at).length}/{c.length} points · {p.ended_at ? "terminée" : "en cours"}{p.anomalies ? ` · ⚠ ${p.anomalies}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      ) : <Empty text="Aucune ronde" />}
    </Panel>
  );
}