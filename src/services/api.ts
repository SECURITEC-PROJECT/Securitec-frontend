const API_URL = 'http://localhost:5000/api';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

const refreshTokens = async (): Promise<string | null> => {
  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // send credentials (cookies) to backend
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Refresh failed');
    }

    const data = await response.json();
    setAccessToken(data.accessToken);
    return data.accessToken;
  } catch (err) {
    setAccessToken(null);
    return null;
  }
};

export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = `${API_URL}${endpoint}`;
  
  // Set credentials for cookies
  options.credentials = 'include';
  
  // Initialize headers if needed
  options.headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as any;

  // Add access token to header if available
  if (accessToken) {
    (options.headers as any)['Authorization'] = `Bearer ${accessToken}`;
  }

  let response = await fetch(url, options);

  // If unauthorized, token might be expired
  if (response.status === 401) {
    // Prevent multiple parallel refresh calls
    if (!refreshPromise) {
      refreshPromise = refreshTokens().finally(() => {
        refreshPromise = null;
      });
    }

    const newToken = await refreshPromise;

    if (newToken) {
      // Retry original request with new token
      (options.headers as any)['Authorization'] = `Bearer ${newToken}`;
      response = await fetch(url, options);
    } else {
      // Refresh failed, clear session
      setAccessToken(null);
      // Trigger a custom event so contexts can react (e.g. redirect to login)
      window.dispatchEvent(new Event('auth-logout'));
      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur (${response.status})`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

export const api = {
  get: (endpoint: string, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body: any, options?: RequestInit) =>
    apiFetch(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint: string, body: any, options?: RequestInit) =>
    apiFetch(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (endpoint: string, options?: RequestInit) => apiFetch(endpoint, { ...options, method: 'DELETE' }),
};
