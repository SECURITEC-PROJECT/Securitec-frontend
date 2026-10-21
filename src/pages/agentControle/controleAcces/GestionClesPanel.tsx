import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { serviceApi } from "@/lib/service-api";
import { KeyRound } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

interface KeyTrackingEntry {
  id: string;
  date: string;
  lieu: string;
  perceptionMatin?: string | null;
  responsablePerceptionMatin?: string | null;
  reintegrationMatin?: string | null;
  responsableReintegrationMatin?: string | null;
  perceptionApresMidi?: string | null;
  responsablePerceptionApresMidi?: string | null;
  reintegrationApresMidi?: string | null;
  responsableReintegrationApresMidi?: string | null;
  observations?: string | null;
}

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const initialForm = () => ({
  date: localDate(),
  lieu: "",
  perceptionMatin: "",
  responsablePerceptionMatin: "",
  reintegrationMatin: "",
  responsableReintegrationMatin: "",
  perceptionApresMidi: "",
  responsablePerceptionApresMidi: "",
  reintegrationApresMidi: "",
  responsableReintegrationApresMidi: "",
  observations: "",
});

const slots = [
  ["perceptionMatin", "Perception matin", "responsablePerceptionMatin", "Personne ayant pris les clés"],
  ["reintegrationMatin", "Réintégration matin", "responsableReintegrationMatin", "Personne ayant rendu les clés"],
  ["perceptionApresMidi", "Perception après-midi", "responsablePerceptionApresMidi", "Personne ayant pris les clés"],
  ["reintegrationApresMidi", "Réintégration après-midi", "responsableReintegrationApresMidi", "Personne ayant rendu les clés"],
] as const;

export default function GestionClesPanel({ siteId }: { siteId: string }) {
  const [form, setForm] = useState(initialForm);
  const [entries, setEntries] = useState<KeyTrackingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!siteId) { setEntries([]); return; }
    const data = await serviceApi.listKeyTracking(siteId);
    setEntries(data);
    setError("");
  }, [siteId]);

  useEffect(() => {
    setLoading(Boolean(siteId));
    if (!siteId) { setEntries([]); setLoading(false); setError(""); return; }
    refresh().catch((reason) => setError(reason instanceof Error ? reason.message : "Chargement impossible."))
      .finally(() => setLoading(false));
  }, [refresh]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) { toast.error("Sélectionnez un site avant d’enregistrer le suivi."); return; }
    setSaving(true);
    try {
      await serviceApi.createKeyTracking({ ...form, siteId });
      await refresh();
      setForm(initialForm());
      toast.success("Suivi des clés enregistré.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement du suivi impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Suivi journalier des clés">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">Les données sont rattachées au site du compte connecté.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="keys-date">Date</Label><Input id="keys-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="keys-place">Lieu / trousseau</Label><Input id="keys-place" required maxLength={255} value={form.lieu} onChange={(event) => setForm({ ...form, lieu: event.target.value })} placeholder="Ex. Trousseau du poste principal" /></div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {slots.map(([timeKey, label, personKey, personLabel]) => (
              <div key={timeKey} className="space-y-2 rounded-md border p-3">
                <Label htmlFor={timeKey}>{label}</Label>
                <Input id={timeKey} type="time" value={form[timeKey]} onChange={(event) => setForm({ ...form, [timeKey]: event.target.value })} />
                <Input aria-label={`${personLabel} — ${label}`} maxLength={255} value={form[personKey]} onChange={(event) => setForm({ ...form, [personKey]: event.target.value })} placeholder={personLabel} />
              </div>
            ))}
          </div>

          <div className="space-y-1.5"><Label htmlFor="keys-observations">Observations</Label><Textarea id="keys-observations" maxLength={20000} value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} /></div>
          <Button disabled={saving}><KeyRound className="mr-2 h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer le suivi"}</Button>
        </form>
      </Panel>

      <Panel title="Historique des mouvements">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : entries.length === 0 ? <p className="text-sm text-muted-foreground">Aucun suivi enregistré pour ce site.</p> : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2"><strong>{entry.lieu}</strong><time className="text-muted-foreground">{new Date(entry.date).toLocaleDateString("fr-FR")}</time></div>
                <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2 text-xs">
                  {slots.map(([timeKey, label, personKey]) => entry[timeKey] && <p key={timeKey}>{label} : {entry[timeKey]}{entry[personKey] ? ` · ${entry[personKey]}` : ""}</p>)}
                </div>
                {entry.observations && <p className="mt-2 text-xs text-muted-foreground">{entry.observations}</p>}
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
