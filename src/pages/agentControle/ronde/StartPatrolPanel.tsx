import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StartPatrolPanelProps {
  route: string;
  setRoute: (value: string) => void;
  onStart: () => void;
  saving: boolean;
}

export default function StartPatrolPanel({ route, setRoute, onStart, saving }: StartPatrolPanelProps) {
  return <div className="patrol-start-form">
    <Label htmlFor="patrol-route">Nom du parcours</Label>
    <Input id="patrol-route" value={route} onChange={(event) => setRoute(event.target.value)} className="mt-1" disabled={saving} />
    <p className="text-sm text-muted-foreground">L’heure de début est enregistrée au démarrage. À la fin, renseignez les observations puis clôturez la ronde. Ces informations correspondent à la rubrique « Patrouille ou ronde » du rapport Excel.</p>
    <Button className="patrol-start-button" onClick={onStart} disabled={saving || !route.trim()}>{saving ? "Démarrage…" : "Démarrer la ronde"}</Button>
  </div>;
}
