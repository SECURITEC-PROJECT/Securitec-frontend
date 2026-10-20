import { Empty, Panel } from "@/components/PageHeader";

interface PatrolHistoryPanelProps { data: any[]; fmt: (date: string | null) => string; }

export default function PatrolHistoryPanel({ data, fmt }: PatrolHistoryPanelProps) {
  return <Panel title="Historique des patrouilles et rondes">
    {data.length ? <ul className="divide-y">
      {data.map((patrol) => <li key={patrol.id} className="space-y-1 py-3 text-sm">
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 font-medium">
          <span>{patrol.route_name}</span>
          <span className="font-mono text-xs text-muted-foreground">{new Date(patrol.started_at).toLocaleDateString()} · {fmt(patrol.started_at)}{patrol.ended_at ? ` – ${fmt(patrol.ended_at)}` : ""}</span>
        </div>
        <p className="text-xs text-muted-foreground">{patrol.site_name} · {patrol.ended_at ? "Terminée" : "En cours"}{patrol.agent_name ? ` · ${patrol.agent_name}` : ""}</p>
        {patrol.anomalies && <p className="whitespace-pre-wrap text-sm">Observations : {patrol.anomalies}</p>}
      </li>)}
    </ul> : <Empty text="Aucune patrouille ou ronde enregistrée" />}
  </Panel>;
}
