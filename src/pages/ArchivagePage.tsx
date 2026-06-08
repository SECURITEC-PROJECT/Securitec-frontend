import { Archive, Search, Download } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";

const ARCHIVES = [
  { date: "2026-05-05", vacation: "Nuit 18h-06h", agent: "RANDRIA Tojo", events: 38, incidents: 1, status: "Validé" },
  { date: "2026-05-05", vacation: "Matin 06h-18h", agent: "KOUASSI Anicet", events: 52, incidents: 2, status: "Validé" },
  { date: "2026-05-04", vacation: "Nuit 18h-06h", agent: "RANDRIA Tojo", events: 29, incidents: 0, status: "Validé" },
  { date: "2026-05-04", vacation: "Matin 06h-18h", agent: "KOUASSI Anicet", events: 47, incidents: 1, status: "Validé" },
  { date: "2026-05-03", vacation: "Nuit 18h-06h", agent: "RABE Olivier", events: 33, incidents: 3, status: "À revoir" },
];

export default function ArchivagePage() {
  return (
    <>
      <PageHeader
        title="Archivage"
        subtitle="Historique complet des comptes-rendus et journaux par vacation."
        actions={<button className="btn-primary"><Download size={14} /> Export période</button>}
      />

      <Panel title="Recherche" icon={<Search size={16} color="var(--accent)" />}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Période</label>
            <input className="form-input" type="date" defaultValue="2026-05-01" />
          </div>
          <div className="form-group">
            <label className="form-label">Agent</label>
            <select className="form-select"><option>Tous</option><option>KOUASSI Anicet</option><option>RABE Olivier</option><option>ANDRY Soa</option></select>
          </div>
        </div>
      </Panel>

      <Panel title="Comptes-rendus archivés" icon={<Archive size={16} color="var(--accent)" />} badge={{ label: `${ARCHIVES.length} ENTRÉES`, tone: "blue" }}>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th><th>Vacation</th><th>Agent</th><th>Événements</th><th>Incidents</th><th>Statut</th><th></th>
              </tr>
            </thead>
            <tbody>
              {ARCHIVES.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{a.date}</td>
                  <td>{a.vacation}</td>
                  <td>{a.agent}</td>
                  <td>{a.events}</td>
                  <td>{a.incidents > 0 ? <span className="pill pill-orange">{a.incidents}</span> : <span className="pill pill-green">0</span>}</td>
                  <td><span className={`pill ${a.status === "Validé" ? "pill-green" : "pill-orange"}`}>{a.status}</span></td>
                  <td><button className="btn-secondary" style={{ padding: "5px 10px", fontSize: "0.7rem" }}>Ouvrir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
