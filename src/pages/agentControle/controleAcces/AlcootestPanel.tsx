import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, ShieldAlert, TestTube2 } from "lucide-react";
import React, { useState } from 'react';
import { toast } from "sonner";

import { API_URL } from "@/lib/api";

export interface AlcootestEntry {
  id?: string;
  typeControle: 'Ordinaire' | 'A la demande';
  nomPrenom: string;
  isStar: boolean;
  demandeur?: string;
  resultat: 'Négatif' | 'Positif' | 'Refus';
  taux: string;
  heure: string;
}

interface Props {
  onAddEntry?: (entry: AlcootestEntry) => void;
}

export default function AlcootestPanel({ onAddEntry }: Props) {
  const [form, setForm] = useState({
    typeControle: 'Ordinaire' as 'Ordinaire' | 'A la demande',
    nomPrenom: '',
    isStar: true,
    demandeur: '',
    resultat: 'Négatif' as 'Négatif' | 'Positif' | 'Refus',
    taux: '0.00',
    heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.typeControle === 'A la demande' && !form.demandeur.trim()) {
      toast.error("La présence d'un supérieur/demandeur est OBLIGATOIRE pour un test sur demande.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/alcootests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erreur serveur");

      if (onAddEntry) onAddEntry(data);

      if (form.typeControle === 'Ordinaire' && form.resultat === 'Négatif') {
        toast.info("Test ordinaire négatif enregistré.");
      } else {
        toast.warning(`Test d'alcoolémie consigné avec succès ! (${form.resultat})`);
      }

      setForm({
        typeControle: 'Ordinaire',
        nomPrenom: '',
        isStar: true,
        demandeur: '',
        resultat: 'Négatif',
        taux: '0.00',
        heure: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } catch (error: any) {
      toast.error(error.message || "Impossible d'enregistrer l'alcootest.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-card space-y-4 text-xs">
      <div className="bg-muted/60 p-3 rounded-md border text-muted-foreground space-y-1">
        <p className="font-semibold text-primary flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4" /> Consignes Alcootest & Autorisation Hiérarchique
        </p>
        <p className="text-[11px]">
          • <strong>Ordinaire (E/S) :</strong> Enregistrement des contrôles.<br />
          • <strong>A la demande d'un service :</strong> Exige un <strong>demandeur habilité (Supérieur)</strong>.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-6 flex items-center font-medium">Cadre du contrôle</Label>
          <select 
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
            value={form.typeControle}
            onChange={e => setForm({ ...form, typeControle: e.target.value as any })}
          >
            <option value="Ordinaire">Test ordinaire (Entrée/Sortie)</option>
            <option value="A la demande">A la demande d'un service (Supérieur)</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="block h-6 flex items-center font-medium">Heure du test (HH:MM)</Label>
          <Input 
            required 
            type="time" 
            value={form.heure} 
            onChange={e => setForm({ ...form, heure: e.target.value })} 
            className="h-9 font-mono" 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-6 flex items-center font-medium">Nom & Prénom du contrôlé</Label>
          <Input 
            required 
            value={form.nomPrenom} 
            onChange={e => setForm({ ...form, nomPrenom: e.target.value })} 
            placeholder="Nom & Prénom" 
            className="h-9" 
          />
        </div>

        <div className="space-y-1.5">
          <Label className="block h-6 flex items-center font-medium">Appartenance</Label>
          <select 
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
            value={form.isStar ? "STAR" : "NON_STAR"}
            onChange={e => setForm({ ...form, isStar: e.target.value === "STAR" })}
          >
            <option value="STAR">Personnel STAR</option>
            <option value="NON_STAR">Prestataire / Chauffeur Tiers (NON STAR)</option>
          </select>
        </div>
      </div>

      {form.typeControle === 'A la demande' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md space-y-1.5">
          <Label className="block text-amber-900 font-bold flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600" /> Supérieur / Demandeur Habilité (Obligatoire)
          </Label>
          <Input 
            required 
            value={form.demandeur} 
            onChange={e => setForm({ ...form, demandeur: e.target.value })} 
            placeholder="Nom, Prénom & Fonction (ex: M. RABE)" 
            className="h-9 bg-white border-amber-300" 
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-6 flex items-center font-medium">Résultat du contrôle</Label>
          <select 
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
            value={form.resultat}
            onChange={e => setForm({ ...form, resultat: e.target.value as any })}
          >
            <option value="Négatif">Négatif (0.00 g/L)</option>
            <option value="Positif">Positif (&gt; 0.00 g/L)</option>
            <option value="Refus">Refus d'obtempérer</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="block h-6 flex items-center font-medium">Taux mesuré (g/L)</Label>
          <Input 
            value={form.taux} 
            onChange={e => setForm({ ...form, taux: e.target.value })} 
            placeholder="0.00" 
            className="h-9 font-mono" 
          />
        </div>
      </div>

      <Button 
        type="submit" 
        variant={form.resultat === 'Positif' ? 'destructive' : 'default'} 
        className="w-full h-10 mt-2 font-medium"
      >
        <TestTube2 className="mr-2 h-4 w-4" /> Valider & Enregistrer dans la base
      </Button>
    </form>
  );
}