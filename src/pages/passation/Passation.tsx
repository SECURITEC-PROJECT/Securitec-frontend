import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import FormPassation from "./FormPassation";
import ListPassation from "./ListPassation";

const API_URL = "http://localhost:5000/api";

export default function Passation() {
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = location.state as {
    agentSortant?: { id?: number; nom: string; prenom: string; site: string };
  } | null;

  const agentSortantId = routeState?.agentSortant?.id;
  const agentSortantNom = routeState?.agentSortant?.nom || "";
  const agentSortantPrenom = routeState?.agentSortant?.prenom || "";

  const [handovers, setHandovers] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/handovers`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHandovers(data);
      })
      .catch((err) => console.error("Erreur chargement passations:", err));
  }, []);

  const handleSave = async (f: {
    incoming_nom: string;
    incoming_prenom: string;
    equipment: string;
    ongoing_events: string;
    instructions: string;
  }) => {
    try {
      // 1. Enregistrer la passation
      const responseHandover = await fetch(`${API_URL}/handovers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_sortant_nom: agentSortantNom,
          agent_sortant_prenom: agentSortantPrenom,
          incoming_nom: f.incoming_nom,
          incoming_prenom: f.incoming_prenom,
          equipment: f.equipment,
          ongoing_events: f.ongoing_events,
          instructions: f.instructions,
        }),
      });

      if (!responseHandover.ok) {
        const errData = await responseHandover.json();
        throw new Error(errData.error || "Erreur enregistrement passation");
      }

      const newHandover = await responseHandover.json();
      setHandovers((prev) => [newHandover, ...prev]);

      // 2. CLÔTURER LE SERVICE DE L'AGENT SORTANT (si son ID a été transmis)
      if (agentSortantId) {
        await fetch(`${API_URL}/shifts/${agentSortantId}/end`, {
          method: "PUT",
        });
      }

      // 3. OUVRIR AUTOMATIQUEMENT LE SERVICE DE L'AGENT MONTANT
      await fetch(`${API_URL}/shifts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: f.incoming_nom,
          prenom: f.incoming_prenom,
          prestataire: "securitec",
          site_de_travail: routeState?.agentSortant?.site || "Usine Antsirabe",
          checks: {},
          notes: "Prise de poste automatique suite à la passation.",
        }),
      });

      toast.success("Passation confirmée : Agent sortant libéré et agent montant en service !");

      setTimeout(() => {
        navigate("/dashboard/prise-de-poste");
      }, 800);
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