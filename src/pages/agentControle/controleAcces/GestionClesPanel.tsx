import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, KeyRound, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ReintegrationDetailsModal from "./ReintegrationDetailsModal";
import ReintegrationModal from "./ReintegrationModal";

const API_URL = "http://localhost:5000/api";

// Heure au format 24h "HH:MM" (obligatoire pour <input type="time">)
const heureActuelle = () =>
  new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false });

const formVide = () => ({
  trousseCle: "",
  personneHabilitee: "",
  rolePersonne: "",
  agentGardien: "",
  lieu: "",
  observation: "",
  heure: heureActuelle(),
});

export default function GestionClesPanel() {
  const [form, setForm] = useState(formVide());
  const [personnes, setPersonnes] = useState<any[]>([]);
  const [isHabilite, setIsHabilite] = useState(true);
  const [cles, setCles] = useState<any[]>([]);
  const [selectedCle, setSelectedCle] = useState<any>(null);
  const [detailsCle, setDetailsCle] = useState<{ perception: any; reintegration: any } | null>(null);

  const loadData = async () => {
    try {
      const res = await fetch(`${API_URL}/keys`);
      if (res.ok) setCles(await res.json());
    } catch (err) {
      console.error("Erreur chargement des clés:", err);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!form.trousseCle.trim()) { setPersonnes([]); return; }
    fetch(`${API_URL}/cles-habilitations/${encodeURIComponent(form.trousseCle.trim())}`)
      .then(res => res.json())
      .then(data => setPersonnes(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error("Erreur chargement habilitations:", err);
        setPersonnes([]);
      });
  }, [form.trousseCle]);

  // Réintégration associée à chaque perception (clé : id de la perception)
  const reintegrationParPerception = new Map<number, any>();
  cles
    .filter(c => c.action === "Réintégration" && c.perception_id != null)
    .forEach(r => reintegrationParPerception.set(r.perception_id, r));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/keys`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, action: "Perception" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Échec de l'enregistrement.");
        return;
      }
      toast.success("Perception enregistrée.");
      setForm(formVide());
      setIsHabilite(true);
      loadData();
    } catch (err) {
      console.error("Erreur enregistrement:", err);
      toast.error("Serveur injoignable. Vérifiez que le backend est lancé.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
      <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-3 bg-card p-4 rounded-lg border shadow-sm">
        <p className="font-semibold text-primary">Perception de Clé</p>
        <div className="grid grid-cols-2 gap-3">
          <Input required value={form.trousseCle} onChange={e => setForm({ ...form, trousseCle: e.target.value })} placeholder="Réf. Clé" className="h-9" />
          <select required value={form.personneHabilitee} onChange={e => {
            const p = personnes.find(x => `${x.nom} ${x.prenom}` === e.target.value);
            setForm({ ...form, personneHabilitee: e.target.value, rolePersonne: p ? p.role : "" });
            setIsHabilite(!!p);
          }} className="w-full h-9 rounded-md border px-3 bg-background">
            <option value="">-- Personne habilitée --</option>
            {personnes.map(p => <option key={p.id} value={`${p.nom} ${p.prenom}`}>{p.nom} {p.prenom} ({p.role})</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input readOnly value={form.rolePersonne} placeholder="Rôle automatique" className="h-9 bg-muted" />
          <Input required value={form.agentGardien} onChange={e => setForm({ ...form, agentGardien: e.target.value })} placeholder="Matricule Agent" className="h-9" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} placeholder="Lieu" className="h-9" />
          <Input required type="time" value={form.heure} onChange={e => setForm({ ...form, heure: e.target.value })} className="h-9 font-mono" />
        </div>
        <Input value={form.observation} onChange={e => setForm({ ...form, observation: e.target.value })} placeholder="Observation..." className="h-9" />
        <Button type="submit" className="w-full h-9" disabled={!isHabilite || !form.personneHabilitee}><KeyRound className="mr-2 h-4 w-4" /> Enregistrer</Button>
      </form>

      <div className="lg:col-span-5 bg-card p-4 rounded-lg border shadow-sm space-y-3">
        <p className="font-semibold text-primary">Clés en circulation</p>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {cles.filter(c => c.action === 'Perception').map(cle => {
            const reintegration = reintegrationParPerception.get(cle.id);

            // Clé déjà rendue : badge vert, clic = détails de la réintégration
            if (reintegration) {
              return (
                <div
                  key={cle.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailsCle({ perception: cle, reintegration })}
                  onKeyDown={(e) => { if (e.key === "Enter") setDetailsCle({ perception: cle, reintegration }); }}
                  className="p-2.5 border border-emerald-200 rounded bg-emerald-50/40 flex justify-between items-center cursor-pointer hover:bg-emerald-50"
                >
                  <div>
                    <p className="font-bold text-primary">{cle.trousse_cle}</p>
                    <p className="text-[11px] text-muted-foreground">{cle.personne_habilitee}</p>
                  </div>
                  <span className="flex items-center text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Rendue
                  </span>
                </div>
              );
            }

            // Clé encore en circulation
            return (
              <div key={cle.id} className="p-2.5 border rounded bg-background flex justify-between items-center">
                <div>
                  <p className="font-bold text-primary">{cle.trousse_cle}</p>
                  <p className="text-[11px] text-muted-foreground">{cle.personne_habilitee}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedCle(cle)}>
                  <RotateCcw className="w-3 h-3 mr-1" /> Retour
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {selectedCle && (
        <ReintegrationModal
          cle={selectedCle}
          onClose={() => setSelectedCle(null)}
          onSubmit={async (data) => {
            try {
              const res = await fetch(`${API_URL}/keys`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  trousseCle: selectedCle.trousse_cle, action: "Réintégration",
                  perceptionId: selectedCle.id,
                  personneHabilitee: data.memePersonne ? selectedCle.personne_habilitee : (data.reintegrateur || 'PERDU'),
                  rolePersonne: data.memePersonne ? selectedCle.role_personne : data.roleReintegrateur,
                  agentGardien: data.agentGardien, lieu: selectedCle.lieu,
                  observation: data.memePersonne ? `Réintégré par ${selectedCle.personne_habilitee}` : `Tiers (${data.reintegrateur}) - ${data.obs}`,
                  heure: heureActuelle()
                })
              });
              const result = await res.json().catch(() => ({}));
              if (!res.ok) {
                toast.error(result.error || "Échec de la réintégration.");
                return;
              }
              toast.success("Réintégration enregistrée.");
              setSelectedCle(null);
              loadData();
            } catch (err) {
              console.error("Erreur réintégration:", err);
              toast.error("Serveur injoignable. Vérifiez que le backend est lancé.");
            }
          }}
        />
      )}

      {detailsCle && (
        <ReintegrationDetailsModal
          perception={detailsCle.perception}
          reintegration={detailsCle.reintegration}
          onClose={() => setDetailsCle(null)}
        />
      )}
    </div>
  );
}
