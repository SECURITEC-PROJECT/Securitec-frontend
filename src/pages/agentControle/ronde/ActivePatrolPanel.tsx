import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Circle } from "lucide-react";

type Checkpoint = { name: string; at: string | null };

interface ActivePatrolPanelProps {
  active: any;
  cps: Checkpoint[];
  observations: string;
  setObservations: (value: string) => void;
  onCheck: (index: number) => void;
  onFinish: () => void;
  fmtTime: (date: string | null) => string;
  saving: boolean;
}

export default function ActivePatrolPanel({ active, cps, observations, setObservations, onCheck, onFinish, fmtTime, saving }: ActivePatrolPanelProps) {
  return <Panel title={`${active.route_name} · commencée à ${fmtTime(active.started_at)}`}>
    <p className="mb-3 text-xs text-muted-foreground">Site : {active.site_name || "—"}</p>
    <ul className="space-y-2">
      {cps.map((point, index) => <li key={`${point.name}-${index}`}>
        <Button type="button" variant="outline" disabled={saving} onClick={() => onCheck(index)} className={`flex h-12 w-full items-center gap-3 rounded-md border p-3 text-left text-sm ${point.at ? "border-success bg-success/10" : ""}`}>
          {point.at ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
          <span className="flex-1 font-medium">{point.name}</span>
          {point.at && <span className="font-mono text-xs">{fmtTime(point.at)}</span>}
        </Button>
      </li>)}
    </ul>
    <Label htmlFor="patrol-observations" className="mt-4 block">Observations · rubrique du rapport journalier</Label>
    <Textarea id="patrol-observations" value={observations} onChange={(event) => setObservations(event.target.value)} placeholder="Anomalies constatées, faits et mesures prises…" disabled={saving} />
    <Button className="mt-4 w-full" onClick={onFinish} disabled={saving}>{saving ? "Enregistrement…" : "Clôturer la ronde"}</Button>
  </Panel>;
}
