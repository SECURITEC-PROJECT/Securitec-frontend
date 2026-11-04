import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { VIGILANCE_SCHEMA } from "@/pages/agentControle/ronde/vigilanceSchema";

interface CleLigne {
  lieu: string;
  perceptionMatin: string;
  responsablePerceptionMatin: string;
  reintegrationMatin: string;
  responsableReintegrationMatin: string;
  perceptionApresMidi: string;
  responsablePerceptionApresMidi: string;
  reintegrationApresMidi: string;
  responsableReintegrationApresMidi: string;
  observations: string;
}

export interface CRJData {
  siteType: 'Usine' | 'Agence';
  prestataire: string;
  siteNom: string;
  date: string;
  agentsPostes: Array<{
    poste: string;
    jour: Array<{ nom: string; matricule: string }>;
    nuit: Array<{ nom: string; matricule: string }>;
  }>;
  pointageApsJourEnregistre: boolean;
  pointageApsNuitEnregistre: boolean;
  cles: CleLigne[];
  dechargements: Array<{ camion: string; transporteur: string; titre: string; plomb: string; heureDebut: string; heureFin: string; comptage: string; provenance: string }>;
  chargements: Array<{ camion: string; transporteur: string; titre: string; plomb: string; heureDebut: string; heureFin: string; comptage: string; provenance: string; destination: string }>;
  stockExterieur?: {
    cv12: number; cv24: number; cv20: number; intercalaires: number;
    ev150: number; ev50: number; cr200: number; cr100: number;
  };
  alcootests: Array<{ heure: string; nomPrenom: string; isStar: boolean; demandeur?: string; resultat: string }>;
  rondes: Array<{ debut: string; fin: string; obs: string }>;
  pointsVigilance: Array<{ heure: string; typePoint: string; element: string; statut: string; agent: string; obs: string }>;
  anomalies: Array<{
    heure: string;
    camion: string;
    transporteur: string;
    titre: string;
    casse: string;
    manquant: string;
    vides: string;
    phn: string;
    description: string;
  }>;
  violations: Array<{ heure: string; nomPrenom: string; obs: string; mesures: string }>;
  divers: Array<{ dateHeure: string; faits: string; mesures: string }>;
}

type PrintSectionId = "agents" | "keys" | "unloading" | "loading" | "stock" | "alcootest" | "anomalies" | "violations" | "divers" | "vigilance" | "rondes";

const AGENT_POST_ROWS: Array<{ label: string; post: string | null }> = [
  { label: "Poste de garde I", post: "Poste de garde I" },
  { label: "", post: "Poste de garde I" },
  { label: "", post: "Poste de garde I" },
  { label: "", post: "Poste de garde I" },
  { label: "", post: "Poste de garde I" },
  { label: "Parking extérieur", post: "Parking extérieur" },
  { label: "Poste de garde II", post: "Poste de garde II" },
  { label: "", post: null },
  { label: "Expédition", post: "Expédition" },
  { label: "Box", post: "Box" },
  { label: "Ex-garage", post: "Ex-garage" },
  { label: "Hangar à vélos", post: "Hangar à vélos" },
  { label: "Pont bascule", post: "Pont bascule" },
  { label: "TDE", post: "TDE" },
  { label: "Terrain Bon Espoir", post: "Terrain Bon Espoir" },
  { label: "", post: null },
  { label: "", post: null },
  { label: "", post: null },
  { label: "Terrain CO2", post: "Terrain CO2" },
  { label: "Terrain Firaisana", post: "Terrain Firaisana" },
  { label: "", post: null },
  { label: "Dépôt Tombontsoa", post: "Dépôt Tombontsoa" },
  { label: "Dépôt MADARAIL", post: "Dépôt MADARAIL" },
  { label: "", post: null },
  { label: "", post: null },
  { label: "Ex-Agence", post: "Ex-Agence" },
  { label: "Villa DU", post: "Villa DU" },
  { label: "Villa Responsable maintenance", post: "Villa Responsable maintenance" },
  { label: "", post: null },
  { label: "", post: null },
  { label: "", post: null },
];

