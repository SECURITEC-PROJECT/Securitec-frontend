import { Panel } from "@/components/PageHeader";

export default function ZonesTab() {
  const zones = ['Accueil', 'Bureaux', 'Entrepôt', 'Local technique', 'Parking'];

  return (
    <Panel title="Zones du site">
      <div className="divide-y">
        {zones.map((z) => (
          <div key={z} className="flex justify-between py-4 text-sm">
            <span>{z}</span>
            <span className="text-xs text-muted-foreground">Accès contrôlé</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}