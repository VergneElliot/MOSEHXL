import { apiConfig } from '../../config/api';
import { registerSetTokenFunction } from '../authHelper';

let authToken: string | null = null;

export function setToken(token: string | null) {
  authToken = token;
}

// Register the setToken function with authHelper to avoid circular dependencies
registerSetTokenFunction(setToken);

export function getToken(): string | null {
  return authToken;
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
        localStorage.removeItem('remember_me');
        localStorage.removeItem('token_expires_in');
        window.location.href = '/login';
        throw new Error('Session expired - please login again');
      }
      let message = `HTTP error! status: ${res.status}`;
      try {
        const body = await res.json() as { error?: string };
        if (body?.error && typeof body.error === 'string') {
          message = body.error;
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



