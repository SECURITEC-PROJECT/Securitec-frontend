import { useMemo, useState } from "react";
import { Search, Download, FileText } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import { useData } from "../context/DataContext";
import type { JournalEntry } from "../types";

const TYPES: JournalEntry["type"][] = ["info", "acces", "ronde", "visiteur", "alerte", "cr"];

export default function JournalPage() {
  const { journal } = useData();
  const [q, setQ] = useState("");
  const [typeF, setTypeF] = useState<string>("all");

  const list = useMemo(() => {
    return journal.filter((j) => {
      if (typeF !== "all" && j.type !== typeF) return false;
      if (q && !j.message.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [journal, q, typeF]);

  return (
    <>
      <PageHeader
        title="Journal de bord"
        subtitle="Horodatage automatique de tous les événements de la vacation."
        actions={
          <>
            <button className="btn-secondary"><Download size={14} /> CSV</button>
            <button className="btn-primary"><FileText size={14} /> Export PDF</button>
          </>
        }
      />

      <Panel title="Filtres" icon={<Search size={16} color="var(--accent)" />}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Recherche</label>
            <input
              className="form-input"
              placeholder="Mot-clé, nom, badge…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Type d'événement</label>
            <select className="form-select" value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option value="all">Tous les types</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </Panel>

      <Panel
        title="Événements"
        badge={{ label: `${list.length} ENTRÉES`, tone: "blue" }}
      >
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Heure</th>
                <th>Type</th>
                <th>Message</th>
                <th>Agent / source</th>
              </tr>
            </thead>
            <tbody>
              {list.map((j) => (
                <tr key={j.id}>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{j.time}</td>
                  <td>
                    <span className={`pill pill-${j.type === "alerte" ? "red" : j.type === "ronde" ? "orange" : j.type === "visiteur" ? "blue" : "muted"}`}>
                      {j.type}
                    </span>
                  </td>
                  <td>{j.message}</td>
                  <td style={{ color: "var(--text2)" }}>{j.agent}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>Aucun événement</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
