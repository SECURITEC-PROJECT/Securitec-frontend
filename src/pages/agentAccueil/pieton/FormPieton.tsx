import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { serviceApi } from "@/lib/service-api";
import SitePicker from "@/components/SitePicker";
import type { SiteOption } from "@/hooks/useSites";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const fields = [
  ["full_name", "Nom et prénom *"], 
  ["company", "Société"], 
  ["id_document", "Pièce d’identité · 4 derniers caractères"],
  ["document_type", "Type de pièce"], 
  ["zone", "Zone autorisée"], 
  ["host", "Personne visitée *"], 
  ["reason", "Motif *"], 
  ["badge", "N° badge"], 
  ["vehicle", "Immatriculation"],
  ["equipment", "Matériel apporté (PC, outillage...)"],
] as const;

interface FormPietonProps {
  onCreated: (visitor: any) => void;
  sites: SiteOption[];
  canCreateSite: boolean;
  onAddSite: (name: string, type: SiteOption["type"]) => Promise<SiteOption>;
}

export default function FormPieton({ onCreated, sites, canCreateSite, onAddSite }: FormPietonProps) {
  const [f, setF] = useState<Record<string, string>>({
    full_name: "", company: "", id_document: "", host: "", site_name: "", site_type: "USINE",
    reason: "", badge: "", vehicle: "", zone: "", document_type: "", equipment: ""
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const badge = f.badge.trim();
    setSaving(true);
    try {
      const visitor = await serviceApi.createVisitor({ ...f, badge, siteName: f.site_name, siteType: f.site_type });
      onCreated(visitor);
      toast.success("Entrée visiteur enregistrée dans la base de données");
      setF({ full_name: "", company: "", id_document: "", host: "", site_name: "", site_type: "USINE", reason: "", badge: "", vehicle: "", zone: "", document_type: "", equipment: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally { setSaving(false); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Panel title="Enregistrer une entrée">
        <form onSubmit={handleSubmit} className="space-y-3">
          <SitePicker id="visitor-site" value={f.site_name} type={f.site_type as SiteOption["type"]} sites={sites} canCreate={canCreateSite} onAdd={onAddSite} onChange={(siteName, siteType) => setF((previous) => ({ ...previous, site_name: siteName, site_type: siteType }))} />
          <div><Label htmlFor="visitor-site-type">Type de site</Label><select id="visitor-site-type" value={f.site_type} onChange={(e) => setF({ ...f, site_type: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="USINE">Usine</option><option value="AGENCE">Agence</option></select></div>
          {fields.map(([k, l]) => (
            <div key={k}>
              <Label htmlFor={k}>{l}</Label>
              <Input 
                id={k} 
                maxLength={k === "id_document" ? 4 : undefined} 
                required={["full_name", "host", "reason"].includes(k)} 
                value={f[k] || ""} 
                onChange={(e) => setF({ ...f, [k]: e.target.value })} 
              />
            </div>
          ))}
          <Button type="submit" disabled={saving} className="w-full">{saving ? "Enregistrement…" : "Valider l'entrée"}</Button>
        </form>
      </Panel>
    </div>
  );
}
