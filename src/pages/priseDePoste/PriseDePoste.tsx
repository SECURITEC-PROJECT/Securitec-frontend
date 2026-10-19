
import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { toast } from "sonner";
import FormPriseDePoste from "./FormPriseDePoste";
import ListHistoriquePriseDePoste from "./ListHistoriquePriseDePoste";

interface Shift {
  id: number;
  agent_id: number;
  agent_name: string;
  post_name: string;
  started_at: string;
  ended_at: string | null;
  checklist: Record<string, boolean>;
  notes: string;
}

const initialChecklist: Record<string, boolean> = {
  "Tenue réglementaire": true,
  "Radio / talkie-walkie testé": true,
  "Clés du site récupérées": true,
  "Lampe torche": true,
  "Téléphone de service chargé": true,
  "Registre consulté": true,
  "Vidéosurveillance opérationnelle": true,
  "Système d'alarme vérifié": true,
};

export default function PriseDePoste() {
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: 1,
      agent_id: 1,
      agent_name: "Karim Benali",
      post_name: "Poste principal",
      started_at: new Date(Date.now() - 3600000).toISOString(),
      ended_at: null,
      checklist: { ...initialChecklist },
      notes: "RAS au démarrage.",
    },
  ]);

  const me = {
    id: 1,
    name: "Karim Benali",
  };

  // Recherche le service actuellement en cours pour cet agent.
  const mine = shifts.find(
    (shift) =>
      shift.agent_id === me.id && shift.ended_at === null
  );

  // Enregistre une nouvelle prise de poste.
  const start = (
    post: string,
    checks: Record<string, boolean>,
    notes: string
  ) => {
    if (!post.trim()) {
      toast.error("Veuillez saisir le nom du poste.");
      return;
    }

    // Conserve les huit contrôles du formulaire.
    const checklist: Record<string, boolean> = {
      ...initialChecklist,
      ...checks,
    };

    const newShift: Shift = {
      id: Date.now(),
      agent_id: me.id,
      agent_name: me.name,
      post_name: post.trim(),
      started_at: new Date().toISOString(),
      ended_at: null,
      checklist,
      notes: notes.trim(),
    };

    setShifts((previous) => [newShift, ...previous]);

    toast.success("Prise de poste enregistrée");
  };

  // Enregistre la fin du service en cours.
  const end = () => {
    if (!mine) {
      toast.error("Aucun service en cours.");
      return;
    }

    setShifts((previous) =>
      previous.map((shift) =>
        shift.id === mine.id
          ? {
              ...shift,
              ended_at: new Date().toISOString(),
            }
          : shift
      )
    );

    toast.success("Fin de service enregistrée");
  };

  // Formate une date pour afficher l'heure.
  const fmt = (dateStr: string | null) => {
    if (!dateStr) {
      return "En cours";
    }

    const date = new Date(dateStr);

    if (Number.isNaN(date.getTime())) {
      return "—";
    }

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
          mine={mine}
          onStart={start}
          onEnd={end}
          fmt={fmt}
        />

        <ListHistoriquePriseDePoste
          shifts={shifts}
          fmt={fmt}
        />
      </div>
    </div>
  );
}
