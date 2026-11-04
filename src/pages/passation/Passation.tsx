import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FormPassation, { type PassationFormData } from "./FormPassation";
import ListPassation from "./ListPassation";
import { useSites } from "@/hooks/useSites";

import { serviceApi } from "@/lib/service-api";

type Handover = {
  id: string;
  agent_sortant_nom: string;
  agent_sortant_prenom: string;
  incoming_nom: string;
  incoming_prenom: string;
  equipment: string;
  ongoing_events: string;
  instructions: string;
  agent_sortant_matricule?: string;
  incoming_matricule?: string;
  inventaire?: PassationFormData["inventaire"];
  documents_retenus?: PassationFormData["documents_retenus"];
  confirmation_sortant?: boolean;
  confirmation_entrant?: boolean;
  confirmation_sortant_le?: string | null;
  confirmation_entrant_le?: string | null;
  poste_nom?: string;
  site_id?: string | null;
  created_at: string;
  pendingSync?: boolean;
  pendingSyncStatus?: "pending" | "conflict" | "rejected";
  pendingSyncError?: string;
};

export default function Passation() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = location.state as {
    siteId?: string;
    agentSortant?: { id?: string; nom: string; prenom: string; matricule?: string; site: string; siteId?: string; posteId?: string | null; posteNom?: string | null; shiftType?: "JOUR" | "NUIT" | null; serviceId?: string };
  } | null;
  const { sites } = useSites();
  const siteId = routeState?.agentSortant?.siteId || routeState?.siteId || sites[0]?.id || "";

  const agentSortantId = routeState?.agentSortant?.id;
  const agentSortantNom = routeState?.agentSortant?.nom || "";
  const agentSortantPrenom = routeState?.agentSortant?.prenom || "";

  const [handovers, setHandovers] = useState<Handover[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = () => serviceApi.listHandovers(siteId)
      .then((data) => { if (active) setHandovers(data); })
      .catch((err) => { if (active) console.error("Erreur chargement passations:", err); });
    const refreshQueued = () => { void refresh(); };
    void refresh();
    window.addEventListener("securitec-offline-queue-changed", refreshQueued);
    window.addEventListener("online", refreshQueued);
    return () => {
      active = false;
      window.removeEventListener("securitec-offline-queue-changed", refreshQueued);
      window.removeEventListener("online", refreshQueued);
    };
  }, [siteId]);

  const handleSave = async (f: PassationFormData) => {
    try {
      if (!routeState?.agentSortant?.serviceId || !routeState.agentSortant.siteId || !routeState.agentSortant.posteId || !routeState.agentSortant.shiftType) {
        throw new Error("Le service sortant doit être chargé depuis l’historique avant de valider la passation.");
      }
      const shiftData = {
        matricule: f.incoming_matricule,
        nom: f.incoming_nom,
        prenom: f.incoming_prenom,
        prestataire: f.incoming_prestataire || "",
        site_de_travail: routeState?.agentSortant?.site || "",
        siteId,
        posteId: routeState?.agentSortant?.posteId || "",
        posteNom: routeState?.agentSortant?.posteNom || "",
        shiftType: routeState?.agentSortant?.shiftType || "",
        chefMatricule: f.incoming_matricule,
        agentMatricules: [],
        notes: "Prise de poste automatique suite à la passation.",
      };
      const result = await serviceApi.completeHandover({
        agent_sortant_nom: agentSortantNom,
        agent_sortant_prenom: agentSortantPrenom,
        agent_sortant_matricule: routeState?.agentSortant?.matricule,
        agent_sortant_id: routeState?.agentSortant?.serviceId || agentSortantId,
        incoming_matricule: f.incoming_matricule,
        incoming_nom: f.incoming_nom,
        incoming_prenom: f.incoming_prenom,
        equipment: f.equipment,
        ongoing_events: f.ongoing_events,
        instructions: f.instructions,
        inventaire: f.inventaire,
        documents_retenus: f.documents_retenus,
        confirmation_sortant: f.confirmation_sortant,
        confirmation_entrant: f.confirmation_entrant,
        shiftData,
      }, siteId);

      if (result.pendingSync) {
        setHandovers(await serviceApi.listHandovers(siteId));
        toast.info("Passation enregistrée sur cet appareil. La clôture et l’ouverture des services seront validées ensemble après synchronisation.");
        navigate("/dashboard/prise-de-poste");
        return;
      }

      const newHandover = result.handover;
      if (newHandover) setHandovers((prev) => [newHandover, ...prev]);
      const incomingShift = result.shift;
      if (!incomingShift?.serviceId) throw new Error("Le serveur n’a pas confirmé le service entrant.");
      if (incomingShift.serviceId && routeState?.agentSortant?.siteId) {
        const posteId = incomingShift.posteId || routeState.agentSortant.posteId;
        if (posteId) {
          localStorage.setItem(`securitec-active-post:${routeState.agentSortant.siteId}`, posteId);
          localStorage.setItem(`securitec-active-shift:${routeState.agentSortant.siteId}:${posteId}`, incomingShift.serviceId);
          localStorage.setItem(`securitec-logistics-shift:${routeState.agentSortant.siteId}:${posteId}`, incomingShift.serviceId);
        }
      }

      toast.success(`Passation confirmée : ${f.incoming_nom} ${f.incoming_prenom} est maintenant en service.`);

      // Retour à la prise de poste : l'agent montant apparaît dans « En service »
      navigate("/dashboard/prise-de-poste");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erreur lors de l'enregistrement de la passation.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Passation"
        subtitle="Transmission des consignes à l'équipe montante"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <FormPassation
          siteId={siteId}
          agentSortantNom={agentSortantNom}
          agentSortantPrenom={agentSortantPrenom}
          agentSortantMatricule={routeState?.agentSortant?.matricule || ""}
          onSubmit={handleSave}
        />
        <ListPassation handovers={handovers} />
      </div>
    </div>
  );
}
