import { API_URL } from "@/lib/api";

export interface AuthenticatedUser {
  id: string;
  nom: string;
  name: string;
  identifiant: string;
  role: number;
  roleLabel: string;
  siteId: string | null;
  siteNom: string | null;
  label: string;
}

interface AuthResponse {
  token?: string;
  user?: Omit<AuthenticatedUser, "label">;
  error?: string;
}

const tokenKey = "securitec-access-token";
const cachedUserKey = "securitec-session-user";
const cachedUserIdKey = "securitec-session-user-id";

function withLabel(user: Omit<AuthenticatedUser, "label">): AuthenticatedUser {
  return { ...user, label: user.roleLabel || "Utilisateur" };
}

function restoreCachedSession(token: string): AuthenticatedUser | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: string; exp?: number };
    if (!payload.sub || !payload.exp || payload.exp <= Date.now() / 1000) return null;
    const cachedUser = JSON.parse(sessionStorage.getItem(cachedUserKey) || "null") as AuthenticatedUser | null;
    return cachedUser?.id === payload.sub ? cachedUser : null;
  } catch {
    return null;
  }
}

async function readResponse(response: Response): Promise<AuthResponse> {
  return response.json().catch(() => ({})) as Promise<AuthResponse>;
}

export async function login(identifier: string, pin: string): Promise<AuthenticatedUser> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier, pin }),
    });
  } catch {
    throw new Error("Le serveur de connexion est inaccessible. Vérifiez que le backend est lancé.");
  }

  const result = await readResponse(response);
  if (!response.ok || !result.token || !result.user) {
    throw new Error(result.error || "Connexion impossible.");
  }
  sessionStorage.setItem(tokenKey, result.token);
  const user = withLabel(result.user);
  sessionStorage.setItem(cachedUserKey, JSON.stringify(user));
  sessionStorage.setItem(cachedUserIdKey, user.id);
  return user;
}

export async function restoreSession(): Promise<AuthenticatedUser | null> {
  const token = sessionStorage.getItem(tokenKey);
  if (!token) return null;
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await readResponse(response);
    if (!response.ok || !result.user) {
      sessionStorage.removeItem(tokenKey);
      return null;
    }
    const user = withLabel(result.user);
    sessionStorage.setItem(cachedUserKey, JSON.stringify(user));
    sessionStorage.setItem(cachedUserIdKey, user.id);
    return user;
  } catch {
    const cachedUser = restoreCachedSession(token);
    if (cachedUser) return cachedUser;
    clearSession();
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(cachedUserKey);
  sessionStorage.removeItem(cachedUserIdKey);
}
