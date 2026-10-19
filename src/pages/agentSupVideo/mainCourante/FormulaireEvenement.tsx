import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { demo } from "@/lib/demo-store";
import { useState } from "react";
import { toast } from "sonner";

const CATS = ["Information", "Incident", "Intervention", "Alarme", "Livraison", "Appel", "Anomalie technique", "Visiteur", "Prise de poste", "Passation", "Ronde", "Fin de service"];

export default function FormulaireEvenement() {
  const [cat, setCat] = useState("Information");
  const [sev, setSev] = useState("normal");
  const [desc, setDesc] = useState("");
  const [zone, setZone] = useState("");
  const [people, setPeople] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    demo.add("logbook_entries", { 
      category: cat, 
      severity: sev, 
      description: `${zone ? zone + " · " : ""}${desc}${people ? " — Personnes : " + people : ""}` 
    });
    setDesc("");
    setZone("");
    setPeople("");
    toast.success("Événement consigné");
  };

  return (
    <Panel title="Consigner un événement">
      <form onSubmit={add} className="space-y-3">
        <div>
          <Label>Catégorie</Label>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label>Gravité</Label>
          <Select value={sev} onValueChange={setSev}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">1 · Information</SelectItem>
              <SelectItem value="important">2 · Anomalie</SelectItem>
              <SelectItem value="grave">3 · Grave</SelectItem>
              <SelectItem value="urgent">4 · Critique</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="event-zone">Lieu / zone</Label>
          <Input id="event-zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="ex. Parking, Hall..." />
        </div>
        <div>
          <Label htmlFor="event-people">Personnes concernées</Label>
          <Input id="event-people" value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Noms ou société..." />
        </div>
        <div>
          <Label htmlFor="event-photo">Pièce jointe</Label>
          <Input id="event-photo" type="file" accept="image/*" />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea required rows={5} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Faits constatés, lieu, personnes, mesures prises…" />
        </div>
        <Button className="w-full">Enregistrer</Button>
      </form>
    </Panel>
  );
}