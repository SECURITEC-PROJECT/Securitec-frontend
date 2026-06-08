import { ShieldCheck, Lock, Users } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";

const AUDIT = [
  { time: "09:45", actor: "Système", action: "Alerte ronde CP4 manquée", level: "warn" },
  { time: "09:32", actor: "Système", action: "Alerte mouvement Caméra 03", level: "warn" },
  { time: "09:12", actor: "Système", action: "Refus accès badge inconnu", level: "alert" },
  { time: "08:00", actor: "KOUASSI A.", action: "Signature prise de poste matin", level: "info" },
  { time: "07:42", actor: "RAJAONA P.", action: "Diffusion consigne PRIORITÉ HAUTE", level: "info" },
  { time: "06:00", actor: "RANDRIA T.", action: "Clôture vacation nuit + CR transmis", level: "info" },
];

export default function AuditPage() {
  return (
    <>
      <PageHeader
        title="Audit & traçabilité"
        subtitle="Logs non altérables — chaque action est horodatée et signée."
      />

      <div className="status-bar">
        <StatCard label="Actions horodatées" value={2843} sub="Sur 30 jours" tone="blue" icon={<ShieldCheck size={22} />} />
        <StatCard label="Sessions ouvertes" value={4} sub="Tous postes" tone="green" icon={<Users size={22} />} />
        <StatCard label="Échecs auth." value={3} sub="Mois en cours" tone="orange" icon={<Lock size={22} />} />
        <StatCard label="Alertes critiques" value={2} sub="Aujourd'hui" tone="red" icon={<ShieldCheck size={22} />} />
      </div>

      <Panel title="Journal d'audit (extrait)" icon={<ShieldCheck size={16} color="var(--accent)" />} badge={{ label: "IMMUTABLE", tone: "green" }}>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Heure</th><th>Acteur</th><th>Action</th><th>Niveau</th></tr>
            </thead>
            <tbody>
              {AUDIT.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{a.time}</td>
                  <td>{a.actor}</td>
                  <td>{a.action}</td>
                  <td><span className={`pill pill-${a.level === "alert" ? "red" : a.level === "warn" ? "orange" : "blue"}`}>{a.level.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
