import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Role, User } from "../types";
import { api, setAccessToken } from "../services/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Try to load user profile on startup (by first calling refresh or me)
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Calling /auth/me will trigger apiFetch's interceptor to call /auth/refresh if access token is null/expired
        const data = await api.get("/auth/me");
        setUser(data.user);
      } catch (err) {
        // Not logged in or expired refresh token
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen to global logout events from api client
    const handleGlobalLogout = () => {
      setUser(null);
    };

    window.addEventListener("auth-logout", handleGlobalLogout);
    return () => {
      window.removeEventListener("auth-logout", handleGlobalLogout);
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const data = await api.post("/auth/login", { username, password });
      setAccessToken(data.accessToken);
      setUser(data.user);
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || "Erreur de connexion" };
    }
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  };

  const hasRole = (...roles: Role[]) => !!user && roles.includes(user.role);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    login,
    logout,
    hasRole,
  }), [user, loading]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
