import { PageHeader } from "@/components/PageHeader";
import { demo, useDemoTable } from "@/lib/demo-store";
import { toast } from "sonner";
import FormMessage from "./FormMessage";
import ListMessage from "./ListMessage";

export default function Messagerie() {
  const name = (id: string) => {
    const profiles: Record<string, string> = { "agent-1": "Mickaël Rakoto", "agent-2": "Sarah Rabe", "agent-3": "Jean Ranaivo", "supervisor": "Aina Andria" };
    return profiles[id] || "Agent";
  };
  
  const me = { id: "agent-1" };
  const messages = useDemoTable("messages");
  const data = [...messages].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const send = (text: string, alert = false) => {
    const content = text.trim() || (alert ? "ALERTE — besoin de renfort immédiat" : "");
    if (!content) return;
    demo.add("messages", { content, is_alert: alert });
    if (alert) demo.add("logbook_entries", { category: "Alarme", severity: "urgent", description: `Alerte messagerie : ${content}` });
    toast.success(alert ? "Alerte ajoutée à la maquette" : "Message ajouté à la maquette");
  };

  const handleAcknowledge = (id: string) => {
    demo.update("messages", id, { acknowledged: true });
  };

  return (
    <div className="flex h-[calc(100dvh-14rem)] flex-col md:h-[calc(100dvh-12rem)]">
      <PageHeader title="Messagerie" subtitle="Échanges et consignes du poste de garde" />
      <ListMessage 
        data={data} 
        me={me} 
        name={name} 
        onAcknowledge={handleAcknowledge} 
      />
      <FormMessage onSend={send} />
    </div>
  );
}