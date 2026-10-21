import { PageHeader } from "@/components/PageHeader";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import ActivePatrolPanel from "./ActivePatrolPanel";
import FormVigilance from "./FormVigilance";
import ListVigilance from "./ListVigilance";
import PatrolHistoryPanel from "./PatrolHistoryPanel";
import StartPatrolPanel from "./StartPatrolPanel";

const POINTS = [
  "Accueil / hall",
  "Parking",
  "Portail principal",
  "Issues de secours",
  "Local technique",
  "Entrepôt",
  "Bureaux étage",
  "Clôture périmétrique",
];

type Cp = { name: string; at: string | null };

import { API_URL } from "@/lib/api";

export default function Rondes() {
  const [activeTab, setActiveTab] = useState<"rondes" | "vigilance">("rondes");
  const [route, setRoute] = useState("Ronde complète");
  const [anom, setAnom] = useState("");
  const [patrols, setPatrols] = useState<any[]>([]);
  const [vigilanceData, setVigilanceData] = useState<any[]>([]);

  const fetchPatrols = () => {
    fetch(`${API_URL}/patrols`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPatrols(data);
      })
      .catch((err) => console.error("Erreur chargement rondes:", err));
  };

  const fetchVigilance = () => {
    fetch(`${API_URL}/vigilance`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setVigilanceData(data);
      })
      .catch((err) => console.error("Erreur chargement vigilance:", err));
  };

  useEffect(() => {
    fetchPatrols();
    fetchVigilance();
  }, []);

  const active = patrols.find((p) => !p.ended_at);
  const cps = (active?.checkpoints as Cp[] | undefined) ?? [];

  const start = async () => {
    try {
      const response = await fetch(`${API_URL}/patrols`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_name: route,
          checkpoints: POINTS.map((n) => ({ name: n, at: null })),
        }),
      });

      if (!response.ok) throw new Error("Erreur démarrage ronde");
      toast.success("Ronde démarrée avec succès !");
      fetchPatrols();
    } catch (error) {
      toast.error("Impossible de démarrer la ronde.");
    }
  };

  const check = async (i: number) => {
    if (!active) return;
    const nextCps = cps.map((c, j) => (j === i ? { ...c, at: c.at ? null : new Date().toISOString() } : c));

    try {
      const response = await fetch(`${API_URL}/patrols/${active.id}/check`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkpoints: nextCps }),
      });

      if (!response.ok) throw new Error("Erreur mise à jour zone");
      fetchPatrols();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour de la zone.");
    }
  };

  const finish = async () => {
    if (!active) return;

    try {
      const response = await fetch(`${API_URL}/patrols/${active.id}/finish`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anomalies: anom }),
      });

      if (!response.ok) throw new Error("Erreur clôture ronde");
      toast.success("Ronde clôturée avec succès !");
      setAnom("");
      fetchPatrols();
    } catch (error) {
      toast.error("Erreur lors de la clôture de la ronde.");
    }
  };

  const fmtTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patrouilles, Rondes & Points de Vigilance"
        subtitle="Suivi des rondes de sécurité et contrôles de vigilance du site"
      />

      {/* Onglets de sous-navigation */}
      <div className="flex gap-2 border-b pb-3">
        <button
          onClick={() => setActiveTab("rondes")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === "rondes"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          6 - Patrouille ou Ronde
        </button>
        <button
          onClick={() => setActiveTab("vigilance")}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            activeTab === "vigilance"
              ? "bg-primary text-primary-foreground shadow"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          }`}
        >
          7 - Points de Vigilance
        </button>
      </div>

      {activeTab === "rondes" && (
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

          <PatrolHistoryPanel data={patrols} fmt={fmtTime} />
        </div>
      )}

      {activeTab === "vigilance" && (
        <div className="space-y-6">
          <FormVigilance onRefresh={fetchVigilance} />
          <ListVigilance data={vigilanceData} />
        </div>
      )}
    </div>
  );
}