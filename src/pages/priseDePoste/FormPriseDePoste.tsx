
import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SitePicker from "@/components/SitePicker";
import type { SiteOption } from "@/hooks/useSites";
import { useState } from "react";
import { toast } from "sonner";

interface FormPriseDePosteProps {
  onStart: (
    details: { post: string; agent: string; matricule: string; prestataire: string; site: string; siteType: "USINE" | "AGENCE" },
    notes: string
  ) => void | Promise<void>;
  sites: SiteOption[];
  canCreateSite: boolean;
  canDeleteSite: boolean;
  onAddSite: (name: string, type: SiteOption["type"]) => Promise<SiteOption>;
  onArchiveSite: (id: string) => Promise<void>;
}

export default function FormPriseDePoste({
  onStart,
  sites,
  canCreateSite,
  canDeleteSite,
  onAddSite,
  onArchiveSite,
}: FormPriseDePosteProps) {
  const [form, setForm] = useState({ post: "Poste principal", agent: "", matricule: "", prestataire: "", site: "", siteType: "USINE" as "USINE" | "AGENCE" });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleStart = async () => {
    if (!form.post.trim() || !form.agent.trim() || !form.matricule.trim() || !form.prestataire.trim() || !form.site.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onStart({ ...form, post: form.post.trim(), agent: form.agent.trim(), matricule: form.matricule.trim(), prestataire: form.prestataire.trim(), site: form.site.trim() }, notes.trim());
      setNotes("");
      setForm({ post: "Poste principal", agent: "", matricule: "", prestataire: "", site: "", siteType: "USINE" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Nouvelle prise de poste">
      <div className="space-y-4">
        <div>
          <Label htmlFor="agent-name">Nom & prénom de l’agent de sécurité</Label>
          <Input id="agent-name" value={form.agent} onChange={(e) => setForm({ ...form, agent: e.target.value })} className="mt-1" required placeholder="Nom et prénom" />
        </div>
        <div>
          <Label htmlFor="agent-number">Matricule</Label>
          <Input id="agent-number" value={form.matricule} onChange={(e) => setForm({ ...form, matricule: e.target.value })} className="mt-1" required placeholder="Matricule agent" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label htmlFor="provider">Prestataire</Label><Input id="provider" value={form.prestataire} onChange={(e) => setForm({ ...form, prestataire: e.target.value })} className="mt-1" required /></div>
          <SitePicker id="site-name" value={form.site} type={form.siteType} sites={sites} canCreate={canCreateSite} canDelete={canDeleteSite} onAdd={onAddSite} onArchive={onArchiveSite} onChange={(site, siteType) => setForm((previous) => ({ ...previous, site, siteType }))} />
        </div>
        <div><Label htmlFor="site-kind">Type de site</Label><select id="site-kind" value={form.siteType} onChange={(e) => setForm({ ...form, siteType: e.target.value as "USINE" | "AGENCE" })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="USINE">Usine</option><option value="AGENCE">Agence</option></select></div>
        <div>
          <Label htmlFor="post-name">Poste / point de garde</Label>
          <Input
            id="post-name"
            value={form.post}
            onChange={(e) => setForm({ ...form, post: e.target.value })}
            className="mt-1"
            placeholder="Nom du poste"
          />
        </div>
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

        <Button
          type="button"
          className="w-full"
          disabled={saving || !form.post.trim() || !form.agent.trim() || !form.matricule.trim() || !form.prestataire.trim() || !form.site.trim()}
          onClick={handleStart}
        >
          {saving ? "Enregistrement…" : "Valider la prise de poste"}
        </Button>
      </div>
    </Panel>
  );
}
