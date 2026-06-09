import { useState } from "react";
import { UserPlus, Users, LogOut } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import { VISITORS } from "../data/mock";
import type { Visitor } from "../types";

export default function VisitorsPage() {
  const [list, setList] = useState<Visitor[]>(VISITORS);
  const [form, setForm] = useState({ name: "", company: "", motif: "", host: "", duration: "1h" });

  const create = () => {
    if (!form.name) return;
    const id = `V${Date.now()}`;
    const num = String(list.length + 5).padStart(4, "0");
    const v: Visitor = {
      id,
      name: form.name,
      company: form.company,
      motif: form.motif,
      badge: `V-${num}`,
      hostAgent: form.host,
      arrival: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      expectedDuration: form.duration,
      status: "actif",
    };
    setList([v, ...list]);
    setForm({ name: "", company: "", motif: "", host: "", duration: "1h" });
  };

  const closeVisit = (id: string) => {
    setList((l) => l.map((v) => (v.id === id ? { ...v, status: "sorti" } : v)));
  };

  const active = list.filter((v) => v.status === "actif");

  return (
    <>
      <PageHeader
        title="Registre visiteurs"
        subtitle={`${active.length} visiteur(s) actuellement sur le site.`}
      />

      <Panel title="Enregistrer un visiteur" icon={<UserPlus size={16} color="var(--accent)" />}>
        <div className="form-grid">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="RANDRIA Hery" />
            </div>
            <div className="form-group">
              <label className="form-label">Société / organisme</label>
              <input className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Cabinet…" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Motif de visite</label>
              <input className="form-input" value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Rendez-vous direction" />
            </div>
            <div className="form-group">
              <label className="form-label">Personne visitée</label>
              <input className="form-input" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="Mme RAHARISOA" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Durée prévue</label>
              <select className="form-select" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
                <option>15min</option><option>30min</option><option>1h</option><option>2h</option><option>4h</option><option>Journée</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Badge attribué</label>
              <input className="form-input" value={`V-${String(list.length + 5).padStart(4, "0")} (auto)`} readOnly />
            </div>
          </div>
          <div className="btn-row">
            <button className="btn-primary" onClick={create}>
              <UserPlus size={14} /> Créer & attribuer badge
            </button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Visiteurs actifs"
        icon={<Users size={16} color="var(--orange)" />}
        badge={{ label: `${active.length} EN SITE`, tone: "orange" }}
      >
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Badge</th><th>Visiteur</th><th>Société</th><th>Motif</th><th>Hôte</th><th>Arrivée</th><th>Durée</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id}>
                  <td><span className="pill pill-orange">{v.badge}</span></td>
                  <td><strong>{v.name}</strong></td>
                  <td>{v.company}</td>
                  <td>{v.motif}</td>
                  <td style={{ color: "var(--text2)" }}>{v.hostAgent}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{v.arrival}</td>
                  <td>{v.expectedDuration}</td>
                  <td>
                    {v.status === "actif" ? (
                      <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: "0.7rem" }} onClick={() => closeVisit(v.id)}>
                        <LogOut size={12} /> Sortie
                      </button>
                    ) : (
                      <span className="pill pill-muted">SORTI</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
