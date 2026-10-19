
import { useSyncExternalStore } from "react";

type Base = {
  id: string;
  agent_id: string;
  created_at: string;
};

type Checkpoint = {
  name: string;
  at: string | null;
};

export type DemoTables = {
  profiles: {
    id: string;
    full_name: string;
  };

  shifts: Base & {
    post_name: string;
    started_at: string;
    ended_at: string | null;
    checklist: Record<string, boolean>;
    notes: string | null;
  };

  handovers: Base & {
    incoming_agent: string;
    equipment: string | null;
    ongoing_events: string | null;
    instructions: string | null;
  };

  visitors: Base & {
    full_name: string;
    company: string;
    id_document: string;
    host: string;
    reason: string;
    badge: string;
    vehicle: string;
    zone: string;
    equipment: string | null;
    exit_notes: string | null;
    entered_at: string;
    exited_at: string | null;
  };

  logbook_entries: Base & {
    category: string;
    severity: string;
    description: string;
  };

  patrols: Base & {
    route_name: string;
    started_at: string;
    ended_at: string | null;
    checkpoints: Checkpoint[];
    anomalies: string | null;
  };

  reports: Base & {
    title: string;
    content: string;
    report_type: string;
  };

  messages: Base & {
    sender_id: string;
    content: string;
    is_alert: boolean;
    acknowledged?: boolean;
  };

  vehicles: Base & {
    plate: string;
    company: string;
    driver: string;
    passengers: string;
    reason: string;
    zone: string;
    compliant: boolean;
    entered_at: string;
    exited_at: string | null;
  };

  badges: Base & {
    uid: string;
    holder: string;
    level: string;
    zone: string;
    active: boolean;
  };
};

const at = (h: string) => `2026-10-08T${h}:00`;

const base = (
  id: string,
  agent_id = "agent-1",
  time = "08:00"
) => ({
  id,
  agent_id,
  created_at: at(time),
});

const data: { [K in keyof DemoTables]: DemoTables[K][] } = {
  profiles: [
    { id: "agent-1", full_name: "Mickaël Rakoto" },
    { id: "agent-2", full_name: "Sarah Rabe" },
    { id: "agent-3", full_name: "Jean Ranaivo" },
    { id: "supervisor", full_name: "Aina Andria" },
  ],

  shifts: [
    {
      ...base("shift-1"),
      post_name: "Accueil · Poste principal",
      started_at: at("06:00"),
      ended_at: null,
      checklist: {},
      notes: "RAS à la relève",
    },
    {
      ...base("shift-2", "agent-2"),
      post_name: "Contrôle · Périmètre",
      started_at: at("06:00"),
      ended_at: null,
      checklist: {},
      notes: null,
    },
    {
      ...base("shift-3", "agent-3"),
      post_name: "Supervision vidéo",
      started_at: at("06:00"),
      ended_at: null,
      checklist: {},
      notes: null,
    },
  ],

  handovers: [
    {
      ...base("handover-1", "agent-3", "05:55"),
      incoming_agent: "Mickaël Rakoto",
      equipment: "Radio 02, trousseau principal, tablette 01",
      ongoing_events:
        "Maintenance de la caméra du parking à prévoir.",
      instructions:
        "Livraison attendue à 10 h. Contrôler le chargement.",
    },
  ],

  visitors: [
    {
      ...base("visitor-1"),
      full_name: "Marie Laurent",
      company: "Tech Solutions",
      id_document: "4821",
      host: "Direction technique",
      reason: "Maintenance réseau",
      badge: "V-014",
      vehicle: "",
      zone: "Bureaux",
      equipment: "Ordinateur portable",
      exit_notes: null,
      entered_at: at("08:12"),
      exited_at: null,
    },
    {
      ...base("visitor-2"),
      full_name: "Thomas Bernard",
      company: "Logistique Express",
      id_document: "9056",
      host: "Responsable logistique",
      reason: "Livraison",
      badge: "V-015",
      vehicle: "1234 TBA",
      zone: "Entrepôt",
      equipment: null,
      exit_notes: null,
      entered_at: at("08:25"),
      exited_at: null,
    },
    {
      ...base("visitor-3"),
      full_name: "Hery Ravel",
      company: "Atelier Mada",
      id_document: "1035",
      host: "Service maintenance",
      reason: "Contrôle équipements",
      badge: "V-012",
      vehicle: "",
      zone: "Local technique",
      equipment: null,
      exit_notes: null,
      entered_at: at("07:30"),
      exited_at: at("08:10"),
    },
  ],

  logbook_entries: [
    {
      ...base("log-1", "agent-2", "08:42"),
      category: "Anomalie technique",
      severity: "important",
      description:
        "Caméra parking indisponible. Maintenance informée, surveillance renforcée sur la zone.",
    },
    {
      ...base("log-2", "agent-2", "08:35"),
      category: "Ronde",
      severity: "normal",
      description:
        "Ronde périmétrique en cours · 4 points de contrôle sur 8 validés.",
    },
    {
      ...base("log-3", "agent-1", "08:25"),
      category: "Visiteur",
      severity: "normal",
      description:
        "Entrée de Thomas Bernard · Logistique Express · badge V-015.",
    },
    {
      ...base("log-4", "agent-1", "08:12"),
      category: "Visiteur",
      severity: "normal",
      description:
        "Entrée de Marie Laurent · Tech Solutions · badge V-014.",
    },
    {
      ...base("log-5", "agent-3", "06:00"),
      category: "Prise de poste",
      severity: "normal",
      description:
        "Ouverture de la vacation de jour. Trois agents présents, consignes transmises.",
    },
  ],

  patrols: [
    {
      ...base("patrol-1", "agent-2", "08:20"),
      route_name: "Ronde périmétrique",
      started_at: at("08:20"),
      ended_at: null,
      checkpoints: [
        "Accueil / hall",
        "Parking",
        "Portail principal",
        "Issues de secours",
        "Local technique",
        "Entrepôt",
        "Bureaux étage",
        "Clôture périmétrique",
      ].map((name, i) => ({
        name,
        at: i < 4 ? at(`08:${22 + i * 3}`) : null,
      })),
      anomalies: null,
    },
  ],

  reports: [
    {
      ...base("report-1", "agent-3", "05:50"),
      report_type: "Fin de service",
      title: "Vacation de nuit · 07–08 octobre",
      content:
        "Vacation : 18 h – 06 h\nAgents présents : 3\nPassages : 12\nRondes : 4 / 4 terminées\nIncidents : aucun\nObservations : site sécurisé à la relève.",
    },
  ],

  messages: [
    {
      ...base("message-1", "supervisor", "07:45"),
      sender_id: "supervisor",
      content:
        "Bonjour à tous. Livraison prévue à 10 h au portail principal. Merci de vérifier le bon de livraison et le chargement.",
      is_alert: false,
      acknowledged: false,
    },
    {
      ...base("message-2", "agent-2", "08:20"),
      sender_id: "agent-2",
      content:
        "Je démarre la ronde périmétrique. Radio opérationnelle.",
      is_alert: false,
    },
    {
      ...base("message-3", "agent-1", "08:26"),
      sender_id: "agent-1",
      content:
        "Bien reçu. Le visiteur Logistique Express est à l’accueil.",
      is_alert: false,
    },
  ],

  vehicles: [
    {
      ...base("vehicle-1"),
      plate: "1234 TBA",
      company: "Logistique Express",
      driver: "Thomas Bernard",
      passengers: "0",
      reason: "Livraison",
      zone: "Quai de livraison",
      compliant: true,
      entered_at: at("08:25"),
      exited_at: null,
    },
  ],

  badges: [
    {
      ...base("badge-1"),
      uid: "04:A3:12:8F",
      holder: "Mickaël Rakoto",
      level: "Personnel",
      zone: "Toutes zones",
      active: true,
    },
    {
      ...base("badge-2"),
      uid: "04:B5:21:9D",
      holder: "Tech Solutions",
      level: "Prestataire",
      zone: "Bureaux",
      active: true,
    },
    {
      ...base("badge-3"),
      uid: "V-014",
      holder: "Marie Laurent",
      level: "Visiteur",
      zone: "Bureaux",
      active: true,
    },
    {
      ...base("badge-4"),
      uid: "04:F0:00:1C",
      holder: "Badge expiré",
      level: "Refusé",
      zone: "Aucune",
      active: false,
    },
  ],
};

