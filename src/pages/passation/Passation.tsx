import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FormPassation, { type PassationFormData } from "./FormPassation";
import ListPassation from "./ListPassation";

import { API_URL, authHeaders } from "@/lib/api";

type Handover = {
  id: number;
  agent_sortant_nom: string;
  agent_sortant_prenom: string;
  incoming_nom: string;
  incoming_prenom: string;
  equipment: string;
  ongoing_events: string;
  instructions: string;
  created_at: string;
};

export default function Passation() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = location.state as {
    agentSortant?: { id?: string; nom: string; prenom: string; site: string };
  } | null;

  const agentSortantId = routeState?.agentSortant?.id;
  const agentSortantNom = routeState?.agentSortant?.nom || "";
  const agentSortantPrenom = routeState?.agentSortant?.prenom || "";

  const [handovers, setHandovers] = useState<Handover[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/handovers`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHandovers(data);
      })
      .catch((err) => console.error("Erreur chargement passations:", err));
  }, []);

  const handleSave = async (f: PassationFormData) => {
    try {
      // 1. Enregistrer la passation
      const responseHandover = await fetch(`${API_URL}/handovers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          agent_sortant_nom: agentSortantNom,
          agent_sortant_prenom: agentSortantPrenom,
          agent_sortant_id: agentSortantId,
          incoming_matricule: f.incoming_matricule,
          incoming_nom: f.incoming_nom,
          incoming_prenom: f.incoming_prenom,
          equipment: f.equipment,
          ongoing_events: f.ongoing_events,
          instructions: f.instructions,
        }),
      });

      if (!responseHandover.ok) {
        const errData = await responseHandover.json().catch(() => ({}));
        throw new Error(errData.error || "Erreur enregistrement passation");
      }

      const newHandover = await responseHandover.json();
      setHandovers((prev) => [newHandover, ...prev]);

      // 2. METTRE L'AGENT MONTANT EN SERVICE (même site que l'agent sortant)
      const responseShift = await fetch(`${API_URL}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          matricule: f.incoming_matricule,
          nom: f.incoming_nom,
          prenom: f.incoming_prenom,
          prestataire: f.incoming_prestataire || "SECURITEC",
          site_de_travail: routeState?.agentSortant?.site || "Usine Antsirabe",
          notes: "Prise de poste automatique suite à la passation.",
        }),
      });

      if (!responseShift.ok) {
        const errData = await responseShift.json().catch(() => ({}));
        // L'agent sortant reste en service tant que l'agent montant n'est pas enregistré
        throw new Error(errData.error || "Impossible de mettre l'agent montant en service.");
      }

      // 3. CLÔTURER LE SERVICE DE L'AGENT SORTANT (si son ID a été transmis)
      if (agentSortantId) {
        const responseEnd = await fetch(`${API_URL}/shifts/${agentSortantId}/end`, {
          method: "PUT",
          headers: authHeaders(),
        });
        if (!responseEnd.ok) {
          toast.warning("L'agent montant est en service, mais le service de l'agent sortant n'a pas pu être clôturé.");
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
          agentSortantNom={agentSortantNom}
          agentSortantPrenom={agentSortantPrenom}
          onSubmit={handleSave}
        />
        <ListPassation handovers={handovers} />
      </div>
    </div>
  );
}