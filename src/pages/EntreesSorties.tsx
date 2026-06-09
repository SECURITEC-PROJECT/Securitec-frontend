import { useMemo, useState } from "react";
import { DoorOpen, DoorClosed, Plus, Trash2, Search, UserCheck, LogOut as ExitIcon } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import type { BadgeColor, PersonMovement, PersonType } from "../types";

const PERSON_TYPES: { v: PersonType; l: string }[] = [
  { v: "permanent", l: "Personnel permanent" },
  { v: "visiteur", l: "Visiteur" },
  { v: "prestataire", l: "Prestataire" },
  { v: "interimaire", l: "Intérimaire" },
];

const BADGE_COLORS: { v: BadgeColor; l: string }[] = [
  { v: "VERT", l: "VERT — Permanent" },
  { v: "ORANGE", l: "ORANGE — Visiteur / Prestataire" },
  { v: "BLEU", l: "BLEU — Direction / VIP" },
  { v: "ROUGE", l: "ROUGE — Accès refusé" },
];

function nowTime() { return new Date().toTimeString().slice(0, 5); }
function today() { return new Date().toISOString().slice(0, 10); }

export default function EntreesSortiesPage() {
  const { persons, addPerson, removePerson, updatePerson } = useData();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Omit<PersonMovement, "id">>({
    type: "entree",
    personType: "visiteur",
    fullName: "",
    badge: "",
    badgeColor: "ORANGE",
    zone: "ZONE A",
    motif: "",
    date: today(),
    time: nowTime(),
    agent: user?.name ?? "—",
  });

  const filtered = useMemo(() =>
    persons.filter((p) =>
      [p.fullName, p.badge, p.zone, p.motif ?? ""].some((v) => v.toLowerCase().includes(q.toLowerCase())),
    ), [persons, q]);

  const entrees = persons.filter((p) => p.type === "entree").length;
  const sorties = persons.filter((p) => p.type === "sortie").length;
  const presents = Math.max(0, entrees - sorties);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.badge.trim()) return;
    addPerson({ ...form, agent: user?.name ?? "—", time: form.time || nowTime() });
    setForm({ ...form, fullName: "", badge: "", motif: "" });
  };

  const toggleType = (id: string, current: PersonMovement["type"]) =>
    updatePerson(id, { type: current === "entree" ? "sortie" : "entree", time: nowTime() });

  return (
    <>
      <PageHeader
        title="Entrées / Sorties"
        subtitle="Module 4 du CDC — registre numérique des personnes (rapprochement entrée ↔ sortie)."
      />

      <div className="status-bar">
        <StatCard label="Entrées du jour" value={entrees} tone="green" icon={<DoorOpen size={22} />} />
        <StatCard label="Sorties du jour" value={sorties} tone="blue" icon={<DoorClosed size={22} />} />
        <StatCard label="Présents sur site" value={presents} tone="orange" icon={<UserCheck size={22} />} />
        <StatCard label="Badges ORANGE actifs" value={persons.filter(p => p.badgeColor === "ORANGE" && p.type === "entree").length} tone="red" sub="Visiteurs / prestataires" />
      </div>

      <div className="row3">
        <Panel title="Registre des mouvements" badge={{ label: `${filtered.length} ENTRÉES`, tone: "blue" }}
          action={
            <div className="input-icon" style={{ maxWidth: 240 }}>
              <Search size={14} />
              <input className="form-input" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          }
        >
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Heure</th><th>Sens</th><th>Personne</th><th>Type</th>
                  <th>Badge</th><th>Zone</th><th>Motif</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{p.time}</td>
                    <td>
                      <span className={`pill ${p.type === "entree" ? "pill-green" : "pill-blue"}`}>
                        {p.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{p.fullName}</td>
                    <td style={{ fontSize: "0.75rem", color: "var(--text2)" }}>{p.personType}</td>
                    <td>
                      <span className={`pill ${
                        p.badgeColor === "VERT" ? "pill-green"
                        : p.badgeColor === "ORANGE" ? "pill-orange"
                        : p.badgeColor === "BLEU" ? "pill-blue"
                        : "pill-red"}`}>
                        {p.badge}
                      </span>
                    </td>
                    <td>{p.zone}</td>
                    <td style={{ color: "var(--text2)", fontSize: "0.78rem" }}>{p.motif ?? "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Basculer sens" onClick={() => toggleType(p.id, p.type)}><ExitIcon size={14} /></button>
                        <button className="icon-btn danger" title="Supprimer" onClick={() => removePerson(p.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text3)", padding: 30 }}>Aucun mouvement.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Nouvelle saisie" icon={<Plus size={14} color="var(--accent)" />}>
          <form onSubmit={submit} className="form-grid">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Sens</label>
                <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "entree" | "sortie" })}>
                  <option value="entree">Entrée</option>
                  <option value="sortie">Sortie</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type personne</label>
                <select className="form-select" value={form.personType} onChange={(e) => setForm({ ...form, personType: e.target.value as PersonType })}>
                  {PERSON_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Nom complet *</label>
              <input className="form-input" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">N° badge *</label>
                <input className="form-input" required value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="ex: V-0010" />
              </div>
              <div className="form-group">
                <label className="form-label">Couleur badge</label>
                <select className="form-select" value={form.badgeColor} onChange={(e) => setForm({ ...form, badgeColor: e.target.value as BadgeColor })}>
                  {BADGE_COLORS.map((b) => <option key={b.v} value={b.v}>{b.l}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Zone</label>
                <select className="form-select" value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })}>
                  <option>ZONE A</option><option>ZONE B</option><option>ZONE C</option><option>PARKING</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <input className="form-input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Motif</label>
              <input className="form-input" value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} placeholder="Réunion, livraison, ..." />
            </div>
            <button type="submit" className="btn-primary justify-center"><Plus size={14} /> Enregistrer</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
