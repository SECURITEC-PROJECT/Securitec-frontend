import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface CleLigne {
  lieu: string;
  percMatin?: string; respPercMatin?: string; reintMatin?: string; respReintMatin?: string;
  percApresMidi?: string; respPercApresMidi?: string; reintApresMidi?: string; respReintApresMidi?: string;
}

export interface CRJData {
  siteType: 'Usine' | 'Agence';
  prestataire: string;
  siteNom: string;
  date: string;
  agentsJour: Array<{ nom: string; matricule: string }>;
  agentsNuit: Array<{ nom: string; matricule: string }>;
  cles: CleLigne[];
  dechargements: Array<{ camion: string; transporteur: string; titre: string; plomb: string }>;
  chargements: Array<{ camion: string; transporteur: string; titre: string; plomb: string }>;
  stockExterieur?: {
    cv12: number; cv24: number; cv20: number; intercalaires: number;
    ev150: number; ev50: number; cr200: number; cr100: number;
  };
  alcootests: Array<{ heure: string; nomPrenom: string; isStar: boolean; demandeur?: string; resultat: string; typeControle: string }>;
  rondes: Array<{ debut: string; fin: string; obs: string }>;
  pointsVigilance: Array<{ heure: string; typePoint: string; element: string; statut: string; agent: string; obs: string }>;
  anomalies: Array<{ heure: string; camion: string; transporteur: string; titre: string; obs: string }>;
  violations: Array<{ heure: string; nomPrenom: string; obs: string; mesures: string }>;
  divers: Array<{ dateHeure: string; faits: string; mesures: string }>;
}

const dash = (v?: string) => (v && v.trim() ? v : '-');

