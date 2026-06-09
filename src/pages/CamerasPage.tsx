import { useState } from "react";
import { Video, ZoomIn, Download, AlertTriangle } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import { CAMERAS } from "../data/mock";

export default function CamerasPage() {
  const [selected, setSelected] = useState(CAMERAS[0].id);

  return (
    <>
      <PageHeader
        title="Surveillance caméras"
        subtitle="4 flux IP — détection mouvement, extraction et archivage."
        actions={
          <>
            <button className="btn-secondary"><ZoomIn size={14} /> Mode multi</button>
            <button className="btn-primary"><Download size={14} /> Extraire séquence</button>
          </>
        }
      />

      <Panel title="Flux temps réel" icon={<Video size={16} color="var(--accent)" />} badge={{ label: "4/4 LIVE", tone: "green" }}>
        <div className="cam-grid">
          {CAMERAS.map((c) => (
            <button
              key={c.id}
              className={`cam-feed ${c.status === "alerte" ? "alert-cam" : ""} ${selected === c.id ? "" : ""}`}
              style={selected === c.id ? { borderColor: "var(--accent)" } : undefined}
              onClick={() => setSelected(c.id)}
            >
              <div className="cam-bg">
                <Video size={48} />
              </div>
              <div className="cam-overlay" />
              <div className="cam-status">
                <span className={`cam-dot ${c.status === "alerte" ? "cam-dot-live" : "cam-dot-ok"}`} />
                <span className="cam-status-text">{c.status === "alerte" ? "ALERTE" : "LIVE"}</span>
              </div>
              {c.status === "alerte" && <span className="cam-alert-badge">MOUVEMENT</span>}
              <span className="cam-label">{c.label}</span>
              <span className="cam-time">{new Date().toLocaleTimeString("fr-FR")}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Alertes vidéo récentes" icon={<AlertTriangle size={16} color="var(--orange)" />}>
        <ul className="flex flex-col gap-2">
          <li className="access-entry ae-red">
            <span className="ae-indicator ind-red" />
            <div className="ae-info">
              <div className="ae-name">CAM 03 — Détection mouvement</div>
              <div className="ae-detail">Parking visiteurs — séquence 09:32:17 → 09:33:04 (47s)</div>
            </div>
            <button className="btn-secondary" style={{ padding: "6px 10px", fontSize: "0.7rem" }}>Voir extrait</button>
            <span className="ae-time">09:32</span>
          </li>
          <li className="access-entry ae-orange">
            <span className="ae-indicator ind-orange" />
            <div className="ae-info">
              <div className="ae-name">CAM 01 — Zone d'attente non vide</div>
              <div className="ae-detail">Hors horaires — 1 personne détectée</div>
            </div>
            <button className="btn-secondary" style={{ padding: "6px 10px", fontSize: "0.7rem" }}>Voir extrait</button>
            <span className="ae-time">07:55</span>
          </li>
        </ul>
      </Panel>
    </>
  );
}
