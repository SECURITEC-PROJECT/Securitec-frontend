import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { api } from "../services/api";
import type {
  LogbookEntry,
  PersonMovement,
  Vacation,
  VehicleMovement,
  Visitor,
  AccessLog,
  Ronde,
  Consigne,
  Notification,
  CameraFeed,
  JournalEntry,
} from "../types";

interface DataContextValue {
  persons: PersonMovement[];
  addPerson: (p: Omit<PersonMovement, "id">) => Promise<void>;
  updatePerson: (id: string, patch: Partial<PersonMovement>) => Promise<void>;
  removePerson: (id: string) => Promise<void>;

  vehicles: VehicleMovement[];
  addVehicle: (v: Omit<VehicleMovement, "id">) => Promise<void>;
  updateVehicle: (id: string, patch: Partial<VehicleMovement>) => Promise<void>;
  removeVehicle: (id: string) => Promise<void>;

  logbook: LogbookEntry[];
  addLog: (l: Omit<LogbookEntry, "id">) => Promise<void>;
  removeLog: (id: string) => Promise<void>;

  vacations: Vacation[];
  addVacation: (v: Omit<Vacation, "id">) => Promise<void>;
  updateVacation: (id: string, patch: Partial<Vacation>) => Promise<void>;

  visitors: Visitor[];
  addVisitor: (v: Omit<Visitor, "id">) => Promise<void>;
  updateVisitor: (id: string, patch: Partial<Visitor>) => Promise<void>;
  removeVisitor: (id: string) => Promise<void>;

  accessLogs: AccessLog[];
  addAccessLog: (log: Omit<AccessLog, "id">) => Promise<void>;

  rondes: Ronde[];
  addRonde: (r: Omit<Ronde, "id" | "checkpoints"> & { checkpoints: any[] }) => Promise<void>;
  updateRonde: (id: string, patch: Partial<Ronde>) => Promise<void>;
  updateCheckpoint: (cpId: string, status: string, time?: string) => Promise<void>;

  consignes: Consigne[];
  addConsigne: (c: Omit<Consigne, "id">) => Promise<void>;
  markConsigneAsRead: (id: string) => Promise<void>;

  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id">) => Promise<void>;
  removeNotification: (id: string) => Promise<void>;

  cameras: CameraFeed[];
  updateCameraStatus: (id: string, status: "live" | "alerte") => Promise<void>;

  journal: JournalEntry[];

