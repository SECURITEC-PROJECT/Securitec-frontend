import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL, authHeaders } from "@/lib/api";
import { CheckCircle2, KeyRound, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ReintegrationDetailsModal from "./Reintegrationdetailsmodal";
import ReintegrationModal from "./ReintegrationModal";

const heureActuelle = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });
const formVide = () => ({ trousseCle: "", personneHabilitee: "", rolePersonne: "", agentGardien: "", lieu: "", observation: "", heure: heureActuelle() });

export default function GestionClesPanel(_props: { siteId?: string }) {
  const [form, setForm] = useState(formVide());
  const [personnes, setPersonnes] = useState<any[]>([]);
  const [isHabilite, setIsHabilite] = useState(true);
  const [cles, setCles] = useState<any[]>([]);
  const [selectedCle, setSelectedCle] = useState<any>(null);
  const [detailsCle, setDetailsCle] = useState<{ perception: any; reintegration: any } | null>(null);

  const loadData = useCallback(async () => {
    const res = await fetch(`${API_URL}/keys`, { headers: authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Impossible de charger les mouvements de clés.");
    setCles(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    loadData().catch((error) => toast.error(error instanceof Error ? error.message : "Chargement des clés impossible."));
  }, [loadData]);

  useEffect(() => {
    if (!form.trousseCle.trim()) { setPersonnes([]); return; }
    const controller = new AbortController();
    fetch(`${API_URL}/cles-habilitations/${encodeURIComponent(form.trousseCle.trim())}`, {
      headers: authHeaders(), signal: controller.signal,
    }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Chargement des habilitations impossible.");
      setPersonnes(Array.isArray(data) ? data : []);
    }).catch((error) => {
      if (error.name !== "AbortError") { console.error("Erreur chargement habilitations:", error); setPersonnes([]); }
    });
    return () => controller.abort();
  }, [form.trousseCle]);

  const reintegrationParPerception = new Map<number, any>();
  cles.filter((c) => c.action === "Réintégration" && c.perception_id != null)
    .forEach((row) => reintegrationParPerception.set(Number(row.perception_id), row));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const res = await fetch(`${API_URL}/keys`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ ...form, action: "Perception" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || "Échec de l’enregistrement."); return; }
      toast.success("Perception enregistrée.");
      setForm(formVide()); setIsHabilite(true);
      await loadData();
    } catch (error) {
      console.error("Erreur enregistrement:", error);
      toast.error(error instanceof Error ? error.message : "Serveur injoignable.");
    }
  };

  return <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
    <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-3 bg-card p-4 rounded-lg border shadow-sm">
      <p className="font-semibold text-primary">Perception de Clé</p>
      <div className="grid grid-cols-2 gap-3">
        <Input required value={form.trousseCle} onChange={(e) => setForm({ ...form, trousseCle: e.target.value })} placeholder="Réf. Clé" className="h-9" />
        <select required value={form.personneHabilitee} onChange={(e) => {
          const person = personnes.find((item) => `${item.nom} ${item.prenom}` === e.target.value);
          setForm({ ...form, personneHabilitee: e.target.value, rolePersonne: person ? person.role : "" });
          setIsHabilite(!!person);
        }} className="w-full h-9 rounded-md border px-3 bg-background">
          <option value="">-- Personne habilitée --</option>
          {personnes.map((person) => <option key={person.id} value={`${person.nom} ${person.prenom}`}>{person.nom} {person.prenom} ({person.role})</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input readOnly value={form.rolePersonne} placeholder="Rôle automatique" className="h-9 bg-muted" />
        <Input required value={form.agentGardien} onChange={(e) => setForm({ ...form, agentGardien: e.target.value })} placeholder="Matricule Agent" className="h-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} placeholder="Lieu" className="h-9" />
        <Input required type="time" value={form.heure} onChange={(e) => setForm({ ...form, heure: e.target.value })} className="h-9 font-mono" />
      </div>
      <Input value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} placeholder="Observation..." className="h-9" />
      <Button type="submit" className="w-full h-9" disabled={!isHabilite || !form.personneHabilitee}><KeyRound className="mr-2 h-4 w-4" /> Enregistrer</Button>
    </form>

    <div className="lg:col-span-5 bg-card p-4 rounded-lg border shadow-sm space-y-3">
      <p className="font-semibold text-primary">Clés en circulation</p>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {cles.filter((row) => row.action === "Perception").map((cle) => {
          const reintegration = reintegrationParPerception.get(Number(cle.id));
          if (reintegration) return <div key={cle.id} role="button" tabIndex={0}
            onClick={() => setDetailsCle({ perception: cle, reintegration })}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setDetailsCle({ perception: cle, reintegration }); }}
            className="p-2.5 border border-emerald-200 rounded bg-emerald-50/40 flex justify-between items-center cursor-pointer hover:bg-emerald-50">
            <div><p className="font-bold text-primary">{cle.trousse_cle}</p><p className="text-[11px] text-muted-foreground">{cle.personne_habilitee}</p></div>
            <span className="flex items-center text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Rendue</span>
          </div>;
          return <div key={cle.id} className="p-2.5 border rounded bg-background flex justify-between items-center">
            <div><p className="font-bold text-primary">{cle.trousse_cle}</p><p className="text-[11px] text-muted-foreground">{cle.personne_habilitee}</p></div>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedCle(cle)}><RotateCcw className="w-3 h-3 mr-1" /> Retour</Button>
          </div>;
        })}
      </div>
    </div>

    {selectedCle && <ReintegrationModal cle={selectedCle} onClose={() => setSelectedCle(null)} onSubmit={async (data) => {
      try {
        const res = await fetch(`${API_URL}/keys`, {
          method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            trousseCle: selectedCle.trousse_cle, action: "Réintégration", perceptionId: selectedCle.id,
            personneHabilitee: data.memePersonne ? selectedCle.personne_habilitee : (data.reintegrateur || "PERDU"),
            rolePersonne: data.memePersonne ? selectedCle.role_personne : data.roleReintegrateur,
            agentGardien: data.agentGardien, lieu: selectedCle.lieu,
            observation: data.memePersonne ? `Réintégré par ${selectedCle.personne_habilitee}` : `Tiers (${data.reintegrateur}) - ${data.obs}`,
            heure: heureActuelle(),
          }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) { toast.error(result.error || "Échec de la réintégration."); return; }
        toast.success("Réintégration enregistrée."); setSelectedCle(null); await loadData();
      } catch (error) {
        console.error("Erreur réintégration:", error);
        toast.error(error instanceof Error ? error.message : "Serveur injoignable.");
      }
    }} />}
    {detailsCle && <ReintegrationDetailsModal perception={detailsCle.perception} reintegration={detailsCle.reintegration} onClose={() => setDetailsCle(null)} />}
  </div>;
}
