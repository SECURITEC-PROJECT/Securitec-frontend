import { useState } from "react";
import { Activity, BadgeCheck, AlertTriangle, Footprints, Users, Nfc, ClipboardList, BellRing, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import StatCard from "../components/ui/StatCard";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import AccessLogList from "../components/blocks/AccessLogList";
import { JOURNAL, CHECKPOINTS, CONSIGNES, VISITORS } from "../data/mock";

export default function DashboardPage() {
  const { user } = useAuth();
  const [sosSent, setSosSent] = useState(false);
  if (!user) return null;

  const doneCp = CHECKPOINTS.filter((c) => c.status === "done").length;
  const missedCp = CHECKPOINTS.filter((c) => c.status === "missed").length;
  const unreadConsignes = CONSIGNES.filter((c) => c.unread).length;
  const activeVisitors = VISITORS.filter((v) => v.status === "actif").length;
  const aiSummary = `Résumé IA : ${JOURNAL.filter((j) => j.type === "alerte").length} incident(s) à surveiller, ${missedCp} ronde(s) à valider et ${activeVisitors} visiteur(s) présents.`;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        subtitle={`Bonjour ${user.name.split(" ")[0]} — vacation en cours, tout est sous contrôle.`}
      />

      <div className="status-bar">
        <StatCard label="Passages aujourd'hui" value={47} sub="+8 depuis 1h" tone="blue" icon={<Activity size={22} />} />
        <StatCard label="Badges verts actifs" value={39} sub="Personnel permanent" tone="green" icon={<BadgeCheck size={22} />} />
        <StatCard label="Visiteurs actifs" value={activeVisitors} sub="Badges orange en site" tone="orange" icon={<Users size={22} />} />
        <StatCard label="Accès refusés" value={2} sub="Alerte superviseur émise" tone="red" icon={<AlertTriangle size={22} />} />
      </div>

      <div className="row2">
        <Panel
          title="Actions rapides"
          icon={<Sparkles size={16} color="var(--accent)" />}
          badge={{ label: "NOUVEAU", tone: "green" }}
        >
          <div className="quick-grid">
            <button className="btn-danger" onClick={() => setSosSent(true)}>
              <ShieldAlert size={14} /> SOS urgence
            </button>
            <button className="btn-secondary">
              <BellRing size={14} /> Notification push
            </button>
          </div>
          <p className="ci-text" style={{ marginTop: 10 }}>
            Les alertes critiques, les rondes manquées et les badges rouges peuvent être relancées en un clic vers le superviseur.
          </p>
          {sosSent && (
            <div className="login-error" style={{ marginTop: 10 }}>
              Alerte SOS transmise au superviseur — géolocalisation et contexte d’intervention ajoutés.
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
            <div className="vac-block"><b>Suggestion :</b> prioriser la zone Parking et la ronde CP4 avant la fin de vacation.</div>
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
                  width: `${Math.round((doneCp / CHECKPOINTS.length) * 100)}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--green))",
                }}
              />
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>
              {doneCp}/{CHECKPOINTS.length}
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {CHECKPOINTS.slice(0, 5).map((cp) => (
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
            {JOURNAL.slice(0, 7).map((j) => (
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
            {CONSIGNES.slice(0, 3).map((c) => (
              <li key={c.id} className={`consigne-item${c.unread ? " unread" : ""}`}>
                <div className="ci-meta">
                  <span className={`ci-priority prio-${c.priority}`}>{c.priority.toUpperCase()}</span>
                  <span className="ci-time">{c.time}</span>
                </div>
                <div className="ci-text">{c.text}</div>
                <div className="ci-from">— {c.from}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
