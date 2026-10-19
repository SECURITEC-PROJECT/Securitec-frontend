import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { demo } from "@/lib/demo-store";
import { ShieldCheck } from "lucide-react";

const badgeTone: Record<string, string> = { 
  Personnel: 'bg-success/10 text-success', 
  Prestataire: 'bg-info/10 text-info', 
  Visiteur: 'bg-warning/15 text-warning-foreground', 
  Refusé: 'bg-destructive/10 text-destructive' 
};

interface BadgeListPanelProps {
  rows: any[];
}

export default function BadgeListPanel({ rows }: BadgeListPanelProps) {
  return (
    <Panel title="Badges du site">
      <div className="divide-y">
        {rows.map((b) => (
          <div key={b.id} className="flex flex-wrap items-center gap-3 py-4">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{b.holder}</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{b.uid} · {b.zone}</p>
            </div>
            <span className={`rounded px-2 py-1 text-[10px] font-medium ${badgeTone[b.active ? b.level : "Refusé"]}`}>
              {b.active ? b.level : 'Révoqué'}
            </span>
            <Button size="sm" variant="outline" onClick={() => { 
              demo.update("badges", b.id, { active: !b.active }); 
              demo.add("logbook_entries", { category: "Intervention", description: `Badge ${b.uid} ${b.active ? "révoqué" : "réactivé"} dans la maquette` }); 
            }}>
              {b.active ? 'Révoquer' : 'Réactiver'}
            </Button>
          </div>
        ))}
      </div>
    </Panel>
  );
}