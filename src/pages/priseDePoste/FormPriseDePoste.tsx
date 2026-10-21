import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { serviceApi } from "@/lib/service-api";
import { Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const CHECKS = [
  "Tenue réglementaire", "Radio / talkie-walkie testé", "Clés du site récupérées", "Lampe torche",
  "Téléphone de service chargé", "Registre consulté", "Vidéosurveillance opérationnelle", "Système d'alarme vérifié",
];

export interface ShiftFormData {
  matricule: string;
  nom: string;
  prenom: string;
  prestataire: string;
  site_de_travail: string;
  checks: Record<string, boolean>;
  notes: string;
}

type EmployeeMatch = { firstName: string; lastName: string; matricule: string; provider: string; siteId: string | null; siteName: string | null; siteActive: boolean; active: boolean };

export default function FormPriseDePoste({ onStart }: { onStart: (data: ShiftFormData) => Promise<boolean> }) {
  const [matricule, setMatricule] = useState("");
  const [employee, setEmployee] = useState<EmployeeMatch | null>(null);
  const [searching, setSearching] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  const lookupEmployee = async () => {
    const value = matricule.trim();
    if (!value) { toast.error("Saisissez un matricule."); return; }
    setSearching(true);
    setEmployee(null);
    try {
      const match = await serviceApi.findEmployeeByMatricule(value) as EmployeeMatch;
      setEmployee(match);
      toast.success("Employé trouvé. Ses informations ont été remplies.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Aucun employé trouvé pour ce matricule.");
    } finally { setSearching(false); }
  };

  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!employee || !employee.active || !employee.siteId || !employee.siteActive) { toast.error("Cet employé doit être actif et affecté à un site actif."); return; }
    const saved = await onStart({ matricule: employee.matricule, nom: employee.lastName, prenom: employee.firstName,
      prestataire: employee.provider, site_de_travail: employee.siteName ?? "", checks, notes: notes.trim() });
    if (saved) { setMatricule(""); setEmployee(null); setChecks({}); setNotes(""); }
  };

  return <Panel title="Nouvelle prise de poste">
    <form onSubmit={(event) => void handleStart(event)} className="space-y-4">
      <div>
        <Label htmlFor="employee-matricule">Matricule employé *</Label>
        <div className="mt-1 flex gap-2">
          <Input id="employee-matricule" required autoComplete="off" value={matricule} placeholder="Saisir ou scanner le matricule"
            onChange={(event) => { setMatricule(event.target.value); setEmployee(null); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void lookupEmployee(); } }} />
          <Button type="button" variant="outline" disabled={searching || !matricule.trim()} onClick={() => void lookupEmployee()}>
            <Search className="mr-2 h-4 w-4" />{searching ? "Recherche…" : "Rechercher"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Raccourci : appuyez sur Entrée après la saisie. Un lecteur de badge configuré pour envoyer Entrée déclenche aussi la recherche.</p>
      </div>

      {employee && <div className="grid grid-cols-2 gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <p><span className="text-muted-foreground">Nom :</span> {employee.lastName}</p>
        <p><span className="text-muted-foreground">Prénom :</span> {employee.firstName}</p>
        <p><span className="text-muted-foreground">Prestataire :</span> {employee.provider}</p>
        <p><span className="text-muted-foreground">Site de travail :</span> {employee.siteName || "Non affecté"}</p>
        {(!employee.active || !employee.siteId || !employee.siteActive) && <p className="col-span-2 text-destructive">{!employee.active ? "Cet employé est désactivé." : "Aucun site de travail actif n’est affecté. Mettez à jour sa fiche dans le module Employés."}</p>}
      </div>}

      <div>
        <Label className="mb-2 block">Vérification des équipements</Label>
        <div className="space-y-2">{CHECKS.map((check) => <label key={check} className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5 text-sm hover:bg-muted/50">
          <Checkbox checked={!!checks[check]} onCheckedChange={(value) => setChecks((prev) => ({ ...prev, [check]: value === true }))} />
          <span>{check}</span>
        </label>)}</div>
      </div>

      <div><Label htmlFor="shift-notes">Observations</Label><Textarea id="shift-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Matériel manquant, anomalie constatée…" className="mt-1" /></div>
      <Button type="submit" className="w-full" disabled={!employee || !employee.active || !employee.siteId || !employee.siteActive || searching}>Valider la prise de poste</Button>
    </form>
  </Panel>;
}
