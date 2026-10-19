import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demo } from "@/lib/demo-store"; // <--- Import du store de démo
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const fields = [
  ["full_name", "Nom et prénom *"], 
  ["company", "Société"], 
  ["id_document", "Pièce d’identité · 4 derniers caractères"],
  ["document_type", "Type de pièce"], 
  ["zone", "Zone autorisée"], 
  ["host", "Personne visitée *"], 
  ["reason", "Motif *"], 
  ["badge", "N° badge"], 
  ["vehicle", "Immatriculation"],
  ["equipment", "Matériel apporté (PC, outillage...)"],
] as const;

export default function FormPieton() {
  const [f, setF] = useState<Record<string, string>>({
    full_name: "", company: "", id_document: "", host: "", 
    reason: "", badge: "", vehicle: "", zone: "", document_type: "", equipment: ""
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Enregistrement direct dans le store local (sans backend)
    demo.add("visitors", {
      full_name: f.full_name,
      company: f.company,
      id_document: f.id_document,
      host: f.host,
      reason: f.reason,
      badge: f.badge || "V-000",
      vehicle: f.vehicle,
      zone: f.zone || "Accueil",
      equipment: f.equipment,
      entered_at: new Date().toISOString(),
      exited_at: null,
    });

    // Ajout d'une trace dans la main courante
    demo.add("logbook_entries", {
      category: "Visiteur",
      severity: "normal",
      description: `Entrée de ${f.full_name} (${f.company || 'Visiteur libre'}) · ${f.reason}`
    });

    toast.success("Visiteur enregistré avec succès");
    
    // Réinitialisation du formulaire
    setF({ full_name: "", company: "", id_document: "", host: "", reason: "", badge: "", vehicle: "", zone: "", document_type: "", equipment: "" });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel title="Enregistrer une entrée">
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(([k, l]) => (
            <div key={k}>
              <Label htmlFor={k}>{l}</Label>
              <Input 
                id={k} 
                maxLength={k === "id_document" ? 4 : undefined} 
                required={["full_name", "host", "reason"].includes(k)} 
                value={f[k] || ""} 
                onChange={(e) => setF({ ...f, [k]: e.target.value })} 
              />
            </div>
          ))}
          <Button type="submit" className="w-full">Valider l'entrée</Button>
        </form>
      </Panel>
    </div>
  );
}