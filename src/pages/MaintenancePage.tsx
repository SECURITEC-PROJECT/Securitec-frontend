import { AlertTriangle, Camera, FileText, HardDrive, ShieldCheck, TabletSmartphone } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";

const assets = [
  { name: "Caméras site A", state: "OK", next: "Contrôle hebdo" },
  { name: "Lecteurs NFC", state: "VIGILANCE", next: "Calibration lecteur CP4" },
  { name: "Tablettes accueil", state: "OK", next: "Mise à jour 18h" },
  { name: "Réseau LAN", state: "ALERTE", next: "Redondance 4G à valider" },
  { name: "Onduleurs", state: "OK", next: "Contrôle batterie demain" },
];

const documents = [
  "Procédures d’intervention",
  "Consignes d’accès visiteurs",
  "Plan d’évacuation site",
  "Fiche de sécurité NFC",
];

export default function MaintenancePage() {
  return (
    <>
      <PageHeader
        title="Maintenance & documentation"
        subtitle="Suivi des équipements critiques et centralisation des procédures de secours et d’intervention."
      />

      <div className="row2">
        <Panel
          title="Équipements à suivre"
          icon={<ShieldCheck size={16} color="var(--accent)" />}
          badge={{ label: "MAINTENANCE", tone: "blue" }}
        >
          <div className="flex flex-col gap-2">
            {assets.map((item) => (
              <article key={item.name} className="logbook-row">
                <strong style={{ minWidth: 160 }}>{item.name}</strong>
                <span className={`pill ${item.state === "ALERTE" ? "pill-red" : item.state === "VIGILANCE" ? "pill-orange" : "pill-green"}`}>
                  {item.state}
                </span>
                <span style={{ color: "var(--text2)", fontSize: "0.75rem" }}>{item.next}</span>
              </article>
            ))}
          </div>
        </Panel>

        <Panel
          title="Documents de référence"
          icon={<FileText size={16} color="var(--orange)" />}
          badge={{ label: "DOCS", tone: "orange" }}
        >
          <ul className="consigne-list">
            {documents.map((doc) => (
              <li key={doc} className="consigne-item">
                <div className="ci-text">{doc}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="row2">
        <Panel
          title="Historique des pannes"
          icon={<AlertTriangle size={16} color="var(--red)" />}
          badge={{ label: "2 incidents", tone: "red" }}
        >
          <ul className="consigne-list">
            <li className="consigne-item unread"><div className="ci-text">Lecture NFC CP4 : anomalie détectée et remise à niveau planifiée.</div></li>
            <li className="consigne-item"><div className="ci-text">Batterie tablette accueil : remplacement effectué le 08/06.</div></li>
          </ul>
        </Panel>

        <Panel
          title="Actifs prioritaires"
          icon={<HardDrive size={16} color="var(--accent)" />}
          badge={{ label: "PRIORITÉ", tone: "green" }}
        >
          <div className="quick-grid">
            <div className="vacation-card"><b><Camera size={14} /> Caméras</b><div className="vac-block">4/4 fonctionnent</div></div>
            <div className="vacation-card"><b><TabletSmartphone size={14} /> Tablettes</b><div className="vac-block">2/2 chargées</div></div>
            <div className="vacation-card"><b><HardDrive size={14} /> LAN</b><div className="vac-block">Mode secours actif</div></div>
            <div className="vacation-card"><b><ShieldCheck size={14} /> Onduleurs</b><div className="vac-block">Autonomie 3h</div></div>
          </div>
        </Panel>
      </div>
    </>
  );
}
