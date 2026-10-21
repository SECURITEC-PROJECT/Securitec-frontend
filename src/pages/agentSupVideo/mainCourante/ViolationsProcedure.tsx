import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertOctagon } from "lucide-react";
import { useState } from 'react';
import { toast } from "sonner";

const API_URL = "http://localhost:5000/api";

interface ViolationsProps {
  onRefresh?: () => void;
}

export default function ViolationsProcedure({ onRefresh }: ViolationsProps) {
  const [form, setForm] = useState({
    auteur: '',
    statutAuteur: 'Employé',
    natureViolation: 'Refus de contrôle',
    description: '',
    mesuresPrises: '',
    heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/main-courante`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          typeEntree: "VIOLATION",
          category: "Incident",
          severity: "grave",
          people: form.auteur,
          statutAuteur: form.statutAuteur,
          natureViolation: form.natureViolation,
          description: form.description,
          mesuresPrises: form.mesuresPrises,
          heure: form.heure
        }),
      });

      if (!response.ok) throw new Error("Erreur enregistrement");

      toast.error("9 - VIOLATION DE PROCEDURE enregistrée dans le CRJ !");
      setForm({
        auteur: '',
        statutAuteur: 'Employé',
        natureViolation: 'Refus de contrôle',
        description: '',
        mesuresPrises: '',
        heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la violation.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-card space-y-4 text-xs">
      <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md mb-2">
        <p className="font-semibold text-destructive">9 - VIOLATION DE PROCEDURE</p>
        <p className="text-[11px] text-muted-foreground">Registre des manquements : NOM & PRENOM | OBSERVATIONS | MESURES PRISES.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">NOM & PRENOM (Contrevenant)</Label>
          <Input required value={form.auteur} onChange={e => setForm({ ...form, auteur: e.target.value })} placeholder="Nom, Prénom, Société" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">Qualité / Statut</Label>
          <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs" value={form.statutAuteur} onChange={e => setForm({ ...form, statutAuteur: e.target.value })}>
            <option value="Employé">Employé du site</option>
            <option value="Prestataire">Prestataire extérieur</option>
            <option value="Transporteur">Transporteur / Chauffeur</option>
            <option value="Visiteur">Visiteur</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">Type de manquement</Label>
          <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs" value={form.natureViolation} onChange={e => setForm({ ...form, natureViolation: e.target.value })}>
            <option value="Refus de contrôle">Refus de contrôle d'accès / fouille</option>
            <option value="Refus alcootest">Refus d'alcootest</option>
            <option value="Zone non fumeur">Non-respect des zones non-fumeurs</option>
            <option value="Non-port EPI">Défaut de port d'EPI obligatoire</option>
            <option value="Intrusion zone">Intrusion en zone interdite</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">Heure des faits (HH:MM)</Label>
          <Input required type="time" value={form.heure} onChange={e => setForm({ ...form, heure: e.target.value })} className="h-9 font-mono" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="block">OBSERVATIONS (Description des faits)</Label>
        <Input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Détails précis de l'incident..." className="h-9" />
      </div>

      <div className="space-y-1.5">
        <Label className="block font-bold text-destructive">MESURES PRISES</Label>
        <Input required value={form.mesuresPrises} onChange={e => setForm({ ...form, mesuresPrises: e.target.value })} placeholder="ex. Refus d'accès au site, alerte du Chef de Sécurité..." className="h-9 border-destructive/40" />
      </div>

      <Button variant="destructive" className="w-full h-10 mt-2">
        <AlertOctagon className="mr-2 h-4 w-4" /> Enregistrer la Violation
      </Button>
    </form>
  );
}