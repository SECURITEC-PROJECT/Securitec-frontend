import { useEffect, useState, useRef } from "react";
import { Bell, Shield, Menu, X, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NOTIFICATIONS } from "../../data/mock";

const DAYS = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
const MONTHS = ["JAN", "FÉV", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOÛ", "SEP", "OCT", "NOV", "DÉC"];

function formatClock(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}
function formatDate(d: Date) {
  return `${DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

interface TopbarProps {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
}

export default function Topbar({ onMenuToggle, sidebarOpen }: TopbarProps) {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [openNotif, setOpenNotif] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fermer le panneau notif en cliquant dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setOpenNotif(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      {/* Ligne d'accent animée en bas */}
      <div className="topbar-accent-line" />

      {/* Bouton hamburger — visible uniquement mobile */}
      <button
        className="hamburger-btn"
        onClick={onMenuToggle}
        aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Logo */}
      <div className="logo">
        <span className="logo-shield">
          <Shield size={15} />
        </span>
        <span className="logo-text">SECURITEC</span>
      </div>

      <div className="topbar-divider" />

      {/* Badge agent — masqué sur très petit écran */}
      {user && (
        <div className="agent-badge">
          <span className="agent-dot" />
          <div className="agent-badge-info">
            <div className="agent-name">{user.name.toUpperCase()}</div>
            <div className="agent-role">{user.roleLabel.toUpperCase()} · VAC {user.vacation}</div>
          </div>
        </div>
      )}

      {/* Droite */}
      <div className="topbar-right">
        {/* Date — cachée sur mobile */}
        <div className="date-badge hide-mobile">{formatDate(now)}</div>

        {/* Horloge */}
        <div className="clock">{formatClock(now)}</div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            className={`alert-btn${openNotif ? " alert-btn-open" : ""}`}
            onClick={() => setOpenNotif((v) => !v)}
            aria-label="Notifications"
          >
            <Bell size={15} />
            {NOTIFICATIONS.length > 0 && (
              <span className="alert-count">{NOTIFICATIONS.length}</span>
            )}
          </button>

          {openNotif && (
            <div className="notif-panel">
              <div className="notif-header">
                <span>NOTIFICATIONS</span>
                <span className="notif-count-badge">{NOTIFICATIONS.length}</span>
              </div>
              <ul className="notif-list">
                {NOTIFICATIONS.map((n) => (
                  <li key={n.id} className="notif-item">
                    <div className="notif-item-dot" />
                    <div className="notif-item-body">
                      <div className="notif-item-text">{n.text}</div>
                      <div className="notif-item-time">{n.time}</div>
                    </div>
                    <ChevronRight size={12} className="notif-item-arrow" />
                  </li>
                ))}
              </ul>
              <div className="notif-footer">
                <button className="notif-clear-btn">Tout marquer comme lu</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}