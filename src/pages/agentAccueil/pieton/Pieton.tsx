import { Panel } from "@/components/PageHeader";
import { useSites } from "@/hooks/useSites";
import SitePicker from "@/components/SitePicker";
import { serviceApi } from "@/lib/service-api";
import type { VisitorRecord } from "@/types/visitor";
import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { confirmDeletion } from "@/lib/deletion-toast";
import { Users } from "lucide-react";
import FormPieton from "./FormPieton";
import ListPieton from "./ListPieton";
import PresentsSurSite from "./PresentsSurSite";

export default function Pieton({ canManageSiteBans = false }: { canManageSiteBans?: boolean }) {
  const [registry, setRegistry] = useState<{ siteId: string; visitors: VisitorRecord[]; error: string }>({
    siteId: "",
    visitors: [],
    error: "",
  });
  const [editingVisitor, setEditingVisitor] = useState<VisitorRecord | null>(null);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
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
    const refresh = () => {
      serviceApi.listVisitors(site.id)
        .then((rows) => { if (active) setRegistry({ siteId: site.id, visitors: rows, error: "" }); })
        .catch((reason) => {
          if (active) setRegistry({
            siteId: site.id,
            visitors: [],
            error: reason instanceof Error ? reason.message : "Chargement du registre impossible.",
          });
        });
    };
    const onQueueChanged = () => refresh();
    window.addEventListener("online", refresh);
    window.addEventListener("securitec-offline-queue-changed", onQueueChanged);
    refresh();
    return () => {
      active = false;
      window.removeEventListener("online", refresh);
      window.removeEventListener("securitec-offline-queue-changed", onQueueChanged);
    };
  }, [site?.id]);

  const exit = async (id: string): Promise<boolean> => {
    try {
      const exitedVisitor = await serviceApi.exitVisitor(id, { equipmentOut: false, extraEquipment: "" }, selectedSiteId);
      setRegistry((current) => ({
        ...current,
        visitors: current.visitors.map((visitor) => visitor.id === id
          ? { ...visitor, exited_at: exitedVisitor.exited_at, pendingSync: exitedVisitor.pendingSync }
          : visitor),
      }));
      return Boolean(exitedVisitor.pendingSync);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Sortie impossible";
      setRegistry((current) => ({ ...current, error: message }));
      throw reason;
    }
  };

  const deleteVisitor = async (visitor: VisitorRecord) => {
    if (!(await confirmDeletion(`Supprimer le passage de « ${visitor.full_name} » ? Cette action est définitive.`))) return;
    try {
      await serviceApi.deleteVisitor(String(visitor.id), visitor.site_id);
      setRegistry((current) => ({ ...current, visitors: current.visitors.filter((entry) => entry.id !== visitor.id) }));
      if (editingVisitor?.id === visitor.id) setEditingVisitor(null);
      toast.success(visitor.pendingSync ? "Entrée visiteur en attente supprimée de cet appareil." : "Passage visiteur supprimé.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Suppression du passage impossible.");
    }
  };

  const setSiteBan = async (visitor: VisitorRecord, banned: boolean) => {
    try {
      await serviceApi.setVisitorSiteBan(String(visitor.id), selectedSiteId, banned);
      setRegistry((current) => ({
        ...current,
        visitors: current.visitors.map((entry) => entry.full_name.trim().toLocaleLowerCase() === visitor.full_name.trim().toLocaleLowerCase()
          ? { ...entry, site_banned: banned }
          : entry),
      }));
      toast.success(banned ? "Interdiction activée pour ce visiteur sur le site." : "Interdiction levée sur ce site.");
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "Mise à jour de l’interdiction impossible.");
    }
  };

  const sitePicker: ReactNode = (
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
  );

  return (
    <div className="courrier-module visitor-access-module space-y-4">
      <header className="courrier-hero">
        <div className="courrier-hero-icon"><Users aria-hidden="true" /></div>
        <div className="courrier-hero-copy">
          <h1>Visiteurs et accès</h1>
          <p>Enregistrez et suivez les entrées et sorties des visiteurs</p>
        </div>
      </header>
      {(error || siteError) && (
        <Panel title="Connexion backend">
          <p className="text-sm text-destructive">{error || siteError}</p>
        </Panel>
      )}
      {visitors.some((visitor) => visitor.pendingSync) && (
        <Panel title="Synchronisation hors ligne">
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>{visitors.filter((visitor) => visitor.pendingSync).length} mouvement(s) visiteur en attente ou à vérifier. Les décisions d’interdiction de site restent exclusivement en ligne.</p>
            <ul className="list-inside list-disc">
              {visitors.filter((visitor) => visitor.pendingSync).map((visitor) => (
                <li key={visitor.id}>
                  {visitor.full_name}: {visitor.pendingSyncError || (visitor.pendingSyncStatus === "pending" ? "en attente de synchronisation" : "à vérifier")}
                </li>
              ))}
            </ul>
          </div>
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
          <Dialog open={entryFormOpen || Boolean(editingVisitor)} onOpenChange={(open) => {
            setEntryFormOpen(open);
            if (!open) setEditingVisitor(null);
          }}>
            <DialogContent className="visitor-access-dialog">
              <DialogHeader>
                <DialogTitle>{editingVisitor ? "Modifier un passage visiteur" : "Enregistrer une entrée"}</DialogTitle>
                <DialogDescription>Renseignez les informations du visiteur et validez l’entrée sur le site sélectionné.</DialogDescription>
              </DialogHeader>
              <FormPieton
                key={editingVisitor?.id || "new-visitor"}
                siteId={selectedSiteId}
                siteName={selectedSiteName}
                siteType={site?.type || siteType}
                knownVisitors={visitors}
                onCreated={(visitor) => {
                  setRegistry((current) => ({
                    siteId: site?.id || current.siteId,
                    visitors: [visitor, ...current.visitors],
                    error: "",
                  }));
                  setEntryFormOpen(false);
                }}
                onUpdated={(visitor) => {
                  setRegistry((current) => ({
                    ...current,
                    visitors: current.visitors.map((entry) => entry.id === visitor.id ? { ...entry, ...visitor } : entry),
                  }));
                  setEditingVisitor(null);
                  setEntryFormOpen(false);
                }}
                editingVisitor={editingVisitor}
                onCancelEditing={() => setEditingVisitor(null)}
              />
            </DialogContent>
          </Dialog>
          <ListPieton
            visitors={visitors}
            onEdit={(visitor) => {
              setEditingVisitor(visitor);
              setEntryFormOpen(true);
            }}
            onDelete={deleteVisitor}
            canManageSiteBans={canManageSiteBans}
            onToggleSiteBan={setSiteBan}
            siteId={selectedSiteId}
            siteName={selectedSiteName}
            siteType={site?.type || siteType}
            sitePicker={sitePicker}
            onNewEntry={() => {
              setEditingVisitor(null);
              setEntryFormOpen(true);
            }}
            onCreated={(visitor) => setRegistry((current) => ({ ...current, visitors: [visitor, ...current.visitors], error: "" }))}
          />
          <PresentsSurSite visitors={visitors} onExit={exit} />
        </>
      )}
    </div>
  );
}
