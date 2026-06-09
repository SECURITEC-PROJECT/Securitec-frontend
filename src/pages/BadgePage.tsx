import { CreditCard, ShieldAlert } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";

const ROWS: { color: string; who: string; what: string; tone: string }[] = [
  { color: "VERT", who: "Personnel permanent SECURITEC", what: "Accès libre aux zones autorisées selon profil.", tone: "pill-green" },
  { color: "ORANGE", who: "Visiteur / Prestataire / Intérimaire", what: "Accès escorté ou limité. Badge délivré à l'accueil, restitué à la sortie.", tone: "pill-orange" },
  { color: "BLEU", who: "Direction / VIP / Invités sensibles", what: "Accès étendu. Validation préalable du superviseur.", tone: "pill-blue" },
  { color: "ROUGE", who: "Accès refusé / Badge invalide", what: "Ne JAMAIS forcer le passage. Alerte automatique superviseur.", tone: "pill-red" },
];

export default function BadgesPage() {
  return (
    <>
      <PageHeader title="Système de badges" subtitle="Module 8 du CDC — code couleur strict appliqué aux badges NFC." />

      <Panel title="Code couleur des badges" icon={<CreditCard size={16} color="var(--accent)" />}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Couleur</th><th>Qui c'est ?</th><th>Que faire ?</th></tr></thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.color}>
                  <td><span className={`pill ${r.tone}`}>{r.color}</span></td>
                  <td style={{ fontWeight: 700 }}>{r.who}</td>
                  <td style={{ color: "var(--text2)" }}>{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Règles à respecter" icon={<ShieldAlert size={16} color="var(--orange)" />}>
        <ul className="rules-list">
          <li>Tout accès <b style={{ color: "var(--red)" }}>ROUGE</b> génère une alerte automatique au superviseur — <b>ne jamais forcer le passage</b>.</li>
          <li>Un badge <b style={{ color: "var(--orange)" }}>ORANGE</b> est obligatoire pour tout visiteur ou prestataire et doit être restitué à la sortie.</li>
          <li>Si une personne refuse de s'identifier, refuser l'accès et alerter le superviseur immédiatement.</li>
          <li>Le stock de badges et le nombre réel de porteurs doivent être validés avant chaque lancement de vacation.</li>
          <li>Toute perte de badge est consignée immédiatement à la main courante et signalée au superviseur.</li>
        </ul>
      </Panel>
    </>
  );
}
