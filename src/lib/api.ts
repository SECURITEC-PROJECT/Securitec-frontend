const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
const TOKEN_KEY = 'securitec.token'

export class ApiError extends Error {
  status: number
  /** Permissions manquantes, renvoyées par le backend lors d'un refus (403). */
  required: string[]

  constructor(status: number, message: string, required: string[] = []) {
    super(message)
    this.status = status
    this.required = required
  }
}

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token: string | null) =>
  token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY)

let onUnauthorized: (() => void) | undefined
/** Appelé quand le backend rejette le jeton (session expirée ou compte désactivé). */
export const setUnauthorizedHandler = (handler: (() => void) | undefined) => {
  onUnauthorized = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Ne pas déclencher la déconnexion automatique sur un 401 (ex. écran de connexion). */
  skipAuthRedirect?: boolean
}

export async function api<T>(path: string, { method = 'GET', body, skipAuthRedirect }: RequestOptions = {}): Promise<T> {
  const token = getToken()
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez que le backend est démarré.')
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401 && token && !skipAuthRedirect) onUnauthorized?.()
    throw new ApiError(response.status, payload.error ?? 'La requête a échoué.', payload.required)
  }
  return payload as T
}

const authHeaders = (): Record<string, string> => {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/** Envoie un fichier en corps brut (les métadonnées passent par des en-têtes HTTP). */
export async function apiUpload<T>(path: string, file: File, headers: Record<string, string>, method: 'POST' | 'PUT' = 'POST'): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { method, headers: { ...authHeaders(), ...headers }, body: file })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez que le backend est démarré.')
  }
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(response.status, payload.error ?? 'Envoi impossible.', payload.required)
  return payload as T
}

/** Télécharge un fichier protégé et le propose à l'enregistrement. */
export async function apiDownload(path: string, fileName: string): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez que le backend est démarré.')
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new ApiError(response.status, payload.error ?? 'Téléchargement impossible.')
  }
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/** Lit un fichier protégé ; renvoie null s'il n'existe pas (404). */
export async function apiBlob(path: string): Promise<Blob | null> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { headers: authHeaders() })
  } catch {
    throw new ApiError(0, 'Serveur injoignable. Vérifiez que le backend est démarré.')
  }
  if (response.status === 404) return null
  if (!response.ok) throw new ApiError(response.status, 'Lecture impossible.')
  return response.blob()
}
