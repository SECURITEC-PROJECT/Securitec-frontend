export const VIGILANCE_SCHEMA = [
  { type: "GROUPE ELECTROGENE", elements: ["Fermeture du local"] },
  { type: "ECLAIRAGE EXTERIEUR", elements: ["Fonctionnement"] },
  { type: "CLOTURE PERIMETRIQUE", elements: ["Murs", "Barbelés"] },
  {
    type: "FERMETURE DES LOCAUX",
    elements: [
      "Portes & fenêtres bureaux",
      "Portails magasins avec cadenas",
      "Locaux techniques",
    ],
  },
  {
    type: "INTEGRITE DES VEHICULES STAR",
    elements: [
      "Roue de secours & batterie",
      "Feux & rétroviseurs",
      "Fermeture réservoir",
      "État général de la carrosserie",
      "Fermeture top case pour moto",
    ],
  },
] as const;
