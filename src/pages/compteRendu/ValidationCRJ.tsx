import { Button } from "@/components/ui/button";
import { FileCheck, Lock, ShieldCheck } from "lucide-react";
import { useState } from 'react';
import { toast } from "sonner";

export default function ValidationCRJ() {
  const [locked, setLocked] = useState(false);

  const handleLockCRJ = () => {
    setLocked(true);
    toast.success("Le Compte Rendu Journalier (CRJ) a été validé et verrouillé. Il est désormais opposable.");
  };

  return (
    <div className="p-4 border rounded-lg bg-card space-y-4 text-xs">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Clôture & Verrouillage du CRJ (1 CR / Site / Jour)
          </h3>
          <p className="text-[11px] text-muted-foreground">Validation finale des données de la journée. Le verrouillage rend le rapport opposable.</p>
        </div>
        <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${locked ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success'}`}>
          {locked ? 'VERROUILLÉ (OPPOSABLE)' : 'EN COURS DE SAISIE'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-3 bg-muted/40 rounded border">
          <p className="text-muted-foreground text-[10px]">Agents Contractuels</p>
          <p className="font-bold text-sm text-primary">Conformes</p>
        </div>
        <div className="p-3 bg-muted/40 rounded border">
          <p className="text-muted-foreground text-[10px]">Flux & Registres</p>
          <p className="font-bold text-sm text-primary">Consignés</p>
        </div>
        <div className="p-3 bg-muted/40 rounded border">
          <p className="text-muted-foreground text-[10px]">Horodatage Renseigné</p>
          <p className="font-bold text-sm text-primary">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {!locked ? (
        <Button onClick={handleLockCRJ} className="w-full h-10 bg-primary text-primary-foreground font-semibold">
          <Lock className="mr-2 h-4 w-4" /> Transmettre et Verrouiller le CRJ du Jour
        </Button>
      ) : (
        <div className="p-3 bg-success/10 border border-success/30 rounded text-center text-success font-medium flex items-center justify-center gap-2">
          <FileCheck className="h-4 w-4" /> Compte Rendu transmis à la hiérarchie et archivé pour audit.
        </div>
      )}
    </div>
  );
}