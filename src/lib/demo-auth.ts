import { useSyncExternalStore } from "react";

// Demo identity only: these labels never authorize access to real data.
export const demoAccounts = [
  { id: "agent-1", username: "kbenali", name: "Karim Benali", label: "Agent 01", badge: "SEC-001" },
  { id: "agent-2", username: "smartin", name: "Sophie Martin", label: "Agent 02", badge: "SEC-002" },
  { id: "agent-3", username: "lmoreau", name: "Lucas Moreau", label: "Agent 03", badge: "SEC-003" },
  { id: "supervisor", username: "nrakoto", name: "Nadia Rakoto", label: "Superviseur", badge: "SEC-004" },
  { id: "admin", username: "tleroy", name: "Thomas Leroy", label: "Administrateur", badge: "SEC-005" },
  { id: "client", username: "cdubois", name: "Camille Dubois", label: "Client", badge: "SEC-006" },
] as const;
const key = "securitec-demo-profile";
const listeners = new Set<() => void>();
export function getDemoAccount() {
  if (typeof window === "undefined") return null;
  try { return demoAccounts.find(a => a.username === sessionStorage.getItem(key)) ?? null; }
  catch { return null; }
}
export function loginDemo(identifier: string, pin: string, mode: "identifier" | "badge") {
  const normalized = identifier.trim().toLowerCase();
  const account = demoAccounts.find(a => (mode === "badge" ? a.badge : a.username).toLowerCase() === normalized);
  if (!account || pin !== "123456") return false;
  try { sessionStorage.setItem(key, account.username); } catch { return false; }
  listeners.forEach(fn => fn());
  return true;
}
export function logoutDemo() {
  try { sessionStorage.removeItem(key); } catch { /* no persisted session */ }
  listeners.forEach(fn => fn());
}
export function useDemoAccount() {
  return useSyncExternalStore(fn => { listeners.add(fn); return () => { listeners.delete(fn); }; }, getDemoAccount, () => null);
}