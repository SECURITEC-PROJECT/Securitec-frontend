import { Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Role } from "../types";
import { useAuth } from "../context/AuthContext";
import { USERS } from "../data/mock";

const ROLES: { role: Role; title: string; sub: string }[] = [
  { role: "agent1", title: "Agent 01 — Accueil & Administration", sub: "Visiteurs · Prise de poste · Consignes" },
  { role: "agent2", title: "Agent 02 — Contrôle NFC & Rondes", sub: "Lecteur NFC · Rondes digitalisées" },
  { role: "agent3", title: "Agent 03 — Surveillance & Rapports", sub: "Caméras · CR automatisé" },
  { role: "supervisor", title: "Superviseur SECURITEC", sub: "Dashboard global · Archivage · Audit" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const onPick = (role: Role) => {
    login(role);
    navigate("/dashboard");
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="flex items-center gap-3 mb-1">
          <span className="logo-shield"><Shield size={18} /></span>
          <span className="login-title">SECURITEC</span>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--text2)" }}>
          Poste de garde intelligent — sélectionnez votre profil pour ouvrir la session.
        </p>

        <div className="flex flex-col gap-3">
          {ROLES.map((r) => {
            const u = USERS[r.role];
            return (
              <button key={r.role} className="role-card" onClick={() => onPick(r.role)}>
                <span className={`agent-avatar ${
                  r.role === "agent1" ? "av1" : r.role === "agent2" ? "av2" : r.role === "agent3" ? "av3" : "av4"
                }`} style={{ width: 38, height: 38, fontSize: "0.8rem" }}>
                  {r.role === "supervisor" ? "SV" : r.role.slice(-2).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="role-card-title">{r.title}</div>
                  <div className="role-card-sub">{u.name} · {r.sub}</div>
                </div>
                <ChevronRight size={18} style={{ color: "var(--accent)" }} />
              </button>
            );
          })}
        </div>

        <div className="text-xs mt-6 text-center" style={{ color: "var(--text3)", fontFamily: "var(--font-mono)", letterSpacing: "1.5px" }}>
          MAQUETTE DÉMO · DONNÉES SIMULÉES · v0.1
        </div>
      </div>
    </div>
  );
}
