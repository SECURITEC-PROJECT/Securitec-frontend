const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_URL = (configuredApiUrl || (import.meta.env.DEV ? "http://localhost:5000/api" : "/api"))
  .replace(/\/$/, "");

export function authHeaders(): Record<string, string> {
  const token = typeof window === "undefined"
    ? null
    : window.sessionStorage.getItem("securitec-access-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}
