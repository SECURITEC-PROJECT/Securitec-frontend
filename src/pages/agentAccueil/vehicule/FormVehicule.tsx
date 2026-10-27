import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VehicleMovement } from "@/lib/service-api";
import { serviceApi } from "@/lib/service-api";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const currentTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

interface MovementForm {
  date: string;
  plate: string;
  ownerName: string;
  category: "Particulier" | "Star";
  passengersEntry: string;
  entryTime: string;
  passengersOut: string;
  exitDate: string;
  exitTime: string;
}

const newMovement = (): MovementForm => ({
  date: today(),
  plate: "",
  ownerName: "",
  category: "Particulier",
  passengersEntry: "1",
  entryTime: currentTime(),
  passengersOut: "",
  exitDate: today(),
  exitTime: "",
});

const movementForm = (vehicle: VehicleMovement | null): MovementForm => vehicle ? ({
  date: vehicle.entryDate,
  plate: vehicle.plate,
  ownerName: vehicle.ownerName,
  category: vehicle.category === "Star" ? "Star" : "Particulier",
  passengersEntry: String(vehicle.passengersEntry ?? ""),
  entryTime: vehicle.entryTime,
  passengersOut: vehicle.passengersOut == null ? "" : String(vehicle.passengersOut),
  exitDate: vehicle.exitDate || vehicle.entryDate,
  exitTime: vehicle.exitTime || "",
}) : newMovement();

interface FormVehiculeProps {
  siteId: string;
  onSaved: (vehicle: VehicleMovement) => void;
  editingVehicle: VehicleMovement | null;
  onCancelEdit: () => void;
}

export default function FormVehicule({ siteId, onSaved, editingVehicle, onCancelEdit }: FormVehiculeProps) {
  const [form, setForm] = useState<MovementForm>(() => movementForm(editingVehicle));
  const [clock, setClock] = useState(currentTime);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(currentTime()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!siteId) {
      toast.error("Sélectionnez un site de travail.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date,
        plate: form.plate.trim().toUpperCase(),
        ownerName: form.ownerName.trim(),
        category: form.category,
        passengersEntry: Number(form.passengersEntry),
        entryTime: editingVehicle ? form.entryTime : currentTime(),
        passengersOut: form.passengersOut === "" ? null : Number(form.passengersOut),
        exitTime: form.exitTime || null,
        exitDate: form.exitDate,
        siteId,
      };
      const vehicle = editingVehicle
        ? await serviceApi.updateVehicle(editingVehicle.id, payload)
        : await serviceApi.createVehicle(payload);
      onSaved(vehicle);
      setForm(newMovement());
      toast.success(editingVehicle ? "Mouvement véhicule modifié." : "Entrée du véhicule enregistrée.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const field = (id: string, label: string, value: string, onChange: (value: string) => void, options: {
    type?: string;
    min?: string;
    max?: string;
    step?: string;
    required?: boolean;
    readOnly?: boolean;
    placeholder?: string;
    maxLength?: number;
  } = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={options.type || "text"}
        min={options.min}
        max={options.max}
        step={options.step}
        required={options.required}
        readOnly={options.readOnly}
        placeholder={options.placeholder}
        maxLength={options.maxLength}
        inputMode={options.type === "number" ? "numeric" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );

  return (
    <Panel title={editingVehicle ? "Modifier un mouvement véhicule" : "Enregistrer une entrée véhicule"}>
      <form className="space-y-5" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {field("vehicle-date", "Date", form.date, (date) => setForm({ ...form, date }), { type: "date", required: true })}
          {field("vehicle-plate", "Matricule du véhicule", form.plate, (plate) => setForm({ ...form, plate }), { required: true, maxLength: 50 })}
          {field("vehicle-owner", "Propriétaire (prénom)", form.ownerName, (ownerName) => setForm({ ...form, ownerName }), { required: true, maxLength: 255 })}
          <div className="space-y-1.5">
            <Label htmlFor="vehicle-category">Particulier ou Star</Label>
            <select
              id="vehicle-category"
              required
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value as MovementForm["category"] })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Particulier">Particulier</option>
              <option value="Star">Star</option>
            </select>
          </div>
          {field("vehicle-passengers-in", "Nombre de personnes (entrée)", form.passengersEntry, (passengersEntry) => setForm({ ...form, passengersEntry }), { type: "number", min: "0", max: "10000", step: "1", required: true })}
          {field("vehicle-time-in", "Heure d’entrée", editingVehicle ? form.entryTime : clock, (entryTime) => setForm({ ...form, entryTime }), { type: "time", required: true, readOnly: !editingVehicle })}
          {editingVehicle && field("vehicle-passengers-out", "Nombre de personnes (sortie)", form.passengersOut, (passengersOut) => setForm({ ...form, passengersOut }), { type: "number", min: "0", max: "10000", step: "1", required: Boolean(form.exitTime) })}
          {editingVehicle && field("vehicle-time-out", "Heure de sortie", form.exitTime, (exitTime) => setForm({ ...form, exitTime }), { type: "time", required: Boolean(form.passengersOut) })}
        </div>
        {!siteId && <p className="text-sm text-muted-foreground">Sélectionnez un site pour enregistrer un mouvement.</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          {editingVehicle && <Button type="button" variant="outline" disabled={saving} onClick={onCancelEdit}><X /> Annuler</Button>}
          <Button type="submit" disabled={saving || !siteId}>
            {editingVehicle ? <Save /> : <Plus />}
            {saving ? "Enregistrement…" : editingVehicle ? "Enregistrer les modifications" : "Enregistrer l’entrée"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
