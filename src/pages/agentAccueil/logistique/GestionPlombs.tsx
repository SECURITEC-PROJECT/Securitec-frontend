import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";
import React, { useState } from 'react';
import { toast } from "sonner";

export default function GestionPlombs() {
  const [plombSearch, setPlombSearch] = useState("");

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info(`Vérification du statut pour le plomb : ${plombSearch}`);
  };

  return (
    <form onSubmit={handleVerify} className="space-y-4 text-xs">
      <div>
        <Label>Recherche / Contrôle de Plomb</Label>
        <div className="flex gap-2 mt-1">
          <Input value={plombSearch} onChange={e => setPlombSearch(e.target.value)} placeholder="Entrer le numéro de plomb..." className="h-9" />
          <button type="submit" className="px-3 bg-primary text-primary-foreground rounded-md flex items-center gap-1 text-xs">
            <ShieldCheck className="h-4 w-4" /> Vérifier
          </button>
        </div>
      </div>
      <p className="text-muted-foreground text-[11px]">Permet de valider l'intégrité et l'historique d'un scellé ou plomb de sécurité.</p>
    </form>
  );
}