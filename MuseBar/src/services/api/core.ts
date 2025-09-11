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

  const config: RequestInit = { ...options, headers };

  const res = await fetch(url, config);
  if (!res.ok) {
    throw new Error(`HTTP error! status: ${res.status}`);
  }
  return res.json();
}



