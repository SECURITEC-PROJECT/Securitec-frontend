import { useMemo, useState } from "react";
import { Footprints, Play, Check, X, MapPin, FileText } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useData } from "../context/DataContext";
import type { Checkpoint, Ronde } from "../types";

const CIRCUITS: { value: string; label: string; checkpoints: Omit<Checkpoint, "id">[] }[] = [
  {
    value: "Circuit Nuit",
    label: "Circuit Nuit",
    checkpoints: [
      { name: "Portail Principal", zone: "Périmètre", status: "pending" },
      { name: "Parking Visiteurs", zone: "Extérieur", status: "pending" },
      { name: "Local Technique", zone: "Bâtiment A", status: "pending" },
      { name: "Zone Stockage", zone: "Bâtiment B", status: "pending" },
    ],
  },
  {
    value: "Circuit Jour",
    label: "Circuit Jour",
    checkpoints: [
      { name: "Accueil", zone: "Hall", status: "pending" },
      { name: "Salle Serveurs", zone: "Bâtiment A", status: "pending" },
      { name: "Parking", zone: "Extérieur", status: "pending" },
      { name: "Issue Secours Ouest", zone: "Périmètre", status: "pending" },
    ],
  },
  {
    value: "Circuit Périmétrique",
    label: "Circuit Périmétrique",
    checkpoints: [
      { name: "Portail Nord", zone: "Périmètre", status: "pending" },
      { name: "Portail Sud", zone: "Périmètre", status: "pending" },
      { name: "Clôture Est", zone: "Périmètre", status: "pending" },
      { name: "Clôture Ouest", zone: "Périmètre", status: "pending" },
    ],
  },
];

const nowTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export default function RondesPage() {
  const { user } = useAuth();
  const { rondes, addRonde, updateCheckpoint, updateRonde, addLog, addNotification } = useData();
  const [circuit, setCircuit] = useState(CIRCUITS[0].value);
  const [starting, setStarting] = useState(false);
  const [closing, setClosing] = useState(false);

  const activeRonde = useMemo(
    () => rondes.find((r) => r.status === "encours") || rondes[0] || null,
    [rondes]
  );
  const points = activeRonde ? activeRonde.checkpoints : [];

  const done = points.filter((c) => c.status === "done").length;
  const missed = points.filter((c) => c.status === "missed").length;
  const total = points.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const circuitTemplate = CIRCUITS.find((item) => item.value === circuit) || CIRCUITS[0];

  const validate = async (id: string) => {
    await updateCheckpoint(id, "done", nowTime());
  };

  const skip = async (id: string) => {
    await updateCheckpoint(id, "missed");
  };

  const startRonde = async () => {
    setStarting(true);
    const start = nowTime();
    try {
      await addRonde({
        circuit,
        start,
        agent: user?.name ?? "Agent",
        status: "encours",
        checkpoints: circuitTemplate.checkpoints.map((cp, index) => ({
          id: `CP-${Date.now().toString(36)}-${index}`,
          ...cp,
        })),
      } as Omit<Ronde, "id" | "checkpoints"> & { checkpoints: any[] });
      await addLog({
        date: new Date().toISOString().slice(0, 10),
        time: start,
        category: "ronde",
        zone: circuit,
        description: `Nouvelle ronde lancée par ${user?.name ?? "Agent"} sur ${circuit}.`,
        severity: "info",
        agent: user?.name ?? "Agent",
      });
      await addNotification({
        text: `Ronde ${circuit} lancée par ${user?.name ?? "Agent"}.`,
        time: start,
        type: "info",
      });
    } finally {
      setStarting(false);
    }
  };

  const closeRonde = async () => {
    if (!activeRonde) return;
    setClosing(true);
    const status = missed > 0 ? "retard" : "terminee";
    const time = nowTime();
    try {
      await updateRonde(activeRonde.id, { status });
      await addLog({
        date: new Date().toISOString().slice(0, 10),
        time,
        category: missed > 0 ? "alerte" : "ronde",
        zone: activeRonde.circuit,
        description: `Ronde ${activeRonde.circuit} clôturée par ${user?.name ?? "Agent"} avec ${done}/${total} points validés et ${missed} point(s) manqué(s).`,
        severity: missed > 0 ? "majeur" : "info",
        agent: user?.name ?? "Agent",
      });
      await addNotification({
        text: `Ronde ${activeRonde.circuit} clôturée (${done}/${total}).`,
        time,
        type: missed > 0 ? "warn" : "info",
      });
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Rondes digitalisées"
        subtitle="Scan des points de contrôle, horodatage automatique, rapport généré en fin de ronde."
        actions={
          <>
            <button className="btn-secondary" type="button" onClick={startRonde} disabled={starting}>
              <Play size={14} /> {starting ? "Création..." : "Nouvelle ronde"}
            </button>
            <button className="btn-primary" type="button" onClick={closeRonde} disabled={!activeRonde || done + missed < total || closing}>
              <FileText size={14} /> {closing ? "Clôture..." : "Clôturer & rapport"}
            </button>
          </>
        }
      />

      <Panel
        title="Ronde en cours"
        icon={<Footprints size={16} color="var(--accent)" />}
        badge={{ label: missed ? "RETARD" : activeRonde ? "EN COURS" : "AUCUNE", tone: missed ? "red" : "blue" }}
      >
        <div className="form-row mb-4">
          <div className="form-group">
            <label className="form-label">Circuit</label>
            <select className="form-select" value={circuit} onChange={(e) => setCircuit(e.target.value)}>
              {CIRCUITS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Progression</label>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                <div className="h-full" style={{ width: `${progress}%`, background: "linear-gradient(90deg, var(--accent), var(--green))" }} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{done}/{total}</span>
            </div>
          </div>
        </div>

        <div className="ronde-grid">
          {points.map((cp) => (
            <div key={cp.id} className={`checkpoint ${cp.status === "done" ? "done" : cp.status === "missed" ? "missed" : ""}`}>
              {cp.status === "done" && <span className="cp-check check-done"><Check size={12} /></span>}
              {cp.status === "missed" && <span className="cp-check check-miss"><X size={12} /></span>}
              <MapPin size={22} color={cp.status === "done" ? "var(--green)" : cp.status === "missed" ? "var(--red)" : "var(--accent)"} />
              <div className="cp-name">{cp.name}</div>
              <div className="cp-status">{cp.zone}{cp.time ? ` · ${cp.time}` : ""}</div>
              {cp.status === "pending" && (
                <div className="btn-row mt-3 justify-center">
                  <button type="button" className="btn-success" style={{ padding: "5px 10px", fontSize: "0.65rem" }} onClick={() => validate(cp.id)}>
                    Valider
                  </button>
                  <button type="button" className="btn-danger" style={{ padding: "5px 10px", fontSize: "0.65rem" }} onClick={() => skip(cp.id)}>
                    Manqué
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
