import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MatriculeInputProps {
  matricule: string;
  setMatricule: (val: string) => void;
  onVerify: () => void;
  isVerifying: boolean;
  isEmployeeFound: boolean;
}

export default function MatriculeInput({
  matricule,
  setMatricule,
  onVerify,
  isVerifying,
  isEmployeeFound,
}: MatriculeInputProps) {
  return (
    <div>
      <Label htmlFor="matricule">Matricule de l'employé *</Label>
      <div className="flex gap-2 mt-1">
        <Input
          id="matricule"
          required
          value={matricule}
          onChange={(e) => setMatricule(e.target.value)}
          placeholder="Ex: EMP001"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={onVerify}
          disabled={isVerifying || !matricule.trim()}
        >
          {isVerifying ? "Vérification..." : "Vérifier"}
        </Button>
      </div>
      {isEmployeeFound && (
        <p className="text-xs text-emerald-600 mt-1 font-medium">✓ Employé validé avec succès</p>
      )}
    </div>
  );
}