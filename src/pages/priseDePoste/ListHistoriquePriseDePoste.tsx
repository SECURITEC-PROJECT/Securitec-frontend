import { Empty, Panel } from "@/components/PageHeader";

const CHECKS = [
  "Tenue réglementaire", 
  "Radio / talkie-walkie testé", 
  "Clés du site récupérées", 
  "Lampe torche", 
  "Téléphone de service chargé", 
  "Registre consulté", 
  "Vidéosurveillance opérationnelle", 
  "Système d'alarme vérifié"
];

interface Shift {
  id: number;
  agent_name: string;
  post_name: string;
  started_at: string;
  ended_at: string | null;
  checklist: Record<string, boolean>;
  notes?: string;
}

interface ListHistoriquePriseDePosteProps {
  shifts: Shift[];
  fmt: (dateStr: string | null) => string;
}

export default function ListHistoriquePriseDePoste({ shifts, fmt }: ListHistoriquePriseDePosteProps) {
  return (
    <Panel title="Historique">
      {shifts.length ? (
        <ul className="divide-y space-y-3">
          {shifts.map((s) => {
            const c = s.checklist || {};
            const ok = Object.values(c).filter(Boolean).length;
            return (
              <li key={s.id} className="py-2.5 text-sm">
                <div className="flex justify-between font-medium">
                  <span>{s.agent_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{fmt(s.started_at)} → {fmt(s.ended_at)}</span>
                </div>
                <p className="text-muted-foreground mt-1">{s.post_name} · check-list {ok}/{CHECKS.length}{s.notes ? ` · ${s.notes}` : ""}</p>
              </li>
            );
          })}
        </ul>
      ) : <Empty text="Aucune prise de poste" />}
    </Panel>
  );
}