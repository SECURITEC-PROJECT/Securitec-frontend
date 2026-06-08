import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  Nfc,
  Users,
  Footprints,
  Video,
  FileText,
  Mail,
  Archive,
  ShieldCheck,
  LogOut,
  X,
} from "lucide-react";
import type { Role } from "../../types";
import { useAuth } from "../../context/AuthContext";

interface NavConfig {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  roles: Role[];
  dot?: "green" | "orange" | "red";
}

const NAV: NavConfig[] = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["agent1", "agent2", "agent3", "supervisor"], dot: "green" },
  { to: "/prise-de-poste", label: "Prise de poste", icon: ClipboardList, roles: ["agent1"] },
  { to: "/journal", label: "Journal de bord", icon: BookOpen, roles: ["agent1", "agent2", "agent3", "supervisor"] },
  { to: "/nfc", label: "Contrôle NFC", icon: Nfc, roles: ["agent2"], dot: "green" },
  { to: "/visiteurs", label: "Registre visiteurs", icon: Users, roles: ["agent1", "supervisor"] },
  { to: "/rondes", label: "Rondes digitalisées", icon: Footprints, roles: ["agent2"], dot: "orange" },
  { to: "/cameras", label: "Surveillance caméras", icon: Video, roles: ["agent3", "supervisor"], dot: "red" },
  { to: "/cr", label: "CR automatisé", icon: FileText, roles: ["agent3", "supervisor"] },
  { to: "/consignes", label: "Consignes", icon: Mail, roles: ["agent1", "agent2", "agent3", "supervisor"], dot: "orange" },
  { to: "/archivage", label: "Archivage", icon: Archive, roles: ["supervisor"] },
  { to: "/audit", label: "Audit", icon: ShieldCheck, roles: ["supervisor"] },
];

const AGENTS: { role: Role; label: string; sub: string; av: string }[] = [
  { role: "agent1", label: "Agent 01", sub: "Accueil & Admin", av: "av1" },
  { role: "agent2", label: "Agent 02", sub: "NFC & Rondes", av: "av2" },
  { role: "agent3", label: "Agent 03", sub: "Caméras & CR", av: "av3" },
  { role: "supervisor", label: "Superviseur", sub: "Site", av: "av4" },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, switchRole, logout } = useAuth();
  if (!user) return null;

  const items = NAV.filter((n) => n.roles.includes(user.role));
  // 4 premiers items pour la bottom nav mobile
  const bottomNavItems = items.slice(0, 4);

  return (
    <>
      {/* Overlay sombre sur mobile quand sidebar ouverte */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar principale */}
      <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
        {/* Header sidebar mobile */}
        <div className="sidebar-mobile-header">
          <span className="sidebar-mobile-title">MENU</span>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <div className="sidebar-section">Navigation</div>
        <nav className="sidebar-nav">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                onClick={onClose}
              >
                <span className="nav-item-icon">
                  <Icon size={15} />
                </span>
                <span className="nav-item-label">{item.label}</span>
                {item.dot && <span className={`nav-dot dot-${item.dot}`} />}
              </NavLink>
            );
          })}
        </nav>

        {/* Équipe / Switcher */}
        <div className="sidebar-section" style={{ marginTop: 14 }}>Équipe poste</div>
        <div className="sidebar-team">
          <div className="switcher-label">CHANGER DE PROFIL (DÉMO)</div>
          {AGENTS.map((a) => (
            <button
              key={a.role}
              className={`agent-btn${user.role === a.role ? " current" : ""}`}
              onClick={() => { switchRole(a.role); onClose(); }}
            >
              <span className={`agent-avatar ${a.av}`}>
                {a.role === "supervisor" ? "SV" : a.role.slice(-2).padStart(2, "0")}
              </span>
              <div className="agent-btn-info">
                <div className="agent-btn-name">{a.label}</div>
                <div className="agent-btn-sub">{a.sub}</div>
              </div>
              {user.role === a.role && <span className="agent-active-indicator" />}
            </button>
          ))}
          <button
            className="agent-btn logout-btn"
            onClick={logout}
          >
            <LogOut size={14} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Bottom Navigation — visible uniquement mobile */}
      <nav className="bottom-nav" aria-label="Navigation principale">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `bottom-nav-item${isActive ? " active" : ""}`}
            >
              <span className="bottom-nav-icon">
                <Icon size={18} />
                {item.dot && <span className={`bottom-nav-dot dot-${item.dot}`} />}
              </span>
              <span className="bottom-nav-label">{item.label.split(" ")[0]}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}