import { Empty, Panel } from "@/components/PageHeader";

interface PatrolHistoryPanelProps { data: any[]; fmt: (date: string | null) => string; }

export default function PatrolHistoryPanel({ data, fmt }: PatrolHistoryPanelProps) {
  return <Panel title="Historique des rondes">
    {data.length ? <ul className="divide-y space-y-2">
      {data.map((patrol) => {
        const checkpoints = patrol.checkpoints || [];
        const done = checkpoints.filter((point: any) => point.at).length;
        return <li key={patrol.id} className="py-2.5 text-sm">
          <div className="flex justify-between gap-3 font-medium"><span>{patrol.route_name}</span><span className="font-mono text-xs text-muted-foreground">{new Date(patrol.started_at).toLocaleDateString()} · {fmt(patrol.started_at)}</span></div>
          <p className="mt-1 text-xs text-muted-foreground">{patrol.site_name} · {done}/{checkpoints.length} points · {patrol.ended_at ? `terminée à ${fmt(patrol.ended_at)}` : "en cours"}{patrol.agent_name ? ` · ${patrol.agent_name}` : ""}</p>
          {patrol.anomalies && <p className="mt-1 whitespace-pre-wrap text-xs">Observations : {patrol.anomalies}</p>}
        </li>;
      })}
    </ul> : <Empty text="Aucune ronde enregistrée" />}
  </Panel>;
}
