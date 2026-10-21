import { Empty, Panel } from "@/components/PageHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [filter, setFilter] = useState("Toutes");
  const list = filter === "Toutes" ? data : data.filter((d) => d.category === filter);

  return (
    <Panel title="Journal Chronologique Main Courante">
      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="mb-3 w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Toutes">Toutes catégories</SelectItem>
          {CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>

      {list.length ? (
        <ol className="divide-y text-xs">
          {list.map((l) => (
            <li key={l.id} className="grid grid-cols-[80px_1fr] gap-3 py-3">
              <span className="font-mono text-muted-foreground">{l.heure || "—"}</span>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-primary">{l.category}</span>
                  {l.typeEntree && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase font-mono">
                      {l.typeEntree}
                    </span>
                  )}
                  {l.severity && l.severity !== "normal" && (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SEV[l.severity] || SEV.normal}`}>
                      {l.severity}
                    </span>
                  )}
                  {l.people && <span className="font-medium text-foreground">({l.people})</span>}
                </div>
                
                {/* Description / Faits */}
                <p className="whitespace-pre-wrap text-muted-foreground">{l.description}</p>
                
                {/* Mesures prises */}
                {l.mesuresPrises && (
                  <p className="text-primary font-medium text-[11px] bg-primary/5 p-1.5 rounded border border-primary/10 mt-1">
                     <strong>Mesures prises :</strong> {l.mesuresPrises}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : <Empty text="Aucun événement consigné" />}
    </Panel>
  );
}
