import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import TableauPriseDePoste, { type ShiftFormData } from "./TableauPriseDePoste";
import ListHistoriquePriseDePoste, { type Shift } from "./ListHistoriquePriseDePoste";

import { serviceApi } from "@/lib/service-api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PriseDePoste() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeContext = location.state as { siteId?: string; posteId?: string; posteNom?: string } | null;

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShiftForEnd, setSelectedShiftForEnd] = useState<Shift | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStartModalOpen, setIsStartModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = () => serviceApi.listShifts(undefined, { includePending: true })
      .then((data) => {
        if (!active) return;
        setShifts(data);
        for (const shift of data) {
          if (!shift.ended_at || shift.pendingSync || !shift.siteId || !shift.posteId) continue;
          for (const key of [`securitec-active-shift:${shift.siteId}:${shift.posteId}`, `securitec-logistics-shift:${shift.siteId}:${shift.posteId}`]) {
            if (localStorage.getItem(key) === (shift.serviceId || shift.id)) localStorage.removeItem(key);
          }
        }
        const activeShift = data.find((shift) => !shift.ended_at && !shift.pendingSync && shift.siteId && shift.posteId && shift.serviceId);
        const serviceId = activeShift?.serviceId;
        if (activeShift && serviceId && !localStorage.getItem(`securitec-active-shift:${activeShift.siteId}:${activeShift.posteId}`)) {
          localStorage.setItem(`securitec-active-post:${activeShift.siteId}`, activeShift.posteId);
          localStorage.setItem(`securitec-active-shift:${activeShift.siteId}:${activeShift.posteId}`, serviceId);
          localStorage.setItem(`securitec-logistics-shift:${activeShift.siteId}:${activeShift.posteId}`, serviceId);
        }
      })
      .catch((err) => {
        if (active) {
          console.error("Erreur chargement shifts:", err);
          toast.error(err instanceof Error ? err.message : "Chargement des prises de poste impossible.");
        }
      });
    const refreshQueued = () => { void refresh(); };
    void refresh();
    window.addEventListener("securitec-offline-queue-changed", refreshQueued);
    window.addEventListener("online", refreshQueued);
    return () => {
      active = false;
      window.removeEventListener("securitec-offline-queue-changed", refreshQueued);
      window.removeEventListener("online", refreshQueued);
    };
  }, []);

  const handleStart = async (data: ShiftFormData, options?: { navigateToPost?: boolean }): Promise<boolean> => {
    try {
      const result = await serviceApi.startShift({ ...data });
      const newShifts: Shift[] = Array.isArray(result.shifts) ? result.shifts : [result];
      setShifts((prev) => [...newShifts, ...prev]);
      if (result.pendingSync) {
        toast.info("Prise de poste enregistrée sur cet appareil. Elle sera confirmée après synchronisation.");
        return true;
      }
      if (result.serviceId) {
        localStorage.setItem(`securitec-active-post:${data.siteId}`, data.posteId);
        localStorage.setItem(`securitec-active-shift:${data.siteId}:${data.posteId}`, result.serviceId);
        localStorage.setItem(`securitec-logistics-shift:${data.siteId}:${data.posteId}`, result.serviceId);
      }
      toast.success(`Service ${data.shiftType.toLowerCase()} ouvert au ${data.posteNom} avec ${newShifts.length} agent(s).`);
      if (options?.navigateToPost !== false && data.posteId) navigate(`/dashboard/postes/${data.posteId}`, { state: { siteId: data.siteId, posteNom: data.posteNom } });
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer la prise de poste.");
      return false;
    }
  };

  const handleImportShift = async (data: ShiftFormData) => {
    await serviceApi.startShift({ ...data });
  };

  const refreshShifts = async () => {
    setShifts(await serviceApi.listShifts(undefined, { includePending: true }));
  };

  const handleDeleteShift = async (shift: Shift) => {
    const result = await serviceApi.deleteShift(shift.serviceId || shift.id);
    await refreshShifts();
    return result;
  };

  const handleOpenEndDialog = (shift: Shift, isOnlyOne: boolean) => {
    if (isOnlyOne) {
      // Si l'agent est le seul en service, redirection directe vers la passation
      // SANS clôturer son service à ce stade.
      toast.info("Dernier agent en service : Redirection vers la passation...");
      navigateToPassation(shift);
    } else {
      setSelectedShiftForEnd(shift);
      setIsModalOpen(true);
    }
  };

  const navigateToPassation = (shift: Shift) => {
    navigate("/dashboard/passation", {
      state: {
        agentSortant: {
          id: shift.id, // Transmis pour pouvoir clôturer lors de la confirmation
          nom: shift.nom,
          prenom: shift.prenom,
          matricule: shift.matricule,
          site: shift.site_de_travail,
          siteId: shift.siteId,
          posteId: shift.posteId,
          posteNom: shift.posteNom,
          shiftType: shift.shiftType,
          serviceId: shift.serviceId || shift.id,
        },
      },
    });
  };

  // Option 1 : Choix de faire une passation (l'agent reste actif jusqu'à validation)
  const handleChoicePassation = () => {
    if (!selectedShiftForEnd) return;
    setIsModalOpen(false);
    navigateToPassation(selectedShiftForEnd);
  };

  // Option 2 : Terminer simplement (clôture immédiate)
  const handleChoiceTerminateOnly = async () => {
    if (!selectedShiftForEnd) return;
    const serviceId = selectedShiftForEnd.serviceId || selectedShiftForEnd.id;
    const ended = await executeEndService(serviceId, selectedShiftForEnd);
    if (!ended) return;
    setIsModalOpen(false);
    setSelectedShiftForEnd(null);
    if (ended === "pending") {
      toast.info("Clôture enregistrée sur cet appareil. Le service reste en attente de confirmation serveur.");
    } else {
      toast.success(`Service terminé pour ${selectedShiftForEnd.nom} ${selectedShiftForEnd.prenom}`);
    }
  };

  const executeEndService = async (serviceId: string, shift: Shift): Promise<"confirmed" | "pending" | false> => {
    try {
      const result = await serviceApi.endShift(serviceId, shift.siteId || "");
      setShifts((prev) => prev.map((shift) => (
        shift.serviceId === serviceId || shift.id === serviceId
          ? {
            ...shift,
            ended_at: result.pendingSync ? null : result.ended_at,
            pendingSync: Boolean(result.pendingSync),
            pendingSyncAction: result.pendingSync ? "end" : undefined,
            pendingSyncStatus: result.pendingSync ? "pending" : undefined,
          }
          : shift
      )));
      if (!result.pendingSync && shift.siteId && shift.posteId) {
        for (const key of [`securitec-active-shift:${shift.siteId}:${shift.posteId}`, `securitec-logistics-shift:${shift.siteId}:${shift.posteId}`]) {
          if (localStorage.getItem(key) === serviceId) localStorage.removeItem(key);
        }
      }
      return result.pendingSync ? "pending" : "confirmed";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors de la clôture du service.");
      return false;
    }
  };

  return (
    <div className="shift-page space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <ListHistoriquePriseDePoste
          shifts={shifts}
          onNewShift={() => setIsStartModalOpen(true)}
          onOpenEndDialog={handleOpenEndDialog}
          onDeleteShift={handleDeleteShift}
          onImportShift={handleImportShift}
          onRefresh={refreshShifts}
        />
      </div>

      <Dialog open={isStartModalOpen} onOpenChange={setIsStartModalOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[1440px] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Nouvelle prise de service</DialogTitle>
            <DialogDescription>Saisissez les agents et le service dans le tableau, puis ouvrez la prise de poste.</DialogDescription>
          </DialogHeader>
          <TableauPriseDePoste
            onStart={async (data, options) => {
              const saved = await handleStart(data, options);
              if (saved) setIsStartModalOpen(false);
              return saved;
            }}
            initialSiteId={routeContext?.siteId}
            initialPosteId={routeContext?.posteId}
            initialPosteNom={routeContext?.posteNom}
          />
        </DialogContent>
      </Dialog>

      {isModalOpen && selectedShiftForEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-semibold">
              Fin de service - {selectedShiftForEnd.nom} {selectedShiftForEnd.prenom}
            </h3>
            <p className="text-sm text-muted-foreground">
              Souhaitez-vous effectuer une passation des consignes ou simplement terminer votre service ?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={handleChoicePassation} className="w-full">
                Effectuer une passation
              </Button>
              <Button variant="outline" onClick={handleChoiceTerminateOnly} className="w-full">
                Terminer simplement le travail
              </Button>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full">
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