const normalizePost = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleUpperCase("fr")
  .replace(/[^A-Z0-9]/g, "");

const AGENT_POST_ALIASES: Record<string, string> = {
  PG1: "POSTEDEGARDEI",
  PGI: "POSTEDEGARDEI",
  POSTEGARDEI: "POSTEDEGARDEI",
  PG2: "POSTEDEGARDEII",
  PGII: "POSTEDEGARDEII",
  PGIT: "POSTEDEGARDEII",
  POSTEGARDE2: "POSTEDEGARDEII",
  POSTEDEGARDE2: "POSTEDEGARDEII",
  POSTEGARDEII: "POSTEDEGARDEII",
  POSTEDEGARDEII: "POSTEDEGARDEII",
  FITAA: "TERRAINFIRAISANA",
  FITAVA: "TERRAINFIRAISANA",
  FIRAISANA: "TERRAINFIRAISANA",
  FIRASANA: "TERRAINFIRAISANA",
  EXTERIEUR: "PARKINGEXTERIEUR",
  PARKING: "PARKINGEXTERIEUR",
  GARAGE: "EXGARAGE",
  EXGARAGE: "EXGARAGE",
  HANGARVELO: "HANGARAVELOS",
  HANGARAVELO: "HANGARAVELOS",
  DEPOTTOMBONTSOA: "DEPOTTOMBONTSOA",
  DEPOTMADARAIL: "DEPOTMADARAIL",
  VILLARESPONSABLEMAINTENANCE: "VILLARESPONSABLEMAINTENANCE",
};

const canonicalPost = (value: string) => {
  const normalized = normalizePost(value);
  return AGENT_POST_ALIASES[normalized] || normalized;
};

function PrintSectionTitle({ id, title, onPrint }: { id: PrintSectionId; title: string; onPrint: (id: PrintSectionId) => void }) {
  return (
    <div className="mb-1 flex items-center justify-between gap-2 border-b border-black">
      <h4 className="font-bold">{title}</h4>
      <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs print:hidden" onClick={() => onPrint(id)}>
        <Printer className="h-3 w-3" /> A4
      </Button>
    </div>
  );
}

function PrintMeta({ data }: { data: Pick<CRJData, "siteType" | "prestataire" | "siteNom" | "date"> }) {
  return (
    <div className="crj-section-print-meta">
      <h1>RAPPORT JOURNALIER {data.siteType}</h1>
      <p className="flex flex-wrap justify-center gap-x-4">
        <span><strong>PRESTATAIRE :</strong> {data.prestataire}</span>
        <span><strong>SITE :</strong> {data.siteNom}</span>
        <span><strong>DATE :</strong> {data.date}</span>
      </p>
    </div>
  );
}

