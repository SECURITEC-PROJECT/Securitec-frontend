import { useState } from "react";
import { Footprints, Play, Check, X, MapPin } from "lucide-react";
import type { Checkpoint } from "../types";
import PageHeader from "../components/ui/PageHeader";
import { CHECKPOINTS } from "../data/mock";
import Panel from "../components/ui/Panel";

export default function RondesPage() {
  const [circuit, setCircuit] = useState("Circuit Nuit");
  const [points, setPoints] = useState<Checkpoint[]>(CHECKPOINTS);

  const validate = (id: string) => {
    setPoints((p) =>
      p.map((c) =>
        c.id === id
          ? { ...c, status: "done", time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) }
          : c,
      ),
    );
  };
  const skip = (id: string) => {
    setPoints((p) => p.map((c) => (c.id === id ? { ...c, status: "missed" } : c)));
  };

  const done = points.filter((c) => c.status === "done").length;
  const missed = points.filter((c) => c.status === "missed").length;
  const total = points.length;

  return (
    <>
      <PageHeader
        title="Rondes digitalisées"
        subtitle="Scan des points de contrôle, horodatage automatique, rapport généré en fin de ronde."
        actions={
          <>
            <button className="btn-secondary"><Play size={14} /> Nouvelle ronde</button>
            <button className="btn-primary" disabled={done + missed < total}>
              Clôturer & rapport
            </button>
          </>
        }
      />

      <Panel title="Ronde en cours" icon={<Footprints size={16} color="var(--accent)" />} badge={{ label: missed ? "RETARD" : "EN COURS", tone: missed ? "red" : "blue" }}>
        <div className="form-row mb-4">
          <div className="form-group">
            <label className="form-label">Circuit</label>
            <select className="form-select" value={circuit} onChange={(e) => setCircuit(e.target.value)}>
              <option>Circuit Nuit</option>
              <option>Circuit Jour</option>
              <option>Circuit Périmétrique</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Progression</label>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                <div className="h-full" style={{ width: `${Math.round((done / total) * 100)}%`, background: "linear-gradient(90deg, var(--accent), var(--green))" }} />
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
                  <button className="btn-success" style={{ padding: "5px 10px", fontSize: "0.65rem" }} onClick={() => validate(cp.id)}>Valider</button>
                  <button className="btn-danger" style={{ padding: "5px 10px", fontSize: "0.65rem" }} onClick={() => skip(cp.id)}>Manqué</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
