import { AlertTriangle, Camera, Footprints, MapPin, Nfc, ShieldAlert, Users } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";
import StatCard from "../components/ui/StatCard";

const zones = [
  { name: "Hall d’accueil", people: 12, state: "OK" },
  { name: "Zone stockage", people: 3, state: "VIGILANCE" },
  { name: "Porte Nord", people: 5, state: "OK" },
  { name: "Parking", people: 7, state: "ALERTE" },
];

const incidents = [
  { label: "Badge rouge refusé", time: "09:42", level: "Critique" },
  { label: "Ronde CP4 non validée", time: "09:18", level: "Vigilance" },
  { label: "Incident caméra A3", time: "08:56", level: "Info" },
];

export default function SupervisionPage() {
  return (
    <>
      <PageHeader
        title="Carte de supervision"
        subtitle="Vue synthétique du site : agents, rondes, points NFC et incidents critiques en un coup d’œil."
      />

      <div className="status-bar">
        <StatCard label="Agents actifs" value={3} sub="postes opérateurs" tone="blue" icon={<Users size={22} />} />
        <StatCard label="Points NFC" value={4} sub="blocs contrôlés" tone="green" icon={<Nfc size={22} />} />
        <StatCard label="Rondes en cours" value={2} sub="circuits à valider" tone="orange" icon={<Footprints size={22} />} />
        <StatCard label="Incidents" value={1} sub="alertes critiques" tone="red" icon={<AlertTriangle size={22} />} />
      </div>

      <div className="row2">
        <Panel
          title="Carte interactive du site"
          icon={<MapPin size={16} color="var(--accent)" />}
          badge={{ label: "LIVE", tone: "green" }}
        >
          <div className="site-map-card">
            <div className="site-map-zone zone-hall">Hall d’accueil</div>
            <div className="site-map-zone zone-store">Zone stockage</div>
            <div className="site-map-zone zone-park">Parking</div>
            <div className="site-map-zone zone-nfc">Point NFC A</div>
            <div className="site-map-zone zone-cam">Caméra 3</div>
            <div className="site-map-zone zone-agent">Agent 02</div>
          </div>
          <div className="quick-grid" style={{ marginTop: 10 }}>
            <span className="pill pill-green">Rondes en cours : 2</span>
            <span className="pill pill-orange">3 zones en vigilance</span>
            <span className="pill pill-red">1 incident bloquant</span>
            <span className="pill pill-blue">4 points NFC actifs</span>
          </div>
        </Panel>

        <Panel
          title="Suivi des zones"
          icon={<ShieldAlert size={16} color="var(--orange)" />}
          badge={{ label: "SURVEILLANCE", tone: "orange" }}
        >
          <div className="flex flex-col gap-2">
            {zones.map((z) => (
              <article key={z.name} className="logbook-row">
                <strong style={{ minWidth: 110 }}>{z.name}</strong>
                <span className="pill pill-blue">{z.people} personnes</span>
                <span className={`pill ${z.state === "ALERTE" ? "pill-red" : z.state === "VIGILANCE" ? "pill-orange" : "pill-green"}`}>
                  {z.state}
                </span>
              </article>
            ))}
          </div>
        </Panel>
      </div>

      <div className="row2">
        <Panel
          title="Alertes et notifications"
          icon={<AlertTriangle size={16} color="var(--red)" />}
          badge={{ label: "PUSH", tone: "red" }}
        >
          <ul className="consigne-list">
            {incidents.map((item) => (
              <li key={item.time} className="consigne-item unread">
                <div className="ci-meta">
                  <span className="ci-priority prio-high">{item.level}</span>
                  <span className="ci-time">{item.time}</span>
                </div>
                <div className="ci-text">{item.label}</div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Capteurs & points sensibles"
          icon={<Nfc size={16} color="var(--accent)" />}
          badge={{ label: "POINTS NFC", tone: "blue" }}
        >
          <div className="quick-grid">
            <div className="vacation-card"><b><Footprints size={14} /> Rondes</b><div className="vac-block">2 circuits actifs</div></div>
            <div className="vacation-card"><b><Camera size={14} /> Caméras</b><div className="vac-block">4 flux en surveillance</div></div>
            <div className="vacation-card"><b><Users size={14} /> Agents</b><div className="vac-block">3 postes opérateurs</div></div>
            <div className="vacation-card"><b><Nfc size={14} /> Badges</b><div className="vac-block">1 badge rouge signalé</div></div>
          </div>
        </Panel>
      </div>
    </>
  );
}
