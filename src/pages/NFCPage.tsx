import { useState } from "react";
import { Nfc, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import Panel from "../components/ui/Panel";
import PageHeader from "../components/ui/PageHeader";
import AccessLogList from "../components/blocks/AccessLogList";

type ScanResult = {
  status: "green" | "orange" | "red";
  title: string;
  badge: string;
  name: string;
  zone: string;
  message: string;
};

const RESULTS: ScanResult[] = [
  { status: "green", title: "ACCÈS AUTORISÉ", badge: "A-0042", name: "RAKOTO Jean", zone: "ZONE A · Toutes heures", message: "Personnel permanent — passage journalisé." },
  { status: "orange", title: "ACCÈS CONDITIONNEL", badge: "V-0003", name: "ANDRIA Paul", zone: "ZONE A · Escorte requise", message: "Visiteur — notification envoyée à Agent 01." },
  { status: "red", title: "ACCÈS REFUSÉ", badge: "X-????", name: "Inconnu", zone: "REFUS", message: "Badge non reconnu — alerte superviseur émise." },
];

export default function NFCPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);

  const simulate = (idx?: number) => {
    setScanning(true);
    setResult(null);
    setTimeout(() => {
      const r = idx !== undefined ? RESULTS[idx] : RESULTS[Math.floor(Math.random() * RESULTS.length)];
      setResult(r);
      setScanning(false);
    }, 900);
  };

  return (
    <>
      <PageHeader
        title="Contrôle d'accès NFC"
        subtitle="Lecture instantanée des badges et vérification des droits."
      />

      <div className="row3">
        <Panel
          title="Lecteur NFC"
          icon={<Nfc size={16} color="var(--accent)" />}
          badge={{ label: scanning ? "LECTURE…" : "PRÊT", tone: scanning ? "orange" : "green" }}
        >
          <div className={`nfc-demo ${scanning ? "scanning" : ""}`} onClick={() => simulate()}>
            <Nfc size={42} color="var(--accent)" />
            <div className="mt-3" style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--text)" }}>
              {scanning ? "LECTURE EN COURS…" : "APPROCHER UN BADGE"}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--text3)" }}>
              Cliquez pour simuler un scan
            </div>
          </div>

          <div className="btn-row mt-4">
            <button className="btn-success" onClick={() => simulate(0)}><CheckCircle2 size={14} /> Simuler vert</button>
            <button className="btn-secondary" onClick={() => simulate(1)}><ShieldAlert size={14} /> Simuler orange</button>
            <button className="btn-danger" onClick={() => simulate(2)}><XCircle size={14} /> Simuler refus</button>
          </div>

          {result && (
            <div
              className="mt-4 p-4 rounded-lg"
              style={{
                background: "var(--surface2)",
                border: `1px solid ${
                  result.status === "green" ? "var(--green)" : result.status === "orange" ? "var(--orange)" : "var(--red)"
                }`,
              }}
            >
              <div className="flex items-center gap-2">
                {result.status === "green" && <CheckCircle2 size={20} color="var(--green)" />}
                {result.status === "orange" && <ShieldAlert size={20} color="var(--orange)" />}
                {result.status === "red" && <XCircle size={20} color="var(--red)" />}
                <span
                  className="font-black tracking-widest"
                  style={{
                    fontFamily: "var(--font-head)",
                    color:
                      result.status === "green"
                        ? "var(--green)"
                        : result.status === "orange"
                        ? "var(--orange)"
                        : "var(--red)",
                  }}
                >
                  {result.title}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div><span style={{ color: "var(--text3)" }}>Badge :</span> <strong style={{ fontFamily: "var(--font-mono)" }}>{result.badge}</strong></div>
                <div><span style={{ color: "var(--text3)" }}>Porteur :</span> <strong>{result.name}</strong></div>
                <div className="col-span-2"><span style={{ color: "var(--text3)" }}>Droits :</span> {result.zone}</div>
                <div className="col-span-2" style={{ color: "var(--text2)" }}>{result.message}</div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Derniers passages" badge={{ label: "TEMPS RÉEL", tone: "green" }}>
          <AccessLogList limit={7} />
        </Panel>
      </div>
    </>
  );
}
