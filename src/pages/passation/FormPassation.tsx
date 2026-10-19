import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, type FormEvent } from "react";
import SignaturePad from "./SignaturePad";

interface FormPassationProps {
  onSubmit: (f: { incoming_agent: string; equipment: string; ongoing_events: string; instructions: string }) => void;
}

export default function FormPassation({ onSubmit }: FormPassationProps) {
  const [f, setF] = useState({ incoming_agent: "", equipment: "", ongoing_events: "", instructions: "" });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(f);
    setF({ incoming_agent: "", equipment: "", ongoing_events: "", instructions: "" });
  };

  return (
    <Panel title="Nouvelle passation">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label>Agent montant</Label>
          <Input required value={f.incoming_agent} onChange={(e) => setF({ ...f, incoming_agent: e.target.value })} placeholder="ex. Mickaël Rakoto" />
        </div>
        <div>
          <Label>Matériel et clés remis</Label>
          <Textarea value={f.equipment} onChange={(e) => setF({ ...f, equipment: e.target.value })} placeholder="Radio n°2, trousseau A, badge maître…" />
        </div>
        <div>
          <Label>Événements en cours</Label>
          <Textarea value={f.ongoing_events} onChange={(e) => setF({ ...f, ongoing_events: e.target.value })} placeholder="Livraison attendue à 14h, porte B défectueuse…" />
        </div>
        <div>
          <Label>Consignes particulières</Label>
          <Textarea value={f.instructions} onChange={(e) => setF({ ...f, instructions: e.target.value })} placeholder="Consignes de vigilance..." />
        </div>
        
        <SignaturePad label="Signature de l’agent sortant" />
        <SignaturePad label="Signature de l’agent entrant" />
        
        <Button type="submit" className="w-full">Enregistrer la passation</Button>
      </form>
    </Panel>
  );
}