import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import SignaturePad from "./SignaturePad";

export interface HandoverForm {
  siteName: string;
  siteType: "USINE" | "AGENCE";
  outgoing_agent: string;
  outgoing_matricule: string;
  incoming_agent: string;
  incoming_matricule: string;
  post_name: string;
  equipment: string;
  ongoing_events: string;
  instructions: string;
  outgoing_signed: boolean;
  incoming_signed: boolean;
}

interface FormPassationProps {
  onSubmit: (form: HandoverForm) => void | Promise<void>;
  sites: { id: string; name: string; type: "USINE" | "AGENCE" }[];
  canCreateSite: boolean;
  onAddSite: (name: string, type: "USINE" | "AGENCE") => Promise<{ id: string; name: string; type: "USINE" | "AGENCE" }>;
}

const initial: HandoverForm = { siteName: "", siteType: "USINE", outgoing_agent: "", outgoing_matricule: "", incoming_agent: "", incoming_matricule: "", post_name: "", equipment: "", ongoing_events: "", instructions: "", outgoing_signed: false, incoming_signed: false };

export default function FormPassation({ onSubmit, sites, canCreateSite, onAddSite }: FormPassationProps) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [addingSite, setAddingSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [savingSite, setSavingSite] = useState(false);
  const change = <K extends keyof HandoverForm,>(key: K, value: HandoverForm[K]) => setForm((current) => ({ ...current, [key]: value }));
  const handleAddSite = async () => {
    if (!newSiteName.trim()) return;
    setSavingSite(true);
    try {
      const site = await onAddSite(newSiteName.trim(), form.siteType);
      change("siteName", site.name);
      change("siteType", site.type);
      setNewSiteName("");
      setAddingSite(false);
      toast.success("Site ajouté à la liste");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout du site impossible");
    } finally { setSavingSite(false); }
  };
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.outgoing_signed || !form.incoming_signed) return;
    setSaving(true);
    try {
      await onSubmit(form);
      setForm(initial);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally { setSaving(false); }
  };

  return <Panel title="Nouvelle passation">
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="handover-site">Site de travail</Label>
          <div className="mt-1 flex gap-2">
            <select id="handover-site" required value={form.siteName} onChange={(e) => { const site = sites.find((item) => item.name === e.target.value); change("siteName", e.target.value); if (site) change("siteType", site.type); }} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Sélectionner un site</option>
              {sites.map((site) => <option key={site.id} value={site.name}>{site.name}</option>)}
            </select>
            {canCreateSite && <Button type="button" size="icon" variant="outline" aria-label="Ajouter un site" title="Ajouter un site" onClick={() => setAddingSite((open) => !open)}><Plus className="h-4 w-4" /></Button>}
          </div>
          {addingSite && <div className="mt-2 flex gap-2"><Input aria-label="Nom du nouveau site" placeholder="Nom du nouveau site" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} /><Button type="button" variant="outline" disabled={savingSite || !newSiteName.trim()} onClick={() => void handleAddSite()}>{savingSite ? "Ajout…" : "Ajouter"}</Button></div>}
        </div>
        <div><Label htmlFor="handover-site-type">Type de site</Label><select id="handover-site-type" value={form.siteType} onChange={(e) => change("siteType", e.target.value as "USINE" | "AGENCE")} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="USINE">Usine</option><option value="AGENCE">Agence</option></select></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><Label htmlFor="outgoing-agent">Agent sortant · nom et prénom</Label><Input id="outgoing-agent" required value={form.outgoing_agent} onChange={(e) => change("outgoing_agent", e.target.value)} /></div>
        <div><Label htmlFor="outgoing-id">Matricule sortant</Label><Input id="outgoing-id" required value={form.outgoing_matricule} onChange={(e) => change("outgoing_matricule", e.target.value)} /></div>
        <div><Label htmlFor="incoming-agent">Agent entrant · nom et prénom</Label><Input id="incoming-agent" required value={form.incoming_agent} onChange={(e) => change("incoming_agent", e.target.value)} /></div>
        <div><Label htmlFor="incoming-id">Matricule entrant</Label><Input id="incoming-id" required value={form.incoming_matricule} onChange={(e) => change("incoming_matricule", e.target.value)} /></div>
      </div>
      <div><Label htmlFor="handover-post">Poste transmis</Label><Input id="handover-post" required value={form.post_name} onChange={(e) => change("post_name", e.target.value)} /></div>
      <div><Label htmlFor="handover-equipment">Matériel et clés remis</Label><Textarea id="handover-equipment" value={form.equipment} onChange={(e) => change("equipment", e.target.value)} placeholder="Radio, clés, badge, état ou élément manquant" /></div>
      <div><Label htmlFor="handover-events">Événements / anomalies en cours</Label><Textarea id="handover-events" value={form.ongoing_events} onChange={(e) => change("ongoing_events", e.target.value)} placeholder="Faits observés, mesures prises, suites à donner" /></div>
      <div><Label htmlFor="handover-instructions">Consignes au prochain agent</Label><Textarea id="handover-instructions" value={form.instructions} onChange={(e) => change("instructions", e.target.value)} /></div>
      <SignaturePad label="Confirmation de remise · agent sortant" signed={form.outgoing_signed} onSignedChange={(signed) => change("outgoing_signed", signed)} />
      <SignaturePad label="Confirmation de réception · agent entrant" signed={form.incoming_signed} onSignedChange={(signed) => change("incoming_signed", signed)} />
      <Button type="submit" className="w-full" disabled={saving || !form.siteName.trim() || !form.outgoing_signed || !form.incoming_signed}>{saving ? "Enregistrement…" : "Enregistrer la passation"}</Button>
    </form>
  </Panel>;
}
