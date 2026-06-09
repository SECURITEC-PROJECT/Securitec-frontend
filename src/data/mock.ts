import type {
  AccessLog,
  CameraFeed,
  Checkpoint,
  Consigne,
  JournalEntry,
  LogbookEntry,
  Notification,
  PersonMovement,
  Role,
  Ronde,
  User,
  Vacation,
  VehicleMovement,
  Visitor,
} from "../types";

export const USERS: Record<Role, User> = {
  agent1: {
    id: "U01",
    username: "agent1",
    password: "1234",
    name: "KOUASSI Anicet",
    role: "agent1",
    roleLabel: "Accueil & Administration",
    vacation: "06h–18h",
    avatar: "01",
  },
  agent2: {
    id: "U02",
    username: "agent2",
    password: "1234",
    name: "RABE Olivier",
    role: "agent2",
    roleLabel: "Contrôle NFC & Rondes",
    vacation: "06h–18h",
    avatar: "02",
  },
  agent3: {
    id: "U03",
    username: "agent3",
    password: "1234",
    name: "ANDRY Soa",
    role: "agent3",
    roleLabel: "Surveillance & CR",
    vacation: "06h–18h",
    avatar: "03",
  },
  supervisor: {
    id: "U99",
    username: "superviseur",
    password: "admin",
    name: "RAJAONA Patrick",
    role: "supervisor",
    roleLabel: "Superviseur Site",
    vacation: "24/7",
    avatar: "SV",
  },
};

export const ACCESS_LOG: AccessLog[] = [
  { id: "L1", name: "RAKOTO Jean", badge: "#A-0042", type: "permanent", zone: "ZONE A", time: "08:47", detail: "Personnel permanent" },
  { id: "L2", name: "RABE Marie", badge: "#A-0017", type: "permanent", zone: "ZONE B", time: "08:52", detail: "Personnel permanent" },
  { id: "L3", name: "ANDRIA Paul", badge: "#V-0003", type: "visiteur", zone: "ZONE A", time: "09:05", detail: "Visiteur — escorte requise" },
  { id: "L4", name: "Inconnu", badge: "#?-????", type: "refus", zone: "REFUS", time: "09:12", detail: "Badge non reconnu — alerte superviseur" },
  { id: "L5", name: "RANDRIA Sitraka", badge: "#A-0091", type: "permanent", zone: "ZONE C", time: "09:18", detail: "Personnel permanent" },
  { id: "L6", name: "TIANA Lova", badge: "#V-0004", type: "visiteur", zone: "ZONE A", time: "09:24", detail: "Prestataire — Telma" },
  { id: "L7", name: "RAVELO Anja", badge: "#A-0033", type: "permanent", zone: "ZONE B", time: "09:31", detail: "Personnel permanent" },
];

export const VISITORS: Visitor[] = [
  { id: "V1", name: "ANDRIA Paul", company: "Cabinet Audit RAVO", motif: "Réunion direction", badge: "V-0003", hostAgent: "Mme RAHARISOA", arrival: "09:05", expectedDuration: "2h", status: "actif" },
  { id: "V2", name: "TIANA Lova", company: "Telma Telecom", motif: "Maintenance fibre", badge: "V-0004", hostAgent: "M. RABE", arrival: "09:24", expectedDuration: "4h", status: "actif" },
  { id: "V3", name: "RANDRIA Bako", company: "DHL Express", motif: "Livraison colis", badge: "V-0001", hostAgent: "Accueil", arrival: "08:12", expectedDuration: "15min", status: "sorti" },
];

export const CHECKPOINTS: Checkpoint[] = [
  { id: "CP1", name: "Portail Principal", zone: "Périmètre", status: "done", time: "06:15" },
  { id: "CP2", name: "Parking Visiteurs", zone: "Extérieur", status: "done", time: "06:22" },
  { id: "CP3", name: "Local Technique", zone: "Bâtiment A", status: "done", time: "06:31" },
  { id: "CP4", name: "Zone Stockage", zone: "Bâtiment B", status: "missed", time: undefined },
  { id: "CP5", name: "Issue Secours Est", zone: "Périmètre", status: "pending" },
  { id: "CP6", name: "Issue Secours Ouest", zone: "Périmètre", status: "pending" },
  { id: "CP7", name: "Salle Serveurs", zone: "Bâtiment A", status: "pending" },
  { id: "CP8", name: "Toiture", zone: "Bâtiment A", status: "pending" },
];

export const RONDES: Ronde[] = [
  { id: "R1", circuit: "Circuit Nuit — 06h", start: "06:00", agent: "Agent 02", checkpoints: CHECKPOINTS, status: "encours" },
];

export const JOURNAL: JournalEntry[] = [
  { id: "J1", time: "06:00", type: "info", message: "Prise de poste effectuée par Agent 01", agent: "Agent 01" },
  { id: "J2", time: "06:15", type: "ronde", message: "Début ronde Circuit Nuit", agent: "Agent 02" },
  { id: "J3", time: "08:47", type: "acces", message: "Passage badge A-0042 RAKOTO Jean — Zone A", agent: "Système" },
  { id: "J4", time: "09:05", type: "visiteur", message: "Création visiteur V-0003 ANDRIA Paul", agent: "Agent 01" },
  { id: "J5", time: "09:12", type: "alerte", message: "Badge inconnu refusé — alerte superviseur", agent: "Système" },
  { id: "J6", time: "09:24", type: "visiteur", message: "Création visiteur V-0004 TIANA Lova", agent: "Agent 01" },
  { id: "J7", time: "09:32", type: "alerte", message: "Détection mouvement Caméra 03 — Parking", agent: "Système" },
  { id: "J8", time: "09:45", type: "ronde", message: "Point de contrôle CP4 manqué — Zone Stockage", agent: "Système" },
];

