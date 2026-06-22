import { useEffect, useMemo, useState } from "react";
import { Video, ZoomIn, Download, AlertTriangle, ExternalLink } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import { api } from "../services/api";
import type { CameraExtraction } from "../types";
import { useData } from "../context/DataContext";

type AlertClip = {
  cameraId: string;
  title: string;
  detail: string;
  startTime: string;
  endTime: string;
  label: string;
};

const ALERTS: AlertClip[] = [
  {
    cameraId: "CAM3",
    title: "CAM 03 - Détection mouvement",
    detail: "Parking visiteurs - séquence",
    startTime: "09:32:17",
    endTime: "09:33:04",
    label: "Voir extrait",
  },
  {
    cameraId: "CAM1",
    title: "CAM 01 - Zone d'attente non vide",
    detail: "Hors horaires - 1 personne détectée",
    startTime: "07:54:12",
    endTime: "07:56:20",
    label: "Voir extrait",
  },
];

export default function CamerasPage() {
  const { cameras } = useData();
  const [selected, setSelected] = useState<string | null>(null);
  const [multiMode, setMultiMode] = useState(false);
  const [reason, setReason] = useState("Analyse d'incident");
  const [startTime, setStartTime] = useState("09:32");
  const [endTime, setEndTime] = useState("09:34");
  const [submitting, setSubmitting] = useState(false);
  const [extractions, setExtractions] = useState<CameraExtraction[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cameras.length > 0 && !selected) {
      setSelected(cameras[0].id);
    }
  }, [cameras, selected]);

  useEffect(() => {
    const loadExtractions = async () => {
      try {
        const data = await api.get("/cameras/extractions");
        setExtractions(data);
      } catch (err) {
        console.error("Error loading camera extractions:", err);
      }
    };

    loadExtractions();
  }, []);

  const selectedCamera = useMemo(
    () => cameras.find((camera) => camera.id === selected) || cameras[0] || null,
    [cameras, selected]
  );

  const requestExtraction = async (cameraId: string, clipStart: string, clipEnd: string, clipReason: string) => {
    setSubmitting(true);
    setMessage(null);
    try {
      const payload = {
        startTime: clipStart,
        endTime: clipEnd,
        reason: clipReason,
      };
      const created = await api.post(`/cameras/${cameraId}/extract`, payload);
      setExtractions((prev) => [created, ...prev]);
      setMessage(`Extrait enregistré pour ${created.cameraLabel}.`);
    } catch (err: any) {
      setMessage(err.message || "Impossible de créer l'extrait.");
    } finally {
      setSubmitting(false);
    }
  };

  const requestSelectedExtraction = async () => {
    if (!selectedCamera) return;
    await requestExtraction(selectedCamera.id, startTime, endTime, reason);
  };

  return (
    <>
      <PageHeader
        title="Surveillance caméras"
        subtitle="Flux IP, extraction d'extraits et archivage des événements critiques."
        actions={
          <>
            <button className={`btn-secondary ${multiMode ? "active" : ""}`} type="button" onClick={() => setMultiMode((prev) => !prev)}>
              <ZoomIn size={14} /> {multiMode ? "Mode simple" : "Mode multi"}
            </button>
            <button className="btn-primary" type="button" onClick={requestSelectedExtraction} disabled={!selectedCamera || submitting}>
              <Download size={14} /> {submitting ? "Extraction..." : "Extraire séquence"}
            </button>
          </>
        }
      />

      <div className="row2">
        <Panel title="Flux temps réel" icon={<Video size={16} color="var(--accent)" />} badge={{ label: `${cameras.length} CAMÉRAS`, tone: "green" }}>
          <div className={`cam-grid ${multiMode ? "cam-grid-multi" : ""}`}>
            {cameras.map((camera) => (
              <button
                key={camera.id}
                type="button"
                className={`cam-feed ${camera.status === "alerte" ? "alert-cam" : ""}`}
                style={selected === camera.id ? { borderColor: "var(--accent)" } : undefined}
                onClick={() => setSelected(camera.id)}
              >
                <div className="cam-bg">
                  <Video size={48} />
                </div>
                <div className="cam-overlay" />
                <div className="cam-status">
                  <span className={`cam-dot ${camera.status === "alerte" ? "cam-dot-live" : "cam-dot-ok"}`} />
                  <span className="cam-status-text">{camera.status === "alerte" ? "ALERTE" : "LIVE"}</span>
                </div>
                {camera.status === "alerte" && <span className="cam-alert-badge">MOUVEMENT</span>}
                <span className="cam-label">{camera.label}</span>
                <span className="cam-time">{new Date().toLocaleTimeString("fr-FR")}</span>
              </button>
            ))}
          </div>
        </Panel>

        <Panel title="Réglage extrait" icon={<Download size={16} color="var(--accent)" />}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Caméra sélectionnée</label>
              <input className="form-input" value={selectedCamera?.label ?? "Aucune caméra"} readOnly />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Début</label>
                <input className="form-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Fin</label>
                <input className="form-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Raison</label>
              <textarea className="form-textarea" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <button className="btn-primary" type="button" onClick={requestSelectedExtraction} disabled={!selectedCamera || submitting}>
              <Download size={14} /> Enregistrer l'extrait
            </button>
            {message && <div className="login-error">{message}</div>}
          </div>
        </Panel>
      </div>

      <Panel title="Alertes vidéo récentes" icon={<AlertTriangle size={16} color="var(--orange)" />} badge={{ label: "EXTRAITS", tone: "orange" }}>
        <ul className="flex flex-col gap-2">
          {ALERTS.map((alert) => (
            <li key={`${alert.cameraId}-${alert.startTime}`} className="access-entry ae-red">
              <span className="ae-indicator ind-red" />
              <div className="ae-info">
                <div className="ae-name">{alert.title}</div>
                <div className="ae-detail">{alert.detail} {alert.startTime} → {alert.endTime}</div>
              </div>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 10px", fontSize: "0.7rem" }}
                onClick={() => requestExtraction(alert.cameraId, alert.startTime, alert.endTime, alert.detail)}
              >
                <ExternalLink size={12} /> {alert.label}
              </button>
              <span className="ae-time">{alert.startTime.slice(0, 5)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Extraits enregistrés" icon={<Download size={16} color="var(--accent)" />} badge={{ label: `${extractions.length} RÉCENTS`, tone: "blue" }}>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Caméra</th>
                <th>Requérant</th>
                <th>Période</th>
                <th>Raison</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {extractions.map((extraction) => (
                <tr key={extraction.id}>
                  <td>{extraction.cameraLabel}</td>
                  <td>{extraction.requestedBy}</td>
                  <td>{extraction.startTime} - {extraction.endTime}</td>
                  <td style={{ color: "var(--text2)" }}>{extraction.reason}</td>
                  <td>
                    <span className={`pill ${extraction.status === "ready" ? "pill-green" : "pill-orange"}`}>
                      {extraction.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {extractions.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "var(--text3)", padding: 20 }}>
                    Aucun extrait enregistré.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
