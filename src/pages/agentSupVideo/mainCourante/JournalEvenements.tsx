import { Empty, Panel } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProfiles, fmt } from "@/lib/security";
import { useState } from "react";

const CATS = ["Information", "Incident", "Intervention", "Alarme", "Livraison", "Appel", "Anomalie technique", "Visiteur", "Prise de poste", "Passation", "Ronde", "Fin de service"];
const SEV: Record<string, string> = { 
  normal: "bg-muted text-muted-foreground", 
  important: "bg-warning text-warning-foreground", 
  grave: "bg-destructive/10 text-destructive", 
  urgent: "bg-destructive text-destructive-foreground" 
};

interface JournalEvenementsProps {
  data: any[];
}

export default function JournalEvenements({ data }: JournalEvenementsProps) {
  const name = useProfiles();
  const [filter, setFilter] = useState("Toutes");
  const list = filter === "Toutes" ? data : data.filter((d) => d.category === filter);

  return (
    <Panel title="Journal">
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="mb-3 w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Toutes">Toutes catégories</SelectItem>
          {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      {list.length ? (
        <ol className="divide-y">
          {list.map((l) => (
            <li key={l.id} className="grid grid-cols-[90px_1fr] gap-3 py-3 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{fmt(l.created_at)}</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{l.category}</span>
                  {l.severity !== "normal" && <span className={`rounded px-1.5 py-0.5 text-xs ${SEV[l.severity]}`}>{l.severity}</span>}
                  <span className="text-xs text-muted-foreground">par {name(l.agent_id)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap">{l.description}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : <Empty text="Aucun événement" />}
    </Panel>
  );
}