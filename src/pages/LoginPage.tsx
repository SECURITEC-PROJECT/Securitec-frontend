import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, LogIn, User as UserIcon, KeyRound, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { USERS } from "../data/mock";
import type { Role } from "../types";

const ROLES: { role: Role; sub: string }[] = [
  { role: "agent1", sub: "Accueil & Admin" },
  { role: "agent2", sub: "NFC & Rondes" },
  { role: "agent3", sub: "Surveillance & CR" },
  { role: "supervisor", sub: "Superviseur" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(username, password);
    if (!res.ok) { setError(res.error ?? "Erreur de connexion"); return; }
    setError(null);
    navigate("/dashboard");
  };

  const quick = (r: Role) => {
    const u = USERS[r];
    setUsername(u.username);
    setPassword(u.password);
    setError(null);
    const res = login(u.username, u.password);
    if (res.ok) navigate("/dashboard");
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="flex items-center gap-3 mb-1">
          <span className="logo-shield"><Shield size={18} /></span>
          <span className="login-title">SECURITEC</span>
        </div>
        <p className="text-sm mb-5" style={{ color: "var(--text2)" }}>
          Poste de garde intelligent — connectez-vous avec vos identifiants opérateur.
        </p>

        <form onSubmit={submit} className="form-grid" autoComplete="off">
          <div className="form-group">
            <label className="form-label">Identifiant</label>
            <div className="input-icon">
              <UserIcon size={14} />
              <input
                className="form-input"
                placeholder="ex: agent1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <div className="input-icon">
              <KeyRound size={14} />
              <input
                type="password"
                className="form-input"
                placeholder="••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="login-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button type="submit" className="btn-primary w-full justify-center">
            <LogIn size={14} /> Connexion
          </button>
        </form>

        <div className="login-divider"><span>OU CONNEXION RAPIDE DÉMO</span></div>

        <div className="quick-grid">
          {ROLES.map((r) => {
            const u = USERS[r.role];
            return (
              <button key={r.role} className="role-card" onClick={() => quick(r.role)} type="button">
                <span className={`agent-avatar ${
                  r.role === "agent1" ? "av1" : r.role === "agent2" ? "av2" : r.role === "agent3" ? "av3" : "av4"
                }`} style={{ width: 34, height: 34, fontSize: "0.75rem" }}>
                  {r.role === "supervisor" ? "SV" : r.role.slice(-2).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="role-card-title" style={{ fontSize: "0.82rem" }}>{u.name}</div>
                  <div className="role-card-sub">{r.sub} · <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)" }}>{u.username}/{u.password}</span></div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-xs mt-5 text-center" style={{ color: "var(--text3)", fontFamily: "var(--font-mono)", letterSpacing: "1.5px" }}>
          MAQUETTE DÉMO · DONNÉES SIMULÉES · v0.2
        </div>
      </div>
    </div>
  );
}
