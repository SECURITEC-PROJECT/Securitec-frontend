import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from 'axios';
import { Plus } from "lucide-react";
import React, { useState } from 'react';
import { toast } from "sonner";

interface FormProps {
  onRefresh?: () => void;
}

export default function FormDechargement({ onRefresh }: FormProps) {
  const [form, setForm] = useState({
    type: 'Déchargement',
    siteType: 'Agence',
    camion: '',
    remorque: '',
    transporteur: '',
    documentType: 'REV',
    documentRef: '',
    plomb: '',
    variante: 'Matières premières'
  });

  const handleSiteChange = (site: string) => {
    setForm({
      ...form,
      siteType: site,
      documentType: site === 'Usine' ? 'TT' : 'REV'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullDocRef = `${form.documentType}-${form.documentRef}`;
    axios.post(`${API_URL}/flux`, { ...form, documentRef: fullDocRef, anomalie: 'Aucune' })
      .then(() => {
        toast.success("Déchargement enregistré avec succès !");
        setForm({
          type: 'Déchargement', siteType: 'Agence', camion: '', remorque: '',
          transporteur: '', documentType: 'REV', documentRef: '',
          plomb: '', variante: 'Matières premières'
        });
        if (onRefresh) onRefresh();
      })
      .catch(() => toast.error("Erreur lors de l'enregistrement"));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div>
        <Label className="block mb-1">Contexte / Site</Label>
        <select 
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs" 
          value={form.siteType} 
          onChange={e => handleSiteChange(e.target.value)}
        >
          <option value="Usine">Usine</option>
          <option value="Agence">Agence</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Camion</Label>
          <Input required value={form.camion} onChange={e => setForm({ ...form, camion: e.target.value })} placeholder="ex. 5678 TAF" className="h-9" />
        </div>
        <div className="space-y-1">
          <Label>Remorque</Label>
          <Input value={form.remorque} onChange={e => setForm({ ...form, remorque: e.target.value })} placeholder="ex. REM-02" className="h-9" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Transporteur</Label>
        <Input required value={form.transporteur} onChange={e => setForm({ ...form, transporteur: e.target.value })} placeholder="Nom du transporteur" className="h-9" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Type & Réf. Document</Label>
          <div className="flex gap-1">
            <select 
              className="w-24 h-9 rounded-md border border-input bg-background px-2 text-xs font-mono"
              value={form.documentType}
              onChange={e => setForm({ ...form, documentType: e.target.value })}
            >
              <option value="TT">TT</option>
              <option value="REV">REV</option>
              <option value="FAC">Facture</option>
            </select>
            <Input required value={form.documentRef} onChange={e => setForm({ ...form, documentRef: e.target.value })} placeholder="19284" className="h-9" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>N° de Plomb d'arrivée</Label>
          <Input required value={form.plomb} onChange={e => setForm({ ...form, plomb: e.target.value })} placeholder="PLB-1029" className="h-9" />
        </div>
      </div>

      <Button className="w-full h-10 mt-2"><Plus className="mr-2 h-4 w-4" /> Enregistrer le Déchargement</Button>
    </form>
  );
}