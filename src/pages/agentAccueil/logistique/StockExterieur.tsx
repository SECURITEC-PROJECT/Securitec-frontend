import { API_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import axios from 'axios';
import { ClipboardList } from "lucide-react";
import React, { useState } from 'react';
import { toast } from "sonner";

interface FormProps {
  onRefresh?: () => void;
}

export default function StockExterieur({ onRefresh }: FormProps) {
  const [form, setForm] = useState({
    type: 'Stock Extérieur',
    siteType: 'Agence',
    cv12: '', cv24: '', cv20: '', intercalaires: '',
    ev150: '', ev50: '', cr200: '', cr100: '',
    observateur: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    axios.post(`${API_URL}/flux`, form)
      .then(() => {
        toast.success("Inventaire du stock extérieur enregistré avec succès !");
        setForm({
          type: 'Stock Extérieur', siteType: 'Agence',
          cv12: '', cv24: '', cv20: '', intercalaires: '',
          ev150: '', ev50: '', cr200: '', cr100: '', observateur: ''
        });
        if (onRefresh) onRefresh();
      })
      .catch(() => toast.error("Erreur lors de l'enregistrement de l'inventaire"));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      <div className="bg-muted/50 p-3 rounded-md mb-2">
        <p className="font-semibold text-primary">Inventaire physique de fin de journée (Agence uniquement)</p>
        <p className="text-[11px] text-muted-foreground">Comptage des palettes de vides et de produits pleins stockés à l'extérieur.</p>
      </div>

      <div className="space-y-2 border-t pt-2">
        <p className="font-semibold text-muted-foreground uppercase text-[10px]">1. Emballages Vides & Intercalaires</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>CV12 (Vides)</Label>
            <Input type="number" value={form.cv12} onChange={e => setForm({ ...form, cv12: e.target.value })} placeholder="Ex. 12" className="h-9" />
          </div>
          <div>
            <Label>CV24 (Vides)</Label>
            <Input type="number" value={form.cv24} onChange={e => setForm({ ...form, cv24: e.target.value })} placeholder="Ex. 8" className="h-9" />
          </div>
          <div>
            <Label>CV20 (Vides)</Label>
            <Input type="number" value={form.cv20} onChange={e => setForm({ ...form, cv20: e.target.value })} placeholder="Ex. 5" className="h-9" />
          </div>
          <div>
            <Label>Intercalaires (Paquets)</Label>
            <Input type="number" value={form.intercalaires} onChange={e => setForm({ ...form, intercalaires: e.target.value })} placeholder="Ex. 3" className="h-9" />
          </div>
        </div>
      </div>

      <div className="space-y-2 border-t pt-2">
        <p className="font-semibold text-muted-foreground uppercase text-[10px]">2. Produits Pleins (Palettes)</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Eau Vive 150cl (EV150 P6)</Label>
            <Input type="number" value={form.ev150} onChange={e => setForm({ ...form, ev150: e.target.value })} placeholder="Nb palettes" className="h-9" />
          </div>
          <div>
            <Label>Eau Vive 50cl (EV50 P12)</Label>
            <Input type="number" value={form.ev50} onChange={e => setForm({ ...form, ev50: e.target.value })} placeholder="Nb palettes" className="h-9" />
          </div>
          <div>
            <Label>Cristalline 200cl (CR200 P6)</Label>
            <Input type="number" value={form.cr200} onChange={e => setForm({ ...form, cr200: e.target.value })} placeholder="Nb palettes" className="h-9" />
          </div>
          <div>
            <Label>Cristalline 100cl (CR100 P8)</Label>
            <Input type="number" value={form.cr100} onChange={e => setForm({ ...form, cr100: e.target.value })} placeholder="Nb palettes" className="h-9" />
          </div>
        </div>
      </div>

      <div>
        <Label>Agent / Responsable</Label>
        <Input required value={form.observateur} onChange={e => setForm({ ...form, observateur: e.target.value })} placeholder="Nom ou matricule" className="h-9" />
      </div>

      <Button className="w-full h-10 mt-2">
        <ClipboardList className="mr-2 h-4 w-4" /> Enregistrer l'inventaire stock
      </Button>
    </form>
  );
}