export default function GenerateurCRJ({ data }: { data: CRJData }) {
  const handlePrint = () => {
    window.print();
  };

  // Les rubriques suivantes sont numérotées à la suite (le stock extérieur ajoute une rubrique)
  const decalage = data.siteType === 'Agence' ? 1 : 0;

  // Filtrage conforme à la consigne pour les alcootests
  const alcootestsAffiches = data.alcootests.filter(item => {
    if (item.typeControle === 'Ordinaire') {
      return item.resultat !== 'Négatif'; // Seuls les positifs/refus en ordinaire
    }
    return true; // Tous les tests à la demande d'un service
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border">
        <div>
          <h3 className="font-bold text-sm">Aperçu & Génération CRJ - {data.siteType.toUpperCase()}</h3>
          <p className="text-xs text-muted-foreground">Format officiel prêt pour impression / PDF opposable</p>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" /> Imprimer le Rapport {data.siteType}
        </Button>
      </div>

      {/* ZONE IMPRIMABLE EXACTE DE CONFORMITÉ */}
      <div className="bg-white text-black p-8 rounded-md border font-sans text-[11px] leading-tight space-y-4 print:p-0 print:border-none">
        {/* EN-TÊTE */}
        <div className="text-center font-bold border-b-2 border-black pb-2">
          <h1 className="text-base uppercase">RAPPORT JOURNALIER {data.siteType}</h1>
          <div className="grid grid-cols-3 text-left mt-2 text-xs font-normal">
            <p><strong>PRESTATAIRE :</strong> {data.prestataire}</p>
            <p><strong>SITE DE TRAVAIL :</strong> {data.siteNom}</p>
            <p><strong>DATE :</strong> {data.date}</p>
          </div>
        </div>

        {/* 1 - AGENTS DE SÉCURITÉ */}
        <div>
          <h4 className="font-bold border-b border-black mb-1">1 - AGENTS DE SECURITE</h4>
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th colSpan={2} className="border border-black p-1">POSTE JOUR</th>
                <th colSpan={2} className="border border-black p-1">POSTE NUIT</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-black p-1">Nom & Prénom</th>
                <th className="border border-black p-1">Matricule</th>
                <th className="border border-black p-1">Nom & Prénom</th>
                <th className="border border-black p-1">Matricule</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.max(data.agentsJour.length, data.agentsNuit.length, 2) }).map((_, i) => (
                <tr key={i}>
                  <td className="border border-black p-1">{data.agentsJour[i]?.nom || '-'}</td>
                  <td className="border border-black p-1 font-mono">{data.agentsJour[i]?.matricule || '-'}</td>
                  <td className="border border-black p-1">{data.agentsNuit[i]?.nom || '-'}</td>
                  <td className="border border-black p-1 font-mono">{data.agentsNuit[i]?.matricule || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2 - CLES (MATIN / APRES-MIDI) */}
        <div>
          <h4 className="font-bold border-b border-black mb-1">2 - HORAIRES DE PERCEPTION ET REINTEGRATION CLES</h4>
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="border border-black p-1">LIEU / TROUSSEAU</th>
                <th colSpan={2} className="border border-black p-1">PERCEPTION MATIN</th>
                <th colSpan={2} className="border border-black p-1">REINTEGRATION MATIN</th>
                <th colSpan={2} className="border border-black p-1">PERCEPTION APRES-MIDI</th>
                <th colSpan={2} className="border border-black p-1">REINTEGRATION APRES-MIDI</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="border border-black p-1">Heure</th>
                <th className="border border-black p-1">Responsable</th>
                <th className="border border-black p-1">Heure</th>
                <th className="border border-black p-1">Responsable</th>
                <th className="border border-black p-1">Heure</th>
                <th className="border border-black p-1">Responsable</th>
                <th className="border border-black p-1">Heure</th>
                <th className="border border-black p-1">Responsable</th>
              </tr>
            </thead>
            <tbody>
              {data.cles.length > 0 ? data.cles.map((c, i) => (
                <tr key={i}>
                  <td className="border border-black p-1">{c.lieu}</td>
                  <td className="border border-black p-1 font-mono">{dash(c.percMatin)}</td>
                  <td className="border border-black p-1">{dash(c.respPercMatin)}</td>
                  <td className="border border-black p-1 font-mono">{dash(c.reintMatin)}</td>
                  <td className="border border-black p-1">{dash(c.respReintMatin)}</td>
                  <td className="border border-black p-1 font-mono">{dash(c.percApresMidi)}</td>
                  <td className="border border-black p-1">{dash(c.respPercApresMidi)}</td>
                  <td className="border border-black p-1 font-mono">{dash(c.reintApresMidi)}</td>
                  <td className="border border-black p-1">{dash(c.respReintApresMidi)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={9} className="border border-black p-1 text-gray-500 italic">Aucun mouvement de clé enregistré ce jour.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3 & 4 - FLUX LOGISTIQUES */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <h4 className="font-bold border-b border-black mb-1">3 - DECHARGEMENT CAMIONS {data.siteType === 'Agence' && '+ VL + VD'}</h4>
            <table className="w-full border-collapse border border-black text-center text-[9px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1">CAMION</th>
                  <th className="border border-black p-1">TRANSPORTEUR</th>
                  <th className="border border-black p-1">TITRE {data.siteType === 'Agence' && '/ REV'}</th>
                  <th className="border border-black p-1">PLOMB</th>
                </tr>
              </thead>
              <tbody>
                {data.dechargements.length > 0 ? data.dechargements.map((d, i) => (
                  <tr key={i}>
                    <td className="border border-black p-1 font-mono">{d.camion}</td>
                    <td className="border border-black p-1">{d.transporteur}</td>
                    <td className="border border-black p-1 font-mono">{d.titre}</td>
                    <td className="border border-black p-1 font-mono">{d.plomb}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="border border-black p-1 text-gray-500 italic">Aucun déchargement ce jour.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="font-bold border-b border-black mb-1">4 - CHARGEMENT CAMIONS {data.siteType === 'Agence' && '+ VL + VD'}</h4>
            <table className="w-full border-collapse border border-black text-center text-[9px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1">CAMION</th>
                  <th className="border border-black p-1">TRANSPORTEUR</th>
                  <th className="border border-black p-1">TITRE {data.siteType === 'Agence' && '/ FACTURE'}</th>
                  <th className="border border-black p-1">PLOMB</th>
                </tr>
              </thead>
              <tbody>
                {data.chargements.length > 0 ? data.chargements.map((c, i) => (
                  <tr key={i}>
                    <td className="border border-black p-1 font-mono">{c.camion}</td>
                    <td className="border border-black p-1">{c.transporteur}</td>
                    <td className="border border-black p-1 font-mono">{c.titre}</td>
                    <td className="border border-black p-1 font-mono">{c.plomb}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="border border-black p-1 text-gray-500 italic">Aucun chargement ce jour.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SPECIFITE AGENCE : INVENTAIRE STOCK EXTERIEUR (RUBRIQUE 5) */}
        {data.siteType === 'Agence' && (
          <div>
            <h4 className="font-bold border-b border-black mb-1">5 - INVENTAIRE STOCK EXTERIEUR MAGASIN</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="border border-black p-2">
                <p className="font-bold underline mb-1">VIDES (Palettes & Vrac) :</p>
                <p>• CV12: {data.stockExterieur?.cv12 || 0} | CV24: {data.stockExterieur?.cv24 || 0} | CV20: {data.stockExterieur?.cv20 || 0}</p>
                <p>• Intercalaires Plastiques: {data.stockExterieur?.intercalaires || 0} paquets</p>
              </div>
              <div className="border border-black p-2">
                <p className="font-bold underline mb-1">PLEINS (Palettes Eaux Minérales) :</p>
                <p>• Eau Vive 150cl (EV150): {data.stockExterieur?.ev150 || 0} | Eau Vive 50cl (EV50): {data.stockExterieur?.ev50 || 0}</p>
                <p>• Cristalline 200cl (CR200): {data.stockExterieur?.cr200 || 0} | Cristalline 100cl (CR100): {data.stockExterieur?.cr100 || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* ALCOOTEST */}
        <div>
          <h4 className="font-bold border-b border-black mb-1">
            {5 + decalage} - ALCOOTEST (Seuls les tests positifs ordinaires et tous les tests à la demande sont affichés)
          </h4>
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1">HEURE</th>
                <th className="border border-black p-1">PERSONNE TESTEE</th>
                <th className="border border-black p-1">TYPE / APPARTENANCE</th>
                <th className="border border-black p-1">DEMANDEUR (SUPERIEUR)</th>
                <th className="border border-black p-1">RESULTAT</th>
              </tr>
            </thead>
            <tbody>
              {alcootestsAffiches.length > 0 ? alcootestsAffiches.map((a, i) => (
                <tr key={i} className={a.resultat !== 'Négatif' ? 'bg-red-50 font-bold text-red-900' : ''}>
                  <td className="border border-black p-1 font-mono">{a.heure}</td>
                  <td className="border border-black p-1">{a.nomPrenom}</td>
                  <td className="border border-black p-1">{a.isStar ? 'STAR' : 'NON STAR'} ({a.typeControle})</td>
                  <td className="border border-black p-1">{a.demandeur || 'N/A (Test Ordinaire)'}</td>
                  <td className="border border-black p-1">{a.resultat}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="border border-black p-1 text-gray-500 italic">Aucun test d'alcoolémie positif ou sous demande hiérarchique à signaler ce jour.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ANOMALIES & VIOLATIONS */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <h4 className="font-bold border-b border-black mb-1">{6 + decalage} - ANOMALIES</h4>
            <div className="border border-black p-2 min-h-[50px] text-[10px]">
              {data.anomalies.length > 0 ? data.anomalies.map((a, i) => (
                <p key={i}>• {a.heure} - Camion {a.camion} ({a.titre}): {a.obs}</p>
              )) : <p className="text-gray-500 italic">R.A.S</p>}
            </div>
          </div>

          <div>
            <h4 className="font-bold border-b border-black mb-1">{7 + decalage} - VIOLATION DE PROCEDURE</h4>
            <div className="border border-black p-2 min-h-[50px] text-[10px]">
              {data.violations.length > 0 ? data.violations.map((v, i) => (
                <p key={i}>• {v.heure} - {v.nomPrenom}: {v.obs} (Mesure: {v.mesures})</p>
              )) : <p className="text-gray-500 italic">R.A.S</p>}
            </div>
          </div>
        </div>

        {/* RONDES */}
        <div>
          <h4 className="font-bold border-b border-black mb-1">{8 + decalage} - RONDES</h4>
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1">DEBUT</th>
                <th className="border border-black p-1">FIN</th>
                <th className="border border-black p-1">OBSERVATIONS</th>
              </tr>
            </thead>
            <tbody>
              {data.rondes.length > 0 ? data.rondes.map((r, i) => (
                <tr key={i}>
                  <td className="border border-black p-1 font-mono">{r.debut}</td>
                  <td className="border border-black p-1 font-mono">{r.fin}</td>
                  <td className="border border-black p-1 text-left">{r.obs}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="border border-black p-1 text-gray-500 italic">R.A.S</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* POINTS DE VIGILANCE */}
        <div>
          <h4 className="font-bold border-b border-black mb-1">{9 + decalage} - POINTS DE VIGILANCE</h4>
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1">HEURE</th>
                <th className="border border-black p-1">TYPE DE POINT</th>
                <th className="border border-black p-1">ELEMENT VERIFIE</th>
                <th className="border border-black p-1">STATUT</th>
                <th className="border border-black p-1">AGENT</th>
                <th className="border border-black p-1">OBSERVATIONS</th>
              </tr>
            </thead>
            <tbody>
              {data.pointsVigilance.length > 0 ? data.pointsVigilance.map((v, i) => (
                <tr key={i}>
                  <td className="border border-black p-1 font-mono">{v.heure}</td>
                  <td className="border border-black p-1">{v.typePoint}</td>
                  <td className="border border-black p-1">{v.element}</td>
                  <td className="border border-black p-1">{v.statut}</td>
                  <td className="border border-black p-1">{v.agent}</td>
                  <td className="border border-black p-1 text-left">{v.obs}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="border border-black p-1 text-gray-500 italic">R.A.S</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* DIVERS */}
        <div>
          <h4 className="font-bold border-b border-black mb-1">{10 + decalage} - DIVERS</h4>
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1">HEURE</th>
                <th className="border border-black p-1">FAITS</th>
                <th className="border border-black p-1">MESURES PRISES</th>
              </tr>
            </thead>
            <tbody>
              {data.divers.length > 0 ? data.divers.map((d, i) => (
                <tr key={i}>
                  <td className="border border-black p-1 font-mono">{d.dateHeure}</td>
                  <td className="border border-black p-1 text-left">{d.faits}</td>
                  <td className="border border-black p-1 text-left">{d.mesures}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="border border-black p-1 text-gray-500 italic">R.A.S</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* SIGNATURES */}
        <div className="grid grid-cols-2 text-center pt-4 mt-6 border-t border-black">
          <div>
            <p className="font-bold">LE CHEF DE POSTE (PRESTATAIRE)</p>
            <p className="text-[9px] text-gray-500 mt-8">(Nom, Signature & Horodatage)</p>
          </div>
          <div>
            <p className="font-bold">LE RESPONSABLE SURETE SITE (CLIENT)</p>
            <p className="text-[9px] text-gray-500 mt-8">(Nom & Visa de validation)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
