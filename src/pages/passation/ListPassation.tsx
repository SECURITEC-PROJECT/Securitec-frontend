import { Empty, Panel } from "@/components/PageHeader";

interface Handover {
  id: string;
  outgoing_agent: string;
  outgoing_matricule: string;
  incoming_agent: string;
  incoming_matricule: string;
  post_name: string;
  equipment: string | null;
  ongoing_events: string | null;
  instructions: string | null;
  outgoing_signed: boolean;
  incoming_signed: boolean;
  created_at: string;
}

interface ListPassationProps {
  handovers: Handover[];
}

export default function ListPassation({ handovers }: ListPassationProps) {
  const fmt = (dateStr: string) => {
    return new Date(dateStr).toLocaleString([], { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Panel title="Passations précédentes">
      {handovers.length ? (
        <ul className="space-y-3">
          {handovers.map((h) => (
            <li key={h.id} className="rounded-md border p-3 text-sm space-y-1">
              <div className="flex justify-between font-medium">
                <span>{h.outgoing_agent} ({h.outgoing_matricule}) → {h.incoming_agent} ({h.incoming_matricule})</span>
                <span className="font-mono text-xs text-muted-foreground">{fmt(h.created_at)}</span>
              </div>
              <p><span className="text-muted-foreground">Poste :</span> {h.post_name}</p>
              {h.equipment && <p className="mt-1"><span className="text-muted-foreground">Matériel :</span> {h.equipment}</p>}
              {h.ongoing_events && <p><span className="text-muted-foreground">En cours :</span> {h.ongoing_events}</p>}
              {h.instructions && <p><span className="text-muted-foreground">Consignes :</span> {h.instructions}</p>}
              <p className="text-xs text-muted-foreground">Remise {h.outgoing_signed ? "confirmée" : "non confirmée"} · réception {h.incoming_signed ? "confirmée" : "non confirmée"}</p>
            </li>
          ))}
        </ul>
      ) : <Empty text="Aucune passation" />}
    </Panel>
  );
}
