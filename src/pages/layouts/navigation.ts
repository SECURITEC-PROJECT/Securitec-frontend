import {
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Repeat,
  Route as RouteIcon,
  Settings2,
  Users,
  Video,
  ContactRound,
  KeyRound,
  FileCheck,
  Truck,
  Fuel,
  Trash2,
  ClipboardList,
  FileSignature,
  Mail,
  AlertTriangle,
  FileWarning,
  Package,
  ShieldAlert,
  Wrench,
  Bike,
  CarFront,
  Contact,
  type LucideIcon,
} from "lucide-react";

export const SIDEBAR_GROUPS: { title: string; items: { to: string; label: string; icon: LucideIcon }[] }[] = [
  { title: "PILOTAGE", items: [{ to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard }, { to: "/dashboard/statistiques", label: "Statistiques", icon: BarChart3 }] },
  { title: "POSTES DE GARDE", items: [{ to: "/dashboard/postes", label: "Choisir un poste", icon: ShieldCheck }, { to: "/dashboard/prestataires", label: "Prestataires", icon: ContactRound }] },
  { title: "CAHIERS", items: [
      { to: "/dashboard/mouvements-cles", label: "Mouvements clés", icon: KeyRound },
      { to: "/dashboard/carte-grise-permis", label: "Carte grise / Permis", icon: FileSignature },
      { to: "/dashboard/dechets-levee", label: "Drèche et levure", icon: Trash2 },
      { to: "/dashboard/mouvements-aps", label: "Mouvements APS", icon: Repeat },
      { to: "/dashboard/dechargements-bennes-vides", label: "Déchargement bouteilles vides", icon: Truck },
      { to: "/dashboard/dechargements-matiere-premiere", label: "Déchargements matière première", icon: Boxes },
      { to: "/dashboard/depotage-fuel-gasoil", label: "Dépotage fuel et gasoil", icon: Fuel },
      { to: "/dashboard/mouvements-vehicules", label: "Mouvements véhicule entrée / sortie", icon: Truck },
      { to: "/dashboard/pointage-aps", label: "Pointage APS", icon: ClipboardCheck },
      { to: "/dashboard/main-courante", label: "Main courante", icon: FileText },
      { to: "/dashboard/enregistrements-bon-facture-bon-sortie", label: "Enregistrements Bon / facture / Bon de sortie", icon: FileText },
      { to: "/dashboard/courrier", label: "Courrier", icon: Mail },
      { to: "/dashboard/anomalie", label: "Anomalie", icon: AlertTriangle },
      { to: "/dashboard/rondes", label: "Patrouille ou ronde", icon: RouteIcon },
      { to: "/dashboard/points-vigilance", label: "Points de vigilance", icon: ShieldAlert },
      { to: "/dashboard/consigne", label: "Consignes", icon: FileWarning },
      { to: "/dashboard/chargements-star-particuliers", label: "Chargements Star et particuliers", icon: Truck },
      { to: "/dashboard/materiels-sous-traitant", label: "Matériels sous-traitant", icon: Wrench },
      { to: "/dashboard/enregistrements-ordures", label: "Enregistrements Ordures", icon: Trash2 },
      { to: "/dashboard/ordures", label: "Ordures", icon: Trash2 },
      { to: "/dashboard/ferrailles", label: "Ferrailles", icon: Wrench },
      { to: "/dashboard/mouvement-velos", label: "Mouvement Vélos", icon: Bike },
      { to: "/dashboard/mouvement-moto", label: "Mouvement Moto", icon: CarFront },
      { to: "/dashboard/visiteurs", label: "Visiteurs", icon: Users },
      { to: "/dashboard/materiels-star", label: "Matériels Star", icon: Package },
      { to: "/dashboard/chauffeurs", label: "Chauffeurs", icon: Contact },
    ]
  },
  { title: "FICHES", items: [
      { to: "/dashboard/check-list-camion", label: "Check-list camion", icon: ClipboardList },
      { to: "/dashboard/questionnaires-visiteurs", label: "Questionnaires visiteurs", icon: FileCheck },
      { to: "/dashboard/alcootest", label: "Alcootest", icon: ClipboardList },
      { to: "/dashboard/declaration-objets", label: "Déclaration objets", icon: FileSignature },
      { to: "/dashboard/comptes-rendus", label: "Rapport journalier", icon: FileText },
    ]
  },
  { title: "ÉQUIPE & ADMINISTRATION", items: [{ to: "/dashboard/employes", label: "Employés", icon: ContactRound }, { to: "/dashboard/administration", label: "Administration", icon: Settings2 }, { to: "/dashboard/documents", label: "Documents du site", icon: BookOpen }, { to: "/dashboard/cameras", label: "Caméras", icon: Video }] },
];

