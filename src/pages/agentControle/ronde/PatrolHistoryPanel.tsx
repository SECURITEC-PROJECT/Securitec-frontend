import { Empty, Panel } from "@/components/PageHeader";

type Cp = { name: string; at: string | null };

interface PatrolHistoryPanelProps {
  data: {
    id: string;
    route_name: string;
    started_at: string;
    ended_at: string | null;
    checkpoints: Cp[];
    anomalies: string | null;
    pendingSync?: boolean;
    pendingFinish?: boolean;
    pendingSyncStatus?: "pending" | "conflict" | "rejected";
    pendingSyncError?: string;
  }[];
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
                {p.pendingSync && <p className="text-xs text-amber-700">
                  {p.pendingSyncStatus === "conflict" ? "Conflit de synchronisation" : p.pendingSyncStatus === "rejected" ? "Ronde rejetée par le serveur" : p.pendingFinish ? "Clôture en attente : ronde toujours active sur le serveur" : "Démarrage ou modification en attente de synchronisation"}
                  {p.pendingSyncError ? ` · ${p.pendingSyncError}` : ""}
                </p>}
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