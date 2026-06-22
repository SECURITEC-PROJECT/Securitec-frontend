import { useEffect, useMemo, useState } from "react";
import { Archive, Search, Download } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import { api } from "../services/api";
import type { ArchiveEntry } from "../types";

function toCsv(rows: ArchiveEntry[]) {
  const header = [
    "date",
    "shift",
    "outgoingAgent",
    "incomingAgent",
    "status",
    "eventCount",
    "incidentCount",
    "accessCount",
  ];

  const lines = rows.map((row) =>
    [
      row.date,
      row.shift,
      row.outgoingAgent,
      row.incomingAgent,
      row.status,
      row.eventCount,
      row.incidentCount,
      row.accessCount,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

export default function ArchivagePage() {
  const [archives, setArchives] = useState<ArchiveEntry[]>([]);
  const [query, setQuery] = useState("");
  const [agent, setAgent] = useState("Tous");
  const [period, setPeriod] = useState("2026-05-01");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get("/reports/archives");
        setArchives(data);
      } catch (err) {
        console.error("Error loading archives:", err);
      }
    };

    load();
  }, []);

  const filtered = useMemo(() => {
    return archives.filter((archive) => {
      const matchesAgent = agent === "Tous" || archive.outgoingAgent.includes(agent) || archive.incomingAgent.includes(agent);
      const matchesQuery =
        !query ||
        [archive.date, archive.outgoingAgent, archive.incomingAgent, archive.summary, archive.remarks, archive.status]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesPeriod = !period || archive.date >= period;
      return matchesAgent && matchesQuery && matchesPeriod;
    });
  }, [archives, agent, query, period]);

  const downloadExport = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `securitec-archives-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Archivage"
        subtitle="Historique consolidé des vacations et des événements liés."
        actions={<button className="btn-primary" type="button" onClick={downloadExport}><Download size={14} /> Export période</button>}
      />

      <Panel title="Recherche" icon={<Search size={16} color="var(--accent)" />}>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Période</label>
            <input className="form-input" type="date" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Agent</label>
            <select className="form-select" value={agent} onChange={(e) => setAgent(e.target.value)}>
              <option value="Tous">Tous</option>
              <option value="KOUASSI Anicet">KOUASSI Anicet</option>
              <option value="RABE Olivier">RABE Olivier</option>
              <option value="ANDRY Soa">ANDRY Soa</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Recherche libre</label>
            <input className="form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="date, agent, statut..." />
          </div>
        </div>
      </Panel>

      <Panel title="Comptes-rendus archivés" icon={<Archive size={16} color="var(--accent)" />} badge={{ label: `${filtered.length} ENTRÉES`, tone: "blue" }}>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Date</th>
                <th>Vacation</th>
                <th>Agent</th>
                <th>Événements</th>
                <th>Incidents</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((archive) => (
                <tr key={archive.id}>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{archive.date}</td>
                  <td>{archive.shift}</td>
                  <td>{archive.outgoingAgent} → {archive.incomingAgent}</td>
                  <td>{archive.eventCount}</td>
                  <td>
                    <span className={`pill ${archive.incidentCount > 0 ? "pill-orange" : "pill-green"}`}>
                      {archive.incidentCount}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${archive.status === "validee" ? "pill-green" : "pill-orange"}`}>
                      {archive.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn-secondary" type="button" style={{ padding: "5px 10px", fontSize: "0.7rem" }} onClick={downloadExport}>
                      Ouvrir
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", color: "var(--text3)", padding: 24 }}>
                    Aucun archivage correspondant.
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
