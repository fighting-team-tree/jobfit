const TOKEN_STORAGE_KEY = 'jobfit_access_token';
const CLIENT_SESSION_STORAGE_KEY = 'jobfit_client_session';

export function getAuthToken(): string | null {
  const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    return token;
  }

  // One-time migration: remove older persistent token if it exists.
  const legacyToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (legacyToken) {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.setItem(TOKEN_STORAGE_KEY, legacyToken);
  }
  return legacyToken;
}

export function setAuthToken(token: string): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  headers['X-JobFit-Client-Session'] = getClientSessionId();
  return headers;
}

function getClientSessionId(): string {
  let sessionId = localStorage.getItem(CLIENT_SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(CLIENT_SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}
