import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { fmt, useProfiles } from "@/lib/security";
import { Download } from "lucide-react";
import { useState } from "react";

interface ListCompteRenduProps {
  data: any[];
}

export default function ListCompteRendu({ data }: ListCompteRenduProps) {
  const name = useProfiles();
  const [open, setOpen] = useState<string | null>(null);
  const [validated, setValidated] = useState<string[]>([]);

  return (
    <Panel title="Comptes rendus enregistrés">
      {data.length ? (
        <ul className="space-y-2">
          {data.map((r) => (
            <li key={r.id} className="rounded-md border">
              <Button variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)} className="block h-auto w-full whitespace-normal p-3 text-left text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{r.title}</span>
                  <span className="font-mono text-xs text-muted-foreground">{fmt(r.created_at)}</span>
                </div>
                <p className="text-muted-foreground">{r.report_type} · {name(r.agent_id)}</p>
              </Button>
              {open === r.id && (
                <div className="border-t p-3 space-y-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm">{r.content}</pre>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
                      <Download /> Imprimer / PDF
                    </Button>
                    <Button type="button" size="sm" disabled={validated.includes(r.id)} onClick={() => setValidated([...validated, r.id])}>
                      {validated.includes(r.id) ? "Validé" : "Valider le compte rendu"}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : <Empty text="Aucun compte rendu" />}
    </Panel>
  );
}