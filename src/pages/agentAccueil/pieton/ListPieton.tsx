import { Panel } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { LogOut, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import ModalSortieVisiteur from "./ModalSortieVisiteur";
import { formatTime } from "./formatTime";

// Registre complet des visiteurs (les « Présents sur site » sont dans PresentsSurSite.tsx)
export default function ListPieton({ visitors }: { visitors: any[] }) {
  const [q, setQ] = useState("");

  // Recherche par nom, société, badge ou matériel
  const filtered = visitors.filter((v) =>
    `${v.full_name} ${v.company} ${v.badge} ${v.equipment ?? ""}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  // Enregistrer la sortie d'un visiteur
  const handleConfirmExit = async (
    id: string | number,
    name: string,
    details: { equipmentOut: boolean; extraEquipment: string }
  ) => {
    try {
      await onExit(String(id), details);
      toast.success(`Sortie enregistrée pour ${name}`);
      setSelectedVisitor(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sortie impossible");
    }
  };

  return (
    <Panel title="Registre complet">
      <Input
        placeholder="Rechercher nom, société, badge, matériel…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="mb-3"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-2">Nom</th>
              <th>Société</th>
              <th>Motif</th>
              <th>Matériel</th>
              <th>Entrée</th>
              <th>Sortie</th>
            </tr>
          </thead>

          <tbody className="divide-y">
            {filtered.map((v) => (
              <tr key={v.id}>
                <td className="py-2 font-medium">
                  {v.full_name}
                </td>

                <td>{v.company || "—"}</td>

                <td>{v.reason || "—"}</td>

                <td className="text-xs">
                  {v.equipment || "Aucun"}
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