import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";

// 💡 EXPORT OBLIGATOIRE DE L'INTERFACE SHIFT
export interface Shift {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  prestataire: string;
  site_de_travail: string;
  siteId?: string | null;
  posteId?: string | null;
  posteNom?: string | null;
  shiftType?: "JOUR" | "NUIT" | null;
  fonctionService?: "CHEF" | "AGENT" | null;
  serviceId?: string | null;
  agents?: Shift[];
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
  const groups = Array.from(shifts.reduce((all, shift) => {
    const key = shift.serviceId || shift.id;
    const group = all.get(key) || [];
    group.push(shift);
    all.set(key, group);
    return all;
  }, new Map<string, Shift[]>()).entries()).map(([serviceId, members]) => ({
    ...((members.find((member) => member.fonctionService === "CHEF") || members[0]) as Shift),
    serviceId,
    agents: members,
  }));
  const activeShifts = groups.filter((shift) => shift.ended_at === null);
  const finishedShifts = groups.filter((shift) => shift.ended_at !== null);

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
                  <p className="font-semibold text-base">{s.posteNom || "Poste non renseigné"} · {s.shiftType === "NUIT" ? "Nuit" : s.shiftType === "JOUR" ? "Jour" : "Service"}</p>
                  <p className="text-sm">Chef : {s.nom} {s.prenom} {s.matricule ? `(${s.matricule})` : ""}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.site_de_travail} · {s.agents?.length || 1} agent(s) · {s.agents?.filter((agent) => agent.fonctionService !== "CHEF").map((agent) => `${agent.prenom} ${agent.nom}`).join(", ") || "aucun autre agent"}
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
                    {s.posteNom || "Poste non renseigné"} · {s.shiftType === "NUIT" ? "Nuit" : s.shiftType === "JOUR" ? "Jour" : "Service"} — {s.nom} {s.prenom} ({s.site_de_travail}, {s.agents?.length || 1} agent(s))
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
