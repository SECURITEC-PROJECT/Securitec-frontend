import { PageHeader, Panel } from "@/components/PageHeader";
import { rafraichirAnomalies } from "@/hooks/useAnomalies";
import { useSites } from "@/hooks/useSites";
import SitePicker from "@/components/SitePicker";
import { serviceApi } from "@/lib/service-api";
import type { VisitorRecord } from "@/types/visitor";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import FormPieton from "./FormPieton";
import ListPieton from "./ListPieton";
import PresentsSurSite from "./PresentsSurSite";

export default function Pieton() {
  const [registry, setRegistry] = useState<{ siteId: string; visitors: VisitorRecord[]; error: string }>({
    siteId: "",
    visitors: [],
    error: "",
  });
  const [editingVisitor, setEditingVisitor] = useState<VisitorRecord | null>(null);
  const { sites, canCreateSite, siteError, addSite } = useSites();
  const [siteName, setSiteName] = useState("");
  const [siteType, setSiteType] = useState<"USINE" | "AGENCE">("USINE");
  const selectedSiteName = siteName || sites[0]?.name || "";
  const site = sites.find((item) => item.name === selectedSiteName);
  const selectedSiteId = site?.id || "";
  const visitors = registry.siteId === selectedSiteId ? registry.visitors : [];
  const error = registry.siteId === selectedSiteId ? registry.error : "";
  const loading = Boolean(selectedSiteId) && registry.siteId !== selectedSiteId;
  useEffect(() => {
    let active = true;
    if (!site?.id) return () => { active = false; };
    serviceApi.listVisitors(site.id)
      .then((rows) => { if (active) setRegistry({ siteId: site.id, visitors: rows, error: "" }); })
      .catch((reason) => {
        if (active) setRegistry({
          siteId: site.id,
          visitors: [],
          error: reason instanceof Error ? reason.message : "Chargement du registre impossible.",
        });
      });
    return () => { active = false; };
  }, [site?.id]);

  const exit = async (id: string): Promise<void> => {
    try {
      const { visitor: exitedVisitor } = await serviceApi.exitVisitor(id, { equipmentOut: false, extraEquipment: "" });
      setRegistry((current) => ({
        ...current,
        visitors: current.visitors.map((visitor) => visitor.id === id
          ? { ...visitor, exited_at: exitedVisitor.exited_at }
          : visitor),
      }));
      rafraichirAnomalies(); // retire tout de suite l'alerte de la cloche
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Sortie impossible";
      setRegistry((current) => ({ ...current, error: message }));
      throw reason;
    }
  };

  const deleteVisitor = async (visitor: VisitorRecord) => {
    if (!window.confirm(`Supprimer le passage de « ${visitor.full_name} » ? Cette action est définitive.`)) return;
    try {
      await serviceApi.deleteVisitor(String(visitor.id), visitor.site_id);
      setRegistry((current) => ({ ...current, visitors: current.visitors.filter((entry) => entry.id !== visitor.id) }));
      if (editingVisitor?.id === visitor.id) setEditingVisitor(null);
      toast.success("Passage visiteur supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression du passage impossible.");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Contrôle des passages" subtitle="Registre des entrées et sorties visiteurs, relié au site et au journal des mouvements." />
      <div className="max-w-xl">
        <SitePicker
          id="visitor-site"
          value={selectedSiteName}
          type={site?.type || siteType}
          sites={sites}
          canCreate={canCreateSite}
          onAdd={addSite}
          onChange={(name, type) => {
            setSiteName(name);
            setSiteType(type);
            setEditingVisitor(null);
          }}
        />
      </div>
      {(error || siteError) && (
        <Panel title="Connexion backend">
          <p className="text-sm text-destructive">{error || siteError}</p>
        </Panel>
      )}
      {loading ? (
        <Panel title="Chargement">
          <p className="text-sm text-muted-foreground">Chargement du registre visiteurs…</p>
        </Panel>
      ) : !site?.id ? (
        <Panel title="Site de travail">
          <p className="text-sm text-muted-foreground">Sélectionnez un site pour gérer les passages visiteurs.</p>
        </Panel>
      ) : (
        <>
          <FormPieton
            key={editingVisitor?.id || "new-visitor"}
            siteId={selectedSiteId}
            siteName={selectedSiteName}
            siteType={site?.type || siteType}
            knownVisitors={visitors}
            onCreated={(visitor) => setRegistry((current) => ({
              siteId: site?.id || current.siteId,
              visitors: [visitor, ...current.visitors],
              error: "",
            }))}
            onUpdated={(visitor) => {
              setRegistry((current) => ({
                ...current,
                visitors: current.visitors.map((entry) => entry.id === visitor.id ? { ...entry, ...visitor } : entry),
              }));
              setEditingVisitor(null);
            }}
            editingVisitor={editingVisitor}
            onCancelEditing={() => setEditingVisitor(null)}
          />
          <PresentsSurSite visitors={visitors} onExit={exit} />
          <ListPieton visitors={visitors} onEdit={setEditingVisitor} onDelete={deleteVisitor} />
        </>
      )}
    </div>
  );
}