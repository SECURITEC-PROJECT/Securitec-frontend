import { useMemo, useState } from "react";
import { BookOpen, Plus, Trash2, Search, AlertOctagon } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import type { LogbookEntry } from "../types";

const CATS: LogbookEntry["category"][] = ["ronde", "incident", "intervention", "livraison", "observation", "alerte"];
const SEVS: LogbookEntry["severity"][] = ["info", "mineur", "majeur", "critique"];

const sevTone = (s: LogbookEntry["severity"]) =>
  s === "critique" ? "pill-red" : s === "majeur" ? "pill-orange" : s === "mineur" ? "pill-blue" : "pill-muted";

const today = () => new Date().toISOString().slice(0, 10);
const nowTime = () => new Date().toTimeString().slice(0, 5);

export default function MainCourantePage() {
  const { logbook, addLog, removeLog } = useData();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<LogbookEntry["category"] | "tous">("tous");
  const [form, setForm] = useState<Omit<LogbookEntry, "id">>({
    date: today(), time: nowTime(), category: "observation", zone: "ZONE A",
    description: "", severity: "info", agent: user?.name ?? "—",
  });

  const filtered = useMemo(() => logbook.filter((l) =>
    (filter === "tous" || l.category === filter) &&
    [l.description, l.zone].some((v) => v.toLowerCase().includes(q.toLowerCase())),
  ), [logbook, q, filter]);

  const critical = logbook.filter((l) => l.severity === "critique" || l.severity === "majeur").length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    addLog({ ...form, agent: user?.name ?? "—" });
    setForm({ ...form, description: "" });
  };

  return (
    <>
      <PageHeader title="Main courante / Mouvements" subtitle="Module 5 du CDC — journal horodaté des événements de vacation." />

      <div className="status-bar">
        <StatCard label="Évènements journal" value={logbook.length} tone="blue" icon={<BookOpen size={22} />} />
        <StatCard label="Majeurs / Critiques" value={critical} tone="red" icon={<AlertOctagon size={22} />} />
        <StatCard label="Rondes consignées" value={logbook.filter((l) => l.category === "ronde").length} tone="green" />
        <StatCard label="Observations" value={logbook.filter((l) => l.category === "observation").length} tone="orange" />
      </div>

      <div className="row3">
        <Panel title="Journal de la vacation"
          action={
            <div className="flex gap-2 items-center flex-wrap">
              <select className="form-select" style={{ width: 140 }} value={filter} onChange={(e) => setFilter(e.target.value as LogbookEntry["category"] | "tous")}>
                <option value="tous">Toutes catégories</option>
                {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="input-icon" style={{ maxWidth: 200 }}>
                <Search size={14} />
                <input className="form-input" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
          }
        >
          <ul className="flex flex-col gap-2">
            {filtered.map((l) => (
              <li key={l.id} className="logbook-row">
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "0.75rem", minWidth: 52 }}>{l.time}</span>
                <span className="pill pill-muted">{l.category}</span>
                <span style={{ color: "var(--text2)", fontSize: "0.72rem", minWidth: 70 }}>{l.zone}</span>
                <span style={{ flex: 1, fontSize: "0.85rem" }}>{l.description}</span>
                <span className={`pill ${sevTone(l.severity)}`}>{l.severity}</span>
                <button className="icon-btn danger" onClick={() => removeLog(l.id)}><Trash2 size={14} /></button>
              </li>
            ))}
            {filtered.length === 0 && <li style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>Aucun évènement.</li>}
          </ul>
        </Panel>

        <Panel title="Ajouter un évènement" icon={<Plus size={14} color="var(--accent)" />}>
          <form onSubmit={submit} className="form-grid">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Catégorie</label>
                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as LogbookEntry["category"] })}>
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Gravité</label>
                <select className="form-select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as LogbookEntry["severity"] })}>
                  {SEVS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Zone</label>
                <input className="form-input" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <input className="form-input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-textarea" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary justify-center"><Plus size={14} /> Ajouter</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
