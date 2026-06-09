import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, User } from "../types";
import { USERS } from "../data/mock";

interface AuthContextValue {
  user: User | null;
  login: (username: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  switchRole: (role: Role) => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "securitec.role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Role | null;
      if (stored && USERS[stored]) setUser(USERS[stored]);
    } catch { /* ignore */ }
  }, []);

  const persist = (u: User | null) => {
    try {
      if (u) localStorage.setItem(STORAGE_KEY, u.role);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    login: (username, password) => {
      const found = Object.values(USERS).find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password,
      );
      if (!found) return { ok: false, error: "Identifiant ou mot de passe incorrect." };
      setUser(found);
      persist(found);
      return { ok: true };
    },
    switchRole: (role) => { setUser(USERS[role]); persist(USERS[role]); },
    logout: () => { setUser(null); persist(null); },
    hasRole: (...roles) => !!user && roles.includes(user.role),
  }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
