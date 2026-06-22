import { useState } from "react";
import { FileText, Send, PenLine, Download } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import { useData } from "../context/DataContext";
import { useAuth } from "../context/AuthContext";

export default function CRPage() {
  const { user } = useAuth();
  const { journal, visitors, rondes } = useData();
  const [comment, setComment] = useState("Vacation calme. Une alerte mineure refus NFC traitée en interne. RAS sur les rondes hormis CP4 reporté.");
  const [signed, setSigned] = useState(false);

  const events = journal.slice(0, 6);
  const visiteurs = visitors.length;
  const incidents = journal.filter((j) => j.type === "alerte").length;
  
  const allCheckpoints = rondes.flatMap(r => r.checkpoints);
  const rondesOk = allCheckpoints.filter((c) => c.status === "done").length;
  const checkpointsCount = allCheckpoints.length;

  return (
    <>
      <PageHeader
        title="Compte-rendu de vacation"
        subtitle="Pré-rempli automatiquement à partir du journal, des visiteurs et des rondes."
        actions={
          <>
            <button className="btn-secondary"><Download size={14} /> Générer PDF</button>
            <button className="btn-primary" disabled={!signed}><Send size={14} /> Envoyer superviseur</button>
          </>
        }
      />

      <Panel title="En-tête" icon={<FileText size={16} color="var(--accent)" />} badge={{ label: signed ? "SIGNÉ" : "BROUILLON", tone: signed ? "green" : "orange" }}>
        <div className="grid grid-cols-3 gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))" }}>
          <Field label="Vacation" value="06h–18h" />
          <Field label="Site" value="SECURITEC HQ — Antananarivo" />
          <Field label="Date" value={new Date().toLocaleDateString("fr-FR")} />
          <Field label="Agent rédacteur" value={user?.name ?? "-"} />
          <Field label="Visiteurs reçus" value={String(visiteurs)} />
          <Field label="Incidents" value={String(incidents)} />
        </div>
      </Panel>

      <div className="row2">
        <Panel title="Événements intégrés" badge={{ label: `${events.length} ENTRÉES`, tone: "blue" }}>
          <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {events.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-3 py-2 rounded-md" style={{ background: "var(--surface2)" }}>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: "0.72rem", minWidth: 44 }}>{e.time}</span>
                <span className="flex-1 text-sm" style={{ color: "var(--text)" }}>{e.message}</span>
                <span className={`pill pill-${e.type === "alerte" ? "red" : e.type === "ronde" ? "orange" : "blue"}`}>{e.type}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Synthèse rondes & visiteurs">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rondes effectuées" value={`${rondesOk}/${checkpointsCount} points`} />
            <Field label="Refus NFC" value="2" />
            <Field label="Visiteurs reçus" value={String(visiteurs)} />
            <Field label="Alertes vidéo" value="1" />
          </div>
          <div className="form-group mt-4">
            <label className="form-label">Commentaire libre de l'agent</label>
            <textarea className="form-textarea" value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
        </Panel>
      </div>

      <Panel title="Signature numérique" icon={<PenLine size={16} color="var(--accent)" />}>
        <div className={`sig-pad ${signed ? "signed" : ""}`}>
          {signed ? `Signé par ${user?.name} — ${new Date().toLocaleString("fr-FR")}` : "Toucher pour signer le CR"}
        </div>
        <div className="btn-row mt-4">
          <button className="btn-primary" onClick={() => setSigned(true)} disabled={signed}>
            <PenLine size={14} /> Signer le CR
          </button>
        </div>
      </Panel>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2 rounded-md" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
      <div className="text-xs" style={{ color: "var(--text3)", fontFamily: "var(--font-mono)", letterSpacing: "1px" }}>{label.toUpperCase()}</div>
      <div className="text-sm font-bold mt-1" style={{ color: "var(--text)" }}>{value}</div>
    </div>
  );
}
