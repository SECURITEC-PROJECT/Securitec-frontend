import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StartPatrolPanelProps {
  route: string;
  setRoute: (value: string) => void;
  sites: { id: string; name: string; type: "USINE" | "AGENCE" }[];
  siteId: string;
  setSiteId: (id: string) => void;
  onStart: () => void;
  saving: boolean;
}

export default function StartPatrolPanel({ route, setRoute, sites, siteId, setSiteId, onStart, saving }: StartPatrolPanelProps) {
  return <Panel title="Démarrer une patrouille ou une ronde">
    <Label htmlFor="patrol-site">Site</Label>
    <select id="patrol-site" value={siteId} onChange={(event) => setSiteId(event.target.value)} disabled={saving} className="mb-3 mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
      {!sites.length && <option value="">Aucun site disponible</option>}
      {sites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.type === "AGENCE" ? "Agence" : "Usine"}</option>)}
    </select>
    <Label htmlFor="patrol-route">Nom du parcours</Label>
    <Input id="patrol-route" value={route} onChange={(event) => setRoute(event.target.value)} className="mb-3 mt-1" disabled={saving} />
    <p className="text-sm text-muted-foreground">L’heure de début est enregistrée au démarrage. À la fin, renseignez les observations puis clôturez la ronde. Ces informations correspondent à la rubrique « Patrouille ou ronde » du rapport Excel.</p>
    <Button className="mt-4 w-full" onClick={onStart} disabled={saving || !sites.length || !route.trim()}>{saving ? "Démarrage…" : "Démarrer la ronde"}</Button>
  </Panel>;
}
