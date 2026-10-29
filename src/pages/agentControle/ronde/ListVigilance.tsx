import { Empty, Panel } from "@/components/PageHeader";
import type { VigilanceEntry } from "@/lib/service-api";

interface ListVigilanceProps {
  data: VigilanceEntry[];
}

export default function ListVigilance({ data }: ListVigilanceProps) {
  return (
    <Panel title="Historique des points de vigilance">
      {data.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b text-muted-foreground font-semibold">
              <tr>
                <th className="py-2 pr-2">Heure</th>
                <th className="py-2 pr-2">Domaine / Élément</th>
                <th className="py-2 pr-2">Statut</th>
                <th className="py-2 pr-2">Observations</th>
                <th className="py-2">Agent</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="py-2 pr-2 font-mono text-muted-foreground">{item.heure || "—"}</td>
                  <td className="py-2 pr-2 font-medium">
                    <span className="block text-[10px] text-muted-foreground uppercase">{item.typePoint}</span>
                    {item.elementVerifie}
                  </td>
                  <td className="py-2 pr-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        item.statut === "Conforme"
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {item.statut}
                    </span>
                  </td>
                  <td className="py-2 pr-2 text-muted-foreground">{item.observations || "—"}</td>
                  <td className="py-2 font-medium">{item.agentNom || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty text="Aucun contrôle enregistré" />
      )}
    </Panel>
  );
}