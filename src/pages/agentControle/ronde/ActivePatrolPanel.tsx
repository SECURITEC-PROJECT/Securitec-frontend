import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ActivePatrolPanelProps {
  active: {
    route_name: string;
    started_at: string;
    site_name?: string;
    pendingSync?: boolean;
    pendingFinish?: boolean;
    pendingSyncStatus?: "pending" | "conflict" | "rejected";
    pendingSyncError?: string;
  };
  checkpoints: { name: string; at: string | null }[];
  observations: string;
  setObservations: (value: string) => void;
  onCheck: (index: number) => void;
  onFinish: () => void;
  fmtTime: (date: string | null) => string;
  saving: boolean;
}

export default function ActivePatrolPanel({ active, checkpoints, observations, setObservations, onCheck, onFinish, fmtTime, saving }: ActivePatrolPanelProps) {
  return <Panel title={`${active.route_name} · début ${fmtTime(active.started_at)}`}>
    <p className="mb-4 text-sm text-muted-foreground">Site : {active.site_name || "—"}</p>
    {active.pendingSync && <p className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700">
      {active.pendingFinish
        ? "Clôture en attente : la ronde reste active sur le serveur."
        : active.pendingSyncStatus === "conflict"
          ? "Conflit de synchronisation : la ronde n’a pas été confirmée par le serveur."
          : active.pendingSyncStatus === "rejected"
            ? "Le serveur a rejeté une modification de cette ronde."
            : "Ronde en attente de synchronisation."}
      {active.pendingSyncError ? ` ${active.pendingSyncError}` : ""}
    </p>}
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <div><Label>Début ronde</Label><p className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">{fmtTime(active.started_at)}</p></div>
      <div><Label>Fin ronde</Label><p className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">Enregistrée à la clôture</p></div>
    </div>
    <div className="mb-4 space-y-2">
      <Label>Points de contrôle</Label>
      {checkpoints.map((point, index) => <label key={`${point.name}-${index}`} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
        <input type="checkbox" checked={Boolean(point.at)} disabled={saving || active.pendingFinish} onChange={() => onCheck(index)} />
        <span className="flex-1">{point.name}</span>
        {point.at && <span className="text-xs text-muted-foreground">{fmtTime(point.at)}</span>}
      </label>)}
    </div>
    <Label htmlFor="patrol-observations" className="mb-1 block">Observations</Label>
    <Textarea id="patrol-observations" value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Observations de la patrouille ou de la ronde…" disabled={saving || active.pendingFinish} />
    <Button className="mt-4 w-full" onClick={onFinish} disabled={saving || active.pendingFinish}>{active.pendingFinish ? "Clôture en attente…" : saving ? "Enregistrement…" : "Enregistrer la fin de ronde"}</Button>
  </Panel>;
}
