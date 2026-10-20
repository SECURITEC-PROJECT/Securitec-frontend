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

const apiBaseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
const tokenKey = "securitec-access-token";

function withLabel(user: Omit<AuthenticatedUser, "label">): AuthenticatedUser {
  return { ...user, label: user.roleLabel || "Utilisateur" };
}

async function readResponse(response: Response): Promise<AuthResponse> {
  return response.json().catch(() => ({})) as Promise<AuthResponse>;
}

export async function login(identifier: string, pin: string): Promise<AuthenticatedUser> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/auth/login`, {
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
  return withLabel(result.user);
}

export async function restoreSession(): Promise<AuthenticatedUser | null> {
  const token = sessionStorage.getItem(tokenKey);
  if (!token) return null;
  try {
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await readResponse(response);
    if (!response.ok || !result.user) {
      sessionStorage.removeItem(tokenKey);
      return null;
    }
    return withLabel(result.user);
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(tokenKey);
}
