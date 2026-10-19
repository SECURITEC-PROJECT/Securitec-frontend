import { Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemoTable } from "@/lib/demo-store";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function UsersTab() {
  const [extra, setExtra] = useState<{ name: string; role: string }[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Agent 01 · Accueil');
  const profiles = useDemoTable('profiles');

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setExtra([...extra, { name, role }]);
    setName('');
    toast.success('Profil ajouté à la maquette');
  };

  return (
    <div className="grid gap-7 xl:grid-cols-[1fr_320px]">
      <Panel title="Équipe du site">
        <div className="divide-y">
          {[...profiles.map((p, i) => ({ name: p.full_name, role: i === 3 ? 'Superviseur' : `Agent 0${i + 1}` })), ...extra].map((p, i) => (
            <div key={i} className="flex items-center gap-3 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs text-primary">
                {p.name.split(' ').map((x) => x[0]).join('')}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.role}</p>
              </div>
              <span className="text-xs text-success">Actif</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Ajouter un profil fictif">
        <form className="space-y-4" onSubmit={handleAddProfile}>
          <div>
            <Label htmlFor="profile-name">Nom complet</Label>
            <Input id="profile-name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Rôle</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Agent 01 · Accueil', 'Agent 02 · Contrôle', 'Agent 03 · Vidéo', 'Superviseur', 'Administrateur', 'Client'].map((r) => (
                  <SelectItem value={r} key={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full"><Plus /> Ajouter le profil</Button>
        </form>
      </Panel>
    </div>
  );
}