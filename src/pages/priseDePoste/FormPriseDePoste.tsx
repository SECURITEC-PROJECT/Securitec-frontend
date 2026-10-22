import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import SelecteursPoste from "./components/SelecteursPoste";

const API_URL = "http://localhost:5000/api";

export interface ShiftFormData {
  matricule: string;
  nom: string;
  prenom: string;
  prestataire: string;
  site_de_travail: string;
  notes: string;
}

interface FormPriseDePosteProps {
  onStart: (data: ShiftFormData) => void;
}

export default function FormPriseDePoste({ onStart }: FormPriseDePosteProps) {
  const [matricule, setMatricule] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "valid" | "invalid">("idle");

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");

  const [prestataires, setPrestataires] = useState([]);
  const [sites, setSites] = useState([]);
  const [prestataire, setPrestataire] = useState("");
  const [siteDeTravail, setSiteDeTravail] = useState("");
  const [notes, setNotes] = useState("");

  // Charger les options depuis la base de données
  useEffect(() => {
    fetch(`${API_URL}/options-prise-de-poste`)
      .then((res) => res.json())
      .then((data) => {
        if (data.prestataires?.length) {
          setPrestataires(data.prestataires);
          setPrestataire(data.prestataires[0].prestataire);
        }
        if (data.sites?.length) {
          setSites(data.sites);
          setSiteDeTravail(data.sites[0].site);
        }
      })
      .catch((err) => console.error("Erreur chargement options:", err));
  }, []);

  // Vérification automatique du matricule
  useEffect(() => {
    const trimmed = matricule.trim();

    if (!trimmed) {
      setStatus("idle");
      setNom("");
      setPrenom("");
      return;
    }

    setStatus("verifying");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/employes/${trimmed}`);
        if (res.ok) {
          const employee = await res.json();
          setNom(employee.nom);
          setPrenom(employee.prenom);
          setStatus("valid");
        } else {
          setNom("");
          setPrenom("");
          setStatus("invalid");
        }
      } catch (error) {
        setStatus("invalid");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [matricule]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "valid") return;

    onStart({
      matricule: matricule.trim(),
      nom: nom.trim(),
      prenom: prenom.trim(),
      prestataire,
      site_de_travail: siteDeTravail,
      notes: notes.trim(),
    });

    setMatricule("");
    setNom("");
    setPrenom("");
    setStatus("idle");
    setNotes("");
  };

  const getInputStyles = () => {
    if (status === "valid") return "border-emerald-500 focus-visible:ring-emerald-500 bg-emerald-50/20";
    if (status === "invalid") return "border-red-500 focus-visible:ring-red-500 bg-red-50/20";
    return "";
  };

  return (
    <Panel title="Nouvelle prise de poste">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="matricule">Matricule de l'employé *</Label>
          <div className="relative mt-1">
            <Input
              id="matricule"
              required
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              placeholder="Ex: EMP001"
              className={`transition-colors ${getInputStyles()}`}
            />
          </div>

          {status === "verifying" && (
            <p className="text-xs text-muted-foreground mt-1">Vérification en cours...</p>
          )}
          {status === "invalid" && (
            <p className="text-xs text-red-500 font-medium mt-1">
              ✕ Ce matricule n'existe pas dans la base de données.
            </p>
          )}
          {status === "valid" && (
            <p className="text-xs text-emerald-600 font-medium mt-1">
              ✓ Employé identifié : {nom} {prenom}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" readOnly value={nom} className="mt-1 bg-muted" placeholder="Nom" />
          </div>
          <div>
            <Label htmlFor="prenom">Prénom</Label>
            <Input id="prenom" readOnly value={prenom} className="mt-1 bg-muted" placeholder="Prénom" />
          </div>
        </div>

        <SelecteursPoste
          prestataires={prestataires}
          sites={sites}
          prestataire={prestataire}
          setPrestataire={setPrestataire}
          siteDeTravail={siteDeTravail}
          setSiteDeTravail={setSiteDeTravail}
        />

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

        <Button type="submit" className="w-full" disabled={status !== "valid"}>
          Valider la prise de poste
        </Button>
      </form>
    </Panel>
  );
}