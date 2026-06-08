import { useState } from "react";
import { CheckCircle2, Send, PenLine } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";

const EQUIPMENTS = [
  "Tablette agent",
  "Lecteur NFC",
  "Talkie-walkie",
  "Lampe torche",
  "Trousse premiers secours",
  "Téléphone d'astreinte",
];

export default function PriseDePostePage() {
  const { user } = useAuth();
  const [vacation, setVacation] = useState("Matin 06h–18h");
  const [effectif, setEffectif] = useState("3");
  const [etat, setEtat] = useState("RAS — Site sécurisé, tous accès opérationnels.");
  const [checks, setChecks] = useState<Record<string, boolean>>(
    Object.fromEntries(EQUIPMENTS.map((e) => [e, true])),
  );
  const [signed, setSigned] = useState(false);

  return (
    <>
      <PageHeader
        title="Prise de poste"
        subtitle="Signature électronique obligatoire avant ouverture de vacation."
      />

      <Panel
        title="Identification agent"
        icon={<PenLine size={16} color="var(--accent)" />}
        badge={{ label: signed ? "VALIDÉE" : "EN COURS", tone: signed ? "green" : "orange" }}
      >
        <div className="form-grid">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Agent</label>
              <input className="form-input" value={user?.name ?? ""} readOnly />
            </div>
            <div className="form-group">
              <label className="form-label">Matricule</label>
              <input className="form-input" value={user?.id ?? ""} readOnly />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Vacation</label>
              <select className="form-select" value={vacation} onChange={(e) => setVacation(e.target.value)}>
                <option>Matin 06h–18h</option>
                <option>Nuit 18h–06h</option>
                <option>Renfort 12h–20h</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Effectif présent</label>
              <input className="form-input" type="number" value={effectif} onChange={(e) => setEffectif(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">État du site à la prise</label>
            <textarea className="form-textarea" value={etat} onChange={(e) => setEtat(e.target.value)} />
          </div>
        </div>
      </Panel>

      <Panel title="Contrôle des équipements" icon={<CheckCircle2 size={16} color="var(--green)" />}>
        <ul className="grid grid-cols-2 gap-2">
          {EQUIPMENTS.map((e) => (
            <li key={e}>
              <label className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                <input
                  type="checkbox"
                  checked={checks[e]}
                  onChange={(ev) => setChecks((c) => ({ ...c, [e]: ev.target.checked }))}
                  style={{ accentColor: "var(--accent)" }}
                />
                <span className="text-sm">{e}</span>
                <span className={`pill ${checks[e] ? "pill-green" : "pill-red"}`} style={{ marginLeft: "auto" }}>
                  {checks[e] ? "OK" : "KO"}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Signature & transmission" icon={<Send size={16} color="var(--accent)" />}>
        <div className={`sig-pad ${signed ? "signed" : ""}`}>
          {signed ? `Signé électroniquement par ${user?.name} le ${new Date().toLocaleString("fr-FR")}` : "Zone de signature — touchez ou cliquez pour signer"}
        </div>
        <div className="btn-row mt-4">
          <button className="btn-primary" onClick={() => setSigned(true)} disabled={signed}>
            <PenLine size={14} /> Signer la prise de poste
          </button>
          <button className="btn-secondary" onClick={() => alert("Prise de poste transmise au superviseur (simulation)")} disabled={!signed}>
            <Send size={14} /> Envoyer au superviseur
          </button>
        </div>
      </Panel>
    </>
  );
}
