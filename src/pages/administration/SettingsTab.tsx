import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function SettingsTab() {
  const settingsFields = [
    ['Destinataires CR', 'Superviseur, Administrateur'],
    ['Heure de fermeture', '18:00'],
    ['Horaires de vacation ', '8'],
    ['Durée maximale véhicule (heures)', '12'],
    ['Tolérance ronde (minutes)', '15'],
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Paramètres enregistrés dans la maquette');
  };

  return (
    <Panel title="Paramètres du poste">
      <form className="grid max-w-lg gap-4" onSubmit={handleSubmit}>
        {settingsFields.map(([label, value]) => (
          <label className="text-sm" key={label}>
            {label}
            <Input defaultValue={value} className="mt-1" />
          </label>
        ))}
        <Button>Enregistrer</Button>
      </form>
    </Panel>
  );
}