let revision = 0;
const listeners = new Set<() => void>();

function notify() {
  revision++;
  listeners.forEach((fn) => fn());
}

function bucket<K extends keyof DemoTables>(
  table: K
): DemoTables[K][] {
  return data[table] as DemoTables[K][];
}

export const demo = {
  list<K extends keyof DemoTables>(
    table: K
  ): DemoTables[K][] {
    return bucket(table).slice();
  },

  add<K extends keyof DemoTables>(
    table: K,
    values: Partial<DemoTables[K]>
  ) {
    const now = new Date().toISOString();

    const defaults = {
      id: `demo-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}`,
      agent_id: "agent-1",
      sender_id: "agent-1",
      created_at: now,
      started_at: now,
      entered_at: now,
      ended_at: null,
      exited_at: null,
      severity: "normal",
      is_alert: false,
      checklist: {},
      checkpoints: [],
      notes: null,
      anomalies: null,
    };

    const row = {
      ...defaults,
      ...values,
    } as unknown as DemoTables[K];

    bucket(table).unshift(row);
    notify();

    return { error: null };
  },

  update<K extends keyof DemoTables>(
    table: K,
    id: string,
    values: Partial<DemoTables[K]>
  ) {
    const rows = bucket(table);
    const index = rows.findIndex((row) => row.id === id);
    const row = rows[index];

    if (row) {
      rows[index] = { ...row, ...values };
    }

    notify();

    return { error: null };
  },
};

export function useDemoTable<K extends keyof DemoTables>(
  table: K
): DemoTables[K][] {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    () => revision,
    () => 0
  );

  return demo.list(table);
}

export function pageHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — SECURITEC` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — SECURITEC` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  };
}

export function exportCsv(
  name: string,
  rows: Record<string, unknown>[]
) {
  const first = rows[0];

  if (!first) return;

  const keys = Object.keys(first);

  const csv =
    "\ufeff" +
    [
      keys.join(";"),
      ...rows.map((row) =>
        keys
          .map(
            (key) =>
              `"${String(row[key] ?? "").replaceAll('"', '""')}"`
          )
          .join(";")
      ),
    ].join("\n");

  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8;" })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();

  URL.revokeObjectURL(url);
}
