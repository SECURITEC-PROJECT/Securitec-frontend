import { useState } from "react";
import { Activity, BadgeCheck, AlertTriangle, Footprints, Users, Nfc, ClipboardList, BellRing, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/ui/StatCard";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import AccessLogList from "../components/blocks/AccessLogList";
import { useData } from "../context/DataContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const { journal, rondes, consignes, visitors, accessLogs, persons, vehicles, addNotification } = useData();
  const [sosSent, setSosSent] = useState(false);

  if (!user) return null;

  const allCheckpoints = rondes.flatMap((r) => r.checkpoints);
  const doneCp = allCheckpoints.filter((c) => c.status === "done").length;
  const missedCp = allCheckpoints.filter((c) => c.status === "missed").length;
  const unreadConsignes = consignes.filter((c) => c.unread).length;
  const activeVisitors = visitors.filter((v) => v.status === "actif").length;
  const alertCount = journal.filter((j) => j.type === "alerte").length + missedCp + unreadConsignes;
  const accessCount = accessLogs.length;
  const movementCount = persons.length + vehicles.length;
  const userName = user.name.split(" ")[0];
  const aiSummary = `Résumé opérationnel : ${alertCount} alerte(s) active(s), ${missedCp} ronde(s) à corriger et ${activeVisitors} visiteur(s) présents.`;

  const nowTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const sendSos = async () => {
    await addNotification({
      text: `SOS urgence émis par ${user.name} - intervention requise.`,
      time: nowTime(),
      type: "alert",
    });
    setSosSent(true);
  };

  const sendPush = async () => {
    await addNotification({
      text: `Notification push envoyée par ${user.name}.`,
      time: nowTime(),
      type: "info",
    });
  };

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={`Bonjour ${userName} - session sécurisée, données chargées depuis MySQL.`}
      />

      <div className="status-bar">
        <StatCard label="Logs d'accès" value={accessCount} sub="Flux réel du backend" tone="blue" icon={<Activity size={22} />} />
        <StatCard label="Mouvements enregistrés" value={movementCount} sub="Personnes et véhicules" tone="green" icon={<BadgeCheck size={22} />} />
        <StatCard label="Visiteurs actifs" value={activeVisitors} sub="Badges orange en site" tone="orange" icon={<Users size={22} />} />
        <StatCard label="Alertes à traiter" value={alertCount} sub="Rondes, consignes, journal" tone="red" icon={<AlertTriangle size={22} />} />
      </div>

      <div className="row2">
        <Panel
          title="Actions rapides"
          icon={<Sparkles size={16} color="var(--accent)" />}
          badge={{ label: "NOUVEAU", tone: "green" }}
        >
          <div className="quick-grid">
            <button className="btn-danger" type="button" onClick={sendSos}>
              <ShieldAlert size={14} /> SOS urgence
            </button>
            <button className="btn-secondary" type="button" onClick={sendPush}>
              <BellRing size={14} /> Notification push
            </button>
          </div>
          <p className="ci-text" style={{ marginTop: 10 }}>
            Les alertes critiques, les rondes manquées et les badges rouges peuvent être relancées en un clic vers le superviseur.
          </p>
          {sosSent && (
            <div className="login-error" style={{ marginTop: 10 }}>
              Alerte SOS transmise au superviseur - géolocalisation et contexte d'intervention ajoutés.
            </div>
          )}
        </Panel>

        <Panel
          title="Résumé IA / synthèse"
          icon={<Sparkles size={16} color="var(--orange)" />}
          badge={{ label: "IA", tone: "orange" }}
        >
          <p className="ci-text">{aiSummary}</p>
          <div className="vacation-card" style={{ marginTop: 10 }}>
            <div className="vac-block"><b>Suggestion :</b> traiter les alertes ouvertes et valider CP4 avant la fin de vacation.</div>
          </div>
        </Panel>
      </div>

      <div className="row2">
        <Panel
          title="Derniers passages NFC"
          icon={<Nfc size={16} color="var(--accent)" />}
          badge={{ label: "TEMPS RÉEL", tone: "green" }}
        >
          <AccessLogList limit={6} />
        </Panel>

        <Panel
          title="État de la ronde en cours"
          icon={<Footprints size={16} color="var(--accent)" />}
          badge={{ label: missedCp ? "RETARD" : "OK", tone: missedCp ? "red" : "green" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
              <div
                className="h-full"
                style={{
                  width: `${allCheckpoints.length > 0 ? Math.round((doneCp / allCheckpoints.length) * 100) : 0}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--green))",
                }}
              />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
              {doneCp}/{allCheckpoints.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {allCheckpoints.slice(0, 5).map((cp) => (
              <li key={cp.id} className="flex items-center gap-2 text-sm">
                <span
                  className={`pill ${cp.status === "done" ? "pill-green" : cp.status === "missed" ? "pill-red" : "pill-muted"}`}
                >
                  {cp.status === "done" ? "OK" : cp.status === "missed" ? "MANQUÉ" : "ATTENTE"}
                </span>
                <span style={{ color: "var(--text)" }}>{cp.name}</span>
                <span style={{ marginLeft: "auto", color: "var(--text3)", fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>
                  {cp.time ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="row2">
        <Panel
          title="Activité récente"
          icon={<ClipboardList size={16} color="var(--accent)" />}
          badge={{ label: "JOURNAL", tone: "blue" }}
        >
          <ul className="flex flex-col gap-2">
            {journal.slice(0, 7).map((j) => (
              <li key={j.id} className="flex items-center gap-3 text-sm py-1">
                <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", minWidth: 44 }}>
                  {j.time}
                </span>
                <span style={{ color: "var(--text2)" }} className="flex-1">{j.message}</span>
                <span className={`pill pill-${j.type === "alerte" ? "red" : j.type === "ronde" ? "orange" : "blue"}`}>
                  {j.type}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Consignes superviseur"
          icon={<AlertTriangle size={16} color="var(--orange)" />}
          badge={{ label: `${unreadConsignes} NON LUES`, tone: "orange" }}
        >
          <ul className="consigne-list">
            {consignes.slice(0, 3).map((c) => (
              <li key={c.id} className={`consigne-item${c.unread ? " unread" : ""}`}>
                <div className="ci-meta">
                  <span className={`ci-priority prio-${c.priority}`}>{c.priority.toUpperCase()}</span>
                  <span className="ci-time">{c.time}</span>
                </div>
                <div className="ci-text">{c.text}</div>
                <div className="ci-from">- {c.from}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