export const CONSIGNES: Consigne[] = [
  { id: "C1", from: "RAJAONA Patrick (Superviseur)", text: "Renforcer la vigilance sur la zone parking après 18h suite à l'intrusion signalée hier soir.", priority: "high", time: "07:42", unread: true, target: "all" },
  { id: "C2", from: "RAJAONA Patrick (Superviseur)", text: "Visite délégation prévue à 14h — accueil à préparer, escorte permanente requise (badges V-0010 à V-0014).", priority: "med", time: "08:10", unread: true, target: ["agent1", "agent2"] },
  { id: "C3", from: "Direction", text: "Rappel — port obligatoire du badge en zone B.", priority: "low", time: "Hier 17:30", unread: false, target: "all" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "N1", text: "Badge inconnu refusé en Zone A", time: "09:12", type: "alert" },
  { id: "N2", text: "Détection mouvement Caméra 03", time: "09:32", type: "warn" },
  { id: "N3", text: "Point de contrôle CP4 manqué", time: "09:45", type: "warn" },
];

export const CAMERAS: CameraFeed[] = [
  { id: "CAM1", label: "CAM 01 — Entrée principale", status: "live" },
  { id: "CAM2", label: "CAM 02 — Hall accueil", status: "live" },
  { id: "CAM3", label: "CAM 03 — Parking visiteurs", status: "alerte" },
  { id: "CAM4", label: "CAM 04 — Zone stockage", status: "live" },
];

const today = new Date().toISOString().slice(0, 10);

export const PERSON_MOVEMENTS: PersonMovement[] = [
  { id: "PM1", type: "entree", personType: "permanent", fullName: "RAKOTO Jean", badge: "A-0042", badgeColor: "VERT", zone: "ZONE A", date: today, time: "08:47", agent: "Agent 01" },
  { id: "PM2", type: "entree", personType: "permanent", fullName: "RABE Marie", badge: "A-0017", badgeColor: "VERT", zone: "ZONE B", date: today, time: "08:52", agent: "Agent 01" },
  { id: "PM3", type: "entree", personType: "visiteur", fullName: "ANDRIA Paul", badge: "V-0003", badgeColor: "ORANGE", zone: "ZONE A", motif: "Réunion direction", date: today, time: "09:05", agent: "Agent 01" },
  { id: "PM4", type: "entree", personType: "prestataire", fullName: "TIANA Lova", badge: "V-0004", badgeColor: "ORANGE", zone: "ZONE A", motif: "Maintenance fibre", date: today, time: "09:24", agent: "Agent 01" },
  { id: "PM5", type: "sortie", personType: "prestataire", fullName: "RANDRIA Bako", badge: "V-0001", badgeColor: "ORANGE", zone: "ZONE A", motif: "Livraison DHL", date: today, time: "08:27", agent: "Agent 01", linkedTo: "PM0" },
];

export const VEHICLE_MOVEMENTS: VehicleMovement[] = [
  { id: "VM1", type: "entree", plate: "3456 TBA", category: "leger", driver: "RAKOTO Jean", motif: "Personnel permanent", parkingSpot: "P-12", date: today, time: "08:45", agent: "Agent 02" },
  { id: "VM2", type: "entree", plate: "7821 TBC", category: "utilitaire", driver: "TIANA Lova", company: "Telma Telecom", motif: "Maintenance fibre", parkingSpot: "L-03", date: today, time: "09:23", agent: "Agent 02" },
  { id: "VM3", type: "sortie", plate: "1190 TAA", category: "poids-lourd", driver: "RANDRIA Bako", company: "DHL", motif: "Livraison terminée", date: today, time: "08:27", agent: "Agent 02" },
];

export const LOGBOOK: LogbookEntry[] = [
  { id: "LB1", date: today, time: "06:15", category: "ronde", zone: "Périmètre", description: "Début ronde Circuit Nuit, tous accès vérifiés.", severity: "info", agent: "Agent 02" },
  { id: "LB2", date: today, time: "07:42", category: "observation", zone: "Parking", description: "Véhicule visiteur stationné sans badge — propriétaire identifié et badge délivré.", severity: "mineur", agent: "Agent 01" },
  { id: "LB3", date: today, time: "09:12", category: "alerte", zone: "ZONE A", description: "Badge inconnu refusé au lecteur principal. Alerte superviseur émise.", severity: "majeur", agent: "Système" },
  { id: "LB4", date: today, time: "09:32", category: "incident", zone: "Parking visiteurs", description: "Détection mouvement caméra 03 hors horaires, levée de doute OK.", severity: "mineur", agent: "Agent 03" },
];

export const VACATIONS: Vacation[] = [
  {
    id: "VAC1",
    date: today,
    shift: "jour",
    outgoingAgent: "Équipe Nuit (RAFANO Hery)",
    incomingAgent: "KOUASSI Anicet",
    summary: "RAS sur la nuit, 1 alerte caméra levée à 03h12 (chat errant).",
    remarks: "Stock badges visiteurs : 12 restants. Renforcer le suivi parking après 18h.",
    pendingItems: "Visite délégation prévue 14h — préparer 5 badges ORANGE.",
    signedOut: true,
    signedIn: true,
    status: "validee",
  },
];
