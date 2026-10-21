import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ActivePatrolPanelProps {
  active: any;
  observations: string;
  setObservations: (value: string) => void;
  onFinish: () => void;
  fmtTime: (date: string | null) => string;
  saving: boolean;
}

export default function ActivePatrolPanel({ active, observations, setObservations, onFinish, fmtTime, saving }: ActivePatrolPanelProps) {
  return <Panel title={`${active.route_name} · début ${fmtTime(active.started_at)}`}>
    <p className="mb-4 text-sm text-muted-foreground">Site : {active.site_name || "—"}</p>
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <div><Label>Début ronde</Label><p className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">{fmtTime(active.started_at)}</p></div>
      <div><Label>Fin ronde</Label><p className="mt-1 rounded-md border bg-muted/30 px-3 py-2 text-sm">Enregistrée à la clôture</p></div>
    </div>
    <Label htmlFor="patrol-observations" className="mb-1 block">Observations</Label>
    <Textarea id="patrol-observations" value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Observations de la patrouille ou de la ronde…" disabled={saving} />
    <Button className="mt-4 w-full" onClick={onFinish} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer la fin de ronde"}</Button>
  </Panel>;
}
