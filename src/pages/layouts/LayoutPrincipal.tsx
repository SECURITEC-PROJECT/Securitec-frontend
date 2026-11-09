import { Button } from "@/components/ui/button";
import type { AuthenticatedUser } from "@/lib/auth-api";
import { serviceApi } from "@/lib/service-api";
import { confirmDeletion } from "@/lib/deletion-toast";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Footer from "./Footer";
import Header from "./Header";
import Sidebar from "./Sidebar";
import { SIDEBAR_GROUPS } from "./navigation";

interface LayoutPrincipalProps {
  user: AuthenticatedUser;
  onLogout: () => void;
}

interface PendingOfflineWrite {
  requestId: string;
  siteId: string;
  path?: string;
  method?: string;
  createdAt: string;
  status: "pending" | "conflict" | "rejected";
  lastError?: string;
}

const offlineWriteLabel = (path = "") => {
  if (path === "/documents") return "Document à importer";
  if (path === "/register-attachments") return "Association d’un document";
  if (path.startsWith("/register-attachments/")) return "Retrait d’une pièce jointe";
  if (path.endsWith("/attachments")) return "Pièce jointe logistique";
  if (path.includes("/access-control/alcohol-checks")) return "Contrôle alcool";
  if (path.startsWith("/courrier-movements/") && path.endsWith("/exit")) return "Sortie courrier";
  if (path.startsWith("/courrier-movements/")) return "Mouvement courrier";
  if (path === "/courrier-movements") return "Entrée courrier";
  if (path === "/main-courante") return "Main courante";
  if (path === "/vigilance") return "Lot de points de vigilance";
  if (path === "/access-control/keys") return "Sortie de clé";
  if (path.startsWith("/bicycle-movements")) return "Mouvement vélo";
  if (path.startsWith("/motorcycle-movements")) return "Mouvement moto";
  if (path.endsWith("/return")) return "Retour de clé";
  if (path.endsWith("/not-returned")) return "Clé non rendue";
  if (path.startsWith("/logistics/star-particulier")) return "Chargement logistique";
  if (path.startsWith("/logistics")) return "Saisie logistique";
  return "Saisie hors ligne";
};

