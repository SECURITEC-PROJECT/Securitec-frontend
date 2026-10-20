
import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { LogOut, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import ModalSortieVisiteur from "./ModalSortieVisiteur";

export default function ListPieton({ visitors, onExit }: { visitors: any[]; onExit: (id: string, details: { equipmentOut: boolean; extraEquipment: string }) => Promise<void> }) {
  const [q, setQ] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(
    null
  );

  // Visiteurs actuellement présents sur le site
  const present = visitors.filter((v) => !v.exited_at);

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

  // Formater l'heure, même si la date est null ou absente
  const formatTime = (
    dateStr: string | Date | null | undefined
  ): string => {
    if (!dateStr) return "—";

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <Panel title="Présents sur site">
        {present.length ? (
          <ul className="divide-y">
            {present.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {v.full_name}

                    {v.badge && (
                      <span className="ml-1 rounded bg-accent px-1.5 py-0.5 font-mono text-xs">
                        #{v.badge}
                      </span>
                    )}
                  </p>

                  <p className="text-muted-foreground">
                    {[
                      v.company,
                      v.host && `voit ${v.host}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · entré {formatTime(v.entered_at)}
                  </p>

                  {v.equipment && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
                      <PackageCheck className="h-3.5 w-3.5" />
                      Matériel : {v.equipment}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedVisitor(v)}
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Sortie
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Aucun visiteur sur site" />
        )}
      </Panel>

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

      <ModalSortieVisiteur
        visitor={selectedVisitor}
        onClose={() => setSelectedVisitor(null)}
        onConfirmExit={handleConfirmExit}
        formatTime={formatTime}
      />
    </div>
  );
}
