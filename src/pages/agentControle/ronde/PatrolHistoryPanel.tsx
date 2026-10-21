import { Empty, Panel } from "@/components/PageHeader";

type Cp = { name: string; at: string | null };

interface PatrolHistoryPanelProps {
  data: any[];
  fmt: (dateStr: string | null) => string;
}

export default function PatrolHistoryPanel({ data, fmt }: PatrolHistoryPanelProps) {
  return (
    <Panel title="Historique des rondes">
      {data.length ? (
        <ul className="divide-y space-y-2">
          {data.map((p) => {
            const c = (p.checkpoints as Cp[]) ?? [];
            const doneCount = c.filter((x) => x.at).length;

            return (
              <li key={p.id} className="py-2.5 text-sm space-y-1">
                <div className="flex justify-between items-center font-medium">
                  <span className="text-primary font-semibold">{p.route_name}</span>
                  <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Début : {fmt(p.started_at)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    {doneCount}/{c.length} points contrôlés
                    {p.anomalies ? ` · ⚠ ${p.anomalies}` : ""}
                  </span>
                  <span className="font-mono">
                    {p.ended_at ? (
                      <span className="text-success font-medium">Fin : {fmt(p.ended_at)}</span>
                    ) : (
                      <span className="text-amber-600 font-medium animate-pulse">En cours...</span>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty text="Aucune ronde enregistrée" />
      )}
    </Panel>
  );
}