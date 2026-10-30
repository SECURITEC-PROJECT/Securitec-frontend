import { API_URL, authHeaders } from "@/lib/api";
import { useState } from "react";

type AuditEntry = {
  id: string;
  action: string;
  avant: Record<string, unknown> | null;
  apres: Record<string, unknown> | null;
  createdAt: string;
  userName: string | null;
};

export function RegistryAuditHistory({ entity, recordId }: { entity: string; recordId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");

  const toggle = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen || loaded || loading) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/register-audit/${encodeURIComponent(entity)}/${encodeURIComponent(recordId)}`, { headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Chargement de l’historique impossible.");
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setLoaded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Chargement de l’historique impossible.");
    } finally { setLoading(false); }
  };

  const display = (value: unknown) => {
    if (value == null || value === "") return "—";
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  };

  return <div className="mt-1">
    <button type="button" className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => void toggle()}>
      {open ? "Masquer l’historique" : "Historique des modifications"}
    </button>
    {open && <div className="mt-2 max-w-xl space-y-2 rounded border bg-muted/20 p-2 text-xs">
      {loading && <p>Chargement…</p>}{error && <p className="text-destructive">{error}</p>}
      {loaded && !entries.length && <p className="text-muted-foreground">Aucune correction ou annulation enregistrée.</p>}
      {entries.map((entry) => {
        const keys = new Set([...Object.keys(entry.avant || {}), ...Object.keys(entry.apres || {})]);
        const changes = [...keys].filter((key) => display(entry.avant?.[key]) !== display(entry.apres?.[key]));
        return <article key={entry.id} className="border-b pb-2 last:border-0">
          <p className="font-medium">{entry.action === "ANNULATION" ? "Annulation" : entry.action === "DESACTIVATION" ? "Désactivation" : "Modification"} · {new Date(entry.createdAt).toLocaleString()} · {entry.userName || "Utilisateur non identifié"}</p>
          {changes.length > 0 && <ul className="mt-1 space-y-0.5 text-muted-foreground">{changes.slice(0, 20).map((key) => <li key={key}><strong>{key}</strong> : {display(entry.avant?.[key])} → {display(entry.apres?.[key])}</li>)}</ul>}
        </article>;
      })}
    </div>}
  </div>;
}
