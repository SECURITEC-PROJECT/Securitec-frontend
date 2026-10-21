import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { API_URL, authHeaders } from "@/lib/api";
import type { AccessBadge } from "./ControleAcces";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  rows: AccessBadge[];
  onChanged: () => void;
}

export default function BadgeListPanel({ rows, onChanged }: Props) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const toggleBadge = async (badge: AccessBadge) => {
    if (!badge.active && new Date(badge.validite).getTime() < Date.now()) {
      toast.error("La validité de ce badge a expiré. Il faut renouveler sa date de validité avant de le réactiver.");
      return;
    }
    setUpdatingId(badge.id);
    try {
      const response = await fetch(`${API_URL}/badges/${badge.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ active: !badge.active }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Modification du badge impossible.");
      await onChanged();
      toast.success(badge.active ? "Badge révoqué." : "Badge réactivé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Modification du badge impossible.");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Panel title={`Badges enregistrés (${rows.length})`}>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucun badge trouvé dans la base.</p>
      ) : (
        <div className="divide-y">
          {rows.map((badge) => (
            <div key={badge.id} className="flex flex-wrap items-center gap-3 py-4">
              <ShieldCheck className={`h-5 w-5 ${badge.active ? "text-success" : "text-muted-foreground"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{badge.holder}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{badge.uid} · {badge.zone} · {badge.level}</p>
              </div>
              <span className={`rounded px-2 py-1 text-[10px] font-medium ${badge.active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                {badge.active ? "Actif" : "Révoqué / expiré"}
              </span>
              <Button size="sm" variant="outline" disabled={updatingId === badge.id || (!badge.active && new Date(badge.validite).getTime() < Date.now())} onClick={() => void toggleBadge(badge)}>
                {updatingId === badge.id ? "Mise à jour…" : badge.active ? "Révoquer" : new Date(badge.validite).getTime() < Date.now() ? "Expiré" : "Réactiver"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
