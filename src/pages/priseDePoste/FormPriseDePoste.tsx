import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

const CHECKS = [
  "Tenue réglementaire",
  "Radio / talkie-walkie testé",
  "Clés du site récupérées",
  "Lampe torche",
  "Téléphone de service chargé",
  "Registre consulté",
  "Vidéosurveillance opérationnelle",
  "Système d'alarme vérifié",
];

// 💡 EXPORT OBLIGATOIRE DE L'INTERFACE
export interface ShiftFormData {
  nom: string;
  prenom: string;
  prestataire: string;
  site_de_travail: string;
  checks: Record<string, boolean>;
  notes: string;
}

interface FormPriseDePosteProps {
  onStart: (data: ShiftFormData) => void;
  initialNom?: string;
  initialPrenom?: string;
}

export default function FormPriseDePoste({
  onStart,
  initialNom = "",
  initialPrenom = "",
}: FormPriseDePosteProps) {
  const [nom, setNom] = useState(initialNom);
  const [prenom, setPrenom] = useState(initialPrenom);
  const [prestataire, setPrestataire] = useState("securitec");
  const [siteDeTravail, setSiteDeTravail] = useState("Usine Antsirabe");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initialNom) setNom(initialNom);
    if (initialPrenom) setPrenom(initialPrenom);
  }, [initialNom, initialPrenom]);

  const handleCheck = (name: string, checked: boolean) => {
    setChecks((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom.trim() || !prenom.trim()) {
      return;
    }

    onStart({
      nom: nom.trim(),
      prenom: prenom.trim(),
      prestataire,
      site_de_travail: siteDeTravail,
      checks,
      notes: notes.trim(),
    });

    setNom("");
    setPrenom("");
    setPrestataire("securitec");
    setSiteDeTravail("Usine Antsirabe");
    setChecks({});
    setNotes("");
  };

  return (
    <Panel title="Nouvelle prise de poste">
      <form onSubmit={handleStart} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              required
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="mt-1"
              placeholder="Nom de famille"
            />
          </div>
          <div>
            <Label htmlFor="prenom">Prénom *</Label>
            <Input
              id="prenom"
              required
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="mt-1"
              placeholder="Prénom"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="prestataire">Prestataire</Label>
            <select
              id="prestataire"
              value={prestataire}
              onChange={(e) => setPrestataire(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="securitec">securitec</option>
              <option value="GPS">GPS</option>
              <option value="option3">option3</option>
            </select>
          </div>

          <div>
            <Label htmlFor="site_de_travail">Site de travail</Label>
            <select
              id="site_de_travail"
              value={siteDeTravail}
              onChange={(e) => setSiteDeTravail(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="Usine Antsirabe">Usine Antsirabe</option>
              <option value="Malto">Malto</option>
              <option value="Ambatolampy">Ambatolampy</option>
            </select>
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Vérification des équipements</Label>
          <div className="space-y-2">
            {CHECKS.map((check) => (
              <label
                key={check}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-2.5 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  checked={!!checks[check]}
                  onCheckedChange={(value) =>
                    handleCheck(check, value === true)
                  }
                />
                <span>{check}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="shift-notes">Observations</Label>
          <Textarea
            id="shift-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Matériel manquant, anomalie constatée…"
            className="mt-1"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={!nom.trim() || !prenom.trim()}
        >
          Valider la prise de poste
        </Button>
      </form>
    </Panel>
  );
}