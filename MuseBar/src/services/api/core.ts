import { apiConfig } from '../../config/api';
import { registerSetTokenFunction } from '../authHelper';

let authToken: string | null = null;
const REFRESH_BOOTSTRAP_HINT_KEY = 'auth_refresh_bootstrap_hint';
let refreshAccessTokenPromise: Promise<string | null> | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

// Register the setToken function with authHelper to avoid circular dependencies
registerSetTokenFunction(setToken);

export function getToken(): string | null {
  return authToken;
}

function readCookieValue(cookieName: string): string | null {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') {
    return null;
  }
  const cookiePart = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));
  if (!cookiePart) {
    return null;
  }
  const value = cookiePart.slice(cookieName.length + 1).trim();
  return value.length > 0 ? decodeURIComponent(value) : null;
}

async function requestAccessTokenRefresh(): Promise<string | null> {
  const csrfToken = readCookieValue('musebar_csrf_token');
  if (!csrfToken) {
    return null;
  }

  const response = await fetch(apiConfig.getEndpoint('/api/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify({
      rememberMe: localStorage.getItem('remember_me') === 'true',
    }),
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as {
    token?: string;
    expiresIn?: string;
  };
  if (!data.token) {
    return null;
  }

  setToken(data.token);
  localStorage.setItem('token_expires_in', data.expiresIn || '12h');
  localStorage.setItem(REFRESH_BOOTSTRAP_HINT_KEY, 'true');
  return data.token;
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = requestAccessTokenRefresh().finally(() => {
      refreshAccessTokenPromise = null;
    });
  }

  return refreshAccessTokenPromise;
}

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (!apiConfig.isReady()) {
    await apiConfig.initialize();
  }

  const url = apiConfig.getEndpoint(`/api${endpoint}`);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (endpoint === '/auth/refresh') {
    const csrfToken = readCookieValue('musebar_csrf_token');
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  if (options.headers && typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  // Create timeout controller if no signal is provided
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout (reduced from 30)

  const config: RequestInit = { 
    ...options, 
    headers,
    credentials: 'include',
    signal: options.signal || controller.signal
  };

  try {
    const res = await fetch(url, config);
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      if (res.status === 401) {
        const shouldTryRefresh =
          endpoint !== '/auth/login' &&
          endpoint !== '/auth/refresh' &&
          endpoint !== '/auth/logout';
        if (shouldTryRefresh) {
          const refreshedToken = await refreshAccessToken();
          if (refreshedToken) {
            const retryHeaders = {
              ...headers,
              Authorization: `Bearer ${refreshedToken}`,
            };
            const retryRes = await fetch(url, {
              ...config,
              headers: retryHeaders,
            });
            if (retryRes.ok) {
              return retryRes.json();
            }
          }
        }
        localStorage.removeItem('remember_me');
        localStorage.removeItem('token_expires_in');
        localStorage.removeItem(REFRESH_BOOTSTRAP_HINT_KEY);
        window.location.href = '/login';
        throw new Error('Session expired - please login again');
      }
      let message = `HTTP error! status: ${res.status}`;
      try {
        const body = await res.json() as {
          error?: string | { message?: string };
          message?: string;
        };
        if (typeof body?.error === 'string') {
          message = body.error;
        } else if (body?.error && typeof body.error === 'object' && body.error.message) {
          message = String(body.error.message);
        } else if (typeof body?.message === 'string') {
          message = body.message;
        }
      } catch {
        // ignore parse failure
      }
      throw new Error(message);
    }
    return res.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
    }
    throw error;
  }
}



