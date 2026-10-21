import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import FormulaireEvenement from "./FormulaireEvenement";
import JournalEvenements from "./JournalEvenements";
import ModuleQQOQCP from "./ModuleQQOQCP";
import ViolationsProcedure from "./ViolationsProcedure";

import { API_URL } from "@/lib/api";

export default function MainCourante() {
  const [data, setData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'standard' | 'violation' | 'qqoqcp'>('standard');

  const fetchMainCourante = () => {
    fetch(`${API_URL}/main-courante`)
      .then((res) => res.json())
      .then((resData) => {
        if (Array.isArray(resData)) setData(resData);
      })
      .catch((err) => console.error("Erreur chargement main courante:", err));
  };

  useEffect(() => {
    fetchMainCourante();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Main courante" 
        subtitle="Journal chronologique et horodaté des événements du site, violations et faits notables" 
      />

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          ['standard', 'Journal & Entrée Standard'],
          ['violation', '9 - Violation de Procédure'],
          ['qqoqcp', '10 - Divers / Fait Notable (QQOQCP)']
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

      {activeTab === 'standard' && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <FormulaireEvenement onRefresh={fetchMainCourante} />
          <JournalEvenements data={data} />
        </div>
      )}

      {activeTab === 'violation' && (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <ViolationsProcedure onRefresh={fetchMainCourante} />
          <JournalEvenements data={data} />
        </div>
      )}

      {activeTab === 'qqoqcp' && (
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <ModuleQQOQCP onRefresh={fetchMainCourante} />
          <JournalEvenements data={data} />
        </div>
      )}
    </div>
  );
}