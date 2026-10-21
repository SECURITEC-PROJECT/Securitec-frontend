import { API_URL } from "@/lib/api";
import { Input } from "@/components/ui/input";
import axios from 'axios';
import { useEffect, useState } from 'react';

interface ListProps {
  refreshKey: number;
}

export default function ListLogistique({ refreshKey }: ListProps) {
  const [data, setData] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    axios.get(`${API_URL}/flux`)
      .then(res => setData(res.data))
      .catch(err => console.error(err));
  }, [refreshKey]);

  const filteredData = data.filter(item => 
    `${item.camion || ''} ${item.transporteur || ''} ${item.documentRef || ''} ${item.plomb || ''} ${item.type || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div>
      <Input placeholder="Filtrer les registres par camion, doc, type..." value={query} onChange={e => setQuery(e.target.value)} className="mb-4 text-xs h-9" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[750px] text-left text-xs">
          <thead className="border-b text-muted-foreground">
            <tr>
              <th className="py-2 pr-3">Type</th>
              <th className="py-2 pr-3">Site / Détails</th>
              <th className="py-2 pr-3">Camion / Transport</th>
              <th className="py-2 pr-3">Réf. Doc / Plomb</th>
              <th className="py-2 pr-3">Statut / Anomalie / Stock Extérieur</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredData.map(item => (
              <tr key={item.id || Math.random()}>
                <td className="py-3 pr-3 font-semibold text-primary">{item.type}</td>
                <td className="py-3 pr-3">
                  <span className="font-medium">{item.siteType || 'Agence'}</span>
                  {item.variante && <span className="block text-[10px] text-muted-foreground">{item.variante}</span>}
                </td>
                <td className="py-3 pr-3">
                  {item.camion ? <span className="font-mono">{item.camion}</span> : <span className="text-muted-foreground">-</span>}
                  {item.transporteur && <span className="block text-[10px] text-muted-foreground">{item.transporteur}</span>}
                </td>
                <td className="py-3 pr-3 font-mono">
                  {item.documentRef && <span>{item.documentRef}</span>}
                  {item.plomb && <span className="block text-[10px] text-primary">Plomb: {item.plomb}</span>}
                </td>
                <td className="py-3 pr-3">
                  {item.type === 'Stock Extérieur' ? (
                    <span className="text-[11px] text-muted-foreground font-mono">
                      Vides [CV12:{item.cv12||0}, CV24:{item.cv24||0}, CV20:{item.cv20||0}] | Pleins [EV150:{item.ev150||0}, CR200:{item.cr200||0}]
                    </span>
                  ) : item.anomalie && item.anomalie !== 'Aucune' ? (
                    <span className="text-destructive font-bold">
                      {item.anomalie} ({item.formatProduit} : {item.quantiteImpactee}u) — {item.descriptionFait}
                    </span>
                  ) : (
                    <span className="text-success font-medium">Conforme</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}