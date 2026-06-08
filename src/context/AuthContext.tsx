import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, User } from "../types";
import { USERS } from "../data/mock";

interface AuthContextValue {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "securitec.role";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Role | null;
      if (stored && USERS[stored]) setUser(USERS[stored]);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: (role) => {
        setUser(USERS[role]);
        try { localStorage.setItem(STORAGE_KEY, role); } catch {/* ignore */}
      },
      switchRole: (role) => {
        setUser(USERS[role]);
        try { localStorage.setItem(STORAGE_KEY, role); } catch {/* ignore */}
      },
      logout: () => {
        setUser(null);
        try { localStorage.removeItem(STORAGE_KEY); } catch {/* ignore */}
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
