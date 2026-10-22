import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { demo } from "@/lib/demo-store";
import { WandSparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const TYPES = ["Fin de service", "Rapport d'incident", "Rapport d'intervention", "Rapport journalier", "Autre"];
const TEMPLATES: Record<string, string> = {
  "Fin de service": "Déroulement du service :\n\nVisiteurs reçus :\n\nRondes effectuées :\n\nIncidents :\n\nPoints à suivre :",
  "Rapport d'incident": "Date / heure :\nLieu :\nNature de l'incident :\nPersonnes impliquées :\nDescription des faits :\nMesures prises :\nServices prévenus :",
  "Rapport d'intervention": "Motif de l'intervention :\nHeure d'arrivée :\nActions réalisées :\nRésultat :",
  "Rapport journalier": "Synthèse de la journée :\n\nÉvénements notables :\n\nRecommandations :",
  Autre: "",
};

export default function FormCompteRendu() {
  const [type, setType] = useState("Fin de service");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState(TEMPLATES["Fin de service"] ?? "");
  const [signed, setSigned] = useState(false);

  const save = (e: FormEvent) => {
    e.preventDefault();
    demo.add("logbook_entries", { category: "Fin de service", description: `Compte rendu enregistré : ${title}` });
    demo.add("reports", { report_type: type, title, content });
    toast.success("Compte rendu enregistré");
    setTitle(""); 
    setContent(TEMPLATES[type] ?? "");
    setSigned(false);
  };

  const generateSynthesis = () => {
    setTitle("Vacation de jour · 08 octobre 2026"); 
    setContent(`SECURITEC — Compte rendu de vacation\nPassages visiteurs : ${demo.list("visitors").length}\nVéhicules : ${demo.list("vehicles").length}\nRondes : ${demo.list("patrols").length}\n\nMain courante :\n${demo.list("logbook_entries").map((l) => l.category + " — " + l.description).join("\n")}\n\nObservations :`);
  };

  return (
    <Panel title="Rédiger un compte rendu">
      <form onSubmit={save} className="space-y-3">
        <Button 
          type="button" 
          variant="outline" 
          className="w-full" 
          onClick={generateSynthesis}
        >
          <WandSparkles /> Générer la synthèse
        </Button>
        
        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => { setType(v); setContent(TEMPLATES[v] ?? ""); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        
        <div>
          <Label>Titre</Label>
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du rapport..." />
        </div>
        
        <div>
          <Label>Contenu</Label>
          <Textarea required rows={12} value={content} onChange={(e) => setContent(e.target.value)} className="font-mono text-sm" />
        </div>

        <div className="space-y-1">
          <Label>Signature de l’agent · Démonstration</Label>
          <div 
            onClick={() => setSigned(!signed)} 
            className={`h-16 w-full rounded-md border border-input bg-background flex items-center justify-center text-xs cursor-pointer border-dashed border-2 ${signed ? 'border-success text-success bg-success/5 font-semibold' : 'text-muted-foreground'}`}
          >
            {signed ? "✓ Document signé numériquement" : "Cliquer pour signer le document"}
          </div>
        </div>

        <Button className="w-full">{signed ? "Signer et enregistrer" : "Enregistrer le brouillon"}</Button>
      </form>
    </Panel>
  );
}