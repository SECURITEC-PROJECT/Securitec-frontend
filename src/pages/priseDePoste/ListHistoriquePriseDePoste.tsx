import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

interface Shift {
  id: string;
  agent_name: string;
  matricule: string;
  prestataire: string;
  site: string;
  shift: "JOUR" | "NUIT" | null;
  post_name: string;
  started_at: string;
  ended_at: string | null;
  notes?: string | null;
}

interface ListHistoriquePriseDePosteProps {
  shifts: Shift[];
  fmt: (dateStr: string | null) => string;
  onEnd: (id: string) => void;
}

export default function ListHistoriquePriseDePoste({ shifts, fmt, onEnd }: ListHistoriquePriseDePosteProps) {
  return (
    <Panel title="Historique">
      {shifts.length ? (
        <ul className="divide-y space-y-3">
          {shifts.map((s) => {
            return (
              <li key={s.id} className="py-2.5 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{s.agent_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{fmt(s.started_at)} → {fmt(s.ended_at)}</span>
                </div>
                <p className="text-muted-foreground mt-1">{s.matricule} · {s.prestataire} · {s.site} · {s.post_name}{s.notes ? ` · ${s.notes}` : ""}</p>
                {!s.ended_at && <Button type="button" size="sm" variant="destructive" className="mt-2" onClick={() => onEnd(s.id)}>Terminer</Button>}
              </li>
            );
          })}
        </ul>
      ) : <Empty text="Aucune prise de poste" />}
    </Panel>
  );
}
