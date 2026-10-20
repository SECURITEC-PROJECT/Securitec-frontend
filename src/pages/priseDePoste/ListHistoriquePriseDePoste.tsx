import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

// 💡 EXPORT OBLIGATOIRE DE L'INTERFACE SHIFT
export interface Shift {
  id: number;
  nom: string;
  prenom: string;
  prestataire: string;
  site_de_travail: string;
  started_at: string;
  ended_at: string | null;
  checks?: Record<string, boolean>;
  notes?: string;
}

interface ListHistoriquePriseDePosteProps {
  shifts: Shift[];
  onOpenEndDialog: (shift: Shift, isOnlyOne: boolean) => void;
  fmt: (dateStr: string | null) => string;
}

export default function ListHistoriquePriseDePoste({
  shifts,
  onOpenEndDialog,
  fmt,
}: ListHistoriquePriseDePosteProps) {
  const activeShifts = shifts.filter((s) => s.ended_at === null);
  const finishedShifts = shifts.filter((s) => s.ended_at !== null);

  const todayStr = new Date().toLocaleDateString();

  const fmtFull = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "—";
    return `${date.toLocaleDateString()} à ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <Panel title="Services en cours & Historique">
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          En service ({activeShifts.length}) · <span className="normal-case font-normal text-xs">{todayStr}</span>
        </h3>
        {activeShifts.length > 0 ? (
          <ul className="space-y-3">
            {activeShifts.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm bg-background shadow-sm"
              >
                <div>
                  <p className="font-semibold text-base">
                    {s.nom} {s.prenom}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.prestataire} · {s.site_de_travail}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Début : <span className="font-mono">{fmt(s.started_at)}</span>
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onOpenEndDialog(s, activeShifts.length === 1)}
                >
                  Terminer
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground italic">Aucun agent actuellement en service.</p>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Historique des terminés
        </h3>
        {finishedShifts.length > 0 ? (
          <ul className="divide-y space-y-2">
            {finishedShifts.map((s) => (
              <li key={s.id} className="py-2.5 text-sm">
                <div className="flex justify-between font-medium">
                  <span>
                    {s.nom} {s.prenom} ({s.site_de_travail})
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Prise : {fmtFull(s.started_at)} <br />
                    Départ : <strong className="text-foreground">{fmtFull(s.ended_at)}</strong>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Aucune prise de poste terminée" />
        )}
      </div>
    </Panel>
  );
}