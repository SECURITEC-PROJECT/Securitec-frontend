import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteOption } from "@/hooks/useSites";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SitePickerProps {
  id: string;
  value: string;
  type: SiteOption["type"];
  sites: SiteOption[];
  canCreate: boolean;
  canDelete?: boolean;
  onChange: (name: string, type: SiteOption["type"]) => void;
  onAdd: (name: string, type: SiteOption["type"]) => Promise<SiteOption>;
  onArchive?: (id: string) => Promise<void>;
}

export default function SitePicker({ id, value, type, sites, canCreate, canDelete = false, onChange, onAdd, onArchive }: SitePickerProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const addSite = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const site = await onAdd(newName.trim(), type);
      onChange(site.name, site.type);
      setNewName("");
      setAdding(false);
      toast.success("Site ajouté à la liste");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ajout du site impossible");
    } finally {
      setSaving(false);
    }
  };

  const archiveSelected = async () => {
    const selected = sites.find((site) => site.name === value);
    if (!selected || !onArchive) return;
    const confirmed = window.confirm(`Retirer « ${selected.name} » de la liste des sites ? Les anciennes données garderont leur historique.`);
    if (!confirmed) return;
    try {
      await onArchive(selected.id);
      onChange("", type);
      toast.success("Site retiré des listes de tous les modules");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Retrait du site impossible");
    }
  };

  return <div>
    <Label htmlFor={id}>Site de travail</Label>
    <div className="mt-1 flex gap-2">
      <select
        id={id}
        required
        value={value}
        onChange={(event) => {
          const selected = sites.find((site) => site.name === event.target.value);
          onChange(event.target.value, selected?.type || type);
        }}
        className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">Sélectionner un site</option>
        {sites.map((site) => <option key={site.id} value={site.name}>{site.name}</option>)}
      </select>
      {canCreate && <Button type="button" size="icon" variant="outline" aria-label="Ajouter un site" title="Ajouter un site" onClick={() => setAdding((open) => !open)}><Plus className="h-4 w-4" /></Button>}
      {canDelete && value && <Button type="button" size="icon" variant="outline" aria-label="Retirer le site sélectionné" title="Retirer le site sélectionné" onClick={() => void archiveSelected()}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
    </div>
    {adding && <div className="mt-2 flex gap-2">
      <Input aria-label="Nom du nouveau site" placeholder="Saisir le nom du site" value={newName} onChange={(event) => setNewName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void addSite(); } }} />
      <Button type="button" variant="outline" disabled={saving || !newName.trim()} onClick={() => void addSite()}>{saving ? "Ajout…" : "Ajouter"}</Button>
    </div>}
  </div>;
}