const SECURITY_ROUTES = new Set([
  "/dashboard", "/dashboard/statistiques", "/dashboard/postes", "/dashboard/prestataires",
  "/dashboard/mouvements-cles", "/dashboard/carte-grise-permis", "/dashboard/dechets-levee", "/dashboard/mouvements-aps",
  "/dashboard/dechargements-bennes-vides", "/dashboard/dechargements-matiere-premiere", "/dashboard/depotage-fuel-gasoil",
  "/dashboard/mouvements-vehicules", "/dashboard/pointage-aps", "/dashboard/enregistrements-bon-facture-bon-sortie",
  "/dashboard/courrier", "/dashboard/anomalie", "/dashboard/alcootest", "/dashboard/consigne",
  "/dashboard/chargements-star-particuliers", "/dashboard/materiels-sous-traitant", "/dashboard/enregistrements-ordures", "/dashboard/ordures", "/dashboard/ferrailles",
  "/dashboard/mouvement-velos", "/dashboard/mouvement-moto", "/dashboard/visiteurs", "/dashboard/materiels-star", "/dashboard/chauffeurs",
  "/dashboard/check-list-camion", "/dashboard/questionnaires-visiteurs", "/dashboard/recoter", "/dashboard/declaration-objets", "/dashboard/comptes-rendus",
  "/dashboard/prise-de-poste", "/dashboard/passation", "/dashboard/cameras", "/dashboard/main-courante", "/dashboard/rondes", "/dashboard/points-vigilance", "/dashboard/controle-acces", "/dashboard/logistique",
  "/dashboard/documents",
]);

const POST_AGENT_ROUTES = new Set([
  "/dashboard/postes", "/dashboard/prestataires", "/dashboard/prise-de-poste",
  "/dashboard/visiteurs", "/dashboard/controle-acces", "/dashboard/logistique", "/dashboard/rondes", "/dashboard/points-vigilance", "/dashboard/main-courante", "/dashboard/comptes-rendus", "/dashboard/documents",
  "/dashboard/mouvements-cles", "/dashboard/carte-grise-permis", "/dashboard/dechets-levee", "/dashboard/mouvements-aps",
  "/dashboard/dechargements-bennes-vides", "/dashboard/dechargements-matiere-premiere", "/dashboard/depotage-fuel-gasoil",
  "/dashboard/mouvements-vehicules", "/dashboard/pointage-aps", "/dashboard/enregistrements-bon-facture-bon-sortie",
  "/dashboard/courrier", "/dashboard/anomalie", "/dashboard/alcootest", "/dashboard/consigne",
  "/dashboard/chargements-star-particuliers", "/dashboard/materiels-sous-traitant", "/dashboard/enregistrements-ordures", "/dashboard/ordures", "/dashboard/ferrailles",
  "/dashboard/mouvement-velos", "/dashboard/mouvement-moto", "/dashboard/materiels-star", "/dashboard/chauffeurs",
  "/dashboard/check-list-camion", "/dashboard/questionnaires-visiteurs", "/dashboard/recoter", "/dashboard/declaration-objets",
]);

const CHEF_ROUTES = new Set([...POST_AGENT_ROUTES, "/dashboard/passation"]);
const DIRECTION_ROUTES = new Set([
  "/dashboard", "/dashboard/statistiques", "/dashboard/comptes-rendus",
]);

export function homeRouteForRole(role: number): string {
  if (role === 2) return "/dashboard/prise-de-poste";
  if (role === 5) return "/dashboard/postes";
  return "/dashboard";
}

export function canAccessRoute(role: number, path: string): boolean {
  if (role === 1) return true;
  let normalizedPath = path.replace(/\/$/, "") || "/dashboard";
  if (/^\/dashboard\/postes\/[^/]+$/.test(normalizedPath)) normalizedPath = "/dashboard/postes";
  if (/^\/dashboard\/prestataires\/[^/]+$/.test(normalizedPath)) normalizedPath = "/dashboard/prestataires";
  if (normalizedPath === "/dashboard/test-alcool") normalizedPath = "/dashboard/alcootest";
  if (role === 2) return CHEF_ROUTES.has(normalizedPath);
  if (role === 3) return SECURITY_ROUTES.has(normalizedPath);
  if (role === 4) return DIRECTION_ROUTES.has(normalizedPath);
  if (role === 5) return POST_AGENT_ROUTES.has(normalizedPath);
  return false;
}

export function roleLabel(role: number): string {
  return ({ 1: "Administrateur", 2: "Chef de poste", 3: "Responsable sécurité", 4: "Direction / RAF / chefs de service", 5: "Agent APS" } as Record<number, string>)[role] || "Utilisateur";
}
