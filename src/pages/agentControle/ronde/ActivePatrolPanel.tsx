import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Circle } from "lucide-react";

type Cp = { name: string; at: string | null };

interface ActivePatrolPanelProps {
  active: any;
  cps: Cp[];
  anom: string;
  setAnom: (val: string) => void;
  onCheck: (index: number) => void;
  onFinish: () => void;
  fmtTime: (dateStr: string | null) => string;
}

export default function ActivePatrolPanel({
  active,
  cps,
  anom,
  setAnom,
  onCheck,
  onFinish,
  fmtTime
}: ActivePatrolPanelProps) {
  return (
    <Panel title={`${active.route_name} · débutée ${fmtTime(active.started_at)}`}>
      <ul className="space-y-2">
        {cps.map((c, i) => (
          <li key={c.name}>
            <Button 
              variant="outline" 
              onClick={() => onCheck(i)} 
              className={`flex h-12 w-full items-center gap-3 rounded-md border p-3 text-left text-sm ${c.at ? "border-success bg-success/10" : ""}`}
            >
              {c.at ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              <span className="flex-1 font-medium">{c.name}</span>
              {c.at && <span className="font-mono text-xs">{fmtTime(c.at)}</span>}
            </Button>
          </li>
        ))}
      </ul>
      <Label className="mt-4 block">Anomalies constatées</Label>
      <Textarea value={anom} onChange={(e) => setAnom(e.target.value)} placeholder="Porte ouverte, éclairage HS…" />
      <Button className="mt-4 w-full" onClick={onFinish}>Clôturer la ronde</Button>
    </Panel>
  );
}