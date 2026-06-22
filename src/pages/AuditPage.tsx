import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Lock, Users } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import { api } from "../services/api";
import type { AuditEvent } from "../types";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get("/reports/audit");
        setEvents(data);
      } catch (err) {
        console.error("Error loading audit events:", err);
      }
    };

    load();
  }, []);

  const stats = useMemo(() => {
    const alerts = events.filter((event) => event.level === "alert").length;
    const warnings = events.filter((event) => event.level === "warn").length;
    const infos = events.filter((event) => event.level === "info").length;
    return { alerts, warnings, infos };
  }, [events]);

  return (
    <>
      <PageHeader
        title="Audit & traçabilité"
        subtitle="Historique consolidé des actions sensibles du site."
      />

      <div className="status-bar">
        <StatCard label="Actions horodatées" value={events.length} sub="Audit consolidé" tone="blue" icon={<ShieldCheck size={22} />} />
        <StatCard label="Alertes" value={stats.alerts} sub="Niveau critique" tone="red" icon={<Lock size={22} />} />
        <StatCard label="Alertes mineures" value={stats.warnings} sub="Niveau vigilance" tone="orange" icon={<Users size={22} />} />
        <StatCard label="Infos" value={stats.infos} sub="Actions normales" tone="green" icon={<ShieldCheck size={22} />} />
      </div>

      <Panel title="Journal d'audit (consolidé)" icon={<ShieldCheck size={16} color="var(--accent)" />} badge={{ label: "IMMUTABLE", tone: "green" }}>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Acteur</th>
                <th>Action</th>
                <th>Niveau</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>
                    {event.date ? `${event.date} ` : ""}
                    {event.time}
                  </td>
                  <td>{event.actor}</td>
                  <td>{event.action}</td>
                  <td>
                    <span className={`pill pill-${event.level === "alert" ? "red" : event.level === "warn" ? "orange" : "blue"}`}>
                      {event.level.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                    Aucun évènement d’audit disponible.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