  resetAll: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [persons, setPersons] = useState<PersonMovement[]>([]);
  const [vehicles, setVehicles] = useState<VehicleMovement[]>([]);
  const [logbook, setLogbook] = useState<LogbookEntry[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [rondes, setRondes] = useState<Ronde[]>([]);
  const [consignes, setConsignes] = useState<Consigne[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cameras, setCameras] = useState<CameraFeed[]>([]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [
        personsData,
        vehiclesData,
        logbookData,
        vacationsData,
        visitorsData,
        accessLogsData,
        rondesData,
        consignesData,
        notificationsData,
        camerasData,
      ] = await Promise.all([
        api.get('/persons'),
        api.get('/vehicles'),
        api.get('/logbook'),
        api.get('/vacations'),
        api.get('/visitors'),
        api.get('/access-logs'),
        api.get('/rondes'),
        api.get('/consignes'),
        api.get('/notifications'),
        api.get('/cameras'),
      ]);

      setPersons(personsData);
      setVehicles(vehiclesData);
      setLogbook(logbookData);
      setVacations(vacationsData);
      setVisitors(visitorsData);
      setAccessLogs(accessLogsData);
      setRondes(rondesData);
      setConsignes(consignesData);
      setNotifications(notificationsData);
      setCameras(camerasData);
    } catch (err) {
      console.error('Error fetching data from API:', err);
    }
  }, [user]);

  // Load data on user change
  useEffect(() => {
    if (!user) {
      setPersons([]);
      setVehicles([]);
      setLogbook([]);
      setVacations([]);
      setVisitors([]);
      setAccessLogs([]);
      setRondes([]);
      setConsignes([]);
      setNotifications([]);
      setCameras([]);
      return;
    }
    fetchData();
  }, [user, fetchData]);

  const resetAll = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Person Movements CRUD
  const addPerson = async (p: Omit<PersonMovement, "id">) => {
    try {
      const added = await api.post('/persons', p);
      setPersons((prev) => [added, ...prev]);
    } catch (err) {
      console.error('Error adding person movement:', err);
    }
  };

  const updatePerson = async (id: string, patch: Partial<PersonMovement>) => {
    try {
      const updated = await api.put(`/persons/${id}`, patch);
      setPersons((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      console.error('Error updating person movement:', err);
    }
  };

  const removePerson = async (id: string) => {
    try {
      await api.delete(`/persons/${id}`);
      setPersons((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Error removing person movement:', err);
    }
  };

  // Vehicle Movements CRUD
  const addVehicle = async (v: Omit<VehicleMovement, "id">) => {
    try {
      const added = await api.post('/vehicles', v);
      setVehicles((prev) => [added, ...prev]);
    } catch (err) {
      console.error('Error adding vehicle movement:', err);
    }
  };

  const updateVehicle = async (id: string, patch: Partial<VehicleMovement>) => {
    try {
      const updated = await api.put(`/vehicles/${id}`, patch);
      setVehicles((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      console.error('Error updating vehicle movement:', err);
    }
  };

  const removeVehicle = async (id: string) => {
    try {
      await api.delete(`/vehicles/${id}`);
      setVehicles((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Error removing vehicle movement:', err);
    }
  };

  // Logbook Entries CRUD
  const addLog = async (l: Omit<LogbookEntry, "id">) => {
    try {
      const added = await api.post('/logbook', l);
      setLogbook((prev) => [added, ...prev]);
    } catch (err) {
      console.error('Error adding logbook entry:', err);
    }
  };

  const removeLog = async (id: string) => {
    try {
      await api.delete(`/logbook/${id}`);
      setLogbook((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Error removing logbook entry:', err);
    }
  };

  // Vacations CRUD
  const addVacation = async (v: Omit<Vacation, "id">) => {
    try {
      const added = await api.post('/vacations', v);
      setVacations((prev) => [added, ...prev]);
    } catch (err) {
      console.error('Error adding vacation:', err);
    }
  };

  const updateVacation = async (id: string, patch: Partial<Vacation>) => {
    try {
      const updated = await api.put(`/vacations/${id}`, patch);
      setVacations((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      console.error('Error updating vacation:', err);
    }
  };

  // Visitors CRUD
  const addVisitor = async (v: Omit<Visitor, "id">) => {
    try {
      const added = await api.post('/visitors', v);
      setVisitors((prev) => [added, ...prev]);
    } catch (err) {
      console.error('Error adding visitor:', err);
    }
  };

  const updateVisitor = async (id: string, patch: Partial<Visitor>) => {
    try {
      const updated = await api.put(`/visitors/${id}`, patch);
      setVisitors((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      console.error('Error updating visitor:', err);
    }
  };

  const removeVisitor = async (id: string) => {
    try {
      await api.delete(`/visitors/${id}`);
      setVisitors((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Error removing visitor:', err);
    }
  };

  // Access Logs CRUD
  const addAccessLog = async (log: Omit<AccessLog, "id">) => {
    try {
      const added = await api.post('/access-logs', log);
      setAccessLogs((prev) => [added, ...prev]);
    } catch (err) {
      console.error('Error adding access log:', err);
    }
  };

  // Rondes and Checkpoints CRUD
  const addRonde = async (r: Omit<Ronde, "id" | "checkpoints"> & { checkpoints: any[] }) => {
    try {
      const added = await api.post('/rondes', r);
      setRondes((prev) => [added, ...prev]);
    } catch (err) {
      console.error('Error adding ronde:', err);
    }
  };

  const updateRonde = async (id: string, patch: Partial<Ronde>) => {
    try {
      const updated = await api.put(`/rondes/${id}`, patch);
      setRondes((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      console.error('Error updating ronde:', err);
    }
  };

  const updateCheckpoint = async (cpId: string, status: string, time?: string) => {
    try {
      const updatedCp = await api.put(`/rondes/checkpoint/${cpId}`, { status, time });
      setRondes((prev) =>
        prev.map((ronde) => {
          const hasCp = ronde.checkpoints.some((cp) => cp.id === cpId);
          if (!hasCp) return ronde;

          return {
            ...ronde,
            checkpoints: ronde.checkpoints.map((cp) => (cp.id === cpId ? updatedCp : cp)),
          };
        })
      );
    } catch (err) {
      console.error('Error updating checkpoint:', err);
    }
  };

  // Consignes CRUD
  const addConsigne = async (c: Omit<Consigne, "id">) => {
    try {
      const added = await api.post('/consignes', c);
      setConsignes((prev) => [added, ...prev]);
    } catch (err) {
      console.error('Error adding consigne:', err);
    }
  };

  const markConsigneAsRead = async (id: string) => {
    try {
      const updated = await api.put(`/consignes/${id}/read`, {});
      setConsignes((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      console.error('Error marking consigne as read:', err);
    }
  };

  // Notifications CRUD
  const addNotification = async (n: Omit<Notification, "id">) => {
    try {
      const added = await api.post('/notifications', n);
      setNotifications((prev) => [added, ...prev]);
    } catch (err) {
      console.error('Error adding notification:', err);
    }
  };

  const removeNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      console.error('Error removing notification:', err);
    }
  };

  // Cameras Feed CRUD
  const updateCameraStatus = async (id: string, status: "live" | "alerte") => {
    try {
      const updated = await api.put(`/cameras/${id}/status`, { status });
      setCameras((prev) => prev.map((x) => (x.id === id ? updated : x)));
    } catch (err) {
      console.error('Error updating camera status:', err);
    }
  };

  const journal = useMemo<JournalEntry[]>(() => {
    const entries: JournalEntry[] = [];

    // Map logbook entries
    logbook.forEach((lb) => {
      entries.push({
        id: `J-LB-${lb.id}`,
        time: lb.time,
        type: lb.category === "alerte" || lb.category === "incident" ? "alerte" : lb.category === "ronde" ? "ronde" : "info",
        message: `${lb.category.toUpperCase()}: ${lb.description} (${lb.zone})`,
        agent: lb.agent,
      });
    });

    // Map access logs
    accessLogs.forEach((acc) => {
      entries.push({
        id: `J-ACC-${acc.id}`,
        time: acc.time,
        type: acc.type === "refus" ? "alerte" : "acces",
        message: `Passage badge ${acc.badge} ${acc.name} — ${acc.zone} (${acc.detail})`,
        agent: "Système",
      });
    });

    // Map visitors
    visitors.forEach((v) => {
      entries.push({
        id: `J-V-${v.id}`,
        time: v.arrival,
        type: "visiteur",
        message: `Visiteur ${v.name} (${v.company}) arrivé, badge ${v.badge}`,
        agent: v.hostAgent,
      });
    });

    // Sort by time descending
    return entries.sort((a, b) => b.time.localeCompare(a.time));
  }, [logbook, accessLogs, visitors]);

  const value = useMemo<DataContextValue>(() => ({
    persons,
    addPerson,
    updatePerson,
    removePerson,

    vehicles,
    addVehicle,
    updateVehicle,
    removeVehicle,

    logbook,
    addLog,
    removeLog,

    vacations,
    addVacation,
    updateVacation,

    visitors,
    addVisitor,
    updateVisitor,
    removeVisitor,

    accessLogs,
    addAccessLog,

    rondes,
    addRonde,
    updateRonde,
    updateCheckpoint,

    consignes,
    addConsigne,
    markConsigneAsRead,

    notifications,
    addNotification,
    removeNotification,

    cameras,
    updateCameraStatus,

    journal,

    resetAll,
  }), [
    persons,
    vehicles,
    logbook,
    vacations,
    visitors,
    accessLogs,
    rondes,
    consignes,
    notifications,
    cameras,
    journal,
    resetAll,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
