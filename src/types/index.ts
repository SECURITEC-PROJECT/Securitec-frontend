export type Role = "agent1" | "agent2" | "agent3" | "supervisor";

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: Role;
  roleLabel: string;
  vacation: string;
  avatar: string;
}

export interface AccessLog {
  id: string;
  name: string;
  badge: string;
  type: "permanent" | "visiteur" | "refus";
  zone: string;
  time: string;
  detail: string;
}

export interface Visitor {
  id: string;
  name: string;
  company: string;
  motif: string;
  badge: string;
  hostAgent: string;
  arrival: string;
  expectedDuration: string;
  status: "actif" | "sorti" | "attente";
}

export interface Checkpoint {
  id: string;
  name: string;
  zone: string;
  status: "pending" | "done" | "missed";
  time?: string;
}

export interface Ronde {
  id: string;
  circuit: string;
  start: string;
  agent: string;
  checkpoints: Checkpoint[];
  status: "encours" | "terminee" | "retard";
}

export interface JournalEntry {
  id: string;
  time: string;
  type: "info" | "alerte" | "acces" | "ronde" | "visiteur" | "cr";
  message: string;
  agent: string;
}

export interface Consigne {
  id: string;
  from: string;
  text: string;
  priority: "high" | "med" | "low";
  time: string;
  unread: boolean;
  target: Role[] | "all";
}

export interface Notification {
  id: string;
  text: string;
  time: string;
  type: "alert" | "info" | "warn";
}

export interface CameraFeed {
  id: string;
  label: string;
  status: "live" | "alerte";
}

/* ====== Nouveaux modules CDC ====== */

export type BadgeColor = "VERT" | "ORANGE" | "BLEU" | "ROUGE";
export type PersonType = "permanent" | "visiteur" | "prestataire" | "interimaire";

export interface PersonMovement {
  id: string;
  type: "entree" | "sortie";
  personType: PersonType;
  fullName: string;
  badge: string;
  badgeColor: BadgeColor;
  zone: string;
  motif?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  agent: string; // saisi par
  linkedTo?: string; // id de l'entrée correspondante pour une sortie
}

export interface VehicleMovement {
  id: string;
  type: "entree" | "sortie";
  plate: string;
  category: "leger" | "utilitaire" | "poids-lourd" | "moto";
  driver: string;
  company?: string;
  motif: string;
  parkingSpot?: string;
  date: string;
  time: string;
  agent: string;
}

export interface LogbookEntry {
  id: string;
  date: string;
  time: string;
  category: "ronde" | "incident" | "intervention" | "livraison" | "observation" | "alerte";
  zone: string;
  description: string;
  severity: "info" | "mineur" | "majeur" | "critique";
  agent: string;
}

export interface Vacation {
  id: string;
  date: string;
  shift: "jour" | "nuit";
  outgoingAgent: string;
  incomingAgent: string;
  summary: string;
  remarks: string;
  pendingItems: string;
  signedOut: boolean;
  signedIn: boolean;
  status: "en-cours" | "transmise" | "validee";
}
