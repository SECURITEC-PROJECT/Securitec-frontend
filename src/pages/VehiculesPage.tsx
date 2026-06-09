import { useMemo, useState } from "react";
import { Car, Truck, Plus, Trash2, ArrowRightLeft, Search } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";
import type { VehicleMovement } from "../types";

const CATS: { v: VehicleMovement["category"]; l: string }[] = [
  { v: "leger", l: "Véhicule léger" },
  { v: "utilitaire", l: "Utilitaire" },
  { v: "poids-lourd", l: "Poids lourd" },
  { v: "moto", l: "Moto" },
];

const nowTime = () => new Date().toTimeString().slice(0, 5);
const today = () => new Date().toISOString().slice(0, 10);

export default function VehiculesPage() {
  const { vehicles, addVehicle, removeVehicle, updateVehicle } = useData();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Omit<VehicleMovement, "id">>({
    type: "entree",
    plate: "",
    category: "leger",
    driver: "",
    company: "",
    motif: "",
    parkingSpot: "",
    date: today(),
    time: nowTime(),
    agent: user?.name ?? "—",
  });

  const filtered = useMemo(() => vehicles.filter((v) =>
    [v.plate, v.driver, v.company ?? "", v.motif].some((s) => s.toLowerCase().includes(q.toLowerCase())),
  ), [vehicles, q]);

  const entrees = vehicles.filter((v) => v.type === "entree").length;
  const sorties = vehicles.filter((v) => v.type === "sortie").length;
  const onSite = Math.max(0, entrees - sorties);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.plate.trim() || !form.driver.trim()) return;
    addVehicle({ ...form, agent: user?.name ?? "—" });
    setForm({ ...form, plate: "", driver: "", company: "", motif: "", parkingSpot: "" });
  };

  return (
    <>
      <PageHeader title="Mouvements véhicules" subtitle="Module 6 du CDC — entrées, sorties et stationnement sur site." />

      <div className="status-bar">
        <StatCard label="Entrées véhicules" value={entrees} tone="green" icon={<Car size={22} />} />
        <StatCard label="Sorties véhicules" value={sorties} tone="blue" icon={<ArrowRightLeft size={22} />} />
        <StatCard label="Véhicules sur site" value={onSite} tone="orange" icon={<Truck size={22} />} />
        <StatCard label="Poids lourds présents" value={vehicles.filter(v => v.category === "poids-lourd" && v.type === "entree").length} tone="red" />
      </div>

      <div className="row3">
        <Panel title="Registre véhicules" badge={{ label: `${filtered.length}`, tone: "blue" }}
          action={
            <div className="input-icon" style={{ maxWidth: 220 }}>
              <Search size={14} />
              <input className="form-input" placeholder="Plaque, conducteur..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          }
        >
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>Heure</th><th>Sens</th><th>Plaque</th><th>Catégorie</th><th>Conducteur</th><th>Société</th><th>Place</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filtered.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{v.time}</td>
                    <td><span className={`pill ${v.type === "entree" ? "pill-green" : "pill-blue"}`}>{v.type.toUpperCase()}</span></td>
                    <td style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{v.plate}</td>
                    <td><span className="pill pill-muted">{v.category}</span></td>
                    <td>{v.driver}</td>
                    <td style={{ color: "var(--text2)" }}>{v.company || "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{v.parkingSpot || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button className="icon-btn" title="Basculer" onClick={() => updateVehicle(v.id, { type: v.type === "entree" ? "sortie" : "entree", time: nowTime() })}><ArrowRightLeft size={14} /></button>
                        <button className="icon-btn danger" onClick={() => removeVehicle(v.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 30, color: "var(--text3)" }}>Aucun véhicule.</td></tr>}
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
                <label className="form-label">Catégorie</label>
                <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as VehicleMovement["category"] })}>
                  {CATS.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Plaque *</label>
              <input className="form-input" required value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })} placeholder="0000 TAA" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Conducteur *</label>
                <input className="form-input" required value={form.driver} onChange={(e) => setForm({ ...form, driver: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Société</label>
                <input className="form-input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Motif</label>
                <input className="form-input" value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Place / Quai</label>
                <input className="form-input" value={form.parkingSpot} onChange={(e) => setForm({ ...form, parkingSpot: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn-primary justify-center"><Plus size={14} /> Enregistrer</button>
          </form>
        </Panel>
      </div>
    </>
  );
}
