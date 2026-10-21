import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { serviceApi } from "@/lib/service-api";
import { AlertCircle, TestTube2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

interface BreathTestEntry {
  id: string;
  date: string;
  heure: string;
  personne: string;
  appartenance: "STAR" | "NON STAR";
  demandeur?: string | null;
  typeDemande: string;
  resultat: "Positif" | "Négatif";
  tauxMesure?: number | string | null;
  siteName?: string;
}

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const initialForm = () => ({
  date: localDate(),
  heure: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  personne: "",
  appartenance: "STAR" as "STAR" | "NON STAR",
  demandeur: "",
  typeDemande: "Test ordinaire (Entrée/Sortie)",
  resultat: "Négatif" as "Positif" | "Négatif",
  tauxMesure: "0.00",
});

export default function AlcootestPanel({ siteId }: { siteId: string }) {
  const [form, setForm] = useState(initialForm);
  const [entries, setEntries] = useState<BreathTestEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!siteId) { setEntries([]); return; }
    const data = await serviceApi.listBreathTests(siteId);
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
    if (!siteId) { toast.error("Sélectionnez un site avant d’enregistrer le contrôle."); return; }
    if (form.typeDemande === "À la demande d'un service" && !form.demandeur.trim()) {
      toast.error("Le nom du demandeur est obligatoire pour un contrôle sur demande.");
      return;
    }
    setSaving(true);
    try {
      await serviceApi.createBreathTest({
        ...form,
        siteId,
        tauxMesure: form.tauxMesure === "" ? null : Number(form.tauxMesure),
      });
      await refresh();
      setForm(initialForm());
      toast.success("Contrôle d’alcoolémie enregistré.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Enregistrement du contrôle impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Enregistrer un contrôle d’alcoolémie">
        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <p className="text-xs text-muted-foreground">Le contrôle est rattaché au site du compte connecté. La base autorise les résultats « Positif » et « Négatif ».</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="breath-date">Date</Label><Input id="breath-date" type="date" required value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="breath-time">Heure</Label><Input id="breath-time" type="time" required value={form.heure} onChange={(event) => setForm({ ...form, heure: event.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="breath-person">Personne contrôlée</Label><Input id="breath-person" required maxLength={255} value={form.personne} onChange={(event) => setForm({ ...form, personne: event.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="breath-membership">Appartenance</Label><select id="breath-membership" className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.appartenance} onChange={(event) => setForm({ ...form, appartenance: event.target.value as "STAR" | "NON STAR" })}><option value="STAR">Personnel STAR</option><option value="NON STAR">Prestataire / tiers</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="breath-type">Type de contrôle</Label><select id="breath-type" className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.typeDemande} onChange={(event) => setForm({ ...form, typeDemande: event.target.value })}><option value="Test ordinaire (Entrée/Sortie)">Test ordinaire (entrée / sortie)</option><option value="À la demande d'un service">À la demande d’un service</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="breath-result">Résultat</Label><select id="breath-result" className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.resultat} onChange={(event) => setForm({ ...form, resultat: event.target.value as "Positif" | "Négatif" })}><option value="Négatif">Négatif</option><option value="Positif">Positif</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="breath-rate">Taux mesuré (g/L)</Label><Input id="breath-rate" type="number" min="0" max="999.99" step="0.01" value={form.tauxMesure} onChange={(event) => setForm({ ...form, tauxMesure: event.target.value })} /></div>
            {form.typeDemande === "À la demande d'un service" && <div className="space-y-1.5"><Label htmlFor="breath-requester">Demandeur habilité</Label><Input id="breath-requester" required maxLength={255} value={form.demandeur} onChange={(event) => setForm({ ...form, demandeur: event.target.value })} placeholder="Nom et fonction" /></div>}
          </div>
          {form.resultat === "Positif" && <p className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4" />Suivre la procédure interne applicable et consigner les mesures prises.</p>}
          <Button disabled={saving}><TestTube2 className="mr-2 h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer le contrôle"}</Button>
        </form>
      </Panel>

      <Panel title="Historique des contrôles">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : entries.length === 0 ? <p className="text-sm text-muted-foreground">Aucun contrôle enregistré pour ce site.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="py-2 pr-3">Date / heure</th><th className="pr-3">Personne</th><th className="pr-3">Type</th><th className="pr-3">Résultat</th><th>Taux (g/L)</th></tr></thead><tbody>{entries.map((entry) => <tr key={entry.id} className="border-b last:border-0"><td className="py-2 pr-3">{new Date(entry.date).toLocaleDateString("fr-FR")} {entry.heure}</td><td className="pr-3">{entry.personne}</td><td className="pr-3">{entry.typeDemande}</td><td className="pr-3">{entry.resultat}</td><td>{entry.tauxMesure ?? "—"}</td></tr>)}</tbody></table></div>
        )}
      </Panel>
    </div>
  );
}
