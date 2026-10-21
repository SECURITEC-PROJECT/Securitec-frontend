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

export default function FormChargement({ onRefresh }: FormProps) {
  const [form, setForm] = useState({
    type: 'Chargement',
    siteType: 'Usine',
    camion: '',
    remorque: '',
    transporteur: '',
    transportType: 'VL',
    documentType: 'TT',
    documentRef: '',
    plomb: '',
    variante: 'Matières premières'
  });

  const handleSiteChange = (site: string) => {
    setForm({
      ...form,
      siteType: site,
      documentType: site === 'Usine' ? 'TT' : 'REV',
      variante: site === 'Usine' ? 'Matières premières' : 'VL'
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullDocRef = `${form.documentType}-${form.documentRef}`;
    axios.post(`${API_URL}/flux`, { ...form, documentRef: fullDocRef, anomalie: 'Aucune' })
      .then(() => {
        toast.success("Chargement enregistré avec succès !");
        setForm({
          type: 'Chargement', siteType: 'Usine', camion: '', remorque: '',
          transporteur: '', transportType: 'VL', documentType: 'TT',
          documentRef: '', plomb: '', variante: 'Matières premières'
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
          <Input required value={form.camion} onChange={e => setForm({ ...form, camion: e.target.value })} placeholder="ex. 1234 TAA" className="h-9" />
        </div>
        <div className="space-y-1">
          <Label>Remorque</Label>
          <Input value={form.remorque} onChange={e => setForm({ ...form, remorque: e.target.value })} placeholder="ex. REM-01" className="h-9" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Transporteur / Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          <Input required value={form.transporteur} onChange={e => setForm({ ...form, transporteur: e.target.value })} placeholder="Transporteur" className="h-9" />
          {form.siteType === 'Agence' && (
            <select 
              className="h-9 rounded-md border border-input bg-background px-3 text-xs"
              value={form.transportType}
              onChange={e => setForm({ ...form, transportType: e.target.value })}
            >
              <option value="VL">Vente Livrée (VL)</option>
              <option value="VD">Vente Directe (VD)</option>
            </select>
          )}
        </div>
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
              {form.siteType === 'Agence' && (
                <>
                  <option value="REV">REV</option>
                  <option value="FAC">Facture</option>
                </>
              )}
            </select>
            <Input required value={form.documentRef} onChange={e => setForm({ ...form, documentRef: e.target.value })} placeholder="98421" className="h-9" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>N° de Plomb</Label>
          <Input required value={form.plomb} onChange={e => setForm({ ...form, plomb: e.target.value })} placeholder="PLB-8839" className="h-9" />
        </div>
      </div>

      <Button className="w-full h-10 mt-2"><Plus className="mr-2 h-4 w-4" /> Enregistrer le Chargement</Button>
    </form>
  );
}