import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StartPatrolPanelProps {
  route: string;
  setRoute: (val: string) => void;
  pointsCount: number;
  pointsListString: string;
  onStart: () => void;
}

export default function StartPatrolPanel({
  route,
  setRoute,
  pointsCount,
  pointsListString,
  onStart
}: StartPatrolPanelProps) {
  return (
    <Panel title="Démarrer une ronde">
      <Label>Parcours</Label>
      <Input value={route} onChange={(e) => setRoute(e.target.value)} className="mt-1 mb-3" />
      <p className="text-sm text-muted-foreground">{pointsCount} points de contrôle : {pointsListString}.</p>
      <Button className="mt-4 w-full" onClick={onStart}>Démarrer</Button>
    </Panel>
  );
}