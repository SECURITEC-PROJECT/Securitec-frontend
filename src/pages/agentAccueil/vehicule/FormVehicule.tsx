
import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { serviceApi } from "@/lib/service-api";
import SitePicker from "@/components/SitePicker";
import type { SiteOption } from "@/hooks/useSites";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

interface VehicleFormValues {
  siteName: string;
  siteType: "USINE" | "AGENCE";
  plate: string;
  type: string;
  company: string;
  operation: string;
  seal_number: string;
  document_reference: string;
  load_state: string;
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
  siteName: "",
  siteType: "USINE",
  plate: "",
  type: "",
  company: "",
  operation: "Déchargement",
  seal_number: "",
  document_reference: "",
  load_state: "Pleins",
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

interface FormVehiculeProps {
  onCreated: (vehicle: any) => void;
  sites: SiteOption[];
  canCreateSite: boolean;
  onAddSite: (name: string, type: SiteOption["type"]) => Promise<SiteOption>;
}

function FormVehicule({ onCreated, sites, canCreateSite, onAddSite }: FormVehiculeProps) {
  const [form, setForm] = useState<VehicleFormValues>(empty);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const plate = form.plate.trim().toUpperCase();
    setSaving(true);
    try {
      const vehicle = await serviceApi.createVehicle({ ...form, plate, type: form.type.trim(), company: form.company.trim(), driver: form.driver.trim(), seal_number: form.seal_number.trim(), document_reference: form.document_reference.trim() });
      onCreated(vehicle);
      toast.success("Entrée du véhicule enregistrée dans la base de données");
      setForm({ ...empty });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-7 xl:grid-cols-[340px_1fr]">
      <Panel title="Enregistrer une entrée">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <SitePicker id="vehicle-site" value={form.siteName} type={form.siteType} sites={sites} canCreate={canCreateSite} onAdd={onAddSite} onChange={(siteName, siteType) => setForm((previous) => ({ ...previous, siteName, siteType }))} />
          <div><Label htmlFor="vehicle-site-type">Type de site</Label><select id="vehicle-site-type" value={form.siteType} onChange={(e) => setForm({ ...form, siteType: e.target.value as "USINE" | "AGENCE" })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="USINE">Usine</option><option value="AGENCE">Agence</option></select></div>
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

          <div>
            <Label htmlFor="vehicle-operation">Opération</Label>
            <select id="vehicle-operation" value={form.operation} onChange={(e) => setForm({ ...form, operation: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Déchargement</option><option>Chargement</option><option>Autre passage</option>
            </select>
          </div>
          <div>
            <Label htmlFor="seal-number">N° plomb</Label>
            <Input id="seal-number" value={form.seal_number} onChange={(e) => setForm({ ...form, seal_number: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="transport-document">N° titre / facture / bon</Label>
            <Input id="transport-document" value={form.document_reference} onChange={(e) => setForm({ ...form, document_reference: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="load-state">État du chargement</Label>
            <select id="load-state" value={form.load_state} onChange={(e) => setForm({ ...form, load_state: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option>Pleins</option><option>Vides</option><option>Sans objet</option>
            </select>
          </div>

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

          <Button type="submit" disabled={saving} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement…" : "Enregistrer l'entrée"}
          </Button>
        </form>
      </Panel>
    </div>
  );
}

export default FormVehicule;
