import { PageHeader, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmt } from "@/lib/security";
import { useState } from 'react';
import { toast } from "sonner";

export function ListVehicule({ rows, onExit }: { rows: any[]; onExit: (id: string) => Promise<void> }) {
  const [query, setQuery] = useState("");

  const handleExit = async (vehicle: any) => {
    if (!window.confirm(`Confirmer la sortie du véhicule ${vehicle.plate} conduit par ${vehicle.driver} ?`)) return;
    try {
      await onExit(vehicle.id);
      toast.success(`Sortie enregistrée pour ${vehicle.plate}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sortie impossible");
    }
  };

  return (
    <div>
      <PageHeader 
        title="Véhicules" 
        subtitle={`${rows.filter((v) => !v.exited_at).length} véhicule présent sur site`} 
        action={
          <Button variant="outline" onClick={() => alert("Fonction d'exportation")}>
             Exporter
          </Button>
        } 
      />
      <div>
        <Panel title="Registre des véhicules">
          <Input 
            aria-label="Rechercher un véhicule" 
            placeholder="Immatriculation, conducteur, société…" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            className="mb-4" 
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-xs">
              <thead className="border-b text-muted-foreground">
                <tr>
                  {['Véhicule', 'Conducteur', 'Site / zone', 'Contrôle', 'Présence'].map((x) => (
                    <th className="py-3 pr-4 font-medium" key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.filter((r) => `${r.plate} ${r.driver} ${r.company}`.toLowerCase().includes(query.toLowerCase())).map((r) => (
                  <tr key={r.id}>
                    <td className="py-4 pr-3">
                      <p className="font-mono font-semibold">{r.plate}</p>
                      <p className="mt-1 text-muted-foreground">{[r.type, r.company].filter(Boolean).join(" · ") || "—"}</p>
                      <p className="mt-1 text-muted-foreground">{[r.operation, r.load_state, r.seal_number && `Plomb ${r.seal_number}`, r.document_reference && `Titre ${r.document_reference}`].filter(Boolean).join(" · ")}</p>
                    </td>
                    <td>{r.driver}</td>
                    <td>{r.site_name} · {r.zone}</td>
                    <td className={r.compliant ? 'text-success' : 'text-warning-foreground'}>
                      {r.compliant ? 'Conforme' : 'À vérifier'}
                    </td>
                    <td>
                      {r.exited_at ? (
                        <span className="text-muted-foreground">Entrée {fmt(r.entered_at)} · Sortie {fmt(r.exited_at)}</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => void handleExit(r)}>
                           Sortie
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default ListVehicule;
