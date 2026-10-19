
import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { demo } from "@/lib/demo-store";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

interface VehicleFormValues {
  plate: string;
  type: string;
  company: string;
  driver: string;
  passengers: string;
  reason: string;
  zone: string;
  compliant: boolean;
}

type VehicleField =
  | "plate"
  | "type"
  | "company"
  | "driver"
  | "passengers"
  | "reason"
  | "zone";

const empty: VehicleFormValues = {
  plate: "",
  type: "",
  company: "",
  driver: "",
  passengers: "0",
  reason: "",
  zone: "Quai de livraison",
  compliant: false,
};

const fields: [VehicleField, string][] = [
  ["plate", "Immatriculation"],
  ["type", "Type de véhicule"],
  ["company", "Société"],
  ["driver", "Conducteur"],
  ["passengers", "Passagers"],
  ["reason", "Motif"],
  ["zone", "Zone de stationnement"],
];

function FormVehicule() {
  const [form, setForm] = useState<VehicleFormValues>(empty);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    demo.add("vehicles", {
      plate: form.plate,
      company: form.company,
      driver: form.driver,
      passengers: form.passengers,
      reason: form.reason,
      zone: form.zone,
      compliant: form.compliant,
      entered_at: new Date().toISOString(),
      exited_at: null,
    });

    demo.add("logbook_entries", {
      category: "Livraison",
      severity: "normal",
      description: `Entrée véhicule ${form.plate} · ${form.driver}`,
    });

    setForm({ ...empty });
  };

  return (
    <div className="grid gap-7 xl:grid-cols-[340px_1fr]">
      <Panel title="Enregistrer une entrée">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {fields.map(([key, title]) => (
            <div key={key}>
              <Label htmlFor={key}>{title}</Label>

              <Input
                id={key}
                required={["plate", "driver", "reason"].includes(key)}
                value={form[key]}
                onChange={(e) =>
                  setForm((previous) => ({
                    ...previous,
                    [key]: e.target.value,
                  }))
                }
              />
            </div>
          ))}

          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <Checkbox
              checked={form.compliant}
              onCheckedChange={(value) =>
                setForm((previous) => ({
                  ...previous,
                  compliant: value === true,
                }))
              }
            />
            Contrôle du chargement conforme
          </label>

          <div>
            <Label htmlFor="vehicle-photo">Photo du contrôle</Label>
            <Input
              id="vehicle-photo"
              type="file"
              accept="image/*"
            />
          </div>

          <Button type="submit" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Enregistrer l’entrée
          </Button>
        </form>
      </Panel>
    </div>
  );
}

export default FormVehicule;
