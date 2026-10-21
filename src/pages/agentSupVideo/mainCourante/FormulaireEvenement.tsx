import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { serviceApi } from "@/lib/service-api";
const CATS = ["Information", "Incident", "Intervention", "Alarme", "Livraison", "Appel", "Anomalie technique", "Visiteur", "Prise de poste", "Passation", "Ronde", "Fin de service"];
const currentTime = () => new Date().toTimeString().slice(0, 5);

interface FormProps {
  siteId: string;
  onRefresh?: () => void;
}

export default function FormulaireEvenement({ siteId, onRefresh }: FormProps) {
  const [cat, setCat] = useState("Information");
  const [sev, setSev] = useState("normal");
  const [desc, setDesc] = useState("");
  const [mesuresPrises, setMesuresPrises] = useState("");
  const [zone, setZone] = useState("");
  const [people, setPeople] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await serviceApi.createMainCourante({
          typeEntree: "STANDARD",
          siteId,
          category: cat,
          severity: sev,
          zone,
          people,
          description: desc,
          mesuresPrises,
          heure: currentTime()
      });

      toast.success("Événement consigné dans la main courante !");
      setDesc("");
      setMesuresPrises("");
      setZone("");
      setPeople("");
      if (onRefresh) onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'enregistrement.");
    }
  };

  return (
    <Panel title="Consigner un événement">
      <form onSubmit={add} className="space-y-3 text-xs">
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
          <Label>Description / Faits constatés</Label>
          <Textarea required rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Faits constatés..." />
        </div>
        <div>
          <Label>Mesures prises / Actions conservatoires</Label>
          <Input value={mesuresPrises} onChange={(e) => setMesuresPrises(e.target.value)} placeholder="ex. Ronde effectuée, zone isolée..." />
        </div>
        <Button className="w-full" disabled={!siteId}>Enregistrer</Button>
      </form>
    </Panel>
  );
}
