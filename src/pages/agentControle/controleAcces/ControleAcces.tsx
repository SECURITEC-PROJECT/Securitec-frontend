import { PageHeader } from "@/components/PageHeader";
import { useDemoTable } from "@/lib/demo-store";
import BadgeListPanel from "./BadgeListPanel";
import BadgeScannerPanel from "./BadgeScannerPanel";

const badgeTone: Record<string, string> = { 
  Personnel: 'bg-success/10 text-success', 
  Prestataire: 'bg-info/10 text-info', 
  Visiteur: 'bg-warning/15 text-warning-foreground', 
  Refusé: 'bg-destructive/10 text-destructive' 
};

export default function ControleAcces() {
  const rows = useDemoTable("badges"); 

  return (
    <div>
      <PageHeader title="Contrôle d’accès" subtitle="Badges, zones autorisées et journal des passages" />
      
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(badgeTone).map(([label, tone]) => (
          <div key={label} className={`rounded-md border p-4 ${tone}`}>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs">
              {label === 'Personnel' ? 'Zones autorisées' : label === 'Prestataire' ? 'Accès limité au contrat' : label === 'Visiteur' ? 'Escorte obligatoire' : 'Accès bloqué'}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-7 xl:grid-cols-[340px_1fr]">
        <BadgeScannerPanel rows={rows} />
        <BadgeListPanel rows={rows} />
      </div>
    </div>
  );
}