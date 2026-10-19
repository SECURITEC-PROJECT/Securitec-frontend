import { PageHeader } from "@/components/PageHeader";
import { demo, useDemoTable } from "@/lib/demo-store";
import { useState } from "react";
import { toast } from "sonner";
import ActivePatrolPanel from "./ActivePatrolPanel";
import PatrolHistoryPanel from "./PatrolHistoryPanel";
import StartPatrolPanel from "./StartPatrolPanel";

const POINTS = ["Accueil / hall", "Parking", "Portail principal", "Issues de secours", "Local technique", "Entrepôt", "Bureaux étage", "Clôture périmétrique"];
type Cp = { name: string; at: string | null };

export default function Rondes() {
  const [route, setRoute] = useState("Ronde complète");
  const [anom, setAnom] = useState("");
  
  const data = useDemoTable("patrols");
  
  const me = { id: "agent-1" };
  const active = data.find((p) => p.agent_id === me.id && !p.ended_at);
  const cps = (active?.checkpoints as Cp[] | undefined) ?? [];

  const start = () => {
    demo.add("patrols", { route_name: route, checkpoints: POINTS.map((n) => ({ name: n, at: null })) });
    toast.success("Ronde démarrée");
  };

  const check = (i: number) => {
    if (!active) return;
    const next = cps.map((c, j) => (j === i ? { ...c, at: c.at ? null : new Date().toISOString() } : c));
    demo.update("patrols", active.id, { checkpoints: next });
  };

  const finish = () => {
    if (!active) return;
    demo.update("patrols", active.id, { ended_at: new Date().toISOString(), anomalies: anom || null });
    const done = cps.filter((c) => c.at).length;
    demo.add("logbook_entries", { 
      category: "Ronde", 
      severity: anom ? "important" : "normal", 
      description: `${active.route_name} terminée (${done}/${cps.length} points)${anom ? ` — Anomalies : ${anom}` : ""}` 
    });
    setAnom("");
    toast.success("Ronde clôturée");
  };

  const fmtTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fmt = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div>
      <PageHeader title="Rondes" subtitle="Validation des points de contrôle et signalement des anomalies" />
      <div className="grid gap-6 lg:grid-cols-2">
        {active ? (
          <ActivePatrolPanel 
            active={active}
            cps={cps}
            anom={anom}
            setAnom={setAnom}
            onCheck={check}
            onFinish={finish}
            fmtTime={fmtTime}
          />
        ) : (
          <StartPatrolPanel 
            route={route}
            setRoute={setRoute}
            pointsCount={POINTS.length}
            pointsListString={POINTS.join(", ")}
            onStart={start}
          />
        )}
        
        <PatrolHistoryPanel data={data} fmt={fmt} />
      </div>
    </div>
  );
}