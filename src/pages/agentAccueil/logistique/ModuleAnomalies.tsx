import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from 'axios';
import { AlertTriangle } from "lucide-react";
import React, { useState } from 'react';
import { toast } from "sonner";

interface FormProps {
  onRefresh?: () => void;
}

export default function ModuleAnomalies({ onRefresh }: FormProps) {
  const [form, setForm] = useState({
    type: 'Anomalie',
    camion: '',
    documentRef: '',
    anomalie: 'Casse',
    formatProduit: '',
    quantiteImpactee: '',
    descriptionFait: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    axios.post("http://localhost:5000/api/flux", form)
      .then(() => {
        toast.error("Anomalie signalée et enregistrée avec succès !");
        setForm({
          type: 'Anomalie', camion: '', documentRef: '',
          anomalie: 'Casse', formatProduit: '', quantiteImpactee: '', descriptionFait: ''
        });
        if (onRefresh) onRefresh();
      })
      .catch(() => toast.error("Erreur lors de la déclaration de l'anomalie"));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">Camion / Véhicule concerné</Label>
          <Input required value={form.camion} onChange={e => setForm({ ...form, camion: e.target.value })} placeholder="Immatriculation" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center leading-tight">N° de Document (TT / REV / Facture)</Label>
          <Input required value={form.documentRef} onChange={e => setForm({ ...form, documentRef: e.target.value })} placeholder="ex. TT-98421" className="h-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="block">Type d'Anomalie</Label>
        <select 
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs" 
          value={form.anomalie} 
          onChange={e => setForm({ ...form, anomalie: e.target.value })}
        >
          <option value="Casse">Casse</option>
          <option value="Manquant">Manquant</option>
          <option value="Vide">Vide</option>
          <option value="PHN">PHN (Produit Hors Normes)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center leading-tight">Format / Produit concerné</Label>
          <Input required value={form.formatProduit} onChange={e => setForm({ ...form, formatProduit: e.target.value })} placeholder="ex. EV 150cl / Casier CV12" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center leading-tight">Quantité (Unités / Bouteilles)</Label>
          <Input required type="number" value={form.quantiteImpactee} onChange={e => setForm({ ...form, quantiteImpactee: e.target.value })} placeholder="ex. 24" className="h-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="block">Description détaillée des faits</Label>
        <Input required value={form.descriptionFait} onChange={e => setForm({ ...form, descriptionFait: e.target.value })} placeholder="Précisez les circonstances du litige..." className="h-9" />
      </div>

      <Button variant="destructive" className="w-full h-10 mt-2">
        <AlertTriangle className="mr-2 h-4 w-4" /> Signaler et Enregistrer l'Anomalie
      </Button>
    </form>
  );
}