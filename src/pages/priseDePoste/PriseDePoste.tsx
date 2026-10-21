import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FormPriseDePoste from "./FormPriseDePoste";
import ListHistoriquePriseDePoste, { type Shift } from "./ListHistoriquePriseDePoste";

export interface ShiftFormData {
  nom: string;
  prenom: string;
  prestataire: string;
  site_de_travail: string;
  checks: Record<string, boolean>;
  notes: string;
}

import { API_URL, authHeaders } from "@/lib/api";

export default function PriseDePoste() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = location.state as {
    agentMontant?: { nom: string; prenom: string };
  } | null;

  const initialNom = routeState?.agentMontant?.nom || "";
  const initialPrenom = routeState?.agentMontant?.prenom || "";

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShiftForEnd, setSelectedShiftForEnd] = useState<Shift | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/shifts`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setShifts(data);
      })
      .catch((err) => console.error("Erreur chargement shifts:", err));
  }, []);

  const handleStart = async (data: ShiftFormData) => {
    try {
      const response = await fetch(`${API_URL}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Erreur serveur");

      const newShift = await response.json();
      setShifts((prev) => [newShift, ...prev]);
      toast.success(`Prise de poste enregistrée pour ${data.nom} ${data.prenom}`);
    } catch (error) {
      toast.error("Impossible d'enregistrer la prise de poste.");
    }
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
          site: shift.site_de_travail,
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
    await executeEndService(selectedShiftForEnd.id);
    setIsModalOpen(false);
    toast.success(`Service terminé pour ${selectedShiftForEnd.nom} ${selectedShiftForEnd.prenom}`);
  };

  const executeEndService = async (shiftId: string) => {
    try {
      const response = await fetch(`${API_URL}/shifts/${shiftId}/end`, {
        method: "PUT",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("Erreur clôture");
      const updatedShift = await response.json();
      setShifts((prev) => prev.map((s) => (s.id === shiftId ? updatedShift : s)));
    } catch (error) {
      toast.error("Erreur lors de la clôture du service.");
    }
  };

  const fmt = (dateStr: string | null) => {
    if (!dateStr) return "En cours";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <PageHeader
        title="Prise de poste"
        subtitle="Contrôle de l'équipement et ouverture du service"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <FormPriseDePoste
          onStart={handleStart}
          initialNom={initialNom}
          initialPrenom={initialPrenom}
        />
        <ListHistoriquePriseDePoste
          shifts={shifts}
          onOpenEndDialog={handleOpenEndDialog}
          fmt={fmt}
        />
      </div>

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
