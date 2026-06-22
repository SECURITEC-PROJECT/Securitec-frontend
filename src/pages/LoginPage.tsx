import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, LogIn, User as UserIcon, KeyRound, AlertCircle, Lock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(username, password);
    setLoading(false);
    if (!res.ok) { setError(res.error ?? "Erreur de connexion"); return; }
    setError(null);
    navigate("/dashboard");
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

          <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
            <LogIn size={14} /> {loading ? "Connexion..." : "Connexion"}
          </button>
        </form>

        <div className="login-divider"><span>ACCÈS SÉCURISÉ</span></div>

        <div className="vacation-card" style={{ marginTop: 10 }}>
          <div className="vac-block" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Lock size={14} />
            Aucun accès rapide n'est affiché. Utilisez un identifiant réel créé dans la gestion des utilisateurs.
          </div>
        </div>

        <div className="text-xs mt-5 text-center" style={{ color: "var(--text3)", fontFamily: "var(--font-mono)", letterSpacing: "1.5px" }}>
          SECURITEC · BACKEND MYSQL · v2.0
        </div>
      </div>
    </div>
  );
}
