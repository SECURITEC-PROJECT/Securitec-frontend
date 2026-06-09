import { BookCheck, Scale } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Panel from "../components/ui/Panel";

const RULES: { rule: string; detail: string; level: "OBLIGATOIRE" | "INFO" }[] = [
  { rule: "Connexion personnelle", detail: "Chaque agent se connecte avec son propre identifiant. Aucun partage de compte toléré.", level: "OBLIGATOIRE" },
  { rule: "Horodatage et signature", detail: "Toute saisie est horodatée et signée par l'agent connecté (traçabilité non répudiable).", level: "OBLIGATOIRE" },
  { rule: "Champs obligatoires", detail: "Les champs obligatoires bloquent la validation tant qu'ils ne sont pas renseignés.", level: "OBLIGATOIRE" },
  { rule: "Compte rendu de vacation", detail: "Le CR doit être complété, signé et envoyé AVANT la fin de chaque vacation. Un CR incomplet est invalide.", level: "OBLIGATOIRE" },
  { rule: "Passation de poste", detail: "La fiche de passation doit être finalisée et signée par les deux agents — sortant et entrant.", level: "OBLIGATOIRE" },
  { rule: "Confidentialité", detail: "Les données (visiteurs, vidéos, journaux) sont confidentielles et réservées aux personnes habilitées.", level: "OBLIGATOIRE" },
  { rule: "Alerte refus d'accès", detail: "Tout accès refusé (badge ROUGE) doit être signalé sans délai au superviseur — ne jamais forcer.", level: "OBLIGATOIRE" },
  { rule: "Suppléance", detail: "Un agent peut couvrir un rôle voisin selon la matrice de suppléance validée par la Direction.", level: "INFO" },
  { rule: "Délai de ronde", detail: "Un point de contrôle non scanné dans le délai imparti déclenche une alerte superviseur.", level: "OBLIGATOIRE" },
];

export default function ReglementPage() {
  return (
    <>
      <PageHeader title="Règlement intérieur" subtitle="Module 9 du CDC — règles applicables aux agents utilisant le système." />
      <Panel title="Règles d'usage du système numérique" icon={<Scale size={16} color="var(--accent)" />}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead><tr><th>Règle</th><th>Détail</th><th>Niveau</th></tr></thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.rule}>
                  <td style={{ fontWeight: 700 }}>{r.rule}</td>
                  <td style={{ color: "var(--text2)" }}>{r.detail}</td>
                  <td><span className={`pill ${r.level === "OBLIGATOIRE" ? "pill-red" : "pill-blue"}`}>{r.level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Engagement" icon={<BookCheck size={16} color="var(--green)" />}>
        <p style={{ color: "var(--text2)", lineHeight: 1.6 }}>
          La conformité de la prise de poste est conditionnée au respect strict des règles marquées
          <span className="pill pill-red mx-1">OBLIGATOIRE</span>. Tout manquement est consigné automatiquement
          dans le journal d'audit et porté à la connaissance du superviseur.
        </p>
      </Panel>
    </>
  );
}
