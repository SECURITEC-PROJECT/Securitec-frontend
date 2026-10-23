import { PageHeader, Panel } from "@/components/PageHeader";
import { rafraichirAnomalies } from "@/hooks/useAnomalies";
import { useSites } from "@/hooks/useSites";
import { serviceApi } from "@/lib/service-api";
import type { ExitDetails } from "@/types/visitor";
import { useCallback, useEffect, useState } from "react";
import FormPieton from "./FormPieton";
import ListPieton from "./ListPieton";
import PresentsSurSite from "./PresentsSurSite";

export default function Pieton() {
  const [visitors, setVisitors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const refresh = useCallback(async () => setVisitors(await serviceApi.listVisitors()), []);
  useEffect(() => {
    refresh().catch((reason) => setError(reason.message)).finally(() => setLoading(false));
  }, [refresh]);

  const exit = async (id: string, details: ExitDetails): Promise<void> => {
    try {
      await serviceApi.exitVisitor(id, details);
      await refresh();
      rafraichirAnomalies(); // retire tout de suite l'alerte de la cloche
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Sortie impossible";
      setError(message);
      throw reason;
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Contrôle des passages" subtitle="Registre des entrées et sorties visiteurs, relié au site et au journal des mouvements." />
      {(error || siteError) && (
        <Panel title="Connexion backend">
          <p className="text-sm text-destructive">{error || siteError}</p>
        </Panel>
      )}
      {loading ? (
        <Panel title="Chargement">
          <p className="text-sm text-muted-foreground">Chargement du registre visiteurs…</p>
        </Panel>
      ) : (
        <>
          {/* Formulaire à gauche, présents sur site à droite */}
          <div className="grid items-start gap-6 lg:grid-cols-[480px_1fr]">
            <FormPieton
              sites={sites}
              canCreateSite={canCreateSite}
              onAddSite={addSite}
              knownVisitors={visitors}
              onCreated={(visitor) => setVisitors((previous) => [visitor, ...previous])}
            />
            <PresentsSurSite visitors={visitors} onExit={exit} />
          </div>

          {/* Registre complet en bas */}
          <ListPieton visitors={visitors} />
        </>
      )}
    </div>
  );
}