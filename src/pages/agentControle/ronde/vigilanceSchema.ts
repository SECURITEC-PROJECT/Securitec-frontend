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
] as const;
