import { Panel } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useAnomalies } from "@/hooks/useAnomalies";
import { useState } from "react";
import { formatTime } from "./formatTime";

// Format de la date (JJ/MM/AAAA), défini localement pour éviter toute dépendance externe
const formatDate = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Registre complet des visiteurs (les « Présents sur site » sont dans PresentsSurSite.tsx)
export default function ListPieton({ visitors }: { visitors: any[] }) {
  const [q, setQ] = useState("");

  // Visiteurs encore présents après la fermeture du site : lignes en rouge
  const anomalies = useAnomalies();
  const enAnomalie = new Set(anomalies.filter((a) => a.type === "visiteur").map((a) => String(a.rowId)));

  // Recherche par nom, société, badge ou matériel
  const filtered = visitors.filter((v) =>
    `${v.full_name} ${v.company} ${v.badge} ${v.equipment ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  return (
    <Panel title="Registre complet">
      <Input
        placeholder="Rechercher nom, société, badge, matériel…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-3"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Nom</th>
              <th>Société</th>
              <th>Motif</th>
              <th>Matériel</th>
              <th>Date</th>
              <th>Entrée</th>
              <th>Sortie</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filtered.map((v) => (
              <tr key={v.id} className={enAnomalie.has(String(v.id)) ? "bg-red-50 font-medium text-red-700" : ""}>
                <td className="py-2 font-medium">
                  {v.full_name}
                </td>

                <td>{v.company || "—"}</td>

                <td>{v.reason || "—"}</td>

                <td className="text-xs">
                  {v.equipment || "Aucun"}
                </td>

                <td className="font-mono text-xs">
                  {formatDate(v.entered_at)}
                </td>

                <td className="font-mono text-xs">
                  {formatTime(v.entered_at)}
                </td>

                <td className="font-mono text-xs">
                  {formatTime(v.exited_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}