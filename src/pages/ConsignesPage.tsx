import { useState } from "react";
import { Mail, CheckCheck, Plus } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import { CONSIGNES } from "../data/mock";
import { useAuth } from "../context/AuthContext";
import type { Consigne } from "../types";

export default function ConsignesPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Consigne[]>(CONSIGNES);
  const [draft, setDraft] = useState({ text: "", priority: "med" as Consigne["priority"] });

  const isSupervisor = user?.role === "supervisor";

  const send = () => {
    if (!draft.text) return;
    const c: Consigne = {
      id: `C${Date.now()}`,
      from: user?.name ?? "Superviseur",
      text: draft.text,
      priority: draft.priority,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      unread: true,
      target: "all",
    };
    setList([c, ...list]);
    setDraft({ text: "", priority: "med" });
  };

  const ack = (id: string) => setList((l) => l.map((c) => (c.id === id ? { ...c, unread: false } : c)));

  return (
    <>
      <PageHeader
        title="Consignes"
        subtitle={isSupervisor ? "Diffusez des consignes aux agents en poste." : "Messages reçus du superviseur — accusé de réception obligatoire."}
      />

      {isSupervisor && (
        <Panel title="Nouvelle consigne" icon={<Plus size={16} color="var(--accent)" />}>
          <div className="form-grid">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Priorité</label>
                <select className="form-select" value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Consigne["priority"] })}>
                  <option value="low">Basse</option>
                  <option value="med">Moyenne</option>
                  <option value="high">Haute</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Destinataires</label>
                <select className="form-select"><option>Tous les agents</option><option>Agent 01</option><option>Agent 02</option><option>Agent 03</option></select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-textarea" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} placeholder="Saisissez la consigne…" />
            </div>
            <div className="btn-row">
              <button className="btn-primary" onClick={send}><Mail size={14} /> Diffuser la consigne</button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Boîte de réception" icon={<Mail size={16} color="var(--accent)" />} badge={{ label: `${list.filter((c) => c.unread).length} NON LUES`, tone: "orange" }}>
        <ul className="consigne-list">
          {list.map((c) => (
            <li key={c.id} className={`consigne-item${c.unread ? " unread" : ""}`}>
              <div className="ci-meta">
                <span className={`ci-priority prio-${c.priority}`}>{c.priority.toUpperCase()}</span>
                <span className="ci-time">{c.time}</span>
              </div>
              <div className="ci-text">{c.text}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="ci-from">— {c.from}</span>
                {c.unread && (
                  <button className="btn-secondary" style={{ padding: "5px 10px", fontSize: "0.7rem" }} onClick={() => ack(c.id)}>
                    <CheckCheck size={12} /> Accusé de réception
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
