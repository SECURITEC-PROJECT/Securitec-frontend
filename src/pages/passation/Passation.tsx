import { PageHeader } from "@/components/PageHeader";
import { useState } from "react";
import { toast } from "sonner";
import FormPassation from "./FormPassation";
import ListPassation from "./ListPassation";

export default function Passation() {
  const [handovers, setHandovers] = useState([
    {
      id: 1,
      agent_name: "Karim Benali",
      incoming_agent: "Mickaël Rakoto",
      equipment: "Radio n°2, trousseau A",
      ongoing_events: "Livraison de colis prévue à 14h",
      instructions: "Surveiller particulièrement l'accès arrière.",
      created_at: new Date(Date.now() - 7200000).toISOString()
    }
  ]);

  const handleSave = (f: { incoming_agent: string; equipment: string; ongoing_events: string; instructions: string }) => {
    const newHandover = {
      id: Date.now(),
      agent_name: "Karim Benali",
      incoming_agent: f.incoming_agent,
      equipment: f.equipment,
      ongoing_events: f.ongoing_events,
      instructions: f.instructions,
      created_at: new Date().toISOString()
    };

    setHandovers([newHandover, ...handovers]);
    toast.success("Passation enregistrée");
  };

  return (
    <div>
      <PageHeader title="Passation" subtitle="Transmission des consignes à l'équipe montante" />
      <div className="grid gap-6 lg:grid-cols-2">
        <FormPassation onSubmit={handleSave} />
        <ListPassation handovers={handovers} />
      </div>
    </div>
  );
}