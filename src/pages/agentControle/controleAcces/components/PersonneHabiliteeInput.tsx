import { Label } from "@/components/ui/label";

interface EmployeHabilite {
  id: string;
  nom: string;
  prenom: string;
  role: string;
}

interface PersonneHabiliteeInputProps {
  action: string;
  value: string;
  onChange: (val: string, role?: string) => void;
  personnesHabilitees: EmployeHabilite[];
  isHabilite: boolean;
}

export default function PersonneHabiliteeInput({
  action,
  value,
  onChange,
  personnesHabilitees,
  isHabilite,
}: PersonneHabiliteeInputProps) {
  const isPerception = action === "Perception";
  const showError = !isHabilite && isPerception && value.trim() !== "";

  // En Réintégration : Saisie libre
  if (!isPerception) {
    return (
      <div className="space-y-1.5">
        <Label className="block h-8 flex items-center">
          Personne (Nom / Prénom)
        </Label>
        <input
          type="text"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Saisir le nom de la personne..."
          className="w-full h-9 rounded-md border border-input px-3 text-xs bg-background"
        />
      </div>
    );
  }

  // En Perception : Liste déroulante dynamique des personnes habilitées
  return (
    <div className="space-y-1.5">
      <Label className="block h-8 flex items-center">
        Personne Habilitée (Nom / Prénom)
      </Label>

      <select
        required
        value={value}
        onChange={(e) => {
          const selectedName = e.target.value;
          const selectedPerson = personnesHabilitees.find(
            (p) => `${p.nom} ${p.prenom}` === selectedName
          );
          onChange(selectedName, selectedPerson ? selectedPerson.role : "");
        }}
        className={`w-full h-9 rounded-md border px-3 text-xs bg-background transition-colors ${
          showError
            ? "border-red-500 bg-red-50/20 text-red-900"
            : "border-input"
        }`}
      >
        <option value="">-- Sélectionner une personne habilitée --</option>
        {personnesHabilitees.map((p) => {
          const fullName = `${p.nom} ${p.prenom}`;
          return (
            <option key={p.id} value={fullName}>
              {fullName} — {p.role}
            </option>
          );
        })}
      </select>

      {personnesHabilitees.length === 0 && (
        <p className="text-[10px] text-amber-600 font-medium mt-1">
          ⚠️ Aucune personne habilitée trouvée pour cette clé.
        </p>
      )}

      {showError && (
        <p className="text-[10px] text-red-500 font-medium mt-1">
          ✕ Cette personne n'a pas le droit de prendre cette clé.
        </p>
      )}
    </div>
  );
}
