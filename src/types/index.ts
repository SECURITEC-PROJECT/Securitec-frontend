export type Role = "agent1" | "agent2" | "agent3" | "supervisor";

export interface User {
  id: string;
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
