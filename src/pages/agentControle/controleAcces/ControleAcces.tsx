import { PageHeader, Panel } from "@/components/PageHeader";
import { API_URL, authHeaders } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";
import AlcootestPanel from "./AlcootestPanel";
import BadgeListPanel from "./BadgeListPanel";
import BadgeScannerPanel from "./BadgeScannerPanel";
import GestionClesPanel from "./GestionClesPanel";

export interface AccessBadge {
  id: string;
  uid: string;
  holder: string;
  zone: string;
  level: string;
  active: boolean;
  validite: string;
}

export default function ControleAcces() {
  const [badges, setBadges] = useState<AccessBadge[]>([]);
  const [activeTab, setActiveTab] = useState<"badges" | "cles" | "alcootest">("badges");
  const [error, setError] = useState("");

  const refreshBadges = useCallback(async () => {
    const response = await fetch(`${API_URL}/badges`, { headers: authHeaders() });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Impossible de charger les badges.");
    setBadges(Array.isArray(data) ? data : []);
    setError("");
  }, []);

  useEffect(() => {
    refreshBadges().catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement des badges impossible."));
  }, [refreshBadges]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contrôle d’accès"
        subtitle="Badges, suivi des clés et contrôles d’alcoolémie enregistrés dans la base de données."
      />

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {([["badges", "Badges & scanner NFC"], ["cles", "Suivi des clés"], ["alcootest", "Contrôles d’alcoolémie"]] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`rounded px-3 py-2 text-sm font-medium transition-colors ${activeTab === key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && activeTab === "badges" && <Panel title="Badges"><p className="text-sm text-destructive">{error}</p></Panel>}
      {activeTab === "badges" && (
        <div className="grid gap-7 xl:grid-cols-[340px_1fr]">
          <BadgeScannerPanel onScanned={() => void refreshBadges()} />
          <BadgeListPanel rows={badges} onChanged={() => void refreshBadges()} />
        </div>
      )}
      {activeTab === "cles" && <GestionClesPanel />}
      {activeTab === "alcootest" && <AlcootestPanel />}
    </div>
  );
}
