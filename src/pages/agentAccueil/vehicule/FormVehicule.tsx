import { Panel } from "@/components/PageHeader";
import SitePicker from "@/components/SitePicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteOption } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import { Plus } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
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

type TextField = Exclude<keyof VehicleFormValues, "siteType" | "compliant">;

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

const selectClass = "mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

// Titre de section (occupe toute la largeur de la grille)
function Section({ children }: { children: ReactNode }) {
  return (
    <p className="col-span-2 mt-2 border-b pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground first:mt-0">
      {children}
    </p>
  );
}

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

  // Champ texte simple
  const champ = (
    key: TextField,
    label: string,
    opts: { required?: boolean; placeholder?: string; span?: boolean; numeric?: boolean } = {}
  ) => (
    <div className={opts.span ? "col-span-2" : ""}>
      <Label htmlFor={key} className="text-xs">{label}</Label>
      <Input
        id={key}
        className="mt-1 h-9"
        required={opts.required}
        placeholder={opts.placeholder}
        inputMode={opts.numeric ? "numeric" : undefined}
        value={form[key]}
        onChange={(e) => {
          const value = e.target.value;
          setForm((previous) => ({ ...previous, [key]: value }));
        }}
      />
    </div>
  );

  return (
    <Panel title="Enregistrer une entrée">
      <form className="grid grid-cols-2 gap-x-3 gap-y-2.5" onSubmit={handleSubmit}>
        <Section>Site</Section>
        <div>
          <SitePicker id="vehicle-site" value={form.siteName} type={form.siteType} sites={sites} canCreate={canCreateSite} onAdd={onAddSite} onChange={(siteName, siteType) => setForm((previous) => ({ ...previous, siteName, siteType }))} />
        </div>
        <div>
          <Label htmlFor="vehicle-site-type" className="text-xs">Type de site</Label>
          <select id="vehicle-site-type" value={form.siteType} onChange={(e) => setForm({ ...form, siteType: e.target.value as "USINE" | "AGENCE" })} className={selectClass}>
            <option value="USINE">Usine</option>
            <option value="AGENCE">Agence</option>
          </select>
        </div>

        <Section>Véhicule</Section>
        {champ("plate", "Immatriculation *", { required: true })}
        {champ("type", "Type de véhicule")}
        {champ("company", "Société")}
        {champ("driver", "Conducteur *", { required: true })}
        {champ("passengers", "Passagers", { numeric: true })}
        {champ("zone", "Zone de stationnement")}

        <Section>Opération</Section>
        <div>
          <Label htmlFor="vehicle-operation" className="text-xs">Opération</Label>
          <select id="vehicle-operation" value={form.operation} onChange={(e) => setForm({ ...form, operation: e.target.value })} className={selectClass}>
            <option>Déchargement</option><option>Chargement</option><option>Autre passage</option>
          </select>
        </div>
        <div>
          <Label htmlFor="load-state" className="text-xs">État du chargement</Label>
          <select id="load-state" value={form.load_state} onChange={(e) => setForm({ ...form, load_state: e.target.value })} className={selectClass}>
            <option>Pleins</option><option>Vides</option><option>Sans objet</option>
          </select>
        </div>
        {champ("seal_number", "N° plomb")}
        {champ("document_reference", "N° titre / facture / bon")}
        {champ("reason", "Motif *", { required: true, span: true })}

        <Section>Contrôle</Section>
        <label className="col-span-2 flex cursor-pointer items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-sm">
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
        <div className="col-span-2">
          <Label htmlFor="vehicle-photo" className="text-xs">Photo du contrôle</Label>
          <Input
            id="vehicle-photo"
            type="file"
            accept="image/*"
            className="mt-1 h-9 cursor-pointer text-xs"
          />
        </div>

        <Button type="submit" disabled={saving} className="col-span-2 mt-2 h-10 w-full">
          <Plus className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement…" : "Enregistrer l'entrée"}
        </Button>
      </form>
    </Panel>
  );
}

export default FormVehicule;