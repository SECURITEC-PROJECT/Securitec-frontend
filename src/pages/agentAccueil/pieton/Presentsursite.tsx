import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { LogOut, PackageCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatTime } from "./formatTime";
import ModalSortieVisiteur from "./ModalSortieVisiteur";

export default function PresentsSurSite({
  visitors,
  onExit,
}: {
  visitors: any[];
  onExit: (id: string, details: { equipmentOut: boolean; extraEquipment: string }) => Promise<void>;
}) {
  const [selectedVisitor, setSelectedVisitor] = useState<any | null>(null);

  // Visiteurs actuellement présents sur le site
  const present = visitors.filter((v) => !v.exited_at);

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
    <>
      <Panel title="Présents sur site">
        {present.length ? (
          <ul className="max-h-[640px] divide-y overflow-y-auto">
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

      <ModalSortieVisiteur
        visitor={selectedVisitor}
        onClose={() => setSelectedVisitor(null)}
        onConfirmExit={handleConfirmExit}
        formatTime={formatTime}
      />
    </>
  );
}