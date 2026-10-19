import { Empty, Panel } from "@/components/PageHeader";

interface Handover {
  id: number;
  agent_name: string;
  incoming_agent: string;
  equipment: string;
  ongoing_events: string;
  instructions: string;
  created_at: string;
}

interface ListPassationProps {
  handovers: Handover[];
}

export default function ListPassation({ handovers }: ListPassationProps) {
  const fmt = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Panel title="Passations précédentes">
      {handovers.length ? (
        <ul className="space-y-3">
          {handovers.map((h) => (
            <li key={h.id} className="rounded-md border p-3 text-sm space-y-1">
              <div className="flex justify-between font-medium">
                <span>{h.agent_name} → {h.incoming_agent}</span>
                <span className="font-mono text-xs text-muted-foreground">{fmt(h.created_at)}</span>
              </div>
              {h.equipment && <p className="mt-1"><span className="text-muted-foreground">Matériel :</span> {h.equipment}</p>}
              {h.ongoing_events && <p><span className="text-muted-foreground">En cours :</span> {h.ongoing_events}</p>}
              {h.instructions && <p><span className="text-muted-foreground">Consignes :</span> {h.instructions}</p>}
            </li>
          ))}
        </ul>
      ) : <Empty text="Aucune passation" />}
    </Panel>
  );
}