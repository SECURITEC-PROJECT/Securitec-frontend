import { PageHeader } from "@/components/PageHeader";
import { useDemoTable } from "@/lib/demo-store";
import { useState } from "react";
import AlcootestPanel from "./AlcootestPanel";
import BadgeListPanel from "./BadgeListPanel";
import BadgeScannerPanel from "./BadgeScannerPanel";
import GestionClesPanel from "./GestionClesPanel";

const badgeTone: Record<string, string> = { 
  Personnel: 'bg-success/10 text-success', 
  Prestataire: 'bg-info/10 text-info', 
  Visiteur: 'bg-warning/15 text-warning-foreground', 
  Refusé: 'bg-destructive/10 text-destructive' 
};

export default function ControleAcces() {
  const rows = useDemoTable("badges");
  const [activeTab, setActiveTab] = useState<'badges' | 'cles' | 'alcootest'>('badges');

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Contrôle d’accès" 
        subtitle="Badges, zones autorisées, suivi des clés et procédures d'alcoolémie" 
      />
      
      {/* Cartes d'information */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(badgeTone).map(([label, tone]) => (
          <div key={label} className={`rounded-md border p-4 ${tone}`}>
            <p className="text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs">
              {label === 'Personnel' ? 'Zones autorisées' : label === 'Prestataire' ? 'Accès limité au contrat' : label === 'Visiteur' ? 'Escorte obligatoire' : 'Accès bloqué'}
            </p>
          </div>
        ))}
      </div>

      {/* Navigation par sous-onglets */}
      <div className="flex gap-2 border-b pb-3">
        {[
          ['badges', 'Badges & Scanner NFC'],
          ['cles', 'Suivi des Clés'],
          ['alcootest', 'Contrôles Alcoolémie']
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === key 
                ? 'bg-primary text-primary-foreground shadow' 
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Affichage conditionnel des panneaux */}
      {activeTab === 'badges' && (
        <div className="grid gap-7 xl:grid-cols-[340px_1fr]">
          <BadgeScannerPanel rows={rows} />
          <BadgeListPanel rows={rows} />
        </div>
      )}

      {activeTab === 'cles' && (
        <div className="max-w-2xl">
          <GestionClesPanel />
        </div>
      )}

      {activeTab === 'alcootest' && (
        <div className="max-w-2xl">
          <AlcootestPanel />
        </div>
      )}
    </div>
  );
}