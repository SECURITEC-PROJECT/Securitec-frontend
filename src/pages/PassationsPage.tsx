import { useState } from "react";
import { Repeat, PenLine, CheckCircle2, Plus } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import type { Vacation } from "../types";

const today = () => new Date().toISOString().slice(0, 10);

export default function PassationsPage() {
  const { vacations, addVacation, updateVacation } = useData();
  const { user } = useAuth();
  const [form, setForm] = useState<Omit<Vacation, "id">>({
    date: today(), shift: "jour",
    outgoingAgent: "", incomingAgent: user?.name ?? "",
    summary: "", remarks: "", pendingItems: "",
    signedOut: false, signedIn: false, status: "en-cours",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.outgoingAgent || !form.incomingAgent) return;
    addVacation(form);
    setForm({ ...form, summary: "", remarks: "", pendingItems: "" });
  };

  const validated = vacations.filter((v) => v.status === "validee").length;

  return (
    <>
      <PageHeader title="Passations de vacation" subtitle="Module 7 du CDC — relève numérique structurée et signée entre équipes." />

      <div className="status-bar">
        <StatCard label="Passations totales" value={vacations.length} tone="blue" icon={<Repeat size={22} />} />
        <StatCard label="Validées" value={validated} tone="green" icon={<CheckCircle2 size={22} />} />
        <StatCard label="En cours" value={vacations.filter(v => v.status === "en-cours").length} tone="orange" />
        <StatCard label="Non signées" value={vacations.filter(v => !v.signedIn || !v.signedOut).length} tone="red" />
      </div>

      <div className="row3">
        <Panel title="Historique des passations">
          <ul className="flex flex-col gap-3">
            {vacations.map((v) => (
              <li key={v.id} className="vacation-card">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="pill pill-blue">{v.date}</span>
                  <span className="pill pill-muted">{v.shift.toUpperCase()}</span>
                  <span className={`pill ${v.status === "validee" ? "pill-green" : v.status === "transmise" ? "pill-orange" : "pill-muted"}`}>
                    {v.status}
                  </span>
                  <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: "0.7rem", color: "var(--text3)" }}>
                    {v.outgoingAgent} → {v.incomingAgent}
                  </span>
                </div>
                <div className="vac-block"><b>Synthèse :</b> {v.summary || "—"}</div>
                <div className="vac-block"><b>Remarques :</b> {v.remarks || "—"}</div>
                <div className="vac-block"><b>En cours / à faire :</b> {v.pendingItems || "—"}</div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button className={`sig-btn ${v.signedOut ? "signed" : ""}`} onClick={() => updateVacation(v.id, { signedOut: !v.signedOut })}>
                    <PenLine size={13} /> Sortant {v.signedOut ? "signé" : "à signer"}
                  </button>
                  <button className={`sig-btn ${v.signedIn ? "signed" : ""}`} onClick={() => updateVacation(v.id, { signedIn: !v.signedIn })}>
                    <PenLine size={13} /> Entrant {v.signedIn ? "signé" : "à signer"}
                  </button>
                  {v.signedIn && v.signedOut && v.status !== "validee" && (
                    <button className="btn-success" onClick={() => updateVacation(v.id, { status: "validee" })}>
                      <CheckCircle2 size={14} /> Valider la passation
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Nouvelle passation" icon={<Plus size={14} color="var(--accent)" />}>
          <form onSubmit={submit} className="form-grid">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Vacation</label>
                <select className="form-select" value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value as "jour" | "nuit" })}>
                  <option value="jour">Jour</option>
                  <option value="nuit">Nuit</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Agent sortant *</label>
              <input className="form-input" required value={form.outgoingAgent} onChange={(e) => setForm({ ...form, outgoingAgent: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Agent entrant *</label>
              <input className="form-input" required value={form.incomingAgent} onChange={(e) => setForm({ ...form, incomingAgent: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Synthèse</label>
              <textarea className="form-textarea" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Remarques</label>
              <textarea className="form-textarea" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">En cours / à faire</label>
              <textarea className="form-textarea" value={form.pendingItems} onChange={(e) => setForm({ ...form, pendingItems: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary justify-center"><Plus size={14} /> Créer la passation</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
