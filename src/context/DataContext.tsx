import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  PERSON_MOVEMENTS,
  VEHICLE_MOVEMENTS,
  LOGBOOK,
  VACATIONS,
  VISITORS,
} from "../data/mock";
import type {
  LogbookEntry,
  PersonMovement,
  Vacation,
  VehicleMovement,
  Visitor,
} from "../types";

function usePersisted<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch { /* ignore */ }
    return initial;
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* ignore */ }
  }, [key, state]);
  return [state, setState];
}

const genId = (p: string) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

interface DataContextValue {
  persons: PersonMovement[];
  addPerson: (p: Omit<PersonMovement, "id">) => void;
  updatePerson: (id: string, patch: Partial<PersonMovement>) => void;
  removePerson: (id: string) => void;

  vehicles: VehicleMovement[];
  addVehicle: (v: Omit<VehicleMovement, "id">) => void;
  updateVehicle: (id: string, patch: Partial<VehicleMovement>) => void;
  removeVehicle: (id: string) => void;

  logbook: LogbookEntry[];
  addLog: (l: Omit<LogbookEntry, "id">) => void;
  removeLog: (id: string) => void;

  vacations: Vacation[];
  addVacation: (v: Omit<Vacation, "id">) => void;
  updateVacation: (id: string, patch: Partial<Vacation>) => void;

  visitors: Visitor[];
  addVisitor: (v: Omit<Visitor, "id">) => void;
  updateVisitor: (id: string, patch: Partial<Visitor>) => void;
  removeVisitor: (id: string) => void;

  resetAll: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [persons, setPersons] = usePersisted<PersonMovement[]>("securitec.persons", PERSON_MOVEMENTS);
  const [vehicles, setVehicles] = usePersisted<VehicleMovement[]>("securitec.vehicles", VEHICLE_MOVEMENTS);
  const [logbook, setLogbook] = usePersisted<LogbookEntry[]>("securitec.logbook", LOGBOOK);
  const [vacations, setVacations] = usePersisted<Vacation[]>("securitec.vacations", VACATIONS);
  const [visitors, setVisitors] = usePersisted<Visitor[]>("securitec.visitors", VISITORS);

  const resetAll = useCallback(() => {
    setPersons(PERSON_MOVEMENTS);
    setVehicles(VEHICLE_MOVEMENTS);
    setLogbook(LOGBOOK);
    setVacations(VACATIONS);
    setVisitors(VISITORS);
  }, [setPersons, setVehicles, setLogbook, setVacations, setVisitors]);

  const value = useMemo<DataContextValue>(() => ({
    persons,
    addPerson: (p) => setPersons((prev) => [{ ...p, id: genId("PM") }, ...prev]),
    updatePerson: (id, patch) => setPersons((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    removePerson: (id) => setPersons((prev) => prev.filter((x) => x.id !== id)),

    vehicles,
    addVehicle: (v) => setVehicles((prev) => [{ ...v, id: genId("VM") }, ...prev]),
    updateVehicle: (id, patch) => setVehicles((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    removeVehicle: (id) => setVehicles((prev) => prev.filter((x) => x.id !== id)),

    logbook,
    addLog: (l) => setLogbook((prev) => [{ ...l, id: genId("LB") }, ...prev]),
    removeLog: (id) => setLogbook((prev) => prev.filter((x) => x.id !== id)),

    vacations,
    addVacation: (v) => setVacations((prev) => [{ ...v, id: genId("VAC") }, ...prev]),
    updateVacation: (id, patch) => setVacations((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),

    visitors,
    addVisitor: (v) => setVisitors((prev) => [{ ...v, id: genId("V") }, ...prev]),
    updateVisitor: (id, patch) => setVisitors((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    removeVisitor: (id) => setVisitors((prev) => prev.filter((x) => x.id !== id)),

    resetAll,
  }), [persons, vehicles, logbook, vacations, visitors, setPersons, setVehicles, setLogbook, setVacations, setVisitors, resetAll]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
