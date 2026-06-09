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
  DoorOpen,
  Car,
  Repeat,
  CreditCard,
  Scale,
  X,
  MapPinned,
  Wrench,
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

const ALL: Role[] = ["agent1", "agent2", "agent3", "supervisor"];

const NAV: { section: string; items: NavConfig[] }[] = [
  {
    section: "Pilotage",
    items: [
      { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ALL, dot: "green" },
      { to: "/consignes", label: "Consignes", icon: Mail, roles: ALL, dot: "orange" },
    ],
  },
  {
    section: "Saisie opérateur",
    items: [
      { to: "/prise-de-poste", label: "Prise de poste", icon: ClipboardList, roles: ["agent1"] },
      { to: "/entrees-sorties", label: "Entrées / Sorties", icon: DoorOpen, roles: ["agent1", "agent2", "supervisor"] },
      { to: "/vehicules", label: "Mouvements véhicules", icon: Car, roles: ["agent1", "agent2", "supervisor"] },
      { to: "/visiteurs", label: "Registre visiteurs", icon: Users, roles: ["agent1", "supervisor"] },
      { to: "/main-courante", label: "Main courante", icon: BookOpen, roles: ALL },
      { to: "/passations", label: "Passations", icon: Repeat, roles: ALL },
    ],
  },
  {
    section: "Terrain",
    items: [
      { to: "/nfc", label: "Contrôle NFC", icon: Nfc, roles: ["agent2", "supervisor"], dot: "green" },
      { to: "/rondes", label: "Rondes digitalisées", icon: Footprints, roles: ["agent2", "supervisor"], dot: "orange" },
      { to: "/cameras", label: "Surveillance caméras", icon: Video, roles: ["agent3", "supervisor"], dot: "red" },
      { to: "/cr", label: "CR automatisé", icon: FileText, roles: ["agent3", "supervisor"] },
    ],
  },
  {
    section: "Référentiel",
    items: [
      { to: "/badges", label: "Système de badges", icon: CreditCard, roles: ALL },
      { to: "/reglement", label: "Règlement intérieur", icon: Scale, roles: ALL },
      { to: "/journal", label: "Journal de bord", icon: BookOpen, roles: ALL },
    ],
  },
  {
    section: "Supervision",
    items: [
      { to: "/supervision", label: "Carte de supervision", icon: MapPinned, roles: ["supervisor", "agent2", "agent3"], dot: "green" },
      { to: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["supervisor", "agent2", "agent3"], dot: "orange" },
      { to: "/archivage", label: "Archivage", icon: Archive, roles: ["supervisor"] },
      { to: "/audit", label: "Audit", icon: ShieldCheck, roles: ["supervisor"] },
    ],
  },
];

const AGENTS: { role: Role; label: string; sub: string; av: string }[] = [
  { role: "agent1", label: "Agent 01", sub: "Accueil & Admin", av: "av1" },
  { role: "agent2", label: "Agent 02", sub: "NFC & Rondes", av: "av2" },
  { role: "agent3", label: "Agent 03", sub: "Caméras & CR", av: "av3" },
  { role: "supervisor", label: "Superviseur", sub: "Site", av: "av4" },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, switchRole, logout } = useAuth();
  if (!user) return null;

  return (
    <aside className="sidebar">
      {onClose && (
        <div className="sidebar-mobile-head">
          <span style={{ fontFamily: "var(--font-head)", color: "var(--accent)", letterSpacing: 2 }}>MENU</span>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
      )}

      {NAV.map((group) => {
        const items = group.items.filter((n) => n.roles.includes(user.role));
        if (items.length === 0) return null;
        return (
          <div key={group.section}>
            <div className="sidebar-section">{group.section}</div>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {item.dot && <span className={`nav-dot dot-${item.dot}`} />}
                </NavLink>
              );
            })}
          </div>
        );
      })}

      <div className="sidebar-section" style={{ marginTop: 14 }}>Équipe poste</div>
      <div className="sidebar-team">
        <div className="switcher-label">CHANGER DE PROFIL (DÉMO)</div>
        {AGENTS.map((a) => (
          <button
            key={a.role}
            className={`agent-btn${user.role === a.role ? " current" : ""}`}
            onClick={() => { switchRole(a.role); onClose?.(); }}
          >
            <span className={`agent-avatar ${a.av}`}>{a.role === "supervisor" ? "SV" : a.role.slice(-2).padStart(2, "0")}</span>
            <div>
              <div style={{ fontSize: "0.78rem", fontWeight: 700 }}>{a.label}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)" }}>{a.sub}</div>
            </div>
          </button>
        ))}
        <button
          className="agent-btn"
          onClick={() => { logout(); onClose?.(); }}
          style={{ marginTop: 6, color: "var(--red)" }}
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
