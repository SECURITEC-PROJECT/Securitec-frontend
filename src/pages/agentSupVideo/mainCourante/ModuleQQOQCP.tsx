import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileQuestion } from "lucide-react";
import { useState } from 'react';
import { toast } from "sonner";
import { serviceApi } from "@/lib/service-api";

interface ModuleQQOQCPProps {
  siteId: string;
  onRefresh?: () => void;
}

export default function ModuleQQOQCP({ siteId, onRefresh }: ModuleQQOQCPProps) {
  const [form, setForm] = useState({
    qui: '',
    quoi: '',
    ou: '',
    quand: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    comment: '',
    pourquoi: '',
    mesuresPrises: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formattedDescription = `QUI: ${form.qui} | QUOI: ${form.quoi} | OÙ: ${form.ou} | COMMENT: ${form.comment} | POURQUOI: ${form.pourquoi}`;

    try {
      await serviceApi.createMainCourante({
          typeEntree: "DIVERS",
          siteId,
          category: "Incident",
          severity: "important",
          zone: form.ou,
          people: form.qui,
          description: formattedDescription,
          mesuresPrises: form.mesuresPrises,
          heure: form.quand
      });

      toast.success("Fait notable (10 - DIVERS) consigné avec succès !");
      setForm({
        qui: '',
        quoi: '',
        ou: '',
        quand: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        comment: '',
        pourquoi: '',
        mesuresPrises: ''
      });
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la consignation du fait notable.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-card space-y-4 text-xs">
      <div className="bg-muted/50 p-3 rounded-md mb-2">
        <p className="font-semibold text-primary">10 - DIVERS : Saisie Fait Notable (QQOQCP)</p>
        <p className="text-[11px] text-muted-foreground">Saisie factuelle conforme aux colonnes : FAITS & MESURES PRISES du CRJ.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">QUI ? (Personnes impliquées)</Label>
          <Input required value={form.qui} onChange={e => setForm({ ...form, qui: e.target.value })} placeholder="Acteurs du fait / Témoins" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">QUAND ? (Heure HH:MM)</Label>
          <Input required type="time" value={form.quand} onChange={e => setForm({ ...form, quand: e.target.value })} className="h-9 font-mono" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">QUOI ? (Événement constaté)</Label>
          <Input required value={form.quoi} onChange={e => setForm({ ...form, quoi: e.target.value })} placeholder="Nature de l'événement" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">OÙ ? (Localisation exacte)</Label>
          <Input required value={form.ou} onChange={e => setForm({ ...form, ou: e.target.value })} placeholder="ex. Magasin P3, Zone Clôture" className="h-9" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">COMMENT ? (Déroulement)</Label>
          <Input required value={form.comment} onChange={e => setForm({ ...form, comment: e.target.value })} placeholder="Circonstances" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="block h-8 flex items-center">POURQUOI ? (Causes)</Label>
          <Input required value={form.pourquoi} onChange={e => setForm({ ...form, pourquoi: e.target.value })} placeholder="Origine ou motif probable" className="h-9" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="block font-bold text-primary">MESURES PRISES (Colonne CRJ)</Label>
        <Input required value={form.mesuresPrises} onChange={e => setForm({ ...form, mesuresPrises: e.target.value })} placeholder="Action corrective / décision prise..." className="h-9 border-primary/40" />
      </div>

      <Button className="w-full h-10 mt-2" disabled={!siteId}>
        <FileQuestion className="mr-2 h-4 w-4" /> Consigner l'Événement (Section 10 DIVERS)
      </Button>
    </form>
  );
}
