import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound } from "lucide-react";
import { useState } from 'react';
import { toast } from "sonner";

const API_URL = "http://localhost:5000/api";

export default function GestionClesPanel() {
  const [form, setForm] = useState({
    trousseCle: '',
    personneHabilitee: '',
    matriculePersonne: '',
    action: 'Perception',
    agentGardien: '',
    heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur serveur");

      toast.success(`Mouvement de clé enregistré avec succès (${form.action}).`);
      setForm({ 
        trousseCle: '', 
        personneHabilitee: '', 
        matriculePersonne: '', 
        action: 'Perception', 
        agentGardien: '', 
        heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      });
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement de la clé.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="bg-muted/50 p-3 rounded-md mb-2">
        <p className="font-semibold text-primary">Gestion du Trousseau & Boîte à Clés</p>
        <p className="text-[11px] text-muted-foreground">Registre contradictoire d'accès aux locaux sensibles (Base de données).</p>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">Réf. Trousseau / Clé</Label>
          <Input required value={form.trousseCle} onChange={e => setForm({ ...form, trousseCle: e.target.value })} placeholder="ex. CLE-TGBT-01" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">Type de Mouvement</Label>
          <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs" value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}>
            <option value="Perception">Perception (Sortie)</option>
            <option value="Réintégration">Réintégration (Retour)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center leading-tight">Personne Habilitée (Nom/Prénom)</Label>
          <Input required value={form.personneHabilitee} onChange={e => setForm({ ...form, personneHabilitee: e.target.value })} placeholder="ex. Jean Marc" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">Matricule / Société</Label>
          <Input required value={form.matriculePersonne} onChange={e => setForm({ ...form, matriculePersonne: e.target.value })} placeholder="ex. MAT-4029" className="h-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">Agent Gardien (Signataire)</Label>
          <Input required value={form.agentGardien} onChange={e => setForm({ ...form, agentGardien: e.target.value })} placeholder="Matricule Agent" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">Heure (HH:MM)</Label>
          <Input required type="time" value={form.heure} onChange={e => setForm({ ...form, heure: e.target.value })} className="h-9 font-mono" />
        </div>
      </div>

      <Button className="w-full h-10 mt-2">
        <KeyRound className="mr-2 h-4 w-4" /> Enregistrer le Mouvement & Valider
      </Button>
    </form>
  );
}