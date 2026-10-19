import { PageHeader, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { demo, useDemoTable } from "@/lib/demo-store";
import { fmt } from "@/lib/security";
import { useState } from 'react';

export function ListVehicule() {
  const rows = useDemoTable("vehicles");
  const [query, setQuery] = useState("");

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
                  {['Véhicule', 'Conducteur', 'Zone', 'Contrôle', 'Présence'].map((x) => (
                    <th className="py-3 pr-4 font-medium" key={x}>{x}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.filter((r) => `${r.plate} ${r.driver} ${r.company}`.toLowerCase().includes(query.toLowerCase())).map((r) => (
                  <tr key={r.id}>
                    <td className="py-4 pr-3">
                      <p className="font-mono font-semibold">{r.plate}</p>
                      <p className="mt-1 text-muted-foreground">{r.company}</p>
                    </td>
                    <td>{r.driver}</td>
                    <td>{r.zone}</td>
                    <td className={r.compliant ? 'text-success' : 'text-warning-foreground'}>
                      {r.compliant ? 'Conforme' : 'À vérifier'}
                    </td>
                    <td>
                      {r.exited_at ? (
                        <span className="text-muted-foreground">Sorti · {fmt(r.exited_at)}</span>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => { 
                          demo.update("vehicles", r.id, { exited_at: new Date().toISOString() }); 
                          demo.add("logbook_entries", { category: "Livraison", description: `Sortie véhicule ${r.plate}` }); 
                        }}>
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