export default function GenerateurCRJ({ data }: { data: CRJData }) {
  const [printSection, setPrintSection] = useState<PrintSectionId | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSection = (section: PrintSectionId) => setPrintSection(section);

  useEffect(() => {
    if (!printSection) return;

    const resetPrintMode = () => setPrintSection(null);
    document.body.classList.add("crj-printing-single");
    window.addEventListener("afterprint", resetPrintMode, { once: true });
    window.print();

    return () => {
      document.body.classList.remove("crj-printing-single");
      window.removeEventListener("afterprint", resetPrintMode);
    };
  }, [printSection]);

  const agentsPostes = Array.isArray(data.agentsPostes) ? data.agentsPostes : [];
  const knownPosts = new Set(AGENT_POST_ROWS.map((row) => row.post).filter((post): post is string => post !== null).map(canonicalPost));
  const postRowCapacity = new Map<string, number>();
  for (const row of AGENT_POST_ROWS) {
    if (row.post) {
      const postKey = canonicalPost(row.post);
      postRowCapacity.set(postKey, (postRowCapacity.get(postKey) || 0) + 1);
    }
  }
  const postAgentIndexes = new Map<string, number>();
  const agentPostRows = AGENT_POST_ROWS.flatMap((row) => {
    if (!row.post) return [{ ...row, jour: undefined, nuit: undefined }];

    const postKey = canonicalPost(row.post);
    const agents = agentsPostes.find((item) => canonicalPost(item.poste) === postKey);
    const index = postAgentIndexes.get(postKey) || 0;
    postAgentIndexes.set(postKey, index + 1);
    const rows = [{
      ...row,
      jour: agents?.jour[index],
      nuit: agents?.nuit[index],
    }];
    const rowCapacity = postRowCapacity.get(postKey) || 0;
    if (index + 1 === rowCapacity && agents) {
      const additionalCount = Math.max(agents.jour.length, agents.nuit.length) - rowCapacity;
      for (let extraIndex = 0; extraIndex < additionalCount; extraIndex += 1) {
        rows.push({
          post: row.post,
          label: "",
          jour: agents.jour[rowCapacity + extraIndex],
          nuit: agents.nuit[rowCapacity + extraIndex],
        });
      }
    }
    return rows;
  });
  const extraAgentRows = agentsPostes
    .filter((poste) => !knownPosts.has(canonicalPost(poste.poste)))
    .flatMap((poste) => Array.from(
      { length: Math.max(poste.jour.length, poste.nuit.length, 1) },
      (_, index) => ({
        post: poste.poste,
        label: index === 0 ? poste.poste : "",
        jour: poste.jour[index],
        nuit: poste.nuit[index],
      }),
    ));
  const cles = Array.isArray(data.cles) ? data.cles : [];
  const lignesCles = [
    ...cles,
    ...Array.from({ length: Math.max(8 - cles.length, 0) }, () => ({
      lieu: "",
      perceptionMatin: "",
      responsablePerceptionMatin: "",
      reintegrationMatin: "",
      responsableReintegrationMatin: "",
      perceptionApresMidi: "",
      responsablePerceptionApresMidi: "",
      reintegrationApresMidi: "",
      responsableReintegrationApresMidi: "",
      observations: "",
    })),
  ];
  const vigilanceRows = VIGILANCE_SCHEMA.flatMap((group) => group.elements.map((element) => ({
    typePoint: group.type,
    element,
    obs: (() => {
      const points = data.pointsVigilance.filter((point) => point.typePoint === group.type && point.element === element);
      const observations = points.map((point) => point.obs.trim()).filter((observation) => observation && observation !== "-");
      if (observations.length) return observations.join(" / ");
      const nonConforme = points.some((point) => point.statut.toLocaleLowerCase("fr") === "non conforme");
      return nonConforme ? "Non conforme" : "RAS";
    })(),
  })));
  const lignesAnomalies = [
    ...data.anomalies,
    ...Array.from({ length: Math.max(3 - data.anomalies.length, 0) }, () => ({
      heure: "",
      camion: "",
      transporteur: "",
      titre: "",
      casse: "",
      manquant: "",
      vides: "",
      phn: "",
      description: "",
    })),
  ];
  const lignesViolations = [
    ...data.violations,
    ...Array.from({ length: Math.max(3 - data.violations.length, 0) }, () => ({
      heure: "",
      nomPrenom: "",
      obs: "",
      mesures: "",
    })),
  ];
  const lignesDivers = [
    ...data.divers,
    ...Array.from({ length: Math.max(3 - data.divers.length, 0) }, () => ({
      dateHeure: "",
      faits: "",
      mesures: "",
    })),
  ];

  return (
    <div className="crj-print-root space-y-4" data-printing-section={printSection || undefined}>
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
        <div data-print-section="agents" data-print-selected={printSection === "agents" ? "true" : undefined}>
          <PrintMeta data={data} />
          <PrintSectionTitle id="agents" title="1 - AGENTS DE SECURITE" onPrint={handlePrintSection} />
          {(!data.pointageApsJourEnregistre || !data.pointageApsNuitEnregistre || !agentsPostes.length) && (
            <p className="mb-1 text-[10px] text-amber-800 print:hidden">
              {!agentsPostes.length && data.agentsPostes === undefined
                ? "Les données du pointage APS ne sont pas présentes dans cette réponse CRJ. "
                : ""}
              Pointage APS manquant pour le service {[
                !data.pointageApsJourEnregistre && "jour",
                !data.pointageApsNuitEnregistre && "nuit",
              ].filter(Boolean).join(" et ") || "jour et nuit"}. Enregistrez ce service dans le module Pointage APS pour compléter le tableau.
            </p>
          )}
          <table className="w-full table-fixed border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="w-[14%] border border-black p-1">POSTES</th>
                <th colSpan={2} className="border border-black p-1">JOUR</th>
                <th colSpan={2} className="border border-black p-1">NUIT</th>
              </tr>
              <tr className="bg-gray-50">
                <th className="w-[34%] border border-black p-1">Nom &amp; Prénom</th>
                <th className="w-[9%] border border-black p-1">Matricule</th>
                <th className="w-[34%] border border-black p-1">Nom &amp; Prénom</th>
                <th className="w-[9%] border border-black p-1">Matricule</th>
              </tr>
            </thead>
            <tbody>
              {[...agentPostRows, ...extraAgentRows].map((row, index) => (
                <tr key={`${row.post || "blank"}-${index}`}>
                  <td className="border border-black p-1 text-left">{row.label}</td>
                  <td className="border border-black p-1">{row.jour?.nom || ""}</td>
                  <td className="border border-black p-1 font-mono">{row.jour?.matricule || ""}</td>
                  <td className="border border-black p-1">{row.nuit?.nom || ""}</td>
                  <td className="border border-black p-1 font-mono">{row.nuit?.matricule || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 2 - HORAIRES DE PERCEPTION ET RÉINTÉGRATION DES CLÉS */}
        <div data-print-section="keys" data-print-selected={printSection === "keys" ? "true" : undefined}>
          <PrintMeta data={data} />
          <PrintSectionTitle id="keys" title="2 - HORAIRES DE PERCEPTION ET REINTEGRATION CLES BUREAUX & MAGASINS & AUTRES" onPrint={handlePrintSection} />
          <table className="w-full border-collapse border border-black text-center text-[8px]">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="border border-black p-1">LIEU</th>
                <th colSpan={2} className="border border-black p-1">PERCEPTION MATIN</th>
                <th colSpan={2} className="border border-black p-1">REINTEGRATION MATIN</th>
                <th colSpan={2} className="border border-black p-1">PERCEPTION APRES MIDI</th>
                <th colSpan={2} className="border border-black p-1">REINTEGRATION APRES MIDI</th>
                <th rowSpan={2} className="border border-black p-1">OBS</th>
              </tr>
              <tr className="bg-gray-50">
                {Array.from({ length: 4 }, (_, index) => (
                  <Fragment key={index}>
                    <th className="border border-black p-1">Heure</th>
                    <th className="border border-black p-1">Responsable</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {lignesCles.map((c, i) => (
                <tr key={i}>
                  <td className="border border-black p-1">{c.lieu}</td>
                  <td className="border border-black p-1 font-mono">{c.perceptionMatin}</td>
                  <td className="border border-black p-1">{c.responsablePerceptionMatin}</td>
                  <td className="border border-black p-1 font-mono">{c.reintegrationMatin}</td>
                  <td className="border border-black p-1">{c.responsableReintegrationMatin}</td>
                  <td className="border border-black p-1 font-mono">{c.perceptionApresMidi}</td>
                  <td className="border border-black p-1">{c.responsablePerceptionApresMidi}</td>
                  <td className="border border-black p-1 font-mono">{c.reintegrationApresMidi}</td>
                  <td className="border border-black p-1">{c.responsableReintegrationApresMidi}</td>
                  <td className="border border-black p-1">{c.observations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 3 & 4 - FLUX LOGISTIQUES */}
        <div className="space-y-2">
          <div data-print-section="unloading" data-print-selected={printSection === "unloading" ? "true" : undefined}>
            <PrintMeta data={data} />
            <PrintSectionTitle id="unloading" title={`3 - DECHARGEMENT CAMIONS ${data.siteType === "Agence" ? "+ VL + VD" : ""}`} onPrint={handlePrintSection} />
            <table className="w-full border-collapse border border-black text-center text-[9px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1">CAMION / IMMATRICULATION</th>
                  <th className="border border-black p-1">TRANSPORTEUR</th>
                  <th className="border border-black p-1">N° TITRE / FACTURE</th>
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

          <div data-print-section="loading" data-print-selected={printSection === "loading" ? "true" : undefined}>
            <PrintMeta data={data} />
            <PrintSectionTitle id="loading" title={`4 - CHARGEMENT CAMIONS ${data.siteType === "Agence" ? "+ VL + VD" : ""}`} onPrint={handlePrintSection} />
            <table className="w-full border-collapse border border-black text-center text-[9px]">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1">CAMION / IMMATRICULATION</th>
                  <th className="border border-black p-1">TRANSPORTEUR</th>
                  <th className="border border-black p-1">N° TITRE / FACTURE</th>
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
                    <td colSpan={5} className="border border-black p-1 text-gray-500 italic">Aucun chargement ce jour.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SPECIFITE AGENCE : INVENTAIRE STOCK EXTERIEUR (RUBRIQUE 5) */}
        {data.siteType === 'Agence' && (
          <div data-print-section="stock" data-print-selected={printSection === "stock" ? "true" : undefined}>
            <PrintMeta data={data} />
            <PrintSectionTitle id="stock" title="INVENTAIRE STOCK EXTERIEUR MAGASIN" onPrint={handlePrintSection} />
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
        <div data-print-section="alcootest" data-print-selected={printSection === "alcootest" ? "true" : undefined}>
          <PrintMeta data={data} />
          <PrintSectionTitle id="alcootest" title="5 - ALCOOTEST" onPrint={handlePrintSection} />
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th rowSpan={2} className="border border-black p-1">HEURE</th>
                <th colSpan={3} className="border border-black p-1">PERSONNE TESTÉE</th>
                <th rowSpan={2} className="border border-black p-1">DEMANDEUR</th>
                <th colSpan={2} className="border border-black p-1">RÉSULTAT</th>
              </tr>
              <tr className="bg-gray-100">
                <th className="border border-black p-1">NOM &amp; PRÉNOM</th>
                <th className="border border-black p-1">STAR</th>
                <th className="border border-black p-1">NON STAR</th>
                <th className="border border-black p-1">POSITIF</th>
                <th className="border border-black p-1">NÉGATIF</th>
              </tr>
            </thead>
            <tbody>
              {data.alcootests.length > 0 ? data.alcootests.map((a, i) => (
                <tr key={i} className={a.resultat === 'Positif' ? 'bg-red-50 font-bold text-red-900' : ''}>
                  <td className="border border-black p-1 font-mono">{a.heure}</td>
                  <td className="border border-black p-1">{a.nomPrenom}</td>
                  <td className="border border-black p-1">{a.isStar ? 'X' : '-'}</td>
                  <td className="border border-black p-1">{a.isStar ? '-' : 'X'}</td>
                  <td className="border border-black p-1">{a.demandeur || '-'}</td>
                  <td className="border border-black p-1">{a.resultat === 'Positif' ? 'X' : '-'}</td>
                  <td className="border border-black p-1">{a.resultat === 'Négatif' ? 'X' : '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="border border-black p-1 text-gray-500 italic">Aucun test d'alcoolémie enregistré ce jour.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* POINTS DE VIGILANCE */}
        <div data-print-section="vigilance" data-print-selected={printSection === "vigilance" ? "true" : undefined}>
          <PrintMeta data={data} />
          <PrintSectionTitle id="vigilance" title="6 - POINTS DE VIGILANCE" onPrint={handlePrintSection} />
          <table className="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-[14%] border border-black p-1" />
                <th className="w-[18%] border border-black p-1" />
                <th className="border border-black p-1 text-center">OBSERVATIONS</th>
              </tr>
            </thead>
            <tbody>
              {VIGILANCE_SCHEMA.flatMap((group) => group.elements.map((element, index) => {
                const row = vigilanceRows.find((item) => item.typePoint === group.type && item.element === element);
                return (
                  <tr key={`${group.type}-${element}`}>
                    {index === 0 && <td rowSpan={group.elements.length} className="w-[14%] border border-black p-1 align-middle text-center font-medium">{group.type}</td>}
                    <td className="w-[18%] border border-black p-1">{element}</td>
                    <td className="border border-black p-1 text-center">{row?.obs || "RAS"}</td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>

        {/* ANOMALIES */}
        <div data-print-section="anomalies" data-print-selected={printSection === "anomalies" ? "true" : undefined}>
          <PrintMeta data={data} />
          <PrintSectionTitle id="anomalies" title="7 - ANOMALIES" onPrint={handlePrintSection} />
          <table className="w-full table-fixed border-collapse border border-black text-center text-[9px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-[10%] border border-black p-1">HEURE</th>
                <th className="w-[9%] border border-black p-1">N° CAMION</th>
                <th className="w-[11%] border border-black p-1">TRANSPORTEUR</th>
                <th className="w-[9%] border border-black p-1">TITRE</th>
                <th className="w-[9%] border border-black p-1">CASSE</th>
                <th className="w-[9%] border border-black p-1">MANQUANT</th>
                <th className="w-[9%] border border-black p-1">VIDES</th>
                <th className="w-[8%] border border-black p-1">PHN</th>
                <th className="w-[26%] border border-black p-1">DESCRIPTION DES FAITS</th>
              </tr>
            </thead>
            <tbody>
              {lignesAnomalies.map((anomalie, index) => (
                <tr key={`${anomalie.heure}-${index}`}>
                  <td className="h-5 border border-black p-1 font-mono">{anomalie.heure}</td>
                  <td className="border border-black p-1">{anomalie.camion}</td>
                  <td className="border border-black p-1">{anomalie.transporteur}</td>
                  <td className="border border-black p-1">{anomalie.titre}</td>
                  <td className="border border-black p-1">{anomalie.casse}</td>
                  <td className="border border-black p-1">{anomalie.manquant}</td>
                  <td className="border border-black p-1">{anomalie.vides}</td>
                  <td className="border border-black p-1">{anomalie.phn}</td>
                  <td className="border border-black p-1 text-left">{anomalie.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* VIOLATIONS DE PROCEDURE */}
        <div data-print-section="violations" data-print-selected={printSection === "violations" ? "true" : undefined}>
          <PrintMeta data={data} />
          <PrintSectionTitle id="violations" title="8 - VIOLATION DE PROCEDURE" onPrint={handlePrintSection} />
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-[15%] border border-black p-1">HEURE</th>
                <th className="w-[26%] border border-black p-1">NOM &amp; PRENOM</th>
                <th className="w-[34%] border border-black p-1">OBSERVATIONS</th>
                <th className="w-[25%] border border-black p-1">MESURES PRISES</th>
              </tr>
            </thead>
            <tbody>
              {lignesViolations.map((violation, index) => (
                <tr key={`${violation.heure}-${index}`}>
                  <td className="h-5 border border-black p-1 font-mono">{violation.heure}</td>
                  <td className="border border-black p-1">{violation.nomPrenom}</td>
                  <td className="border border-black p-1 text-left">{violation.obs}</td>
                  <td className="border border-black p-1 text-left">{violation.mesures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* DIVERS */}
        <div data-print-section="divers" data-print-selected={printSection === "divers" ? "true" : undefined}>
          <PrintMeta data={data} />
          <PrintSectionTitle id="divers" title="9 - DIVERS" onPrint={handlePrintSection} />
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="w-[15%] border border-black p-1">DATE ET HEURE</th>
                <th className="w-[45%] border border-black p-1">FAITS</th>
                <th className="w-[40%] border border-black p-1">MESURES PRISES</th>
              </tr>
            </thead>
            <tbody>
              {lignesDivers.map((item, index) => (
                <tr key={`${item.dateHeure}-${index}`}>
                  <td className="h-5 border border-black p-1">{item.dateHeure}</td>
                  <td className="border border-black p-1 text-left">{item.faits}</td>
                  <td className="border border-black p-1 text-left">{item.mesures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* RONDES */}
        <div data-print-section="rondes" data-print-selected={printSection === "rondes" ? "true" : undefined}>
          <PrintMeta data={data} />
          <PrintSectionTitle id="rondes" title="10 - RONDES" onPrint={handlePrintSection} />
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1">DÉBUT RONDE</th>
                <th className="border border-black p-1">FIN RONDE</th>
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
