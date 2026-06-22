import { useEffect, useState } from "react";
import { Bell, Menu, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";

const DAYS = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
const MONTHS = ["JAN", "FEV", "MAR", "AVR", "MAI", "JUIN", "JUIL", "AOU", "SEP", "OCT", "NOV", "DEC"];

const formatClock = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
const formatDate = (d: Date) =>
  `${DAYS[d.getDay()]} ${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

export default function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user } = useAuth();
  const { notifications } = useData();
  const [now, setNow] = useState(new Date());
  const [openNotif, setOpenNotif] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="topbar">
      {onMenuClick && (
        <button className="alert-btn burger" onClick={onMenuClick} aria-label="Menu">
          <Menu size={18} />
        </button>
      )}
      <div className="logo">
        <span className="logo-shield"><Shield size={16} /></span>
        SECURITEC
      </div>
      <div className="topbar-divider topbar-hide-sm" />
      {user && (
        <div className="agent-badge topbar-hide-sm">
          <span className="agent-dot" />
          <div>
            <div className="agent-name">{user.name.toUpperCase()}</div>
            <div className="agent-role">{user.roleLabel.toUpperCase()} · VACATION {user.vacation}</div>
          </div>
        </div>
      )}
      <div className="topbar-right">
        <div className="date-badge topbar-hide-sm">{formatDate(now)}</div>
        <div className="clock">{formatClock(now)}</div>
        <div className="relative">
          <button className="alert-btn" onClick={() => setOpenNotif((v) => !v)} aria-label="Notifications">
            <Bell size={16} />
            {notifications.length > 0 && <span className="alert-count">{notifications.length}</span>}
          </button>
          {openNotif && (
            <div
              className="absolute right-0 mt-2 w-80 rounded-lg border z-50"
              style={{ background: "var(--surface)", borderColor: "var(--border2)" }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="font-bold tracking-widest text-sm" style={{ fontFamily: "var(--font-head)" }}>
                  NOTIFICATIONS
                </div>
              </div>
              <ul className="max-h-80 overflow-y-auto">
                {notifications.map((n) => (
                  <li key={n.id} className="px-4 py-3 border-b text-sm" style={{ borderColor: "var(--border)", color: "var(--text)" }}>
                    <div>{n.text}</div>
                    <div className="text-xs mt-1" style={{ color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
                      {n.time}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
