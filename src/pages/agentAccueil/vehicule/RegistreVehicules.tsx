import { Panel } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const formatTime = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Format de la date (JJ/MM/AAAA)
const formatDate = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

// Premier champ non vide parmi plusieurs noms possibles
const pick = (v: any, ...keys: string[]) => {
  for (const k of keys) {
    const value = v?.[k];
    if (value !== null && value !== undefined && String(value).trim() !== "") return String(value);
  }
  return "";
};

// Registre complet des véhicules (les « présents sur site » sont dans PresentsVehicules.tsx)
export default function RegistreVehicules({ rows }: { rows: any[] }) {
  const [q, setQ] = useState("");

  // Recherche par immatriculation, société, conducteur, opération, plomb ou référence
  const filtered = rows.filter((v) =>
    [
      pick(v, "plate", "immatriculation"),
      pick(v, "company", "societe"),
      pick(v, "driver", "conducteur"),
      pick(v, "operation"),
      pick(v, "seal_number"),
      pick(v, "document_reference"),
    ]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  return (
    <Panel title="Registre des véhicules">
      <Input
        placeholder="Rechercher immatriculation, société, conducteur, plomb…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-3"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Immatriculation</th>
              <th>Type</th>
              <th>Société</th>
              <th>Conducteur</th>
              <th>Opération</th>
              <th>Plomb</th>
              <th>Titre / facture</th>
              <th>État</th>
              <th>Date</th>
              <th>Entrée</th>
              <th>Sortie</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filtered.map((v) => (
              <tr key={v.id}>
                <td className="py-2 font-mono font-medium">{pick(v, "plate", "immatriculation") || "—"}</td>
                <td>{pick(v, "type") || "—"}</td>
                <td>{pick(v, "company", "societe") || "—"}</td>
                <td>{pick(v, "driver", "conducteur") || "—"}</td>
                <td>{pick(v, "operation") || "—"}</td>
                <td className="font-mono text-xs">{pick(v, "seal_number") || "—"}</td>
                <td className="font-mono text-xs">{pick(v, "document_reference") || "—"}</td>
                <td className="text-xs">{pick(v, "load_state") || "—"}</td>
                <td className="font-mono text-xs">{formatDate(pick(v, "entered_at", "entree", "created_at"))}</td>
                <td className="font-mono text-xs">{formatTime(pick(v, "entered_at", "entree", "created_at"))}</td>
                <td className="font-mono text-xs">{formatTime(pick(v, "exited_at", "sortie"))}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="py-3 text-center text-xs italic text-muted-foreground">
                  Aucun véhicule trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}