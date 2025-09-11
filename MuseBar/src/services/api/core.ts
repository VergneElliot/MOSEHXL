import { apiConfig } from '../../config/api';
import { registerSetTokenFunction } from '../authHelper';

let authToken: string | null = null;

export function setToken(token: string | null) {
  console.log('🔐 api/core: setToken called with:', token ? 'Token present' : 'null');
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
    console.log('🔐 api/core: Adding Authorization header to request');
  } else {
    console.log('🔐 api/core: No auth token available for request');
  }

  if (options.headers && typeof options.headers === 'object' && !(options.headers instanceof Headers)) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  // Create timeout controller if no signal is provided
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  const config: RequestInit = { 
    ...options, 
    headers,
    signal: options.signal || controller.signal
  };

  try {
    const res = await fetch(url, config);
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
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