export default function LayoutPrincipal({ user, onLogout }: LayoutPrincipalProps) {
  const [open, setOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [pendingLogistics, setPendingLogistics] = useState(0);
  const [rejectedOfflineWrites, setRejectedOfflineWrites] = useState(0);
  const [pendingWrites, setPendingWrites] = useState<PendingOfflineWrite[]>([]);
  const [syncingLogistics, setSyncingLogistics] = useState(false);
  const [showPendingWrites, setShowPendingWrites] = useState(false);
  const [updatingWriteId, setUpdatingWriteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    const refreshPending = async () => {
      const writes = await serviceApi.listPendingOfflineWrites().catch(() => []);
      if (active) {
        setPendingWrites(writes);
        setPendingLogistics(writes.length);
        setRejectedOfflineWrites(writes.filter((write) => write.status !== "pending").length);
      }
    };
    const synchronize = async () => {
      if (!navigator.onLine) return refreshPending();
      setSyncingLogistics(true);
      try {
        await serviceApi.syncAllPendingLogistics();
      } catch {
        // Keep queued work visible for a later retry.
      } finally {
        if (active) {
          await refreshPending();
          setSyncingLogistics(false);
        }
      }
    };
    const updateConnection = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) void synchronize();
    };
    const updateQueue = () => {
      void refreshPending();
      if (navigator.onLine) void synchronize();
    };
    const requestSync = () => { void synchronize(); };
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    window.addEventListener("securitec-offline-queue-changed", updateQueue);
    window.addEventListener("securitec-sync-offline-queue", requestSync);
    void refreshPending();
    void synchronize();
    return () => {
      active = false;
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      window.removeEventListener("securitec-offline-queue-changed", updateQueue);
      window.removeEventListener("securitec-sync-offline-queue", requestSync);
    };
  }, []);

  const role = user?.label || 'Agent Principal';

  const signOut = () => {
    onLogout();
    navigate('/login', { replace: true });
  };

  const current = SIDEBAR_GROUPS.map((g) => g.items.find((n) => n.to === location.pathname)?.label).find(Boolean) ?? "Vue d’ensemble";
  const isReportPage = location.pathname === "/dashboard/statistiques";

  const updateQueuedWrite = async (requestId: string, action: "retry" | "discard") => {
    if (action === "discard" && !(await confirmDeletion("Cette saisie hors ligne sera supprimée de cet appareil et ne sera pas envoyée à la base."))) return;
    setUpdatingWriteId(requestId);
    try {
      if (action === "retry") {
        await serviceApi.retryPendingOfflineWrite(requestId);
        await serviceApi.syncAllPendingLogistics();
      } else {
        await serviceApi.discardPendingOfflineWrite(requestId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de traiter cette saisie hors ligne.");
    } finally {
      setUpdatingWriteId(null);
    }
  };

  return (
    <div className={`workspace-shell min-h-screen flex flex-col${isReportPage ? " report-mode" : ""}`}>
      <Header
        open={open}
        setOpen={setOpen}
        current={current}
        role={role}
        userRole={user.role}
        signOut={signOut}
      />
        {!isOnline && <div role="status" className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">
          Hors connexion : les données déjà consultées restent disponibles. Les saisies prises en charge seront synchronisées au retour du réseau.
          {pendingWrites.length > 0 && <Button type="button" variant="link" className="ml-2 h-auto p-0 text-amber-950 underline" onClick={() => setShowPendingWrites((shown) => !shown)}>
            {showPendingWrites ? "Masquer la file" : `Voir la file (${pendingWrites.length})`}
          </Button>}
        </div>}
        {isOnline && (syncingLogistics || pendingLogistics > 0) && <div role="status" className="bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-950">
          {syncingLogistics ? "Synchronisation des saisies en attente…" : `${pendingLogistics} saisie(s) en attente de synchronisation.`}
          {rejectedOfflineWrites > 0 && <Button type="button" variant="link" className="ml-2 h-auto p-0 text-destructive underline" onClick={() => setShowPendingWrites((shown) => !shown)}>
            {showPendingWrites ? "Masquer les saisies à vérifier" : `${rejectedOfflineWrites} saisie(s) à vérifier`}
          </Button>}
        </div>}
        {showPendingWrites && pendingWrites.length > 0 && <section aria-label="Saisies hors ligne en attente" className="border-b bg-background px-4 py-3">
          <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Saisies hors ligne</h2>
            <Button type="button" variant="outline" size="sm" disabled={!isOnline || syncingLogistics} onClick={() => window.dispatchEvent(new Event("securitec-sync-offline-queue"))}>
              {syncingLogistics ? "Synchronisation…" : "Synchroniser"}
            </Button>
          </div>
          <ul className="mx-auto mt-2 max-w-[1600px] divide-y rounded border">
            {pendingWrites.map((write) => (
              <li key={write.requestId} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium">{offlineWriteLabel(write.path)}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{new Date(write.createdAt).toLocaleString("fr-FR")}</span>
                  <span className={`ml-2 text-xs ${write.status === "pending" ? "text-amber-700" : "text-destructive"}`}>
                    {write.status === "conflict" ? "Conflit à résoudre" : write.status === "rejected" ? "À vérifier" : "En attente"}
                  </span>
                  {write.lastError && <p className="mt-1 text-xs text-destructive">{write.lastError}</p>}
                </div>
                {write.status !== "pending" && <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={!isOnline || updatingWriteId === write.requestId} onClick={() => void updateQueuedWrite(write.requestId, "retry")}>
                    Réessayer
                  </Button>
                  <Button type="button" size="sm" variant="destructive" disabled={updatingWriteId === write.requestId} onClick={() => void updateQueuedWrite(write.requestId, "discard")}>
                    Supprimer
                  </Button>
                </div>}
              </li>
            ))}
          </ul>
        </section>}
      <div className="flex min-h-0 flex-1">
        {!isReportPage && <Sidebar
          open={open}
          setOpen={setOpen}
          user={user}
          role={role}
          signOut={signOut}
        />}
        {!isReportPage && open && <Button aria-label="Fermer le menu" variant="ghost" className="fixed inset-0 z-40 h-screen w-screen rounded-none bg-foreground/20 lg:hidden" onClick={() => setOpen(false)} />}
        <div className="min-w-0 flex-1">
          <main className="mx-auto max-w-[1800px] p-3 sm:p-4 lg:p-5">
            <Outlet />
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}
