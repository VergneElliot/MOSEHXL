/**
 * Helper to ensure authentication token is set for API calls
 */

// Store a reference to the setToken function to avoid circular dependencies
let setTokenFunction: ((token: string | null) => void) | null = null;

export function registerSetTokenFunction(setToken: (token: string | null) => void) {
  setTokenFunction = setToken;
}

export function getAuthToken(): string | null {
  // Tokens are no longer persisted in localStorage.
  return null;
}

export function ensureAuthentication(): void {
  const token = getAuthToken();
  if (token && setTokenFunction) {
    setTokenFunction(token);
  }
}
