import { Empty, Panel } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { rafraichirAnomalies, useAnomalies } from "@/hooks/useAnomalies";
import type { VisitorRecord } from "@/types/visitor";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatTime } from "./formatTime";

export default function PresentsSurSite({
  visitors,
  onExit,
}: {
  visitors: VisitorRecord[];
  onExit: (id: string) => Promise<void>;
}) {
  const [exitingId, setExitingId] = useState<string | null>(null);
  // Anomalies : visiteurs encore présents après la fermeture du site
  const anomalies = useAnomalies();
  const enAnomalie = new Map(
    anomalies.filter((a) => a.type === "visiteur").map((a) => [String(a.rowId), a])
  );

  // Visiteurs actuellement présents sur le site
  const present = visitors.filter((v) => !v.exited_at);

  // Enregistrer la sortie d'un visiteur
  const handleExit = async (id: string | number, name: string) => {
    setExitingId(String(id));
    try {
      await onExit(String(id));
      rafraichirAnomalies();
      toast.success(`Sortie enregistrée pour ${name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sortie impossible");
    } finally {
      setExitingId(null);
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
                className={`flex items-center justify-between gap-3 py-2.5 text-sm ${
                  enAnomalie.has(String(v.id))
                    ? "my-1 rounded-md border-l-4 border-red-500 bg-red-50 px-3 text-red-700"
                    : ""
                }`}
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

                  <p className={enAnomalie.has(String(v.id)) ? "text-red-700" : "text-muted-foreground"}>
                    {[
                      v.company,
                      v.host && `voit ${v.host}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}{" "}
                    · entré {formatTime(v.entered_at)}
                  </p>

                  {enAnomalie.get(String(v.id)) && (
                    <p className="mt-1 text-xs font-semibold text-red-700">
                      ⚠ Non sorti après la fermeture ({enAnomalie.get(String(v.id))?.heureFermeture}) · dépassement{" "}
                      {enAnomalie.get(String(v.id))?.retardTexte}
                    </p>
                  )}

                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={exitingId === String(v.id)}
                  onClick={() => void handleExit(v.id, v.full_name)}
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  {exitingId === String(v.id) ? "Enregistrement…" : "Sortir"}
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Aucun visiteur sur site" />
        )}
      </Panel>

    </>
  );
}